const fs = require("fs");
const os = require("os");
const path = require("path");

function getDataDir() {
    const base = process.env.APPDATA || (process.platform === "darwin"
        ? path.join(os.homedir(), "Library", "Application Support")
        : path.join(os.homedir(), ".config"));

    const dir = path.join(base, "AutoDub");
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

const configPath = path.join(getDataDir(), "config.json");
const legacyConfigPath = path.join(__dirname, "../config.json");

function loadConfig() {
    if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, "utf8"));
    }

    if (fs.existsSync(legacyConfigPath)) {
        const legacy = JSON.parse(fs.readFileSync(legacyConfigPath, "utf8"));
        saveConfig(legacy);
        return legacy;
    }

    return {
        libraryPath: "",
        microphoneId: ""
    };
}

function saveConfig(config) {
    fs.writeFileSync(
        configPath,
        JSON.stringify(config, null, 2)
    );
}

module.exports = { loadConfig, saveConfig, getDataDir };
