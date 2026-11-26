# 八辛吉手作麻辣燙 官網

- 網站：https://baxinji.pages.dev/（Cloudflare Pages，每次 push 自動上線）
- 後台：https://baxinji.pages.dev/admin/（DecapBridge：Google／Email 登入）
- 內容在 `data/`（後台改的就是這裡），版面在 `src/template.html`，`node build.js` 產生網站到 `dist/`。
- 網址在 build.js 的 SITE_URL（或主機環境變數 SITE_URL）。
- 舊網址 baxinji.netlify.app 由 netlify.toml 301 轉到新網址。
