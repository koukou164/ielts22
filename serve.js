#!/usr/bin/env node
/* ============================================================================
 * serve.js — 零依赖静态文件服务器（仅用于本地预览）
 * ----------------------------------------------------------------------------
 * 浏览器禁止通过 file:// 直接 fetch 本地 JSON，因此需要用 HTTP 打开本项目。
 * 这个脚本不是应用后端：它只读取并返回静态文件，不做任何数据处理。
 *
 * 用法：
 *   node serve.js
 * 然后打开 http://localhost:8000
 *
 * 自定义端口：
 *   PORT=8080 node serve.js
 * ========================================================================== */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }

  if (pathname === '/') pathname = '/index.html';

  const filePath = path.resolve(ROOT, '.' + pathname);
  // 阻止路径穿越，只允许访问项目目录内的文件
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, buffer) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found: ' + pathname);
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(buffer);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('端口 ' + PORT + ' 已被占用，请换一个端口：PORT=8080 node serve.js');
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log('雅思学习台 · 本地预览');
  console.log('  http://localhost:' + PORT);
  console.log('按 Ctrl+C 停止。');
});
