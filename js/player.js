// player.js - Tam ve eksiksiz TV kumandası desteği ile video player
class NetflixPlayer {
    constructor() {
        // Video elementleri
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
        
        // Ayarlar butonları (eğer varsa)
        this.videoQuality = document.getElementById('videoQuality');
        this.subtitlesBtn = document.getElementById('subtitlesBtn');
        this.subtitlesMenu = document.getElementById('subtitlesMenu');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsMenu = document.getElementById('settingsMenu');
        this.playbackSpeedBtn = document.getElementById('playbackSpeedBtn');
        this.playbackSpeedMenu = document.getElementById('playbackSpeedMenu');
        this.pipBtn = document.getElementById('pipBtn');
        
        // Durum değişkenleri
        this.isPlaying = false;
        this.isFullscreen = false;
        this.isTV = false;
        this.isMobile = this.detectMobile();
        this.isHLS = false;
        this.hls = null;
        this.lastKeyPressTime = 0;
        this.controlsVisible = true;
        this.controlsTimeout = null;
        this.isScrubbing = false;
        this.currentVolume = 1;
        this.qualities = [];
        this.subtitles = [];
        this.playbackSpeeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
        this.currentPlaybackSpeed = 1;
        this.isPiP = false;
        
        // Başlat
        this.init();
    }
    
    // Başlatma
    init() {
        // TV algıla
        this.detectTVMode();
        
        // Video yükle
        this.loadVideo();
        
        // Event listener'ları kur
        this.setupEventListeners();
        
        // Kontrolleri ayarla
        this.setupControls();
        
        // Oynatma hızı menüsü
        this.setupPlaybackSpeedMenu();
        
        // TV için özel ayarlar
        if (this.isTV) {
            this.setupTVMode();
        }
        
        // Mobil için özel ayarlar
        if (this.isMobile) {
            this.setupMobileFeatures();
        }
    }
    
