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
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.rewindBtn = document.getElementById('rewindBtn');
        this.forwardBtn = document.getElementById('forwardBtn');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.errorOverlay = document.getElementById('errorOverlay');
        this.errorText = document.getElementById('errorText');
        this.videoTitle = document.getElementById('videoTitle');
        this.netflixPlayer = document.getElementById('netflixPlayer');
        
        this.isPlaying = false;
        this.isFullscreen = false;
        this.isControlsVisible = true;
        this.hideControlsTimeout = null;
        this.isMobile = this.detectMobile();
        
        this.init();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    init() {
        // Mobil cihaz kontrolü
        if (this.isMobile) {
            this.netflixPlayer.classList.add('mobile');
        }
        
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
            document.title = `${videoTitle} - IPTV`;
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

        this.videoElement.addEventListener('playing', () => {
            if (!this.isFullscreen) {this.enterFullscreen();}
        });
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
                this.hideLoading();
            });
        });

        hls.on(Hls.Events.LEVEL_LOADED, () => {
            this.hideLoading();
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
        this.videoElement.addEventListener('loadeddata', () => {
            this.hideLoading();
            this.videoElement.play().catch(e => {
                console.log('Otomatik oynatma engellendi:', e);
                this.hideLoading();
            });
        });
        
        this.videoElement.addEventListener('canplay', () => {
            this.hideLoading();
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
        this.videoElement.addEventListener('canplay', () => this.hideLoading());
        this.videoElement.addEventListener('error', () => this.handlePlayerError());

        // Kontrol butonları
        this.playPauseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePlay();
        });
        this.progressBar.addEventListener('click', (e) => this.seek(e));
        this.volumeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleVolumeControl();
        });
        this.volumeSlider.addEventListener('input', () => this.setVolume());
        this.fullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFullscreen();
        });
        this.rewindBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.skip(-10);
        });
        this.forwardBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.skip(10);
        });

        // Klavye kontrolleri
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Fare hareketleri - Tüm player alanında çalışsın
        this.netflixPlayer.addEventListener('mousemove', () => this.showControlsTemporarily());
        this.netflixPlayer.addEventListener('mouseleave', () => {
            if (!this.isFullscreen) {
                this.startHideControlsTimeout();
            }
        });
        
        // Dokunmatik kontroller
        this.netflixPlayer.addEventListener('touchstart', () => this.toggleControls());
        this.netflixPlayer.addEventListener('touchend', () => this.startHideControlsTimeout());
        
        // Fullscreen değişiklikleri
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());

        // Video elementine tıklama - oynat/duraklat
        this.videoElement.addEventListener('click', () => this.togglePlay());

        // Volume control dışına tıklama
        document.addEventListener('click', (e) => {
            if (!this.volumeControl.contains(e.target) && e.target !== this.volumeBtn) {
                this.volumeControl.style.display = 'none';
            }
        });

        // Sayfa görünürlüğü değişikliği
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.clearHideControlsTimeout();
            }
        });
    }

    setupControlsAutoHide() {
        if (!this.isMobile) {
            this.startHideControlsTimeout();
        }
    }

    showControlsTemporarily() {
        if (this.isMobile) return;
        
        this.showControls();
        this.clearHideControlsTimeout();
        this.startHideControlsTimeout();
    }

    showControls() {
        this.netflixPlayer.classList.remove('controls-hidden');
        this.isControlsVisible = true;
    }

    hideControls() {
        if (!this.isPlaying || this.isMobile || !this.isControlsVisible) return;
        
        this.netflixPlayer.classList.add('controls-hidden');
        this.volumeControl.style.display = 'none';
        this.isControlsVisible = false;
    }

    toggleControls() {
        if (this.isMobile) {
            if (this.isControlsVisible) {
                this.netflixPlayer.classList.add('controls-hidden');
                this.isControlsVisible = false;
            } else {
                this.netflixPlayer.classList.remove('controls-hidden');
                this.isControlsVisible = true;
                this.startHideControlsTimeout();
            }
        }
    }

    startHideControlsTimeout() {
        if (this.isMobile) return;
        
        this.clearHideControlsTimeout();
        this.hideControlsTimeout = setTimeout(() => {
            if (this.isPlaying && this.isControlsVisible) {
                this.hideControls();
            }
        }, 3000);
    }

    clearHideControlsTimeout() {
        if (this.hideControlsTimeout) {
            clearTimeout(this.hideControlsTimeout);
            this.hideControlsTimeout = null;
        }
    }

    togglePlay() {
        if (this.videoElement.paused) {
            this.videoElement.play().catch(e => {
                console.error('Play failed:', e);
            });
        } else {
            this.videoElement.pause();
        }
        this.showControlsTemporarily();
    }

    onPlay() {
        this.isPlaying = true;
        this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        if (!this.isMobile) {this.startHideControlsTimeout();}
    }

    onPause() {
        this.isPlaying = false;
        this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        this.clearHideControlsTimeout();
        this.showControls();
    }

    seek(e) {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.videoElement.currentTime = Math.max(0, Math.min(percent * this.videoElement.duration, this.videoElement.duration));
        this.showControlsTemporarily();
    }

    updateProgress() {
        const currentTime = this.videoElement.currentTime;
        const duration = this.videoElement.duration;
        
        if (duration && isFinite(duration)) {
            const percent = (currentTime / duration) * 100;
            this.progressFill.style.width = percent + '%';
            this.progressHandle.style.left = percent + '%';
            
            this.currentTimeEl.textContent = this.formatTime(currentTime);
        }
    }

    updateDuration() {
        if (this.videoElement.duration && isFinite(this.videoElement.duration)) {
            this.durationEl.textContent = this.formatTime(this.videoElement.duration);
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    toggleVolumeControl() {
        const isVisible = this.volumeControl.style.display === 'block';
        this.volumeControl.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            this.showControlsTemporarily();
        }
    }

    setVolume() {
        const volume = parseFloat(this.volumeSlider.value);
        this.videoElement.volume = volume;
        this.videoElement.muted = (volume === 0);
        this.updateVolumeIcon();
    }

    updateVolumeIcon() {
        const volume = this.videoElement.volume;
        const isMuted = this.videoElement.muted;
        
        let icon;
        if (isMuted || volume === 0) {
            icon = 'volume-mute';
        } else if (volume < 0.5) {
            icon = 'volume-down';
        } else {
            icon = 'volume-up';
        }
        
        this.volumeBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
    }

    toggleMute() {
        this.videoElement.muted = !this.videoElement.muted;
        if (this.videoElement.muted) {
            this.volumeSlider.value = 0;
        } else {
            this.volumeSlider.value = this.videoElement.volume;
        }
        this.updateVolumeIcon();
        this.showControlsTemporarily();
    }

    handleKeyPress(e) {
        // Eğer input alanında değilse klavye kontrollerini işle
        if (e.target.tagName === 'INPUT') return;
        
        switch(e.key.toLowerCase()) {
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
            case 'arrowleft':
                e.preventDefault();
                this.skip(-10);
                break;
            case 'arrowright':
                e.preventDefault();
                this.skip(10);
                break;
            case 'escape':
                if (this.isFullscreen) {
                    this.exitFullscreen();
                }
                break;
        }
        this.showControlsTemporarily();
    }

    skip(seconds) {
        this.videoElement.currentTime += seconds;
        this.showControlsTemporarily();
    }

    toggleFullscreen() {
        if (!this.isFullscreen) {
            this.enterFullscreen();
        } else {
            this.exitFullscreen();
        }
        this.showControlsTemporarily();
    }

    enterFullscreen() {
        const player = this.netflixPlayer;
        
        if (player.requestFullscreen) {
            player.requestFullscreen();
        } else if (player.webkitRequestFullscreen) {
            player.webkitRequestFullscreen();
        } else if (player.mozRequestFullScreen) {
            player.mozRequestFullScreen();
        } else if (player.msRequestFullscreen) {
            player.msRequestFullscreen();
        }
    }

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    handleFullscreenChange() {
        this.isFullscreen = !!(document.fullscreenElement || 
                              document.webkitFullscreenElement || 
                              document.mozFullScreenElement || 
                              document.msFullscreenElement);
        
        // Fullscreen buton ikonunu güncelle
        const icon = this.isFullscreen ? 'compress' : 'expand';
        this.fullscreenBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
        
        // Fullscreen modunda kontrolleri göster
        this.showControls();
        this.startHideControlsTimeout();
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

    destroy() {
        this.clearHideControlsTimeout();
        if (this.hls) {
            this.hls.destroy();
        }
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
    window.netflixPlayer = new NetflixPlayer();
});

// Sayfadan çıkarken temizlik
window.addEventListener('beforeunload', () => {
    if (window.netflixPlayer) {
        window.netflixPlayer.destroy();
    }
});
