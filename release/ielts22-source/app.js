'use strict';

/* ============================================================================
 * 雅思学习台 · app.js
 * ----------------------------------------------------------------------------
 * 纯前端、无后端：所有学习记录保存在 localStorage。
 * 题库全部来自 ./data/*.json，与代码分离，方便替换素材。
 *
 * 代码结构
 *   1. 常量与工具
 *   2. 本地存储与全局状态
 *   3. 词库索引与 SM-2 排程辅助
 *   4. 通用 UI 片段
 *   5. 页面视图
 *   6. 单词学习会话
 *   7. 计时器（模考 / 口语）
 *   8. 备份、主题、事件与路由
 *
 * 版权提示（公开上线前必须处理）
 *   - data/ 下的所有素材仅为演示用的少量样例；正式词库、真题长难句、
 *     雅思官方评分描述、商业备考书范文/答案都可能受版权保护。
 *   - 接入正式素材前，请确认授权或使用原创内容。
 *
 * AI 功能
 *   - 写作页保留了 AI 批改面板与入口，但本版本不接入任何 API。
 * ========================================================================== */

/* =========================== 1. 常量与工具 =========================== */

const PREFIX = 'ielts.v1.';
const STORAGE_KEYS = {
  settings: PREFIX + 'settings',
  cards: PREFIX + 'cards',
  daily: PREFIX + 'daily',
  wrong: PREFIX + 'wrong',
  favorites: PREFIX + 'favorites',
  modules: PREFIX + 'modules',
  checklist: PREFIX + 'checklist'
};

// 由 scripts/parse-word-md.mjs 从根目录 word.md 生成，见 data/ielts500.json。
const IELTS_BOOK_ID = 'ielts-500';

const TAGS = [
  { id: 'reading', label: '阅读' },
  { id: 'listening', label: '听力' },
  { id: 'writing', label: '写作' },
  { id: 'speaking', label: '口语' }
];
const TAG_LABEL = {};
TAGS.forEach(function (t) { TAG_LABEL[t.id] = t.label; });

const DEFAULT_SETTINGS = {
  dailyNewLimit: 20,
  bookId: null,
  tags: TAGS.map(function (t) { return t.id; }),
  mode: 'A',
  spelling: false,
  theme: 'system'
};

function defaultModules() {
  return {
    synonym: { sessions: 0, pairs: 0, mistakes: 0 },
    sentence: { studied: 0 },
    writing: { drills: 0 },
    speaking: { cards: 0 },
    mock: { sessions: 0, minutes: 0 },
    last: {}
  };
}

const W1_CATS = { trend: '趋势', comparison: '对比', proportion: '占比', process: '流程', map: '地图' };
const DIMENSIONS = { TR: '任务回应', CC: '连贯与衔接', LR: '词汇资源', GRA: '语法多样与准确' };

const NAV = [
  { id: 'dashboard', label: '仪表盘', icon: 'dashboard' },
  { id: 'words', label: '单词', icon: 'words' },
  { id: 'synonym', label: '同义替换', icon: 'synonym' },
  { id: 'sentence', label: '长难句', icon: 'sentence' },
  { id: 'writing', label: '写作', icon: 'writing' },
  { id: 'speaking', label: '口语', icon: 'speaking' },
  { id: 'mock', label: '模考', icon: 'mock' },
  { id: 'settings', label: '设置', icon: 'settings' }
];

const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="4" rx="1.5"/><rect x="14" y="10" width="7" height="11" rx="1.5"/><rect x="3" y="13" width="7" height="8" rx="1.5"/>',
  words: '<path d="M4 6h16M4 12h10M4 18h13"/>',
  synonym: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  sentence: '<path d="M4 5h16M4 11h16M4 17h9"/>',
  writing: '<path d="M4 20l4-1 10-10a2.1 2.1 0 0 0-3-3L5 16z"/>',
  speaking: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  mock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 14a1.7 1.7 0 0 0-1.6-1H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 2.6 7a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 7 2.6h.1A1.7 1.7 0 0 0 8.6 1V1a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 2.6a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 19.4 7v.1a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  speaker: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  star: '<path d="m12 3 2.7 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.3 6.5 20.2l1.1-6.2L3 9.6l6.3-.9z"/>',
  arrowLeft: '<path d="M19 12H5m7-7-7 7 7 7"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/>',
  upload: '<path d="M12 21V9m0 0 4 4M12 9 8 13M4 3h16"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>'
};

const CARD = 'rounded-2xl border border-ink-200/80 bg-white dark:border-ink-800 dark:bg-ink-900/40';
const INPUT = 'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 dark:focus:border-brand-500 dark:focus:ring-brand-900/50';
const BTN = 'inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:bg-ink-800';
const BTN_SM = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800';
const BTN_PRIMARY = 'inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40';
const MUTED = 'text-ink-500 dark:text-ink-400';

/* ------------------------------- 工具 ------------------------------- */

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

function pad2(n) { return n < 10 ? '0' + n : String(n); }

function toDateStr(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
function todayStr() { return toDateStr(new Date()); }

function addDaysStr(dateStr, n) {
  const p = String(dateStr).split('-').map(Number);
  const dt = new Date(p[0], p[1] - 1, p[2]);
  dt.setDate(dt.getDate() + n);
  return toDateStr(dt);
}

function weekdayCN(dateStr) {
  const p = String(dateStr).split('-').map(Number);
  return '日一二三四五六'[new Date(p[0], p[1] - 1, p[2]).getDay()];
}

function fmtClock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return pad2(m) + ':' + pad2(s % 60);
}

function normAnswer(value) {
  return String(value == null ? '' : value)
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:"'“”‘’]/g, '')
    .replace(/\s+/g, ' ');
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function icon(name, cls) {
  return '<svg class="' + (cls || 'w-4 h-4') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
}

function stars(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

/* =========================== 2. 存储与状态 =========================== */

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[storage] 读取失败', key, err);
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    toast('本地存储写入失败：' + err.message);
  }
}

function loadSettings() {
  const raw = loadJSON(STORAGE_KEYS.settings, {});
  const s = Object.assign({}, DEFAULT_SETTINGS, raw && typeof raw === 'object' ? raw : {});
  s.tags = Array.isArray(s.tags) ? s.tags.filter(function (t) { return TAG_LABEL[t]; }) : [];
  s.dailyNewLimit = clamp(Number(s.dailyNewLimit) || 0, 0, 500);
  s.mode = s.mode === 'B' ? 'B' : 'A';
  s.spelling = !!s.spelling;
  if (['light', 'dark', 'system'].indexOf(s.theme) < 0) s.theme = 'system';
  return s;
}

function normalizeModules(raw) {
  const d = defaultModules();
  const r = raw && typeof raw === 'object' ? raw : {};
  const out = Object.assign({}, d, r);
  ['synonym', 'sentence', 'writing', 'speaking', 'mock'].forEach(function (k) {
    out[k] = Object.assign({}, d[k], (r[k] && typeof r[k] === 'object') ? r[k] : {});
  });
  out.last = (r.last && typeof r.last === 'object') ? r.last : {};
  return out;
}

function saveSettings() { saveJSON(STORAGE_KEYS.settings, state.settings); }
function saveModules() { saveJSON(STORAGE_KEYS.modules, state.modules); }
function saveCards() { saveJSON(STORAGE_KEYS.cards, state.cards); }
function saveDaily() { saveJSON(STORAGE_KEYS.daily, state.daily); }
function saveWrong() { saveJSON(STORAGE_KEYS.wrong, state.wrong); }
function saveFav() { saveJSON(STORAGE_KEYS.favorites, state.fav); }

const state = {
  data: {
    wordlist: { books: [] },
    synonym: { sets: [] },
    longsentence: { sentences: [] },
    writing: { task1Patterns: [], task2Phrases: [], linkingWords: [], checklist: [] },
    speaking: { part1: [], part2: [], part3: [] }
  },
  settings: loadSettings(),
  cards: loadJSON(STORAGE_KEYS.cards, {}),
  daily: loadJSON(STORAGE_KEYS.daily, {}),
  wrong: loadJSON(STORAGE_KEYS.wrong, []),
  fav: loadJSON(STORAGE_KEYS.favorites, []),
  modules: normalizeModules(loadJSON(STORAGE_KEYS.modules, {})),
  checklist: loadJSON(STORAGE_KEYS.checklist, {}),
  ui: {
    view: 'dashboard',
    wordTab: 'study',
    session: null,
    syn: null,
    sentenceIdx: 0,
    reveals: {},
    sentenceDone: new Set(),
    writingTab: 'task1',
    writingT1Cat: 'all',
    writingT2Topic: 'all',
    writingChecked: {},
    writingDone: new Set(),
    speakingTab: 'part1',
    speakingIdx: 0,
    speakingOpen: {},
    speakingDone: new Set()
  },
  forms: {}
};

/* ========================= 3. 词库与 SM-2 辅助 ========================= */

function books() {
  return (state.data.wordlist && Array.isArray(state.data.wordlist.books)) ? state.data.wordlist.books : [];
}

function currentBook() {
  const list = books();
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === state.settings.bookId) return list[i];
  }
  return list[0] || { id: 'empty', name: '（暂无词书）', words: [] };
}

function wordKey(bookId, wordId) { return bookId + '::' + wordId; }

function currentBookEntries() {
  const book = currentBook();
  return (book.words || []).map(function (w) {
    return Object.assign({}, w, { bookId: book.id, key: wordKey(book.id, w.id) });
  });
}

// 错词本 / 收藏夹按当前词书显示，切换词书时不混入其他词书的词。
function currentBookKeys(keys) {
  const prefix = currentBook().id + '::';
  return (keys || []).filter(function (key) { return key.indexOf(prefix) === 0; });
}

function allWordEntries() {
  const out = [];
  books().forEach(function (book) {
    (book.words || []).forEach(function (w) {
      out.push(Object.assign({}, w, { bookId: book.id, key: wordKey(book.id, w.id) }));
    });
  });
  return out;
}

function findWordById(id) {
  const list = allWordEntries();
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i];
  }
  return null;
}

function tagMatch(word) {
  const tags = state.settings.tags || [];
  if (!tags.length) return true; // 不选 = 全部
  const wordTags = word.tags || [];
  if (!wordTags.length) return true; // 词库本身没有标签分类时，不被标签筛选隐藏
  return wordTags.some(function (t) { return tags.indexOf(t) >= 0; });
}

function todayRecord() {
  const d = todayStr();
  return state.daily[d] || {};
}

function bumpDaily(field, n) {
  const d = todayStr();
  if (!state.daily[d]) state.daily[d] = {};
  state.daily[d][field] = (state.daily[d][field] || 0) + (n == null ? 1 : n);
  saveDaily();
}

function touchModule(name) {
  state.modules.last = state.modules.last || {};
  state.modules.last[name] = todayStr();
  saveModules();
}

function calcStreak() {
  function active(date) {
    const rec = state.daily[date];
    if (!rec) return false;
    return ['newWords', 'reviews', 'synonym', 'sentence', 'writing', 'speaking', 'mock'].some(function (k) {
      return (rec[k] || 0) > 0;
    });
  }
  let day = todayStr();
  let count = 0;
  if (!active(day)) day = addDaysStr(day, -1);
  while (active(day)) {
    count += 1;
    day = addDaysStr(day, -1);
  }
  return count;
}

function bookStats() {
  const book = currentBook();
  const today = todayStr();
  const pool = (book.words || []).filter(tagMatch).map(function (w) {
    return Object.assign({}, w, { bookId: book.id, key: wordKey(book.id, w.id) });
  });
  const due = pool.filter(function (w) {
    const c = state.cards[w.key];
    return c && c.due && c.due <= today;
  }).sort(function (a, b) {
    return String(state.cards[a.key].due || '').localeCompare(String(state.cards[b.key].due || ''));
  });
  const fresh = pool.filter(function (w) { return !state.cards[w.key]; });
  const used = todayRecord().newWords || 0;
  const allowance = Math.max(0, (Number(state.settings.dailyNewLimit) || 0) - used);
  return { book: book, pool: pool, due: due, fresh: fresh, allowance: allowance, used: used };
}

function markWrong(key, on) {
  const set = new Set(state.wrong);
  if (on) set.add(key); else set.delete(key);
  state.wrong = Array.from(set);
  saveWrong();
}

function toggleFav(key) {
  const idx = state.fav.indexOf(key);
  if (idx >= 0) state.fav.splice(idx, 1);
  else state.fav.push(key);
  saveFav();
}

