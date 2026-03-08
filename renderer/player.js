const { exportDub } = require("../services/videoExporter");
const path = require("path");
const fs = require("fs");

const params = new URLSearchParams(window.location.search);

const videoFile = params.get("video");
const title = params.get("title");

const video = document.getElementById("video");
const countdown = document.getElementById("countdown");

const exportOverlay = document.getElementById("exportOverlay");

document.getElementById("sceneTitle").innerText = title;

video.src = videoFile;

let isRecording = false;
const startBtn = document.getElementById("startBtn");
const backBtn = document.getElementById("backBtn");

video.addEventListener("loadeddata", () => {

    console.log("Video ready");

    startBtn.disabled = false;

});

backBtn.onclick = () => {
    if (isRecording) return;
    window.location = "index.html";
};

startBtn.onclick = async () => {

    if (isRecording) return;
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
        const audioBlob = await stopRecording();
        const audioPath = await saveRecordingWAV(audioBlob);

        const videoPath = path.join(videoFile);
        const outputPath = path.join(__dirname, "../exports", "dub_" + Date.now() + ".mp4");

        try {
        await exportDub(videoPath, audioPath, outputPath);

        exportOverlay.style.display = "none";

        window.location = `playerResult.html?video=${encodeURIComponent(outputPath)}`;

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

function runCountdown(seconds){

    return new Promise(resolve => {

        let count = seconds;

        countdown.innerText = count;

        playBeep();

        const interval = setInterval(() => {

            count--;

            if(count <= 0){

                clearInterval(interval);

                countdown.innerText = "GO";

                playBeep();

                setTimeout(()=>{
                    countdown.innerText = "";
                    resolve();
                },500);

            }else{

                countdown.innerText = count;

                playBeep();

            }

        },1000);

    });

}

async function saveRecordingWAV(blob) {
    const buffer = Buffer.from(await blob.arrayBuffer());
    const filePath = path.join(__dirname, "../temp/recording.wav");
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

function saveAudio(blob){

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = "dubbing_recording.webm";

    a.click();

}