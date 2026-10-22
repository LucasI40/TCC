import os
from flask import request
from flask_socketio import join_room, leave_room, emit
from extensions import socketio
from init_app import get_create_peer, get_create_room, peer_db, rooms_db
from capability import Capability

_MODELS_PATH       = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/model.json')
capability_manager = Capability(_MODELS_PATH)


@socketio.on('connect')
def handle_connect():
    print(f'Client connected  - {request.sid}')


@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid

    if sid in peer_db:
        peer = peer_db[sid]
        for room_id in peer.get_rooms():
            if room_id in rooms_db:
                rooms_db[room_id].remove_peer(sid)
                emit('peer_left', {'sid': sid}, to=room_id)
                if rooms_db[room_id].peer_count() == 0:
                    del rooms_db[room_id]
        del peer_db[sid]

    print(f'Client disconnected - {sid}')


def make_room_key(connection_type: str, room_id: str) -> str:
    """
    Namespace a room so that the same room_id string used in two different
    model types produces two completely separate Socket.IO rooms.
    e.g. "Sala de Aula::ABC123"  vs  "Tribunal::ABC123"
    """
    return f"{connection_type}::{room_id}"


@socketio.on('join')
def on_join(data):
    username        = data['username']
    room_id         = data['room_id']
    connection_type = data.get('connection_type', 'Sala de Aula')
    role            = data.get('role', 'guest')
    sid             = request.sid

    # Internal key that scopes this room to its model type.
    # Users never see this key — they only know room_id + connection_type.
    room_key = make_room_key(connection_type, room_id)

    peer = get_create_peer(username, sid)
    peer.add_room(room_key, role, connection_type)

    room = get_create_room(room_key)
    # Snapshot peers BEFORE adding the new one so we can send them to the newcomer.
    existing_peers = [{'user': p.user, 'sid': p.sid} for p in room.get_peers()]

    room.add_peer(peer)
    join_room(room_key)

    capabilities = capability_manager.get_role_capabilities(connection_type, role)

    # Tell the new user their capabilities and who is already here.
    # They will initiate an RTCPeerConnection offer to each existing peer.
    emit('joined', {
        'your_sid':       sid,
        'role':           role,
        'capabilities':   capabilities,
        'existing_peers': existing_peers,
    })

    # Broadcast to the whole room that a new peer arrived.
    # The new user will ignore this event on the client side (self-check by sid).
    # Existing users will wait for the newcomer's offer.
    emit('peer_joined', {
        'user': username,
        'sid':  sid,
        'role': role,
    }, to=room_key)


@socketio.on('leave')
def on_leave(data):
    room_id         = data['room_id']
    connection_type = data.get('connection_type', 'Sala de Aula')
    room_key        = make_room_key(connection_type, room_id)
    sid             = request.sid

    if sid in peer_db:
        peer = peer_db[sid]
        peer.remove_room(room_key)

        if room_key in rooms_db:
            rooms_db[room_key].remove_peer(sid)
            if rooms_db[room_key].peer_count() == 0:
                del rooms_db[room_key]

    leave_room(room_key)
    emit('peer_left', {'sid': sid}, to=room_key)


# ── Signaling relay ────────────────────────────────────────────────────────────

@socketio.on('send_offer')
def relay_offer(data):
    emit('receive_offer', {
        'from_sid': request.sid,
        'sdp':      data['sdp'],
    }, to=data['target_sid'])


@socketio.on('send_answer')
def relay_answer(data):
    emit('receive_answer', {
        'from_sid': request.sid,
        'sdp':      data['sdp'],
    }, to=data['target_sid'])


@socketio.on('send_ice_candidate')
def relay_ice(data):
    emit('receive_ice_candidate', {
        'from_sid':  request.sid,
        'candidate': data['candidate'],
    }, to=data['target_sid'])
