// js/m3u-loader.js
function loadAllContent() {
    // Tüm kategorileri yükle
    const loaders = [
        initM3ULoader('https://raw.githubusercontent.com/ckoglu/iptv/refs/heads/main/list/film.m3u', 'popular-movies', 'film'),
        initM3ULoader('https://raw.githubusercontent.com/ckoglu/iptv/refs/heads/main/list/dizi.m3u', 'popular-series', 'dizi'),
        initM3ULoader('https://raw.githubusercontent.com/ckoglu/iptv/refs/heads/main/list/belgesel.m3u', 'documentary-channels', 'belgesel'),
        initM3ULoader('https://raw.githubusercontent.com/ckoglu/iptv/refs/heads/main/list/canli.m3u', 'live-channels', 'canli')
    ];
    Promise.all(loaders).then(() => {setupScrollButtons?.();});
}

class M3ULoader {
    constructor(m3uUrl, containerId, contentType) {
        this.m3uUrl = m3uUrl;
        this.container = document.getElementById(containerId);
        this.loadingElement = document.getElementById('loading');
        this.contentType = contentType;
        this.items = [];
        this.currentIndex = 0;
        this.batchSize = 30;
        this.isLoading = false;
        this.hasMoreItems = true;
        this.observer = null;
        this.scrollTimeout = null;
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
            // İlk içerik grubu
            this.renderBatch();
            // Sonsuz kaydırma
            if (!this.container.classList.contains('content-row')) {
                this.setupInfiniteScroll();
            }

        } catch (error) {
            console.error('M3U yükleme hatası:', error);
            this.showError('İçerik yüklenirken hata oluştu. Lütfen internet bağlantınızı kontrol edin.');
        }
    }

    async loadM3UFile() {
        const response = await fetch(this.m3uUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const text = await response.text();
        this.parseM3U(text);
    }

    parseM3U(m3uText) {
        const lines = m3uText.split('\n');
        this.items = [];

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('#EXTINF:')) {
                const info = lines[i];
                const url = lines[i + 1];
                if (url && !url.startsWith('#')) {
                    const item = this.parseEXTINF(info, url);
                    if (item && item.title && item.url) this.items.push(item);
                }
            }
        }

        // dizi için benzersiz liste oluştur
        if (this.contentType === 'dizi') {
            const unique = {};
            this.items.forEach(it => {
                const baseName = it.title.split(':')[0].trim();
                if (!unique[baseName]) {
                    unique[baseName] = {
                        ...it,
                        title: baseName,
                        url: `bolum.html?dizi=${encodeURIComponent(baseName)}`
                    };
                }
            });
            this.items = Object.values(unique);
        }
    }

    parseEXTINF(extinfLine, url) {
        try {
            const attrs = {};
            const attrRegex = /(\w+(?:-\w+)*)\s*=\s*"([^"]*)"/g;
            let match;
            while ((match = attrRegex.exec(extinfLine)) !== null) {
                attrs[match[1]] = match[2];
            }

            let title = this.cleanTitle(extinfLine.split(',').pop()?.trim() || 'Bilinmeyen Başlık');
            
            // Sadece dizi icin ek: sezon/bölüm bilgisi yakala
            let extraInfo = '';
            if (this.contentType === 'dizi') {
                const seMatch = title.match(/s(\d{1,2})e(\d{1,2})/i);
                if (seMatch) {
                    extraInfo = `Sezon ${parseInt(seMatch[1])}, Bölüm ${parseInt(seMatch[2])}`;
                    title = title.replace(/s\d{1,2}e\d{1,2}/i, '').trim();
                }
            }

            return {
                title,
                url: url.trim(),
                group: attrs['group-title'] || this.contentType,
                tvg: {
                    id: attrs['tvg-id'] || '',
                    name: attrs['tvg-name'] || '',
                    logo: attrs['tvg-logo'] || ''
                },
                attributes: attrs,
                extraInfo // sadece dizilerde dolu
            };
        } catch (err) {
            console.warn('EXTINF parse hatası:', err);
            return null;
        }
    }

    cleanTitle(t) {
        return t
            .replace(/\[.*?\]|\(.*?\)|\|.*/g, '')
            .replace(/\.(mp4|mkv|avi|mov|m3u8?)$/i, '')
            .trim()
            .substring(0, 60);
    }

    renderBatch() {
        if (this.currentIndex >= this.items.length) {
            this.hasMoreItems = false;
            this.hideLoading();
            return;
        }

        const endIndex = Math.min(this.currentIndex + this.batchSize, this.items.length);
        const frag = document.createDocumentFragment();
        for (let i = this.currentIndex; i < endIndex; i++) {
            frag.appendChild(this.createContentElement(this.items[i]));
        }
        this.container.appendChild(frag);
        this.currentIndex = endIndex;

        // Sayı güncelle
        this.updateLoadingText();
        if (this.currentIndex >= this.items.length) {
            this.hasMoreItems = false;
            this.hideLoading();
        }
    }

    setupInfiniteScroll() {
        // Intersection Observer ile modern lazy loading
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.hasMoreItems && !this.isLoading) {
                    this.loadNextBatch();
                }
            });
        }, { rootMargin: '150px', threshold: 0.1 });

        if (this.loadingElement) {
            this.observer.observe(this.loadingElement);
        }

        // Scroll fallback (observer desteklenmezse)
        window.addEventListener('scroll', () => {
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => this.handleScroll(), 200);
        });
    }

    handleScroll() {
        if (this.isLoading || !this.hasMoreItems) return;
        const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 600;
        if (nearBottom) {this.loadNextBatch();}
    }

    loadNextBatch() {
        if (this.isLoading || !this.hasMoreItems) return;
        this.isLoading = true;
        this.showLoading();
        setTimeout(() => {
            this.renderBatch();
            this.isLoading = false;
            if (!this.hasMoreItems && this.observer) {
                this.observer.disconnect();
            }
        }, 250);
    }

    createContentElement(item) {
        const div = document.createElement('div');
        div.className = 'content-item';
        div.dataset.url = item.url;
        div.dataset.title = item.title;
        div.dataset.type = this.contentType;

        const logo = item.tvg.logo || this.getManualLogo(item.title) || '';
        const bg = logo ? `url('${logo}')` : this.getRandomGradient();
        const cls = this.contentType === 'canli' ? 'content-poster tv-logo' : 'content-poster';
        const icon = this.getIconForContent();

        div.innerHTML = `
            <div class="${cls}" style="background-image:${bg}">
                <i class="${icon}"></i>
            </div>
            <div class="item-info">
                <div class="item-title">${this.escapeHtml(item.title)}</div>
                <div class="item-meta">${this.escapeHtml(this.getCategoryName(item.group))}</div>
            </div>
        `;

        // 🔹 DİZİ ise bölümler sayfasına git
        div.addEventListener('click', () => {
            if (this.contentType === 'dizi') {
                window.location.href = item.url; // bolum.html?dizi=Snowpiercer
            } else {
                this.playContent(item);
            }
        });

        div.addEventListener('keydown', e => e.key === 'Enter' && (
            this.contentType === 'dizi'
                ? window.location.href = item.url
                : this.playContent(item)
        ));

        return div;
    }

    getManualLogo(title) {
        const t = title.toLowerCase();
        if (t.includes('trt')) return 'https://upload.wikimedia.org/wikipedia/commons/6/6e/TRT_1_logo.svg';
        if (t.includes('show')) return 'https://upload.wikimedia.org/wikipedia/tr/5/52/Show_TV_logo.png';
        if (t.includes('atv')) return 'https://upload.wikimedia.org/wikipedia/tr/3/3b/Atv_logo.png';
        return null;
    }

    getRandomGradient() {
        const g = {
            film: ['#ff6b6b,#ee5a24', '#ff7979,#eb4d4b', '#feca57,#ff9f43'],
            dizi: ['#4834d4,#686de0', '#5f27cd,#341f97', '#54a0ff,#2e86de'],
            belgesel: ['#1dd1a1,#10ac84', '#00d2d3,#01a3a4', '#7ed6df,#22a6b3'],
            canli: ['#f368e0,#ff9ff3', '#a29bfe,#6c5ce7']
        }[this.contentType] || ['#ccc,#999'];

        const pick = g[Math.floor(Math.random() * g.length)];
        return `linear-gradient(45deg,${pick})`;
    }

    getIconForContent() {
        const icons = {film: 'fas fa-film', dizi: 'fas fa-tv', belgesel: 'fas fa-globe-americas', canli: 'fas fa-broadcast-tower'};
        return icons[this.contentType] || 'fas fa-play';
    }

    getCategoryName(g, itemTitle = '') {
        const t = g?.toLowerCase() || '';
        const title = itemTitle?.toLowerCase() || '';
        
        // .ders içeren içerikler için Eğitim
        if (title.includes('.ders') || title.includes('ders ')) {
            return 'Eğitim';
        }
        
        if (t.includes('film')) return 'Film';
        if (t.includes('dizi')) return 'Dizi';
        if (t.includes('belgesel')) return 'Belgesel';
        if (t.includes('canlı') || t.includes('live')) return 'Canlı TV';
        if (t.includes('haber')) return 'Haber';
        if (t.includes('spor')) return 'Spor';
        if (t.includes('müzik')) return 'Müzik';
        if (t.includes('çocuk')) return 'Çocuk';
        return this.contentType;
    }
    
    const category = this.getCategoryName(item.group, item.title);
    
    escapeHtml(t) {
        const div = document.createElement('div');
        div.textContent = t;
        return div.innerHTML;
    }

    playContent(item) {
        if (!item.url) {
            alert('Bu içeriğin oynatma bağlantısı bulunamadı.');
            return;
        }

        const url = this.convertTestUrl(item.url);
        const poster = item.tvg.logo || this.getManualLogo(item.title) || '';
        const title = item.title || 'Bilinmeyen Başlık';

        const video = {
            title, url, poster,
            date: new Date().toISOString(),
            meta: this.contentType
        };
        let watched = JSON.parse(localStorage.getItem('recentlyWatched') || '[]');
        watched = [video, ...watched.filter(v => v.url !== url)].slice(0, 20);
        localStorage.setItem('recentlyWatched', JSON.stringify(watched));
        window.location.href = `player.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&poster=${encodeURIComponent(poster)}`;
    }

    convertTestUrl(url) {
        const testList = ['https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8'];
        if (testList.includes(url)) {return 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';}
        return url;
    }

    showLoading() {
        if (!this.loadingElement) return;
        this.loadingElement.style.display = 'flex';
        this.updateLoadingText();
    }

    updateLoadingText() {
        if (!this.loadingElement) return;
        this.loadingElement.innerHTML = `<div class="spinner"></div><div>${this.contentType} yükleniyor... (${this.currentIndex}/${this.items.length})</div>`;
    }

    hideLoading() {
        if (this.loadingElement) this.loadingElement.style.display = 'none';
    }

    showError(msg) {
        if (!this.loadingElement) return;
        this.loadingElement.innerHTML = `
            <div style="color:#e50914;text-align:center;padding:20px;">
                <i class="fas fa-exclamation-triangle" style="font-size:2rem;margin-bottom:10px;"></i>
                <p>${msg}</p>
                <button onclick="location.reload()" style="background:#e50914;color:white;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;margin-top:10px;">Tekrar Dene</button>
            </div>
        `;
    }
}

function initM3ULoader(m3uUrl, containerId, contentType) {
    return new M3ULoader(m3uUrl, containerId, contentType);
}

