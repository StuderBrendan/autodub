const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const videosDir = path.join(__dirname, "media", "videos");
const thumbnailsDir = path.join(__dirname, "media", "thumbnails");

// créer le dossier thumbnails si nécessaire
if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
}

const videoExtensions = [".mp4", ".mkv", ".mov", ".webm"];

fs.readdirSync(videosDir).forEach(file => {

    const ext = path.extname(file).toLowerCase();

    if (!videoExtensions.includes(ext)) return;

    const videoPath = path.join(videosDir, file);

    const baseName = path.parse(file).name;

    const thumbnailPath = path.join(thumbnailsDir, baseName + ".jpg");

    // si la thumbnail existe déjà on skip
    if (fs.existsSync(thumbnailPath)) {
        console.log("Thumbnail already exists:", baseName);
        return;
    }

    const command = `ffmpeg -i "${videoPath}" -ss 00:00:20 -vframes 1 "${thumbnailPath}"`;

    console.log("Generating thumbnail for", file);

    exec(command, (err) => {

        if (err) {
            console.error("Error:", err);
        } else {
            console.log("Thumbnail created:", thumbnailPath);
        }

    });

});