// player.js - Düzgün çalışan TV kumandası desteği ile video player
class NetflixPlayer {
    constructor() {
        // Temel elementler
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
        
        // Durum değişkenleri
        this.isPlaying = false;
        this.isFullscreen = false;
        this.isTV = false;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isHLS = false;
        this.hls = null;
        this.lastKeyPressTime = 0;
        this.controlsVisible = true;
        this.controlsTimeout = null;
        this.isScrubbing = false;
        this.currentVolume = 1;
        this.currentPlaybackSpeed = 1;
        this.hlsInitialized = false;
        
        // Başlat
        this.init();
    }
    
    init() {
        // TV algıla
        this.detectTVMode();
        
        // Event listener'ları kur
        this.setupEventListeners();
        
        // Kontrolleri ayarla
        this.setupControls();
        
        // TV için özel ayarlar
        if (this.isTV) {
            this.setupTVMode();
        }
        
        // Video yükle (async olarak)
        setTimeout(() => {
            this.loadVideo();
        }, 100);
    }
    
    detectTVMode() {
        const userAgent = navigator.userAgent.toLowerCase();
        this.isTV = userAgent.includes("tizen") ||
                   userAgent.includes("webos") ||
                   userAgent.includes("smart-tv") ||
                   userAgent.includes("smarttv") ||
                   userAgent.includes("netcast") ||
                   userAgent.includes("appletv") ||
                   userAgent.includes("android tv") ||
                   userAgent.includes("crkey") ||
                   userAgent.includes("xbox") ||
                   /tv/ui.test(userAgent);
        
        if (this.isTV) {
            document.body.classList.add('tv-mode');
            document.body.style.cursor = 'none';
            console.log("TV MODE: Aktif");
        }
    }
    
    loadVideo() {
        const urlParams = new URLSearchParams(window.location.search);
        const videoUrl = urlParams.get('url');
        const videoTitle = urlParams.get('title') || 'Video';
    
        if (videoTitle) {
            this.videoTitle.textContent = videoTitle;
            document.title = `${videoTitle} - IPTV Player`;
        }
    
        if (!videoUrl) {
            this.showError('Video URL bulunamadı.');
            return;
        }
    
        this.showLoading();
    
        // HLS kontrolü - daha gelişmiş
        const urlLower = videoUrl.toLowerCase();
        this.isHLS = urlLower.includes('.m3u8') || 
                     urlLower.includes('/hls/') ||
                     urlLower.includes('m3u8?') ||
                     urlLower.includes('.m3u') || // .m3u uzantılı dosyalar da olabilir
                     this.isHLSStream(videoUrl);
    
        console.log("Video URL:", videoUrl);
        console.log("Is HLS:", this.isHLS);
        console.log("Is TV:", this.isTV);
    
        if (this.isHLS) {
            this.setupHLSVideo(videoUrl);
        } else {
            this.setupDirectVideo(videoUrl);
        }
    }
    
    // Yeni helper fonksiyonu ekle (class içinde)
    isHLSStream(url) {
        // URL'den HLS stream olup olmadığını kontrol et
        const hlsPatterns = [
            /\.m3u8/i,
            /\/hls\//i,
            /\.m3u/i,
            /manifest\.m3u8/i,
            /index\.m3u8/i,
            /live\.m3u8/i,
            /\.m3u8\?/i,
            /format=m3u8/i,
            /type=m3u8/i,
            /hls_manifest/i
        ];
        
        return hlsPatterns.some(pattern => pattern.test(url));
    }
    
