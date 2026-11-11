词练 · 雅思 500 高频词（独立 Vue 版静态构建）
================================================

本目录是 word-quiz 的构建产物，纯静态，无需 Node 即可部署。
把本目录全部上传到静态托管（GitHub Pages / Cloudflare Pages / Netlify / Nginx 等）即可。

本地预览（任选一种）：
  npx serve .
  python -m http.server 5173
  node ../ielts22-static/serve.js   # 若与本包放在同一目录结构下

注意：直接双击 index.html 可能因浏览器限制无法加载资源，建议用静态服务器。
学习记录保存在浏览器 localStorage，换域名/端口不会自动迁移。
公开上线前请确认词库与素材的版权与授权。
