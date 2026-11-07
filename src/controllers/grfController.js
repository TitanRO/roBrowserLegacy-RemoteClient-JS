const { GrfNode } = require("@chicowall/grf-loader");
const fs = require("fs");

// kRO's 2025 data.grf (version 0x300) starts with "Event Horizon" where older GRFs have "Master of Magic"; the rest
// of its header is the 0x300 layout grf-loader reads. grf-loader only accepts "Master of Magic", so its header read
// gets that signature instead.
const MAGIC = Buffer.from("Master of Magic");
const EVENT_HORIZON = Buffer.from("Event Horizon\0");

function acceptEventHorizon(grf) {
	const read = grf.getStreamBuffer.bind(grf);
	grf.getStreamBuffer = async (fd, offset, length) => {
		const buffer = await read(fd, offset, length);
		if (offset === 0 && buffer.length >= MAGIC.length && Buffer.from(buffer.buffer, buffer.byteOffset, EVENT_HORIZON.length).equals(EVENT_HORIZON)) {
			const copy = Buffer.from(buffer);
			MAGIC.copy(copy, 0);
			return copy;
		}
		return buffer;
	};
}

class Grf {
	constructor(filePath) {
		this.filePath = filePath;
		this.grf = null;
		this.loaded = false;
	}

	async load() {
		if (!fs.existsSync(this.filePath)) {
			console.error(`GRF file not found: ${this.filePath}`);
			return;
		}

		try {
			const fd = fs.openSync(this.filePath, "r");
			this.grf = new GrfNode(fd);
			acceptEventHorizon(this.grf);
			await this.grf.load();
			this.loaded = true;
		} catch (error) {
			console.error("Error loading GRF file:", error);
		}
	}

	async getFile(filename) {
		if (!this.loaded || !this.grf) {
			console.error("GRF not loaded or not initialized");
			return null;
		}
		try {
			const { data, error } = await this.grf.getFile(filename);
			if (error) {
				console.error(`Error getting file from GRF: ${error}`);
				return null;
			}
			return Buffer.from(data);
		} catch (error) {
			console.error(`Error extracting file: ${error}`);
			return null;
		}
	}

	listFiles() {
		if (!this.loaded || !this.grf) {
			console.error("GRF not loaded or not initialized");
			return [];
		}

		return Array.from(this.grf.files.keys());
	}
}

module.exports = Grf;
