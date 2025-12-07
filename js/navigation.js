// Ana sayfa için TV navigasyon desteği
document.addEventListener("DOMContentLoaded", function () {
    // TV algılama
    const userAgent = navigator.userAgent.toLowerCase();
    const isSmartTV =
        userAgent.includes("tizen") ||
        userAgent.includes("webos") ||
        userAgent.includes("smart-tv") ||
        userAgent.includes("smarttv") ||
        userAgent.includes("netcast") ||
        userAgent.includes("appletv") ||
        userAgent.includes("android tv") ||
        userAgent.includes("crkey") ||
        userAgent.includes("xbox") ||
        /tv/ui.test(userAgent);

    if (isSmartTV) {
        console.log("SMART TV MODE: Ana sayfa navigasyon aktif");
        initTVNavigation();
    }
    
    // Normal navigasyonu da ekle (TV'de de çalışsın)
    initNormalNavigation();
});

function initTVNavigation() {
    // TV modu için CSS sınıfı ekle
    document.body.classList.add('tv-mode');
    document.body.style.cursor = 'none';
    
    // Tüm odaklanabilir elementleri bul
    let focusableElements = [];
    let currentRowIndex = 0;
    let currentItemIndex = 0;
    let rows = [];
    
    // Satırları ve içindeki öğeleri bul
    function updateFocusableElements() {
        rows = Array.from(document.querySelectorAll('.content-row'));
        focusableElements = [];
        
        rows.forEach((row, rowIndex) => {
            const items = Array.from(row.querySelectorAll('.content-item'));
            items.forEach((item, itemIndex) => {
                // Tabindex ekle ve click event'ini düzenle
                item.setAttribute('tabindex', '0');
                focusableElements.push({
                    element: item,
                    rowIndex: rowIndex,
                    itemIndex: itemIndex
                });
            });
        });
        
        // Navigasyon butonlarını da ekle
        const navButtons = Array.from(document.querySelectorAll('.scroll-btn, .logo, .search-icon, .profile, .mobile-menu-toggle, .quick-link-card'));
        navButtons.forEach((btn, index) => {
            btn.setAttribute('tabindex', '0');
            focusableElements.push({
                element: btn,
                rowIndex: -1,
                itemIndex: index + 1000
            });
        });
        
        // Header linklerini ekle
        const headerLinks = Array.from(document.querySelectorAll('#main-nav a'));
        headerLinks.forEach((link, index) => {
            link.setAttribute('tabindex', '0');
            focusableElements.push({
                element: link,
                rowIndex: -2,
                itemIndex: index + 2000
            });
        });
        
        console.log("TV Navigation: " + focusableElements.length + " element bulundu");
    }
    
    // İlk elemente odaklan
    function focusFirstElement() {
        updateFocusableElements();
        if (focusableElements.length > 0) {
            focusableElements[0].element.focus();
            currentItemIndex = 0;
            currentRowIndex = focusableElements[0].rowIndex;
        }
    }
    
    // Geçerli satırdaki öğeleri al
    function getCurrentRowItems() {
        return focusableElements.filter(item => item.rowIndex === currentRowIndex);
    }
    
    // Odak hareketi
    function moveFocus(direction) {
        updateFocusableElements();
        if (focusableElements.length === 0) return;
        
        const current = document.activeElement;
        const currentRect = current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        let bestCandidate = null;
        let bestScore = -Infinity;
        
        focusableElements.forEach(candidate => {
            if (candidate.element === current) return;
            
            const rect = candidate.element.getBoundingClientRect();
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
                        score = -dy / Math.abs(dx + 1);
                    }
                    break;
                case 'down':
                    if (dy > 10 && Math.abs(dx) < currentRect.width * 1.5) {
                        isInDirection = true;
                        score = dy / Math.abs(dx + 1);
                    }
                    break;
                case 'left':
                    if (dx < -10) {
                        isInDirection = true;
                        score = -dx / Math.abs(dy + 1);
                    }
                    break;
                case 'right':
                    if (dx > 10) {
                        isInDirection = true;
                        score = dx / Math.abs(dy + 1);
                    }
                    break;
            }
            
            if (isInDirection && score > bestScore) {
                bestScore = score;
                bestCandidate = candidate.element;
            }
        });
        
        if (bestCandidate) {
            bestCandidate.focus();
            bestCandidate.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });
            
            // Aktif satırı güncelle
            const candidateIndex = focusableElements.findIndex(item => item.element === bestCandidate);
            if (candidateIndex !== -1) {
                currentItemIndex = candidateIndex;
                currentRowIndex = focusableElements[candidateIndex].rowIndex;
            }
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
                    // Click event'ini tetikle
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
                e.preventDefault();
                window.history.back();
                break;
                
            case 'Escape':
            case 'Esc':
            case 27:
                e.preventDefault();
                // Ana sayfada ESC için özel işlem
                if (window.location.pathname.includes('index.html')) {
                    // Menüyü kapat
                    const mobileMenu = document.querySelector('.mobile-menu-toggle');
                    if (mobileMenu && mobileMenu.getAttribute('aria-expanded') === 'true') {
                        mobileMenu.click();
                    }
                } else {
                    window.history.back();
                }
                break;
        }
    }
    
    // Tizen özel tuşlar
    if (typeof tizen !== 'undefined') {
        try {
            if (tizen.tvinputdevice) {
                const keys = [
                    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                    'Enter', 'Return', 'Back', 'Exit',
                    'MediaPlayPause', 'MediaStop', 'MediaRewind', 'MediaFastForward'
                ];
                
                keys.forEach(key => {
                    try {
                        tizen.tvinputdevice.registerKey(key);
                    } catch (err) {
                        console.warn("Key register error:", key, err);
                    }
                });
                
                // Tizen için ek event listener
                document.addEventListener('keydown', function(e) {
                    if (e.keyCode === 10009) { // RETURN
                        e.preventDefault();
                        window.history.back();
                    }
                    if (e.keyCode === 10182) { // EXIT
                        e.preventDefault();
                        if (typeof tizen !== 'undefined' && tizen.application) {
                            tizen.application.getCurrentApplication().exit();
                        }
                    }
                });
            }
        } catch (err) {
            console.warn("Tizen API error:", err);
        }
    }
    
    // Event listener'ları ekle
    document.addEventListener('keydown', handleTVKey);
    
    // Mouse hareketlerinde imleci göster
    let mouseTimer;
    document.addEventListener('mousemove', function() {
        document.body.style.cursor = 'auto';
        clearTimeout(mouseTimer);
        mouseTimer = setTimeout(function() {
            document.body.style.cursor = 'none';
        }, 3000);
    });
    
    // Sayfa yüklendiğinde odaklan
    setTimeout(focusFirstElement, 1000);
    
    // DOM değişikliklerini izle
    const observer = new MutationObserver(function() {
        setTimeout(updateFocusableElements, 100);
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function initNormalNavigation() {
    // Mevcut navigasyon kodunuz buraya
    // ... (mevcut kodunuz)
}