function statusOf(key) {
  const c = state.cards[key];
  if (!c) return { text: '新词', cls: 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' };
  if ((c.interval || 0) >= 21) return { text: '已掌握', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' };
  return { text: '间隔 ' + (c.interval || 1) + ' 天', cls: 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400' };
}

/* =========================== 4. 通用 UI 片段 =========================== */

function pageHead(title, desc, right) {
  return '<div class="mb-6 flex flex-wrap items-end justify-between gap-3">' +
    '<div><h1 class="text-xl font-semibold tracking-tight">' + esc(title) + '</h1>' +
    (desc ? '<p class="mt-1 text-sm ' + MUTED + '">' + esc(desc) + '</p>' : '') + '</div>' +
    (right || '') + '</div>';
}

function navLink(item) {
  const active = state.ui.view === item.id;
  const base = 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm';
  const look = active
    ? 'bg-brand-600 text-white'
    : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-900';
  return '<a href="#/' + item.id + '" class="' + base + ' ' + look + '">' +
    icon(item.icon, 'w-4 h-4 shrink-0') + '<span>' + item.label + '</span></a>';
}

function tagChips(word) {
  return (word.tags || []).map(function (t) {
    return '<span class="rounded-full border border-ink-200 px-2 py-0.5 text-[10px] text-ink-500 dark:border-ink-700 dark:text-ink-400">' + (TAG_LABEL[t] || esc(t)) + '</span>';
  }).join(' ');
}

function speakBtn(word, label) {
  return '<button type="button" data-act="speak:word" data-word="' + esc(word) + '" class="' + BTN_SM + '" title="英式发音">' +
    icon('speaker', 'w-3.5 h-3.5') + (label ? '<span>' + esc(label) + '</span>' : '') + '</button>';
}

function starBtn(key, active) {
  return '<button type="button" data-act="word:fav" data-key="' + esc(key) + '" aria-label="' + (active ? '取消收藏' : '收藏') + '" class="rounded-md p-1.5 ' + (active ? 'text-amber-500' : 'text-ink-300 hover:text-amber-500 dark:text-ink-600') + '">' +
    icon('star', 'w-4 h-4' + (active ? ' fill-current' : '')) + '</button>';
}

function emptyState(text, sub) {
  return '<div class="' + CARD + ' px-6 py-10 text-center">' +
    '<p class="text-sm ' + MUTED + '">' + esc(text) + '</p>' +
    (sub ? '<p class="mt-1 text-xs text-ink-400">' + esc(sub) + '</p>' : '') + '</div>';
}

function wordChip(w) {
  if (!w) return '';
  const meaning = w.meaning || '';
  return '<button type="button" data-act="speak:word" data-word="' + esc(w.word) + '" title="' + esc(w.word + ' ' + meaning) + '" class="inline-flex max-w-full items-center gap-1.5 rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800">' +
    '<span class="font-medium">' + esc(w.word) + '</span>' +
    '<span class="max-w-[10rem] truncate text-ink-400">' + esc(meaning) + '</span>' +
    icon('speaker', 'w-3 h-3 opacity-50') + '</button>';
}

function keywordChips(ids) {
  const list = (ids || []).map(findWordById).filter(Boolean);
  if (!list.length) return '';
  return '<div class="mt-3 flex flex-wrap gap-2">' + list.map(wordChip).join('') + '</div>';
}

function segButton(active, label, attrs) {
  return '<button type="button" ' + (attrs || '') + ' class="rounded-md px-2.5 py-1 text-xs ' +
    (active ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800') + '">' + esc(label) + '</button>';
}

function tabs(items, activeId, action, dataName) {
  return '<div class="mb-4 flex flex-nowrap gap-1 overflow-x-auto rounded-lg border border-ink-200 bg-white p-1 dark:border-ink-800 dark:bg-ink-900/40">' +
    items.map(function (it) {
      return '<button type="button" data-act="' + action + '" data-' + dataName + '="' + esc(it.id) + '" class="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs ' +
        (it.id === activeId ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800') + '">' +
        esc(it.label) + (it.count != null ? ' <span class="opacity-70">' + it.count + '</span>' : '') + '</button>';
    }).join('') + '</div>';
}

/* ============================== 5. 页面视图 ============================== */

function renderView() {
  switch (state.ui.view) {
    case 'words': return renderWords();
    case 'synonym': return renderSynonym();
    case 'sentence': return renderSentence();
    case 'writing': return renderWriting();
    case 'speaking': return renderSpeaking();
    case 'mock': return renderMock();
    case 'settings': return renderSettings();
    default: return renderDashboard();
  }
}

/* ------------------------------ 仪表盘 ------------------------------ */

function renderDashboard() {
  const today = todayStr();
  const rec = todayRecord();
  const st = bookStats();
  const mastered = Object.keys(state.cards).filter(function (k) {
    return (state.cards[k].interval || 0) >= 21;
  }).length;
  const streak = calcStreak();
  const newLimit = Number(state.settings.dailyNewLimit) || 0;

  const week = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDaysStr(today, -i);
    const r = state.daily[date] || {};
    const nw = r.newWords || 0;
    const rv = r.reviews || 0;
    week.push({ date: date, nw: nw, rv: rv, total: nw + rv });
  }
  const maxTotal = Math.max(1, Math.max.apply(null, week.map(function (w) { return w.total; })));

  const m = state.modules;
  const modRows = [
    { label: '同义替换', value: m.synonym.sessions + ' 组 · ' + m.synonym.pairs + ' 对', last: m.last.synonym },
    { label: '长难句', value: m.sentence.studied + ' 句', last: m.last.sentence },
    { label: '写作仿写', value: m.writing.drills + ' 次', last: m.last.writing },
    { label: '口语练习', value: m.speaking.cards + ' 张卡片', last: m.last.speaking },
    { label: '模考计时', value: m.mock.sessions + ' 次 · ' + m.mock.minutes + ' 分钟', last: m.last.mock }
  ];

  return pageHead('仪表盘', '本地学习数据概览 · 所有记录只保存在这台设备',
    '<a href="#/words" class="' + BTN_SM + '">' + icon('words', 'w-3.5 h-3.5') + '开始学习</a>') +

    '<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">' +
      statCard('今日新词', (rec.newWords || 0) + ' / ' + newLimit, '上限可在设置中调整') +
      statCard('今日复习', String(rec.reviews || 0), '到期卡片 + 错词') +
      statCard('连续打卡', streak + ' 天', streak > 0 ? '保持节奏' : '今天开始第一天') +
      statCard('掌握词数', String(mastered), '复习间隔 ≥ 21 天') +
    '</div>' +

    '<div class="mt-4 grid gap-4 md:grid-cols-5">' +
      '<div class="' + CARD + ' p-5 md:col-span-3">' +
        '<div class="flex items-baseline justify-between">' +
          '<h2 class="text-sm font-medium">近 7 天学习量</h2>' +
          '<span class="text-[11px] text-ink-400">新词 <span class="inline-block h-2 w-2 rounded-sm bg-brand-500 align-middle"></span> · 复习 <span class="inline-block h-2 w-2 rounded-sm bg-brand-200 align-middle dark:bg-brand-800"></span></span>' +
        '</div>' +
        '<div class="mt-4 flex h-28 items-end gap-2">' +
          (week.some(function (w) { return w.total > 0; })
            ? week.map(function (w) {
                const h = w.total ? Math.max(4, Math.round(w.total / maxTotal * 88)) : 2;
                const nh = w.total ? Math.round(h * (w.nw / w.total)) : 0;
                return '<div class="flex h-full flex-1 flex-col items-center justify-end gap-1.5">' +
                  '<div class="flex w-full flex-col justify-end overflow-hidden rounded-sm" style="height:' + h + 'px">' +
                    '<div class="w-full bg-brand-200 dark:bg-brand-800" style="height:' + (h - nh) + 'px"></div>' +
                    '<div class="w-full bg-brand-500" style="height:' + nh + 'px"></div>' +
                  '</div>' +
                  '<span class="text-[10px] text-ink-400">' + weekdayCN(w.date) + '</span>' +
                '</div>';
              }).join('')
            : '<p class="flex h-full w-full items-center justify-center text-xs text-ink-400">还没有学习记录，完成第一轮后这里会出现趋势</p>') +
        '</div>' +
      '</div>' +
      '<div class="' + CARD + ' p-5 md:col-span-2">' +
        '<h2 class="text-sm font-medium">今日安排</h2>' +
        '<dl class="mt-3 space-y-2 text-sm">' +
          rowKV('待复习', st.due.length + ' 个') +
          rowKV('可学新词', Math.min(st.fresh.length, st.allowance) + ' 个') +
          rowKV('错词本', state.wrong.length + ' 个') +
          rowKV('收藏夹', state.fav.length + ' 个') +
        '</dl>' +
        '<button type="button" data-act="words:start" class="mt-4 w-full ' + BTN_PRIMARY + '">开始今日学习</button>' +
      '</div>' +
    '</div>' +

    '<div class="mt-4 grid gap-4 md:grid-cols-2">' +
      '<div class="' + CARD + ' p-5">' +
        '<h2 class="text-sm font-medium">各模块学习记录</h2>' +
        '<ul class="mt-3 divide-y divide-ink-100 dark:divide-ink-800">' +
          modRows.map(function (r) {
            return '<li class="flex items-center justify-between py-2.5 text-sm">' +
              '<span class="' + MUTED + '">' + r.label + '</span>' +
              '<span class="text-right"><span class="tabular-nums">' + r.value + '</span>' +
              (r.last ? '<span class="ml-2 text-[10px] text-ink-400">' + r.last.slice(5) + '</span>' : '') + '</span></li>';
          }).join('') +
        '</ul>' +
      '</div>' +
      '<div class="' + CARD + ' p-5">' +
        '<h2 class="text-sm font-medium">快速开始</h2>' +
        '<div class="mt-3 grid grid-cols-2 gap-2">' +
          quickLink('#/synonym', '同义替换', 'synonym') +
          quickLink('#/sentence', '长难句', 'sentence') +
          quickLink('#/writing', '写作专项', 'writing') +
          quickLink('#/speaking', '口语专项', 'speaking') +
          quickLink('#/mock', '模考计时', 'mock') +
          quickLink('#/settings', '数据备份', 'download') +
        '</div>' +
        '<button type="button" data-act="backup:export" class="mt-3 w-full ' + BTN_SM + '">' + icon('download', 'w-3.5 h-3.5') + '导出 JSON 备份</button>' +
      '</div>' +
    '</div>';
}

function statCard(label, value, sub) {
  return '<div class="' + CARD + ' p-4">' +
    '<div class="text-xs ' + MUTED + '">' + esc(label) + '</div>' +
    '<div class="mt-2 text-2xl font-semibold tabular-nums tracking-tight">' + esc(value) + '</div>' +
    '<div class="mt-1 text-[10px] text-ink-400">' + esc(sub) + '</div></div>';
}

function rowKV(k, v) {
  return '<div class="flex items-center justify-between"><dt class="' + MUTED + '">' + esc(k) + '</dt><dd class="tabular-nums">' + esc(v) + '</dd></div>';
}

function quickLink(href, label, iconName) {
  return '<a href="' + href + '" class="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-xs text-ink-600 hover:bg-ink-50 dark:border-ink-800 dark:text-ink-300 dark:hover:bg-ink-800">' +
    icon(iconName, 'w-4 h-4 text-ink-400') + '<span>' + esc(label) + '</span></a>';
}

/* ------------------------------- 单词 ------------------------------- */

function studyConfig() {
  const book = currentBook();
  const list = books();
  const bookTotal = (book.words || []).length;
  const bookUnique = new Set((book.words || []).map(function (w) { return String(w.word).toLowerCase(); })).size;
  const tagBoxes = TAGS.map(function (t) {
    const checked = (state.settings.tags || []).indexOf(t.id) >= 0;
    return '<label class="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs text-ink-600 dark:border-ink-700 dark:text-ink-300">' +
      '<input type="checkbox" data-tag="' + t.id + '" class="h-3.5 w-3.5 accent-brand-600" ' + (checked ? 'checked' : '') + '>' +
      t.label + '</label>';
  }).join('');

  return '<div class="' + CARD + ' p-5">' +
    '<div class="grid gap-4 sm:grid-cols-2">' +
      '<div><label class="mb-1 block text-xs ' + MUTED + '">词书</label>' +
        '<select id="book-select" class="' + INPUT + '">' +
          (list.length ? list.map(function (b) {
            return '<option value="' + esc(b.id) + '" ' + (b.id === book.id ? 'selected' : '') + '>' + esc(b.name) + '（' + (b.words || []).length + ' 词）</option>';
          }).join('') : '<option>暂无词书</option>') +
        '</select>' +
        '<p class="mt-1 text-[10px] leading-relaxed text-ink-400">' +
          (book.id === IELTS_BOOK_ID
            ? 'word.md 固定 ' + bookTotal + ' 条 · ' + bookUnique + ' 个不同单词 · 出题时在本书内随机打乱 · 原词库无标签，标签筛选对本词书不生效'
            : '切换词书后，练习、错词本与收藏夹均按当前词书显示') +
        '</p></div>' +
      '<div><label class="mb-1 block text-xs ' + MUTED + '">每日新词上限</label>' +
        '<input id="limit-input" type="number" min="0" max="500" value="' + state.settings.dailyNewLimit + '" class="' + INPUT + '">' +
        '<p class="mt-1 text-[10px] text-ink-400">今日已学新词 ' + (todayRecord().newWords || 0) + ' 个</p></div>' +
    '</div>' +
    '<div class="mt-4"><span class="mb-1.5 block text-xs ' + MUTED + '">单词标签（不选 = 全部）</span>' +
      '<div class="flex flex-wrap gap-2">' + tagBoxes + '</div></div>' +
    '<div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">' +
      '<div class="flex items-center gap-3">' +
        '<span class="text-xs ' + MUTED + '">卡片模式</span>' +
        '<div class="flex gap-1 rounded-lg border border-ink-200 p-1 dark:border-ink-700">' +
          segButton(state.settings.mode === 'A', 'A · 英→中', 'data-act="words:mode" data-mode="A"') +
          segButton(state.settings.mode === 'B', 'B · 挖空猜词', 'data-act="words:mode" data-mode="B"') +
        '</div>' +
      '</div>' +
      '<button type="button" data-act="words:spelling" class="' + BTN_SM + '" aria-pressed="' + state.settings.spelling + '">' +
        '拼写默写：' + (state.settings.spelling ? '开' : '关') + '</button>' +
    '</div>' +
  '</div>';
}

function renderWords() {
  const st = bookStats();
  const tab = state.ui.wordTab;
  const wrongKeys = currentBookKeys(state.wrong);
  const favKeys = currentBookKeys(state.fav);

  const tabBar = tabs([
    { id: 'study', label: '学习' },
    { id: 'wrong', label: '错词本', count: wrongKeys.length },
    { id: 'fav', label: '收藏夹', count: favKeys.length }
  ], tab, 'words:tab', 'tab');

  if (tab === 'wrong') {
    return pageHead('单词 · 错词本', '自评 1/2 档的单词会自动进入这里，自评 4 档时移出 · 当前词书') + tabBar +
      (wrongKeys.length
        ? '<div class="mb-4 flex gap-2">' +
            '<button type="button" data-act="words:start-wrong" class="' + BTN_PRIMARY + '">复习全部错词（' + wrongKeys.length + '）</button>' +
            '<button type="button" data-act="words:tab" data-tab="study" class="' + BTN + '">返回学习</button>' +
          '</div>' +
          '<div class="' + CARD + ' divide-y divide-ink-100 px-4 dark:divide-ink-800">' + wrongKeys.map(wrongRow).join('') + '</div>'
        : emptyState('当前词书的错词本还是空的', '学习单词时自评 1 或 2 档，单词会自动收进来。'));
  }

  if (tab === 'fav') {
    return pageHead('单词 · 收藏夹', '随时回看重点单词 · 当前词书') + tabBar +
      (favKeys.length
        ? '<div class="mb-4 flex gap-2">' +
            '<button type="button" data-act="words:start-fav" class="' + BTN_PRIMARY + '">复习收藏（' + favKeys.length + '）</button>' +
            '<button type="button" data-act="words:tab" data-tab="study" class="' + BTN + '">返回学习</button>' +
          '</div>' +
          '<div class="' + CARD + ' divide-y divide-ink-100 px-4 dark:divide-ink-800">' + favKeys.map(favRow).join('') + '</div>'
        : emptyState('当前词书的收藏夹还是空的', '在单词卡片或词库列表中点击星标即可收藏。'));
  }

  const pool = st.pool;

  return pageHead('单词', 'SM-2 间隔重复 · 数据保存在本地浏览器') + tabBar +
    studyConfig() +
    '<div class="mt-4 ' + CARD + ' p-5">' +
      '<div class="flex flex-wrap items-center justify-between gap-3">' +
        '<div class="text-sm"><span class="font-medium">今日待办</span> ' +
          '<span class="' + MUTED + '">复习 ' + st.due.length + ' · 新词 ' + Math.min(st.fresh.length, st.allowance) + '</span></div>' +
        '<button type="button" data-act="words:start" class="' + BTN_PRIMARY + '">开始学习</button>' +
      '</div>' +
      (st.pool.length
        ? '<p class="mt-2 text-[11px] text-ink-400">当前词书共 ' + st.pool.length + ' 个词符合标签筛选；到期卡片优先，新词按每日上限加入。</p>'
        : '<p class="mt-2 text-[11px] text-ink-400">当前标签筛选下没有单词，试试放宽标签。</p>') +
    '</div>' +

    '<div class="mt-6 flex items-center justify-between">' +
      '<h2 class="text-sm font-medium">当前词书</h2>' +
      '<span class="text-[11px] text-ink-400">' + esc(st.book.name) + '</span>' +
    '</div>' +
    (pool.length
      ? '<div class="mt-2 ' + CARD + ' divide-y divide-ink-100 px-4 dark:divide-ink-800">' + pool.map(wordRow).join('') + '</div>'
      : emptyState('没有可显示的单词', '请检查 data/wordlist.json 或标签筛选。'));
}

function wordRow(w) {
  const st = statusOf(w.key);
  return '<div class="flex items-center gap-3 py-3">' +
    speakBtn(w.word) +
    '<div class="min-w-0 flex-1">' +
      '<div class="flex items-baseline gap-2"><span class="font-medium">' + esc(w.word) + '</span>' +
      '<span class="truncate text-xs text-ink-400">' + esc(w.phonetic || '') + '</span></div>' +
      '<p class="truncate text-sm ' + MUTED + '">' + esc(w.meaning || '') + '</p>' +
    '</div>' +
    '<span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] ' + st.cls + '">' + st.text + '</span>' +
    starBtn(w.key, state.fav.indexOf(w.key) >= 0) +
  '</div>';
}

function wrongRow(key) {
  const w = allWordEntries().filter(function (x) { return x.key === key; })[0];
  if (!w) return '';
  return '<div class="flex items-center gap-3 py-3">' +
    speakBtn(w.word) +
    '<div class="min-w-0 flex-1"><div class="flex items-baseline gap-2"><span class="font-medium">' + esc(w.word) + '</span>' +
      '<span class="truncate text-xs text-ink-400">' + esc(w.phonetic || '') + '</span></div>' +
      '<p class="truncate text-sm ' + MUTED + '">' + esc(w.meaning || '') + '</p></div>' +
    '<button type="button" data-act="word:unwrong" data-key="' + esc(key) + '" class="' + BTN_SM + '">移出</button>' +
  '</div>';
}

function favRow(key) {
  const w = allWordEntries().filter(function (x) { return x.key === key; })[0];
  if (!w) return '';
  return '<div class="flex items-center gap-3 py-3">' +
    speakBtn(w.word) +
    '<div class="min-w-0 flex-1"><div class="flex items-baseline gap-2"><span class="font-medium">' + esc(w.word) + '</span>' +
      '<span class="truncate text-xs text-ink-400">' + esc(w.phonetic || '') + '</span></div>' +
      '<p class="truncate text-sm ' + MUTED + '">' + esc(w.meaning || '') + '</p></div>' +
    starBtn(key, true) +
  '</div>';
}

/* ------------------------------ 同义替换 ------------------------------ */

function initSynonym(forceNew) {
  const sets = (state.data.synonym && state.data.synonym.sets) || [];
  if (!sets.length) { state.ui.syn = null; return; }
  let pool = sets;
  if (forceNew && state.ui.syn && sets.length > 1) {
    pool = sets.filter(function (s) { return s.id !== state.ui.syn.setId; });
  }
  const set = pool[Math.floor(Math.random() * pool.length)];
  const idx = set.pairs.map(function (_, i) { return i; });
  state.ui.syn = {
    setId: set.id,
    left: shuffle(idx),
    right: shuffle(idx),
    matched: [],
    selected: null,
    wrong: null,
    mistakes: 0,
    done: false,
    recorded: false
  };
}

function renderSynonym() {
  const sets = (state.data.synonym && state.data.synonym.sets) || [];
  if (!sets.length) return pageHead('同义替换', '配对选择题') + emptyState('data/synonym.json 暂无数据');
  if (!state.ui.syn) initSynonym(false);

  const syn = state.ui.syn;
  const set = sets.filter(function (s) { return s.id === syn.setId; })[0] || sets[0];
  const pairs = set.pairs || [];
  const total = pairs.length;
  const matchedCount = syn.matched.length;

  const left = syn.left.map(function (i) {
    const matched = syn.matched.indexOf(i) >= 0;
    const isSel = syn.selected === i;
    const isWrong = syn.wrong && syn.wrong.left === i;
    let cls = 'border-ink-200 bg-white hover:border-brand-300 dark:border-ink-700 dark:bg-ink-900';
    if (matched) cls = 'border-emerald-200 bg-emerald-50 text-emerald-700 opacity-60 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300';
    else if (isSel && isWrong) cls = 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300';
    else if (isSel) cls = 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-900/30 dark:text-brand-200';
    return '<button type="button" data-act="syn:left" data-i="' + i + '" ' + (matched ? 'disabled' : '') +
      ' class="w-full rounded-xl border px-3 py-3 text-left text-sm ' + cls + '">' +
      '<span class="block">' + esc(pairs[i].from) + '</span>' +
      (pairs[i].fromCn ? '<span class="mt-0.5 block text-[11px] opacity-60">' + esc(pairs[i].fromCn) + '</span>' : '') +
      '</button>';
  }).join('');

  const right = syn.right.map(function (i) {
    const matched = syn.matched.indexOf(i) >= 0;
    const isWrong = syn.wrong && syn.wrong.right === i;
    let cls = 'border-ink-200 bg-white hover:border-brand-300 dark:border-ink-700 dark:bg-ink-900';
    if (matched) cls = 'border-emerald-200 bg-emerald-50 text-emerald-700 opacity-60 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300';
    else if (isWrong) cls = 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300';
    return '<button type="button" data-act="syn:right" data-i="' + i + '" ' + (matched ? 'disabled' : '') +
      ' class="w-full rounded-xl border px-3 py-3 text-left text-sm ' + cls + '">' +
      '<span class="block">' + esc(pairs[i].to) + '</span>' +
      (pairs[i].toCn ? '<span class="mt-0.5 block text-[11px] opacity-60">' + esc(pairs[i].toCn) + '</span>' : '') +
      '</button>';
  }).join('');

  const donePanel = syn.done ? '<div class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">' +
    '<div class="flex items-center gap-2 font-medium">' + icon('check', 'w-4 h-4') + '本组完成 · 共 ' + total + ' 对，错误 ' + syn.mistakes + ' 次</div>' +
    '<ul class="mt-2 space-y-1 text-xs">' + pairs.map(function (p) {
      return '<li><span class="font-medium">' + esc(p.from) + '</span> → ' + esc(p.to) +
        (p.toCn ? ' <span class="opacity-70">' + esc(p.toCn) + '</span>' : '') + '</li>';
    }).join('') + '</ul></div>' : '';

  const linked = pairs.map(function (p) { return p.wordId ? findWordById(p.wordId) : null; }).filter(Boolean);
  const linkedPanel = linked.length ? '<div class="mt-3"><span class="text-[11px] text-ink-400">关联词库：</span><div class="mt-1.5 flex flex-wrap gap-2">' + linked.map(wordChip).join('') + '</div></div>' : '';

  return pageHead('同义替换', '先点左侧表达，再点右侧对应替换 · 与单词库联动',
    '<button type="button" data-act="syn:new" class="' + BTN_SM + '">' + icon('reset', 'w-3.5 h-3.5') + '换一组</button>') +
    '<div class="' + CARD + ' p-5">' +
      '<div class="flex flex-wrap items-center justify-between gap-2">' +
        '<div><h2 class="text-sm font-medium">' + esc(set.title || '同义替换') + '</h2>' +
        (set.note ? '<p class="mt-0.5 text-xs ' + MUTED + '">' + esc(set.note) + '</p>' : '') + '</div>' +
        '<span class="text-xs tabular-nums ' + MUTED + '">' + matchedCount + ' / ' + total + '</span>' +
      '</div>' +
      '<div class="mt-4 grid grid-cols-2 gap-3">' +
        '<div class="space-y-2">' + left + '</div>' +
        '<div class="space-y-2">' + right + '</div>' +
      '</div>' +
      '<p class="mt-3 text-[11px] text-ink-400">' + (syn.wrong ? '不匹配，再试一次。' : '左侧是原表达，右侧是替换表达。') + '</p>' +
      donePanel + linkedPanel +
      (syn.done ? '<button type="button" data-act="syn:new" class="mt-4 w-full ' + BTN_PRIMARY + '">再来一组</button>' : '') +
    '</div>';
}

/* ------------------------------- 长难句 ------------------------------- */

function currentSentence() {
  const list = (state.data.longsentence && state.data.longsentence.sentences) || [];
  if (!list.length) return null;
  const i = clamp(state.ui.sentenceIdx, 0, list.length - 1);
  return { item: list[i], index: i, total: list.length };
}

function renderSentence() {
  const cur = currentSentence();
  if (!cur) return pageHead('长难句', '主干划分 · 从句标注 · 句内生词') + emptyState('data/longsentence.json 暂无数据');

  const item = cur.item;
  const rev = state.ui.reveals[item.id] || {};
  const words = (item.words || []).map(findWordById).filter(Boolean);
  const glossary = item.glossary || [];
  const done = state.ui.sentenceDone.has(item.id);

  const structPanel = rev.struct ? '<div class="mt-4 space-y-4 border-t border-ink-100 pt-4 dark:border-ink-800">' +
    '<div><div class="text-[11px] font-medium uppercase tracking-wide text-ink-400">主干</div>' +
      '<p class="mt-1 text-sm leading-relaxed">' + esc(item.skeleton || '—') + '</p></div>' +
    '<div><div class="text-[11px] font-medium uppercase tracking-wide text-ink-400">从句与修饰</div>' +
      '<ul class="mt-1.5 space-y-2">' + (item.clauses || []).map(function (c) {
        return '<li class="rounded-lg bg-ink-50 px-3 py-2 text-sm dark:bg-ink-900/60">' +
          '<span class="mr-2 rounded bg-brand-100 px-1.5 py-0.5 text-[10px] text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">' + esc(c.type) + '</span>' +
          '<span class="font-serif">' + esc(c.text) + '</span>' +
          (c.note ? '<p class="mt-1 text-xs ' + MUTED + '">' + esc(c.note) + '</p>' : '') + '</li>';
      }).join('') + '</ul></div>' +
    ((words.length || glossary.length) ? '<div><div class="text-[11px] font-medium uppercase tracking-wide text-ink-400">句内生词</div>' +
      '<div class="mt-2 flex flex-wrap gap-2">' +
        words.map(wordChip).join('') +
        glossary.map(function (g) {
          return '<span class="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs text-ink-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300">' +
            '<span class="font-medium">' + esc(g.term) + '</span><span class="text-ink-400">' + esc(g.cn) + '</span></span>';
        }).join('') +
      '</div></div>' : '') +
  '</div>' : '';

  const transPanel = rev.trans ? '<div class="mt-4 rounded-lg bg-ink-50 px-4 py-3 text-sm leading-relaxed dark:bg-ink-900/60">' +
    esc(item.translation || '—') + '</div>' : '';

  const refPanel = rev.ref ? '<div class="mt-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200">' +
    esc(item.reference || '') + '</div>' : '';

  return pageHead('长难句', '先读原句，再逐层拆解', '<span class="text-xs ' + MUTED + '">第 ' + (cur.index + 1) + ' / ' + cur.total + ' 句</span>') +

    '<div class="' + CARD + ' p-6">' +
      '<p class="font-serif text-lg leading-loose sm:text-xl">' + esc(item.sentence) + '</p>' +
      '<div class="mt-4 flex flex-wrap gap-2">' +
        '<button type="button" data-act="sentence:reveal" data-part="struct" class="' + BTN_SM + '">' + (rev.struct ? '收起结构解析' : '主干与从句') + '</button>' +
        '<button type="button" data-act="sentence:reveal" data-part="trans" class="' + BTN_SM + '">' + (rev.trans ? '收起译文' : '参考译文') + '</button>' +
      '</div>' +
      structPanel + transPanel +
    '</div>' +

    '<div class="mt-4 ' + CARD + ' p-5">' +
      '<h2 class="text-sm font-medium">自测理解</h2>' +
      '<p class="mt-1 text-sm ' + MUTED + '">' + esc(item.question || '用自己的话概括这句话。') + '</p>' +
      '<textarea data-bind="sent:' + esc(item.id) + '" rows="3" class="mt-3 ' + INPUT + '" placeholder="写下你的理解…">' + esc(state.forms['sent:' + item.id] || '') + '</textarea>' +
      '<div class="mt-2 flex flex-wrap gap-2">' +
        '<button type="button" data-act="sentence:reveal" data-part="ref" class="' + BTN_SM + '">参考要点</button>' +
        '<button type="button" data-act="sentence:done" class="' + (done ? BTN_SM : BTN_PRIMARY) + '">' + (done ? '已记录本句' : '标记已练') + '</button>' +
      '</div>' +
      refPanel +
    '</div>' +

    '<div class="mt-4 flex items-center justify-between">' +
      '<button type="button" data-act="sentence:prev" class="' + BTN + '" ' + (cur.index === 0 ? 'disabled' : '') + '>上一句</button>' +
      '<button type="button" data-act="sentence:next" class="' + BTN + '" ' + (cur.index >= cur.total - 1 ? 'disabled' : '') + '>下一句</button>' +
    '</div>';
}

/* -------------------------------- 写作 -------------------------------- */

function writingData() {
  return state.data.writing || {};
}

function findWritingItem(kind, id) {
  const w = writingData();
  if (kind === 'pattern') return (w.task1Patterns || []).filter(function (x) { return x.id === id; })[0];
  if (kind === 'phrase') return (w.task2Phrases || []).filter(function (x) { return x.id === id; })[0];
  return null;
}

function writingAnswer(kind, item) {
  if (!item) return '';
  if (kind === 'pattern') return item.answer || '';
  return (item.drill && item.drill.answer) || item.answer || '';
}

function writingCloze(kind, item) {
  if (!item) return '';
  if (kind === 'pattern') return item.cloze || item.pattern || '';
  return (item.drill && item.drill.cloze) || '';
}

function checkWriting(kind, id) {
  const item = findWritingItem(kind, id);
  if (!item) return;
  const bindKey = (kind === 'pattern' ? 'w1:' : 'w2:') + id;
  const input = document.querySelector('[data-bind="' + bindKey + '"]');
  const value = input ? input.value : '';
  const answer = writingAnswer(kind, item);
  const alternatives = Array.isArray(item.answers) ? item.answers : [];
  const ok = normAnswer(value) === normAnswer(answer) ||
    alternatives.some(function (a) { return normAnswer(value) === normAnswer(a); });
  state.ui.writingChecked[kind + ':' + id] = { ok: ok, value: value };
  if (ok && !state.ui.writingDone.has(kind + ':' + id)) {
    state.ui.writingDone.add(kind + ':' + id);
    state.modules.writing.drills += 1;
    touchModule('writing');
    bumpDaily('writing');
  }
  render();
}

function writingResult(kind, id) {
  const r = state.ui.writingChecked[kind + ':' + id];
  if (!r) return '';
  return '<div class="mt-2 rounded-lg border px-3 py-2 text-xs ' + (r.ok
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300') + '">' +
    (r.ok ? '✓ 正确' : '✗ 再想想 · 你的答案：' + esc(r.value || '（空）')) + '</div>';
}

function renderWriting() {
  const ui = state.ui;
  const w = writingData();
  const tabBar = tabs([
    { id: 'task1', label: '小作文句型' },
    { id: 'task2', label: '大作文词组' },
    { id: 'link', label: '逻辑连接词' },
    { id: 'checklist', label: '自查表' },
    { id: 'ai', label: 'AI 批改（预留）' }
  ], ui.writingTab, 'writing:tab', 'tab');

  let body = '';

  if (ui.writingTab === 'task1') {
    const patterns = w.task1Patterns || [];
    const cats = [{ id: 'all', label: '全部' }].concat(Object.keys(W1_CATS).map(function (k) {
      return { id: k, label: W1_CATS[k] };
    }));
    const filtered = ui.writingT1Cat === 'all' ? patterns : patterns.filter(function (p) { return p.category === ui.writingT1Cat; });

    body = '<div class="mb-4 flex flex-wrap gap-1.5">' + cats.map(function (c) {
      return '<button type="button" data-act="writing:cat" data-cat="' + c.id + '" class="rounded-full border px-3 py-1 text-xs ' +
        (ui.writingT1Cat === c.id
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-400 dark:hover:bg-ink-800') + '">' + c.label + '</button>';
    }).join('') + '</div>' +
    (filtered.length ? filtered.map(function (p) {
      const key = 'pattern:' + p.id;
      const r = ui.writingChecked[key];
      return '<div class="mb-3 ' + CARD + ' p-5">' +
        '<div class="flex items-center justify-between"><span class="rounded bg-ink-100 px-2 py-0.5 text-[10px] text-ink-500 dark:bg-ink-800 dark:text-ink-400">' + (W1_CATS[p.category] || p.category) + '</span>' +
        '<span class="text-[10px] text-ink-400">仿写填空</span></div>' +
        (r ? '<p class="mt-3 text-sm leading-relaxed">' + esc(p.pattern) + '</p>' +
            '<p class="mt-1 text-xs ' + MUTED + '">' + esc(p.cn || '') + '</p>' +
            (p.tip ? '<p class="mt-2 text-[11px] text-ink-400">' + esc(p.tip) + '</p>' : '') +
            writingResult('pattern', p.id) +
            '<button type="button" data-act="writing:redo" data-kind="pattern" data-id="' + esc(p.id) + '" class="mt-2 text-[11px] text-brand-600 hover:underline dark:text-brand-300">重做</button>'
          : '<p class="mt-3 text-sm leading-relaxed">' + clozeHtml(p.cloze || p.pattern) + '</p>' +
            '<div class="mt-3 flex gap-2">' +
              '<input type="text" data-bind="w1:' + esc(p.id) + '" value="' + esc(state.forms['w1:' + p.id] || '') + '" class="' + INPUT + '" placeholder="填入缺失的表达" autocomplete="off" spellcheck="false">' +
              '<button type="button" data-act="writing:check" data-kind="pattern" data-id="' + esc(p.id) + '" class="shrink-0 ' + BTN_PRIMARY + '">核对</button>' +
            '</div>' +
            (p.cn ? '<p class="mt-2 text-xs ' + MUTED + '">提示：' + esc(p.cn) + '</p>' : '') +
            writingResult('pattern', p.id)) +
      '</div>';
    }).join('') : emptyState('暂无该类别句型'));
  }

  if (ui.writingTab === 'task2') {
    const phrases = w.task2Phrases || [];
    const topics = [];
    phrases.forEach(function (p) { if (p.topic && topics.indexOf(p.topic) < 0) topics.push(p.topic); });
    const topicChips = [{ id: 'all', label: '全部' }].concat(topics.map(function (t) { return { id: t, label: t }; }));
    const filtered = ui.writingT2Topic === 'all' ? phrases : phrases.filter(function (p) { return p.topic === ui.writingT2Topic; });

    body = '<div class="mb-4 flex flex-wrap gap-1.5">' + topicChips.map(function (t) {
      return '<button type="button" data-act="writing:topic" data-topic="' + esc(t.id) + '" class="rounded-full border px-3 py-1 text-xs ' +
        (ui.writingT2Topic === t.id
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-400 dark:hover:bg-ink-800') + '">' + esc(t.label) + '</button>';
    }).join('') + '</div>' +

    '<h2 class="mb-2 text-sm font-medium">话题高分词组</h2>' +
    '<div class="mb-6 grid gap-3 sm:grid-cols-2">' +
      filtered.map(function (p) {
        return '<div class="' + CARD + ' p-4">' +
          '<div class="text-sm font-medium">' + esc(p.phrase) + '</div>' +
          '<div class="mt-1 text-xs ' + MUTED + '">' + esc(p.cn || '') + '</div>' +
          (p.example ? '<p class="mt-2 font-serif text-xs leading-relaxed text-ink-500 dark:text-ink-400">' + esc(p.example) + '</p>' : '') +
        '</div>';
      }).join('') +
    '</div>' +

    '<h2 class="mb-2 text-sm font-medium">仿写练习</h2>' +
    (filtered.filter(function (p) { return p.drill; }).length
      ? filtered.filter(function (p) { return p.drill; }).map(function (p) {
          const key = 'phrase:' + p.id;
          const r = ui.writingChecked[key];
          return '<div class="mb-3 ' + CARD + ' p-5">' +
            '<div class="text-xs ' + MUTED + '">' + esc(p.cn || '') + '</div>' +
            (r
              ? '<p class="mt-2 font-serif text-sm leading-relaxed">' + esc(p.drill.cloze) + '</p>' +
                '<p class="mt-2 text-sm">参考表达：<span class="font-medium text-brand-700 dark:text-brand-300">' + esc(p.drill.answer) + '</span></p>' +
                (p.example ? '<p class="mt-1 text-xs ' + MUTED + '">' + esc(p.example) + '</p>' : '') +
                writingResult('phrase', p.id) +
                '<button type="button" data-act="writing:redo" data-kind="phrase" data-id="' + esc(p.id) + '" class="mt-2 text-[11px] text-brand-600 hover:underline dark:text-brand-300">重做</button>'
              : '<p class="mt-2 font-serif text-sm leading-relaxed">' + clozeHtml(p.drill.cloze) + '</p>' +
                '<div class="mt-3 flex gap-2">' +
                  '<input type="text" data-bind="w2:' + esc(p.id) + '" value="' + esc(state.forms['w2:' + p.id] || '') + '" class="' + INPUT + '" placeholder="补全表达" autocomplete="off" spellcheck="false">' +
                  '<button type="button" data-act="writing:check" data-kind="phrase" data-id="' + esc(p.id) + '" class="shrink-0 ' + BTN_PRIMARY + '">核对</button>' +
                '</div>' +
                writingResult('phrase', p.id)) +
          '</div>';
        }).join('')
      : emptyState('暂无仿写练习'));
  }

  if (ui.writingTab === 'link') {
    body = '<div class="grid gap-3 sm:grid-cols-2">' + (w.linkingWords || []).map(function (g) {
      return '<div class="' + CARD + ' p-5">' +
        '<h2 class="text-sm font-medium">' + esc(g.group) + '</h2>' +
        '<div class="mt-2 flex flex-wrap gap-1.5">' + (g.words || []).map(function (x) {
          return '<span class="rounded-md bg-ink-100 px-2 py-0.5 text-xs text-ink-600 dark:bg-ink-800 dark:text-ink-300">' + esc(x) + '</span>';
        }).join('') + '</div>' +
        (g.usage ? '<p class="mt-3 text-xs leading-relaxed ' + MUTED + '">' + esc(g.usage) + '</p>' : '') +
      '</div>';
    }).join('') + '</div>';
  }

  if (ui.writingTab === 'checklist') {
    const items = w.checklist || [];
    const groups = {};
    items.forEach(function (it) { (groups[it.dimension] = groups[it.dimension] || []).push(it); });
    const doneCount = items.filter(function (it) { return state.checklist[it.id]; }).length;
    const pct = items.length ? Math.round(doneCount / items.length * 100) : 0;

    body = '<div class="' + CARD + ' p-5">' +
      '<div class="flex items-center justify-between">' +
        '<div><h2 class="text-sm font-medium">交卷前自查</h2>' +
        '<p class="mt-0.5 text-[11px] text-ink-400">对应写作四大评分维度（描述为概括性提示，非官方评分标准原文）</p></div>' +
        '<span class="text-xs tabular-nums ' + MUTED + '">' + doneCount + ' / ' + items.length + '</span>' +
      '</div>' +
      '<div class="mt-3 h-1 rounded bg-ink-200 dark:bg-ink-800"><div class="h-1 rounded bg-brand-500" style="width:' + pct + '%"></div></div>' +
      '<div class="mt-4 space-y-4">' +
        Object.keys(groups).map(function (dim) {
          return '<div><div class="text-[11px] font-medium uppercase tracking-wide text-ink-400">' + esc(dim) + ' · ' + esc(DIMENSIONS[dim] || '') + '</div>' +
            '<ul class="mt-1.5 space-y-1">' + groups[dim].map(function (it) {
              const checked = !!state.checklist[it.id];
              return '<li><button type="button" data-act="checklist:toggle" data-id="' + esc(it.id) + '" class="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-800/60">' +
                '<span class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ' + (checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300 dark:border-ink-600') + '">' +
                (checked ? icon('check', 'w-3 h-3') : '') + '</span>' +
                '<span class="' + (checked ? 'text-ink-400 line-through' : '') + '">' + esc(it.item) + '</span></button></li>';
            }).join('') + '</ul></div>';
        }).join('') +
      '</div>' +
      '<button type="button" data-act="checklist:reset" class="mt-4 ' + BTN_SM + '">清空勾选</button>' +
    '</div>';
  }

  if (ui.writingTab === 'ai') {
    const text = state.forms['ai:text'] || '';
    const count = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    body = '<div class="' + CARD + ' p-5">' +
      '<div class="flex items-start gap-3">' +
        '<span class="mt-0.5 text-brand-500">' + icon('spark', 'w-5 h-5') + '</span>' +
        '<div><h2 class="text-sm font-medium">AI 作文批改（接口预留）</h2>' +
        '<p class="mt-1 text-xs leading-relaxed ' + MUTED + '">本版本不接入任何 AI API，也不会上传你的作文。此处仅保留输入面板与按钮位置，后续可在 <code class="rounded bg-ink-100 px-1 py-0.5 text-[10px] dark:bg-ink-800">app.js</code> 的 <code class="rounded bg-ink-100 px-1 py-0.5 text-[10px] dark:bg-ink-800">ai:check</code> 分支接入服务。</p></div>' +
      '</div>' +
      '<textarea id="ai-text" data-bind="ai:text" rows="10" class="mt-4 ' + INPUT + '" placeholder="粘贴你的雅思作文（Task 1 或 Task 2）…">' + esc(text) + '</textarea>' +
      '<div class="mt-2 flex items-center justify-between">' +
        '<span class="text-xs text-ink-400"><span id="ai-count">' + count + '</span> words</span>' +
        '<button type="button" data-act="ai:check" class="' + BTN_PRIMARY + ' opacity-60">提交批改（未接入）</button>' +
      '</div>' +
      '<p class="mt-3 text-[11px] text-ink-400">建议自查顺序：任务回应 → 连贯衔接 → 词汇资源 → 语法多样性与准确性。</p>' +
    '</div>';
  }

  return pageHead('写作', '句型仿写 · 话题词块 · 交卷自查') + tabBar + body;
}

/* -------------------------------- 口语 -------------------------------- */

function resetSpeakTimers() {
  ['prep', 'answer'].forEach(function (k) {
    speakTimers[k].remaining = speakTimers[k].total;
    speakTimers[k].running = false;
    speakTimers[k].endAt = 0;
  });
}

function renderSpeaking() {
  const s = state.data.speaking || {};
  const ui = state.ui;
  const tabBar = tabs([
    { id: 'part1', label: 'Part 1' },
    { id: 'part2', label: 'Part 2' },
    { id: 'part3', label: 'Part 3' }
  ], ui.speakingTab, 'speaking:tab', 'tab');

  let body = '';

  if (ui.speakingTab === 'part1' || ui.speakingTab === 'part3') {
    const list = ui.speakingTab === 'part1' ? (s.part1 || []) : (s.part3 || []);
    body = list.length ? list.map(function (q) {
      const open = !!ui.speakingOpen[q.id];
      return '<div class="mb-3 ' + CARD + ' p-5">' +
        '<div class="flex flex-wrap items-center gap-2 text-[10px] text-ink-400">' +
          '<span>' + (ui.speakingTab === 'part1' ? 'Part 1' : 'Part 3') + '</span>' +
          (q.topic ? '<span>· ' + esc(q.topic) + '</span>' : '') +
        '</div>' +
        '<p class="mt-1.5 text-sm font-medium leading-relaxed">' + esc(q.question) + '</p>' +
        ((q.hints || []).length ? '<ul class="mt-2 space-y-1 text-xs ' + MUTED + '">' + q.hints.map(function (h) {
          return '<li class="flex gap-1.5"><span class="text-ink-300 dark:text-ink-600">·</span><span>' + esc(h) + '</span></li>';
        }).join('') + '</ul>' : '') +
        keywordChips(q.keywords) +
        (q.sample ? '<div class="mt-3">' +
          '<button type="button" data-act="speaking:open" data-id="' + esc(q.id) + '" class="text-[11px] text-brand-600 hover:underline dark:text-brand-300">' + (open ? '收起参考表达' : '查看参考表达') + '</button>' +
          (open ? '<div class="mt-2 rounded-lg bg-ink-50 px-3 py-2 font-serif text-xs leading-relaxed dark:bg-ink-900/60">' + esc(q.sample) + '</div>' : '') +
        '</div>' : '') +
      '</div>';
    }).join('') : emptyState('data/speaking.json 暂无该部分数据');
  }

  if (ui.speakingTab === 'part2') {
    const list = s.part2 || [];
    if (!list.length) {
      body = emptyState('data/speaking.json 暂无 Part 2 数据');
    } else {
      const idx = clamp(ui.speakingIdx, 0, list.length - 1);
      const card = list[idx];
      const done = ui.speakingDone.has(card.id);
      body = '<div class="mb-3 flex items-center justify-between">' +
          '<span class="text-xs ' + MUTED + '">第 ' + (idx + 1) + ' / ' + list.length + ' 张</span>' +
          '<div class="flex gap-2">' +
            '<button type="button" data-act="speaking:idx" data-i="' + (idx - 1) + '" class="' + BTN_SM + '" ' + (idx === 0 ? 'disabled' : '') + '>上一张</button>' +
            '<button type="button" data-act="speaking:idx" data-i="' + (idx + 1) + '" class="' + BTN_SM + '" ' + (idx >= list.length - 1 ? 'disabled' : '') + '>下一张</button>' +
          '</div>' +
        '</div>' +

        '<div class="' + CARD + ' p-6">' +
          (card.topic ? '<div class="text-[10px] uppercase tracking-wide text-ink-400">' + esc(card.topic) + '</div>' : '') +
          '<p class="mt-1 text-base font-medium leading-relaxed">' + esc(card.cueCard) + '</p>' +
          ((card.points || []).length ? '<ul class="mt-3 space-y-1 text-sm ' + MUTED + '">' + card.points.map(function (p) {
            return '<li class="flex gap-2"><span class="text-ink-300 dark:text-ink-600">—</span><span>' + esc(p) + '</span></li>';
          }).join('') + '</ul>' : '') +
          keywordChips(card.keywords) +
          ((card.followUp || []).length ? '<div class="mt-4 border-t border-ink-100 pt-3 dark:border-ink-800">' +
            '<div class="text-[11px] text-ink-400">可能的追问</div>' +
            '<ul class="mt-1 space-y-1 text-xs ' + MUTED + '">' + card.followUp.map(function (f) { return '<li>· ' + esc(f) + '</li>'; }).join('') + '</ul></div>' : '') +
        '</div>' +

        '<div class="mt-4 grid grid-cols-2 gap-3">' +
          timerBlock('prep', '1 分钟准备') +
          timerBlock('answer', '2 分钟作答') +
        '</div>' +
        '<p class="mt-2 text-[11px] text-ink-400">准备结束会提示，但不会自动开始作答；点击「开始」计时。切换卡片会重置计时。</p>' +

        '<div class="mt-4 flex flex-wrap gap-2">' +
          '<button type="button" data-act="speaking:done" data-id="' + esc(card.id) + '" class="' + (done ? BTN_SM : BTN_PRIMARY) + '">' + (done ? '已记录本张' : '标记已练') + '</button>' +
          '<button type="button" data-act="speaking:reset" class="' + BTN + '">重置两个计时器</button>' +
        '</div>' +

        (card.sample ? '<div class="mt-4"><button type="button" data-act="speaking:open" data-id="' + esc(card.id) + '" class="text-[11px] text-brand-600 hover:underline dark:text-brand-300">' + (ui.speakingOpen[card.id] ? '收起参考表达' : '查看参考表达') + '</button>' +
          (ui.speakingOpen[card.id] ? '<div class="mt-2 rounded-lg bg-ink-50 px-4 py-3 font-serif text-xs leading-relaxed dark:bg-ink-900/60">' + esc(card.sample) + '</div>' : '') + '</div>' : '');
    }
  }

  return pageHead('口语', '思路提示 · 高分词块 · 准备与作答计时') + tabBar + body;
}

function timerBlock(kind, label) {
  const t = speakTimers[kind];
  return '<div class="' + CARD + ' p-4 text-center">' +
    '<div class="text-[11px] text-ink-400">' + esc(label) + '</div>' +
    '<div class="mt-1 text-3xl font-semibold tabular-nums" data-stimer="' + kind + '">' + fmtClock(t.remaining) + '</div>' +
    '<div class="mt-3 flex justify-center gap-2">' +
      '<button type="button" data-act="speaking:start" data-kind="' + kind + '" class="' + BTN_SM + '">' + icon('play', 'w-3 h-3') + '开始</button>' +
      '<button type="button" data-act="speaking:reset-one" data-kind="' + kind + '" class="' + BTN_SM + '">' + icon('reset', 'w-3 h-3') + '重置</button>' +
    '</div>' +
  '</div>';
}

/* -------------------------------- 模考 -------------------------------- */

function renderMock() {
  const presets = [
    { min: 60, label: '阅读' },
    { min: 30, label: '听力' },
    { min: 60, label: '写作' }
  ];
  const display = fmtClock(mock.remaining);

  return pageHead('模考计时', '本地倒计时 · 切到其他页面也会继续计时') +

    '<div class="grid grid-cols-3 gap-3">' + presets.map(function (p) {
      const active = mock.totalSeconds === p.min * 60 && mock.label === p.label;
      return '<button type="button" data-act="mock:preset" data-min="' + p.min + '" data-label="' + p.label + '" class="' + CARD + ' p-4 text-center ' + (active ? 'border-brand-400 ring-1 ring-brand-200 dark:ring-brand-800' : '') + '">' +
        '<div class="text-xs ' + MUTED + '">' + p.label + '</div>' +
        '<div class="mt-1 text-lg font-semibold tabular-nums">' + p.min + '<span class="text-xs font-normal text-ink-400"> min</span></div>' +
      '</button>';
    }).join('') + '</div>' +

    '<div class="mt-4 ' + CARD + ' p-6 text-center">' +
      '<div class="flex items-center justify-center gap-2 text-[11px] uppercase tracking-wide text-ink-400">' +
        '<span class="h-1.5 w-1.5 rounded-full ' + (mock.running ? 'bg-emerald-500' : mock.active ? 'bg-amber-400' : 'bg-ink-300 dark:bg-ink-600') + '"></span>' +
        '<span>' + esc(mock.label) + (mock.running ? ' · 进行中' : mock.active ? ' · 已暂停' : '') + '</span>' +
      '</div>' +
      '<div id="mock-display" class="mt-2 text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl">' + display + '</div>' +
      '<div class="mt-5 flex flex-wrap justify-center gap-2">' +
        (mock.running
          ? '<button type="button" data-act="mock:pause" class="' + BTN_PRIMARY + '">' + icon('pause', 'w-4 h-4') + '暂停</button>'
          : '<button type="button" data-act="mock:start" class="' + BTN_PRIMARY + '">' + icon('play', 'w-4 h-4') + (mock.active ? '继续' : '开始') + '</button>') +
        '<button type="button" data-act="mock:reset" class="' + BTN + '">' + icon('reset', 'w-4 h-4') + '重置</button>' +
      '</div>' +
      '<p class="mt-3 text-[11px] text-ink-400">结束后自动记录一次模考；按设备本地时间计算，后台标签页也准确。</p>' +
    '</div>' +

    '<div class="mt-4 ' + CARD + ' p-5">' +
      '<h2 class="text-sm font-medium">自定义计时</h2>' +
      '<div class="mt-2 flex gap-2">' +
        '<input type="number" min="1" max="300" data-bind="mock:minutes" class="' + INPUT + '" placeholder="分钟数，例如 45">' +
        '<button type="button" data-act="mock:custom" class="shrink-0 ' + BTN + '">设为自定义</button>' +
      '</div>' +
      '<p class="mt-2 text-[11px] text-ink-400">设置后点击上方「开始」启动计时。</p>' +
    '</div>' +

    '<div class="mt-4 grid grid-cols-2 gap-3">' +
      statCard('模考次数', String(state.modules.mock.sessions), '累计记录') +
      statCard('模考分钟', String(state.modules.mock.minutes), '累计时长') +
    '</div>';
}

/* -------------------------------- 设置 -------------------------------- */

function renderSettings() {
  const theme = state.settings.theme;
  const booksList = books();

  return pageHead('设置', '偏好与数据管理') +

    '<div class="' + CARD + ' p-5">' +
      '<h2 class="text-sm font-medium">学习偏好</h2>' +
      '<div class="mt-3 grid gap-4 sm:grid-cols-2">' +
        '<div><label class="mb-1 block text-xs ' + MUTED + '">每日新词上限</label>' +
          '<input id="limit-input" type="number" min="0" max="500" value="' + state.settings.dailyNewLimit + '" class="' + INPUT + '"></div>' +
        '<div><label class="mb-1 block text-xs ' + MUTED + '">默认词书</label>' +
          '<select id="book-select" class="' + INPUT + '">' + (booksList.length ? booksList.map(function (b) {
            return '<option value="' + esc(b.id) + '" ' + (b.id === currentBook().id ? 'selected' : '') + '>' + esc(b.name) + '</option>';
          }).join('') : '<option>暂无词书</option>') + '</select></div>' +
      '</div>' +
      '<div class="mt-4 flex flex-wrap items-center gap-3">' +
        '<span class="text-xs ' + MUTED + '">卡片模式</span>' +
        '<div class="flex gap-1 rounded-lg border border-ink-200 p-1 dark:border-ink-700">' +
          segButton(state.settings.mode === 'A', 'A · 英→中', 'data-act="words:mode" data-mode="A"') +
          segButton(state.settings.mode === 'B', 'B · 挖空猜词', 'data-act="words:mode" data-mode="B"') +
        '</div>' +
        '<button type="button" data-act="words:spelling" class="' + BTN_SM + '">拼写默写：' + (state.settings.spelling ? '开' : '关') + '</button>' +
      '</div>' +
      '<div class="mt-4 flex flex-wrap gap-2">' +
        TAGS.map(function (t) {
          const on = (state.settings.tags || []).indexOf(t.id) >= 0;
          return '<button type="button" data-act="settings:tag" data-tag="' + t.id + '" class="rounded-full border px-3 py-1 text-xs ' +
            (on ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300'
                : 'border-ink-200 text-ink-400 dark:border-ink-700') + '">' + t.label + '</button>';
        }).join('') +
      '</div>' +
    '</div>' +

    '<div class="mt-4 ' + CARD + ' p-5">' +
      '<h2 class="text-sm font-medium">外观</h2>' +
      '<div class="mt-2 flex gap-1 rounded-lg border border-ink-200 p-1 dark:border-ink-700">' +
        segButton(theme === 'light', '浅色', 'data-act="settings:theme" data-theme="light"') +
        segButton(theme === 'dark', '深色', 'data-act="settings:theme" data-theme="dark"') +
        segButton(theme === 'system', '跟随系统', 'data-act="settings:theme" data-theme="system"') +
      '</div>' +
      '<p class="mt-2 text-[11px] text-ink-400">顶栏也提供快捷切换。深色模式设置会写入本地存储。</p>' +
    '</div>' +

    '<div class="mt-4 ' + CARD + ' p-5">' +
      '<h2 class="text-sm font-medium">数据备份</h2>' +
      '<p class="mt-1 text-xs leading-relaxed ' + MUTED + '">学习记录仅保存在当前浏览器的 localStorage 中。更换设备或清理浏览器数据前，请先导出备份。</p>' +
      '<div class="mt-3 flex flex-wrap gap-2">' +
        '<button type="button" data-act="backup:export" class="' + BTN_PRIMARY + '">' + icon('download', 'w-4 h-4') + '导出 JSON</button>' +
        '<button type="button" data-act="backup:import" class="' + BTN + '">' + icon('upload', 'w-4 h-4') + '导入 JSON</button>' +
      '</div>' +
      '<p class="mt-2 text-[11px] text-ink-400">导入会覆盖当前设备上的全部学习记录与设置。</p>' +
    '</div>' +

    '<div class="mt-4 ' + CARD + ' p-5">' +
      '<h2 class="text-sm font-medium text-rose-600 dark:text-rose-400">清空学习进度</h2>' +
      '<p class="mt-1 text-xs ' + MUTED + '">删除全部 SM-2 排程、每日统计、错词本、收藏夹、练习记录与自查勾选；词库与设置保留。</p>' +
      '<button type="button" data-act="progress:reset" class="mt-3 ' + BTN + ' text-rose-600 dark:text-rose-400">清空学习记录</button>' +
    '</div>' +

    '<div class="mt-4 ' + CARD + ' p-5 text-xs leading-relaxed ' + MUTED + '">' +
      '<p><span class="font-medium text-ink-600 dark:text-ink-300">关于本项目</span> · 静态前端，无后端、无账号、无网络请求（除加载题库与 Tailwind CDN）。</p>' +
      '<p class="mt-1">SM-2 算法位于 <code class="rounded bg-ink-100 px-1 dark:bg-ink-800">sm2.js</code>；题库位于 <code class="rounded bg-ink-100 px-1 dark:bg-ink-800">data/</code>。正式公开部署前请替换存在版权风险的素材。</p>' +
      '<p class="mt-1">AI 批改仅预留入口，未接入 API。</p>' +
    '</div>';
}

/* ------------------------------ 单词会话 ------------------------------ */

function buildQueue(mode) {
  const book = currentBook();
  const isIelts = book.id === IELTS_BOOK_ID;

  if (mode === 'wrong') {
    const keys = currentBookKeys(state.wrong);
    const queue = currentBookEntries().filter(function (w) { return keys.indexOf(w.key) >= 0; });
    return isIelts ? shuffle(queue) : queue;
  }
  if (mode === 'fav') {
    const keys = currentBookKeys(state.fav);
    const queue = currentBookEntries().filter(function (w) { return keys.indexOf(w.key) >= 0; });
    return isIelts ? shuffle(queue) : queue;
  }

  const st = bookStats();
  if (!isIelts) return st.due.concat(st.fresh.slice(0, st.allowance));

  // 雅思 500 词：先在本书内随机抽取当日新词，再打乱整轮题目。
  const fresh = shuffle(st.fresh).slice(0, st.allowance);
  return shuffle(st.due.concat(fresh));
}

function startSession(mode) {
  const queue = buildQueue(mode || 'review');
  if (!queue.length) {
    toast(mode === 'wrong' ? '当前词书的错词本为空。' : mode === 'fav' ? '当前词书的收藏夹为空。' : '当前没有到期或可学的新词，可调整每日上限或标签。');
    return;
  }
  state.ui.session = {
    mode: mode || 'review',
    queue: queue,
    i: 0,
    revealed: false,
    result: null,
    finished: false,
    grades: [],
    newCount: 0,
    reviewCount: 0
  };
  state.ui.view = 'words';
  if (location.hash !== '#/words') location.hash = '#/words';
  render();
}

function sessionExpected(item) {
  return state.settings.mode === 'B' ? (item.clozeAnswer || item.word) : item.word;
}

function checkWord() {
  const s = state.ui.session;
  if (!s || s.finished) return;
  const item = s.queue[s.i];
  const input = document.getElementById('spell-input') || document.getElementById('cloze-input');
  if (!input) return;
  const value = input.value;
  const expected = sessionExpected(item);
  const ok = normAnswer(value) === normAnswer(expected);
  s.result = { ok: ok, value: value, expected: expected };
  s.revealed = true;
  render();
}

function gradeWord(grade) {
  const s = state.ui.session;
  if (!s || s.finished) return;
  const item = s.queue[s.i];
  const existing = state.cards[item.key];
  const isNew = !existing;
  const q = SM2.qualityFromGrade(grade);
  const updated = SM2.review(existing || SM2.newCard(todayStr()), q, todayStr());
  state.cards[item.key] = updated;
  saveCards();

  const d = todayStr();
  if (!state.daily[d]) state.daily[d] = {};
  if (isNew) state.daily[d].newWords = (state.daily[d].newWords || 0) + 1;
  else state.daily[d].reviews = (state.daily[d].reviews || 0) + 1;
  saveDaily();

  // 错词本规则：1/2 档自动加入，4 档自动移出
  if (grade <= 2) markWrong(item.key, true);
  if (grade === 4) markWrong(item.key, false);

  s.grades.push(grade);
  if (isNew) s.newCount += 1; else s.reviewCount += 1;
  s.i += 1;
  s.revealed = false;
  s.result = null;
  if (s.i >= s.queue.length) s.finished = true;
  render();
}

function clozeHtml(text) {
  return esc(text || '').replace(/_{3,}/g, '<span class="cloze-blank"></span>');
}

function highlightWord(text, word) {
  const t = esc(text || '');
  const w = esc(word || '');
  if (!w) return t;
  try {
    const re = new RegExp('(' + escapeRegExp(w) + '\\w*)', 'i');
    return t.replace(re, '<span class="font-medium text-brand-700 dark:text-brand-300">$1</span>');
  } catch (e) {
    return t;
  }
}

function detailSection(label, html) {
  if (!html) return '';
  return '<div><div class="text-[11px] font-medium uppercase tracking-wide text-ink-400">' + label + '</div><div class="mt-1.5">' + html + '</div></div>';
}

function wordDetails(item) {
  const collocations = (item.collocations || []).map(function (c) {
    return '<span class="mr-1.5 mb-1.5 inline-block rounded-md bg-ink-100 px-2 py-0.5 text-xs text-ink-600 dark:bg-ink-800 dark:text-ink-300">' + esc(c) + '</span>';
  }).join('');
  const synonyms = (item.synonyms || []).map(function (s) {
    return '<span class="mr-1.5 mb-1.5 inline-block rounded-md bg-brand-50 px-2 py-0.5 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">' + esc(s) + '</span>';
  }).join('');

  return '<div class="mt-5 space-y-4 text-sm">' +
    '<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">' +
      (item.pos ? '<span class="text-xs text-ink-400">' + esc(item.pos) + '</span>' : '') +
      '<span class="text-lg">' + esc(item.meaning || '') + '</span>' +
    '</div>' +
    (item.phonetic ? '<div class="flex items-center gap-2 text-ink-400">' +
      '<span class="font-serif">' + esc(item.phonetic) + '</span></div>' : '') +
    detailSection('固定搭配', collocations) +
    detailSection('同义替换', synonyms) +
    detailSection('例句', item.example ? '<p class="font-serif text-[15px] leading-relaxed">' + highlightWord(item.example, item.word) + '</p>' : '') +
    detailSection('易错提示', item.pitfall ? '<p class="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">' + esc(item.pitfall) + '</p>' : '') +
    detailSection('标签', tagChips(item)) +
  '</div>';
}

function answerBanner(s, mode) {
  if (!s.result) return '';
  const ok = s.result.ok;
  const verb = mode === 'B' ? '回答' : '拼写';
  return '<div class="mb-4 rounded-lg border px-3 py-2 text-sm ' + (ok
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300') + '">' +
    (ok ? verb + '正确' : verb + '不符') + ' · 正确答案：<span class="font-semibold">' + esc(s.result.expected) + '</span>' +
    (ok ? '' : '<span class="ml-2 text-xs opacity-70">你输入：' + esc(s.result.value || '（空）') + '</span>') +
  '</div>';
}

function gradePanel(item) {
  const card = state.cards[item.key] || SM2.newCard(todayStr());
  const styles = {
    1: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50',
    2: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50',
    3: 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-900/50',
    4: 'border-brand-600 bg-brand-600 text-white hover:bg-brand-700'
  };
  return '<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">' + SM2.GRADES.map(function (g) {
    return '<button type="button" data-act="word:grade" data-grade="' + g.value + '" class="flex flex-col items-center gap-0.5 rounded-xl border px-3 py-2.5 text-sm ' + styles[g.value] + '">' +
      '<span class="font-medium">' + g.label + '</span>' +
      '<span class="text-[10px] opacity-70">' + SM2.previewInterval(card, g.q) + ' 天后</span>' +
    '</button>';
  }).join('') + '</div>' +
  '<p class="mt-2 text-center text-[10px] text-ink-400">SM-2 固定四档评分 · 1/2 档进入错词本，4 档移出 · 间隔与 EF 自动记录</p>';
}

function renderSession() {
  const s = state.ui.session;
  if (!s) return '';

  if (s.finished) {
    const total = s.grades.length;
    const good = s.grades.filter(function (g) { return g >= 3; }).length;
    const acc = total ? Math.round(good / total * 100) : 0;
    return '<div class="min-h-screen bg-ink-50 text-ink-900 dark:bg-ink-950 dark:text-ink-100">' +
      '<main class="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">' +
        '<div class="' + CARD + ' p-8 text-center">' +
          '<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">' + icon('check', 'w-6 h-6') + '</div>' +
          '<h1 class="mt-4 text-lg font-semibold">本轮完成</h1>' +
          '<p class="mt-1 text-sm ' + MUTED + '">' + (s.mode === 'wrong' ? '错词复习' : s.mode === 'fav' ? '收藏复习' : '今日学习') + '</p>' +
          '<div class="mt-5 grid grid-cols-3 gap-2 text-center">' +
            '<div class="rounded-lg bg-ink-50 py-2 dark:bg-ink-900/60"><div class="text-xl font-semibold tabular-nums">' + s.newCount + '</div><div class="text-[10px] text-ink-400">新词</div></div>' +
            '<div class="rounded-lg bg-ink-50 py-2 dark:bg-ink-900/60"><div class="text-xl font-semibold tabular-nums">' + s.reviewCount + '</div><div class="text-[10px] text-ink-400">复习</div></div>' +
            '<div class="rounded-lg bg-ink-50 py-2 dark:bg-ink-900/60"><div class="text-xl font-semibold tabular-nums">' + acc + '%</div><div class="text-[10px] text-ink-400">3/4 档以上</div></div>' +
          '</div>' +
          '<div class="mt-6 space-y-2">' +
            '<button type="button" data-act="session:again" class="w-full ' + BTN_PRIMARY + '">再学一轮</button>' +
            '<button type="button" data-act="session:exit" class="w-full ' + BTN + '">返回词库</button>' +
          '</div>' +
        '</div>' +
      '</main>' +
      timerPill() +
    '</div>';
  }

  const item = s.queue[s.i];
  const mode = state.settings.mode;
  const isSpell = mode === 'A' && state.settings.spelling;
  const total = s.queue.length;
  const pct = total ? Math.round((s.i / total) * 100) : 0;
  const expected = sessionExpected(item);
  const cloze = item.cloze || (item.example ? item.example.replace(new RegExp(escapeRegExp(item.word) + '\\w*', 'i'), '______') : '');

  let front;
  if (mode === 'A') {
    if (!s.revealed) {
      if (isSpell) {
        front = '<div class="text-center">' +
          '<p class="text-xs text-ink-400">根据释义默写单词</p>' +
          '<p class="mt-3 text-xl leading-relaxed">' + esc(item.meaning || '') + '</p>' +
          '<p class="mt-2 text-[11px] text-ink-400">首字母 ' + esc((item.word || '?')[0]) + ' · ' + (item.word || '').length + ' 个字母</p>' +
          '<input id="spell-input" type="text" autocomplete="off" spellcheck="false" class="mt-5 ' + INPUT + ' text-center" placeholder="输入英文单词">' +
          '<div class="mt-3 flex justify-center gap-2">' +
            '<button type="button" data-act="word:check" class="' + BTN_PRIMARY + '">核对拼写</button>' +
            '<button type="button" data-act="word:reveal" class="' + BTN + '">直接看答案</button>' +
          '</div>' +
        '</div>';
      } else {
        front = '<div class="py-6 text-center">' +
          '<div class="text-4xl font-semibold tracking-tight sm:text-5xl">' + esc(item.word) + '</div>' +
          '<div class="mt-4 flex justify-center">' + speakBtn(item.word, '英式发音') + '</div>' +
          '<p class="mt-6 text-[11px] text-ink-400">先在心里回忆释义与用法，再翻面</p>' +
        '</div>';
      }
    } else {
      front = '<div class="text-center">' +
        '<div class="text-3xl font-semibold tracking-tight sm:text-4xl">' + esc(item.word) + '</div>' +
        '<div class="mt-2">' + speakBtn(item.word, '英式发音') + '</div>' +
      '</div>' +
      answerBanner(s, mode === 'A' ? 'A' : 'B') +
      wordDetails(item);
    }
  } else {
    if (!s.revealed) {
      front = '<div>' +
        '<p class="text-xs text-ink-400">挖空猜词 · 在横线处填入缺失的单词</p>' +
        '<p class="mt-3 font-serif text-lg leading-loose">' + clozeHtml(cloze) + '</p>' +
        '<p class="mt-2 text-[11px] text-ink-400">提示：以 ' + esc(expected[0] || '?') + ' 开头 · ' + expected.length + ' 个字母</p>' +
        '<input id="cloze-input" type="text" autocomplete="off" spellcheck="false" class="mt-4 ' + INPUT + '" placeholder="输入缺失的单词">' +
        '<div class="mt-3 flex gap-2">' +
          '<button type="button" data-act="word:check" class="' + BTN_PRIMARY + '">核对答案</button>' +
          '<button type="button" data-act="word:reveal" class="' + BTN + '">不会，看答案</button>' +
        '</div>' +
      '</div>';
    } else {
      front = '<div class="text-center">' +
        '<div class="text-3xl font-semibold tracking-tight sm:text-4xl">' + esc(item.word) + '</div>' +
        '<div class="mt-2">' + speakBtn(item.word, '英式发音') + '</div>' +
      '</div>' +
      answerBanner(s, 'B') +
      (item.example ? '<p class="mt-4 rounded-lg bg-ink-50 px-3 py-2 font-serif text-sm leading-relaxed dark:bg-ink-900/60">' + highlightWord(item.example, item.word) + '</p>' : '') +
      wordDetails(item);
    }
  }

  return '<div class="min-h-screen bg-ink-50 text-ink-900 dark:bg-ink-950 dark:text-ink-100">' +
    '<header class="sticky top-0 z-20 border-b border-ink-200/80 bg-ink-50/95 dark:border-ink-800 dark:bg-ink-950/95">' +
      '<div class="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">' +
        '<button type="button" data-act="session:exit" class="' + BTN_SM + '">' + icon('arrowLeft', 'w-3.5 h-3.5') + '退出</button>' +
        '<div class="min-w-0 flex-1">' +
          '<div class="flex items-center justify-between text-[10px] text-ink-400"><span>' + (s.mode === 'wrong' ? '错词复习' : s.mode === 'fav' ? '收藏复习' : '今日学习') + '</span><span class="tabular-nums">' + (s.i + 1) + ' / ' + total + '</span></div>' +
          '<div class="mt-1 h-1 rounded bg-ink-200 dark:bg-ink-800"><div class="h-1 rounded bg-brand-500" style="width:' + pct + '%"></div></div>' +
        '</div>' +
        '<div class="flex shrink-0 gap-0.5 rounded-lg border border-ink-200 p-0.5 dark:border-ink-700">' +
          segButton(mode === 'A', 'A', 'data-act="session:mode" data-mode="A"') +
          segButton(mode === 'B', 'B', 'data-act="session:mode" data-mode="B"') +
        '</div>' +
      '</div>' +
    '</header>' +

    '<main class="mx-auto w-full max-w-2xl px-4 py-6">' +
      '<div class="mb-3 flex items-center justify-between">' +
        '<div class="flex flex-wrap gap-1.5">' + tagChips(item) + '</div>' +
        starBtn(item.key, state.fav.indexOf(item.key) >= 0) +
      '</div>' +

      '<div class="' + CARD + ' p-5 sm:p-7">' + front + '</div>' +

      '<div class="mt-4">' +
        (s.revealed
          ? gradePanel(item)
          : (mode === 'A' && !isSpell
              ? '<button type="button" data-act="word:reveal" class="w-full ' + BTN_PRIMARY + '">显示答案</button>'
              : '')) +
      '</div>' +

      '<div class="mt-3 flex flex-wrap items-center justify-center gap-3 text-[10px] text-ink-400">' +
        (mode === 'A' ? '<button type="button" data-act="session:spelling" class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-ink-100 dark:hover:bg-ink-800">' +
          '<span class="h-3 w-3 rounded border ' + (state.settings.spelling ? 'border-brand-600 bg-brand-600' : 'border-ink-300 dark:border-ink-600') + '"></span>拼写默写' +
          '</button>' : '') +
        '<span>' + (state.cards[item.key] ? '间隔 ' + (state.cards[item.key].interval || 1) + ' 天' : '新词') + '</span>' +
        '<span>EF ' + (state.cards[item.key] ? state.cards[item.key].ef : SM2.INITIAL_EF) + '</span>' +
        '<span class="tabular-nums">剩余 ' + (total - s.i - 1) + '</span>' +
      '</div>' +
    '</main>' +
    timerPill() +
  '</div>';
}

/* ============================== 6. 计时器 ============================== */

const speakTimers = {
  prep: { total: 60, remaining: 60, endAt: 0, running: false },
  answer: { total: 120, remaining: 120, endAt: 0, running: false }
};

const mock = {
  totalSeconds: 60 * 60,
  remaining: 60 * 60,
  running: false,
  active: false,
  endAt: 0,
  label: '阅读',
  recorded: false
};

let beepCtx = null;
function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!beepCtx) beepCtx = new Ctx();
    const osc = beepCtx.createOscillator();
    const gain = beepCtx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(beepCtx.destination);
    gain.gain.setValueAtTime(0.06, beepCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, beepCtx.currentTime + 0.5);
    osc.start();
    osc.stop(beepCtx.currentTime + 0.55);
  } catch (e) { /* 静默失败 */ }
}

function setMockPreset(minutes, label) {
  mock.totalSeconds = Math.max(60, Math.round(minutes * 60));
  mock.remaining = mock.totalSeconds;
  mock.running = false;
  mock.active = false;
  mock.endAt = 0;
  mock.label = label;
  mock.recorded = false;
}

function startMock() {
  if (mock.running) return;
  if (mock.remaining <= 0) {
    mock.remaining = mock.totalSeconds;
    mock.recorded = false;
  }
  mock.endAt = Date.now() + mock.remaining * 1000;
  mock.running = true;
  mock.active = true;
  render();
}

function pauseMock() {
  if (!mock.running) return;
  mock.remaining = Math.max(0, Math.ceil((mock.endAt - Date.now()) / 1000));
  mock.running = false;
  render();
}

function resetMock() {
  mock.running = false;
  mock.active = false;
  mock.remaining = mock.totalSeconds;
  mock.endAt = 0;
  mock.recorded = false;
  render();
}

function finishMock() {
  mock.running = false;
  mock.active = false;
  mock.remaining = 0;
  if (!mock.recorded) {
    mock.recorded = true;
    state.modules.mock.sessions += 1;
    state.modules.mock.minutes += Math.round(mock.totalSeconds / 60);
    touchModule('mock');
    bumpDaily('mock');
  }
  beep();
  toast('计时结束：' + mock.label);
  syncTimerPill();
  if (state.ui.view === 'mock') render();
}

function timerPill() {
  return '<div id="timer-pill" class="fixed bottom-4 right-4 z-50 hidden items-center gap-1 rounded-full border border-ink-200 bg-white/95 py-1 pl-3 pr-1 text-xs shadow-sm backdrop-blur dark:border-ink-700 dark:bg-ink-900/95">' +
    '<button type="button" data-act="mock:goto" class="flex items-center gap-2">' +
      '<span class="h-1.5 w-1.5 rounded-full bg-brand-500"></span>' +
      '<span id="pill-label" class="text-ink-400">计时</span>' +
      '<span id="pill-time" class="font-medium tabular-nums">00:00</span>' +
    '</button>' +
    '<button type="button" data-act="mock:pause" class="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800" title="暂停">' + icon('pause', 'w-3.5 h-3.5') + '</button>' +
  '</div>';
}

function syncTimerPill() {
  const pill = document.getElementById('timer-pill');
  if (!pill) return;
  const show = mock.active || mock.running;
  pill.classList.toggle('hidden', !show);
  pill.classList.toggle('flex', show);
  if (!show) return;
  const label = document.getElementById('pill-label');
  const time = document.getElementById('pill-time');
  if (label) label.textContent = mock.label + (mock.running ? '' : ' · 暂停');
  if (time) time.textContent = fmtClock(mock.remaining);
}

function updateMockDisplay() {
  const el = document.getElementById('mock-display');
  if (el) el.textContent = fmtClock(mock.remaining);
}

function updateSpeakTimerDom() {
  ['prep', 'answer'].forEach(function (k) {
    const nodes = document.querySelectorAll('[data-stimer="' + k + '"]');
    for (let i = 0; i < nodes.length; i++) nodes[i].textContent = fmtClock(speakTimers[k].remaining);
  });
}

function tick() {
  if (mock.running) {
    const rem = Math.max(0, Math.ceil((mock.endAt - Date.now()) / 1000));
    if (rem !== mock.remaining) {
      mock.remaining = rem;
      updateMockDisplay();
      syncTimerPill();
    }
    if (rem <= 0) finishMock();
  }

  let speakChanged = false;
  ['prep', 'answer'].forEach(function (k) {
    const t = speakTimers[k];
    if (!t.running) return;
    const rem = Math.max(0, Math.ceil((t.endAt - Date.now()) / 1000));
    if (rem !== t.remaining) { t.remaining = rem; speakChanged = true; }
    if (rem <= 0) {
      t.running = false;
      beep();
      toast(k === 'prep' ? '1 分钟准备结束' : '2 分钟作答结束');
    }
  });
  if (speakChanged) updateSpeakTimerDom();
}

/* ============================ 7. 主题与备份 ============================ */

function resolveTheme() {
  const t = state.settings.theme;
  if (t === 'light' || t === 'dark') return t;
  return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
}

function applyTheme() {
  const dark = resolveTheme() === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#121821' : '#f6f7f9');
}

function toggleTheme() {
  state.settings.theme = resolveTheme() === 'dark' ? 'light' : 'dark';
  saveSettings();
  applyTheme();
  render();
}

function exportBackup() {
  const data = {};
  Object.keys(STORAGE_KEYS).forEach(function (name) {
    const key = STORAGE_KEYS[name];
    const raw = localStorage.getItem(key);
    if (raw != null) {
      try { data[key] = JSON.parse(raw); } catch (e) { /* 跳过损坏项 */ }
    }
  });
  const payload = {
    app: 'ielts-study-workbench',
    schema: 1,
    exportedAt: new Date().toISOString(),
    data: data
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ielts-backup-' + todayStr() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  toast('备份已导出');
}

function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const parsed = JSON.parse(String(reader.result));
      const data = parsed && parsed.data ? parsed.data : parsed;
      if (!data || typeof data !== 'object') throw new Error('文件格式不正确');
      if (!window.confirm('导入将覆盖当前设备上的全部学习记录与设置，确定继续吗？')) return;

      Object.keys(STORAGE_KEYS).forEach(function (name) {
        localStorage.removeItem(STORAGE_KEYS[name]);
      });
      Object.keys(data).forEach(function (key) {
        if (key.indexOf(PREFIX) === 0) localStorage.setItem(key, JSON.stringify(data[key]));
      });

      state.settings = loadSettings();
      state.cards = loadJSON(STORAGE_KEYS.cards, {});
      state.daily = loadJSON(STORAGE_KEYS.daily, {});
      state.wrong = loadJSON(STORAGE_KEYS.wrong, []);
      state.fav = loadJSON(STORAGE_KEYS.favorites, []);
      state.modules = normalizeModules(loadJSON(STORAGE_KEYS.modules, {}));
      state.checklist = loadJSON(STORAGE_KEYS.checklist, {});
      state.ui.session = null;
      state.ui.writingChecked = {};
      state.ui.sentenceDone = new Set();
      state.ui.speakingDone = new Set();
      ensureBook();
      applyTheme();
      render();
      toast('导入完成');
    } catch (err) {
      toast('导入失败：' + err.message);
    }
  };
  reader.readAsText(file, 'utf-8');
}

function resetProgress() {
  if (!window.confirm('将清空全部 SM-2 排程、每日统计、错词本、收藏夹与练习记录（设置和词库保留）。确定吗？')) return;
  [STORAGE_KEYS.cards, STORAGE_KEYS.daily, STORAGE_KEYS.wrong, STORAGE_KEYS.favorites, STORAGE_KEYS.modules, STORAGE_KEYS.checklist].forEach(function (k) {
    localStorage.removeItem(k);
  });
  state.cards = {};
  state.daily = {};
  state.wrong = [];
  state.fav = [];
  state.modules = defaultModules();
  state.checklist = {};
  state.ui.session = null;
  state.ui.sentenceDone = new Set();
  state.ui.speakingDone = new Set();
  render();
  toast('学习记录已清空');
}

function ensureBook() {
  const list = books();
  if (!list.length) return;
  const exists = list.some(function (b) { return b.id === state.settings.bookId; });
  if (!exists) {
    state.settings.bookId = list[0].id;
    saveSettings();
  }
}

/* ============================ 8. 事件与路由 ============================ */

let toastTimer = null;
function toast(message) {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    host.className = 'pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4';
    document.body.appendChild(host);
  }
  host.innerHTML = '<div class="rounded-lg bg-ink-900 px-4 py-2 text-center text-sm text-white shadow-lg dark:bg-ink-100 dark:text-ink-900">' + esc(message) + '</div>';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { host.innerHTML = ''; }, 2600);
}

let voicesCache = [];
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  voicesCache = window.speechSynthesis.getVoices() || [];
}
if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function speak(text) {
  if (!('speechSynthesis' in window)) {
    toast('当前浏览器不支持语音合成');
    return;
  }
  if (!text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = 'en-GB';
    u.rate = 0.92;
    u.pitch = 1;
    let voice = voicesCache.filter(function (v) { return v.lang === 'en-GB'; })[0];
    if (!voice) voice = voicesCache.filter(function (v) { return String(v.lang).indexOf('en-GB') === 0; })[0];
    if (!voice) voice = voicesCache.filter(function (v) { return String(v.lang).indexOf('en') === 0; })[0];
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  } catch (err) {
    toast('语音播放失败');
  }
}

function openNav() {
  const overlay = document.getElementById('nav-overlay');
  if (overlay) overlay.classList.remove('hidden');
}
function closeNav() {
  const overlay = document.getElementById('nav-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function parseHash() {
  const h = String(location.hash || '').replace(/^#\/?/, '').split('?')[0];
  const found = NAV.filter(function (n) { return n.id === h; })[0];
  return found ? found.id : 'dashboard';
}

function onHashChange() {
  const view = parseHash();
  if (state.ui.session && view !== 'words') state.ui.session = null;
  state.ui.view = view;
  closeNav();
  render();
}

function afterRender() {
  syncTimerPill();
  updateMockDisplay();
  updateSpeakTimerDom();
  const ai = document.getElementById('ai-count');
  if (ai) {
    const text = state.forms['ai:text'] || '';
    ai.textContent = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  }
}

function render() {
  const app = document.getElementById('app');
  if (!app) return;
  const focused = state.ui.view === 'words' && state.ui.session;
  applyTheme();
  app.innerHTML = focused ? renderSession() : shell();
  afterRender();
}

function shell() {
  return '<div class="min-h-screen bg-ink-50 text-ink-900 dark:bg-ink-950 dark:text-ink-100">' +

    // 桌面侧栏
    '<aside class="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-ink-200/70 bg-white/70 px-3 py-6 backdrop-blur dark:border-ink-800 dark:bg-ink-950/60 md:flex">' +
      '<a href="#/dashboard" class="flex items-center gap-2.5 px-3">' +
        '<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-serif text-sm text-white">Aa</span>' +
        '<span><span class="block text-sm font-semibold leading-tight">雅思学习台</span><span class="block text-[10px] text-ink-400">Local-first</span></span>' +
      '</a>' +
      '<nav class="mt-6 space-y-0.5">' + NAV.map(navLink).join('') + '</nav>' +
      '<div class="mt-auto space-y-2 px-3">' +
        '<button type="button" data-act="theme:toggle" class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-900">' +
          icon(resolveTheme() === 'dark' ? 'sun' : 'moon', 'w-3.5 h-3.5') +
          '<span>' + (resolveTheme() === 'dark' ? '浅色模式' : '深色模式') + '</span></button>' +
        '<p class="text-[10px] leading-relaxed text-ink-400">数据保存在本机浏览器<br>无需登录 · 无广告</p>' +
      '</div>' +
    '</aside>' +

    // 移动端顶栏
    '<div class="md:pl-56">' +
      '<header class="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink-200/70 bg-ink-50/90 px-4 backdrop-blur dark:border-ink-800 dark:bg-ink-950/90 md:hidden">' +
        '<a href="#/dashboard" class="flex items-center gap-2">' +
          '<span class="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 font-serif text-xs text-white">Aa</span>' +
          '<span class="text-sm font-semibold">雅思学习台</span>' +
        '</a>' +
        '<div class="flex items-center gap-1">' +
          '<button type="button" data-act="theme:toggle" class="rounded-lg p-2 text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-900" aria-label="切换主题">' +
            icon(resolveTheme() === 'dark' ? 'sun' : 'moon', 'w-4 h-4') + '</button>' +
          '<button type="button" data-act="nav:open" class="rounded-lg p-2 text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-900" aria-label="打开菜单">' +
            icon('menu', 'w-4 h-4') + '</button>' +
        '</div>' +
      '</header>' +

      '<main class="mx-auto w-full max-w-3xl px-4 py-6 pb-24 sm:px-6 md:py-10">' + renderView() + '</main>' +
    '</div>' +

    // 移动端菜单
    '<div id="nav-overlay" class="fixed inset-0 z-40 hidden md:hidden">' +
      '<button type="button" data-act="nav:close" class="absolute inset-0 h-full w-full bg-ink-950/40" aria-label="关闭菜单"></button>' +
      '<div class="relative h-full w-72 max-w-[82%] border-r border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-950">' +
        '<div class="flex items-center justify-between px-1">' +
          '<span class="text-sm font-semibold">导航</span>' +
          '<button type="button" data-act="nav:close" class="rounded-lg p-2 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-900" aria-label="关闭">' + icon('close', 'w-4 h-4') + '</button>' +
        '</div>' +
        '<nav class="mt-3 space-y-0.5">' + NAV.map(navLink).join('') + '</nav>' +
        '<div class="mt-6 border-t border-ink-100 pt-4 dark:border-ink-800">' +
          '<button type="button" data-act="theme:toggle" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-900">' +
            icon(resolveTheme() === 'dark' ? 'sun' : 'moon', 'w-4 h-4') + '切换主题</button>' +
          '<p class="px-3 pt-3 text-[10px] leading-relaxed text-ink-400">学习记录仅保存在当前浏览器。</p>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<input type="file" id="import-file" accept=".json,application/json" class="hidden">' +
    timerPill() +
  '</div>';
}

/* ---------------------------- 事件委托 ---------------------------- */

document.addEventListener('click', function (e) {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.getAttribute('data-act');

  switch (act) {
    /* 导航 / 主题 */
    case 'nav:open': openNav(); return;
    case 'nav:close': closeNav(); return;
    case 'theme:toggle': toggleTheme(); return;

    /* 单词 */
    case 'words:start': startSession('review'); return;
    case 'words:start-wrong': startSession('wrong'); return;
    case 'words:start-fav': startSession('fav'); return;
    case 'words:tab': state.ui.wordTab = el.getAttribute('data-tab'); render(); return;
    case 'words:mode':
      state.settings.mode = el.getAttribute('data-mode') === 'B' ? 'B' : 'A';
      saveSettings();
      if (state.ui.session) { state.ui.session.revealed = false; state.ui.session.result = null; }
      render(); return;
    case 'words:spelling':
      state.settings.spelling = !state.settings.spelling;
      saveSettings();
      if (state.ui.session) { state.ui.session.revealed = false; state.ui.session.result = null; }
      render(); return;
    case 'session:mode':
      state.settings.mode = el.getAttribute('data-mode') === 'B' ? 'B' : 'A';
      saveSettings();
      state.ui.session.revealed = false;
      state.ui.session.result = null;
      render(); return;
    case 'session:spelling':
      state.settings.spelling = !state.settings.spelling;
      saveSettings();
      state.ui.session.revealed = false;
      state.ui.session.result = null;
      render(); return;
    case 'session:exit': state.ui.session = null; render(); return;
    case 'session:again': startSession(state.ui.session ? state.ui.session.mode : 'review'); return;
    case 'word:reveal': {
      const s = state.ui.session;
      if (s) { s.revealed = true; s.result = null; render(); }
      return;
    }
    case 'word:check': checkWord(); return;
    case 'word:grade': gradeWord(Number(el.getAttribute('data-grade'))); return;
    case 'word:fav': {
      toggleFav(el.getAttribute('data-key'));
      render();
      return;
    }
    case 'word:unwrong':
      markWrong(el.getAttribute('data-key'), false);
      render();
      return;
    case 'speak:word':
      speak(el.getAttribute('data-word'));
      return;

    /* 同义替换 */
    case 'syn:new': initSynonym(true); render(); return;
    case 'syn:left': {
      const syn = state.ui.syn;
      const i = Number(el.getAttribute('data-i'));
      if (!syn || syn.matched.indexOf(i) >= 0) return;
      syn.selected = i;
      syn.wrong = null;
      render();
      return;
    }
    case 'syn:right': {
      const syn = state.ui.syn;
      const j = Number(el.getAttribute('data-i'));
      if (!syn || syn.matched.indexOf(j) >= 0) return;
      if (syn.selected == null) { toast('先选择左侧的表达'); return; }
      if (syn.selected === j) {
        syn.matched.push(j);
        syn.selected = null;
        syn.wrong = null;
        state.modules.synonym.pairs += 1;
        if (syn.matched.length === (state.data.synonym.sets.filter(function (s) { return s.id === syn.setId; })[0].pairs || []).length) {
          syn.done = true;
          if (!syn.recorded) {
            syn.recorded = true;
            state.modules.synonym.sessions += 1;
            state.modules.synonym.mistakes += syn.mistakes;
            touchModule('synonym');
            bumpDaily('synonym');
          }
        }
      } else {
        syn.mistakes += 1;
        syn.wrong = { left: syn.selected, right: j };
      }
      saveModules();
      render();
      return;
    }

    /* 长难句 */
    case 'sentence:prev':
      state.ui.sentenceIdx = Math.max(0, state.ui.sentenceIdx - 1); render(); return;
    case 'sentence:next':
      state.ui.sentenceIdx += 1; render(); return;
    case 'sentence:reveal': {
      const cur = currentSentence();
      if (!cur) return;
      const part = el.getAttribute('data-part');
      const rev = state.ui.reveals[cur.item.id] || {};
      rev[part] = !rev[part];
      state.ui.reveals[cur.item.id] = rev;
      render();
      return;
    }
    case 'sentence:done': {
      const cur = currentSentence();
      if (!cur) return;
      if (!state.ui.sentenceDone.has(cur.item.id)) {
        state.ui.sentenceDone.add(cur.item.id);
        state.modules.sentence.studied += 1;
        touchModule('sentence');
        bumpDaily('sentence');
      }
      render();
      return;
    }

    /* 写作 */
    case 'writing:tab': state.ui.writingTab = el.getAttribute('data-tab'); render(); return;
    case 'writing:cat': state.ui.writingT1Cat = el.getAttribute('data-cat'); render(); return;
    case 'writing:topic': state.ui.writingT2Topic = el.getAttribute('data-topic'); render(); return;
    case 'writing:check': checkWriting(el.getAttribute('data-kind'), el.getAttribute('data-id')); return;
    case 'writing:redo': {
      const kind = el.getAttribute('data-kind');
      const id = el.getAttribute('data-id');
      delete state.ui.writingChecked[kind + ':' + id];
      delete state.forms[(kind === 'pattern' ? 'w1:' : 'w2:') + id];
      render();
      return;
    }
    case 'checklist:toggle': {
      const id = el.getAttribute('data-id');
      if (state.checklist[id]) delete state.checklist[id];
      else state.checklist[id] = true;
      saveJSON(STORAGE_KEYS.checklist, state.checklist);
      render();
      return;
    }
    case 'checklist:reset':
      state.checklist = {};
      saveJSON(STORAGE_KEYS.checklist, state.checklist);
      render();
      return;

    /* 口语 */
    case 'speaking:tab':
      state.ui.speakingTab = el.getAttribute('data-tab');
      resetSpeakTimers();
      render();
      return;
    case 'speaking:idx': {
      const list = (state.data.speaking && state.data.speaking.part2) || [];
      const i = Number(el.getAttribute('data-i'));
      state.ui.speakingIdx = clamp(i, 0, list.length - 1);
      resetSpeakTimers();
      render();
      return;
    }
    case 'speaking:open': {
      const id = el.getAttribute('data-id');
      state.ui.speakingOpen[id] = !state.ui.speakingOpen[id];
      render();
      return;
    }
    case 'speaking:done': {
      const id = el.getAttribute('data-id');
      if (!state.ui.speakingDone.has(id)) {
        state.ui.speakingDone.add(id);
        state.modules.speaking.cards += 1;
        touchModule('speaking');
        bumpDaily('speaking');
      }
      render();
      return;
    }
    case 'speaking:start': {
      const kind = el.getAttribute('data-kind');
      const t = speakTimers[kind];
      if (!t || t.running) return;
      if (t.remaining <= 0) t.remaining = t.total;
      t.endAt = Date.now() + t.remaining * 1000;
      t.running = true;
      updateSpeakTimerDom();
      return;
    }
    case 'speaking:reset-one': {
      const kind = el.getAttribute('data-kind');
      const t = speakTimers[kind];
      if (!t) return;
      t.remaining = t.total;
      t.running = false;
      t.endAt = 0;
      updateSpeakTimerDom();
      return;
    }
    case 'speaking:reset':
      resetSpeakTimers();
      updateSpeakTimerDom();
      render();
      return;

    /* 模考 */
    case 'mock:preset':
      setMockPreset(Number(el.getAttribute('data-min')), el.getAttribute('data-label'));
      render();
      return;
    case 'mock:custom': {
      const val = Number(state.forms['mock:minutes']);
      if (!val || val < 1 || val > 300) { toast('请输入 1–300 之间的分钟数'); return; }
      setMockPreset(val, '自定义');
      render();
      return;
    }
    case 'mock:start': startMock(); return;
    case 'mock:pause': pauseMock(); return;
    case 'mock:reset': resetMock(); return;
    case 'mock:goto':
      if (state.ui.view !== 'mock') { location.hash = '#/mock'; }
      return;

    /* 设置 / 数据 */
    case 'settings:tag': {
      const tag = el.getAttribute('data-tag');
      const tags = state.settings.tags || [];
      const idx = tags.indexOf(tag);
      if (idx >= 0) tags.splice(idx, 1); else tags.push(tag);
      state.settings.tags = tags;
      saveSettings();
      render();
      return;
    }
    case 'settings:theme':
      state.settings.theme = el.getAttribute('data-theme');
      saveSettings();
      applyTheme();
      render();
      return;
    case 'backup:export': exportBackup(); return;
    case 'backup:import': {
      const input = document.getElementById('import-file');
      if (input) input.click();
      return;
    }
    case 'progress:reset': resetProgress(); return;
    case 'ai:check':
      toast('AI 批改接口已预留，本版本未接入 API');
      return;

    default:
      return;
  }
});

document.addEventListener('input', function (e) {
  const t = e.target;
  if (t && t.getAttribute && t.getAttribute('data-bind')) {
    state.forms[t.getAttribute('data-bind')] = t.value;
  }
  if (t && t.id === 'ai-text') {
    const el = document.getElementById('ai-count');
    if (el) {
      const v = t.value.trim();
      el.textContent = v ? v.split(/\s+/).filter(Boolean).length : 0;
    }
  }
});

document.addEventListener('change', function (e) {
  const t = e.target;

  if (t.id === 'book-select') {
    state.settings.bookId = t.value;
    saveSettings();
    state.ui.session = null;
    render();
    return;
  }

  if (t.id === 'limit-input') {
    state.settings.dailyNewLimit = clamp(Number(t.value) || 0, 0, 500);
    saveSettings();
    render();
    return;
  }

  if (t.getAttribute && t.getAttribute('data-tag')) {
    const tag = t.getAttribute('data-tag');
    const tags = state.settings.tags || [];
    const idx = tags.indexOf(tag);
    if (t.checked && idx < 0) tags.push(tag);
    if (!t.checked && idx >= 0) tags.splice(idx, 1);
    state.settings.tags = tags;
    saveSettings();
    render();
    return;
  }

  if (t.id === 'import-file') {
    const file = t.files && t.files[0];
    importBackup(file);
    t.value = '';
  }
});

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  if (e.target && (e.target.id === 'spell-input' || e.target.id === 'cloze-input')) {
    e.preventDefault();
    checkWord();
  }
});

window.addEventListener('hashchange', onHashChange);

/* ============================== 启动 ============================== */

function renderBootError(err) {
  const isFile = location.protocol === 'file:';
  const detail = err && err.message ? err.message : String(err);
  document.getElementById('app').innerHTML =
    '<div class="flex min-h-screen items-center justify-center px-6 py-12">' +
      '<div class="w-full max-w-lg rounded-2xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">' +
        '<h1 class="text-base font-semibold">题库加载失败</h1>' +
        '<p class="mt-2 text-sm text-ink-500 dark:text-ink-400">无法读取 <code class="rounded bg-ink-100 px-1 dark:bg-ink-800">./data/*.json</code>。' +
        (isFile ? '当前页面是通过 <code class="rounded bg-ink-100 px-1 dark:bg-ink-800">file://</code> 直接打开的，浏览器出于安全限制会阻止本地 JSON 请求。' : '') + '</p>' +
        '<p class="mt-3 rounded-lg bg-ink-50 px-3 py-2 font-mono text-xs text-ink-600 dark:bg-ink-950 dark:text-ink-300">' + esc(detail) + '</p>' +
        (isFile ? '<div class="mt-4 text-sm"><p class="font-medium">请在项目目录启动一个静态服务器：</p>' +
          '<pre class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs leading-relaxed text-ink-100">cd D:\\ielts22\nnode serve.js</pre>' +
          '<p class="mt-2 text-xs text-ink-400">然后打开 http://localhost:8000 。（serve.js 仅用于本地预览，不是应用后端。）</p></div>' : '') +
      '</div>' +
    '</div>';
  applyTheme();
}

async function loadData() {
  const files = {
    wordlist: './data/wordlist.json',
    synonym: './data/synonym.json',
    longsentence: './data/longsentence.json',
    writing: './data/writing.json',
    speaking: './data/speaking.json'
  };
  const pairs = await Promise.all(Object.keys(files).map(async function (name) {
    const res = await fetch(files[name], { cache: 'no-store' });
    if (!res.ok) throw new Error(files[name] + ' → HTTP ' + res.status);
    return [name, await res.json()];
  }));
  pairs.forEach(function (pair) { state.data[pair[0]] = pair[1] || {}; });
  await loadExtraWordBooks();
}

// 雅思 500 词是独立数据文件：加载失败时不影响原有词书和应用启动。
async function loadExtraWordBooks() {
  try {
    const res = await fetch('./data/ielts500.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('./data/ielts500.json → HTTP ' + res.status);
    const payload = await res.json();
    const book = payload && payload.book;
    if (!book || !Array.isArray(book.words) || !book.words.length) {
      throw new Error('./data/ielts500.json 缺少 book.words');
    }
    if (!Array.isArray(state.data.wordlist.books)) state.data.wordlist.books = [];
    const list = state.data.wordlist.books;
    let replaced = false;
    for (let i = 0; i < list.length; i += 1) {
      if (list[i].id === book.id) { list[i] = book; replaced = true; break; }
    }
    if (!replaced) list.push(book);
  } catch (err) {
    console.warn('[words] 雅思 500 词库未加载：', err);
  }
}

async function boot() {
  applyTheme();
  state.ui.view = parseHash();
  try {
    await loadData();
  } catch (err) {
    console.error('[boot]', err);
    renderBootError(err);
    return;
  }
  ensureBook();
  render();
  setInterval(tick, 250);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
