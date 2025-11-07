// js/search.js - Güncel Versiyon
class SearchManager {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.resultsContainer = document.getElementById('searchResults');
        this.resultsMainContainer = document.getElementById('searchResultsContainer');
        this.loadingElement = document.getElementById('loading');
        this.welcomeStats = document.getElementById('welcomeStats');
        this.allItems = [];
        
        // İstatistik elementleri
        this.filmCountEl = document.getElementById('filmCount');
        this.diziCountEl = document.getElementById('diziCount');
        this.belgeselCountEl = document.getElementById('belgeselCount');
        this.canliCountEl = document.getElementById('canliCount');
        this.totalCountEl = document.getElementById('totalCount');
        
        this.init();
    }

    async init() {
        await this.loadAllM3UFiles();
        this.setupEventListeners();
        this.showWelcomeStats();
    }

    async loadAllM3UFiles() {
        const urls = [
            {
                url: 'https://raw.githubusercontent.com/ckoglu/iptv/refs/heads/main/list/film.m3u',
                type: 'Film'
            },
            {
                url: 'https://raw.githubusercontent.com/ckoglu/iptv/refs/heads/main/list/dizi.m3u',
                type: 'Dizi'
            },
            {
                url: 'https://raw.githubusercontent.com/ckoglu/iptv/refs/heads/main/list/belgesel.m3u',
                type: 'Belgesel'
            },
            {
                url: 'https://raw.githubusercontent.com/ckoglu/iptv/refs/heads/main/list/canli.m3u',
                type: 'Canlı TV'
            }
        ];

        try {
            this.showLoading();
            this.allItems = [];
            
            for (const source of urls) {
                try {
                    console.log(`Loading ${source.type} from: ${source.url}`);
                    const items = await this.fetchM3UFile(source.url, source.type);
                    this.allItems = this.allItems.concat(items);
                    console.log(`Loaded ${items.length} ${source.type} items`);
                } catch (error) {
                    console.error(`${source.type} yüklenirken hata:`, error);
                }
            }
            
            this.hideLoading();
            
            if (this.allItems.length === 0) {
                this.showError('Hiç içerik bulunamadı. Lütfen internet bağlantınızı kontrol edin.');
            } else {
                console.log(`Toplam ${this.allItems.length} içerik yüklendi`);
                this.updateStats();
                this.showWelcomeStats();
            }
            
        } catch (error) {
            console.error('M3U dosyaları yüklenirken hata:', error);
            this.showError('İçerikler yüklenirken hata oluştu. Lütfen internet bağlantınızı kontrol edin.');
        }
    }

    async fetchM3UFile(url, type) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        return this.parseM3U(text, type);
    }

    parseM3U(m3uText, type) {
        const lines = m3uText.split('\n');
        const items = [];
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('#EXTINF:')) {
                const infoLine = lines[i];
                const urlLine = lines[i + 1];
                
                if (urlLine && !urlLine.startsWith('#')) {
                    const item = this.parseEXTINF(infoLine, urlLine, type);
                    if (item && item.title) {
                        items.push(item);
                    }
                }
            }
        }
        
        return items;
    }

    parseEXTINF(extinfLine, url, type) {
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
            
            // Gelişmiş attribute parsing
            const attrRegex = /(\w+(-\w+)*)\s*=\s*"([^"]*)"/g;
            let match;
            
            while ((match = attrRegex.exec(extinfLine)) !== null) {
                attrs[match[1]] = match[3];
            }
            
            // Fallback: Basit regex
            if (!attrs['tvg-logo']) {
                const logoMatch = extinfLine.match(/tvg-logo="([^"]+)"/);
                if (logoMatch) {
                    attrs['tvg-logo'] = logoMatch[1];
                }
            }
            
            if (!attrs['group-title']) {
                const groupMatch = extinfLine.match(/group-title="([^"]+)"/);
                if (groupMatch) {
                    attrs['group-title'] = groupMatch[1];
                }
            }

            return {
                duration,
                attributes: attrs,
                title: this.cleanTitle(title),
                url: url.trim(),
                type: type,
                group: attrs['group-title'] || type,
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
            .replace(/\.(mp4|mkv|avi|mov)$/i, '')
            .trim()
            .substring(0, 60);
    }

    setupEventListeners() {
        // Arama butonu
        this.searchBtn.addEventListener('click', () => this.performSearch());
        
        // Enter tuşu ile arama
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });
        
        // Real-time search (500ms debounce)
        this.searchInput.addEventListener('input', this.debounce(() => {
            const query = this.searchInput.value.trim();
            if (query.length >= 2) {
                this.performSearch();
            } else if (query.length === 0) {
                this.showWelcomeStats();
            }
        }, 500));
        
        // Input focus efekti
        this.searchInput.addEventListener('focus', () => {
            this.searchInput.parentElement.style.borderColor = '#e50914';
            this.searchInput.parentElement.style.transform = 'scale(1.02)';
        });
        
        this.searchInput.addEventListener('blur', () => {
            this.searchInput.parentElement.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            this.searchInput.parentElement.style.transform = 'scale(1)';
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    performSearch() {
        const query = this.searchInput.value.trim().toLowerCase();
        
        if (query.length < 2) {
            this.showWelcomeStats();
            return;
        }
        
        this.showLoading();
        
        // Arama işlemi
        setTimeout(() => {
            const results = this.allItems.filter(item => {
                const titleMatch = item.title.toLowerCase().includes(query);
                const groupMatch = item.group && item.group.toLowerCase().includes(query);
                const tvgNameMatch = item.tvg.name && item.tvg.name.toLowerCase().includes(query);
                const typeMatch = item.type.toLowerCase().includes(query);
                
                return titleMatch || groupMatch || tvgNameMatch || typeMatch;
            });
            
            this.displayResults(results, query);
            this.hideLoading();
        }, 300);
    }

    displayResults(results, query) {
        this.resultsContainer.innerHTML = '';
        
        if (results.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>"${this.escapeHtml(query)}" için sonuç bulunamadı</h3>
                    <p>Farklı anahtar kelimelerle deneyin veya daha genel bir arama yapın.</p>
                    <div class="search-tips">
                        <h4>Arama İpuçları:</h4>
                        <ul>
                            <li>Film veya dizi adını yazın</li>
                            <li>Tür adı ile arayın (aksiyon, komedi, dram)</li>
                            <li>Kanal adı ile arayın</li>
                            <li>Daha kısa anahtar kelimeler deneyin</li>
                        </ul>
                    </div>
                </div>
            `;
            return;
        }
        
        // Sonuç sayısını göster
        const resultsHeader = document.createElement('div');
        resultsHeader.className = 'results-header';
        resultsHeader.innerHTML = `
            <h3>"${this.escapeHtml(query)}" için ${results.length} sonuç bulundu</h3>
            <div class="results-filter" id="resultsFilter">
                <button class="filter-btn active" data-filter="all">Tümü (${results.length})</button>
                <button class="filter-btn" data-filter="Film">Film (${this.getCountByType(results, 'Film')})</button>
                <button class="filter-btn" data-filter="Dizi">Dizi (${this.getCountByType(results, 'Dizi')})</button>
                <button class="filter-btn" data-filter="Belgesel">Belgesel (${this.getCountByType(results, 'Belgesel')})</button>
                <button class="filter-btn" data-filter="Canlı TV">TV (${this.getCountByType(results, 'Canlı TV')})</button>
            </div>
        `;
        this.resultsContainer.appendChild(resultsHeader);
        
        // Sonuçları türe göre grupla
        const groupedResults = this.groupResultsByType(results);
        
        Object.keys(groupedResults).forEach(type => {
            const typeResults = groupedResults[type];
            
            const typeSection = document.createElement('div');
            typeSection.className = 'results-section';
            typeSection.setAttribute('data-type', type);
            typeSection.innerHTML = `
                <h3 class="results-type-title">${type} <span class="results-count">(${typeResults.length})</span></h3>
                <div class="results-grid" id="results-${type.replace(/\s+/g, '-')}"></div>
            `;
            
            this.resultsContainer.appendChild(typeSection);
            
            const gridContainer = document.getElementById(`results-${type.replace(/\s+/g, '-')}`);
            typeResults.forEach(item => {
                const element = this.createResultElement(item);
                gridContainer.appendChild(element);
            });
        });
        
        // Filtre butonlarını aktif et
        this.setupFilterButtons();
    }

    groupResultsByType(results) {
        const grouped = {};
        
        results.forEach(item => {
            if (!grouped[item.type]) {
                grouped[item.type] = [];
            }
            grouped[item.type].push(item);
        });
        
        // Türleri belirli bir sıraya göre sırala
        const orderedGroups = {};
        ['Film', 'Dizi', 'Belgesel', 'Canlı TV'].forEach(type => {
            if (grouped[type]) {
                orderedGroups[type] = grouped[type];
            }
        });
        
        return orderedGroups;
    }

    getCountByType(results, type) {
        return results.filter(item => item.type === type).length;
    }

    setupFilterButtons() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const resultsSections = document.querySelectorAll('.results-section');
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Aktif butonu güncelle
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const filter = btn.getAttribute('data-filter');
                
                // Sonuçları filtrele
                resultsSections.forEach(section => {
                    if (filter === 'all' || section.getAttribute('data-type') === filter) {
                        section.style.display = 'block';
                    } else {
                        section.style.display = 'none';
                    }
                });
            });
        });
    }

    createResultElement(item) {
        const div = document.createElement('div');
        div.className = 'content-item';
        div.setAttribute('data-url', item.url);
        div.setAttribute('data-title', item.title);
        div.setAttribute('data-type', item.type);
        div.setAttribute('tabindex', '0');
        
        const colors = {
            'Film': 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
            'Dizi': 'linear-gradient(45deg, #4834d4, #686de0)',
            'Belgesel': 'linear-gradient(45deg, #1dd1a1, #10ac84)',
            'Canlı TV': 'linear-gradient(45deg, #00d2d3, #54a0ff)'
        };
        
        const color = colors[item.type] || 'linear-gradient(45deg, #f368e0, #ff9ff3)';
        const icon = this.getIconForType(item.type);
        
        // TVG-LOGO varsa kullan, yoksa gradient
        const backgroundStyle = item.tvg && item.tvg.logo ? 
            `url('${item.tvg.logo}')` : color;
        
        div.innerHTML = `
            <div class="content-poster" style="background-image: ${backgroundStyle}">
                <i class="${icon}"></i>
                ${item.tvg && item.tvg.logo ? '' : `<div class="content-type-badge">${item.type}</div>`}
            </div>
            <div class="item-info">
                <div class="item-title">${this.escapeHtml(item.title)}</div>
                <div class="item-meta">
                    <span class="item-type">${this.escapeHtml(item.type)}</span>
                    ${item.group ? `• <span class="item-group">${this.escapeHtml(item.group)}</span>` : ''}
                </div>
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

    getIconForType(type) {
        switch(type) {
            case 'Film': return 'fas fa-film';
            case 'Dizi': return 'fas fa-tv';
            case 'Belgesel': return 'fas fa-globe-americas';
            case 'Canlı TV': return 'fas fa-broadcast-tower';
            default: return 'fas fa-play';
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    playContent(item) {
        if (!item.url || item.url.trim() === '') {
            this.showMessage('Bu içeriğin oynatma bağlantısı bulunamadı.', 'error');
            return;
        }
        
        try {
            // Test URL'lerini gerçek URL'lere çevir
            const realUrl = this.convertTestUrl(item.url);
            window.location.href = `player.html?url=${encodeURIComponent(realUrl)}&title=${encodeURIComponent(item.title)}`;
        } catch (error) {
            console.error('URL Error:', error);
            this.showMessage('Geçersiz video bağlantısı.', 'error');
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

    showWelcomeStats() {
        this.resultsContainer.innerHTML = '';
        this.updateStats();
        this.welcomeStats.style.display = 'block';
    }

    updateStats() {
        const filmCount = this.getCountByType(this.allItems, 'Film');
        const diziCount = this.getCountByType(this.allItems, 'Dizi');
        const belgeselCount = this.getCountByType(this.allItems, 'Belgesel');
        const canliCount = this.getCountByType(this.allItems, 'Canlı TV');
        const totalCount = this.allItems.length;

        this.filmCountEl.textContent = filmCount.toLocaleString();
        this.diziCountEl.textContent = diziCount.toLocaleString();
        this.belgeselCountEl.textContent = belgeselCount.toLocaleString();
        this.canliCountEl.textContent = canliCount.toLocaleString();
        this.totalCountEl.textContent = totalCount.toLocaleString();
    }

    showLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'flex';
            this.loadingElement.innerHTML = `
                <div class="spinner"></div>
                <div>Aranıyor...</div>
            `;
        }
        this.welcomeStats.style.display = 'none';
    }

    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
    }

    showError(message) {
        this.resultsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Hata</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="retry-btn">Tekrar Dene</button>
            </div>
        `;
        this.welcomeStats.style.display = 'none';
        this.hideLoading();
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="close-message">&times;</button>
        `;
        
        document.body.appendChild(messageDiv);
        
        // Otomatik kapanma
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 5000);
        
        // Manuel kapatma
        messageDiv.querySelector('.close-message').addEventListener('click', () => {
            messageDiv.remove();
        });
    }
}

// Sayfa yüklendiğinde search manager'ı başlat
document.addEventListener('DOMContentLoaded', () => {
    new SearchManager();
});
