# 雅思学习台 · IELTS Study Workbench

本地优先的雅思备考静态工具。纯 HTML + Tailwind CSS v3 + 原生 JavaScript，无后端、无账号、无第三方运行时请求（Tailwind 已本地编译）。学习记录保存在浏览器 `localStorage`。

> `word.md` 中的 500 条词库已接入本应用的「单词」模块，词书名为 **雅思500高频乱序词**，可与原有示例词书切换。另有一个独立的 Vue 3 + Vite + ECharts 练习应用作为可选示例，见 [`word-quiz/README.md`](word-quiz/README.md)。

## 快速开始

浏览器不允许通过 `file://` 直接 `fetch` 本地 JSON，所以需要用一个静态 HTTP 服务打开：

```bash
# Node 18+（本项目使用 Node 24 验证）
npm run dev
# 打开 http://localhost:8000
```

`npm run dev` 会先执行 `npm run parse:words`，从根目录 `word.md` 生成 `data/ielts500.json`，再启动静态服务器。也可以直接运行 `node serve.js`（使用已生成的词库文件）。

只更新词库时：

```bash
npm run parse:words
```

Windows 也可以运行：

```powershell
.\start-local.ps1
```

`serve.js` 只是本地预览用的静态文件服务器，不处理任何数据，不是应用后端。部署到静态托管（GitHub Pages / Cloudflare Pages / Netlify / Nginx）时不需要它。

### 修改样式后重新编译 Tailwind

```bash
npm install        # 首次
npm run build:css  # 生成 tailwind.css
```

`index.html` 直接引用 `tailwind.css`，因此部署时不需要 Node，也不依赖 CDN。开发样式时可运行 `npm run watch:css`。

## 目录结构

```
ielts22/
├── .gitignore              # 忽略依赖、含密钥的本地脚本与备份
├── index.html              # 页面骨架、首屏主题脚本
├── sm2.js                  # 标准 SM-2 算法（纯函数，可用 Node 测试）
├── app.js                  # 视图、状态、路由、计时器、备份
├── tailwind.css            # Tailwind 编译产物（部署时需要）
├── src/input.css           # Tailwind 源文件与少量自定义组件样式
├── tailwind.config.js      # Tailwind v3 配置（深色模式、配色、字体）
├── package.json            # 仅用于构建 CSS 与本地预览
├── package-lock.json       # 锁定 Tailwind 版本
├── serve.js                # 零依赖静态服务器（仅本地预览）
├── start-local.ps1         # Windows 一键预览
├── word.md                 # 500 词原始词库（单词模块的数据源）
├── scripts/
│   └── parse-word-md.mjs   # word.md → data/ielts500.json
├── word-quiz/              # 可选的独立 Vue 3 + Vite + ECharts 练习应用
├── data/
│   ├── wordlist.json       # 原有示例词书
│   ├── ielts500.json       # 自动生成：雅思500高频乱序词（500 条）
│   ├── synonym.json        # 同义替换配对
│   ├── longsentence.json   # 长难句解析
│   ├── writing.json        # 小作文句型、大作文词组、连接词、自查表
│   └── speaking.json       # Part 1/2/3 素材
└── README.md
```

## 单词模块：雅思500高频乱序词

主应用的「单词」页新增词书 **雅思500高频乱序词**，与原有示例词书并列，切换即可使用。

### 数据解析与导入

- 源文件：根目录 `word.md`，固定 500 条。
- 解析脚本：`scripts/parse-word-md.mjs`。
- 生成文件：`data/ielts500.json`（已提交，直接打开项目也能用）。
- 重新生成：`npm run parse:words`；`npm run dev` 会自动执行。

脚本只提取 word.md 已有的字段，不新增、不删除词汇：

| 源字段 | 生成字段 | 说明 |
| --- | --- | --- |
| 英文 | `word` | 词条拼写 |
| `/.../` | `phonetic` | 多个音标用空格连接 |
| `n.` / `v.` / `adj.` | `pos` | 组合为 `n./v.` |
| 中文释义 | `meaning` | 去掉词性标记，多个义项用 `；` 连接 |
| `（analyze）` 等 | `synonyms` | 只保留括号内的英文拼写变体 |

- 每条词条同时生成 `cloze: "______（n./v. 中文释义）"` 和 `clozeAnswer`，供现有 B 模式（挖空猜词）使用。word.md 没有例句，因此不虚构例句。
- `tags` 为空：word.md 没有标签分类。`app.js` 的 `tagMatch` 对无标签词放行，标签筛选不会把整本词书隐藏；标签筛选对该词书不生效。

