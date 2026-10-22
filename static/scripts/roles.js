/**
 * roles.js — loaded on /createcall
 *
 * 1. Reads ?nome= from the URL to get the connection_type.
 * 2. Fetches room models from /api/models.
 * 3. Renders selectable role cards.
 * 4. Handles "Iniciar Sessão": validates inputs → navigates to /call with params.
 */

const urlParams      = new URLSearchParams(window.location.search);
const connectionType = urlParams.get('nome') || 'Sala de Aula';

let selectedRole = null;

// ── Boot ───────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    const model = await loadModel(connectionType);

    if (model) {
        renderRoleCards(model);
        document.getElementById('type-label').textContent = model.name;
    } else {
        document.getElementById('roles-card-container').innerHTML =
            '<p style="color:#888">Modelo não encontrado.</p>';
    }

    // Auto-generate a room ID the user can still edit
    const roomInput = document.getElementById('input-room-id');
    if (roomInput && !roomInput.value) {
        roomInput.value = generateRoomId();
    }

    document.getElementById('btn-iniciar').addEventListener('click', startSession);
});

// ── Fetch model ────────────────────────────────────────────────────────────────

async function loadModel(name) {
    try {
        const res    = await fetch('/api/models');
        const models = await res.json();
        return models.find(m => m.name === name) || null;
    } catch (err) {
        console.error('Erro ao carregar modelos:', err);
        return null;
    }
}

// ── Render role cards ──────────────────────────────────────────────────────────

function renderRoleCards(model) {
    const container = document.getElementById('roles-card-container');
    if (!container) return;

    const roles = model.roles ? Object.keys(model.roles) : [];

    if (roles.length === 0) {
        container.innerHTML = '<p style="color:#888">Este modelo não possui roles.</p>';
        return;
    }

    container.innerHTML = roles.map(role => {
        const caps = model.roles[role];
        const badges = buildCapBadges(caps);

        return `
        <div class="role-card" data-role="${role}" onclick="selectRole(this)">
            <div class="role-header"><h3>${role}</h3></div>
            <div class="role-capabilities">${badges}</div>
        </div>`;
    }).join('');
}

function buildCapBadges(caps) {
    if (!caps || typeof caps !== 'object') return '';
    const labels = {
        send_video:  'Enviar vídeo',
        recv_video:  'Receber vídeo',
        send_audio:  'Enviar áudio',
        recv_audio:  'Receber áudio',
        send_string: 'Enviar chat',
        recv_string: 'Receber chat',
    };
    return Object.entries(caps)
        .filter(([, v]) => v === true)
        .map(([k]) => `<p>✓ <strong>${labels[k] || k}</strong></p>`)
        .join('');
}

// ── Role selection ─────────────────────────────────────────────────────────────

function selectRole(card) {
    document.querySelectorAll('.role-card').forEach(c => c.classList.remove('role-card--selected'));
    card.classList.add('role-card--selected');
    selectedRole = card.dataset.role;
}

// ── Start session ──────────────────────────────────────────────────────────────

function startSession() {
    const username = document.getElementById('input-username')?.value.trim();
    const roomId   = document.getElementById('input-room-id')?.value.trim();

    if (!username) {
        alert('Por favor, informe seu nome.');
        return;
    }
    if (!roomId) {
        alert('Por favor, informe um ID de sala.');
        return;
    }
    if (!selectedRole) {
        alert('Por favor, selecione um papel (role).');
        return;
    }

    const params = new URLSearchParams({
        room_id:  roomId,
        username: username,
        role:     selectedRole,
        type:     connectionType,
    });

    window.location.href = `/call?${params.toString()}`;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateRoomId() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}
