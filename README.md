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

### Le build Windows echoue (EPERM/symlink/app-builder)
- Relancer le terminal en administrateur.
- Verifier que l'antivirus ne bloque pas `electron-builder`.
- Reessayer:
  ```bash
  npm run dist
  ```

## Notes
- Le projet embarque `ffmpeg` via `ffmpeg-static` pour le mixage et le scoring audio.
- En release locale, l'executable n'est pas signe numeriquement.
