const { ipcRenderer } = require("electron");
const { loadScenes } = require("../services/sceneLoader");
const { loadConfig } = require("../services/configService");
const path = require("path");

window.onload = () => {
    ipcRenderer.send("bgm-play", { volume: 0.4 });
};

const config = loadConfig();
const libraryPath = config.libraryPath || path.join(__dirname, "../../DubLibrary");
const PREVIEW_LENGTH_SECONDS = 8;

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
let activePreview = null;

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

function getPreviewBounds(scene) {
    const duration = Number(scene.duration) || 0;

    if (duration <= 0) {
        return { start: 0, end: PREVIEW_LENGTH_SECONDS };
    }

    const safeLength = Math.min(PREVIEW_LENGTH_SECONDS, Math.max(4, duration));
    const start = Math.max(0, (duration / 2) - (safeLength / 2));
    const end = Math.min(duration, start + safeLength);

    return { start, end };
}

function stopPreview(card) {
    if (!card || !card.previewVideo) return;

    card.classList.remove("preview-ready");
    card.previewVideo.pause();
    card.previewVideo.removeAttribute("src");
    card.previewVideo.load();
}

function startPreview(card, scene) {
    if (!card || !card.previewVideo) return;

    if (activePreview && activePreview !== card) {
        stopPreview(activePreview);
    }

    activePreview = card;
    ipcRenderer.send("bgm-pause");

    const previewUrl = toFileUrl(scene.video);
    const bounds = getPreviewBounds(scene);

    card.previewStart = bounds.start;
    card.previewEnd = bounds.end;
    card.classList.remove("preview-ready");

    card.previewVideo.src = previewUrl;
    card.previewVideo.currentTime = 0;

    card.previewVideo.onloadedmetadata = () => {
        const targetStart = Math.min(bounds.start, Math.max(0, card.previewVideo.duration - 0.25));
        card.previewVideo.currentTime = targetStart;
    };

    card.previewVideo.onseeked = () => {
        card.classList.add("preview-ready");
        card.previewVideo.play().catch(() => {
            card.previewVideo.muted = true;
            card.previewVideo.play().catch(() => {});
        });
    };
}

function circularDelta(index, center, size) {
    let d = index - center;
    if (d > size / 2) d -= size;
    if (d < -size / 2) d += size;
    return d;
}

function updateSelection() {
    const baseOffset = window.innerWidth < 1100 ? 285 : 420;

    cards.forEach((card, index) => {
        const d = circularDelta(index, selectedIndex, cards.length);
        const abs = Math.abs(d);

        const scale = abs === 0 ? 1.18 : abs === 1 ? 0.82 : abs === 2 ? 0.6 : 0.46;
        const opacity = abs === 0 ? 1 : abs === 1 ? 0.68 : abs === 2 ? 0.28 : 0;
        const x = d * baseOffset;
        const z = 100 - abs;

        card.style.transform = `translate(-50%, -50%) translateX(${x}px) scale(${scale})`;
        card.style.opacity = String(opacity);
        card.style.zIndex = String(z);
        card.style.pointerEvents = abs <= 2 ? "auto" : "none";
        card.classList.toggle("selected", abs === 0);

        if (abs === 0) {
            startPreview(card, scenes[index]);
        } else if (card === activePreview || card.classList.contains("preview-ready")) {
            stopPreview(card);
        }
    });
}

function createSceneCard(scene, index) {
    const card = document.createElement("div");
    card.className = "scene-card";

    card.innerHTML = `
        <div class="scene-thumb">
            <img src="${toFileUrl(scene.thumbnail)}">
            <video playsinline preload="metadata"></video>
            <div class="scene-preview-badge">Preview</div>
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

    card.previewVideo = card.querySelector("video");
    card.previewVideo.volume = 1;
    card.previewVideo.addEventListener("timeupdate", () => {
        if (card !== activePreview) return;

        if (card.previewVideo.currentTime >= card.previewEnd) {
            card.previewVideo.currentTime = card.previewStart;
            card.previewVideo.play().catch(() => {});
        }
    });

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

window.addEventListener("beforeunload", () => {
    if (activePreview) {
        stopPreview(activePreview);
    }
});
