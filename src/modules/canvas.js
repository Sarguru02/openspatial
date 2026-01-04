export class CanvasManager {
    constructor() {
        this.container = null;
        this.space = null;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.scrollLeft = 0;
        this.scrollTop = 0;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
    }
    
    init() {
        this.container = document.getElementById('canvas-container');
        this.space = document.getElementById('space');
        
        this.setupPanning();
        this.setupZoom();
    }
    
    setupPanning() {
        this.container.addEventListener('mousedown', (e) => {
            // Only pan if clicking on the container or space, not on avatars/screenshares
            if (e.target === this.container || e.target === this.space) {
                this.isDragging = true;
                this.startX = e.pageX;
                this.startY = e.pageY;
                this.container.style.cursor = 'grabbing';
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            e.preventDefault();
            const deltaX = e.pageX - this.startX;
            const deltaY = e.pageY - this.startY;
            
            this.offsetX += deltaX;
            this.offsetY += deltaY;
            
            this.updateTransform();
            
            this.startX = e.pageX;
            this.startY = e.pageY;
        });
        
        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            if (this.container) {
                this.container.style.cursor = 'grab';
            }
        });
    }
    
    setupZoom() {
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.min(Math.max(this.scale * delta, 0.25), 2);
            
            // Zoom towards mouse position
            const rect = this.container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Adjust offset to zoom towards mouse
            this.offsetX = mouseX - (mouseX - this.offsetX) * (newScale / this.scale);
            this.offsetY = mouseY - (mouseY - this.offsetY) * (newScale / this.scale);
            
            this.scale = newScale;
            this.updateTransform();
        }, { passive: false });
    }
    
    updateTransform() {
        this.space.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
    }
    
    centerOn(x, y) {
        const containerRect = this.container.getBoundingClientRect();
        this.offsetX = containerRect.width / 2 - x * this.scale;
        this.offsetY = containerRect.height / 2 - y * this.scale;
        this.updateTransform();
    }
    
    screenToSpace(screenX, screenY) {
        return {
            x: (screenX - this.offsetX) / this.scale,
            y: (screenY - this.offsetY) / this.scale
        };
    }
    
    spaceToScreen(spaceX, spaceY) {
        return {
            x: spaceX * this.scale + this.offsetX,
            y: spaceY * this.scale + this.offsetY
        };
    }
}
