// Tüm JS kodları DOM yüklendiğinde çalışır
document.addEventListener('DOMContentLoaded', function() {
  
    // --- Mobil Menü Fonksiyonları ---
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const menuClose = document.querySelector('.mobile-menu-close');
    const navMenu = document.getElementById('main-nav');


    function openMenu() {
        navMenu.classList.add('mobile-menu-open');
        menuToggle.setAttribute('aria-expanded', 'true');
        menuToggle.classList.add('hidden');
        menuToggle.classList.remove('flex');
        menuClose.classList.remove('hidden');
        menuClose.classList.add('flex');
    }

    function closeMenu() {
        navMenu.classList.remove('mobile-menu-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.classList.add('flex');
        menuToggle.classList.remove('hidden');
        menuClose.classList.remove('flex');
        menuClose.classList.add('hidden');
    }

    if (menuToggle && navMenu && menuClose) {
        // Hamburger butona tıklayınca menüyü aç
        menuToggle.addEventListener('click', openMenu);
        // Kapatma butonuna tıklayınca menüyü kapat
        menuClose.addEventListener('click', closeMenu);
    }
    
    // --- İçerik Yükleyici Fonksiyonları ---
    loadAllContent();

});
