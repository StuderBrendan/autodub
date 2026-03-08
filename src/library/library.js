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
    alert("Impossible de charger la bibliotheque: " + err.message);
}

const carousel = document.getElementById("sceneCarousel");
const selectionHint = document.getElementById("selectionHint");
let selectedIndex = 0;
let cards = [];

document.getElementById("backBtn").onclick = () => {
    window.location = "../menu/menu.html";
};

function toFileUrl(filePath) {
    return `file:///${filePath.replace(/\\/g, "/")}`;
}

function activateScene(index) {
    const scene = scenes[index];
    if (!scene) return;

    const url = `../player/player.html?video=${encodeURIComponent(scene.video)}&title=${encodeURIComponent(scene.title)}`;
    window.location = url;
}

function circularDelta(index, center, size) {
    let d = index - center;
    if (d > size / 2) d -= size;
    if (d < -size / 2) d += size;
    return d;
}

function updateSelection() {
    const baseOffset = window.innerWidth < 1100 ? 250 : 340;

    cards.forEach((card, index) => {
        const d = circularDelta(index, selectedIndex, cards.length);
        const abs = Math.abs(d);

        const scale = abs === 0 ? 1 : abs === 1 ? 0.84 : abs === 2 ? 0.66 : 0.52;
        const opacity = abs === 0 ? 1 : abs === 1 ? 0.76 : abs === 2 ? 0.36 : 0;
        const x = d * baseOffset;
        const z = 100 - abs;

        card.style.transform = `translate(-50%, -50%) translateX(${x}px) scale(${scale})`;
        card.style.opacity = String(opacity);
        card.style.zIndex = String(z);
        card.style.pointerEvents = abs <= 2 ? "auto" : "none";
        card.classList.toggle("selected", abs === 0);
    });
}

function createSceneCard(scene, index) {
    const card = document.createElement("div");
    card.className = "scene-card";

    card.innerHTML = `
        <div class="scene-thumb">
            <img src="${toFileUrl(scene.thumbnail)}">
        </div>

        <div class="scene-info">
            <div class="scene-title">${scene.title}</div>
            <div class="scene-meta">
                <span class="meta-pill">${scene.duration}s</span>
                <span class="meta-pill">${scene.voices} voix</span>
                <span class="meta-pill">${scene.difficulty}</span>
            </div>
        </div>
    `;

    card.onclick = () => {
        if (index === selectedIndex) {
            activateScene(index);
            return;
        }

        selectedIndex = index;
        updateSelection();
    };

    return card;
}

if (scenes.length === 0) {
    selectionHint.textContent = "Aucun extrait trouve dans la bibliotheque.";
} else {
    scenes.forEach((scene, index) => {
        const card = createSceneCard(scene, index);
        cards.push(card);
        carousel.appendChild(card);
    });

    updateSelection();
}

document.addEventListener("keydown", event => {
    if (scenes.length === 0) return;

    if (["ArrowRight", "ArrowDown"].includes(event.key)) {
        selectedIndex = (selectedIndex + 1) % scenes.length;
        updateSelection();
        event.preventDefault();
    }

    if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
        selectedIndex = (selectedIndex - 1 + scenes.length) % scenes.length;
        updateSelection();
        event.preventDefault();
    }

    if (event.key === "Enter") {
        activateScene(selectedIndex);
        event.preventDefault();
    }
});

window.addEventListener("resize", () => {
    if (scenes.length > 0) updateSelection();
});
