const { loadConfig, saveConfig } = require("../services/configService");
const { ipcRenderer } = require("electron");

let config = loadConfig();

const libraryInput = document.getElementById("libraryPath");
const micSelect = document.getElementById("microphoneSelect");

libraryInput.value = config.libraryPath || "";

async function loadMicrophones(){

    const devices = await navigator.mediaDevices.enumerateDevices();

    const mics = devices.filter(d => d.kind === "audioinput");

    micSelect.innerHTML = "";

    mics.forEach(mic => {

        const option = document.createElement("option");

        option.value = mic.deviceId;
        option.text = mic.label || "Microphone";

        if(mic.deviceId === config.microphoneId){
            option.selected = true;
        }

        micSelect.appendChild(option);

    });

}

document.getElementById("browseLibrary").onclick = async () => {

    const folder = await ipcRenderer.invoke("select-folder");

    if(folder){
        libraryInput.value = folder;
    }

};

document.getElementById("saveBtn").onclick = () => {

    config.libraryPath = libraryInput.value;
    config.microphoneId = micSelect.value;

    saveConfig(config);

    alert("Settings saved");

};

document.getElementById("backBtn").onclick = () => {

    window.location = "index.html";

};

loadMicrophones();