    // TV algılama
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
            console.log("TV MODE: Video player aktif");
        }
    }
    
    // Mobil algılama
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               (window.innerWidth <= 768 && /Mobile|Tablet/i.test(navigator.userAgent));
    }
    
    // Mobil özellikler
    setupMobileFeatures() {
        this.netflixPlayer.classList.add('mobile');
        
        // PiP butonunu kontrol et
        if (this.pipBtn && !document.pictureInPictureEnabled) {
            this.pipBtn.style.display = 'none';
        }
        
        // Mobil dokunmatik kontroller
        this.setupMobileTouchEvents();
    }
    
    // Mobil dokunmatik kontroller
    setupMobileTouchEvents() {
        let lastTap = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        
        // Çift tıklama için
        this.netflixPlayer.addEventListener('touchstart', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 300 && tapLength > 0) {
                e.preventDefault();
                this.togglePlay();
            }
            
            lastTap = currentTime;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = currentTime;
        });
        
        // Kaydırma için
        this.netflixPlayer.addEventListener('touchmove', (e) => {
            if (e.touches.length !== 1) return;
            
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            const diffX = touchX - touchStartX;
            const diffY = touchY - touchStartY;
            
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                e.preventDefault();
                const timeChange = diffX > 0 ? 10 : -10;
                this.videoElement.currentTime += timeChange;
                touchStartX = touchX;
                this.showSkipFeedback(timeChange);
            }
        });
        
        // Tek tıklama (kontrolleri aç/kapa)
        this.netflixPlayer.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const touchDuration = currentTime - touchStartTime;
            const touchX = e.changedTouches[0].clientX;
            const touchY = e.changedTouches[0].clientY;
            const diffX = Math.abs(touchX - touchStartX);
            const diffY = Math.abs(touchY - touchStartY);
            
            if (touchDuration < 300 && diffX < 10 && diffY < 10) {
                this.toggleControls();
            }
        });
    }
    
    // Skip feedback göster
    showSkipFeedback(seconds) {
        const feedback = document.createElement('div');
        feedback.className = 'skip-feedback';
        feedback.innerHTML = `
            <i class="fas fa-${seconds > 0 ? 'forward' : 'backward'}"></i>
            <span>${Math.abs(seconds)}s</span>
        `;
        feedback.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            font-size: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        this.netflixPlayer.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 1000);
    }
    
    // Video yükleme
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
    
        // HLS kontrolü (BASİT)
        const urlLower = videoUrl.toLowerCase();
        this.isHLS = urlLower.includes('.m3u8') || 
                    urlLower.includes('/hls/');
    
        if (this.isHLS) {
            this.setupHLSVideo(videoUrl);
        } else {
            // MP4 ve diğer formatlar için BASİT yöntem
            this.setupSimpleVideo(videoUrl);
        }
    }

    setupSimpleVideo(videoUrl) {
        console.log("Setting up simple video:", videoUrl);
        
        // Video elementini temizle
        this.videoElement.src = '';
        this.videoElement.load();
        
        // Video elementine direkt URL'yi ata
        this.videoElement.src = videoUrl;
        
        // Gerekli attribute'ları ekle
        this.videoElement.setAttribute('preload', 'auto');
        this.videoElement.setAttribute('playsinline', '');
        this.videoElement.setAttribute('webkit-playsinline', '');
        
        // Event listener'ları ekle
        const handleLoaded = () => {
            console.log("Video loaded successfully");
            this.hideLoading();
            
            // Video hazır olduğunda oynatmayı dene
            this.videoElement.play().catch(e => {
                console.log("Auto-play blocked, showing controls");
                this.showControls();
            });
        };
        
        const handleError = (e) => {
            console.error("Video error:", e);
            this.handleSimpleVideoError(videoUrl);
        };
        
        const handleCanPlay = () => {
            console.log("Video can play");
            this.hideLoading();
        };
        
        // Event listener'ları ekle (sadece bir kere)
        this.videoElement.addEventListener('loadeddata', handleLoaded, { once: true });
        this.videoElement.addEventListener('canplay', handleCanPlay, { once: true });
        this.videoElement.addEventListener('error', handleError, { once: true });
        
        // Video'yu yükle
        this.videoElement.load();
    }

    setupHLSVideo(videoUrl) {
        if (typeof Hls === 'undefined') {
            this.showError('HLS desteği yüklenemedi.');
            return;
        }
    
        if (Hls.isSupported()) {
            try {
                if (this.hls) {
                    this.hls.destroy();
                }
                
                this.hls = new Hls({
                    enableWorker: false, // TV'lerde worker sorun çıkarabilir
                    lowLatencyMode: false // Basit mod
                });
                
                this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    this.hideLoading();
                    this.videoElement.play().catch(e => {
                        console.log("HLS auto-play blocked");
                        this.showControls();
                    });
                });
                
                this.hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('HLS Error:', data);
                    if (data.fatal) {
                        this.showError('HLS video yüklenemedi.');
                    }
                });
                
                this.hls.loadSource(videoUrl);
                this.hls.attachMedia(this.videoElement);
            } catch (error) {
                console.error('HLS Error:', error);
                this.showError('HLS oynatıcı başlatılamadı.');
            }
        } else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari için native HLS
            this.videoElement.src = videoUrl;
            this.videoElement.addEventListener('loadeddata', () => {
                this.hideLoading();
                this.videoElement.play().catch(console.log);
            }, { once: true });
            this.videoElement.addEventListener('error', () => {
                this.showError('HLS video yüklenemedi.');
            }, { once: true });
            this.videoElement.load();
        } else {
            this.showError('Tarayıcınız HLS formatını desteklemiyor.');
        }
    }

    cleanVideoUrl(url) {
        // URL'yi decode et
        let cleanUrl = decodeURIComponent(url);
        
        // Boşlukları temizle
        cleanUrl = cleanUrl.replace(/\s/g, '');
        
        // MP4 için özel kontrol
        if (cleanUrl.toLowerCase().includes('.mp4')) {
            // MP4 URL'sinde sorunlu karakterleri temizle
            cleanUrl = cleanUrl.split('?')[0]; // Query parametrelerini ayır
            cleanUrl = cleanUrl.split('#')[0]; // Fragment'ı ayır
        }
        
        return cleanUrl;
    }
    
    // HLS video kurulumu
    setupHLSVideo(videoUrl) {
        if (typeof Hls === 'undefined') {
            this.showError('HLS desteği yüklenemedi.');
            return;
        }
        
        if (Hls.isSupported()) {
            this.setupHlsJS(videoUrl);
        } else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            this.setupNativeHLS(videoUrl);
        } else {
            this.showError('Tarayıcınız HLS formatını desteklemiyor.');
        }
    }
    
    // Hls.js kurulumu
    setupHlsJS(videoUrl) {
        try {
            if (this.hls) {
                this.hls.destroy();
            }
            
            this.hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
                maxBufferSize: 60 * 1000 * 1000,
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 10,
                fragLoadingTimeOut: 20000,
                manifestLoadingTimeOut: 30000,
                levelLoadingTimeOut: 30000
            });
            
            this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                this.hideLoading();
                this.qualities = data.levels || [];
                this.setupQualitySelector();
                
                this.videoElement.play().catch(e => {
                    console.log("Auto-play blocked");
                    this.showControls();
                });
            });
            
            this.hls.on(Hls.Events.LEVEL_LOADED, () => {
                this.hideLoading();
            });
            
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS Error:', data);
                
                if (data.fatal) {
                    switch(data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            this.hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            this.hls.recoverMediaError();
                            break;
                        default:
                            this.handleFatalError(data);
                            break;
                    }
                }
            });
            
            this.hls.loadSource(videoUrl);
            this.hls.attachMedia(this.videoElement);
        } catch (error) {
            console.error('HLS Error:', error);
            this.showError('HLS oynatıcı başlatılamadı.');
        }
    }
    
    // Kalite seçici
    setupQualitySelector() {
        if (!this.videoQuality || !this.qualities || this.qualities.length <= 1) {
            if (this.videoQuality) {
                this.videoQuality.style.display = 'none';
            }
            return;
        }
        
        this.videoQuality.style.display = 'block';
        this.videoQuality.innerHTML = '';
        
        // Auto seçeneği
        const autoButton = document.createElement('button');
        autoButton.textContent = 'Otomatik';
        autoButton.className = this.hls.currentLevel === -1 ? 'active' : '';
        autoButton.addEventListener('click', () => {
            if (this.hls) {
                this.hls.currentLevel = -1;
            }
            this.videoQuality.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            autoButton.classList.add('active');
        });
        this.videoQuality.appendChild(autoButton);
        
        // Kalite seçenekleri
        this.qualities.forEach((level, index) => {
            const button = document.createElement('button');
            const height = level.height || 'N/A';
            const bitrate = level.bitrate ? Math.round(level.bitrate / 1000) + 'kbps' : 'Auto';
            button.textContent = `${height}p`;
            button.title = bitrate;
            button.className = index === this.hls.currentLevel ? 'active' : '';
            button.addEventListener('click', () => {
                if (this.hls) {
                    this.hls.currentLevel = index;
                }
                this.videoQuality.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
            this.videoQuality.appendChild(button);
        });
    }
    
    // Native HLS (Safari)
    setupNativeHLS(videoUrl) {
        this.videoElement.src = videoUrl;
        this.videoElement.addEventListener('loadeddata', () => {
            this.hideLoading();
            this.videoElement.play().catch(console.log);
        }, { once: true });
        this.videoElement.addEventListener('error', () => this.handlePlayerError(), { once: true });
        this.videoElement.load();
    }
    
    // Direkt video
    setupDirectVideo(videoUrl) {
        console.log("Setting up direct video:", videoUrl);
        
        // Video elementini tamamen sıfırla
        this.videoElement.src = '';
        this.videoElement.load();
        
        // Yeni source element oluştur
        const sourceElement = document.createElement('source');
        sourceElement.src = videoUrl;
        
        // Formatı belirle ve type ayarla
        const urlLower = videoUrl.toLowerCase();
        if (urlLower.includes('.mp4')) {
            // MP4 için farklı codec denemeleri
            sourceElement.type = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
            
            // Alternatif codec için ikinci source
            const sourceElement2 = document.createElement('source');
            sourceElement2.src = videoUrl;
            sourceElement2.type = 'video/mp4; codecs="h264, aac"';
            
            this.videoElement.appendChild(sourceElement);
            this.videoElement.appendChild(sourceElement2);
            
        } else if (urlLower.includes('.webm')) {
            sourceElement.type = 'video/webm; codecs="vp8, vorbis"';
            this.videoElement.appendChild(sourceElement);
            
        } else if (urlLower.includes('.ogg') || urlLower.includes('.ogv')) {
            sourceElement.type = 'video/ogg; codecs="theora, vorbis"';
            this.videoElement.appendChild(sourceElement);
            
        } else {
            // Format bilinmiyorsa generic type
            sourceElement.type = 'video/mp4';
            this.videoElement.appendChild(sourceElement);
        }
        
        // Video için gerekli attribute'lar
        this.videoElement.setAttribute('preload', 'auto');
        this.videoElement.setAttribute('playsinline', '');
        this.videoElement.setAttribute('webkit-playsinline', '');
        this.videoElement.setAttribute('x-webkit-airplay', 'allow');
        
        // Event listener'ları ekle
        const errorHandler = (e) => {
            console.error('Direct video error:', e);
            this.handlePlayerError();
        };
        
        const loadedHandler = () => {
            console.log('Direct video loaded successfully');
            this.hideLoading();
            
            // TV'de otomatik oynatmayı dene
            if (this.isTV) {
                setTimeout(() => {
                    this.videoElement.play().catch(e => {
                        console.log('Auto-play on TV failed, showing controls');
                        this.showControls();
                    });
                }, 500);
            }
        };
        
        const canPlayHandler = () => {
            console.log('Direct video can play');
            this.hideLoading();
        };
        
        // Event listener'ları ekle
        this.videoElement.addEventListener('loadeddata', loadedHandler, { once: true });
        this.videoElement.addEventListener('canplay', canPlayHandler, { once: true });
        this.videoElement.addEventListener('error', errorHandler, { once: true });
        
        // Mobil ve TV için özel timeout
        const loadTimeout = setTimeout(() => {
            console.log('Video load timeout, trying to play anyway');
            this.videoElement.play().catch(e => {
                console.log('Timeout play failed:', e);
                this.showControls();
            });
        }, 10000); // 10 saniye timeout
        
        // Yüklendiğinde timeout'u temizle
        this.videoElement.addEventListener('loadeddata', () => {
            clearTimeout(loadTimeout);
        }, { once: true });
        
        // Video'yu yükle
        console.log('Loading direct video...');
        this.videoElement.load();
        
        // 2 saniye sonra yüklenmediyse kontrol et
        setTimeout(() => {
            if (this.videoElement.readyState < 1) {
                console.log('Video still not loading, trying alternative approach');
                this.tryAlternativePlayback(videoUrl);
            }
        }, 2000);
    }
    
    // Oynatma hızı menüsü
    setupPlaybackSpeedMenu() {
        if (!this.playbackSpeedMenu) return;
        
        this.playbackSpeedMenu.innerHTML = '';
        
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
    
    // Oynatma hızı ayarla
    setPlaybackSpeed(speed) {
        this.currentPlaybackSpeed = speed;
        this.videoElement.playbackRate = speed;
        if (this.playbackSpeedBtn) {
            this.playbackSpeedBtn.textContent = speed === 1 ? 'Normal' : speed + 'x';
        }
        this.showOSD(`Hız: ${speed}x`);
    }
    
    // TV modu kurulumu
    setupTVMode() {
        // TV için kontroller
        this.netflixPlayer.classList.add('tv-player');
        
        // TV tuşlarını kaydet
        this.registerTVKeys();
        
        // TV kontrollerini göster
        this.showControls();
        
        // Kontroller timeout'u başlat
        this.startControlsTimeout();
    }
    
    // TV tuşlarını kaydet
    registerTVKeys() {
        if (typeof tizen !== 'undefined' && tizen.tvinputdevice) {
            try {
                const keys = [
                    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                    'Enter', 'Return', 'Back', 'Exit',
                    'MediaPlayPause', 'MediaStop', 'MediaRewind', 'MediaFastForward',
                    'MediaPause', 'MediaPlay', 'ColorF0Red', 'ColorF1Green'
                ];
                
                keys.forEach(key => {
                    try {
                        tizen.tvinputdevice.registerKey(key);
                    } catch (err) {
                        console.log("TV key registration skipped:", key);
                    }
                });
            } catch (err) {
                console.log("Tizen API not available");
            }
        }
    }

    // Alternatif oynatma yöntemi - YENİ EKLENDİ
    tryAlternativePlayback(videoUrl) {
        console.log('Trying alternative playback method');
        
        // Video elementini komple değiştir
        const newVideo = document.createElement('video');
        newVideo.id = 'videoElement';
        newVideo.className = 'netflix-video';
        newVideo.setAttribute('playsinline', '');
        newVideo.setAttribute('webkit-playsinline', '');
        newVideo.setAttribute('preload', 'auto');
        
        // Mevcut videoyu değiştir
        this.videoElement.parentNode.replaceChild(newVideo, this.videoElement);
        this.videoElement = newVideo;
        
        // Source oluştur (daha basit)
        const source = document.createElement('source');
        source.src = videoUrl;
        
        // Format kontrolü
        if (videoUrl.toLowerCase().includes('.mp4')) {
            source.type = 'video/mp4';
        }
        
        newVideo.appendChild(source);
        
        // Yeni event listener'lar
        newVideo.addEventListener('loadeddata', () => {
            console.log('Alternative video loaded');
            this.hideLoading();
            newVideo.play().catch(e => {
                console.log('Alternative play failed:', e);
                this.showControls();
            });
        }, { once: true });
        
        newVideo.addEventListener('error', (e) => {
            console.error('Alternative video error:', e);
            this.showError('Video formatı desteklenmiyor. MP4 formatında bir video deneyin.');
        }, { once: true });
        
        // Video'yu yükle
        newVideo.load();
        
        // Event listener'ları yeniden bağla
        setTimeout(() => {
            this.setupVideoEventListeners();
        }, 100);
    }
    
    // Video event listener'larını yeniden bağla - YENİ EKLENDİ
    setupVideoEventListeners() {
        this.videoElement.addEventListener('play', () => this.onPlay());
        this.videoElement.addEventListener('pause', () => this.onPause());
        this.videoElement.addEventListener('timeupdate', () => this.updateProgress());
        this.videoElement.addEventListener('loadedmetadata', () => this.updateDuration());
        this.videoElement.addEventListener('waiting', () => this.showLoading());
        this.videoElement.addEventListener('playing', () => this.hideLoading());
        this.videoElement.addEventListener('volumechange', () => this.updateVolumeIcon());
        this.videoElement.addEventListener('error', () => this.handlePlayerError());
        
        // Video tıklama ile oynat/duraklat
        this.videoElement.addEventListener('click', () => {
            this.togglePlay();
        });
    }
    
    // Event listener'ları kur
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
        this.videoElement.addEventListener('enterpictureinpicture', () => this.onPiPStart());
        this.videoElement.addEventListener('leavepictureinpicture', () => this.onPiPStop());
        
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
        
        // Ek butonlar
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
        
        if (this.pipBtn) {
            this.pipBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePictureInPicture();
            });
        }
        
        // Klavye kontrolleri
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Mouse/Touch kontrolleri
        this.setupPointerEvents();
        
        // Fullscreen değişiklikleri
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());
        
        // Sayfa görünürlüğü
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isPlaying && !this.isPiP) {
                this.videoElement.pause();
            }
        });
        
        // Pencere boyutu değişikliği
        window.addEventListener('resize', () => this.handleResize());
        
        // Progress bar drag
        this.setupProgressBarDrag();
        
        // Menü kapatma
        document.addEventListener('click', (e) => {
            if (this.volumeControl && !this.volumeControl.contains(e.target) && e.target !== this.volumeBtn) {
                this.volumeControl.style.display = 'none';
            }
            
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
    }
    
    // Mouse/Touch event'leri
    setupPointerEvents() {
        // Mouse hareketinde kontrolleri göster
        this.netflixPlayer.addEventListener('mousemove', () => {
            this.showControls();
            this.startControlsTimeout();
        });
        
        // Video tıklama ile oynat/duraklat
        this.videoElement.addEventListener('click', () => {
            this.togglePlay();
        });
        
        // Mouse player'dan çıkınca
        this.netflixPlayer.addEventListener('mouseleave', () => {
            if (!this.isFullscreen) {
                this.startControlsTimeout();
            }
        });
    }
    
    // Progress bar drag
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
        
        // Touch için
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
            percent = Math.max(0, Math.min(1, percent));
            this.updateProgressPreview(percent);
        });
        
        this.progressBar.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            const touch = e.changedTouches[0];
            const rect = this.progressBar.getBoundingClientRect();
            const percent = (touch.clientX - rect.left) / rect.width;
            this.seekToPercent(percent);
            this.stopScrubbing();
        });
    }
    
    // Scrubbing başlat
    startScrubbing() {
        this.isScrubbing = true;
        this.videoElement.pause();
        this.showControls();
        this.clearControlsTimeout();
    }
    
    // Scrubbing bitir
    stopScrubbing() {
        this.isScrubbing = false;
        if (this.isPlaying) {
            this.videoElement.play();
        }
        this.startControlsTimeout();
    }
    
    // Menü fonksiyonları
    toggleSubtitlesMenu() {
        if (!this.subtitlesMenu) return;
        const isVisible = this.subtitlesMenu.style.display === 'block';
        this.subtitlesMenu.style.display = isVisible ? 'none' : 'block';
        this.hideOtherMenus('subtitles');
    }
    
    toggleSettingsMenu() {
        if (!this.settingsMenu) return;
        const isVisible = this.settingsMenu.style.display === 'block';
        this.settingsMenu.style.display = isVisible ? 'none' : 'block';
        this.hideOtherMenus('settings');
    }
    
    togglePlaybackSpeedMenu() {
        if (!this.playbackSpeedMenu) return;
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
        if (this.volumeControl) {
            this.volumeControl.style.display = 'none';
        }
    }
    
    // Kontrolleri ayarla
    setupControls() {
        this.showControls();
        this.startControlsTimeout();
    }
    
    // Kontrolleri geçici göster
    showControlsTemporarily() {
        if (this.isMobile || this.isScrubbing) return;
        this.showControls();
        this.clearControlsTimeout();
        this.startControlsTimeout();
    }
    
    // Mobil kontroller aç/kapa
    toggleControls() {
        if (this.isMobile) {
            if (this.controlsVisible) {
                this.hideControls();
            } else {
                this.showControls();
                this.startControlsTimeout();
            }
        }
    }
    
    // Tuş işleyici
    handleKeyPress(e) {
        // TV modunda özel işleyici
        if (this.isTV) {
            this.handleTVKeyPress(e);
            return;
        }
        
        // Normal klavye kontrolleri
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        
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
    
    // TV tuş işleyici
    handleTVKeyPress(e) {
        const now = Date.now();
        
        // Debounce (200ms)
        if (now - this.lastKeyPressTime < 200) {
            e.preventDefault();
            return;
        }
        this.lastKeyPressTime = now;
        
        console.log("TV Player Key:", e.key, "Code:", e.keyCode);
        
        // Tüm menüleri kapat
        this.hideOtherMenus();
        
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
                this.showOSD('⏪ -10s');
                break;
                
            case 'ArrowRight':
            case 'Right':
            case 39:
                e.preventDefault();
                this.skip(10);
                this.showOSD('⏩ +10s');
                break;
                
            case 'Enter':
            case 13:
            case 'MediaPlayPause':
                e.preventDefault();
                this.togglePlay();
                this.showOSD(this.videoElement.paused ? '⏸️ Duraklatıldı' : '▶️ Oynatılıyor');
                break;
                
            case ' ':
            case 'Spacebar':
            case 32:
                e.preventDefault();
                this.togglePlay();
                this.showOSD(this.videoElement.paused ? '⏸️ Duraklatıldı' : '▶️ Oynatılıyor');
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
                
            case 'MediaStop':
                e.preventDefault();
                this.videoElement.pause();
                this.videoElement.currentTime = 0;
                this.showOSD('⏹️ Durduruldu');
                break;
                
            case 'MediaFastForward':
                e.preventDefault();
                this.skip(30);
                this.showOSD('⏩ +30s');
                break;
                
            case 'MediaRewind':
                e.preventDefault();
                this.skip(-30);
                this.showOSD('⏪ -30s');
                break;
                
            case 'ColorF0Red':
            case 'ColorF1Green':
            case 'ColorF2Yellow':
            case 'ColorF3Blue':
                e.preventDefault();
                this.showOSD(`${e.key} tuşu`);
                break;
                
            // Tizen özel tuşlar
            case 10009: // RETURN
                e.preventDefault();
                goBack();
                break;
                
            case 10182: // EXIT
                e.preventDefault();
                if (typeof tizen !== 'undefined' && tizen.application) {
                    tizen.application.getCurrentApplication().exit();
                } else {
                    goBack();
                }
                break;
                
            case 10252: // PLAY_PAUSE
                e.preventDefault();
                this.togglePlay();
                this.showOSD(this.videoElement.paused ? '⏸️ Duraklatıldı' : '▶️ Oynatılıyor');
                break;
                
            case 412: // REWIND
                e.preventDefault();
                this.skip(-30);
                this.showOSD('⏪ -30s');
                break;
                
            case 417: // FAST_FORWARD
                e.preventDefault();
                this.skip(30);
                this.showOSD('⏩ +30s');
                break;
        }
    }
    
    // OSD (On Screen Display) göster
    showOSD(text) {
        // Eski OSD'yi temizle
        const oldOSD = document.getElementById('tvOSD');
        if (oldOSD) oldOSD.remove();
        
        // Yeni OSD oluştur
        const osd = document.createElement('div');
        osd.id = 'tvOSD';
        osd.className = 'tv-osd';
        osd.textContent = text;
        
        // Stil ekle
        osd.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 25px 50px;
            border-radius: 15px;
            font-size: 28px;
            font-weight: bold;
            z-index: 9999;
            text-align: center;
            min-width: 250px;
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.7);
            border: 2px solid rgba(255, 255, 255, 0.3);
            animation: tvOsdFade 0.2s ease;
        `;
        
        this.netflixPlayer.appendChild(osd);
        
        // 1.5 saniye sonra kaldır
        setTimeout(() => {
            if (osd.parentNode) {
                osd.parentNode.removeChild(osd);
            }
        }, 1500);
    }
    
    // Ses ayarla
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
        this.showOSD(`🔊 ${volumePercent}%`);
    }
    
    // Oynat/Duraklat
    togglePlay() {
        if (this.videoElement.paused) {
            this.videoElement.play().catch(e => {
                console.error('Play failed:', e);
                if (e.name === 'NotAllowedError') {
                    this.showControls();
                }
            });
        } else {
            this.videoElement.pause();
        }
        this.showControls();
    }
    
    // İleri/Geri sar
    skip(seconds) {
        this.videoElement.currentTime += seconds;
        this.showControls();
    }
    
    // Tam ekran
    toggleFullscreen() {
        if (!this.isFullscreen) {
            this.enterFullscreen();
        } else {
            this.exitFullscreen();
        }
        this.showControls();
    }
    
    enterFullscreen() {
        if (this.isMobile) {
            if (this.videoElement.webkitEnterFullscreen) {
                this.videoElement.webkitEnterFullscreen();
            } else if (this.videoElement.requestFullscreen) {
                this.videoElement.requestFullscreen();
            }
        } else {
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
    
    // Picture-in-Picture
    togglePictureInPicture() {
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture();
        } else if (this.videoElement.requestPictureInPicture) {
            this.videoElement.requestPictureInPicture();
        }
    }
    
    // PiP başladığında
    onPiPStart() {
        this.isPiP = true;
    }
    
    // PiP bittiğinde
    onPiPStop() {
        this.isPiP = false;
    }
    
    // Sessiz aç/kapa
    toggleMute() {
        this.videoElement.muted = !this.videoElement.muted;
        this.updateVolumeIcon();
        this.showControls();
    }
    
    // Ses ayarla
    setVolume() {
        const volume = parseFloat(this.volumeSlider.value);
        this.videoElement.volume = volume;
        this.videoElement.muted = (volume === 0);
        this.updateVolumeIcon();
    }
    
    // Ses ikonunu güncelle
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
    
    // İlerlemeyi güncelle
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
    
    // Süreyi güncelle
    updateDuration() {
        if (this.videoElement.duration && isFinite(this.videoElement.duration)) {
            this.durationEl.textContent = this.formatTime(this.videoElement.duration);
        }
    }
    
    // İlerleme önizlemesi
    updateProgressPreview(percent) {
        this.progressFill.style.width = percent * 100 + '%';
        this.progressHandle.style.left = percent * 100 + '%';
        
        const previewTime = percent * this.videoElement.duration;
        this.currentTimeEl.textContent = this.formatTime(previewTime);
    }
    
    // Belirli yüzdeliğe git
    seekToPercent(percent) {
        this.videoElement.currentTime = percent * this.videoElement.duration;
    }
    
    // Tıklama ile seek
    seek(e) {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.videoElement.currentTime = percent * this.videoElement.duration;
        this.showControls();
    }
    
    // Zaman formatı
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
    
    // Kontrolleri göster
    showControls() {
        this.netflixPlayer.classList.remove('controls-hidden');
        this.controlsVisible = true;
    }
    
    // Kontrolleri gizle
    hideControls() {
        if (!this.isPlaying || !this.controlsVisible || this.isScrubbing) return;
        this.netflixPlayer.classList.add('controls-hidden');
        this.controlsVisible = false;
    }
    
    // Kontroller timeout'u başlat
    startControlsTimeout() {
        this.clearControlsTimeout();
        this.controlsTimeout = setTimeout(() => {
            this.hideControls();
        }, 3000);
    }
    
    // Kontroller timeout'u temizle
    clearControlsTimeout() {
        if (this.controlsTimeout) {
            clearTimeout(this.controlsTimeout);
            this.controlsTimeout = null;
        }
    }
    
    // Video oynatıldığında
    onPlay() {
        this.isPlaying = true;
        this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        this.startControlsTimeout();
    }
    
    // Video duraklatıldığında
    onPause() {
        this.isPlaying = false;
        this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        this.clearControlsTimeout();
        this.showControls();
    }
    
    // Fullscreen değişikliği
    handleFullscreenChange() {
        this.isFullscreen = !!(document.fullscreenElement || 
                              document.webkitFullscreenElement || 
                              document.mozFullScreenElement ||
                              document.msFullscreenElement ||
                              this.videoElement.webkitDisplayingFullscreen);
        
        const icon = this.isFullscreen ? 'compress' : 'expand';
        this.fullscreenBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
        this.showControls();
        
        // Mobil cihazlarda tam ekranda kontroller timeout'u
        if (this.isMobile && this.isFullscreen) {
            setTimeout(() => {
                this.startControlsTimeout();
            }, 2000);
        } else {
            this.startControlsTimeout();
        }
    }
    
    // Pencere boyutu değişikliği
    handleResize() {
        this.updateProgress();
    }
    
    // Yükleme göster
    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }
    
    // Yükleme gizle
    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
    
    // Hata göster
    showError(message) {
        this.errorText.textContent = message;
        this.errorOverlay.style.display = 'flex';
        this.hideLoading();
    }
    
    // Video hatası
    handlePlayerError() {
        const error = this.videoElement.error;
        console.error('Video error details:', error);
        
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
                    message = 'Video codec hatası. Tarayıcınız bu video formatını desteklemiyor.';
                    // MP4 codec hatası için özel mesaj
                    if (this.videoElement.src.toLowerCase().includes('.mp4')) {
                        message += ' MP4 video codec\'i desteklenmiyor olabilir.';
                    }
                    break;
                case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    message = 'Video formatı desteklenmiyor.';
                    // Format önerisi
                    if (this.videoElement.src.toLowerCase().includes('.mp4')) {
                        message += ' Lütfen H.264 codec\'li bir MP4 video kullanın.';
                    }
                    break;
            }
        }
        
        this.showError(message);
        
        // Alternatif oynatma denemesi
        if (this.videoElement.src && !this.videoElement.src.includes('blob:')) {
            setTimeout(() => {
                this.tryAlternativePlayback(this.videoElement.src);
            }, 3000);
        }
    }
    
    // Kritik HLS hatası
    handleFatalError(data) {
        let message = 'Video oynatılırken kritik hata oluştu.';
        this.showError(message);
        
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
    }
    
    // Temizlik
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

// MP4 format desteği kontrolü - YENİ EKLENDİ
checkMP4Support() {
    const video = document.createElement('video');
    const mp4Support = {
        h264: video.canPlayType('video/mp4; codecs="avc1.42E01E"'),
        h264_high: video.canPlayType('video/mp4; codecs="avc1.64001E"'),
        h265: video.canPlayType('video/mp4; codecs="hev1.1.6.L93.90"'),
        aac: video.canPlayType('video/mp4; codecs="mp4a.40.2"')
    };
    
    console.log('MP4 support check:', mp4Support);
    
    // Desteklenmeyen codec varsa uyarı
    if (!mp4Support.h264 && !mp4Support.h264_high) {
        console.warn('H.264 codec not supported');
        return false;
    }
    
    return true;
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

// Player başlatma
document.addEventListener('DOMContentLoaded', () => {
    // HLS kontrolü
    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('url');
    const isHLS = videoUrl && (videoUrl.toLowerCase().includes('.m3u8') || 
                              videoUrl.toLowerCase().includes('/hls/'));
    
    const initPlayer = () => {
        window.netflixPlayer = new NetflixPlayer();
    };
    
    if (isHLS && typeof Hls === 'undefined') {
        // Hls.js yükle
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
        script.onload = initPlayer;
        script.onerror = () => {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);color:white;padding:20px;border-radius:5px;z-index:10000;text-align:center;';
            errorDiv.innerHTML = '<h3>Hata</h3><p>Video player yüklenemedi.</p><button onclick="location.reload()" style="padding:10px 20px;margin-top:10px;">Yenile</button>';
            document.body.appendChild(errorDiv);
        };
        document.head.appendChild(script);
    } else {
        initPlayer();
    }
});

// Sayfadan çıkarken temizlik
window.addEventListener('beforeunload', () => {
    if (window.netflixPlayer) {
        window.netflixPlayer.destroy();
    }
});

// Çevrimdışı/çevrimiçi kontrol
window.addEventListener('online', () => {
    const errorOverlay = document.getElementById('errorOverlay');
    if (errorOverlay && errorOverlay.style.display === 'flex') {
        retryPlayback();
    }
});

// Hata ayıklama
window.debugPlayer = function() {
    console.log('Player Debug Info:');
    console.log('- isPlaying:', window.netflixPlayer.isPlaying);
    console.log('- isTV:', window.netflixPlayer.isTV);
    console.log('- isHLS:', window.netflixPlayer.isHLS);
    console.log('- Video src:', window.netflixPlayer.videoElement.src);
    console.log('- Video currentTime:', window.netflixPlayer.videoElement.currentTime);
    console.log('- Video duration:', window.netflixPlayer.videoElement.duration);
};


