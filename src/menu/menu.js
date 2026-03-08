const { ipcRenderer } = require("electron");

const items = document.querySelectorAll(".menu-item");

let index = 0;

window.onload = () => {
    ipcRenderer.send("bgm-play", { volume: 0.4 });
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
