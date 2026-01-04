export class UIController {
    constructor(state) {
        this.state = state;
        this.btnMic = document.getElementById('btn-mic');
        this.btnCamera = document.getElementById('btn-camera');
        this.btnScreen = document.getElementById('btn-screen');
    }
    
    updateMicButton(isMuted) {
        const iconOn = this.btnMic.querySelector('.icon-on');
        const iconOff = this.btnMic.querySelector('.icon-off');
        
        if (isMuted) {
            iconOn.classList.add('hidden');
            iconOff.classList.remove('hidden');
            this.btnMic.classList.add('muted');
        } else {
            iconOn.classList.remove('hidden');
            iconOff.classList.add('hidden');
            this.btnMic.classList.remove('muted');
        }
    }
    
    updateCameraButton(isVideoOff) {
        const iconOn = this.btnCamera.querySelector('.icon-on');
        const iconOff = this.btnCamera.querySelector('.icon-off');
        
        if (isVideoOff) {
            iconOn.classList.add('hidden');
            iconOff.classList.remove('hidden');
            this.btnCamera.classList.add('muted');
        } else {
            iconOn.classList.remove('hidden');
            iconOff.classList.add('hidden');
            this.btnCamera.classList.remove('muted');
        }
    }
    
    updateScreenButton(isSharing) {
        if (isSharing) {
            this.btnScreen.classList.add('active');
        } else {
            this.btnScreen.classList.remove('active');
        }
    }
    
    resetButtons() {
        this.updateMicButton(false);
        this.updateCameraButton(false);
        this.updateScreenButton(false);
    }
}
