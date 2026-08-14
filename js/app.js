/* IPTV - app.js
   m3u-loader + navigation + search + bolum + recently + menu + scroll + redict
   dosyalarının tamamının yerine geçer. */
(function () {
  'use strict';

  /* ---------------- yapılandırma ---------------- */
  var RAW = 'https://raw.githubusercontent.com/ckoglu/iptv/main/';
  var CATS = {
    film:     { name: 'Film',      list: 'list/film.m3u',     ph: '\uD83C\uDFAC' },
    dizi:     { name: 'Dizi',      list: 'list/dizi.m3u',     ph: '\uD83D\uDCFA', series: true },
    belgesel: { name: 'Belgesel',  list: 'list/belgesel.m3u', ph: '\uD83C\uDF0D' },
    canli:    { name: 'Canlı TV',  list: 'list/canli.m3u',    ph: '\uD83D\uDCE1', wide: true }
  };
  var KEYS = ['film', 'dizi', 'belgesel', 'canli'];
  var PAGE = 60;

  var view = document.getElementById('view');
  var cache = {};

  /* ---------------- yardımcılar ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(id) { return document.getElementById(id); }
  function html(s) { var t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstChild; }
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(t._t); t._t = setTimeout(function () { t.hidden = true; }, 2500);
  }

  /* ---------------- m3u ---------------- */
  function parse(text, cat) {
    var lines = text.split('\n'), out = [], i, line, url, title, logo, group;
    for (i = 0; i < lines.length; i++) {
      line = lines[i];
      if (line.indexOf('#EXTINF') !== 0) continue;
      url = (lines[i + 1] || '').trim();
      if (!url || url.charAt(0) === '#') continue;
      title = line.slice(line.lastIndexOf(',') + 1).trim();
      if (!title) continue;
      logo = line.match(/tvg-logo="([^"]*)"/);
      group = line.match(/group-title="([^"]*)"/);
      out.push({
        title: title,
        url: url,
        logo: logo ? logo[1] : '',
        group: group ? group[1] : CATS[cat].name,
        cat: cat
      });
    }
    return out;
  }

  /* diziyi ana başlıklara indirger: "Ad:1.bölüm" -> "Ad" */
  function seriesOf(all) {
    var seen = {}, out = [];
    all.forEach(function (it) {
      var base = it.title.split(':')[0].trim();
      if (!seen[base]) {
        seen[base] = 1;
        out.push({ title: base, url: '#/d/' + encodeURIComponent(base), logo: it.logo, group: it.group, cat: 'dizi', series: true });
      }
    });
    return out;
  }

  function load(cat) {
    if (cache[cat]) return Promise.resolve(cache[cat]);
    var path = CATS[cat].list;
    return fetch(path)
      .then(function (r) { if (!r.ok) throw 0; return r.text(); })
      .catch(function () { return fetch(RAW + path).then(function (r) { return r.text(); }); })
      .then(function (text) {
        var all = parse(text, cat);
        cache[cat] = { all: all, items: CATS[cat].series ? seriesOf(all) : all };
        return cache[cat];
      });
  }

  /* ---------------- son izlenenler ---------------- */
  function recent(add) {
    var list = [];
    try { list = JSON.parse(localStorage.getItem('recent') || '[]'); } catch (e) { }
    if (!add) return list;
    list = [add].concat(list.filter(function (v) { return v.url !== add.url; })).slice(0, 20);
    try { localStorage.setItem('recent', JSON.stringify(list)); } catch (e) { }
    return list;
  }

  /* ---------------- kart / liste ---------------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var t = e.target, bg = t.getAttribute('data-bg');
      if (bg) t.style.backgroundImage = "url('" + bg + "')";
      t.removeAttribute('data-bg'); io.unobserve(t);
    });
  }, { rootMargin: '300px' }) : null;

  function card(it) {
    var c = CATS[it.cat] || CATS.film;
    var el = html(
      '<div class="card focusable' + (c.wide ? ' wide' : '') + '" tabindex="0">' +
        '<div class="thumb"><span class="ph">' + c.ph + '</span></div>' +
        '<div class="cap"><b>' + esc(it.title) + '</b><i>' + esc(it.series ? c.name : (it.group || c.name)) + '</i></div>' +
      '</div>'
    );
    var thumb = el.firstChild;
    if (it.logo) {
      if (io) { thumb.setAttribute('data-bg', it.logo); io.observe(thumb); }
      else { thumb.style.backgroundImage = "url('" + it.logo + "')"; }
    }
    el.addEventListener('click', function () { open(it); });
    el.addEventListener('keydown', function (e) { if (e.keyCode === 13) { e.preventDefault(); open(it); } });
    return el;
  }

  /* çok uzun listeleri parça parça basar */
  function fill(box, items) {
    var i = 0;
    function next() {
      var frag = document.createDocumentFragment(), end = Math.min(i + PAGE, items.length);
      for (; i < end; i++) frag.appendChild(card(items[i]));
      box.appendChild(frag);
      if (i < items.length) requestAnimationFrame(next);
    }
    if (!items.length) box.appendChild(html('<p class="empty">Burada henüz içerik yok.</p>'));
    else next();
  }

  function open(it) {
    if (it.series || (it.url && it.url.indexOf('#/') === 0)) { location.hash = it.url; return; }
    recent({ title: it.title, url: it.url, logo: it.logo, cat: it.cat, group: it.group });
    Player.open(it);
  }

  /* ---------------- görünümler ---------------- */
  function shell(s) { view.innerHTML = s; return view; }

  function home() {
    shell(
      '<h1>Ne izlemek istersin?</h1>' +
      '<p class="sub">Film, dizi, belgesel ve canlı yayınlar tek yerde.</p>' +
      '<div class="tiles">' + KEYS.map(function (k) {
        return '<a class="tile focusable" tabindex="0" href="#/c/' + k + '"><span>' + CATS[k].ph + '</span>' + CATS[k].name + '</a>';
      }).join('') + '</div>'
    );

    var r = recent();
    if (r.length) {
      view.appendChild(html('<div class="row-head"><h2>Kaldığın yerden</h2></div>'));
      var box = html('<div class="row"></div>');
      view.appendChild(box); fill(box, r);
    }

    KEYS.forEach(function (k) {
      view.appendChild(html(
        '<div class="row-head"><h2>' + CATS[k].name + '</h2><a class="focusable" tabindex="0" href="#/c/' + k + '">Tümü &#8250;</a></div>'
      ));
      var box = html('<div class="row"><div class="spin"></div></div>');
      view.appendChild(box);
      load(k).then(function (d) { box.innerHTML = ''; fill(box, d.items.slice(0, 20)); })
             .catch(function () { box.innerHTML = '<p class="empty">' + CATS[k].name + ' listesi yüklenemedi.</p>'; });
    });
  }

  function category(cat) {
    if (!CATS[cat]) return home();
    shell('<h1>' + CATS[cat].name + '</h1><div class="grid"><div class="spin"></div></div>');
    var box = view.querySelector('.grid');
    load(cat).then(function (d) { box.innerHTML = ''; fill(box, d.items); focusFirst(); })
             .catch(function () { box.innerHTML = '<p class="empty">Liste yüklenemedi. Bağlantını kontrol edip tekrar dene.</p>'; });
  }

  function episodes(name) {
    shell('<h1>' + esc(name) + '</h1><p class="sub">Bölümler</p><div class="grid"><div class="spin"></div></div>');
    var box = view.querySelector('.grid');
    load('dizi').then(function (d) {
      box.innerHTML = '';
      fill(box, d.all.filter(function (it) { return it.title.split(':')[0].trim() === name; }));
      focusFirst();
    });
  }

  function search() {
    shell(
      '<h1>Ara</h1>' +
      '<div class="search"><input id="q" type="search" placeholder="Film, dizi veya kanal adı" autocomplete="off"></div>' +
      '<div class="chips" id="chips"></div>' +
      '<div class="grid" id="res"></div>'
    );
    var q = $('q'), res = $('res'), chips = $('chips'), filter = '', all = [];

    Promise.all(KEYS.map(load)).then(function (ds) {
      ds.forEach(function (d, i) { all = all.concat(CATS[KEYS[i]].series ? d.items : d.all); });
      chips.innerHTML = ['', 'film', 'dizi', 'belgesel', 'canli'].map(function (k) {
        return '<button class="chip focusable' + (k ? '' : ' on') + '" tabindex="0" data-k="' + k + '">' +
               (k ? CATS[k].name : 'Tümü') + '</button>';
      }).join('');
      chips.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('.chip') : null;
        if (!b) return;
        filter = b.getAttribute('data-k');
        Array.prototype.forEach.call(chips.children, function (c) { c.classList.toggle('on', c === b); });
        run();
      });
      run();
    });

    function run() {
      var term = q.value.trim().toLocaleLowerCase('tr');
      res.innerHTML = '';
      var hits = all.filter(function (it) {
        if (filter && it.cat !== filter) return false;
        if (!term) return false;
        return it.title.toLocaleLowerCase('tr').indexOf(term) > -1 ||
               (it.group || '').toLocaleLowerCase('tr').indexOf(term) > -1;
      });
      if (!term) { res.appendChild(html('<p class="empty">Aramak için yazmaya başla.</p>')); return; }
      if (!hits.length) { res.appendChild(html('<p class="empty">&#8220;' + esc(q.value) + '&#8221; için sonuç yok.</p>')); return; }
      fill(res, hits.slice(0, 300));
    }

    var t; q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 250); });
    q.addEventListener('keydown', function (e) { if (e.keyCode === 13) { e.preventDefault(); run(); focusFirst(res); } });
    setTimeout(function () { q.focus(); }, 60);
  }

  /* ---------------- yönlendirme ---------------- */
  function route() {
    var h = location.hash.replace(/^#\/?/, ''), part = h.split('/');
    if (Player.isOpen() && part[0] !== 'play') Player.close(true);

    if (part[0] === 'play') { if (!Player.isOpen()) location.replace('#/'); return; }

    if (part[0] === 'c') category(part[1]);
    else if (part[0] === 'd') episodes(decodeURIComponent(part[1] || ''));
    else if (part[0] === 'ara') search();
    else home();

    window.scrollTo(0, 0);
    markNav(part[0] === 'c' ? part[1] : part[0]);
    if (part[0] !== 'ara') focusFirst();
  }

  function markNav(k) {
    Array.prototype.forEach.call(document.querySelectorAll('#nav a'), function (a) {
      a.classList.toggle('on', a.getAttribute('data-k') === (k || ''));
    });
  }

  /* ---------------- odak / kumanda ---------------- */
  function focusables() {
    return Array.prototype.filter.call(document.querySelectorAll('.focusable'), function (el) {
      return el.offsetParent !== null && !el.hidden;
    });
  }
  function focusFirst(scope) {
    setTimeout(function () {
      var list = focusables();
      if (scope) list = list.filter(function (el) { return scope.contains(el); });
      else list = list.filter(function (el) { return view.contains(el); });
      if (list[0]) list[0].focus();
    }, 40);
  }

  /* yön tuşlarıyla en yakın komşuya geçiş */
  function move(dir) {
    var cur = document.activeElement, all = focusables(), i = all.indexOf(cur);
    if (!cur || i < 0) { if (all[0]) all[0].focus(); return; }
    /* uzun listelerde her tuşta binlerce ölçüm yapmamak için komşulukla sınırla */
    var list = all.slice(Math.max(0, i - 60), i + 60);
    var a = cur.getBoundingClientRect(), best = null, bestScore = Infinity;
    list.forEach(function (el) {
      if (el === cur) return;
      var b = el.getBoundingClientRect();
      var dx = (b.left + b.width / 2) - (a.left + a.width / 2);
      var dy = (b.top + b.height / 2) - (a.top + a.height / 2);
      var main, cross;
      if (dir === 'left' || dir === 'right') {
        main = dir === 'left' ? -dx : dx; cross = Math.abs(dy);
        if (main < 8 || cross > Math.max(a.height, b.height) * 0.8) return;
      } else {
        main = dir === 'up' ? -dy : dy; cross = Math.abs(dx);
        if (main < 8) return;
      }
      var score = main + cross * 2;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (!best && (dir === 'up' || dir === 'down')) best = all[dir === 'down' ? i + 1 : i - 1];
    if (!best) return;
    best.focus();
    best.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function onKey(e) {
    var k = e.keyCode;
    if (Player.isOpen()) { Player.key(k, e); return; }
    if (k === 37 || k === 38 || k === 39 || k === 40) {
      var tag = e.target.tagName;
      if (tag === 'INPUT' && (k === 37 || k === 39)) return;   /* metin içinde imleç */
      e.preventDefault();
      move({ 37: 'left', 38: 'up', 39: 'right', 40: 'down' }[k]);
    } else if (k === 10009 || k === 461 || k === 8 || k === 27) {  /* Samsung / LG / geri */
      if (e.target.tagName === 'INPUT' && k === 8) return;
      e.preventDefault(); back();
    } else if (k === 412 || k === 417 || k === 415 || k === 10252) {
      /* medya tuşları oynatıcı kapalıyken yok sayılır */
    }
  }

  function back() {
    if (location.hash && location.hash !== '#/') { history.back(); return; }
    if (window.tizen && tizen.application) {
      try { tizen.application.getCurrentApplication().exit(); return; } catch (err) { }
    }
    toast('Çıkmak için tarayıcıyı kapatabilirsin.');
  }

  /* Samsung uzaktan kumanda tuşlarını uygulamaya yönlendir */
  function registerTVKeys() {
    if (!(window.tizen && tizen.tvinputdevice)) return;
    ['MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop', 'MediaRewind', 'MediaFastForward', 'Back'].forEach(function (n) {
      try { tizen.tvinputdevice.registerKey(n); } catch (err) { }
    });
  }

  function isTV() {
    var ua = navigator.userAgent.toLowerCase();
    return /tizen|web0s|webos|smart-?tv|smarttv|netcast|hbbtv|viera|bravia|aquos|android tv|crkey|googletv|philipstv|nettv|appletv|playstation|xbox/.test(ua) ||
           !!window.tizen || !!window.webOS;
  }

  /* ---------------- başlangıç ---------------- */
  function init() {
    document.getElementById('nav').innerHTML =
      KEYS.map(function (k) { return '<a class="focusable" tabindex="0" data-k="' + k + '" href="#/c/' + k + '">' + CATS[k].name + '</a>'; }).join('') +
      '<a class="focusable" tabindex="0" data-k="ara" href="#/ara">Ara</a>';

    if (isTV()) { document.body.classList.add('tv'); registerTVKeys(); }

    document.addEventListener('keydown', onKey, true);
    window.addEventListener('hashchange', route);
    window.addEventListener('scroll', function () {
      document.getElementById('hdr').classList.toggle('solid', window.scrollY > 40);
    }, { passive: true });

    Player.init({ onClose: function () { if (location.hash === '#/play') history.back(); }, focusFirst: focusFirst });
    route();
  }

  window.App = { open: open, focusFirst: focusFirst, move: move, back: back };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
