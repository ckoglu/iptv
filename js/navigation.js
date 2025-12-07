// navigation.js - Ana sayfa TV navigasyonu
document.addEventListener("DOMContentLoaded", function () {
    // TV algılama
    const isTV = detectTV();
    
    if (isTV) {
        console.log("TV MODE: Ana sayfa navigasyon aktif");
        initTVNavigation();
        initTVStyle();
    }
    
    // Normal navigasyon
    initNormalNavigation();
});

// TV algılama fonksiyonu
function detectTV() {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes("tizen") ||
           userAgent.includes("webos") ||
           userAgent.includes("smart-tv") ||
           userAgent.includes("smarttv") ||
           userAgent.includes("netcast") ||
           userAgent.includes("appletv") ||
           userAgent.includes("android tv") ||
           userAgent.includes("crkey") ||
           userAgent.includes("xbox") ||
           /tv/ui.test(userAgent);
}

// TV navigasyonu başlatma
function initTVNavigation() {
    // TV modu için CSS sınıfı
    document.body.classList.add('tv-mode');
    document.body.style.cursor = 'none';
    
    let focusableElements = [];
    let currentIndex = 0;
    
    // Odaklanabilir elementleri güncelle
    function updateFocusableElements() {
        focusableElements = Array.from(document.querySelectorAll(
            'a, button, .content-item, .quick-link-card, .scroll-btn, .search-icon, .profile, .mobile-menu-toggle, [tabindex]:not([tabindex="-1"])'
        )).filter(el => {
            return el.offsetParent !== null && 
                   getComputedStyle(el).display !== 'none' &&
                   getComputedStyle(el).visibility !== 'hidden' &&
                   !el.disabled;
        });
        
        // Tabindex ekle
        focusableElements.forEach((el, index) => {
            el.setAttribute('tabindex', '0');
        });
        
        console.log("TV Navigation: " + focusableElements.length + " focusable elements");
    }
    
    // İlk elemente odaklan
    function focusFirstElement() {
        updateFocusableElements();
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
            currentIndex = 0;
            highlightElement(focusableElements[0]);
        }
    }
    
    // Element vurgulama
    function highlightElement(element) {
        // Önceki vurgulamayı temizle
        document.querySelectorAll('.tv-focused').forEach(el => {
            el.classList.remove('tv-focused');
        });
        
        // Yeni vurgulamayı ekle
        element.classList.add('tv-focused');
        
        // Ekrana getir
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });
    }
    
    // Yön tuşları ile navigasyon
    function moveFocus(direction) {
        if (focusableElements.length === 0) return;
        
        const current = document.activeElement;
        const currentRect = current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let bestCandidate = null;
        let bestScore = -Infinity;
        
        focusableElements.forEach(candidate => {
            if (candidate === current) return;
            
            const rect = candidate.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const currentCenterX = currentRect.left + currentRect.width / 2;
            const currentCenterY = currentRect.top + currentRect.height / 2;
            
            const dx = centerX - currentCenterX;
            const dy = centerY - currentCenterY;
            
            let score = 0;
            let isInDirection = false;
            
            switch(direction) {
                case 'up':
                    if (dy < -10 && Math.abs(dx) < currentRect.width * 1.5) {
                        isInDirection = true;
                        score = -dy / (Math.abs(dx) + 1);
                    }
                    break;
                case 'down':
                    if (dy > 10 && Math.abs(dx) < currentRect.width * 1.5) {
                        isInDirection = true;
                        score = dy / (Math.abs(dx) + 1);
                    }
                    break;
                case 'left':
                    if (dx < -10 && Math.abs(dy) < currentRect.height * 1.5) {
                        isInDirection = true;
                        score = -dx / (Math.abs(dy) + 1);
                    }
                    break;
                case 'right':
                    if (dx > 10 && Math.abs(dy) < currentRect.height * 1.5) {
                        isInDirection = true;
                        score = dx / (Math.abs(dy) + 1);
                    }
                    break;
            }
            
            if (isInDirection && score > bestScore) {
                bestScore = score;
                bestCandidate = candidate;
            }
        });
        
        if (bestCandidate) {
            bestCandidate.focus();
            currentIndex = focusableElements.indexOf(bestCandidate);
            highlightElement(bestCandidate);
        }
    }
    
    // Kumanda tuş işleyici
    function handleTVKey(e) {
        console.log("TV Key:", e.key, "Code:", e.keyCode);
        
        switch(e.key) {
            case 'ArrowUp':
            case 'Up':
            case 38:
                e.preventDefault();
                moveFocus('up');
                break;
                
            case 'ArrowDown':
            case 'Down':
            case 40:
                e.preventDefault();
                moveFocus('down');
                break;
                
            case 'ArrowLeft':
            case 'Left':
            case 37:
                e.preventDefault();
                moveFocus('left');
                break;
                
            case 'ArrowRight':
            case 'Right':
            case 39:
                e.preventDefault();
                moveFocus('right');
                break;
                
            case 'Enter':
            case 13:
                e.preventDefault();
                const activeElement = document.activeElement;
                if (activeElement) {
                    // Tıklama işlemi
                    if (activeElement.click) {
                        activeElement.click();
                    } else if (activeElement.tagName === 'A') {
                        window.location.href = activeElement.href;
                    }
                }
                break;
                
            case 'Backspace':
            case 'Back':
            case 8:
            case 'Escape':
            case 'Esc':
            case 27:
                e.preventDefault();
                window.history.back();
                break;
                
            case 'MediaPlayPause':
                e.preventDefault();
                // Oynat/duraklat (ana sayfada özel işlev)
                const firstVideo = document.querySelector('.content-item');
                if (firstVideo) {
                    firstVideo.click();
                }
                break;
        }
    }
    
    // Tizen TV için özel tuşlar
    function setupTizenKeys() {
        if (typeof tizen !== 'undefined') {
            try {
                if (tizen.tvinputdevice) {
                    const keys = [
                        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                        'Enter', 'Return', 'Back', 'Exit',
                        'MediaPlayPause', 'ColorF0Red', 'ColorF1Green'
                    ];
                    
                    keys.forEach(key => {
                        try {
                            tizen.tvinputdevice.registerKey(key);
                        } catch (err) {
                            console.log("Tizen key register skipped:", key);
                        }
                    });
                    
                    // Tizen özel event listener
                    document.addEventListener('keydown', function(e) {
                        if (e.keyCode === 10009) { // RETURN
                            e.preventDefault();
                            window.history.back();
                        }
                        if (e.keyCode === 10182) { // EXIT
                            e.preventDefault();
                            if (tizen.application) {
                                tizen.application.getCurrentApplication().exit();
                            }
                        }
                    });
                }
            } catch (err) {
                console.log("Tizen API not available");
            }
        }
    }
    
    // WebOS için
    function setupWebOSKeys() {
        if (typeof webOS !== 'undefined') {
            try {
                webOS.service.request("luna://com.webos.service.tv.inputdevice", {
                    method: "registerKey",
                    parameters: {
                        keys: ["Up", "Down", "Left", "Right", "Enter", "Back"]
                    }
                });
            } catch (err) {
                console.log("WebOS API not available");
            }
        }
    }
    
    // Event listener'ları ekle
    document.addEventListener('keydown', handleTVKey);
    
    // Mouse hareketinde imleci göster
    let mouseTimer;
    document.addEventListener('mousemove', function() {
        document.body.style.cursor = 'auto';
        clearTimeout(mouseTimer);
        mouseTimer = setTimeout(function() {
            document.body.style.cursor = 'none';
        }, 2000);
    });
    
    // TV tuşlarını kur
    setupTizenKeys();
    setupWebOSKeys();
    
    // Başlangıçta odaklan
    setTimeout(focusFirstElement, 1000);
    
    // DOM değişikliklerini izle
    const observer = new MutationObserver(function() {
        updateFocusableElements();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Sayfa değişikliklerinde odaklan
    window.addEventListener('pageshow', function() {
        setTimeout(updateFocusableElements, 500);
    });
}

// TV için stil ayarları
function initTVStyle() {
    const style = document.createElement('style');
    style.textContent = `
        .tv-mode {
            cursor: none !important;
        }
        
        .tv-mode .tv-focused {
            transform: scale(1.05);
            transition: transform 0.2s ease;
            box-shadow: 0 0 20px rgba(229, 9, 20, 0.6);
            z-index: 10;
            position: relative;
        }
        
        .tv-mode .content-item:focus {
            outline: 4px solid #e50914 !important;
            outline-offset: 4px !important;
        }
        
        .tv-mode button:focus,
        .tv-mode a:focus {
            outline: 3px solid #e50914 !important;
            outline-offset: 3px !important;
            background-color: rgba(229, 9, 20, 0.1);
        }
        
        .tv-mode .quick-link-card:focus {
            background-color: rgba(229, 9, 20, 0.15);
            transform: scale(1.05);
        }
        
        .tv-mode ::-webkit-scrollbar {
            display: none;
        }
        
        .tv-mode {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
        
        .tv-mode body {
            font-size: 22px;
        }
        
        .tv-mode .item-title {
            font-size: 20px;
            font-weight: bold;
        }
        
        .tv-mode .quick-link-card {
            min-height: 150px;
            min-width: 200px;
        }
    `;
    document.head.appendChild(style);
}

// Normal navigasyon (mevcut kodunuz)
function initNormalNavigation() {
    // Mevcut normal navigasyon kodunuz buraya
    // Örnek:
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenuClose = document.querySelector('.mobile-menu-close');
    const mainNav = document.getElementById('main-nav');
    
    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', function() {
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !isExpanded);
            mainNav.classList.toggle('active');
        });
    }
    
    if (mobileMenuClose && mainNav) {
        mobileMenuClose.addEventListener('click', function() {
            mainNav.classList.remove('active');
            mobileMenuToggle.setAttribute('aria-expanded', 'false');
        });
    }
    
    // Header scroll efekti
    window.addEventListener('scroll', function() {
        const header = document.getElementById('header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// Global fonksiyonlar
window.goToSearch = function() {
    window.location.href = 'ara.html';
};

window.goToFilms = function() {
    window.location.href = 'film.html';
};

window.goToSeries = function() {
    window.location.href = 'dizi.html';
};

window.goToDocumentaries = function() {
    window.location.href = 'belgesel.html';
};

window.goToLiveTV = function() {
    window.location.href = 'canli.html';
};
