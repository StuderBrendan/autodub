const { ipcRenderer } = require("electron");
const { loadScenes } = require("../services/sceneLoader");
const { loadConfig } = require("../services/configService");
const path = require("path");

window.onload = () => {
    ipcRenderer.send("bgm-play", { volume: 0.4 });
};

const config = loadConfig();
const libraryPath = config.libraryPath || path.join(__dirname, "../../DubLibrary");

let scenes = [];

try {
    scenes = loadScenes(libraryPath);
} catch (err) {
    alert("Impossible de charger la bibliothèque: " + err.message);
}

const grid = document.getElementById("sceneGrid");

document.getElementById("backBtn").onclick = () => {
    window.location = "../menu/menu.html";
};

function toFileUrl(filePath) {
    return `file:///${filePath.replace(/\\/g, "/")}`;
}

scenes.forEach(scene => {
    const card = document.createElement("div");

    card.className = "scene-card";

    card.innerHTML = `
        <div class="scene-thumb">
            <img src="${toFileUrl(scene.thumbnail)}">
        </div>

        <div class="scene-info">
            <div class="scene-title">${scene.title}</div>
            <div class="scene-duration">${scene.duration}s</div>
        </div>
    `;

    card.onclick = () => {
        const url = `../player/player.html?video=${encodeURIComponent(scene.video)}&title=${encodeURIComponent(scene.title)}`;
        window.location = url;
    };

    grid.appendChild(card);
});
