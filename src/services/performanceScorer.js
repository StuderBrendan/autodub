const { execFile } = require("child_process");
const { ffmpegPath } = require("./ffmpegPath");

const SAMPLE_RATE = 16000;
const FRAME_SIZE = 320;
const MAX_LAG_FRAMES = 50;

function runFfmpegToPcm(inputPath) {
    return new Promise((resolve, reject) => {
        const args = [
            "-i", inputPath,
            "-vn",
            "-ac", "1",
            "-ar", String(SAMPLE_RATE),
            "-f", "s16le",
            "-"
        ];

        execFile(ffmpegPath, args, { encoding: "buffer", maxBuffer: 1024 * 1024 * 64, windowsHide: true }, (err, stdout, stderr) => {
            if (err) {
                const ffmpegError = stderr ? stderr.toString() : err.message;
                reject(new Error(`ffmpeg decode failed: ${ffmpegError}`));
                return;
            }

            resolve(stdout);
        });
    });
}

function pcm16ToFloat32(buffer) {
    const sampleCount = Math.floor(buffer.length / 2);
    const samples = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
        const int16 = buffer.readInt16LE(i * 2);
        samples[i] = int16 / 32768;
    }

    return samples;
}

function buildEnergyFrames(samples) {
    const frameCount = Math.floor(samples.length / FRAME_SIZE);
    const frames = new Float32Array(frameCount);

    for (let i = 0; i < frameCount; i++) {
        let sum = 0;
        const start = i * FRAME_SIZE;

        for (let j = 0; j < FRAME_SIZE; j++) {
            const s = samples[start + j];
            sum += s * s;
        }

        frames[i] = Math.sqrt(sum / FRAME_SIZE);
    }

    return frames;
}

function normalizeFrames(frames) {
    if (frames.length === 0) return frames;

    let mean = 0;
    for (let i = 0; i < frames.length; i++) mean += frames[i];
    mean /= frames.length;

    let variance = 0;
    for (let i = 0; i < frames.length; i++) {
        const d = frames[i] - mean;
        variance += d * d;
    }
    variance /= frames.length;

    const std = Math.sqrt(variance) || 1;
    const out = new Float32Array(frames.length);

    for (let i = 0; i < frames.length; i++) {
        out[i] = (frames[i] - mean) / std;
    }

    return out;
}

function pearsonAtLag(a, b, lag) {
    const startA = lag > 0 ? lag : 0;
    const startB = lag < 0 ? -lag : 0;
    const len = Math.min(a.length - startA, b.length - startB);

    if (len < 8) return 0;

    let sumA = 0;
    let sumB = 0;
    let sumAA = 0;
    let sumBB = 0;
    let sumAB = 0;

    for (let i = 0; i < len; i++) {
        const va = a[startA + i];
        const vb = b[startB + i];
        sumA += va;
        sumB += vb;
        sumAA += va * va;
        sumBB += vb * vb;
        sumAB += va * vb;
    }

    const num = len * sumAB - sumA * sumB;
    const denA = len * sumAA - sumA * sumA;
    const denB = len * sumBB - sumB * sumB;
    const den = Math.sqrt(Math.max(denA * denB, 1e-9));

    return num / den;
}

function findBestCorrelation(refFrames, userFrames) {
    const refNorm = normalizeFrames(refFrames);
    const userNorm = normalizeFrames(userFrames);

    let bestCorr = -1;
    let bestLag = 0;

    for (let lag = -MAX_LAG_FRAMES; lag <= MAX_LAG_FRAMES; lag++) {
        const corr = pearsonAtLag(refNorm, userNorm, lag);
        if (corr > bestCorr) {
            bestCorr = corr;
            bestLag = lag;
        }
    }

    return { corr: bestCorr, lag: bestLag };
}

function voicedMask(frames) {
    if (frames.length === 0) return [];

    let max = 0;
    for (let i = 0; i < frames.length; i++) {
        if (frames[i] > max) max = frames[i];
    }

    const threshold = Math.max(max * 0.28, 0.008);
    const mask = new Array(frames.length);

    for (let i = 0; i < frames.length; i++) {
        mask[i] = frames[i] >= threshold;
    }

    return mask;
}

function overlapScore(refFrames, userFrames, lagFrames) {
    const refMask = voicedMask(refFrames);
    const userMask = voicedMask(userFrames);

    let intersect = 0;
    let union = 0;

    const startRef = lagFrames > 0 ? lagFrames : 0;
    const startUser = lagFrames < 0 ? -lagFrames : 0;
    const len = Math.min(refMask.length - startRef, userMask.length - startUser);

    if (len <= 0) return 0;

    for (let i = 0; i < len; i++) {
        const r = refMask[startRef + i];
        const u = userMask[startUser + i];

        if (r || u) union++;
        if (r && u) intersect++;
    }

    if (union === 0) return 0;
    return intersect / union;
}

async function scorePerformance(referenceVideoPath, userAudioPath) {
    const [refPcm, userPcm] = await Promise.all([
        runFfmpegToPcm(referenceVideoPath),
        runFfmpegToPcm(userAudioPath)
    ]);

    const refSamples = pcm16ToFloat32(refPcm);
    const userSamples = pcm16ToFloat32(userPcm);

    const refFrames = buildEnergyFrames(refSamples);
    const userFrames = buildEnergyFrames(userSamples);

    if (refFrames.length < 10 || userFrames.length < 10) {
        return {
            score: 55,
            details: {
                correlation: 0,
                overlap: 0,
                durationSimilarity: 0
            }
        };
    }

    const { corr, lag } = findBestCorrelation(refFrames, userFrames);
    const overlap = overlapScore(refFrames, userFrames, lag);

    const refDuration = refSamples.length / SAMPLE_RATE;
    const userDuration = userSamples.length / SAMPLE_RATE;
    const durationSimilarity = Math.min(refDuration, userDuration) / Math.max(refDuration, userDuration);

    const corrNorm = Math.max(0, Math.min(1, (corr + 1) / 2));
    const final = (0.55 * corrNorm) + (0.25 * overlap) + (0.20 * durationSimilarity);
    const score = Math.max(0, Math.min(100, Math.round(final * 100)));

    return {
        score,
        details: {
            correlation: Number(corrNorm.toFixed(3)),
            overlap: Number(overlap.toFixed(3)),
            durationSimilarity: Number(durationSimilarity.toFixed(3))
        }
    };
}

module.exports = { scorePerformance };
