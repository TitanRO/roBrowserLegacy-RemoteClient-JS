const fs = require('fs');
const path = require('path');
const Grf = require('./grfController');
const configs = require('../config/configs');
const iconv = require('iconv-lite');

// Folders a client may request files from (the volume-mounted client resources).
const RESOURCE_DIRS = ['data', 'BGM', 'System', 'AI', 'resources'];

const Client = {
  path: '',
  data_ini: '',
  grfs: [],
  AutoExtract: configs.CLIENT_AUTOEXTRACT,

  async init() {
    this.data_ini = path.join(__dirname, '..', '..', configs.CLIENT_RESPATH, configs.CLIENT_DATAINI);

    if (!fs.existsSync(this.data_ini)) {
      // console.error('DATA.INI file not found:', this.data_ini);
      return;
    }

    const dataIniContent = fs.readFileSync(this.data_ini, 'utf-8');
    const dataIni = parseIni(dataIniContent);
    this.grfs = await Promise.all(
      // DATA.INI keys start at 1, so the parsed array has holes; skip them.
      dataIni.Data.filter(Boolean).map(async grfPath => {
        const grf = new Grf(path.join(__dirname, '..', '..', configs.CLIENT_RESPATH, grfPath));
        await grf.load();
        return grf;
      })
    );
  },

  // Resolve a request path inside the client resource folders, or null if it leaves them (e.g. URL-encoded
  // ../ segments, which used to allow reading or writing any file in the container).
  resolveResource(filePath) {
    const appRoot = path.resolve(__dirname, '..', '..');
    const localPath = path.resolve(appRoot, filePath);
    const rel = path.relative(appRoot, localPath);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel) || !RESOURCE_DIRS.includes(rel.split(path.sep)[0])) {
      return null;
    }
    return { localPath, grfPath: rel.split(path.sep).join('\\') };
  },

  async getFile(filePath) {
    // Korean names may arrive as real Korean (data/texture/유저인터페이스/...) or the way roBrowser sends them:
    // CP949 bytes read as Latin-1 (data/texture/À¯ÀúÀÎÅÍÆäÀÌ½º/..., data/sprite/.../¿©/4_¿©.act). The GRF index holds
    // real Korean (grf-loader decodes names as CP949), so look up the Korean form first and fall back to the path as
    // requested.
    const korean = toKorean(filePath);
    const candidates = [korean, filePath].filter((p, i, all) => all.indexOf(p) === i).map(p => this.resolveResource(p));
    if (candidates.includes(null)) {
      return null;
    }

    // Loose files (System/, AI/, BGM/, data/ extracts). Exact name first, then case-insensitively: the files come
    // from a Windows client install where names like iteminfo_true.lub / OngoingQuestInfoList_True.lub don't match
    // the case the client asks for (itemInfo_true.lub, OngoingQuestInfoList_true.lub). GRF lookups already ignore case.
    for (const { localPath } of candidates) {
      if (isFile(localPath)) {
        return fs.readFileSync(localPath);
      }
    }
    for (const { localPath } of candidates) {
      const found = findCaseInsensitive(localPath);
      if (found) {
        return fs.readFileSync(found);
      }
    }

    // Search the GRFs; auto-extract under the Korean name.
    for (const grf of this.grfs) {
      for (const { grfPath } of candidates) {
        const fileContent = await grf.getFile(grfPath);
        if (fileContent) {
          if (this.AutoExtract) {
            const localPath = candidates[0].localPath;
            fs.mkdirSync(path.dirname(localPath), { recursive: true });
            fs.writeFileSync(localPath, fileContent);
          }
          return fileContent;
        }
      }
    }

    return null;
  },

  listFiles() {
    const allFiles = new Set();

    for (const grf of this.grfs) {
      if (grf && grf.listFiles) {
        const files = grf.listFiles();
        files.forEach(file => allFiles.add(file));
      } else {
        console.error('GRF not loaded or listFiles method missing');
      }
    }

    return Array.from(allFiles);
  },

  search(regex) {
    if (!configs.CLIENT_ENABLESEARCH) {
      console.error('Search feature is disabled');
      return [];
    }

    const matchingFiles = new Set();

    for (const grf of this.grfs) {
      if (grf && grf.listFiles) {
        const files = grf.listFiles();
        files.forEach(file => {
          if (regex.test(file)) {
            matchingFiles.add(file);
          }
        });
      } else {
        console.error('GRF not loaded or listFiles method missing');
      }
    }

    return Array.from(matchingFiles);
  }
};

// roBrowser-style mojibake -> Korean, per path segment: a segment made only of Latin-1 characters with at least one
// non-ASCII one is re-read as CP949 bytes; segments that aren't valid CP949 (e.g. "café") and real Korean/ASCII are
// left alone. (grf-loader's isMojibake is ratio-based and misses mostly-ASCII names such as "4_¿©.act".)
function toKorean(filePath) {
  return filePath
    .split('/')
    .map(segment => {
      if (!/[\x80-\xff]/.test(segment) || /[^\x00-\xff]/.test(segment)) {
        return segment;
      }
      const decoded = iconv.decode(Buffer.from(segment, 'latin1'), 'cp949');
      return decoded.includes('\ufffd') ? segment : decoded;
    })
    .join('/');
}

// Resolve a path under the app root ignoring case, one segment at a time (only descends into entries that exist,
// so it can't leave the folders resolveResource allowed). Returns the real path, or null.
function findCaseInsensitive(localPath) {
  const appRoot = path.resolve(__dirname, '..', '..');
  let dir = appRoot;
  for (const segment of path.relative(appRoot, localPath).split(path.sep)) {
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch (_e) {
      return null;
    }
    const wanted = segment.toLowerCase();
    const match = entries.find(e => e.toLowerCase() === wanted);
    if (!match) {
      return null;
    }
    dir = path.join(dir, match);
  }
  return isFile(dir) ? dir : null;
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch (_e) {
    return false;
  }
}

function parseIni(data) {
  const regex = {
    section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
    param: /^\s*([\w\.\-\_]+)\s*=\s*(.*?)\s*$/,
    comment: /^\s*;.*$/
  };
  const value = {};
  const lines = data.split(/[\r\n]+/);
  let section = null;

  lines.forEach(line => {
    if (regex.comment.test(line)) {
      return;
    } else if (regex.param.test(line)) {
      const match = line.match(regex.param);
      const key = parseInt(match[1], 10);
      const val = match[2];
      if (section) {
        if (!value[section]) {
          value[section] = [];
        }
        value[section][key] = val;
      } else {
        if (!value[key]) {
          value[key] = [];
        }
        value[key] = val;
      }
    } else if (regex.section.test(line)) {
      const match = line.match(regex.section);
      section = match[1];
      if (!value[section]) {
        value[section] = [];
      }
    }
  });

  return value;
}

module.exports = Client;
