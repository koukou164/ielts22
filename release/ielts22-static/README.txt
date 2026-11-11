雅思学习台 · 静态发布版
================================

【本地打开】
浏览器不允许直接双击 index.html 后读取本地 JSON，需要用一个静态服务器。

方式一（推荐，需 Node 18+）：
  在当前文件夹打开终端，运行：
    node serve.js
  然后浏览器打开 http://localhost:8000

方式二（Windows）：
  右键 start-local.ps1 →「使用 PowerShell 运行」。

方式三（任意静态服务器）：
  把本文件夹全部上传到 GitHub Pages、Cloudflare Pages、Netlify、Nginx 等静态托管，
  用分配的网址访问。不要只上传 index.html，data/ 目录必须一起上传。

【内容】
  index.html        页面入口
  app.js            应用逻辑
  sm2.js            SM-2 间隔重复算法
  tailwind.css      已编译样式（无 CDN 依赖）
  data/*.json       题库；ielts500.json 为雅思 500 词词库
  serve.js          仅本地预览用的零依赖静态服务器
  start-local.ps1   Windows 一键本地预览

【数据】
  学习记录保存在浏览器 localStorage，不上传服务器。
  换浏览器、换域名/端口或清理站点数据后，记录不会自动迁移。
  公开上线前请确认 data/ 中题库素材的版权与授权（每个 JSON 顶部有提示）。

【体积说明】
  本包已排除 node_modules、word-quiz 独立应用、开发脚本和 word.md；
  所有 JSON 已压缩为单行，解压后约数百 KB。
