const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { getDataDir } = require("./configService");

let bundledYtDlp = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";

try {
    const ytdlpStaticPath = require("yt-dlp-static");
    if (ytdlpStaticPath) {
        bundledYtDlp = ytdlpStaticPath;
    }
} catch (_err) {
    // Fallback to system yt-dlp.
}

const toolsDir = path.join(getDataDir(), "tools");
const localYtDlp = path.join(toolsDir, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
let preferredYtDlp = fs.existsSync(localYtDlp) ? localYtDlp : bundledYtDlp;

function getCleanEnv() {
    const env = { ...process.env };

    delete env.YT_DLP_OPTIONS;
    delete env.YTDLP_OPTIONS;
    delete env.YT_DLP_FORMAT;
    delete env.YTDLP_FORMAT;

    return env;
}

function isPreconditionError(err) {
    const msg = (err && err.message ? err.message : String(err)).toLowerCase();
    return msg.includes("precondition check failed") || msg.includes("http error 400");
}

function runYtDlpWithCommand(command, args) {
    return new Promise((resolve, reject) => {
        const fullArgs = ["--ignore-config", ...args];

        execFile(
            command,
            fullArgs,
            { maxBuffer: 1024 * 1024 * 24, windowsHide: true, env: getCleanEnv() },
            (err, stdout, stderr) => {
                if (err) {
                    if (err.code === "ENOENT") {
                        reject(new Error("yt-dlp introuvable. Installe yt-dlp puis reessaie."));
                        return;
                    }

                    const details = (stderr || stdout || err.message || "").toString().trim();
                    reject(new Error(details || "Echec yt-dlp"));
                    return;
                }

                resolve(stdout.toString());
            }
        );
    });
}

function downloadFileWithRedirects(url, destinationPath, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, response => {
            if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location && maxRedirects > 0) {
                response.resume();
                downloadFileWithRedirects(response.headers.location, destinationPath, maxRedirects - 1)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                response.resume();
                reject(new Error(`Download failed with HTTP ${response.statusCode}`));
                return;
            }

            const fileStream = fs.createWriteStream(destinationPath);
            response.pipe(fileStream);

            fileStream.on("finish", () => {
                fileStream.close(() => resolve());
            });

            fileStream.on("error", err => {
                fileStream.destroy();
                reject(err);
            });
        });

        req.on("error", reject);
    });
}

async function ensureFreshYtDlpLocal() {
    fs.mkdirSync(toolsDir, { recursive: true });

    const downloadUrl = process.platform === "win32"
        ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
        : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";

    const tempPath = `${localYtDlp}.tmp`;
    await downloadFileWithRedirects(downloadUrl, tempPath);

    if (process.platform !== "win32") {
        fs.chmodSync(tempPath, 0o755);
    }

    if (fs.existsSync(localYtDlp)) {
        fs.unlinkSync(localYtDlp);
    }

    fs.renameSync(tempPath, localYtDlp);
    preferredYtDlp = localYtDlp;
}

async function runYtDlp(args) {
    try {
        return await runYtDlpWithCommand(preferredYtDlp, args);
    } catch (err) {
        if (!isPreconditionError(err)) {
            throw err;
        }

        await ensureFreshYtDlpLocal();
        return runYtDlpWithCommand(preferredYtDlp, args);
    }
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https
            .get(url, res => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    res.resume();
                    return;
                }

                let data = "";
                res.setEncoding("utf8");
                res.on("data", chunk => {
                    data += chunk;
                });
                res.on("end", () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (err) {
                        reject(err);
                    }
                });
            })
            .on("error", reject);
    });
}

function extractYoutubeId(url) {
    const patterns = [
        /[?&]v=([\w-]{6,})/,
        /youtu\.be\/([\w-]{6,})/,
        /youtube\.com\/shorts\/([\w-]{6,})/
    ];

    for (const re of patterns) {
        const m = url.match(re);
        if (m && m[1]) return m[1];
    }

    return null;
}

function slugify(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80) || "scene_youtube";
}

function ensureSceneFolder(libraryPath, title) {
    const base = slugify(title);
    let folder = path.join(libraryPath, base);

    if (fs.existsSync(folder)) {
        folder = path.join(libraryPath, `${base}_${Date.now()}`);
    }

    fs.mkdirSync(folder, { recursive: true });
    return folder;
}

function pickProgressiveFormatId(formats) {
    if (!Array.isArray(formats)) return null;

    const candidates = formats
        .filter(f =>
            f &&
            f.format_id &&
            f.vcodec && f.vcodec !== "none" &&
            f.acodec && f.acodec !== "none")
        .sort((a, b) => {
            const h = (Number(b.height) || 0) - (Number(a.height) || 0);
            if (h !== 0) return h;
            return (Number(b.tbr) || 0) - (Number(a.tbr) || 0);
        });

    return candidates.length ? String(candidates[0].format_id) : null;
}

function compactError(err) {
    const msg = (err && err.message ? err.message : String(err)).trim();
    return msg.split(/\r?\n/).slice(0, 4).join(" | ");
}

