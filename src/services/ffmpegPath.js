let ffmpegPath = "ffmpeg";

try {
    const staticPath = require("ffmpeg-static");
    if (staticPath) {
        ffmpegPath = staticPath;
    }
} catch (_err) {
    // Fallback to system ffmpeg when ffmpeg-static is not installed.
}

module.exports = { ffmpegPath };
