// js/navigation.js - TV Optimizasyonlu
class TVNavigation {
    constructor() {
        this.focusableElements = [];
        this.currentFocusIndex = 0;
        this.isTVMode = this.detectTV();
        this.init();
    }

    detectTV() {
        // TV veya büyük ekran cihaz kontrolü
        return window.matchMedia('(min-width: 1280px) and (min-height: 720px)').matches ||
               navigator.userAgent.includes('TV') ||
               navigator.userAgent.includes('SmartTV');
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupTVMode();
            this.setupKeyboardNavigation();
            this.setupFocusableElements();
            this.setupScrollButtons();
            
            // İlk elementi focusla
            setTimeout(() => this.focusFirstElement(), 1000);
        });
    }

    setupTVMode() {
        if (this.isTVMode) {
            document.body.classList.add('tv-mode');
            // Fareyi gizle
            document.body.style.cursor = 'none';
            
            // Fare hareketinde imleci gizle
            document.addEventListener('mousemove', this.hideCursor.bind(this));
        }
    }

    hideCursor() {
        document.body.style.cursor = 'none';
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigate('up');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigate('down');
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.navigate('left');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.navigate('right');
                    break;
                case 'Enter':
                    e.preventDefault();
                    this.activateFocusedElement();
                    break;
                case 'Backspace':
                case 'Escape':
                    e.preventDefault();
                    this.handleBack();
                    break;
            }
        });
    }

    setupFocusableElements() {
        this.focusableElements = Array.from(document.querySelectorAll(
            '.nav-btn, .quick-link-card, .content-item, .search-btn, .back-btn, .scroll-btn, .scroll-btn-all'
        ));
        
        // Tabindex'leri ayarla
        this.focusableElements.forEach((el, index) => {
            el.setAttribute('tabindex', index === 0 ? '0' : '-1');
            el.addEventListener('click', this.handleElementClick.bind(this));
        });
    }

    navigate(direction) {
        const oldIndex = this.currentFocusIndex;
        
        switch(direction) {
            case 'up':
                this.currentFocusIndex = this.findElementAbove(oldIndex);
                break;
            case 'down':
                this.currentFocusIndex = this.findElementBelow(oldIndex);
                break;
            case 'left':
                this.currentFocusIndex = oldIndex > 0 ? oldIndex - 1 : this.focusableElements.length - 1;
                break;
            case 'right':
                this.currentFocusIndex = oldIndex < this.focusableElements.length - 1 ? oldIndex + 1 : 0;
                break;
        }

        this.updateFocus(oldIndex, this.currentFocusIndex);
    }

    findElementAbove(currentIndex) {
        const currentEl = this.focusableElements[currentIndex];
        const currentRect = currentEl.getBoundingClientRect();
        
        let bestCandidate = -1;
        let bestDistance = Infinity;
        
        this.focusableElements.forEach((el, index) => {
            if (index === currentIndex) return;
            
            const rect = el.getBoundingClientRect();
            // Yukarıdaki elementleri bul
            if (rect.bottom <= currentRect.top) {
                const distance = Math.abs(rect.left - currentRect.left);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestCandidate = index;
                }
            }
        });
        
        return bestCandidate !== -1 ? bestCandidate : currentIndex;
    }

    findElementBelow(currentIndex) {
        const currentEl = this.focusableElements[currentIndex];
        const currentRect = currentEl.getBoundingClientRect();
        
        let bestCandidate = -1;
        let bestDistance = Infinity;
        
        this.focusableElements.forEach((el, index) => {
            if (index === currentIndex) return;
            
            const rect = el.getBoundingClientRect();
            // Aşağıdaki elementleri bul
            if (rect.top >= currentRect.bottom) {
                const distance = Math.abs(rect.left - currentRect.left);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestCandidate = index;
                }
            }
        });
        
        return bestCandidate !== -1 ? bestCandidate : currentIndex;
    }

    updateFocus(oldIndex, newIndex) {
        // Eski elementi blurla
        if (oldIndex >= 0 && this.focusableElements[oldIndex]) {
            this.focusableElements[oldIndex].setAttribute('tabindex', '-1');
            this.focusableElements[oldIndex].blur();
        }
        
        // Yeni elementi focusla
        if (newIndex >= 0 && this.focusableElements[newIndex]) {
            this.focusableElements[newIndex].setAttribute('tabindex', '0');
            this.focusableElements[newIndex].focus();
            
            // Görünür alana getir
            this.focusableElements[newIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });
        }
        
        this.currentFocusIndex = newIndex;
    }

    activateFocusedElement() {
        const focusedElement = this.focusableElements[this.currentFocusIndex];
        if (focusedElement) {
            if (focusedElement.classList.contains('content-item')) {
                this.playContent(focusedElement);
            } else if (focusedElement.classList.contains('quick-link-card')) {
                focusedElement.click();
            } else if (focusedElement.classList.contains('nav-btn')) {
                focusedElement.click();
            } else if (focusedElement.classList.contains('scroll-btn')) {
                focusedElement.click();
            }
        }
    }

    handleElementClick(e) {
        const element = e.currentTarget;
        if (element.classList.contains('content-item')) {
            this.playContent(element);
        }
    }

    playContent(element) {
        const url = element.getAttribute('data-url');
        const title = element.getAttribute('data-title');
        
        console.log('Playing content:', { url, title });
        
        if (url && url.trim() !== '') {
            try {
                const realUrl = this.convertTestUrl(url);
                window.location.href = `player.html?url=${encodeURIComponent(realUrl)}&title=${encodeURIComponent(title)}`;
            } catch (error) {
                console.error('URL Error:', error);
                window.location.href = `player.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
            }
        } else {
            this.showMessage('Bu içeriğin oynatma bağlantısı bulunamadı.');
        }
    }

    convertTestUrl(url) {
        const testUrls = [
            'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
            'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8'
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

    handleBack() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = 'index.html';
        }
    }

    focusFirstElement() {
        if (this.focusableElements.length > 0) {
            this.currentFocusIndex = 0;
            this.focusableElements[0].setAttribute('tabindex', '0');
            this.focusableElements[0].focus();
        }
    }

    showMessage(message) {
        // Basit mesaj gösterme
        const messageEl = document.createElement('div');
        messageEl.className = 'tv-message';
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 20px;
            border-radius: 8px;
            z-index: 10000;
            border: 2px solid var(--primary);
        `;
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            document.body.removeChild(messageEl);
        }, 3000);
    }

    setupScrollButtons() {
        const scrollLeftBtns = document.querySelectorAll('.scroll-left');
        const scrollRightBtns = document.querySelectorAll('.scroll-right');
        
        scrollLeftBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-target');
                this.scrollContent(target, -400);
            });
        });
        
        scrollRightBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-target');
                this.scrollContent(target, 400);
            });
        });
    }

    scrollContent(containerId, amount) {
        const container = document.getElementById(containerId);
        if (container) {
            container.scrollBy({
                left: amount,
                behavior: 'smooth'
            });
        }
    }
}

// TV Navigasyonunu başlat
const tvNavigation = new TVNavigation();
