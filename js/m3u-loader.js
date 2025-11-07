// js/m3u-loader.js - Tamamen Yenilenmiş
class M3ULoader {
    constructor(m3uUrl, containerId, contentType) {
        this.m3uUrl = m3uUrl;
        this.container = document.getElementById(containerId);
        this.loadingElement = document.getElementById('loading');
        this.contentType = contentType;
        this.items = [];
        this.currentIndex = 0;
        this.batchSize = 20;
        this.isLoading = false;
        this.hasMoreItems = true;
        this.observer = null;
        
        console.log(`M3ULoader initialized for ${contentType} with URL: ${m3uUrl}`);
        this.init();
    }

    async init() {
        try {
            this.showLoading();
            await this.loadM3UFile();
            
            if (this.items.length === 0) {
                this.showError('Bu kategoride henüz içerik bulunamadı.');
                return;
            }
            
            console.log(`✅ ${this.contentType}: ${this.items.length} içerik yüklendi`);
            
            // İlk batch'i render et
            this.renderBatch();
            
            // Infinite scroll'u sadece kategori sayfalarında aktif et
            if (!this.container.classList.contains('content-row')) {
                this.setupInfiniteScroll();
            }
            
        } catch (error) {
            console.error('❌ M3U yükleme hatası:', error);
            this.showError('İçerik yüklenirken hata oluştu. Lütfen internet bağlantınızı kontrol edin.');
        }
    }

    async loadM3UFile() {
        console.log(`📥 Loading M3U: ${this.m3uUrl}`);
        const response = await fetch(this.m3uUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        this.parseM3U(text);
    }

    parseM3U(m3uText) {
        const lines = m3uText.split('\n');
        this.items = [];
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('#EXTINF:')) {
                const infoLine = lines[i];
                const urlLine = lines[i + 1];
                
                if (urlLine && !urlLine.startsWith('#')) {
                    const item = this.parseEXTINF(infoLine, urlLine);
                    if (item && item.title && item.url) {
                        this.items.push(item);
                    }
                }
            }
        }
        
