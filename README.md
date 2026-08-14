# IPTV

Film, dizi, belgesel ve canlı TV yayınlarını m3u listelerinden okuyan tek sayfalık web uygulaması.
Samsung (Tizen) ve diğer Smart TV tarayıcılarında kumandayla kullanılacak şekilde tasarlandı.

## Dosya yapısı

```
index.html        tüm arayüzün kabuğu (tek sayfa)
css/app.css       tek stil dosyası
js/app.js         yönlendirme, m3u okuma, listeler, arama, kumanda navigasyonu
js/player.js      video oynatıcı
list/*.m3u        içerik listeleri
manifest.json     tam ekran uygulama tanımı
film.html vb.     eski bağlantıları yeni adreslere yönlendiren 1 satırlık dosyalar
```

## Adresler

| Adres | Ekran |
|---|---|
| `#/` | ana sayfa |
| `#/c/film` | kategori listesi (`film`, `dizi`, `belgesel`, `canli`) |
| `#/d/Dizi%20Adı` | seçilen dizinin bölümleri |
| `#/ara` | arama |
| `#/play` | oynatıcı |

## Yeni kategori ekleme

`js/app.js` içindeki `CATS` nesnesine bir satır ekleyip listeyi `list/` klasörüne koyman yeterli.
Menü, ana sayfa satırı, kategori sayfası ve arama filtresi otomatik oluşur.

```js
cizgi: { name: 'Çizgi Film', list: 'list/cizgi.m3u', ph: '\uD83E\uDDF8' }
```

## Kumanda tuşları

| Tuş | Listelerde | Oynatıcıda |
|---|---|---|
| Yön tuşları | odak taşır | sağ/sol 10 sn atlar, yukarı/aşağı kontrollere geçer |
| OK | açar | oynat / duraklat |
| Geri (Return) | bir önceki ekran | oynatıcıyı kapatır |
| Oynat / Duraklat / Dur | – | ilgili işlem |
| İleri / Geri sarma | – | 30 sn atlar |

## Notlar

- Listeler önce depodaki `list/` klasöründen, oradan okunamazsa `raw.githubusercontent.com` üzerinden çekilir.
- HLS yayınlar Samsung TV'de tarayıcının kendi oynatıcısıyla açılır; desteklemeyen tarayıcılarda `hls.js` yalnız gerektiğinde indirilir.
- Kod ES2017 seviyesinde tutuldu; eski Tizen sürümlerinin tarayıcılarında da çalışır.
