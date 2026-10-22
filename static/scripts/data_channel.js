/**
 * data_channel.js
 * Manages RTCDataChannels — one per peer connection — for peer-to-peer text chat.
 * Media (audio/video) is NOT involved here; messages travel directly between browsers.
 *
 * Exposes:
 *   - setupDataChannel(channel, remoteSid)  called from peer_connection.js
 *   - sendMessage(text)                     called from the chat UI
 */

// sid → RTCDataChannel
const dataChannels = new Map();

// ── Channel setup ──────────────────────────────────────────────────────────────

/**
 * Attach event handlers to a data channel.
 * Called both by the CALLER (after createDataChannel) and
 * by the CALLEE (inside pc.ondatachannel).
 *
 * @param {RTCDataChannel} channel
 * @param {string}         remoteSid
 */
function setupDataChannel(channel, remoteSid) {
    dataChannels.set(remoteSid, channel);

    channel.onopen = () => {
        console.log(`DataChannel open  with ${remoteSid}`);
        appendSystemMessage(`${remoteSid.slice(0, 6)} connected to chat`);
    };

    channel.onclose = () => {
        console.log(`DataChannel closed with ${remoteSid}`);
        dataChannels.delete(remoteSid);
    };

    channel.onerror = (err) => {
        console.error(`DataChannel error [${remoteSid}]:`, err);
    };

    // Every message received through the channel
    channel.onmessage = ({ data }) => {
        try {
            const msg = JSON.parse(data);
            appendChatMessage(msg.from, msg.text, 'remote');
        } catch {
            appendChatMessage('unknown', data, 'remote');
        }
    };
}

// ── Send ───────────────────────────────────────────────────────────────────────

/**
 * Broadcast a text message to ALL open data channels.
 * The server is NOT involved — this is true peer-to-peer.
 *
 * @param {string} text
 */
function sendMessage(text) {
    if (!text.trim()) return;

    const payload = JSON.stringify({ from: username, text });

    let sent = 0;
    dataChannels.forEach((dc) => {
        if (dc.readyState === 'open') {
            dc.send(payload);
            sent++;
        }
    });

    if (sent > 0 || dataChannels.size === 0) {
        // Show the message to the local user immediately
        appendChatMessage('You', text, 'local');
    } else {
        appendSystemMessage('No open data channels yet — message not sent.');
    }
}

// ── Receive / display ──────────────────────────────────────────────────────────

/**
 * Append a chat bubble to the chat panel.
 *
 * @param {string} from    Display name of the sender
 * @param {string} text    Message body
 * @param {'local'|'remote'} side
 */
function appendChatMessage(from, text, side) {
    const list = document.getElementById('chat-messages');
    if (!list) return;

    const item = document.createElement('li');
    item.className = `chat-msg chat-msg--${side}`;

    const sender = document.createElement('span');
    sender.className = 'chat-msg__sender';
    sender.textContent = from;

    const body = document.createElement('span');
    body.className = 'chat-msg__body';
    body.textContent = text;

    item.appendChild(sender);
    item.appendChild(body);
    list.appendChild(item);
    list.scrollTop = list.scrollHeight;
}

/** Append a system / status line to the chat panel. */
function appendSystemMessage(text) {
    const list = document.getElementById('chat-messages');
    if (!list) return;

    const item = document.createElement('li');
    item.className = 'chat-msg chat-msg--system';
    item.textContent = text;
    list.appendChild(item);
    list.scrollTop = list.scrollHeight;
}