    setupDirectVideo(videoUrl) {
        console.log("Direct video setup:", videoUrl);
        
        // Video elementini temizle
        this.videoElement.src = '';
        this.videoElement.load();
        
        // Smart TV'ler için MP4 codec kontrolü ve MIME type belirtme
        const videoUrlLower = videoUrl.toLowerCase();
        
        // MP4 video için özel işleme
        if (videoUrlLower.includes('.mp4') || videoUrlLower.includes('.m4v')) {
            // Smart TV'ler için video tipini açıkça belirt
            const videoType = this.getVideoType(videoUrlLower);
            
            // Video elementine type attribute ekle
            if (videoType) {
                this.videoElement.setAttribute('type', videoType);
                console.log("Setting video type for Smart TV:", videoType);
            }
        }
        
        // URL'yi doğrudan ata
        this.videoElement.src = videoUrl;
        
        // Smart TV'ler için gerekli attribute'lar
        this.videoElement.setAttribute('preload', 'auto');
        this.videoElement.setAttribute('playsinline', '');
        this.videoElement.setAttribute('webkit-playsinline', '');
        
        // Smart TV uyumluluğu için crossOrigin ayarı
        this.videoElement.crossOrigin = 'anonymous';
        
        // Event listener'lar
        const videoLoaded = () => {
            console.log("Video loaded for Smart TV");
            this.hideLoading();
            
            // Smart TV'lerde bazen play() promise'i çalışmıyor
            const playPromise = this.videoElement.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log("Smart TV: Video playing successfully");
                    })
                    .catch(e => {
                        console.log("Smart TV: Auto-play blocked, showing controls");
                        this.showControls();
                        
                        // Smart TV'ler için alternatif başlatma
                        if (this.isTV) {
                            console.log("Smart TV mode detected, using alternative play method");
                            // TV modunda kullanıcı etkileşimi bekle
                            this.videoElement.muted = true;
                            setTimeout(() => {
                                this.videoElement.play().catch(console.log);
                            }, 1000);
                        }
                    });
            }
        };
        
        this.videoElement.addEventListener('loadeddata', videoLoaded, { once: true });
        
        // Canplaythrough event'ini de dinle (Smart TV'ler için daha iyi)
        this.videoElement.addEventListener('canplaythrough', () => {
            console.log("Smart TV: Video can play through");
            this.hideLoading();
        }, { once: true });
        
        this.videoElement.addEventListener('error', (e) => {
            console.error("Smart TV Video error:", e, this.videoElement.error);
            
            // Hata detaylarını logla
            if (this.videoElement.error) {
                console.error("Error code:", this.videoElement.error.code);
                console.error("Error message:", this.videoElement.error.message);
            }
            
            this.handlePlayerError();
        }, { once: true });
        
        // Video'yu yükle
        this.videoElement.load();
        
        // Smart TV'ler için ön yükleme
        if (this.isTV) {
            console.log("Smart TV: Preloading video...");
            this.videoElement.preload = "auto";
            
            // Smart TV'ler için buffer ayarı
            setTimeout(() => {
                if (this.videoElement.buffered.length > 0) {
                    console.log("Smart TV: Buffered", this.videoElement.buffered.end(0), "seconds");
                }
            }, 1000);
        }
    }

    getVideoType(videoUrl) {
        if (videoUrl.includes('.mp4')) {
            // Codec bilgisi olup olmadığını kontrol et
            if (videoUrl.includes('h264') || videoUrl.includes('avc')) {
                return 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
            } else if (videoUrl.includes('h265') || videoUrl.includes('hevc')) {
                return 'video/mp4; codecs="hev1.1.6.L93.B0"';
            } else {
                // Varsayılan olarak H.264 belirt (Smart TV'lerde en yaygın)
                return 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
            }
        } else if (videoUrl.includes('.webm')) {
            return 'video/webm; codecs="vp8, vorbis"';
        } else if (videoUrl.includes('.ogv') || videoUrl.includes('.ogg')) {
            return 'video/ogg; codecs="theora, vorbis"';
        }
        return null;
    }
    
    setupHLSVideo(videoUrl) {
        console.log("Setting up HLS video:", videoUrl);
        
        // HLS.js kontrolü - doğru şekilde
        if (typeof Hls === 'undefined') {
            console.log("HLS.js not loaded yet, loading dynamically...");
            this.loadHlsJS(videoUrl);
        } else {
            console.log("HLS.js already loaded, initializing...");
            this.initializeHLS(videoUrl);
        }
    }

    loadHlsJS(videoUrl) {
        console.log("Loading HLS.js...");
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
        
        script.onload = () => {
            console.log("HLS.js loaded successfully");
            setTimeout(() => {
                this.initializeHLS(videoUrl);
            }, 100);
        };
        
        script.onerror = (error) => {
            console.error("Failed to load HLS.js:", error);
            // HLS.js yüklenemezse native HLS'yi dene
            this.setupNativeHLS(videoUrl);
        };
        
        document.head.appendChild(script);
    }
    
    initializeHLS(videoUrl) {
        console.log("Initializing HLS.js...");
        
        // HLS.js destekleniyor mu kontrol et
        if (!Hls.isSupported()) {
            console.log("HLS.js not supported, trying native HLS");
            this.setupNativeHLS(videoUrl);
            return;
        }
        
        try {
            // Eski HLS instance'ını temizle
            if (this.hls) {
                this.hls.destroy();
                this.hls = null;
            }
            
            console.log("Creating new HLS instance");
            this.hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                maxBufferSize: 60 * 1000 * 1000,
                maxBufferHole: 0.5,
                // Smart TV uyumluluk
                manifestLoadingTimeOut: 10000,
                manifestLoadingMaxRetry: 3,
                levelLoadingTimeOut: 10000,
                levelLoadingMaxRetry: 3,
                fragLoadingTimeOut: 20000,
                fragLoadingMaxRetry: 6
            });
            
            // Hata event'leri
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS Error:', data);
                
                if (data.fatal) {
                    switch(data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.error("HLS Network Error, trying to recover...");
                            this.hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.error("HLS Media Error, trying to recover...");
                            this.hls.recoverMediaError();
                            break;
                        default:
                            console.error("HLS Fatal Error");
                            this.showError('HLS video yüklenemedi. Native player deneniyor...');
                            // Fallback to native HLS
                            setTimeout(() => {
                                this.setupNativeHLS(videoUrl);
                            }, 1000);
                            break;
                    }
                }
            });
            
            // Manifest yüklendiğinde
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log("HLS manifest parsed successfully");
                this.hideLoading();
                
                // Video'yu oynatmayı dene
                const playPromise = this.videoElement.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        console.log("Auto-play blocked, user interaction required");
                        this.showControls();
                    });
                }
            });
            
            // Media attach edildiğinde
            this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                console.log("HLS media attached");
            });
            
            // Video source'u yükle
            console.log("Loading HLS source...");
            this.hls.loadSource(videoUrl);
            this.hls.attachMedia(this.videoElement);
            
            this.hlsInitialized = true;
            
        } catch (error) {
            console.error('HLS Initialization Error:', error);
            this.showError('HLS oynatıcı başlatılamadı. Native player deneniyor...');
            
            // Fallback to native HLS
            setTimeout(() => {
                this.setupNativeHLS(videoUrl);
            }, 500);
        }
    }
    
    setupNativeHLS(videoUrl) {
        console.log("Setting up native HLS for Smart TV");
        
        // Video elementini temizle
        this.videoElement.src = '';
        this.videoElement.load();
        
        // Smart TV'ler için native HLS ayarları
        this.videoElement.src = videoUrl;
        
        // HLS için MIME type belirt (Smart TV'ler için önemli)
        this.videoElement.setAttribute('type', 'application/vnd.apple.mpegurl');
        
        // Smart TV uyumluluğu için diğer ayarlar
        this.videoElement.setAttribute('preload', 'auto');
        this.videoElement.setAttribute('playsinline', '');
        this.videoElement.setAttribute('webkit-playsinline', '');
        this.videoElement.crossOrigin = 'anonymous';
        
        // Event listeners for native HLS
        const handleLoaded = () => {
            console.log("Native HLS loaded on Smart TV");
            this.hideLoading();
            
            // Smart TV'ler için otomatik oynatma denemesi
            const playPromise = this.videoElement.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.log("Native HLS: Auto-play blocked on Smart TV");
                    this.showControls();
                });
            }
        };
        
        this.videoElement.addEventListener('loadeddata', handleLoaded, { once: true });
        
        this.videoElement.addEventListener('error', (e) => {
            console.error("Native HLS Error on Smart TV:", e, this.videoElement.error);
            
            if (this.videoElement.error) {
                console.error("Error code:", this.videoElement.error.code);
                console.error("Error message:", this.videoElement.error.message);
                
                // M3U8 için özel hata mesajı
                if (videoUrl.includes('.m3u8')) {
                    this.showError('M3U8/HLS stream yüklenemedi. Stream geçerli olmayabilir veya Smart TV tarafından desteklenmiyor.');
                } else {
                    this.showError('Video yüklenirken hata oluştu.');
                }
            }
        }, { once: true });
        
        // Video'yu yükle
        this.videoElement.load();
    }
    
    setupTVMode() {
        this.netflixPlayer.classList.add('tv-player');
        
        // TV tuşlarını kaydet
        if (typeof tizen !== 'undefined' && tizen.tvinputdevice) {
            try {
                const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Back'];
                keys.forEach(key => {
                    try {
                        tizen.tvinputdevice.registerKey(key);
                    } catch (err) {
                        // Ignore
                    }
                });
            } catch (err) {
                console.log("Tizen API not available");
            }
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
        this.videoElement.addEventListener('volumechange', () => this.updateVolumeIcon());
        this.videoElement.addEventListener('error', () => this.handlePlayerError());
        
        // Kontrol butonları
        this.playPauseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePlay();
        });
        
        this.progressBar.addEventListener('click', (e) => this.seek(e));
        
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
        
        // Klavye kontrolleri
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Mouse hareketleri
        this.netflixPlayer.addEventListener('mousemove', () => {
            this.showControls();
            this.startControlsTimeout();
        });
        
        // Video tıklama
        this.videoElement.addEventListener('click', () => {
            this.togglePlay();
        });
        
        // Fullscreen değişiklikleri
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        
        // Progress bar drag
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
                percent = Math.max(0, Math.min(1, percent));
                this.updateProgressPreview(percent);
            };
            
            const onMouseUp = (e) => {
                if (!isDragging) return;
                isDragging = false;
                
                const rect = this.progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                this.seekToPercent(percent);
                this.stopScrubbing();
                
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }
    
    startScrubbing() {
        this.isScrubbing = true;
        this.videoElement.pause();
        this.showControls();
        this.clearControlsTimeout();
    }
    
    stopScrubbing() {
        this.isScrubbing = false;
        if (this.isPlaying) {
            this.videoElement.play();
        }
        this.startControlsTimeout();
    }
    
    handleKeyPress(e) {
        // TV modunda özel işleyici
        if (this.isTV) {
            this.handleTVKeyPress(e);
            return;
        }
        
        // Normal klavye kontrolleri
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
                } else {
                    goBack();
                }
                break;
        }
        this.showControls();
    }
    
    handleTVKeyPress(e) {
        const now = Date.now();
        
        // Debounce
        if (now - this.lastKeyPressTime < 200) {
            e.preventDefault();
            return;
        }
        this.lastKeyPressTime = now;
        
        console.log("TV Key:", e.key);
        
        // Kontrolleri göster
        this.showControls();
        this.startControlsTimeout();
        
        switch(e.key) {
            case 'ArrowUp':
            case 'Up':
            case 38:
                e.preventDefault();
                this.adjustVolume(0.1);
                break;
                
            case 'ArrowDown':
            case 'Down':
            case 40:
                e.preventDefault();
                this.adjustVolume(-0.1);
                break;
                
            case 'ArrowLeft':
            case 'Left':
            case 37:
                e.preventDefault();
                this.skip(-10);
                this.showOSD('-10s');
                break;
                
            case 'ArrowRight':
            case 'Right':
            case 39:
                e.preventDefault();
                this.skip(10);
                this.showOSD('+10s');
                break;
                
            case 'Enter':
            case 13:
            case 'MediaPlayPause':
                e.preventDefault();
                this.togglePlay();
                this.showOSD(this.videoElement.paused ? 'Duraklatıldı' : 'Oynatılıyor');
                break;
                
            case ' ':
            case 'Spacebar':
            case 32:
                e.preventDefault();
                this.togglePlay();
                break;
                
            case 'Backspace':
            case 'Back':
            case 'Escape':
            case 'Esc':
            case 27:
            case 'Return':
                e.preventDefault();
                goBack();
                break;
                
            case 10009: // Tizen RETURN
                e.preventDefault();
                goBack();
                break;
                
            case 10182: // Tizen EXIT
                e.preventDefault();
                if (typeof tizen !== 'undefined' && tizen.application) {
                    tizen.application.getCurrentApplication().exit();
                } else {
                    goBack();
                }
                break;
        }
    }
    
    showOSD(text) {
        // Eski OSD'yi temizle
        const oldOSD = document.getElementById('tvOSD');
        if (oldOSD) oldOSD.remove();
        
        // Yeni OSD oluştur
        const osd = document.createElement('div');
        osd.id = 'tvOSD';
        osd.className = 'tv-osd';
        osd.textContent = text;
        
        this.netflixPlayer.appendChild(osd);
        
        // 1.5 saniye sonra kaldır
        setTimeout(() => {
            if (osd.parentNode) {
                osd.parentNode.removeChild(osd);
            }
        }, 1500);
    }
    
    adjustVolume(change) {
        let newVolume = this.videoElement.volume + change;
        newVolume = Math.max(0, Math.min(1, newVolume));
        this.videoElement.volume = newVolume;
        this.videoElement.muted = (newVolume === 0);
        
        this.updateVolumeIcon();
        if (this.volumeSlider) {
            this.volumeSlider.value = newVolume;
        }
        
        const volumePercent = Math.round(newVolume * 100);
        this.showOSD(`Ses: ${volumePercent}%`);
    }
    
    togglePlay() {
        if (this.videoElement.paused) {
            this.videoElement.play().catch(e => {
                console.error('Play failed:', e);
                this.showControls();
            });
        } else {
            this.videoElement.pause();
        }
        this.showControls();
    }
    
    skip(seconds) {
        this.videoElement.currentTime += seconds;
        this.showControls();
    }
    
    toggleFullscreen() {
        if (!this.isFullscreen) {
            this.enterFullscreen();
        } else {
            this.exitFullscreen();
        }
        this.showControls();
    }
    
    enterFullscreen() {
        if (this.netflixPlayer.requestFullscreen) {
            this.netflixPlayer.requestFullscreen();
        } else if (this.netflixPlayer.webkitRequestFullscreen) {
            this.netflixPlayer.webkitRequestFullscreen();
        } else if (this.netflixPlayer.mozRequestFullScreen) {
            this.netflixPlayer.mozRequestFullScreen();
        } else if (this.netflixPlayer.msRequestFullscreen) {
            this.netflixPlayer.msRequestFullscreen();
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
    
    toggleMute() {
        this.videoElement.muted = !this.videoElement.muted;
        this.updateVolumeIcon();
        this.showControls();
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
    
    updateProgressPreview(percent) {
        this.progressFill.style.width = percent * 100 + '%';
        this.progressHandle.style.left = percent * 100 + '%';
        
        const previewTime = percent * this.videoElement.duration;
        this.currentTimeEl.textContent = this.formatTime(previewTime);
    }
    
    seekToPercent(percent) {
        this.videoElement.currentTime = percent * this.videoElement.duration;
    }
    
    seek(e) {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.videoElement.currentTime = percent * this.videoElement.duration;
        this.showControls();
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
    
    setupControls() {
        this.showControls();
        this.startControlsTimeout();
    }
    
    showControls() {
        this.netflixPlayer.classList.remove('controls-hidden');
        this.controlsVisible = true;
    }
    
    hideControls() {
        if (!this.isPlaying || !this.controlsVisible || this.isScrubbing) return;
        this.netflixPlayer.classList.add('controls-hidden');
        this.controlsVisible = false;
    }
    
    startControlsTimeout() {
        this.clearControlsTimeout();
        this.controlsTimeout = setTimeout(() => {
            this.hideControls();
        }, 3000);
    }
    
    clearControlsTimeout() {
        if (this.controlsTimeout) {
            clearTimeout(this.controlsTimeout);
            this.controlsTimeout = null;
        }
    }
    
    onPlay() {
        this.isPlaying = true;
        this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        this.startControlsTimeout();
    }
    
    onPause() {
        this.isPlaying = false;
        this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        this.clearControlsTimeout();
        this.showControls();
    }
    
    handleFullscreenChange() {
        this.isFullscreen = !!(document.fullscreenElement || 
                              document.webkitFullscreenElement || 
                              document.mozFullScreenElement);
        
        const icon = this.isFullscreen ? 'compress' : 'expand';
        this.fullscreenBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
        this.showControls();
        this.startControlsTimeout();
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
        let message = 'Video yüklenirken hata oluştu.';
        
        if (error) {
            switch(error.code) {
                case error.MEDIA_ERR_ABORTED:
                    message = 'Video yüklenmesi iptal edildi.';
                    break;
                case error.MEDIA_ERR_NETWORK:
                    message = 'Ağ hatası oluştu. İnternet bağlantınızı kontrol edin.';
                    break;
                case error.MEDIA_ERR_DECODE:
                    message = 'Video codec hatası. Format desteklenmiyor.';
                    break;
                case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    message = 'Video formatı desteklenmiyor.';
                    break;
            }
        }
        
        this.showError(message);
    }
    
    destroy() {
        this.clearControlsTimeout();
        this.videoElement.pause();
        this.videoElement.currentTime = 0;
        
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        
        this.videoElement.src = '';
        this.videoElement.load();
    }
}

// Global fonksiyonlar
function goBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = 'index.html';
    }
}

function retryPlayback() {
    window.location.reload();
}

// Player başlatma - SADELEŞTİRİLMİŞ
document.addEventListener('DOMContentLoaded', () => {
    // Hemen player'ı başlat
    window.netflixPlayer = new NetflixPlayer();
});

// Temizlik
window.addEventListener('beforeunload', () => {
    if (window.netflixPlayer) {
        window.netflixPlayer.destroy();
    }
});
