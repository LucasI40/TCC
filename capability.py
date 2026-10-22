import json

class Capability:
    def __init__(self, model_path: str):
        with open(model_path) as f:
            self.model = json.load(f)
    
    def get_room_type(self, connection_type: str) -> dict:
        """Get room type by name"""
        for room in self.model:
            if room['name'] == connection_type:
                return room
        return None
    
    def get_role_capabilities(self, connection_type: str, role: str) -> dict:
        """Get capabilities for a specific role in a room type"""
        room = self.get_room_type(connection_type)
        if room and 'roles' in room:
            return room['roles'].get(role, {})
        return {}
    
    def get_roles_in_room(self, connection_type: str) -> list[str]:
        """Get all available roles for a room type"""
        room = self.get_room_type(connection_type)
        if room and 'roles' in room:
            return list(room['roles'].keys())
        return []
    
    def get_all_room_types(self) -> list[str]:
        """Get all available room types"""
        return [room['name'] for room in self.model if 'roles' in room]