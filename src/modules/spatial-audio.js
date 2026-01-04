import { avatars } from '../main.js';

export class SpatialAudio {
    constructor() {
        this.audioContext = null;
        this.peerAudioNodes = new Map();
        this.analyzerNodes = new Map();
        this.speakingThreshold = 30;
        this.maxDistance = 500; // Distance at which volume is 0
    }
    
    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }
    
    addPeer(peerId, stream) {
        this.initAudioContext();
        
        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack) return;
        
        // Create audio nodes
        const source = this.audioContext.createMediaStreamSource(stream);
        const gainNode = this.audioContext.createGain();
        const pannerNode = this.audioContext.createStereoPanner();
        const analyzerNode = this.audioContext.createAnalyser();
        
        analyzerNode.fftSize = 256;
        
        // Connect nodes: source -> analyzer -> gain -> panner -> destination
        source.connect(analyzerNode);
        analyzerNode.connect(gainNode);
        gainNode.connect(pannerNode);
        pannerNode.connect(this.audioContext.destination);
        
        this.peerAudioNodes.set(peerId, { source, gainNode, pannerNode });
        this.analyzerNodes.set(peerId, analyzerNode);
        
        // Start speaking detection
        this.startSpeakingDetection(peerId, analyzerNode);
    }
    
    startSpeakingDetection(peerId, analyzerNode) {
        const dataArray = new Uint8Array(analyzerNode.frequencyBinCount);
        
        const checkSpeaking = () => {
            if (!this.analyzerNodes.has(peerId)) return;
            
            analyzerNode.getByteFrequencyData(dataArray);
            
            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            
            // Update speaking state
            const isSpeaking = average > this.speakingThreshold;
            avatars.setSpeaking(peerId, isSpeaking);
            
            requestAnimationFrame(checkSpeaking);
        };
        
        checkSpeaking();
    }
    
    updatePositions(positions, localPeerId) {
        const localPos = positions.get(localPeerId);
        if (!localPos) return;
        
        positions.forEach((pos, peerId) => {
            if (peerId === localPeerId) return;
            
            const nodes = this.peerAudioNodes.get(peerId);
            if (!nodes) return;
            
            // Calculate distance
            const dx = pos.x - localPos.x;
            const dy = pos.y - localPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Calculate volume based on distance (1 at 0 distance, 0 at maxDistance)
            const volume = Math.max(0, 1 - distance / this.maxDistance);
            nodes.gainNode.gain.value = volume;
            
            // Calculate stereo pan based on horizontal position (-1 to 1)
            const pan = Math.max(-1, Math.min(1, dx / (this.maxDistance / 2)));
            nodes.pannerNode.pan.value = pan;
        });
    }
    
    removePeer(peerId) {
        const nodes = this.peerAudioNodes.get(peerId);
        if (nodes) {
            nodes.source.disconnect();
            nodes.gainNode.disconnect();
            nodes.pannerNode.disconnect();
        }
        this.peerAudioNodes.delete(peerId);
        this.analyzerNodes.delete(peerId);
    }
    
    clear() {
        this.peerAudioNodes.forEach((nodes, peerId) => {
            nodes.source.disconnect();
            nodes.gainNode.disconnect();
            nodes.pannerNode.disconnect();
        });
        this.peerAudioNodes.clear();
        this.analyzerNodes.clear();
    }
}
