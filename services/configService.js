const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "../config.json");

function loadConfig(){

    if(!fs.existsSync(configPath)){
        return {
            libraryPath: "",
            microphoneId: ""
        };
    }

    return JSON.parse(fs.readFileSync(configPath));
}

function saveConfig(config){

    fs.writeFileSync(
        configPath,
        JSON.stringify(config, null, 2)
    );

}

module.exports = { loadConfig, saveConfig };