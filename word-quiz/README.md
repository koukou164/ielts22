# 词练 · 雅思 500 高频词

基于 `word.md` 中 500 条词库的单词练习应用。Vue 3 + Vite + ECharts，纯前端、本地存储、移动端优先。

> 主应用（`../index.html`）的「单词」模块已通过 `data/ielts500.json` 接入同一套 500 词，并支持词书切换。本目录保留为可选的独立 Vue 版本。

## 启动

```bash
cd D:\ielts22\word-quiz
npm install
npm run dev
```

打开 **http://localhost:5173**。

`npm run dev` 会先执行 `npm run parse:words`，从上级目录的 `word.md` 重新生成 `src/data/words.json`，再启动 Vite。

常用命令：

```bash
npm run parse:words   # 只重新解析 word.md
npm run build         # 生成 dist/（会自动重新解析词库）
npm run preview       # 预览 dist/
```

要求 Node 18+（本项目在 Node 24 下构建验证）。

## 功能

- **三种题型**
  - 英译汉：显示英文和音标，输入中文释义。
  - 汉译英：显示中文释义，输入英文单词。
  - 选词填空：根据释义从 4 个单词选项中选出正确项。
- **随机混合 / 专项切换**：每轮将 500 条词条重新洗牌；混合模式三种题型数量尽量均衡。
- **错题本**：答错自动收录，重练答对自动移出；支持按题型筛选、单题重练、全部重练、手动移出和清空。
- **练习记录**：每次作答都记录题型、你的答案、正确答案和时间；可按题型/结果筛选。
- **正确率统计**：总正确率环形图、分题型柱状图、近 7 天答题量与正确率趋势图（ECharts，统计页按需加载）。
- **本地存储**：刷新、关闭浏览器后记录仍在；没有后端，也不会上传数据。
- **移动端适配**：390px 宽度下无横向溢出，输入框、选项和按钮均按移动端触控尺寸设计。

## 判分规则

### 英译汉

按词库中的中文义项判分，答对任一义项即可，并允许包含关系：

- `mitigate` → 答“减轻”或“缓和”都正确。
- `artificial` → 答“人造的”“人造”都正确。
- `exert` → 答“施加”“施加影响”都正确。

标点、空格和全半角差异会被忽略。判分不是语义模型，遇到非常规同义表达时以参考释义为准。

### 汉译英

- 忽略大小写、首尾标点和多余空格。
- 接受词库中**中文义项集合完全相同**的同义词。例如 `assess` 的题目输入 `evaluate` 也判对；`conserve` / `preserve` 同理。
- 接受 `word.md` 括号中标注的拼写变体，例如 `analyse` 接受 `analyze`，`recognise` 接受 `recognize`。

### 选词填空

- 每题 4 个不重复选项，正确选项一定在选项中。
- 干扰项优先同词性，并排除中文义项有重叠的单词，避免出现两个都说得通的选项。
- 选项顺序随机，题干不出现目标英文单词。

## 题库来源

`D:\ielts22\word.md` 是唯一词库来源，解析脚本不会新增词汇：

- 词库共 **500 条**，格式为 `编号. 单词 /音标/ 词性. 中文释义`。
- 解析出 **498 个不同单词**：`appetite`（第 32、50 条）和 `colleague`（第 93、95 条）各重复一次。为遵守“固定 500 条、不增删词”的要求，脚本原样保留，出题仍按 500 条洗牌；错题本按“单词 + 题型”合并，重复词不会产生两条相同错题。
- 脚本会校验：恰好 500 条、编号不重复、每条都有音标/词性/中文释义、没有无法解析的行。任意一项不满足会中止构建并指出问题行，防止词库被误改。
- 生成文件：`src/data/words.json`（已提交，直接打开项目也能运行）。

如果以后修改 `word.md`，重新运行 `npm run parse:words`（或重启 dev / 重新 build）即可。

## 目录结构

```
word-quiz/
├── index.html
├── package.json
├── vite.config.js
├── scripts/
│   └── parse-word-md.mjs       # word.md → src/data/words.json
├── src/
│   ├── main.js
│   ├── App.vue                 # 顶部导航、页面切换、Toast
│   ├── style.css               # 全局样式与设计变量
│   ├── data/
│   │   └── words.json          # 自动生成，500 条词库
│   ├── lib/
│   │   ├── quiz.js             # 洗牌、组题、判分、同义词组
│   │   ├── store.js            # localStorage 状态与错题逻辑
│   │   ├── stats.js            # 正确率、7 天趋势计算
│   │   ├── charts.js           # ECharts 配置
│   │   └── toast.js
│   ├── components/
│   │   ├── BaseChart.vue       # ECharts 封装 + 自适应
│   │   └── EmptyState.vue
│   └── views/
│       ├── PracticeView.vue    # 三种题型、随机抽题、错题重练
│       ├── WrongBookView.vue
│       ├── StatsView.vue
│       └── RecordsView.vue
└── README.md
```

## 本地存储

存储键：`ielts.word-quiz.v1`，内容：

- `settings.mode`：上次选择的题型。
- `records`：作答记录，最多保留最近 3000 条。
- `wrong`：错题本，按“单词 + 题型”去重。

统计页完全由记录实时计算，不额外存储统计值。数据绑定当前浏览器和当前访问域名/端口；换设备、清理站点数据或换端口后不会自动迁移。

## 构建与部署

```bash
npm run build
```

把 `dist/` 上传到任意静态托管即可（GitHub Pages、Cloudflare Pages、Netlify、Nginx 等）。`vite.config.js` 使用 `base: './'`，可以部署在子路径下；生产环境不需要 Node 和后端。

注意：

- 本项目没有 Service Worker；部署后离线访问取决于静态托管/CDN 缓存。
- ECharts 只在第一次打开“统计”页时加载，练习页首屏不会下载图表库。
- 公开上线前请自行确认 `word.md` 词库的版权与授权。

## 验证

已用无头 Chrome 跑过 53 项检查：三种题型判分、随机换题、错题收录/重练/自动移出、统计图表渲染、练习记录、刷新持久化、移动端无横向溢出、无运行时异常。
