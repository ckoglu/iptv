// js/navigation.js - Güncellenmiş versiyon
document.addEventListener('DOMContentLoaded', function() {
    // Klavye navigasyonu
    document.addEventListener('keydown', function(e) {
        const focusedElement = document.activeElement;
        
        switch(e.key) {
            case 'ArrowUp':
                e.preventDefault();
                navigate('up', focusedElement);
                break;
            case 'ArrowDown':
                e.preventDefault();
                navigate('down', focusedElement);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                navigate('left', focusedElement);
                break;
            case 'ArrowRight':
                e.preventDefault();
                navigate('right', focusedElement);
                break;
            case 'Enter':
                if (focusedElement.classList.contains('content-item')) {
                    playContent(focusedElement);
                }
                break;
        }
    });

    // Fare hover efekti
    const focusableElements = document.querySelectorAll('.nav-btn, .quick-btn, .content-item, .search-btn, .back-btn');
    focusableElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            this.focus();
        });
        
        // Content item'lara tıklama event'i ekle
        if (element.classList.contains('content-item')) {
            element.addEventListener('click', function() {
                playContent(this);
            });
        }
    });
    
    // Kaydırma butonlarını aktif et
    setupScrollButtons();
});

function navigate(direction, currentElement) {
    const focusableElements = Array.from(document.querySelectorAll('.nav-btn, .quick-btn, .content-item, .search-btn, .back-btn, .search-input'));
    const currentIndex = focusableElements.indexOf(currentElement);
    
    if (currentIndex === -1) return;
    
    let nextIndex;
    
    switch(direction) {
        case 'up':
        case 'left':
            nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
            break;
        case 'down':
        case 'right':
            nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
            break;
    }
    
    focusableElements[nextIndex].focus();
}

function playContent(element) {
    const url = element.getAttribute('data-url');
    const title = element.getAttribute('data-title');
    
    console.log('Playing content:', { url, title }); // Debug için
    
    if (url && url.trim() !== '') {
        // URL'yi kontrol et
        try {
            // Test stream URL'lerini gerçek URL'lere çevir
            const realUrl = convertTestUrl(url);
            window.location.href = `player.html?url=${encodeURIComponent(realUrl)}&title=${encodeURIComponent(title)}`;
        } catch (error) {
            console.error('URL Error:', error);
            // Hata durumunda orijinal URL'yi kullan
            window.location.href = `player.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
        }
    } else {
        alert('Bu içeriğin oynatma bağlantısı bulunamadı.');
    }
}

// Test URL'lerini gerçek çalışan URL'lere çevir
function convertTestUrl(url) {
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
    
    // Eğer test URL'si ise, çalışan bir test stream döndür
    if (testUrls.includes(url)) {
        // Farklı test stream'ler döndür
        const workingUrls = [
            'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
            'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8'
        ];
        return workingUrls[Math.floor(Math.random() * workingUrls.length)];
    }
    
    return url;
}

// Kaydırma butonlarını kur
function setupScrollButtons() {
    const scrollLeftBtns = document.querySelectorAll('.scroll-left');
    const scrollRightBtns = document.querySelectorAll('.scroll-right');
    
    scrollLeftBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            scrollContent(target, -300);
        });
    });
    
    scrollRightBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            scrollContent(target, 300);
        });
    });
}

function scrollContent(containerId, amount) {
    const container = document.getElementById(containerId);
    if (container) {
        container.scrollBy({
            left: amount,
            behavior: 'smooth'
        });
    }
}
