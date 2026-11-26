// 八辛吉官網：把 data/*.json（後台改的內容）套進 src/template.html，輸出到 dist/
// Netlify 每次儲存後會自動執行：node build.js
const fs = require('fs'), path = require('path');
const R = f => JSON.parse(fs.readFileSync(path.join(__dirname, 'data', f + '.json'), 'utf8'));
const shop = R('shop'), hours = R('hours'), notice = R('notice'), featured = R('featured'),
      videos = R('videos'), menu = R('menu'), levels = R('levels'), faq = R('faq');
const U = 'https://baxinji.netlify.app/';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const img = p => !p ? '' : (/^https?:|^data:/.test(p) ? p : p.replace(/^\/+/, ''));

// ---- 營業時間 ----
const DAYKEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const norm = v => String(v || '').replace(/，|、/g, ',').replace(/\s/g, '').replace(/[–—~～]/g, '-');
const H = {}; DAYKEYS.forEach((k, i) => { const v = norm(hours[k]); H[i] = (!v || /公休|休息/.test(v)) ? null : v; });

// ---- 給網頁程式用的資料 ----
const SHOP = { ...shop, hours: H, points: (shop.points || []).filter(Boolean) };
const card = x => ({ tag: x.tag || '', name: x.name, desc: x.desc || '', price: String(x.price || ''), spice: x.spicy ? 1 : 0, img: img(x.img) });
const SIGNATURE = (featured.signature || []).map(card), NOODLES = (featured.noodles || []).map(card);
const VIDEOS = (videos.list || []).filter(v => v.id).map(v => ({ id: String(v.id).replace(/\D/g, ''), title: v.title || '', desc: v.desc || '', cover: img(v.cover), src: '', poster: '' }));
const MENU = {}; (menu.categories || []).forEach(c => {
  MENU[c.name] = { ...(c.note ? { note: c.note } : {}), items: (c.items || []).map(i => ({ n: i.name, ...(i.detail ? { d: i.detail } : {}), p: String(i.price || ''), ...(i.spicy ? { hot: 1 } : {}) })) };
});
const LEVELS = levels.list || [];
const FAQ = (faq.list || []).map(x => [x.q, x.a]);
const J = o => JSON.stringify(o, null, 1).replace(/</g, '\\u003c');
const DATA = `/* 這段由 build.js 從 data/ 自動產生，請到後台修改，不要直接改這裡 */
const SHOP = ${J(SHOP)};
const SIGNATURE = ${J(SIGNATURE)};
const NOODLES = ${J(NOODLES)};
const VIDEOS = ${J(VIDEOS)};
const MENU = ${J(MENU)};
const LEVELS = ${J(LEVELS)};
const FAQ = ${J(FAQ)};
`;

