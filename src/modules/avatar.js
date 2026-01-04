export class AvatarManager {
    constructor(state) {
        this.state = state;
        this.avatars = new Map();
        this.positions = new Map();
        this.positionChangeCallback = null;
        this.space = null;
    }
    
    createLocalAvatar(peerId, username, stream, x, y) {
        this.space = document.getElementById('space');
        
        const avatar = this.createAvatarElement(peerId, username, true);
        avatar.classList.add('self');
        
        // Add video
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true; // Mute local video to prevent feedback
        video.playsInline = true;
        
        const container = avatar.querySelector('.avatar-video-container');
        container.appendChild(video);
        
        this.space.appendChild(avatar);
        this.avatars.set(peerId, avatar);
        
        // Set position AFTER avatar is in the Map so setPosition can find it
        this.setPosition(peerId, x, y);
        this.setupDrag(avatar, peerId);
    }
    
    createRemoteAvatar(peerId, username, x, y) {
        this.space = document.getElementById('space');
        
        const avatar = this.createAvatarElement(peerId, username, false);
        
        // Add placeholder until stream arrives
        const container = avatar.querySelector('.avatar-video-container');
        const placeholder = document.createElement('div');
        placeholder.className = 'avatar-placeholder';
        placeholder.textContent = username.charAt(0).toUpperCase();
        container.appendChild(placeholder);
        
        this.space.appendChild(avatar);
        this.avatars.set(peerId, avatar);
        
        // Set position AFTER avatar is in the Map so setPosition can find it
        this.setPosition(peerId, x, y);
    }
    
    createAvatarElement(peerId, username, isLocal) {
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.dataset.peerId = peerId;
        
        avatar.innerHTML = `
            <div class="avatar-video-container"></div>
            <div class="avatar-name">${isLocal ? `${username} (You)` : username}</div>
            <div class="avatar-indicators"></div>
        `;
        
        return avatar;
    }
    
    setRemoteStream(peerId, stream) {
        const avatar = this.avatars.get(peerId);
        if (!avatar) return;
        
        const container = avatar.querySelector('.avatar-video-container');
        
        // Remove placeholder
        const placeholder = container.querySelector('.avatar-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        // Check if video already exists
        let video = container.querySelector('video');
        if (!video) {
            video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            container.appendChild(video);
        }
        
        video.srcObject = stream;
    }
    
    setPosition(peerId, x, y) {
        this.positions.set(peerId, { x, y });
        
        const avatar = this.avatars.get(peerId);
        if (avatar) {
            avatar.style.left = `${x - 60}px`; // Center avatar (120/2 = 60)
            avatar.style.top = `${y - 60}px`;
        }
    }
    
    updatePosition(peerId, x, y) {
        this.setPosition(peerId, x, y);
    }
    
    getPosition(peerId) {
        return this.positions.get(peerId) || { x: 2000, y: 2000 };
    }
    
    getPositions() {
        return this.positions;
    }
    
    setupDrag(avatar, peerId) {
        let isDragging = false;
        let startX, startY;
        let initialLeft, initialTop;
        
        avatar.addEventListener('mousedown', (e) => {
            e.stopPropagation(); // Prevent canvas panning
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = parseInt(avatar.style.left) || 0;
            initialTop = parseInt(avatar.style.top) || 0;
            avatar.style.cursor = 'grabbing';
            avatar.style.zIndex = '20';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newLeft = initialLeft + deltaX;
            const newTop = initialTop + deltaY;
            
            avatar.style.left = `${newLeft}px`;
            avatar.style.top = `${newTop}px`;
            
            // Update position (center point)
            const newX = newLeft + 60;
            const newY = newTop + 60;
            this.positions.set(peerId, { x: newX, y: newY });
            
            // Notify position change
            if (this.positionChangeCallback) {
                this.positionChangeCallback(peerId, newX, newY);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                avatar.style.cursor = 'grab';
                avatar.style.zIndex = '10';
            }
        });
    }
    
    onPositionChange(callback) {
        this.positionChangeCallback = callback;
    }
    
    updateMediaState(peerId, isMuted, isVideoOff) {
        const avatar = this.avatars.get(peerId);
        if (!avatar) return;
        
        const indicators = avatar.querySelector('.avatar-indicators');
        indicators.innerHTML = '';
        
        if (isMuted) {
            const mutedIndicator = document.createElement('div');
            mutedIndicator.className = 'avatar-indicator muted';
            mutedIndicator.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="1" y1="1" x2="23" y2="23"/>
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
                </svg>
            `;
            indicators.appendChild(mutedIndicator);
        }
        
        // Show placeholder if video is off
        const container = avatar.querySelector('.avatar-video-container');
        const video = container.querySelector('video');
        let placeholder = container.querySelector('.avatar-placeholder');
        
        if (isVideoOff) {
            if (video) video.style.display = 'none';
            if (!placeholder) {
                const name = avatar.querySelector('.avatar-name').textContent;
                placeholder = document.createElement('div');
                placeholder.className = 'avatar-placeholder';
                placeholder.textContent = name.charAt(0).toUpperCase();
                container.appendChild(placeholder);
            }
        } else {
            if (video) video.style.display = 'block';
            if (placeholder) placeholder.remove();
        }
    }
    
    setSpeaking(peerId, isSpeaking) {
        const avatar = this.avatars.get(peerId);
        if (avatar) {
            avatar.classList.toggle('speaking', isSpeaking);
        }
    }
    
    removeAvatar(peerId) {
        const avatar = this.avatars.get(peerId);
        if (avatar) {
            avatar.remove();
            this.avatars.delete(peerId);
            this.positions.delete(peerId);
        }
    }
    
    clear() {
        this.avatars.forEach(avatar => avatar.remove());
        this.avatars.clear();
        this.positions.clear();
    }
}
