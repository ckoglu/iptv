/* IPTV - player.js (eski 800 satırlık player.js yerine) */
var Player = (function () {
  'use strict';

  var HLS_CDN = 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.light.min.js';
  var el, v, hls, opts = {}, openFlag = false, live = false, idleTimer, closing = false;

  function $(id) { return document.getElementById(id); }
  function fmt(s) {
    if (!isFinite(s) || s < 0) return '0:00';
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = Math.floor(s % 60);
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (x < 10 ? '0' : '') + x;
  }

  function init(o) {
    opts = o || {};
    el = $('player'); v = $('video');

    $('pPlay').onclick = toggle;
    $('pRw').onclick = function () { seek(-10); };
    $('pFf').onclick = function () { seek(10); };
    $('pBack').onclick = function () { close(); };
    $('pExit').onclick = function () { close(); };
    $('pRetry').onclick = function () { play(v._item); };
    $('pFull').onclick = fullscreen;
    $('pBar').onclick = function (e) {
      if (live || !v.duration) return;
      var r = this.getBoundingClientRect();
      v.currentTime = (e.clientX - r.left) / r.width * v.duration;
    };

    v.addEventListener('waiting', function () { $('pSpin').hidden = false; });
    v.addEventListener('playing', function () { $('pSpin').hidden = true; sync(); });
    v.addEventListener('pause', sync);
    v.addEventListener('play', sync);
    v.addEventListener('timeupdate', tick);
    v.addEventListener('error', function () { fail('Yayın açılamadı. Kaynak yanıt vermiyor olabilir.'); });
    el.addEventListener('mousemove', wake);
    el.addEventListener('click', function (e) { if (e.target === v) toggle(); });
  }

  function open(item) {
    openFlag = true; closing = false;
    el.hidden = false;
    $('pTitle').textContent = item.title || '';
    if (location.hash !== '#/play') location.hash = '#/play';
    play(item);
    wake();
    setTimeout(function () { $('pPlay').focus(); }, 60);
  }

  function play(item) {
    v._item = item;
    $('pError').hidden = true; $('pSpin').hidden = false;
    live = item.cat === 'canli';
    $('pLive').hidden = !live;
    $('pBar').style.visibility = live ? 'hidden' : 'visible';

    var url = item.url, isHls = /\.m3u8(\?|$)/i.test(url);
    destroy();

    if (!isHls || v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = url; start();                       /* Samsung/Tizen HLS'i doğal oynatır */
    } else {
      withHls(function (Hls) {
        if (!Hls || !Hls.isSupported()) { v.src = url; start(); return; }
        hls = new Hls({ maxBufferLength: 30, liveSyncDurationCount: 3 });
        hls.loadSource(url); hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, start);
        hls.on(Hls.Events.ERROR, function (_, d) {
          if (!d.fatal) return;
          if (d.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else fail('Yayın açılamadı. Kaynak yanıt vermiyor olabilir.');
        });
      });
    }
  }

  function withHls(cb) {
    if (window.Hls) return cb(window.Hls);
    var s = document.createElement('script');
    s.src = HLS_CDN;
    s.onload = function () { cb(window.Hls); };
    s.onerror = function () { cb(null); };
    document.head.appendChild(s);
  }

  function start() {
    var p = v.play();
    if (p && p.catch) p.catch(function () { v.muted = true; v.play().catch(function () { }); });
  }

  function fail(msg) {
    $('pSpin').hidden = true;
    $('pErrorText').textContent = msg;
    $('pError').hidden = false;
    $('pRetry').focus();
  }

  function destroy() {
    if (hls) { try { hls.destroy(); } catch (e) { } hls = null; }
    v.removeAttribute('src'); v.load();
  }

  function close(silent) {
    if (closing) return;
    closing = true; openFlag = false;
    destroy();
    el.hidden = true;
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
    if (!silent && opts.onClose) opts.onClose();
    if (opts.focusFirst) opts.focusFirst();
  }

  function toggle() { if (v.paused) start(); else v.pause(); wake(); }
  function seek(d) { if (!live && isFinite(v.duration)) v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + d)); wake(); }
  function sync() { $('pPlay').innerHTML = v.paused ? '&#9654;' : '&#10073;&#10073;'; }
  function tick() {
    if (live || !isFinite(v.duration)) return;
    $('pFill').style.width = (v.currentTime / v.duration * 100) + '%';
    $('pCur').textContent = fmt(v.currentTime);
    $('pDur').textContent = fmt(v.duration);
  }
  function fullscreen() {
    if (document.fullscreenElement) { if (document.exitFullscreen) document.exitFullscreen(); }
    else if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }

  function wake() {
    el.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (!v.paused) { el.classList.add('idle'); if (document.activeElement) document.activeElement.blur(); }
    }, 4000);
  }

  /* uzaktan kumanda */
  function key(k, e) {
    var hidden = el.classList.contains('idle');
    wake();
    if (k === 10009 || k === 461 || k === 27 || k === 8) { e.preventDefault(); close(); return; }
    if (k === 13) {                                   /* OK */
      if (hidden || !document.activeElement || document.activeElement === document.body) { e.preventDefault(); toggle(); }
      return;                                         /* butona odaklıysa tarayıcı tıklamayı üretir */
    }
    if (k === 37 || k === 39) { e.preventDefault(); if (!hidden && document.activeElement && document.activeElement.className.indexOf('p-btn') > -1) App.move(k === 37 ? 'left' : 'right'); else seek(k === 37 ? -10 : 10); return; }
    if (k === 38 || k === 40) { e.preventDefault(); App.move(k === 38 ? 'up' : 'down'); return; }
    if (k === 415) { e.preventDefault(); start(); return; }                 /* Play */
    if (k === 19) { e.preventDefault(); v.pause(); return; }                /* Pause */
    if (k === 10252) { e.preventDefault(); toggle(); return; }              /* PlayPause */
    if (k === 413) { e.preventDefault(); close(); return; }                 /* Stop */
    if (k === 412) { e.preventDefault(); seek(-30); return; }               /* Rewind */
    if (k === 417) { e.preventDefault(); seek(30); return; }                /* FF */
  }

  return { init: init, open: open, close: close, key: key, isOpen: function () { return openFlag; } };
})();
