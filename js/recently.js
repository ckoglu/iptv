document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('recently-watched');
    const data = JSON.parse(localStorage.getItem('recentlyWatched') || '[]');

    if (data.length === 0) {
        container.innerHTML = '<p>Henüz izlenen içerik yok.</p>';
        return;
    }

    container.innerHTML = data.map(video => {
        const isLive = video.meta && video.meta.toLowerCase() === 'canli';
        const posterClass = isLive ? 'content-poster tv-logo' : 'content-poster';
        const posterStyle = isLive 
            ? `background-image:url('${video.poster || 'img/tv-default.png'}')`
            : `background-image:url('${video.poster || 'img/default.jpg'}')`;

        return `
            <div class="content-item" 
                onclick="window.location.href='player.html?url=${encodeURIComponent(video.url)}&title=${encodeURIComponent(video.title)}&poster=${encodeURIComponent(video.poster)}&meta=${encodeURIComponent(video.meta)}'">

                <div class="${posterClass}" style="${posterStyle}">
                    <i class="fas fa-play-circle"></i>
                </div>

                <div class="item-info">
                    <h3 class="item-title">${video.title}</h3>
                    <p class="item-category">${video.meta || ''}</p>
                </div>
            </div>
        `;
    }).join('');
});