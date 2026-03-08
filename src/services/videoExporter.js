const { execFile } = require("child_process");
const { ffmpegPath } = require("./ffmpegPath");

function exportDub(videoPath, audioPath, outputPath) {
    return new Promise((resolve, reject) => {
        const args = [
            "-y",
            "-i", videoPath,
            "-i", audioPath,
            "-filter_complex", "amix=inputs=2",
            outputPath
        ];

        execFile(ffmpegPath, args, { windowsHide: true }, err => {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });
}

module.exports = { exportDub };
