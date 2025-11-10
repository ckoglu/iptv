// Header scroll effect
window.addEventListener('scroll', function() {
    const header = document.getElementById('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// --- Kaydırma Butonları ---
function setupScrollButtons() {
    const scrollLeftBtns = document.querySelectorAll('.scroll-left');
    const scrollRightBtns = document.querySelectorAll('.scroll-right');
    
    scrollLeftBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            scrollContent(target, -400);
        });
    });
    
    scrollRightBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            scrollContent(target, 400);
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