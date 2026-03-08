const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const fs = require("fs");
const path = require("path");

let mainWindow;
let musicWindow;
let musicReady = false;
const pendingMusicCommands = [];

function getRuntimePaths() {
    const baseDir = app.getPath("userData");
    const tempDir = path.join(baseDir, "temp");
    const exportsDir = path.join(baseDir, "exports");

    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(exportsDir, { recursive: true });

    return { baseDir, tempDir, exportsDir };
}

ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog({
        properties: ["openDirectory"]
    });

    if (result.canceled) return null;

    return result.filePaths[0];
});

ipcMain.handle("get-runtime-paths", async () => {
    return getRuntimePaths();
});

ipcMain.handle("save-video", async (_event, sourcePath) => {
    if (!sourcePath || !fs.existsSync(sourcePath)) {
        throw new Error("Fichier source introuvable.");
    }

    const defaultName = path.basename(sourcePath);

    const result = await dialog.showSaveDialog({
        title: "Exporter le resultat",
        defaultPath: defaultName,
        filters: [{ name: "Video MP4", extensions: ["mp4"] }]
    });

    if (result.canceled || !result.filePath) {
        return null;
    }

    fs.copyFileSync(sourcePath, result.filePath);
    return result.filePath;
});

ipcMain.on("quit-app", () => {
    app.quit();
});

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile("src/menu/menu.html");

    mainWindow.on("closed", () => {
        mainWindow = null;

        if (musicWindow && !musicWindow.isDestroyed()) {
            musicWindow.close();
        }
    });
}

function createMusicWindow() {
    musicWindow = new BrowserWindow({
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    musicWindow.loadFile("src/shared/music.html");

    musicWindow.webContents.on("did-finish-load", () => {
        musicReady = true;

        while (pendingMusicCommands.length > 0) {
            const cmd = pendingMusicCommands.shift();
            musicWindow.webContents.send("bgm-control", cmd);
        }
    });

    musicWindow.on("closed", () => {
        musicWindow = null;
        musicReady = false;
    });
}

function sendBgmCommand(cmd) {
    if (!musicWindow || musicWindow.isDestroyed()) return;

    if (!musicReady) {
        pendingMusicCommands.push(cmd);
        return;
    }

    musicWindow.webContents.send("bgm-control", cmd);
}

ipcMain.on("bgm-play", (_event, options = {}) => {
    sendBgmCommand({ type: "play", ...options });
});

ipcMain.on("bgm-pause", () => {
    sendBgmCommand({ type: "pause" });
});

ipcMain.on("bgm-set-volume", (_event, volume) => {
    sendBgmCommand({ type: "set-volume", volume });
});

app.whenReady().then(() => {
    createMusicWindow();
    createMainWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMusicWindow();
            createMainWindow();
        }
    });
});

app.on("before-quit", () => {
    if (musicWindow && !musicWindow.isDestroyed()) {
        musicWindow.destroy();
    }
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
