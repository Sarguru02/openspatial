export class ScreenShareManager {
    constructor(state, onPositionUpdate) {
        this.state = state;
        this.screenShares = new Map();
        this.space = null;
        // Callback to emit position updates via socket
        this.onPositionUpdate = onPositionUpdate;
    }
    
    createScreenShare(peerId, username, stream, x, y) {
        this.space = document.getElementById('space');
        
        // Remove existing screen share from this peer
        this.removeScreenShare(peerId);
        
        const isLocal = peerId === this.state.peerId;
        
        const element = document.createElement('div');
        element.className = 'screen-share';
        element.dataset.peerId = peerId;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.style.width = '480px';
        element.style.height = '320px';
        
        element.innerHTML = `
            <div class="screen-share-header">
                <div class="screen-share-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                    <span>${isLocal ? 'Your Screen' : `${username}'s Screen`}</span>
                </div>
                ${isLocal ? `
                    <button class="screen-share-close" title="Stop Sharing">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                ` : ''}
            </div>
        `;
        
        // Add video
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = isLocal; // Mute local screen share
        element.appendChild(video);
        
        // Setup drag with position sync
        this.setupDrag(element, peerId, isLocal);
        
        // Setup close button for local screen share
        if (isLocal) {
            const closeBtn = element.querySelector('.screen-share-close');
            closeBtn.addEventListener('click', () => {
                // This will trigger the stop in main.js
                document.getElementById('btn-screen').click();
            });
        }
        
        this.space.appendChild(element);
        this.screenShares.set(peerId, element);
    }
    
    setupDrag(element, peerId, isLocal) {
        const header = element.querySelector('.screen-share-header');
        let isDragging = false;
        let startX, startY;
        let initialLeft, initialTop;
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.screen-share-close')) return;
            
            e.stopPropagation();
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = parseInt(element.style.left) || 0;
            initialTop = parseInt(element.style.top) || 0;
            header.style.cursor = 'grabbing';
            element.style.zIndex = '15';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newX = initialLeft + deltaX;
            const newY = initialTop + deltaY;
            
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                header.style.cursor = 'grab';
                element.style.zIndex = '5';
                
                // Emit position update for any screen share (all participants can move)
                if (this.onPositionUpdate) {
                    const x = parseInt(element.style.left) || 0;
                    const y = parseInt(element.style.top) || 0;
                    this.onPositionUpdate(peerId, x, y);
                }
            }
        });
    }
    
    // Set position from remote peer
    setPosition(peerId, x, y) {
        const element = this.screenShares.get(peerId);
        if (element) {
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
        }
    }
    
    removeScreenShare(peerId) {
        const element = this.screenShares.get(peerId);
        if (element) {
            element.remove();
            this.screenShares.delete(peerId);
        }
    }
    
    clear() {
        this.screenShares.forEach(element => element.remove());
        this.screenShares.clear();
    }
}
