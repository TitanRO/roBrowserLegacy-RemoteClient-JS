const express = require('express');
const path = require('path');
const router = express.Router();
const Client = require('../controllers/clientController');
const configs = require('../config/configs');

// Inicializa o cliente ao iniciar a aplicação
(async () => {
  try {
    await Client.init();
  } catch (err) {
    console.error('Client init failed:', err);
  }
})();

router.post('/search', (req, res) => {
  const filter = req.body.filter;
  if (!configs.CLIENT_ENABLESEARCH || !filter) {
    return res.status(400).send('Search feature is disabled or invalid filter');
  }

  let regex;
  try {
    regex = new RegExp(filter, 'i');
  } catch (err) {
    return res.status(400).send('Invalid filter');
  }
  const files = Client.search(regex);
  res.send(files.join('\n'));
});

// Health/status (there is no index page; this used to read a missing index.html and crash the process).
router.get('/', (req, res) => {
  res.type('text/plain').send(`grfhost: ${Client.grfs.length} GRF(s) loaded`);
});

// List files in the loaded GRFs (declared before the catch-all route so it is reachable).
router.get('/list-files', async (req, res) => {
  res.json(Client.listFiles());
});

router.get('/*', async (req, res) => {
  const filePath = req.params[0];
  try {
    const fileContent = await Client.getFile(filePath);
    if (!fileContent) {
      return res.status(404).send('File not found');
    }
    res.type(path.extname(filePath));
    res.send(fileContent);
  } catch (err) {
    console.error('Error serving', filePath, err);
    res.status(500).send('Error reading file');
  }
});

module.exports = router;
