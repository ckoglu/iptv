// js/bolum.js
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const diziAd = params.get("dizi");
  const container = document.getElementById("bolumler");
  const titleEl = document.getElementById("dizi-title");
  const loadingEl = document.getElementById("loading");

  if (!diziAd) {
    container.innerHTML = `<p style="color:#e50914;">Dizi parametresi eksik.</p>`;
    return;
  }

  titleEl.textContent = `${diziAd}`;
  loadingEl.style.display = "block";

  try {
    const m3uUrl = "https://raw.githubusercontent.com/ckoglu/iptv/refs/heads/main/list/dizi.m3u";
    const response = await fetch(m3uUrl);
    if (!response.ok) throw new Error("M3U yüklenemedi.");
    const text = await response.text();

    const bolumler = parseM3UForDizi(text, diziAd);
    loadingEl.style.display = "none";

    if (bolumler.length === 0) {
      container.innerHTML = `<p style="color:#aaa;">Bu diziye ait bölüm bulunamadı.</p>`;
      return;
    }

    bolumler.forEach(item => {
      const div = document.createElement("div");
      div.className = "content-item";
      div.innerHTML = `
        <div class="content-poster" style="background-image:url('${item.logo || ''}')">
          <i class="fas fa-play"></i>
        </div>
        <div class="item-info">
          <div class="item-title">${item.title}</div>
        </div>
      `;
      div.addEventListener("click", () => {
        window.location.href = `player.html?url=${encodeURIComponent(item.url)}&title=${encodeURIComponent(item.title)}&poster=${encodeURIComponent(item.logo || '')}`;
      });
      container.appendChild(div);
    });
  } catch (err) {
    loadingEl.innerHTML = `<p style="color:#e50914;">Yükleme hatası: ${err.message}</p>`;
  }
});

function parseM3UForDizi(m3uText, diziAd) {
  const lines = m3uText.split("\n");
  const items = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("#EXTINF:")) {
      const info = lines[i];
      const url = lines[i + 1];
      if (!url || url.startsWith("#")) continue;

      const titleFull = info.split(",").pop().trim();
      if (titleFull.startsWith(diziAd + ":")) {
        const match = info.match(/tvg-logo="([^"]*)"/);
        const logo = match ? match[1] : "";
        items.push({
          title: titleFull,
          url: url.trim(),
          logo
        });
      }
    }
  }
  return items;
}
