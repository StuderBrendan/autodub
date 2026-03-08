const { loadScenes } = require("../services/sceneLoader");
const path = require("path");

const libraryPath = path.join(__dirname, "../DubLibrary");
const scenes = loadScenes(libraryPath);

const grid = document.getElementById("sceneGrid");

document.getElementById("settingsBtn").onclick = () => {

    window.location = "settings.html";

};

scenes.forEach(scene => {

    const card = document.createElement("div");

    card.className = "scene-card";

    card.innerHTML = `
        <div class="scene-thumb">
            <img src="${scene.thumbnail}">
        </div>

        <div class="scene-info">
            <div class="scene-title">${scene.title}</div>
            <div class="scene-duration">${scene.duration}s</div>
        </div>
    `;

    card.onclick = () => {

        const url = `player.html?video=${encodeURIComponent(scene.video)}&title=${encodeURIComponent(scene.title)}`;

        window.location = url;

    };

    grid.appendChild(card);

});