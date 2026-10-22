/**
 * start_call.js
 * Loaded on the Home page.
 * Fetches room models from the Flask API and renders the rooms grid.
 */

let roomsData = [];

async function initSlider() {
    try {
        const response = await fetch('/api/models');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        roomsData = await response.json();
        renderRooms();
    } catch (error) {
        console.error('Erro ao carregar os dados das salas:', error);
    }
}

function renderRooms() {
    const container = document.getElementById('rooms-container-id');
    if (!container) return;

    const html = roomsData.map((room, index) => {
        // First entry is "Crie um Room" (create your own model).
        const href = index === 0
            ? `/createModel?nome=${encodeURIComponent(room.name)}`
            : `/createcall?nome=${encodeURIComponent(room.name)}`;

        const imgSrc = room.imagem?.src
            ? `/static/${room.imagem.src}`
            : '/static/images/plus.png';

        const imgAlt = room.imagem?.alt || room.name;

        return `
        <div class="rooms-card">
            <a href="${href}" class="rooms-link">
                <img src="${imgSrc}" alt="${imgAlt}">
                <p>${room.description ?? ''}</p>
                <h3>${room.name}</h3>
            </a>
        </div>`;
    }).join('');

    container.innerHTML = html;
}

initSlider();
