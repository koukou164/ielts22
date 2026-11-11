#!/usr/bin/env node
/* ============================================================================
 * parse-word-md.mjs — 把根目录 word.md 解析成现有单词模块可直接加载的词书
 * ----------------------------------------------------------------------------
 * 输入：D:\ielts22\word.md
 * 输出：D:\ielts22\data\ielts500.json
 *
 * 只提取 word.md 已有的英文、音标、词性、中文释义：
 *   - 不新增、不删除任何词条；
 *   - 重复词条原样保留（appetite、colleague）；
 *   - word.md 没有例句/搭配，因此 cloze 字段用“______（中文释义）”生成
 *     释义挖空提示，供现有 B 模式使用，不虚构例句。
 *
 * 运行：npm run parse:words
 * ========================================================================== */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'word.md')
const OUT = path.join(ROOT, 'data', 'ielts500.json')

const BOOK_ID = 'ielts-500'
const BOOK_NAME = '雅思500高频乱序词'
const EXPECTED_TOTAL = 500

// 音标：/.../；排除中文，避免把 v./n. 里的斜杠误判成音标。
const PHONETIC_RE = /\/[^/\n\u4e00-\u9fff]+\//g
// 词性：n. / v. / adj. / adv.，以及 v./n. 这类组合。
const POS_UNIT = '(?:n|v|adj|adv|prep|conj|pron|num|art|int)\\.'
const POS_RE = new RegExp('\\b' + POS_UNIT + '(?:\\s*\\/\\s*' + POS_UNIT + ')*', 'gi')
// 括号中的英文拼写变体，例如 分析（analyze）。
const ALIAS_RE = /[（(]\s*([A-Za-z][A-Za-z\s'’-]*?)\s*[）)]/g

const LINE_RE = /^\s*(\d+)\.\s+([A-Za-z][A-Za-z'’-]*)\s+(.*)$/

function fail(message) {
  console.error('\n[parse-word-md] ' + message + '\n')
  process.exit(1)
}

function cleanSegment(segment) {
  return String(segment)
    .replace(ALIAS_RE, '')
    .replace(/\s+/g, '')
    .replace(/^[；;，,、]+|[；;，,、]+$/g, '')
}

function parseEntry(line, lineNo) {
  const match = line.match(LINE_RE)
  if (!match) fail('第 ' + lineNo + ' 行无法解析：' + line)

  const index = Number(match[1])
  const word = match[2]
  const rest = match[3]

  const phonetics = [...rest.matchAll(PHONETIC_RE)].map((item) => item[0].trim())
  if (!phonetics.length) fail('第 ' + lineNo + ' 行缺少音标：' + line)

  let body = rest.replace(PHONETIC_RE, ' ')

  const posList = []
  for (const item of body.matchAll(POS_RE)) {
    item[0].replace(/\s+/g, '').split('/').forEach((pos) => {
      if (pos && posList.indexOf(pos) < 0) posList.push(pos)
    })
  }

  const segments = body
    .replace(POS_RE, '|')
    .split('|')
    .map((segment) => segment.trim())
    .filter(Boolean)

  const aliases = []
  segments.forEach((segment) => {
    for (const aliasMatch of segment.matchAll(ALIAS_RE)) {
      const alias = aliasMatch[1].trim().replace(/\s+/g, ' ')
      if (alias.length >= 2 && aliases.indexOf(alias) < 0) aliases.push(alias)
    }
  })

  const meaning = segments
    .map(cleanSegment)
    .filter(Boolean)
    .join('；')

  if (!meaning) fail('第 ' + lineNo + ' 行缺少中文释义：' + line)

  const pos = posList.join('/')
  const phonetic = phonetics.join(' ')

  return {
    id: 'i' + String(index).padStart(3, '0'),
    word: word,
    phonetic: phonetic,
    pos: pos,
    meaning: meaning,
    // word.md 没有例句/搭配；用中文释义生成 B 模式的释义挖空提示。
    collocations: [],
    synonyms: aliases,
    example: '',
    cloze: '______（' + (pos ? pos + ' ' : '') + meaning + '）',
    clozeAnswer: word,
    pitfall: '',
    // word.md 没有标签分类；留空，由 app.js 的 tagMatch 对无标签词放行。
    tags: []
  }
}

function main() {
  if (!fs.existsSync(SRC)) fail('找不到 ' + SRC)

  const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/)
  const entries = []
  const unparsed = []

  lines.forEach((line, idx) => {
    const lineNo = idx + 1
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    if (!LINE_RE.test(line)) {
      unparsed.push({ lineNo, line: trimmed })
      return
    }
    entries.push(parseEntry(line, lineNo))
  })

  if (unparsed.length) {
    fail('有 ' + unparsed.length + ' 行无法解析：\n' + unparsed.slice(0, 8).map((x) => '  第 ' + x.lineNo + ' 行：' + x.line).join('\n'))
  }
  if (entries.length !== EXPECTED_TOTAL) {
    fail('词条数量应为 ' + EXPECTED_TOTAL + '，实际解析到 ' + entries.length + ' 条。')
  }

  const idSet = new Set()
  entries.forEach((entry) => {
    if (idSet.has(entry.id)) fail('重复 id：' + entry.id)
    idSet.add(entry.id)
    if (!entry.word || !entry.phonetic || !entry.meaning) {
      fail('词条字段不完整：' + JSON.stringify(entry))
    }
  })

  const counts = new Map()
  entries.forEach((entry) => {
    const key = entry.word.toLowerCase()
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  const duplicates = []
  counts.forEach((count, word) => {
    if (count > 1) duplicates.push({ word: word, count: count })
  })

  const payload = {
    _note: '由 scripts/parse-word-md.mjs 从根目录 word.md 自动生成，请勿手动修改。' +
      '词条只包含 word.md 中已有的英文、音标、词性和中文释义；没有虚构例句。',
    _copyrightWarning: '词条来源于 word.md。公开部署前请确认该词库的版权与授权。',
    meta: {
      source: 'word.md',
      bookId: BOOK_ID,
      title: BOOK_NAME,
      total: entries.length,
      unique: counts.size,
      duplicates: duplicates
    },
    book: {
      id: BOOK_ID,
      name: BOOK_NAME,
      words: entries
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8')

  console.log('[parse-word-md] 已生成 ' + path.relative(ROOT, OUT))
  console.log('  词条 ' + entries.length + ' 条 · 不同单词 ' + counts.size + ' 个')
  if (duplicates.length) {
    console.log('  重复词条：' + duplicates.map((d) => d.word + '×' + d.count).join('、'))
  }
  const aliasCount = entries.filter((entry) => entry.synonyms.length).length
  console.log('  含拼写变体的条目：' + aliasCount + ' 条')
}

main()
