from peer import Peer

class Room:

    def __init__(self, room_id: str) -> None:
        self.room_id = room_id
        self.peers = {}
    
    def add_peer(self, peer:Peer):
        self.peers[peer.sid] = peer
    
    def remove_peer(self, sid:str):
        if sid in self.peers:
            del self.peers[sid]
        
    def get_peers(self):
        return list(self.peers.values())
    
    def peer_count(self):
        return len(self.peers)