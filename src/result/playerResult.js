const { ipcRenderer } = require("electron");

ipcRenderer.send("bgm-pause");

const params = new URLSearchParams(window.location.search);
const resultVideoPath = params.get("video");
const sourceVideoPath = params.get("source");
const sourceTitle = params.get("title") || "Scene";

const resultVideo = document.getElementById("resultVideo");
const scoreValue = document.getElementById("scoreValue");
const scoreMeter = document.getElementById("scoreMeter");
const scoreGrade = document.getElementById("scoreGrade");
const stars = document.getElementById("stars");
const exportStatus = document.getElementById("exportStatus");
const retryBtn = document.getElementById("retryBtn");
const exportBtn = document.getElementById("exportBtn");

function toFileUrl(filePath) {
    return `file:///${filePath.replace(/\\/g, "/")}`;
}

function hashString(input) {
    let h = 0;
    for (let i = 0; i < input.length; i++) {
        h = (h << 5) - h + input.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

function getGradeInfo(score) {
    if (score >= 95) return { text: "SUPER STAR", className: "grade-super", stars: 5 };
    if (score >= 88) return { text: "EXCELLENT", className: "grade-excellent", stars: 4 };
    if (score >= 78) return { text: "GENIAL", className: "grade-genial", stars: 4 };
    if (score >= 66) return { text: "BIEN", className: "grade-bien", stars: 3 };
    return { text: "A AMELIORER", className: "grade-low", stars: 2 };
}

function renderStars(count) {
    const full = "*".repeat(count);
    const empty = ".".repeat(5 - count);
    stars.textContent = full + empty;
    stars.classList.remove("revealed");
    void stars.offsetWidth;
    stars.classList.add("revealed");
}

function animateScore(targetScore) {
    const duration = 1100;
    const start = performance.now();

    function frame(now) {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(targetScore * eased);

        scoreValue.textContent = String(current);
        scoreMeter.style.width = `${current}%`;

        if (progress < 1) {
            requestAnimationFrame(frame);
        }
    }

    requestAnimationFrame(frame);
}

if (!resultVideoPath) {
    exportStatus.textContent = "Resultat introuvable.";
    exportBtn.disabled = true;
    retryBtn.disabled = !sourceVideoPath;
} else {
    resultVideo.src = toFileUrl(resultVideoPath);
}

resultVideo.addEventListener("loadedmetadata", () => {
    const base = hashString(`${sourceTitle}|${resultVideoPath}`) % 31;
    const durationBoost = Math.min(12, Math.round((resultVideo.duration || 0) / 6));
    const score = Math.min(100, 62 + base + durationBoost);

    const grade = getGradeInfo(score);

    scoreGrade.textContent = grade.text;
    scoreGrade.className = `score-grade ${grade.className}`;

    animateScore(score);
    setTimeout(() => renderStars(grade.stars), 300);
});

document.getElementById("backBtn").onclick = () => {
    ipcRenderer.send("bgm-play", { volume: 0.4 });
    window.location = "../menu/menu.html";
};

retryBtn.onclick = () => {
    if (!sourceVideoPath) {
        exportStatus.textContent = "Impossible de recommencer: extrait source manquant.";
        return;
    }

    window.location = `../player/player.html?video=${encodeURIComponent(sourceVideoPath)}&title=${encodeURIComponent(sourceTitle)}`;
};

exportBtn.onclick = async () => {
    if (!resultVideoPath) return;

    try {
        exportStatus.textContent = "Export en cours...";
        const savedPath = await ipcRenderer.invoke("save-video", resultVideoPath);

        if (!savedPath) {
            exportStatus.textContent = "Export annule.";
            return;
        }

        exportStatus.textContent = `Export termine: ${savedPath}`;
    } catch (err) {
        exportStatus.textContent = "Erreur export: " + err.message;
    }
};
