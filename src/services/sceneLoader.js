const fs = require("fs");
const path = require("path");

function loadScenes(libraryPath) {
    if (!libraryPath || !fs.existsSync(libraryPath)) {
        throw new Error("Library folder not found: " + libraryPath);
    }

    const scenes = [];
    const folders = fs.readdirSync(libraryPath, { withFileTypes: true });

    folders.forEach(folder => {
        if (!folder.isDirectory()) return;

        const sceneFolder = path.join(libraryPath, folder.name);
        const metadataPath = path.join(sceneFolder, "scene.json");
        const video = path.join(sceneFolder, "video.mp4");
        const thumbnail = path.join(sceneFolder, "thumbnail.jpg");

        if (!fs.existsSync(metadataPath) || !fs.existsSync(video) || !fs.existsSync(thumbnail)) {
            return;
        }

        const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));

        scenes.push({
            title: metadata.title,
            duration: metadata.duration,
            voices: metadata.voices || 1,
            difficulty: metadata.difficulty || "Normal",
            video,
            thumbnail
        });
    });

    return scenes;
}

module.exports = { loadScenes };
