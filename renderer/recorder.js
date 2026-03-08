const { loadConfig } = require("../services/configService");

let audioContext;
let recorder;
let audioData = [];
const config = loadConfig();

async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio:{
            deviceId: config.microphoneId
        }
    });
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);

    recorder = audioContext.createScriptProcessor(4096, 1, 1);
    
    source.connect(recorder);
    recorder.connect(audioContext.destination);

    recorder.onaudioprocess = e => {
        audioData.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
}

async function stopRecording() {
    recorder.disconnect();
    audioContext.close();

    // concat tous les buffers
    let length = audioData.reduce((sum, arr) => sum + arr.length, 0);
    let buffer = new Float32Array(length);
    let offset = 0;
    for (let arr of audioData) {
        buffer.set(arr, offset);
        offset += arr.length;
    }

    return encodeWAV(buffer, audioContext.sampleRate);
}

// convertit le Float32Array en Blob WAV
function encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    /* RIFF chunk descriptor */
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');

    /* fmt sub-chunk */
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // subchunk1size
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample

    /* data sub-chunk */
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // écriture des samples PCM
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}