        console.log(`📊 ${this.contentType}: ${this.items.length} item parsed`);
    }

    parseEXTINF(extinfLine, url) {
        try {
            let duration = -1;
            let attributes = '';
            let title = extinfLine.substring(extinfLine.lastIndexOf(',') + 1).trim();
            
            // EXTINF formatını parse et
            const extinfMatch = extinfLine.match(/#EXTINF:(-?\d+)(?:\s+(.*))?,(.*)/);
            if (extinfMatch) {
                duration = parseInt(extinfMatch[1]);
                attributes = extinfMatch[2] || '';
                title = extinfMatch[3] || title;
            }
            
            // Tüm attribute'ları parse et
            const attrs = {};
            const attrRegex = /(\w+(-\w+)*)\s*=\s*"([^"]*)"/g;
            let match;
            
            while ((match = attrRegex.exec(extinfLine)) !== null) {
                attrs[match[1]] = match[3];
            }
            
            // Fallback parsing
            if (!attrs['tvg-logo']) {
                const logoMatch = extinfLine.match(/tvg-logo="([^"]+)"/);
                if (logoMatch) attrs['tvg-logo'] = logoMatch[1];
            }
            
            if (!attrs['group-title']) {
                const groupMatch = extinfLine.match(/group-title="([^"]+)"/);
                if (groupMatch) attrs['group-title'] = groupMatch[1];
            }

            return {
                duration,
                attributes: attrs,
                title: this.cleanTitle(title),
                url: url.trim(),
                group: attrs['group-title'] || this.contentType,
                tvg: {
                    id: attrs['tvg-id'] || '',
                    name: attrs['tvg-name'] || '',
                    logo: attrs['tvg-logo'] || ''
                }
            };
        } catch (error) {
            console.error('EXTINF parse hatası:', error);
            return null;
        }
    }

    cleanTitle(title) {
        return title
            .replace(/\[.*?\]/g, '')
            .replace(/\(.*?\)/g, '')
            .replace(/\|.*/g, '')
            .replace(/\.(mp4|mkv|avi|mov|m3u8?)$/i, '')
            .trim()
            .substring(0, 60);
    }

    renderBatch() {
        if (this.currentIndex >= this.items.length) {
            this.hasMoreItems = false;
            this.hideLoading();
            console.log(`✅ ${this.contentType}: Tüm içerikler yüklendi`);
            return;
        }

        const endIndex = Math.min(this.currentIndex + this.batchSize, this.items.length);
        console.log(`🔄 ${this.contentType}: Rendering ${this.currentIndex}-${endIndex}`);
        
        const fragment = document.createDocumentFragment();
        
        for (let i = this.currentIndex; i < endIndex; i++) {
            const item = this.items[i];
            const element = this.createContentElement(item);
            fragment.appendChild(element);
        }
        
        this.container.appendChild(fragment);
        this.currentIndex = endIndex;
        
        // Tüm içerikler yüklendiyse loading'i gizle
        if (this.currentIndex >= this.items.length) {
            this.hasMoreItems = false;
            this.hideLoading();
        }
    }

    createContentElement(item) {
        const div = document.createElement('div');
        div.className = 'content-item';
        div.setAttribute('data-url', item.url);
        div.setAttribute('data-title', item.title);
        div.setAttribute('data-type', this.contentType);
        div.setAttribute('tabindex', '0');
        
        // TVG-LOGO kontrolü - CANLI TV için özel fallback
        let backgroundStyle;
        
        if (item.tvg && item.tvg.logo && item.tvg.logo.trim() !== '') {
            backgroundStyle = `url('${item.tvg.logo}')`;
        } else {
            // Canlı TV için manuel logo mapping
            const manualLogo = this.getManualLogo(item.title);
            if (manualLogo) {
                backgroundStyle = `url('${manualLogo}')`;
            } else {
                backgroundStyle = this.getRandomGradient();
            }
        }
        
        // Canlı TV için tv-logo class'ını ekle, diğerleri için sadece content-poster
        const posterClass = this.contentType === 'canli' ? 'content-poster tv-logo' : 'content-poster';
        
        const icon = this.getIconForContent();
        
        div.innerHTML = `
            <div class="${posterClass}" style="background-image: ${backgroundStyle}">
                <i class="${icon}"></i>
                ${!item.tvg.logo && !this.getManualLogo(item.title) ? `<div class="content-type-badge">${this.getCategoryName(item.group)}</div>` : ''}
            </div>
            <div class="item-info">
                <div class="item-title">${this.escapeHtml(item.title)}</div>
                <div class="item-meta">${this.escapeHtml(this.getCategoryName(item.group))}</div>
            </div>
        `;
        
        div.addEventListener('click', () => this.playContent(item));
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.playContent(item);
            }
        });
        
        return div;
    }

    setupInfiniteScroll() {
        console.log(`🔄 ${this.contentType}: Infinite scroll aktif`);
        
        // Intersection Observer ile modern lazy loading
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.hasMoreItems && !this.isLoading) {
                    console.log(`⬇️ ${this.contentType}: Loading next batch...`);
                    this.loadNextBatch();
                }
            });
        }, {
            rootMargin: '100px',
            threshold: 0.1
        });

        // Loading elementini gözlemle
        if (this.loadingElement) {
            this.observer.observe(this.loadingElement);
        }
        
        // Scroll event backup
        window.addEventListener('scroll', () => this.handleScroll());
    }

    handleScroll() {
        if (this.isLoading || !this.hasMoreItems) return;
        
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Sayfanın sonuna 500px kala tetikle
        if (scrollTop + windowHeight >= documentHeight - 500) {
            this.loadNextBatch();
        }
    }

    loadNextBatch() {
        if (this.isLoading || !this.hasMoreItems) return;
        
        this.isLoading = true;
        this.showLoading();
        
        console.log(`⏳ ${this.contentType}: Loading batch ${this.currentIndex}-${this.currentIndex + this.batchSize}`);
        
        setTimeout(() => {
            this.renderBatch();
            this.isLoading = false;
            
            if (!this.hasMoreItems) {
                this.hideLoading();
                if (this.observer) {
                    this.observer.disconnect();
                }
            }
        }, 300);
    }

    getRandomGradient() {
        const gradients = {
            'film': [
                'linear-gradient(45deg, #ff6b6b, #ee5a24)',
                'linear-gradient(45deg, #ff7979, #eb4d4b)',
                'linear-gradient(45deg, #feca57, #ff9f43)'
            ],
            'dizi': [
                'linear-gradient(45deg, #4834d4, #686de0)',
                'linear-gradient(45deg, #5f27cd, #341f97)',
                'linear-gradient(45deg, #54a0ff, #2e86de)'
            ],
            'belgesel': [
                'linear-gradient(45deg, #1dd1a1, #10ac84)',
                'linear-gradient(45deg, #00d2d3, #01a3a4)',
                'linear-gradient(45deg, #7ed6df, #22a6b3)'
            ],
            'canli': [
                'linear-gradient(45deg, #f368e0, #ff9ff3)',
                'linear-gradient(45deg, #ff9ff3, #f368e0)',
                'linear-gradient(45deg, #a29bfe, #6c5ce7)'
            ]
        };
        
        const typeGradients = gradients[this.contentType] || gradients['film'];
        return typeGradients[Math.floor(Math.random() * typeGradients.length)];
    }

    getIconForContent() {
        const icons = {
            'film': 'fas fa-film',
            'dizi': 'fas fa-tv',
            'belgesel': 'fas fa-globe-americas',
            'canli': 'fas fa-broadcast-tower'
        };
        return icons[this.contentType] || 'fas fa-play';
    }

    getCategoryName(group) {
        const groupLower = group.toLowerCase();
        if (groupLower.includes('film')) return 'Film';
        if (groupLower.includes('dizi')) return 'Dizi';
        if (groupLower.includes('belgesel')) return 'Belgesel';
        if (groupLower.includes('canlı') || groupLower.includes('live')) return 'Canlı TV';
        if (groupLower.includes('haber')) return 'Haber';
        if (groupLower.includes('spor')) return 'Spor';
        if (groupLower.includes('müzik')) return 'Müzik';
        if (groupLower.includes('çocuk')) return 'Çocuk';
        return this.contentType;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    playContent(item) {
        if (!item.url || item.url.trim() === '') {
            alert('Bu içeriğin oynatma bağlantısı bulunamadı.');
            return;
        }
        
        try {
            const realUrl = this.convertTestUrl(item.url);
            console.log(`🎬 Playing: ${item.title}`);
            window.location.href = `player.html?url=${encodeURIComponent(realUrl)}&title=${encodeURIComponent(item.title)}`;
        } catch (error) {
            console.error('URL Error:', error);
            alert('Geçersiz video bağlantısı: ' + item.url);
        }
    }

    convertTestUrl(url) {
        const testUrls = [
            'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
            'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
            'https://moctobpltc-i.akamaihd.net/hls/live/571329/eight/playlist.m3u8',
            'https://mn-nl.mncdn.com/blutv_fta/live/hls/123_FTA_1080p/123_FTA_1080p.m3u8',
            'http://vs1.tv3.ee/hls/tv3eestihd720.m3u8',
            'https://live.webhostingtutorials.net/stream.m3u8',
            'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_3.m3u8',
            'https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8'
        ];
        
        if (testUrls.includes(url)) {
            const workingUrls = [
                'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
                'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
                'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8'
            ];
            return workingUrls[Math.floor(Math.random() * workingUrls.length)];
        }
        
        return url;
    }

    showLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'flex';
            this.loadingElement.innerHTML = `
                <div class="spinner"></div>
                <div>${this.contentType} yükleniyor... (${this.currentIndex}/${this.items.length})</div>
            `;
        }
    }

    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
    }

    showError(message) {
        if (this.loadingElement) {
            this.loadingElement.innerHTML = `
                <div style="color: #e50914; text-align: center; padding: 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>${message}</p>
                    <button onclick="location.reload()" style="
                        background: #e50914;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-top: 10px;
                    ">Tekrar Dene</button>
                </div>
            `;
        }
    }
}

// Global fonksiyon
function initM3ULoader(m3uUrl, containerId, contentType) {
    return new M3ULoader(m3uUrl, containerId, contentType);
}