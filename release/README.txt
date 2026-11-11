雅思学习台 · 发布包说明
========================

推荐发送 / 部署：
  ielts22-static.zip（约 71 KB）
    主应用静态版，解压后直接上传到任意静态托管即可；本地预览见包内 README.txt。
    已排除 node_modules、独立 Vue 应用、开发脚本和 word.md，题库 JSON 已压缩为单行。

需要源码 / 继续开发：
  ielts22-source.zip（约 416 KB）
    主应用 + 可选 word-quiz 独立 Vue 应用的源码与构建产物，已排除所有 node_modules。
    解压后在各目录运行 npm install 即可恢复依赖。

可选的独立 Vue 版（仅构建产物）：
  word-quiz-static.zip（约 246 KB）
    不需要 Node，解压后作为静态站点部署。

注意：
  - 未包含 start-claude.ps1（内含明文 API Key）。
  - 未包含任何 node_modules，压缩包从 124 MB 降到 1 MB 以内。
  - 公开上线前请确认题库素材版权，详见各 JSON 顶部的 _copyrightWarning。
