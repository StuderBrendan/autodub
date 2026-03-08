const { ipcRenderer } = require("electron");

const items = document.querySelectorAll(".menu-item");
const muteBtn = document.getElementById("muteBtn");

let index = 0;

function updateMuteLabel(state) {
    const muted = !!state.muted;
    muteBtn.textContent = String.fromCodePoint(muted ? 0x1F507 : 0x1F50A);
    muteBtn.setAttribute("aria-label", muted ? "Activer la musique" : "Couper la musique");
    muteBtn.title = muted ? "Activer la musique" : "Couper la musique";
}

window.onload = async () => {
    ipcRenderer.send("bgm-play", { volume: 0.4 });

    const state = await ipcRenderer.invoke("bgm-get-state");
    updateMuteLabel(state);
};

muteBtn.onclick = async () => {
    const state = await ipcRenderer.invoke("bgm-toggle-mute");
    updateMuteLabel(state);
};

function updateSelection() {
    items.forEach(i => i.classList.remove("selected"));
    items[index].classList.add("selected");
}

function activate() {
    const action = items[index].dataset.action;

    if (action === "dub") {
        window.location.href = "../library/library.html";
    }

    if (action === "settings") {
        window.location.href = "../settings/settings.html";
    }

    if (action === "quit") {
        ipcRenderer.send("quit-app");
    }
}

document.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") {
        index++;
        if (index >= items.length) index = 0;
        updateSelection();
    }

    if (e.key === "ArrowUp") {
        index--;
        if (index < 0) index = items.length - 1;
        updateSelection();
    }

    if (e.key === "Enter") {
        activate();
    }
});

items.forEach((item, i) => {
    item.onclick = () => {
        index = i;
        activate();
    };
});
