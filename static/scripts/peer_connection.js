/**
 * peer_connection.js
 * Manages a mesh of RTCPeerConnections — one per remote participant.
 *
 * Dependencies (loaded before this script):
 *   - user_media.js  →  localStream
 *   - data_channel.js → setupDataChannel()
 *
 * Consumed by call.html (inline script):
 *   - createPeerConnection(remoteSid)
 *   - makeOffer(remoteSid)
 *   - handleOffer(remoteSid, sdp)
 *   - handleAnswer(remoteSid, sdp)
 *   - handleIceCandidate(remoteSid, candidate)
 *   - closePeerConnection(remoteSid)
 */

const ICE_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

// sid → RTCPeerConnection
const peerConnections = new Map();

// ── Factory ────────────────────────────────────────────────────────────────────

/**
 * Create (or return existing) RTCPeerConnection for a remote peer.
 * Wires up ICE, track, and data-channel events automatically.
 *
 * @param {string} remoteSid  Socket.IO sid of the remote peer
 * @returns {RTCPeerConnection}
 */
function createPeerConnection(remoteSid) {
    if (peerConnections.has(remoteSid)) return peerConnections.get(remoteSid);

    const pc = new RTCPeerConnection(ICE_CONFIG);
    peerConnections.set(remoteSid, pc);

    // ── Add local tracks so the remote side receives our media ──────────────
    if (localStream) {
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    // ── Add transceivers for receiving media based on capabilities ─────────
    // Even if we're not SENDING video (send_video: false), we might still want
    // to RECEIVE it (recv_video: true).  Use addTransceiver to tell the peer
    // "I want to receive audio/video even if I'm not sending."
    if (userCapabilities.recv_video) {
        pc.addTransceiver('video', { direction: 'recvonly' });
    }
    if (userCapabilities.recv_audio) {
        pc.addTransceiver('audio', { direction: 'recvonly' });
    }

    // ── ICE candidate gathering ──────────────────────────────────────────────
    // Each candidate discovered locally must be relayed to the remote peer
    // so it can try that network path.
    pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
            socket.emit('send_ice_candidate', {
                room_id:    roomId,
                target_sid: remoteSid,
                candidate:  candidate,
            });
        }
    };

    pc.oniceconnectionstatechange = () => {
        console.log(`ICE state [${remoteSid}]: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'disconnected' ||
            pc.iceConnectionState === 'failed') {
            closePeerConnection(remoteSid);
        }
    };

    // ── Remote track arrival ─────────────────────────────────────────────────
    // ontrack fires when the remote peer's MediaStream tracks start arriving.
    pc.ontrack = ({ streams }) => {
        if (streams && streams[0]) {
            addRemoteVideo(remoteSid, streams[0]);
        }
    };

    // ── Data channel (receiver side) ─────────────────────────────────────────
    // The *caller* creates the channel with pc.createDataChannel().
    // The *callee* receives it here via ondatachannel.
    pc.ondatachannel = ({ channel }) => {
        setupDataChannel(channel, remoteSid);
    };

    return pc;
}

// ── Offer / Answer flow ────────────────────────────────────────────────────────

/**
 * Called by the JOINING user for each peer already in the room.
 * Creates an offer and sends it via the signaling server.
 */
async function makeOffer(remoteSid) {
    const pc = createPeerConnection(remoteSid);

    // Create the data channel on the caller side BEFORE the offer,
    // so the SDP already includes the data channel negotiation.
    const dc = pc.createDataChannel('chat');
    setupDataChannel(dc, remoteSid);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit('send_offer', {
        room_id:    roomId,
        target_sid: remoteSid,
        sdp:        pc.localDescription,
    });
}

/**
 * Called on the EXISTING peer when it receives an offer from the newcomer.
 */
async function handleOffer(remoteSid, sdp) {
    const pc = createPeerConnection(remoteSid);

    // Guarantee local tracks are present even if the connection was created
    // before localStream became available (e.g. camera permission was slow).
    if (localStream) {
        const attached = new Set(pc.getSenders().map(s => s.track).filter(Boolean));
        localStream.getTracks().forEach(track => {
            if (!attached.has(track)) pc.addTrack(track, localStream);
        });
    }

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit('send_answer', {
        room_id:    roomId,
        target_sid: remoteSid,
        sdp:        pc.localDescription,
    });
}

/**
 * Called on the CALLER when it receives the answer from the remote peer.
 */
async function handleAnswer(remoteSid, sdp) {
    const pc = peerConnections.get(remoteSid);
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
}

/**
 * Trickle ICE — add a candidate sent by the remote peer.
 */
async function handleIceCandidate(remoteSid, candidate) {
    const pc = peerConnections.get(remoteSid);
    if (!pc) return;
    try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
        console.warn('addIceCandidate error:', err);
    }
}

// ── Cleanup ────────────────────────────────────────────────────────────────────

/** Close a single peer connection and remove its video tile. */
function closePeerConnection(remoteSid) {
    const pc = peerConnections.get(remoteSid);
    if (pc) {
        pc.close();
        peerConnections.delete(remoteSid);
    }
    removeRemoteVideo(remoteSid);
}

/** Close all peer connections (hang-up). */
function closeAllPeerConnections() {
    peerConnections.forEach((_, sid) => closePeerConnection(sid));
}

// ── Video tile helpers ─────────────────────────────────────────────────────────

/**
 * Create or update a <video> element in the video grid for a remote peer.
 */
function addRemoteVideo(remoteSid, stream) {
    const grid = document.getElementById('video-grid');
    if (!grid) return;

    let tile = document.getElementById(`tile-${remoteSid}`);
    if (!tile) {
        tile = document.createElement('div');
        tile.id = `tile-${remoteSid}`;
        tile.className = 'video-tile';

        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.id = `video-${remoteSid}`;

        const label = document.createElement('span');
        label.className = 'video-label';
        // Use the peer's username from peerUsernames, fall back to short sid if not found
        label.textContent = peerUsernames.get(remoteSid) || remoteSid.slice(0, 6);

        tile.appendChild(video);
        tile.appendChild(label);
        grid.appendChild(tile);
    }

    const video = tile.querySelector('video');
    video.srcObject = stream;
}

/** Remove the video tile for a peer that left. */
function removeRemoteVideo(remoteSid) {
    const tile = document.getElementById(`tile-${remoteSid}`);
    if (tile) tile.remove();
}
