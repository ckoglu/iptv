// navigation-tv-complete.js
// Smart TV full integration navigation engine
// Include after DOMContentLoaded or at end of body for immediate usage.

(function () {
  const BACK_KEY_CODES = new Set([8, 27, 10009, 461, 403, 427]); // back/escape variations
  const PLAY_PAUSE_KEY_CODES = new Set([179, 447, 179]); // common media play/pause codes (best-effort)
  const ENTER_KEY_CODES = new Set([13, 334, 16777221]); // Enter / OK variations
  const DIRECTION_KEYS = {
    left: new Set([37, 21]),   // ArrowLeft, VK_LEFT (numeric variations)
    up: new Set([38, 19]),
    right: new Set([39, 22]),
    down: new Set([40, 20])
  };

  // --- Detect Smart TV
  function detectSmartTV() {
    const ua = (navigator.userAgent || '').toLowerCase();
    const platformAPIs = !!(window.tizen || window.webOSSystem || navigator.userAgent.includes('Android') && /tv/.test(navigator.platform || '') );
    const tvKeywords = /smart-tv|hbbtv|netcast|tizen|webos|appletv|bravia|hisense|firetv|roku|android tv|smarttv/;
    return tvKeywords.test(ua) || platformAPIs;
  }

  // --- Initialize
  document.addEventListener('DOMContentLoaded', () => {
    const isTV = detectSmartTV();
    if (isTV) document.body.classList.add('tv-mode');
    markFocusableElements();
    if (isTV) enableTVMode();
    else enableDesktopMode();

    // Update focusable list when dynamic content is added (m3u loader, etc)
    const mo = new MutationObserver(() => markFocusableElements());
    mo.observe(document.body, { childList: true, subtree: true });
  });

  // --- Mark elements focusable automatically
  function markFocusableElements() {
    // Elements we want to include in TV navigation
    const sel = [
      '.content-item',
      '.quick-link-card',
      '.scroll-btn',
      '.scroll-btn-all',
      'nav ul li a',
      '.search-input',
      '.search-button',
      '.btn',
      '.profile',
      '.user-actions > *'
    ].join(',');

    const nodes = document.querySelectorAll(sel);
    nodes.forEach((n, i) => {
      if (!n.hasAttribute('data-focusable')) {
        n.setAttribute('data-focusable', 'true');
        if (!n.hasAttribute('tabindex')) n.tabIndex = 0;
      }
    });
  }

  // --- TV Mode specifics
  let hideCursorTimer = null;
  function enableTVMode() {
    document.body.classList.add('tv-mode');
    hideMouseCursor();
    disableScrollInputs();
    setupRemoteKeyHandler();
    ensureInitialFocus();
    emphasizeFocusVisuals();
  }

  function enableDesktopMode() {
    // keep normal mouse interactions but still ensure keyboard nav works
    document.addEventListener('keydown', defaultKeyHandler);
  }

  function ensureInitialFocus() {
    const all = getFocusable();
    if (!document.activeElement || document.activeElement === document.body) {
      const first = all.find(el => isVisible(el));
      if (first) {
        first.focus({ preventScroll: true });
        first.scrollIntoView({ block: 'nearest', inline: 'center' });
      }
    }
  }

  // --- Hide mouse cursor on TV and re-show briefly on movement
  function hideMouseCursor() {
    document.body.style.cursor = 'none';
    const showThenHide = () => {
      document.body.style.cursor = 'default';
      if (hideCursorTimer) clearTimeout(hideCursorTimer);
      hideCursorTimer = setTimeout(() => {
        document.body.style.cursor = 'none';
      }, 1600);
    };
    window.addEventListener('mousemove', showThenHide, { passive: true });
    window.addEventListener('touchstart', showThenHide, { passive: true });
  }

  // --- Prevent wheel / touch scroll on TV mode
  function disableScrollInputs() {
    window.addEventListener('wheel', e => {
      if (document.body.classList.contains('tv-mode')) e.preventDefault();
    }, { passive: false });
    window.addEventListener('touchmove', e => {
      if (document.body.classList.contains('tv-mode')) e.preventDefault();
    }, { passive: false });
  }

  // --- Retrieve focusable list
  function getFocusable() {
    return Array.from(document.querySelectorAll('[data-focusable="true"]')).filter(isVisible);
  }

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden' && window.getComputedStyle(el).display !== 'none';
  }

  // --- Remote / keyboard handler for TV
  function setupRemoteKeyHandler() {
    document.addEventListener('keydown', function (e) {
      // Normalize code
      const code = e.keyCode || e.which;
      if (DIRECTION_KEYS.left.has(code)) { e.preventDefault(); move('left'); return; }
      if (DIRECTION_KEYS.right.has(code)) { e.preventDefault(); move('right'); return; }
      if (DIRECTION_KEYS.up.has(code)) { e.preventDefault(); move('up'); return; }
      if (DIRECTION_KEYS.down.has(code)) { e.preventDefault(); move('down'); return; }

      if (ENTER_KEY_CODES.has(code) || e.key === 'Enter' || e.key === 'OK') { e.preventDefault(); activate(document.activeElement); return; }

      if (BACK_KEY_CODES.has(code) || e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        handleBack();
        return;
      }

      if (PLAY_PAUSE_KEY_CODES.has(code)) {
        e.preventDefault();
        handlePlayPause();
        return;
      }

      // fallback: arrows via 'ArrowLeft' etc
      defaultKeyHandler(e);
    }, { passive: false });
  }

  function defaultKeyHandler(e) {
    const code = e.keyCode || e.which;
    if (code === 37) { e.preventDefault(); move('left'); }
    if (code === 38) { e.preventDefault(); move('up'); }
    if (code === 39) { e.preventDefault(); move('right'); }
    if (code === 40) { e.preventDefault(); move('down'); }
    if (code === 13) { e.preventDefault(); activate(document.activeElement); }
    if (code === 8 || code === 27) { e.preventDefault(); handleBack(); }
  }

  // --- Move focus using spatial nearest-neighbour algorithm
  function move(direction) {
    const current = document.activeElement;
    const candidates = getFocusable();
    if (!current || candidates.length === 0) {
      ensureInitialFocus();
      return;
    }
    // if current isn't in our candidate set, pick nearest visible candidate
    if (!candidates.includes(current)) {
      const first = candidates[0];
      first?.focus({ preventScroll: true });
      first?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      return;
    }

    const currRect = current.getBoundingClientRect();
    let best = null;
    let bestScore = Infinity;

    candidates.forEach(el => {
      if (el === current) return;
      const r = el.getBoundingClientRect();
      const dx = (r.left + r.right) / 2 - (currRect.left + currRect.right) / 2;
      const dy = (r.top + r.bottom) / 2 - (currRect.top + currRect.bottom) / 2;

      // directional filter
      switch (direction) {
        case 'left':
          if (dx >= 0) return;
          break;
        case 'right':
          if (dx <= 0) return;
          break;
        case 'up':
          if (dy >= 0) return;
          break;
        case 'down':
          if (dy <= 0) return;
          break;
      }

      // score: prefer closer in desired axis and not too far in perpendicular axis
      const primary = Math.abs(direction === 'left' || direction === 'right' ? dx : dy);
      const secondary = Math.abs(direction === 'left' || direction === 'right' ? dy : dx);
      // penalty for high secondary offset (prefer roughly aligned)
      const score = primary * 3 + secondary * 1.2;

      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    });

    if (best) {
      best.focus({ preventScroll: true });
      best.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    } else {
      // wrap behavior: jump to first/last depending on direction
      const list = candidates;
      const idx = list.indexOf(current);
      if (idx !== -1) {
        const next = (direction === 'left' || direction === 'up') ? list[(idx - 1 + list.length) % list.length] : list[(idx + 1) % list.length];
        next?.focus({ preventScroll: true });
        next?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      }
    }
  }

  // --- Activation logic (Enter / OK)
  function activate(el) {
    if (!el) return;
    if (el.tagName === 'INPUT') {
      el.focus();
      return;
    }
    // if element has click handler, call it
    if (typeof el.click === 'function') {
      el.click();
      return;
    }
    // fallback: if content-item, call playContent
    if (el.classList.contains('content-item')) {
      playContent(el);
      return;
    }
  }

  // --- Play content
  function playContent(el) {
    const url = (el.dataset.url || el.getAttribute('data-url') || '').trim();
    const title = (el.dataset.title || el.getAttribute('data-title') || el.textContent || 'İçerik').trim();
    if (!url) {
      showToast('Oynatma bağlantısı bulunamadı.');
      return;
    }
    // Simple navigation to player page
    location.href = `player.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  }

  // --- Back handling
  function handleBack() {
    // Priority: custom back handlers on page
    const backHandled = dispatchCustomEvent('tv-back-request');
    if (backHandled) return;
    // default: history back or close modal
    if (window.history.length > 1) history.back();
    else showToast('Geri tuşu: ana ekrana dönülemedi');
  }

  function handlePlayPause() {
    dispatchCustomEvent('tv-playpause-request');
  }

  // Allow pages to intercept TV events. Returns true if prevented.
  function dispatchCustomEvent(name) {
    const ev = new CustomEvent(name, { cancelable: true });
    const prevented = !document.dispatchEvent(ev);
    return prevented;
  }

  // --- Utility: quick toast
  let toastEl = null;
  function showToast(msg, timeout = 1400) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:80px;background:rgba(0,0,0,.8);color:#fff;padding:8px 14px;border-radius:6px;z-index:99999;font-size:14px';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => { toastEl.style.opacity = '0'; }, timeout);
  }

  // expose minimal API for page scripts
  window.TVNav = {
    move,
    activate,
    playContent,
    showToast,
    isTVMode: () => document.body.classList.contains('tv-mode')
  };

})();
