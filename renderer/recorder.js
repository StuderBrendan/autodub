let mediaRecorder;
let audioChunks = [];

const fs = require("fs");
const path = require("path");

async function saveRecording(blob){

    const buffer = Buffer.from(await blob.arrayBuffer());

    const filePath = path.join(
        __dirname,
        "../temp/recording.webm"
    );

    fs.writeFileSync(filePath, buffer);

    return filePath;
}

async function startRecording(){

    const stream = await navigator.mediaDevices.getUserMedia({
        audio:true
    });

    audioChunks = [];

    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
    };

    mediaRecorder.start();
}

function stopRecording(){

    return new Promise(resolve => {

        mediaRecorder.onstop = () => {

            const blob = new Blob(audioChunks,{
                type:"audio/webm"
            });

            resolve(blob);
        };

        mediaRecorder.stop();
    });

}