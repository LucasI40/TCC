from flask import Flask
from extensions import socketio
from routes import path
from peer import Peer
from room import Room

peer_db = {}
rooms_db = {}


def get_create_peer(user: str, sid: str) -> Peer:
    if sid not in peer_db:
        peer_db[sid] = Peer(user, sid)
    return peer_db[sid]


def get_create_room(room_id: str) -> Room:
    if room_id not in rooms_db:
        rooms_db[room_id] = Room(room_id)
    return rooms_db[room_id]


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'secret!'
    socketio.init_app(app, cors_allowed_origins='*')

    app.register_blueprint(path)

    import events  # registers all @socketio.on handlers

    return app


if __name__ == '__main__':
    app = create_app()
    socketio.run(app, debug=True)
