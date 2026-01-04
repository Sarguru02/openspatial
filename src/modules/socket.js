import { io } from 'socket.io-client';

export class SocketHandler {
    constructor() {
        this.socket = null;
        this.handlers = new Map();
    }
    
    connect() {
        return new Promise((resolve, reject) => {
            // Connect to signaling server at the same origin as this page
            // WebSocket only - no polling, no fallbacks, no reconnection
            this.socket = io(window.location.origin, {
                transports: ['websocket'],
                upgrade: false,
                reconnection: false,
                forceNew: true
            });
            
            this.socket.on('connect', () => {
                console.log('Connected to signaling server');
                resolve();
            });
            
            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                reject(error);
            });
            
            // Setup event handlers
            this.socket.on('connected', (data) => this.trigger('connected', data));
            this.socket.on('space-state', (data) => this.trigger('space-state', data));
            this.socket.on('peer-joined', (data) => this.trigger('peer-joined', data));
            this.socket.on('peer-left', (data) => this.trigger('peer-left', data));
            this.socket.on('signal', (data) => this.trigger('signal', data));
            this.socket.on('position-update', (data) => this.trigger('position-update', data));
            this.socket.on('media-state-update', (data) => this.trigger('media-state-update', data));
            this.socket.on('screen-share-started', (data) => this.trigger('screen-share-started', data));
            this.socket.on('screen-share-stopped', (data) => this.trigger('screen-share-stopped', data));
            this.socket.on('screen-share-position-update', (data) => this.trigger('screen-share-position-update', data));
        });
    }
    
    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
        }
        this.handlers.get(event).push(handler);
    }
    
    off(event, handler) {
        if (this.handlers.has(event)) {
            const handlers = this.handlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    trigger(event, data) {
        if (this.handlers.has(event)) {
            this.handlers.get(event).forEach(handler => handler(data));
        }
    }
    
    emit(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}