async function tryDownload(attempts, contextLabel) {
    const traces = [];

    for (const attempt of attempts) {
        const { label, args } = attempt;

        try {
            await runYtDlp(args);
            return;
        } catch (err) {
            traces.push(`[${contextLabel}] ${label}: ${compactError(err)}`);
        }
    }

    throw new Error(traces.join("\n"));
}

function buildVideoAttempts(url, sceneFolder, formatId) {
    const outputTpl = path.join(sceneFolder, "video.%(ext)s");
    const attempts = [];

    if (formatId) {
        attempts.push({
            label: `format_id=${formatId}`,
            args: [
                "--no-playlist",
                "-f", formatId,
                "--recode-video", "mp4",
                "-o", outputTpl,
                url
            ]
        });
    }

    attempts.push(
        {
            label: "bv*+ba/b",
            args: [
                "--no-playlist",
                "-f", "bv*+ba/b",
                "--merge-output-format", "mp4",
                "-o", outputTpl,
                url
            ]
        },
        {
            label: "best",
            args: [
                "--no-playlist",
                "-f", "best",
                "--recode-video", "mp4",
                "-o", outputTpl,
                url
            ]
        },
        {
            label: "android best",
            args: [
                "--no-playlist",
                "--extractor-args", "youtube:player_client=android",
                "-f", "best",
                "--recode-video", "mp4",
                "-o", outputTpl,
                url
            ]
        },
        {
            label: "android auto",
            args: [
                "--no-playlist",
                "--extractor-args", "youtube:player_client=android",
                "--recode-video", "mp4",
                "-o", outputTpl,
                url
            ]
        },
        {
            label: "auto format",
            args: [
                "--no-playlist",
                "--recode-video", "mp4",
                "-o", outputTpl,
                url
            ]
        }
    );

    return attempts;
}

async function getMetadata(url) {
    const attempts = [
        {
            label: "metadata default",
            args: [
                "--no-playlist",
                "--dump-single-json",
                "--no-warnings",
                url
            ]
        },
        {
            label: "metadata android",
            args: [
                "--no-playlist",
                "--extractor-args", "youtube:player_client=android",
                "--dump-single-json",
                "--no-warnings",
                url
            ]
        }
    ];

    const traces = [];

    for (const attempt of attempts) {
        try {
            const raw = await runYtDlp(attempt.args);
            return JSON.parse(raw);
        } catch (err) {
            traces.push(`[metadata] ${attempt.label}: ${compactError(err)}`);
        }
    }

    try {
        const oembed = await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
        return {
            title: oembed.title || "Nouvel extrait",
            duration: 0,
            formats: []
        };
    } catch (_err) {
        const id = extractYoutubeId(url) || "video";
        traces.push("[metadata] oEmbed fallback failed");
        return {
            title: `YouTube_${id}`,
            duration: 0,
            formats: [],
            _debugMetadataErrors: traces
        };
    }
}

async function importFromYoutube(url, libraryPath) {
    if (!url || !url.trim()) {
        throw new Error("URL YouTube vide.");
    }

    if (!libraryPath || !fs.existsSync(libraryPath)) {
        throw new Error("Dossier de bibliotheque invalide.");
    }

    const metadata = await getMetadata(url);

    const title = metadata.title || "Nouvel extrait";
    const duration = Math.round(Number(metadata.duration) || 0);

    const sceneFolder = ensureSceneFolder(libraryPath, title);

    try {
        const formatId = pickProgressiveFormatId(metadata.formats);
        await tryDownload(buildVideoAttempts(url, sceneFolder, formatId), "video");
    } catch (videoErr) {
        const extra = Array.isArray(metadata._debugMetadataErrors) ? `\n${metadata._debugMetadataErrors.join("\n")}` : "";
        throw new Error(`Echec telechargement video.\n${videoErr.message}${extra}`);
    }

    try {
        await tryDownload([
            {
                label: "thumbnail default",
                args: [
                    "--no-playlist",
                    "--skip-download",
                    "--write-thumbnail",
                    "--convert-thumbnails", "jpg",
                    "-o", path.join(sceneFolder, "thumbnail.%(ext)s"),
                    url
                ]
            },
            {
                label: "thumbnail android",
                args: [
                    "--no-playlist",
                    "--extractor-args", "youtube:player_client=android",
                    "--skip-download",
                    "--write-thumbnail",
                    "--convert-thumbnails", "jpg",
                    "-o", path.join(sceneFolder, "thumbnail.%(ext)s"),
                    url
                ]
            }
        ], "thumbnail");
    } catch (thumbErr) {
        const fallbackThumb = path.join(__dirname, "../assets/logo/autodub.png");
        fs.copyFileSync(fallbackThumb, path.join(sceneFolder, "thumbnail.jpg"));
        console.warn("Thumbnail fallback used:", thumbErr.message);
    }

    const sceneJson = {
        title,
        duration,
        voices: 1,
        difficulty: "Normal"
    };

    fs.writeFileSync(
        path.join(sceneFolder, "scene.json"),
        JSON.stringify(sceneJson, null, 2),
        "utf8"
    );

    return {
        title,
        folder: sceneFolder,
        duration
    };
}

module.exports = { importFromYoutube };