### 练习方式

沿用「单词」模块原有交互，没有新增页面：

| 需求 | 现有入口 |
| --- | --- |
| 英译汉 | A 模式：显示英文 + 音标，回忆后显示释义并自评 |
| 汉译英 | 打开“拼写默写”后，A 模式显示中文释义，输入英文单词 |
| 选词填空 | B 模式：根据 `cloze` 提示填入单词 |
| 错题 | 自评 1/2 档自动进入错词本，4 档移出 |
| 统计 | 仪表盘与词书进度照常统计 |

### 随机与隔离

- 选中雅思词书时，`buildQueue()` 会先随机抽取当日新词，再打乱整轮题目；不会混入其他词书的单词。
- 错词本、收藏夹、复习队列均按当前词书过滤；切换词书后只显示该词书的记录。
- 词书内 500 条全部参与，重复词条 `appetite`、`colleague` 原样保留（498 个不同单词），与 word.md 一致。
- 每日新词上限默认 20；想一次练完整本，可在词书设置中把上限调到 500。

## 可选：独立 Vue 练习应用

`word-quiz/` 是独立于上方原生应用的新应用，严格使用 `word.md` 中固定的 500 条词库：

```bash
cd word-quiz
npm install
npm run dev
# 打开 http://localhost:5173
```

包含英译汉、汉译英、选词填空、随机混合、错题本、练习记录、ECharts 正确率统计和移动端布局。详细数据格式、判分规则和部署说明见 [`word-quiz/README.md`](word-quiz/README.md)。

## 功能

- **单词**：A 模式（英 → 中 + 解析）、B 模式（挖空猜词）、可选拼写默写；标签筛选、词书切换（示例词书 / 雅思500高频乱序词）、每日新词上限。
- **SM-2**：四档自评严格映射到质量分 q=1/3/4/5；间隔按 1 → 6 → `round(I × EF)`；EF 每次评分都更新，下限 1.3。
- **错词本**：评 1/2 档自动加入，评 4 档自动移出；也可手动移出。
- **收藏夹**、**英式 TTS**（Web Speech API，优先 `en-GB`）、**JSON 备份导出/导入**。
- **同义替换**：左右配对选择题，配对结果与单词库联动。
- **长难句**：主干、从句标注、句内生词（关联词库）、译文与自测要点。
- **写作**：小作文五类句型挖空仿写、大作文话题词块与仿写、逻辑连接词、四大维度自查表、AI 批改入口（未接 API）。
- **口语**：Part 1/3 问题 + 思路 + 词块；Part 2 题卡 + 1 分钟准备 / 2 分钟作答计时。
- **模考**：阅读 60 / 听力 30 / 写作 60 分钟预设与自定义计时，切换页面仍继续，结束后记录。
- **仪表盘**：今日新词、今日复习、连续打卡、掌握词数、7 天趋势、各模块记录。
- **深色模式**：浅色 / 深色 / 跟随系统。

## 数据格式

所有题库与代码分离。字段如下，新增数据时保持同名即可。

### `data/wordlist.json`

```json
{
  "books": [
    {
      "id": "demo-academic",
      "name": "示例词书",
      "words": [
        {
          "id": "w001",
          "word": "mitigate",
          "phonetic": "/ˈmɪtɪɡeɪt/",
          "pos": "vt.",
          "meaning": "减轻，缓和",
          "collocations": ["mitigate the impact of"],
          "synonyms": ["alleviate"],
          "example": "…",
          "cloze": "… ______ …",
          "clozeAnswer": "mitigate",
          "pitfall": "…",
          "tags": ["reading", "writing"]
        }
      ]
    }
  ]
}
```

`tags` 取值：`reading` / `listening` / `writing` / `speaking`。`clozeAnswer` 用于挖空处的实际词形，缺省时取 `word`。

### `data/ielts500.json`

由 `scripts/parse-word-md.mjs` 自动生成，结构如下（`book` 会被合并进 `state.data.wordlist.books`）：

