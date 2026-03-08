const { loadConfig } = require("../services/configService");

let audioContext;
let recorder;
let source;
let stream;
let audioData = [];
const config = loadConfig();

async function startRecording() {
    audioData = [];

    stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            deviceId: config.microphoneId || undefined
        }
    });

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    source = audioContext.createMediaStreamSource(stream);

    recorder = audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(recorder);
    recorder.connect(audioContext.destination);

    recorder.onaudioprocess = e => {
        audioData.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
}

async function stopRecording() {
    recorder.disconnect();
    source.disconnect();

    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    const sampleRate = audioContext.sampleRate;
    await audioContext.close();

    let length = audioData.reduce((sum, arr) => sum + arr.length, 0);
    let buffer = new Float32Array(length);
    let offset = 0;

    for (const arr of audioData) {
        buffer.set(arr, offset);
        offset += arr.length;
    }

    return encodeWAV(buffer, sampleRate);
}

function encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, "WAVE");

    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);

    writeString(view, 36, "data");
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([view], { type: "audio/wav" });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
