const { loadConfig, saveConfig } = require("../services/configService");
const { importFromYoutube } = require("../services/youtubeImporter");
const { ipcRenderer } = require("electron");

window.onload = () => {
    ipcRenderer.send("bgm-play", { volume: 0.4 });
};

let config = loadConfig();

const libraryInput = document.getElementById("libraryPath");
const youtubeUrlInput = document.getElementById("youtubeUrl");
const youtubeImportBtn = document.getElementById("importYoutubeBtn");
const youtubeImportStatus = document.getElementById("youtubeImportStatus");

const micSelect = document.getElementById("microphoneSelect");
const testMicBtn = document.getElementById("testMicBtn");
const meterLevel = document.getElementById("meterLevel");
const micTestStatus = document.getElementById("micTestStatus");

let testStream = null;
let testAudioContext = null;
let analyserNode = null;
let sourceNode = null;
let meterFrameId = null;
let testingMic = false;

libraryInput.value = config.libraryPath || "";

async function loadMicrophones() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices.filter(d => d.kind === "audioinput");

    micSelect.innerHTML = "";

    mics.forEach(mic => {
        const option = document.createElement("option");

        option.value = mic.deviceId;
        option.text = mic.label || "Microphone";

        if (mic.deviceId === config.microphoneId) {
            option.selected = true;
        }

        micSelect.appendChild(option);
    });
}

function updateMeterLoop() {
    if (!analyserNode) return;

    const data = new Uint8Array(analyserNode.fftSize);
    analyserNode.getByteTimeDomainData(data);

    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
        const normalized = (data[i] - 128) / 128;
        sumSquares += normalized * normalized;
    }

    const rms = Math.sqrt(sumSquares / data.length);
    const level = Math.min(100, Math.round(rms * 220));

    meterLevel.style.width = `${level}%`;
    meterFrameId = requestAnimationFrame(updateMeterLoop);
}

async function startMicTest() {
    const selectedDeviceId = micSelect.value || undefined;

    testStream = await navigator.mediaDevices.getUserMedia({
        audio: {
            deviceId: selectedDeviceId
        }
    });

    testAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    sourceNode = testAudioContext.createMediaStreamSource(testStream);
    analyserNode = testAudioContext.createAnalyser();
    analyserNode.fftSize = 1024;

    sourceNode.connect(analyserNode);

    testingMic = true;
    testMicBtn.textContent = "Arreter le test";
    micTestStatus.textContent = "Test en cours: parle pour verifier le niveau.";

    updateMeterLoop();
}

async function stopMicTest() {
    testingMic = false;
    testMicBtn.textContent = "Tester le micro";

    if (meterFrameId) {
        cancelAnimationFrame(meterFrameId);
        meterFrameId = null;
    }

    meterLevel.style.width = "0%";

    if (sourceNode) {
        sourceNode.disconnect();
        sourceNode = null;
    }

    analyserNode = null;

    if (testStream) {
        testStream.getTracks().forEach(track => track.stop());
        testStream = null;
    }

    if (testAudioContext) {
        await testAudioContext.close();
        testAudioContext = null;
    }

    micTestStatus.textContent = "Test arrete.";
}

document.getElementById("browseLibrary").onclick = async () => {
    const folder = await ipcRenderer.invoke("select-folder");

    if (folder) {
        libraryInput.value = folder;
    }
};

youtubeImportBtn.onclick = async () => {
    const url = youtubeUrlInput.value.trim();
    const targetLibrary = libraryInput.value.trim();

    if (!targetLibrary) {
        youtubeImportStatus.textContent = "Choisis d'abord le dossier des extraits.";
        return;
    }

    if (!url) {
        youtubeImportStatus.textContent = "Colle une URL YouTube valide.";
        return;
    }

    youtubeImportBtn.disabled = true;
    youtubeImportStatus.textContent = "Import en cours...";

    try {
        const imported = await importFromYoutube(url, targetLibrary);
        youtubeImportStatus.textContent = `Import termine: ${imported.title}`;
        youtubeUrlInput.value = "";
    } catch (err) {
        youtubeImportStatus.textContent = "Erreur import: " + err.message;
    } finally {
        youtubeImportBtn.disabled = false;
    }
};

testMicBtn.onclick = async () => {
    try {
        if (testingMic) {
            await stopMicTest();
            return;
        }

        await startMicTest();
    } catch (err) {
        micTestStatus.textContent = "Erreur test micro: " + err.message;
        await stopMicTest();
    }
};

micSelect.addEventListener("change", async () => {
    if (testingMic) {
        await stopMicTest();
        micTestStatus.textContent = "Micro change. Relance le test.";
    }
});

document.getElementById("saveBtn").onclick = () => {
    config.libraryPath = libraryInput.value;
    config.microphoneId = micSelect.value;

    saveConfig(config);
    alert("Settings saved");
};

document.getElementById("backBtn").onclick = async () => {
    if (testingMic) {
        await stopMicTest();
    }

    window.location = "../menu/menu.html";
};

window.addEventListener("beforeunload", () => {
    if (testStream) {
        testStream.getTracks().forEach(track => track.stop());
    }
});

loadMicrophones();
