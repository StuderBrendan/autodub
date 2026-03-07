const { exportDub } = require("../services/videoExporter");
const path = require("path");
const fs = require("fs");

const params = new URLSearchParams(window.location.search);

const videoFile = params.get("video");
const title = params.get("title");

const video = document.getElementById("video");
const countdown = document.getElementById("countdown");

document.getElementById("sceneTitle").innerText = title;

video.src = "../media/videos/" + videoFile;

const startBtn = document.getElementById("startBtn");
const backBtn = document.getElementById("backBtn");

backBtn.onclick = () => {
    window.location = "index.html";
};

startBtn.onclick = async () => {

    await runCountdown(5);

    await startRecording();

    video.currentTime = 0;

    video.play();

    video.onended = async () => {
    const audioBlob = await stopRecording();
    const audioPath = await saveRecordingWAV(audioBlob);

    const videoPath = path.join(__dirname, "../media/videos", videoFile);
    const outputPath = path.join(__dirname, "../exports", "dub_" + Date.now() + ".mp4");

    await exportDub(videoPath, audioPath, outputPath);

    alert("Export finished!");
};

};

function runCountdown(seconds){

    return new Promise(resolve => {

        let count = seconds;

        countdown.innerText = count;

        const interval = setInterval(() => {

            count--;

            if(count <= 0){

                clearInterval(interval);

                countdown.innerText = "";

                resolve();

            }else{

                countdown.innerText = count;

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