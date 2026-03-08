# AutoDub

AutoDub est une application Electron pour doubler des extraits de films: selection d'une scene, enregistrement micro, mixage audio avec la piste originale, puis affichage du resultat et export video.

## Getting Started (Developers)

### Prerequisites
- Node.js 18+
- npm
- Windows (recommande pour les builds `.exe`)

### Installation
```bash
npm install
```

### Lancer en developpement
```bash
npm start
```

L'application demarre sur le menu principal.

## Project Structure

```text
autodub/
  main.js
  src/
    menu/
    library/
    player/
    result/
    settings/
    services/
    assets/
    shared/
  DubLibrary/
    <scene_name>/
      scene.json
      video.mp4
      thumbnail.jpg
  dist/
```

## Importer De Nouveaux Extraits (YouTube)

AutoDub peut importer automatiquement un nouvel extrait a partir d'une URL YouTube.

### Depuis l'interface
1. Ouvrir `Settings`.
2. Choisir le `Dossier des extraits` (si ce n'est pas deja fait).
3. Coller une URL YouTube dans `Importer depuis YouTube`.
4. Cliquer sur `Importer`.

### Ce que l'app cree automatiquement
Dans `DubLibrary/<nom_scene>/`:
- `video.mp4` (qualite visee: jusqu'a 1080p quand disponible)
- `thumbnail.jpg`
- `scene.json` (avec `title`, `duration`, `voices`, `difficulty`)

### Notes
- L'application embarque `yt-dlp` en release, donc pas besoin d'installation manuelle pour l'utilisateur final.
- Si YouTube change son API, AutoDub peut telecharger une version plus recente de `yt-dlp` dans `%APPDATA%/AutoDub/tools`.

## Scene Format (`DubLibrary/<scene>/scene.json`)

Chaque extrait doit contenir ces fichiers:
- `video.mp4`
- `thumbnail.jpg`
- `scene.json`

Exemple de `scene.json`:

```json
{
  "title": "Ratatouille - La soupe",
  "duration": 104,
  "voices": 3,
  "difficulty": "Normal"
}
```

Champs utilises:
- `title`: nom affiche dans la selection
- `duration`: duree de l'extrait en secondes
- `voices`: nombre de voix/personnages de l'extrait
- `difficulty`: niveau indicatif (`Facile`, `Normal`, `Difficile`, `Expert`, etc.)

## Release (Windows)

### 1. Verifier que le projet compile
```bash
npm start
```

### 2. Generer un build installable
```bash
npm run dist
```

Sortie attendue:
- `dist/AutoDub Setup 1.0.0.exe` (installateur)
- `dist/AutoDub Setup 1.0.0.exe.blockmap`

### 3. Generer un build executable direct (sans install)
```bash
npm run dist:dir
```

Sortie attendue:
- `dist/win-unpacked/AutoDub.exe`

## Troubleshooting

### Le micro n'apparait pas dans Settings
- Verifier les permissions micro Windows.
- Ouvrir la page Settings puis relancer un test micro.
- Si besoin, debrancher/rebrancher le micro puis redemarrer l'app.

### Erreur pendant le scoring/mix audio
- Le projet utilise `ffmpeg-static` en release.
- En dev, verifier que les dependances npm sont bien installees (`npm install`).
- Verifier que la scene a bien `video.mp4` et que l'enregistrement est bien cree dans `temp/`.

### Erreur d'import YouTube
- Verifier que l'URL est valide et publique.
- Reessayer l'import (AutoDub tente plusieurs strategies de format/clients YouTube).
- Si besoin, fermer et relancer l'application pour relancer proprement l'import.

### Le build Windows echoue (EPERM/symlink/app-builder)
- Relancer le terminal en administrateur.
- Verifier que l'antivirus ne bloque pas `electron-builder`.
- Reessayer:
  ```bash
  npm run dist
  ```

## Notes
- Le projet embarque `ffmpeg` via `ffmpeg-static` pour le mixage et le scoring audio.
- Le projet embarque `yt-dlp` via `yt-dlp-static` pour l'import YouTube.
- En release locale, l'executable n'est pas signe numeriquement.
