const fs = require("fs");
const path = require("path");

function loadScenes(libraryPath){

    const scenes = [];

    const folders = fs.readdirSync(libraryPath, { withFileTypes: true });

    folders.forEach(folder => {

        if(!folder.isDirectory()) return;

        const sceneFolder = path.join(libraryPath, folder.name);

        const metadataPath = path.join(sceneFolder, "scene.json");

        if(!fs.existsSync(metadataPath)) return;

        const metadata = JSON.parse(fs.readFileSync(metadataPath));

        const video = path.join(sceneFolder, "video.mp4");
        const thumbnail = path.join(sceneFolder, "thumbnail.jpg");

        scenes.push({
            title: metadata.title,
            duration: metadata.duration,
            video,
            thumbnail
        });

    });

    return scenes;
}

module.exports = { loadScenes };