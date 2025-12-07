document.addEventListener("DOMContentLoaded", function () {
    const userAgent = navigator.userAgent.toLowerCase();
    const isSmartTV =
        userAgent.includes("tizen") ||
        userAgent.includes("webos") ||
        userAgent.includes("smart-tv") ||
        userAgent.includes("smarttv") ||
        userAgent.includes("netcast") ||
        userAgent.includes("appletv") ||
        userAgent.includes("crkey") ||
        userAgent.includes("android tv") ||
        userAgent.includes("xbox") ||
        /tv/ui.test(userAgent);

    if (isSmartTV) {
        console.log("SMART TV DETECTED: " + userAgent);
        document.body.classList.add("tv-mode");
        initSmartTVMode();
    }
});

function initSmartTVMode() {
    console.log("SMART TV MODE ACTIVATED");

    // Fare imlecini gizle
    document.body.style.cursor = "none";
    
    // BUT Tüm fare ve touch event'lerini engelleme! Sadece imleci gizle
    // Bu satırları KALDIR:
    // ["mousemove", "mousedown", "mouseup", "touchstart", "touchmove", "wheel"].forEach(evt =>
    //     document.addEventListener(evt, e => e.preventDefault(), { passive: false })
    // );

    // Tüm focusable element'leri bul
    let focusableElements = [];
    let currentFocusIndex = -1;

    // Odaklanabilir element'leri güncelle
    function updateFocusableElements() {
        focusableElements = Array.from(document.querySelectorAll(
            'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"]'
        )).filter(el => {
            return !el.disabled && 
                   el.offsetParent !== null && 
                   getComputedStyle(el).visibility !== 'hidden' &&
                   getComputedStyle(el).display !== 'none';
        });
        
        // Tabindex sırasına göre sırala
        focusableElements.sort((a, b) => {
            const aIndex = parseInt(a.getAttribute('tabindex') || 0);
            const bIndex = parseInt(b.getAttribute('tabindex') || 0);
            return aIndex - bIndex;
        });
        
        console.log("Focusable elements found:", focusableElements.length);
    }

    // İlk element'e odaklan
    function focusFirstElement() {
        updateFocusableElements();
        if (focusableElements.length > 0) {
            currentFocusIndex = 0;
            focusableElements[currentFocusIndex].focus();
            console.log("Focused on first element:", focusableElements[currentFocusIndex]);
        }
    }

    // Belirli yönde odak hareketi
    function moveFocus(direction) {
        updateFocusableElements();
        if (focusableElements.length === 0) return;
        
        const current = document.activeElement;
        const currentRect = current.getBoundingClientRect();
        
        let bestCandidate = null;
        let bestDistance = Infinity;
        
        for (let i = 0; i < focusableElements.length; i++) {
            const candidate = focusableElements[i];
            if (candidate === current) continue;
            
            const candidateRect = candidate.getBoundingClientRect();
            const dx = candidateRect.left + candidateRect.width/2 - (currentRect.left + currentRect.width/2);
            const dy = candidateRect.top + candidateRect.height/2 - (currentRect.top + currentRect.height/2);
            
            let isCandidate = false;
            let distance = 0;
            
            switch(direction) {
                case 'up':
                    if (dy < 0 && Math.abs(dx) < currentRect.width * 2) {
                        isCandidate = true;
                        distance = Math.sqrt(dx*dx + dy*dy);
                    }
                    break;
                case 'down':
                    if (dy > 0 && Math.abs(dx) < currentRect.width * 2) {
                        isCandidate = true;
                        distance = Math.sqrt(dx*dx + dy*dy);
                    }
                    break;
                case 'left':
                    if (dx < 0 && Math.abs(dy) < currentRect.height * 2) {
                        isCandidate = true;
                        distance = Math.sqrt(dx*dx + dy*dy);
                    }
                    break;
                case 'right':
                    if (dx > 0 && Math.abs(dy) < currentRect.height * 2) {
                        isCandidate = true;
                        distance = Math.sqrt(dx*dx + dy*dy);
                    }
                    break;
            }
            
            if (isCandidate && distance < bestDistance) {
                bestDistance = distance;
                bestCandidate = candidate;
            }
        }
        
        if (bestCandidate) {
            bestCandidate.focus();
            bestCandidate.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center', 
                inline: 'center' 
            });
            console.log("Moved focus to:", bestCandidate);
        }
    }

    // Kumanda tuşları için event listener
    function handleKeyDown(e) {
        console.log("Key pressed:", e.key, "Code:", e.keyCode);
        
        switch(e.key) {
            case 'ArrowUp':
            case 'Up': // TV kumandaları için
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
                    if (activeElement.tagName === 'A' || activeElement.tagName === 'BUTTON') {
                        activeElement.click();
                    } else if (activeElement.tagName === 'INPUT') {
                        // Input alanında Enter'a basıldığında submit etme
                        if (activeElement.type === 'text' || activeElement.type === 'search') {
                            // Arama vs. için özel işlem
                        }
                    }
                }
                break;
                
            case 'Backspace':
            case 8:
                e.preventDefault();
                // Geri tuşu için özel işlem
                if (window.history.length > 1) {
                    window.history.back();
                }
                break;
        }
    }

    // Tizen TV için özel tuşlar
    if (typeof tizen !== 'undefined') {
        try {
            if (tizen.tvinputdevice) {
                const supportedKeys = [
                    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                    'Enter', 'Back', 'Exit', 'MediaPlayPause',
                    'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue'
                ];
                
                supportedKeys.forEach(key => {
                    try {
                        tizen.tvinputdevice.registerKey(key);
                        console.log("Registered key:", key);
                    } catch (err) {
                        console.log("Could not register key", key, err);
                    }
                });
                
                // Tizen için özel key handler
                document.addEventListener('keydown', function(e) {
                    // Tizen'in özel keyCode'ları
                    switch(e.keyCode) {
                        case 10009: // RETURN
                            e.preventDefault();
                            if (window.history.length > 1) {
                                window.history.back();
                            } else {
                                tizen.application.getCurrentApplication().exit();
                            }
                            break;
                        case 10182: // EXIT
                            e.preventDefault();
                            tizen.application.getCurrentApplication().exit();
                            break;
                        case 10252: // PLAY_PAUSE
                            e.preventDefault();
                            // Play/Pause işlemi
                            break;
                    }
                });
            }
        } catch (err) {
            console.log("Tizen API error:", err);
        }
    }

    // WebOS için
    if (typeof webOS !== 'undefined') {
        webOS.service.request("luna://com.webos.service.tv.inputdevice", {
            method: "registerKey",
            parameters: {
                keys: ["Up", "Down", "Left", "Right", "Enter", "Back"]
            }
        });
    }

    // Event listener'ları ekle
    document.addEventListener('keydown', handleKeyDown);
    
    // Sayfa yüklendiğinde ilk element'e odaklan
    setTimeout(focusFirstElement, 1000);
    
    // DOM değişikliklerini izle (SPA'lar için)
    const observer = new MutationObserver(() => {
        setTimeout(updateFocusableElements, 100);
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // CSS ile TV modu için stiller
    const style = document.createElement('style');
    style.textContent = `
        .tv-mode *:focus {
            outline: 3px solid #4D90FE !important;
            outline-offset: 2px !important;
            box-shadow: 0 0 10px rgba(77, 144, 254, 0.8) !important;
        }
        
        .tv-mode button:focus,
        .tv-mode a:focus,
        .tv-mode input:focus {
            transform: scale(1.05);
            transition: transform 0.2s;
        }
        
        .tv-mode body {
            cursor: none !important;
        }
    `;
    document.head.appendChild(style);
}
