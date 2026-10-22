/**
 * user_media.js
 * Handles MediaStream: getUserMedia, track toggles, and the local video tile.
 *
 * Exposes globals used by peer_connection.js:
 *   - localStream  {MediaStream|null}
 */

let localStream = null;

// ── Capture ────────────────────────────────────────────────────────────────────

/**
 * Request camera/microphone access according to the role capabilities
 * received from the server.  Returns the MediaStream.
 *
 * @param {Object} capabilities  e.g. { send_video: true, send_audio: true, … }
 * @returns {Promise<MediaStream>}
 */
async function initUserMedia(capabilities) {
    const constraints = {
        video: capabilities.send_video  ?? true,
        audio: capabilities.send_audio  ?? true,
    };

    try {
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
        console.warn('getUserMedia failed:', err.name, '– continuing with empty stream');
        // Provide a silent empty stream so RTCPeerConnection.addTrack still works.
        localStream = new MediaStream();
    }

    const localVideo = document.getElementById('local-video');
    if (localVideo) {
        localVideo.srcObject = localStream;
        localVideo.muted = true; // never play back our own audio
    }

    return localStream;
}

// ── Track toggles ──────────────────────────────────────────────────────────────

/**
 * Mute / unmute the local microphone.
 * Returns the new muted state (true = muted).
 */
function toggleMic() {
    if (!localStream) return true;
    const tracks = localStream.getAudioTracks();
    tracks.forEach(t => { t.enabled = !t.enabled; });
    const muted = tracks.length === 0 || !tracks[0].enabled;
    updateMicButton(muted);
    return muted;
}

/**
 * Turn the camera on / off.
 * Returns the new disabled state (true = camera off).
 */
function toggleCamera() {
    if (!localStream) return true;
    const tracks = localStream.getVideoTracks();
    tracks.forEach(t => { t.enabled = !t.enabled; });
    const off = tracks.length === 0 || !tracks[0].enabled;
    updateCameraButton(off);

    const localVideo = document.getElementById('local-video');
    if (localVideo) {
        localVideo.classList.toggle('cam-off', off);
    }
    return off;
}

/** Stop all tracks (called on hang-up). */
function stopLocalStream() {
    if (!localStream) return;
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
}

// ── UI helpers ─────────────────────────────────────────────────────────────────

function updateMicButton(muted) {
    const btn = document.getElementById('btn-mic');
    if (!btn) return;
    btn.classList.toggle('control-btn--off', muted);
    btn.title = muted ? 'Unmute microphone' : 'Mute microphone';

    const img = btn.querySelector('img');
    if (img) {
        img.src = muted
            ? '/static/images/audio-disabled.svg'
            : '/static/images/audio.svg';
    }
}

function updateCameraButton(off) {
    const btn = document.getElementById('btn-camera');
    if (!btn) return;
    btn.classList.toggle('control-btn--off', off);
    btn.title = off ? 'Turn camera on' : 'Turn camera off';

    const img = btn.querySelector('img');
    if (img) {
        img.src = off
            ? '/static/images/video-disabled.svg'
            : '/static/images/video.svg';
    }
}