```json
{
  "meta": {
    "source": "word.md",
    "bookId": "ielts-500",
    "total": 500,
    "unique": 498,
    "duplicates": [{ "word": "appetite", "count": 2 }]
  },
  "book": {
    "id": "ielts-500",
    "name": "雅思500高频乱序词",
    "words": [
      {
        "id": "i001",
        "word": "advocate",
        "phonetic": "/ˈædvəkət/ /ˈædvəkeɪt/",
        "pos": "n./v.",
        "meaning": "支持者；提倡",
        "collocations": [],
        "synonyms": [],
        "example": "",
        "cloze": "______（n./v. 支持者；提倡）",
        "clozeAnswer": "advocate",
        "pitfall": "",
        "tags": []
      }
    ]
  }
}
```

字段与 `wordlist.json` 兼容；`id` 使用 `i001`–`i500`，与示例词书的 `w001` 不冲突。`tags` 为空表示原词库没有标签，`app.js` 不会用标签筛选隐藏这些词。

### `data/synonym.json`

`sets[].pairs[]`：`from`、`to`、`fromCn`、`toCn`、可选 `wordId`（关联词库）。

### `data/longsentence.json`

`sentences[]`：`sentence`、`translation`、`skeleton`、`clauses[{text,type,note}]`、`words`（词库 id 数组）、`glossary[{term,cn}]`、`question`、`reference`。

### `data/writing.json`

- `task1Patterns[]`：`category`（trend / comparison / proportion / process / map）、`pattern`、`cn`、`cloze`、`answer`、`tip`
- `task2Phrases[]`：`topic`、`phrase`、`cn`、`example`、可选 `drill{cloze,answer}`
- `linkingWords[]`：`group`、`words[]`、`usage`
- `checklist[]`：`dimension`（TR / CC / LR / GRA）、`item`

### `data/speaking.json`

- `part1[]` / `part3[]`：`question`、`hints[]`、`keywords[]`（词库 id）、`sample`
- `part2[]`：`cueCard`、`points[]`、`followUp[]`、`keywords[]`、`sample`

## 本地存储键

| 键 | 内容 |
| --- | --- |
| `ielts.v1.settings` | 每日上限、词书、标签、模式、拼写开关、主题 |
| `ielts.v1.cards` | 每个单词的 SM-2 状态（reps / ef / interval / due / lapses） |
| `ielts.v1.daily` | 按日期统计的学习量 |
| `ielts.v1.wrong` | 错词本（`bookId::wordId`） |
| `ielts.v1.favorites` | 收藏夹 |
| `ielts.v1.modules` | 各模块累计记录 |
| `ielts.v1.checklist` | 写作自查勾选 |

`ielts.v1.cards` / `ielts.v1.wrong` 的键均为 `bookId::wordId`，雅思词书的记录形如 `ielts-500::i001`。错词本、收藏夹和复习队列按当前选中的词书过滤，切换词书后不会混入其他词书的单词。

更换设备或清理浏览器前，请在「设置 → 数据备份」导出 JSON。

## 版权风险（公开上线前必须处理）

演示素材均为原创或通用表达，但以下位置在替换为正式素材后存在版权风险：

1. `data/wordlist.json` — 来自《剑桥雅思》《柯林斯》《牛津》等词书的释义、例句、搭配。
2. `data/longsentence.json` — 剑桥真题原文、雅思官方材料、商业备考书长难句。
3. `data/speaking.json` — 商业备考书高分答案、机经回忆题库。
4. `data/writing.json` — 官方 band descriptors、范文、商业书句型库；自查表若直接引用官方评分描述也需注意。
5. `data/synonym.json` — 商业备考书的同义替换清单。
6. `data/ielts500.json` — 由根目录 `word.md` 生成；公开部署前请确认该 500 词词库的来源与授权。

每个 JSON 顶部的 `_copyrightWarning` 字段也标明了对应风险。上线前请替换为自有、原创或已获授权的内容。

## AI 功能

写作页保留了「AI 批改（预留）」面板：文本框、字数统计、提交按钮与说明，但不发送任何网络请求。后续可在 `app.js` 的 `ai:check` 分支接入自己的 API 代理；不要在前端硬编码密钥。

## 已知限制

- 数据存于当前浏览器的当前 origin；`localhost:8000` 与部署域名、不同端口的存储不互通。
- Web Speech API 的语音取决于操作系统安装的语音包；没有 `en-GB` 时会退回其他英语语音。
- 词库列表一次性渲染，正式导入数千词后可考虑分页/虚拟列表。
- 雅思 500 词书没有例句、搭配和标签：B 模式使用中文释义挖空，标签筛选对该词书不生效。
- 无 Service Worker，离线使用需静态文件本地可访问（已无外部运行时请求）。
