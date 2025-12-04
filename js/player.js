// player.js
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
        this.videoQuality = document.getElementById('videoQuality');
        this.subtitlesBtn = document.getElementById('subtitlesBtn');
        this.subtitlesMenu = document.getElementById('subtitlesMenu');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsMenu = document.getElementById('settingsMenu');
        this.playbackSpeedBtn = document.getElementById('playbackSpeedBtn');
        this.playbackSpeedMenu = document.getElementById('playbackSpeedMenu');
        
        this.isPlaying = false;
        this.isFullscreen = false;
        this.isControlsVisible = true;
        this.hideControlsTimeout = null;
        this.isMobile = this.detectMobile();
        this.isHLS = false;
        this.hls = null;
        this.qualities = [];
        this.subtitles = [];
        this.playbackSpeeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
        this.currentPlaybackSpeed = 1;
        
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
        this.setupPlaybackSpeedMenu();
    }

    loadVideo() {
        const urlParams = new URLSearchParams(window.location.search);
        const videoUrl = urlParams.get('url');
        const videoTitle = urlParams.get('title');

        if (videoTitle) {
            this.videoTitle.textContent = videoTitle;
            document.title = `${videoTitle} - IPTV Player`;
        }

        if (!videoUrl) {
            this.showError('Video URL bulunamadı.');
            return;
        }

        this.showLoading();

        // URL uzantısına göre format belirleme
        const urlLower = videoUrl.toLowerCase();
        this.isHLS = urlLower.includes('.m3u8') || urlLower.includes('m3u8') || urlLower.includes('hls');

        if (this.isHLS) {
            // HLS video (m3u8)
            this.setupHLSVideo(videoUrl);
        } else {
            // Direkt video (MP4, WebM, etc.)
            this.setupDirectVideo(videoUrl);
        }
    }

    setupHLSVideo(videoUrl) {
        // HLS desteği kontrolü
        if (Hls && Hls.isSupported()) {
            this.setupHLS(videoUrl);
        } else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari için native HLS desteği
            this.setupNativeHLS(videoUrl);
        } else {
            this.showError('Tarayıcınız HLS formatını desteklemiyor. Lütfen Chrome, Firefox veya Edge kullanın.');
        }
    }

    setupDirectVideo(videoUrl) {
        // Video formatını kontrol et
        const videoFormats = {
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.ogg': 'video/ogg',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.mkv': 'video/x-matroska'
        };

        // Formatı algıla
        let detectedFormat = null;
        for (const [ext, mimeType] of Object.entries(videoFormats)) {
            if (videoUrl.toLowerCase().includes(ext)) {
                if (this.videoElement.canPlayType(mimeType)) {
                    detectedFormat = mimeType;
                    break;
                }
            }
        }

        if (!detectedFormat) {
            // Format algılanamadı, doğrudan yükle
            console.log('Video formatı algılanamadı, doğrudan yükleniyor...');
        }

        this.videoElement.src = videoUrl;
        
        // Video element event listeners
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

        // Quality selector'ı gizle (direct video için gerek yok)
        if (this.videoQuality) {
            this.videoQuality.style.display = 'none';
        }
    }

    setupHLS(videoUrl) {
        this.hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 600,
            maxBufferSize: 60 * 1000 * 1000, // 60MB
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10,
            fragLoadingTimeOut: 20000,
            manifestLoadingTimeOut: 10000,
            levelLoadingTimeOut: 10000
        });
        
        hls.loadSource(videoUrl);
        hls.attachMedia(this.videoElement);
        
        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            this.hideLoading();
            
            // Quality seviyelerini al
            this.qualities = data.levels;
            this.setupQualitySelector();
            
            this.videoElement.play().catch(e => {
                console.log('Otomatik oynatma engellendi:', e);
                this.hideLoading();
            });
        });

        hls.on(Hls.Events.LEVEL_LOADED, () => {
            this.hideLoading();
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
            console.log('Quality switched to:', data.level);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS Error:', data);
            if (data.fatal) {
                this.handleFatalError(data);
            }
        });

        // Subtitle desteği
        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (event, data) => {
            this.subtitles = data.subtitleTracks;
            this.setupSubtitlesSelector();
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

    setupQualitySelector() {
        if (!this.videoQuality || !this.qualities || this.qualities.length <= 1) {
            if (this.videoQuality) {
                this.videoQuality.style.display = 'none';
            }
            return;
        }

        this.videoQuality.style.display = 'block';
        this.videoQuality.innerHTML = '';
        
        // Mevcut quality'yi bul
        const currentLevel = this.hls.currentLevel;
        
        // Tüm quality seçeneklerini ekle
        this.qualities.forEach((level, index) => {
            const button = document.createElement('button');
            const height = level.height || 'N/A';
            const bitrate = level.bitrate ? Math.round(level.bitrate / 1000) + 'kbps' : 'Auto';
            button.textContent = `${height}p (${bitrate})`;
            button.className = index === currentLevel ? 'active' : '';
            button.addEventListener('click', () => {
                this.hls.currentLevel = index;
                // Aktif butonu güncelle
                this.videoQuality.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
            this.videoQuality.appendChild(button);
        });

        // Auto seçeneği
        const autoButton = document.createElement('button');
        autoButton.textContent = 'Auto';
        autoButton.className = currentLevel === -1 ? 'active' : '';
        autoButton.addEventListener('click', () => {
            this.hls.currentLevel = -1;
            this.videoQuality.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            autoButton.classList.add('active');
        });
        this.videoQuality.appendChild(autoButton);
    }

    setupSubtitlesSelector() {
        if (!this.subtitlesBtn || !this.subtitles || this.subtitles.length === 0) {
            if (this.subtitlesBtn) {
                this.subtitlesBtn.style.display = 'none';
            }
            return;
        }

        this.subtitlesBtn.style.display = 'block';
        this.subtitlesMenu.innerHTML = '';
        
        // Subtitle kapalı seçeneği
        const offButton = document.createElement('button');
        offButton.textContent = 'Kapalı';
        offButton.addEventListener('click', () => {
            if (this.hls) {
                this.hls.subtitleTrack = -1;
            }
            this.subtitlesMenu.style.display = 'none';
        });
        this.subtitlesMenu.appendChild(offButton);

        // Subtitle seçenekleri
        this.subtitles.forEach((track, index) => {
            const button = document.createElement('button');
            button.textContent = track.name || `Subtitle ${index + 1}`;
            button.addEventListener('click', () => {
                if (this.hls) {
                    this.hls.subtitleTrack = index;
                }
                this.subtitlesMenu.style.display = 'none';
            });
            this.subtitlesMenu.appendChild(button);
        });
    }

    setupPlaybackSpeedMenu() {
        if (!this.playbackSpeedMenu) return;

        this.playbackSpeeds.forEach(speed => {
            const button = document.createElement('button');
            button.textContent = speed === 1 ? 'Normal' : speed + 'x';
            button.addEventListener('click', () => {
                this.setPlaybackSpeed(speed);
                this.playbackSpeedMenu.style.display = 'none';
            });
            this.playbackSpeedMenu.appendChild(button);
        });
    }

    setPlaybackSpeed(speed) {
        this.currentPlaybackSpeed = speed;
        this.videoElement.playbackRate = speed;
        if (this.playbackSpeedBtn) {
            this.playbackSpeedBtn.textContent = speed === 1 ? 'Normal' : speed + 'x';
        }
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
        this.videoElement.addEventListener('volumechange', () => this.updateVolumeIcon());
        this.videoElement.addEventListener('enterpictureinpicture', () => this.onPiPStart());
        this.videoElement.addEventListener('leavepictureinpicture', () => this.onPiPStop());

        // Kontrol butonları
        this.playPauseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePlay();
        });
        this.progressBar.addEventListener('click', (e) => this.seek(e));
        this.progressBar.addEventListener('mousedown', () => this.startScrubbing());
        this.progressBar.addEventListener('mouseup', () => this.stopScrubbing());
        this.volumeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMute();
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

        // Yeni butonlar
        if (this.subtitlesBtn) {
            this.subtitlesBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSubtitlesMenu();
            });
        }

        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSettingsMenu();
            });
        }

        if (this.playbackSpeedBtn) {
            this.playbackSpeedBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePlaybackSpeedMenu();
            });
        }

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
            if (this.volumeControl && !this.volumeControl.contains(e.target) && e.target !== this.volumeBtn) {
                this.volumeControl.style.display = 'none';
            }
            
            // Menüleri kapat
            if (this.subtitlesMenu && !this.subtitlesMenu.contains(e.target) && e.target !== this.subtitlesBtn) {
                this.subtitlesMenu.style.display = 'none';
            }
            
            if (this.settingsMenu && !this.settingsMenu.contains(e.target) && e.target !== this.settingsBtn) {
                this.settingsMenu.style.display = 'none';
            }
            
            if (this.playbackSpeedMenu && !this.playbackSpeedMenu.contains(e.target) && e.target !== this.playbackSpeedBtn) {
                this.playbackSpeedMenu.style.display = 'none';
            }
        });

        // Sayfa görünürlüğü değişikliği
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.clearHideControlsTimeout();
                // Sayfa gizlendiğinde videoyu duraklat
                if (this.isPlaying) {
                    this.videoElement.pause();
                }
            }
        });

        // Pencere boyutu değişikliği
        window.addEventListener('resize', () => this.handleResize());

        // Progress bar drag için
        this.setupProgressBarDrag();
    }

    setupProgressBarDrag() {
        let isDragging = false;

        this.progressHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            this.startScrubbing();
            
            const onMouseMove = (e) => {
                if (!isDragging) return;
                const rect = this.progressBar.getBoundingClientRect();
                let percent = (e.clientX - rect.left) / rect.width;
                percent = Math.max(0, Math.min(percent, 1));
                
                // Preview gösterme
                this.progressFill.style.width = percent * 100 + '%';
                this.progressHandle.style.left = percent * 100 + '%';
                
                const previewTime = percent * this.videoElement.duration;
                this.currentTimeEl.textContent = this.formatTime(previewTime);
            };
            
            const onMouseUp = (e) => {
                if (!isDragging) return;
                isDragging = false;
                
                const rect = this.progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                this.videoElement.currentTime = Math.max(0, Math.min(percent * this.videoElement.duration, this.videoElement.duration));
                
                this.stopScrubbing();
                
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // Touch desteği
        this.progressHandle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            isDragging = true;
            this.startScrubbing();
        });

        this.progressBar.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            const rect = this.progressBar.getBoundingClientRect();
            let percent = (touch.clientX - rect.left) / rect.width;
            percent = Math.max(0, Math.min(percent, 1));
            
            this.progressFill.style.width = percent * 100 + '%';
            this.progressHandle.style.left = percent * 100 + '%';
            
            const previewTime = percent * this.videoElement.duration;
            this.currentTimeEl.textContent = this.formatTime(previewTime);
        });

        this.progressBar.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            const touch = e.changedTouches[0];
            const rect = this.progressBar.getBoundingClientRect();
            const percent = (touch.clientX - rect.left) / rect.width;
            this.videoElement.currentTime = Math.max(0, Math.min(percent * this.videoElement.duration, this.videoElement.duration));
            
            this.stopScrubbing();
        });
    }

    startScrubbing() {
        this.isScrubbing = true;
        this.videoElement.pause();
        this.showControls();
        this.clearHideControlsTimeout();
    }

    stopScrubbing() {
        this.isScrubbing = false;
        if (this.isPlaying) {
            this.videoElement.play().catch(console.error);
        }
        this.startHideControlsTimeout();
    }

    toggleSubtitlesMenu() {
        const isVisible = this.subtitlesMenu.style.display === 'block';
        this.subtitlesMenu.style.display = isVisible ? 'none' : 'block';
        this.hideOtherMenus('subtitles');
    }

    toggleSettingsMenu() {
        const isVisible = this.settingsMenu.style.display === 'block';
        this.settingsMenu.style.display = isVisible ? 'none' : 'block';
        this.hideOtherMenus('settings');
    }

    togglePlaybackSpeedMenu() {
        const isVisible = this.playbackSpeedMenu.style.display === 'block';
        this.playbackSpeedMenu.style.display = isVisible ? 'none' : 'block';
        this.hideOtherMenus('playbackSpeed');
    }

    hideOtherMenus(except) {
        if (except !== 'subtitles' && this.subtitlesMenu) {
            this.subtitlesMenu.style.display = 'none';
        }
        if (except !== 'settings' && this.settingsMenu) {
            this.settingsMenu.style.display = 'none';
        }
        if (except !== 'playbackSpeed' && this.playbackSpeedMenu) {
            this.playbackSpeedMenu.style.display = 'none';
        }
    }

    setupControlsAutoHide() {
        if (!this.isMobile) {
            this.startHideControlsTimeout();
        }
    }

    showControlsTemporarily() {
        if (this.isMobile || this.isScrubbing) return;
        
        this.showControls();
        this.clearHideControlsTimeout();
        this.startHideControlsTimeout();
    }

    showControls() {
        this.netflixPlayer.classList.remove('controls-hidden');
        this.isControlsVisible = true;
    }

    hideControls() {
        if (!this.isPlaying || this.isMobile || !this.isControlsVisible || this.isScrubbing) return;
        
        this.netflixPlayer.classList.add('controls-hidden');
        this.volumeControl.style.display = 'none';
        this.hideOtherMenus();
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
        if (this.isMobile || this.isScrubbing) return;
        
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
                // Otomatik oynatma engellendiyse, kullanıcıya göster
                if (e.name === 'NotAllowedError') {
                    this.showControls();
                }
            });
        } else {
            this.videoElement.pause();
        }
        this.showControlsTemporarily();
    }

    onPlay() {
        this.isPlaying = true;
        this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        if (!this.isMobile) {
            this.startHideControlsTimeout();
        }
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
        if (this.isScrubbing) return;
        
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
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
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
            case 'p':
                e.preventDefault();
                this.togglePictureInPicture();
                break;
            case '>':
            case '.':
                e.preventDefault();
                this.setPlaybackSpeed(Math.min(2, this.currentPlaybackSpeed + 0.25));
                break;
            case '<':
            case ',':
                e.preventDefault();
                this.setPlaybackSpeed(Math.max(0.25, this.currentPlaybackSpeed - 0.25));
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

    togglePictureInPicture() {
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture();
        } else if (this.videoElement.requestPictureInPicture) {
            this.videoElement.requestPictureInPicture();
        }
    }

    onPiPStart() {
        console.log('Picture-in-Picture started');
        this.isPiP = true;
    }

    onPiPStop() {
        console.log('Picture-in-Picture stopped');
        this.isPiP = false;
    }

    handleResize() {
        // Ekran boyutu değiştiğinde kontrol et
        this.updateProgress();
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
        
        if (this.hls && Hls.ErrorTypes) {
            switch(data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    message = 'Ağ hatası. Lütfen internet bağlantınızı kontrol edin.';
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                    message = 'Medya hatası. Video dosyası bozuk olabilir.';
                    break;
            }
        }
        
        this.showError(message);
    }

    destroy() {
        this.clearHideControlsTimeout();
        if (this.hls) {
            this.hls.destroy();
        }
        // Event listener'ları temizle
        document.removeEventListener('keydown', this.handleKeyPress);
        document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
}

// Global fonksiyonlar
function goBack() {
    window.history.back();
}

function retryPlayback() {
    window.location.reload();
}

function toggleSettings() {
    const settings = document.getElementById('settingsMenu');
    if (settings) {
        settings.style.display = settings.style.display === 'block' ? 'none' : 'block';
    }
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

// Hata durumunda yeniden deneme
window.addEventListener('online', () => {
    console.log('Internet connection restored');
    const errorOverlay = document.getElementById('errorOverlay');
    if (errorOverlay && errorOverlay.style.display === 'flex') {
        retryPlayback();
    }
});
