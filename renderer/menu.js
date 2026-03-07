async function loadScenes(){

    const response = await fetch("../scenes/scenes.json");

    const scenes = await response.json();

    const grid = document.getElementById("sceneGrid");

    scenes.forEach(scene => {

        const card = document.createElement("div");

        card.className = "scene-card";

        card.innerHTML = `
            <div class="scene-thumb">
                <img src="../media/thumbnails/${scene.thumbnail}">
            </div>

            <div class="scene-info">
                <div class="scene-title">${scene.title}</div>
                <div class="scene-duration">${scene.duration}s</div>
            </div>
        `;

        card.onclick = () => {

            const url = `player.html?video=${encodeURIComponent(scene.file)}&title=${encodeURIComponent(scene.title)}`;

            window.location = url;

        };

        grid.appendChild(card);

    });

}

loadScenes();