// ---- 給 Google 看的結構化資料 ----
const DAYNAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ohs = [];
for (let i = 0; i < 7; i++) if (H[i]) H[i].split(',').forEach(r => { const [o, c] = r.split('-'); if (o && c) ohs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: DAYNAME[i], opens: o, closes: c }); });
const tel = '+886-' + String(shop.phone || '').replace(/^0/, '').replace(/\s/g, '');
const allPrices = Object.values(MENU).flatMap(c => c.items.map(i => +i.p)).filter(Boolean);
const rest = {
  '@context': 'https://schema.org', '@type': 'Restaurant', '@id': U + '#restaurant',
  name: shop.name + (shop.branch ? '｜' + shop.branch : ''), alternateName: '八辛吉',
  description: '台南永康八辛吉手作麻辣燙，八種辛香料熬製手作麻辣湯頭，招牌鴨血、臭豆腐、讚岐烏龍麵。提供多種辣度與不辣選擇，歡迎內用、外帶及外送。',
  url: U, image: [U + 'og-image.jpg', U + 'img/storefront.jpg', U + 'img/hero.jpg'], logo: U + 'img/logo.png', telephone: tel,
  address: { '@type': 'PostalAddress', streetAddress: String(shop.address || '').replace(/^.*?區/, ''), addressLocality: (String(shop.address).match(/[^市]+區/) || [''])[0], addressRegion: (String(shop.address).match(/^..市/) || ['臺南市'])[0], postalCode: '710', addressCountry: 'TW' },
  geo: { '@type': 'GeoCoordinates', latitude: 23.0257796, longitude: 120.2596072 },
  servesCuisine: ['麻辣燙', '麻辣鍋', '麻辣鴨血', '臭豆腐', '讚岐烏龍麵'],
  priceRange: 'NT$100–200', paymentAccepted: '現金', currenciesAccepted: 'TWD', acceptsReservations: false,
  openingHoursSpecification: ohs,
  hasMenu: { '@type': 'Menu', name: '八辛吉菜單', hasMenuSection: Object.entries(MENU).map(([k, c]) => ({ '@type': 'MenuSection', name: k, hasMenuItem: c.items.filter(i => i.p).map(i => ({ '@type': 'MenuItem', name: i.n, ...(i.d ? { description: i.d } : {}), offers: { '@type': 'Offer', price: i.p, priceCurrency: 'TWD' } })) })) },
  sameAs: [shop.facebook, shop.instagram, shop.tiktok, shop.youtube, shop.lineUrl].filter(Boolean),
};
const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
const web = { '@context': 'https://schema.org', '@type': 'WebSite', name: shop.name, url: U, inLanguage: 'zh-Hant-TW' };
const JSONLD = [rest, faqLd, web].map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');

// ---- 預先寫進網頁的文字（讓 Google 不用跑程式也看得到）----
const first = Object.values(MENU)[0] || { items: [] };
const MENU_STATIC = first.items.map(i => `<div class="mitem"><span class="n">${esc(i.n)}${i.d ? ` <small class="hint">（${esc(i.d)}）</small>` : ''}</span><span class="dots"></span><span class="p">${i.p ? '$' + esc(i.p) : ''}</span></div>`).join('');
const FAQ_STATIC = FAQ.map(([q, a]) => `<details class="faq"><summary>${esc(q)}</summary><div>${esc(a)}</div></details>`).join('');
const NOTICE = notice.show && notice.text ? `<div class="notice" role="status">📢 ${esc(notice.text)}${notice.link ? `<a href="${esc(notice.link)}" target="_blank" rel="noopener">看詳情</a>` : ''}</div>` : '';
const up = String(menu.updated || '').slice(0, 10).replace(/-/g, '/');

let html = fs.readFileSync(path.join(__dirname, 'src', 'template.html'), 'utf8');
const put = (k, v) => { if (!html.includes(k)) throw new Error('template 缺少 ' + k); html = html.split(k).join(v); };
put('/*__DATA__*/', DATA); put('{{JSONLD}}', JSONLD); put('{{MENU_STATIC}}', MENU_STATIC); put('{{FAQ_STATIC}}', FAQ_STATIC); put('{{NOTICE}}', NOTICE); put('{{UPDATED}}', up);
// 網頁上預先填好的店家文字
['name', 'branch', 'slogan', 'intro', 'address', 'phone', 'parking'].forEach(k => {
  html = html.replace(new RegExp(`(data-c="${k}"[^>]*>)[^<]*(<)`, 'g'), (m, a, b) => a + esc(shop[k] || '') + b);
});

// ---- 輸出 ----
const out = path.join(__dirname, 'dist');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
fs.writeFileSync(path.join(out, 'index.html'), html);
const copy = (src, dst) => { if (!fs.existsSync(src)) return; if (fs.statSync(src).isDirectory()) { fs.mkdirSync(dst, { recursive: true }); fs.readdirSync(src).forEach(f => copy(path.join(src, f), path.join(dst, f))); } else fs.copyFileSync(src, dst); };
['img', 'admin', 'og-image.jpg', 'robots.txt'].forEach(f => copy(path.join(__dirname, f), path.join(out, f)));
const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${U}</loc><lastmod>${today}</lastmod></url>\n</urlset>\n`);
console.log('OK 網站已產生到 dist/');
