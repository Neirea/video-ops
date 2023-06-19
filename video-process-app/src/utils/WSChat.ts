import { WebSocket } from "ws";
class WSChat {
    sockets: Map<string, WebSocket | undefined>;
    constructor() {
        this.sockets = new Map();
    }
    sendTo(socketId: string, message: string | Object) {
        const socket = this.sockets.get(socketId);
        socket?.send(JSON.stringify(message));
    }
    close(socketId: string) {
        this.sockets.delete(socketId);
    }
}

export default WSChat;
