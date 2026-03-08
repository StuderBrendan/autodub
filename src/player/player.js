const { ipcRenderer } = require("electron");
const { exportDub } = require("../services/videoExporter");
const path = require("path");
const fs = require("fs");

ipcRenderer.send("bgm-pause");

const params = new URLSearchParams(window.location.search);

const videoFile = params.get("video");
const title = params.get("title") || "Scene";

const video = document.getElementById("video");
const countdown = document.getElementById("countdown");
const exportOverlay = document.getElementById("exportOverlay");

const startBtn = document.getElementById("startBtn");
const backBtn = document.getElementById("backBtn");

let isRecording = false;

document.getElementById("sceneTitle").innerText = title;

function toFileUrl(filePath) {
    return `file:///${filePath.replace(/\\/g, "/")}`;
}

if (!videoFile) {
    startBtn.disabled = true;
    alert("No video selected.");
} else {
    video.src = toFileUrl(videoFile);
}

video.addEventListener("loadeddata", () => {
    startBtn.disabled = false;
});

backBtn.onclick = () => {
    if (isRecording) return;
    window.location = "../library/library.html";
};

startBtn.onclick = async () => {
    if (isRecording || !videoFile) return;

    isRecording = true;
    startBtn.disabled = true;
    backBtn.disabled = true;

    await runCountdown(5);
    await startRecording();

    video.currentTime = 0;
    video.play();

    video.onended = async () => {
        isRecording = false;
        startBtn.disabled = false;
        backBtn.disabled = false;
        exportOverlay.style.display = "flex";

        try {
            const audioBlob = await stopRecording();
            const audioPath = await saveRecordingWAV(audioBlob);

            const outputDir = path.join(__dirname, "../../exports");
            const outputPath = path.join(outputDir, "dub_" + Date.now() + ".mp4");

            fs.mkdirSync(outputDir, { recursive: true });

            await exportDub(videoFile, audioPath, outputPath);

            exportOverlay.style.display = "none";
            window.location = `../result/playerResult.html?video=${encodeURIComponent(outputPath)}&source=${encodeURIComponent(videoFile)}&title=${encodeURIComponent(title)}`;
        } catch (err) {
            exportOverlay.style.display = "none";
            alert("Error during export: " + err.message);
        }
    };
};

function playBeep() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.2;

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();

    setTimeout(() => {
        oscillator.stop();
        ctx.close();
    }, 150);
}

function runCountdown(seconds) {
    return new Promise(resolve => {
        let count = seconds;

        countdown.innerText = count;
        playBeep();

        const interval = setInterval(() => {
            count--;

            if (count <= 0) {
                clearInterval(interval);
                countdown.innerText = "GO";
                playBeep();

                setTimeout(() => {
                    countdown.innerText = "";
                    resolve();
                }, 500);
            } else {
                countdown.innerText = count;
                playBeep();
            }
        }, 1000);
    });
}

async function saveRecordingWAV(blob) {
    const buffer = Buffer.from(await blob.arrayBuffer());
    const tempDir = path.join(__dirname, "../../temp");

    fs.mkdirSync(tempDir, { recursive: true });

    const filePath = path.join(tempDir, "recording.wav");
    fs.writeFileSync(filePath, buffer);
    return filePath;
}
