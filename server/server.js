import express from 'express';
import { createServer as createHttpsServer } from 'https';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import selfsigned from 'selfsigned';

const app = express();

// Generate self-signed certificate for HTTPS
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, {
    days: 365,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
        { name: 'basicConstraints', cA: true },
        { name: 'keyUsage', keyCertSign: true, digitalSignature: true, keyEncipherment: true },
        { name: 'subjectAltName', altNames: [
            { type: 2, value: 'localhost' },
            { type: 7, ip: '127.0.0.1' }
        ]}
    ]
});

const server = createHttpsServer({
    key: pems.private,
    cert: pems.cert
}, app);

const io = new Server(server, {
    cors: {
        origin: '*',  // Allow any origin for network testing
        methods: ['GET', 'POST']
    }
});

// Space state management
const spaces = new Map();

// Get or create space
function getSpace(spaceId) {
    if (!spaces.has(spaceId)) {
        spaces.set(spaceId, {
            peers: new Map()
        });
    }
    return spaces.get(spaceId);
}

io.on('connection', (socket) => {
    const peerId = uuidv4();
    let currentSpace = null;
    let currentUsername = null;
    
    console.log(`Peer connected: ${peerId}`);
    
    // Handle space join
    socket.on('join-space', ({ spaceId, username }) => {
        currentSpace = spaceId;
        currentUsername = username;
        
        // Join socket.io room (internal grouping)
        socket.join(spaceId);
        
        const space = getSpace(spaceId);
        
        // Generate random position near center
        const position = {
            x: 1800 + Math.random() * 400,
            y: 1800 + Math.random() * 400
        };
        
        // Add peer to space
        space.peers.set(peerId, {
            username,
            position,
            isMuted: false,
            isVideoOff: false,
            isScreenSharing: false
        });
        
        // Send confirmation to the joining peer
        socket.emit('connected', { peerId });
        
        // Send current space state
        const spaceState = {
            peers: Object.fromEntries(space.peers)
        };
        socket.emit('space-state', spaceState);
        
        // Notify other peers
        socket.to(spaceId).emit('peer-joined', {
            peerId,
            username,
            position
        });
        
        console.log(`${username} joined space ${spaceId} (${space.peers.size} peers)`);
    });
    
    // Handle signaling
    socket.on('signal', (data) => {
        // Forward signal to specific peer
        const { to, from, signal } = data;
        io.to(currentSpace).emit('signal', data);
    });
    
    // Handle position updates
    socket.on('position-update', ({ peerId: pid, x, y }) => {
        if (!currentSpace) return;
        
        const space = spaces.get(currentSpace);
        if (space && space.peers.has(pid)) {
            space.peers.get(pid).position = { x, y };
            
            // Broadcast to other peers
            socket.to(currentSpace).emit('position-update', { peerId: pid, x, y });
        }
    });
    
    // Handle media state updates
    socket.on('media-state-update', ({ peerId: pid, isMuted, isVideoOff }) => {
        if (!currentSpace) return;
        
        const space = spaces.get(currentSpace);
        if (space && space.peers.has(pid)) {
            space.peers.get(pid).isMuted = isMuted;
            space.peers.get(pid).isVideoOff = isVideoOff;
            
            // Broadcast to other peers
            socket.to(currentSpace).emit('media-state-update', { 
                peerId: pid, 
                isMuted, 
                isVideoOff 
            });
        }
    });
    
    // Handle screen share events
    socket.on('screen-share-started', ({ peerId: pid }) => {
        if (!currentSpace) return;
        
        const space = spaces.get(currentSpace);
        if (space && space.peers.has(pid)) {
            space.peers.get(pid).isScreenSharing = true;
            
            socket.to(currentSpace).emit('screen-share-started', {
                peerId: pid,
                username: currentUsername
            });
        }
    });
    
    socket.on('screen-share-stopped', ({ peerId: pid }) => {
        if (!currentSpace) return;
        
        const space = spaces.get(currentSpace);
        if (space && space.peers.has(pid)) {
            space.peers.get(pid).isScreenSharing = false;
            
            socket.to(currentSpace).emit('screen-share-stopped', { peerId: pid });
        }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        if (currentSpace) {
            const space = spaces.get(currentSpace);
            if (space) {
                space.peers.delete(peerId);
                
                // Notify other peers
                socket.to(currentSpace).emit('peer-left', { peerId });
                
                console.log(`${currentUsername} left space ${currentSpace} (${space.peers.size} peers)`);
                
                // Clean up empty spaces
                if (space.peers.size === 0) {
                    spaces.delete(currentSpace);
                    console.log(`Space ${currentSpace} deleted (empty)`);
                }
            }
        }
        
        console.log(`Peer disconnected: ${peerId}`);
    });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 OpenSpatial Signaling Server (HTTPS) running on 0.0.0.0:${PORT}`);
    console.log(`   ⚠️  Before connecting, visit https://localhost:${PORT} and accept the self-signed certificate`);
    console.log(`   Waiting for connections...`);
});
