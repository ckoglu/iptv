class NetflixPlayer {
    constructor() {
        this.videoElement = document.getElementById('videoElement');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.progressHandle = document.getElementById('progressHandle');
        this.currentTimeEl = document.getElementById('currentTime');
        this.durationEl = document.getElementById('duration');
        this.volumeBtn = document.getElementById('volumeBtn');
        this.volumeControl = document.getElementById('volumeControl');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.errorOverlay = document.getElementById('errorOverlay');
        this.errorText = document.getElementById('errorText');
        this.videoTitle = document.getElementById('videoTitle');
        
        this.isPlaying = false;
        this.isFullscreen = false;
        this.isControlsVisible = false;
        this.hideControlsTimeout = null;
        
        this.init();
    }

    init() {
        this.loadVideo();
        this.setupEventListeners();
        this.setupControlsAutoHide();
    }

    loadVideo() {
        const urlParams = new URLSearchParams(window.location.search);
        const videoUrl = urlParams.get('url');
        const videoTitle = urlParams.get('title');

        if (videoTitle) {
            this.videoTitle.textContent = videoTitle;
            document.title = `${videoTitle} - STREAMTV`;
        }

        if (!videoUrl) {
            this.showError('Video URL bulunamadı.');
            return;
        }

        this.showLoading();

        // HLS desteği kontrolü
        if (Hls.isSupported()) {
            this.setupHLS(videoUrl);
        } else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            this.setupNativeHLS(videoUrl);
        } else {
            this.showError('Tarayıcınız bu video formatını desteklemiyor.');
        }
    }

    setupHLS(videoUrl) {
        const hls = new Hls({
            enableWorker: false,
            lowLatencyMode: true,
            backBufferLength: 90
        });
        
        hls.loadSource(videoUrl);
        hls.attachMedia(this.videoElement);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            this.hideLoading();
            this.videoElement.play().catch(e => {
                console.log('Otomatik oynatma engellendi:', e);
            });
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS Error:', data);
            if (data.fatal) {
                this.handleFatalError(data);
            }
        });
        
        this.hls = hls;
    }

    setupNativeHLS(videoUrl) {
        this.videoElement.src = videoUrl;
        this.videoElement.addEventListener('loadedmetadata', () => {
            this.hideLoading();
            this.videoElement.play().catch(e => {
                console.log('Otomatik oynatma engellendi:', e);
            });
        });
        
        this.videoElement.addEventListener('error', () => {
            this.handlePlayerError();
        });
    }

    setupEventListeners() {
        // Video events
        this.videoElement.addEventListener('play', () => this.onPlay());
        this.videoElement.addEventListener('pause', () => this.onPause());
        this.videoElement.addEventListener('timeupdate', () => this.updateProgress());
        this.videoElement.addEventListener('loadedmetadata', () => this.updateDuration());
        this.videoElement.addEventListener('waiting', () => this.showLoading());
        this.videoElement.addEventListener('playing', () => this.hideLoading());
        this.videoElement.addEventListener('error', () => this.handlePlayerError());

        // Kontrol butonları
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.progressBar.addEventListener('click', (e) => this.seek(e));
        this.volumeBtn.addEventListener('click', () => this.toggleVolumeControl());
        this.volumeSlider.addEventListener('input', () => this.setVolume());

        // Klavye kontrolleri
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Fare hareketleri
        document.addEventListener('mousemove', () => this.showControlsTemporarily());
        
        // Dokunmatik kontroller
        this.videoElement.addEventListener('touchstart', () => this.showControlsTemporarily());
    }

    setupControlsAutoHide() {
        this.showControlsTemporarily();
    }

    showControlsTemporarily() {
        const controls = document.querySelectorAll('.player-controls-top, .player-controls-center, .player-controls-bottom');
        controls.forEach(control => {
            control.style.opacity = '1';
        });
        
        clearTimeout(this.hideControlsTimeout);
        this.hideControlsTimeout = setTimeout(() => {
            if (this.isPlaying) {
                controls.forEach(control => {
                    control.style.opacity = '0';
                });
            }
        }, 3000);
    }

    togglePlay() {
        if (this.videoElement.paused) {
            this.videoElement.play();
        } else {
            this.videoElement.pause();
        }
    }

    onPlay() {
        this.isPlaying = true;
        this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }

    onPause() {
        this.isPlaying = false;
        this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }

    seek(e) {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.videoElement.currentTime = percent * this.videoElement.duration;
    }

    updateProgress() {
        const currentTime = this.videoElement.currentTime;
        const duration = this.videoElement.duration;
        
        if (duration) {
            const percent = (currentTime / duration) * 100;
            this.progressFill.style.width = percent + '%';
            this.progressHandle.style.left = percent + '%';
            
            this.currentTimeEl.textContent = this.formatTime(currentTime);
        }
    }

    updateDuration() {
        if (this.videoElement.duration) {
            this.durationEl.textContent = this.formatTime(this.videoElement.duration);
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    toggleVolumeControl() {
        this.volumeControl.style.display = 
            this.volumeControl.style.display === 'none' ? 'block' : 'none';
    }

    setVolume() {
        this.videoElement.volume = this.volumeSlider.value;
        const icon = this.volumeSlider.value == 0 ? 'volume-mute' : 
                    this.volumeSlider.value < 0.5 ? 'volume-down' : 'volume-up';
        this.volumeBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
    }

    handleKeyPress(e) {
        switch(e.key) {
            case ' ':
            case 'k':
                e.preventDefault();
                this.togglePlay();
                break;
            case 'f':
                e.preventDefault();
                this.toggleFullscreen();
                break;
            case 'm':
                e.preventDefault();
                this.toggleMute();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.skip(-10);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.skip(10);
                break;
            case 'Escape':
                if (this.isFullscreen) {
                    this.exitFullscreen();
                } else {
                    goBack();
                }
                break;
        }
        this.showControlsTemporarily();
    }

    skip(seconds) {
        this.videoElement.currentTime += seconds;
    }

    toggleMute() {
        this.videoElement.muted = !this.videoElement.muted;
        this.volumeSlider.value = this.videoElement.muted ? 0 : 1;
        this.setVolume();
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Fullscreen error: ${err.message}`);
            });
            this.isFullscreen = true;
        } else {
            document.exitFullscreen();
            this.isFullscreen = false;
        }
    }

    exitFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
            this.isFullscreen = false;
        }
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    showError(message) {
        this.errorText.textContent = message;
        this.errorOverlay.style.display = 'flex';
        this.hideLoading();
    }

    handlePlayerError() {
        const error = this.videoElement.error;
        let message = 'Video yüklenirken bilinmeyen bir hata oluştu.';
        
        if (error) {
            switch(error.code) {
                case error.MEDIA_ERR_ABORTED:
                    message = 'Video yüklenmesi iptal edildi.';
                    break;
                case error.MEDIA_ERR_NETWORK:
                    message = 'Ağ hatası oluştu. Lütfen internet bağlantınızı kontrol edin.';
                    break;
                case error.MEDIA_ERR_DECODE:
                    message = 'Video decode hatası. Format desteklenmiyor.';
                    break;
                case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    message = 'Video formatı desteklenmiyor.';
                    break;
            }
        }
        
        this.showError(message);
    }

    handleFatalError(data) {
        let message = 'Video oynatılırken kritik hata oluştu.';
        
        switch(data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
                message = 'Ağ hatası. Lütfen internet bağlantınızı kontrol edin.';
                break;
            case Hls.ErrorTypes.MEDIA_ERROR:
                message = 'Medya hatası. Video dosyası bozuk olabilir.';
                break;
        }
        
        this.showError(message);
    }
}

// Global fonksiyonlar
function goBack() {
    window.history.back();
}

function retryPlayback() {
    window.location.reload();
}

// Sayfa yüklendiğinde player'ı başlat
document.addEventListener('DOMContentLoaded', () => {
    new NetflixPlayer();
});

// Sayfadan çıkarken temizlik
window.addEventListener('beforeunload', () => {
    if (window.netflixPlayer && window.netflixPlayer.hls) {
        window.netflixPlayer.hls.destroy();
    }
});