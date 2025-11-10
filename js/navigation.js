// js/navigation.js - Tam TV Uyumlu
class TVNavigation {
    constructor() {
        this.focusableElements = [];
        this.currentFocusIndex = 0;
        this.isTVMode = this.detectTV();
        this.init();
    }

    detectTV() {
        // TV, büyük ekran veya uzaktan kumanda tespiti
        return window.matchMedia('(min-width: 1280px) and (min-height: 720px)').matches ||
               navigator.userAgent.includes('TV') ||
               navigator.userAgent.includes('SmartTV') ||
               navigator.userAgent.includes('Large Screen');
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupTVMode();
            this.setupKeyboardNavigation();
            this.setupFocusableElements();
            this.setupEventListeners();
            
            // 1 saniye sonra ilk elementi focusla
            setTimeout(() => this.focusFirstElement(), 1000);
        });
    }

    setupTVMode() {
        if (this.isTVMode) {
            document.body.classList.add('tv-mode');
            console.log('📺 TV Modu Aktif - Kumanda navigasyonu hazır');
        }
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (this.isTVMode) {
                e.preventDefault();
            }
            
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
                case ' ':
                    e.preventDefault();
                    this.activateFocusedElement();
                    break;
            }
        });
    }

    setupFocusableElements() {
        // Tüm tıklanabilir ve focuslanabilir elementleri seç
        this.focusableElements = Array.from(document.querySelectorAll(
            'a, button, .quick-link-card, .content-item, .scroll-btn, .scroll-btn-all, ' +
            '.search-icon, .profile, .mobile-menu-toggle, .mobile-menu-close, ' +
            'nav ul li a, .filter-btn, [tabindex]:not([tabindex="-1"])'
        )).filter(el => {
            // Görünür ve etkin elementleri filtrele
            return el.offsetWidth > 0 && 
                   el.offsetHeight > 0 && 
                   !el.disabled &&
                   window.getComputedStyle(el).visibility !== 'hidden';
        });

        console.log(`🎯 ${this.focusableElements.length} focusable element bulundu`);

        // Tabindex'leri ayarla
        this.focusableElements.forEach((el, index) => {
            el.setAttribute('tabindex', index === 0 ? '0' : '-1');
            el.classList.add('focusable-element');
        });
    }

    setupEventListeners() {
        // Click event'lerini dinle
        document.addEventListener('click', (e) => {
            const target = e.target.closest('.focusable-element');
            if (target) {
                this.handleElementClick(target);
            }
        });

        // Scroll butonlarını kur
        this.setupScrollButtons();
    }

    navigate(direction) {
        if (this.focusableElements.length === 0) return;

        const oldIndex = this.currentFocusIndex;
        let newIndex;

        switch(direction) {
            case 'up':
                newIndex = this.findElementAbove(oldIndex);
                break;
            case 'down':
                newIndex = this.findElementBelow(oldIndex);
                break;
            case 'left':
                newIndex = this.findElementLeft(oldIndex);
                break;
            case 'right':
                newIndex = this.findElementRight(oldIndex);
                break;
        }

        if (newIndex !== -1 && newIndex !== oldIndex) {
            this.updateFocus(oldIndex, newIndex);
        }
    }

    findElementAbove(currentIndex) {
        const currentEl = this.focusableElements[currentIndex];
        const currentRect = currentEl.getBoundingClientRect();
        
        let bestCandidate = -1;
        let bestDistance = Infinity;
        let bestVerticalDistance = Infinity;
        
        this.focusableElements.forEach((el, index) => {
            if (index === currentIndex) return;
            
            const rect = el.getBoundingClientRect();
            const verticalDistance = currentRect.top - rect.bottom;
            
            // Yukarıdaki elementleri bul (minimum 10px üstte)
            if (verticalDistance > 10) {
                const horizontalDistance = Math.abs(rect.left - currentRect.left);
                const totalDistance = verticalDistance + horizontalDistance * 0.3;
                
                if (totalDistance < bestDistance) {
                    bestDistance = totalDistance;
                    bestCandidate = index;
                    bestVerticalDistance = verticalDistance;
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
        let bestVerticalDistance = Infinity;
        
        this.focusableElements.forEach((el, index) => {
            if (index === currentIndex) return;
            
            const rect = el.getBoundingClientRect();
            const verticalDistance = rect.top - currentRect.bottom;
            
            // Aşağıdaki elementleri bul (minimum 10px aşağıda)
            if (verticalDistance > 10) {
                const horizontalDistance = Math.abs(rect.left - currentRect.left);
                const totalDistance = verticalDistance + horizontalDistance * 0.3;
                
                if (totalDistance < bestDistance) {
                    bestDistance = totalDistance;
                    bestCandidate = index;
                    bestVerticalDistance = verticalDistance;
                }
            }
        });
        
        return bestCandidate !== -1 ? bestCandidate : currentIndex;
    }

    findElementLeft(currentIndex) {
        const currentEl = this.focusableElements[currentIndex];
        const currentRect = currentEl.getBoundingClientRect();
        
        let bestCandidate = -1;
        let bestDistance = Infinity;
        
        this.focusableElements.forEach((el, index) => {
            if (index === currentIndex) return;
            
            const rect = el.getBoundingClientRect();
            const horizontalDistance = currentRect.left - rect.right;
            
            // Soldaki elementleri bul (minimum 10px solda)
            if (horizontalDistance > 10) {
                const verticalDistance = Math.abs(rect.top - currentRect.top);
                const totalDistance = horizontalDistance + verticalDistance * 0.3;
                
                if (totalDistance < bestDistance) {
                    bestDistance = totalDistance;
                    bestCandidate = index;
                }
            }
        });
        
        return bestCandidate !== -1 ? bestCandidate : 
               (currentIndex > 0 ? currentIndex - 1 : this.focusableElements.length - 1);
    }

    findElementRight(currentIndex) {
        const currentEl = this.focusableElements[currentIndex];
        const currentRect = currentEl.getBoundingClientRect();
        
        let bestCandidate = -1;
        let bestDistance = Infinity;
        
        this.focusableElements.forEach((el, index) => {
            if (index === currentIndex) return;
            
            const rect = el.getBoundingClientRect();
            const horizontalDistance = rect.left - currentRect.right;
            
            // Sağdaki elementleri bul (minimum 10px sağda)
            if (horizontalDistance > 10) {
                const verticalDistance = Math.abs(rect.top - currentRect.top);
                const totalDistance = horizontalDistance + verticalDistance * 0.3;
                
                if (totalDistance < bestDistance) {
                    bestDistance = totalDistance;
                    bestCandidate = index;
                }
            }
        });
        
        return bestCandidate !== -1 ? bestCandidate : 
               (currentIndex < this.focusableElements.length - 1 ? currentIndex + 1 : 0);
    }

    updateFocus(oldIndex, newIndex) {
        // Eski elementi blurla
        if (oldIndex >= 0 && this.focusableElements[oldIndex]) {
            this.focusableElements[oldIndex].setAttribute('tabindex', '-1');
            this.focusableElements[oldIndex].classList.remove('focused');
            this.focusableElements[oldIndex].blur();
        }
        
        // Yeni elementi focusla
        if (newIndex >= 0 && this.focusableElements[newIndex]) {
            this.focusableElements[newIndex].setAttribute('tabindex', '0');
            this.focusableElements[newIndex].classList.add('focused');
            this.focusableElements[newIndex].focus();
            
            // Görünür alana getir (smooth scroll)
            this.scrollToElement(this.focusableElements[newIndex]);
        }
        
        this.currentFocusIndex = newIndex;
        console.log(`🎯 Focus: ${newIndex} - ${this.focusableElements[newIndex]?.className}`);
    }

    scrollToElement(element) {
        const rect = element.getBoundingClientRect();
        const isVisible = (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );

        if (!isVisible) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });
        }
    }

    activateFocusedElement() {
        const focusedElement = this.focusableElements[this.currentFocusIndex];
        if (focusedElement) {
            console.log('🚀 Activating:', focusedElement);
            
            if (focusedElement.classList.contains('content-item')) {
                this.playContent(focusedElement);
            } else if (focusedElement.tagName === 'A' || focusedElement.tagName === 'BUTTON') {
                focusedElement.click();
            } else if (focusedElement.classList.contains('quick-link-card')) {
                this.handleQuickLink(focusedElement);
            } else if (focusedElement.classList.contains('search-icon')) {
                window.location.href = 'ara.html';
            } else {
                focusedElement.click();
            }
        }
    }

    handleElementClick(element) {
        if (element.classList.contains('content-item')) {
            this.playContent(element);
        } else if (element.classList.contains('quick-link-card')) {
            this.handleQuickLink(element);
        }
    }

    handleQuickLink(card) {
        const icon = card.querySelector('.card-icon i');
        if (icon) {
            if (icon.classList.contains('fa-video')) {
                window.location.href = 'film.html';
            } else if (icon.classList.contains('fa-compact-disc')) {
                window.location.href = 'dizi.html';
            } else if (icon.classList.contains('fa-camera')) {
                window.location.href = 'belgesel.html';
            } else if (icon.classList.contains('fa-satellite-dish')) {
                window.location.href = 'canli.html';
            }
        }
    }

    playContent(element) {
        const url = element.getAttribute('data-url');
        const title = element.getAttribute('data-title');
        
        console.log('🎬 Playing content:', { url, title });
        
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
            this.updateFocus(-1, 0);
        }
    }

    showMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.className = 'tv-message';
        messageEl.textContent = message;
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            if (document.body.contains(messageEl)) {
                document.body.removeChild(messageEl);
            }
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

    // Hata ayıklama için
    debugFocusableElements() {
        console.log('🎯 Focusable Elements:');
        this.focusableElements.forEach((el, index) => {
            console.log(`${index}:`, el.className, el.tagName, el.textContent.substring(0, 30));
        });
    }
}

// TV Navigasyonunu başlat
const tvNavigation = new TVNavigation();

// Hata ayıklama için global erişim
window.tvNav = tvNavigation;
