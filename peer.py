class Peer:
    def __init__(self, user: str, sid: str) -> None:
        self.user = user
        self.sid = sid
        self.rooms = {}

    def add_room(self, room_id: str, role: str = 'guest', connection_type: str = 'Sala de Aula'):
        self.rooms[room_id] = {'role': role, 'connection_type': connection_type, 'connection_state': None}
    
    def remove_room(self, room_id: str):
        if room_id in self.rooms:
            del self.rooms[room_id]
    
    def get_rooms(self):
        return list(self.rooms.keys())
    
    def __repr__(self):
        return f"{self.user}:{self.sid}"