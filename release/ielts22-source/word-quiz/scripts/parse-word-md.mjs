/**
 * 把项目根目录的 word.md 解析成 src/data/words.json。
 * word.md 是唯一词库来源，脚本不会补充、替换或删除任何单词。
 *
 * 支持的行格式：
 *   1. advocate /ˈædvəkət/ n. 支持者 /ˈædvəkeɪt/ v. 提倡
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectDir = path.resolve(__dirname, '..')
const sourcePath = path.resolve(projectDir, '..', 'word.md')
const outputPath = path.join(projectDir, 'src', 'data', 'words.json')
const EXPECTED_COUNT = 500

const POS_TAGS = 'n|v|vt|vi|adj|adv|prep|conj|pron|num|art|int|aux'

function unique(list) {
  return [...new Set(list)]
}

function cleanup(text) {
  return text.replace(/\s+/g, ' ').replace(/\s*；\s*/g, '；').trim()
}

function buildSenses(displayMeaning) {
  // 去掉词性标记后按中文义项切分
  const stripped = displayMeaning
    .replace(new RegExp(`(^|[\\s/；;，,、])(${POS_TAGS})\\.(?=\\s|/|；|;|，|,|、|$)`, 'gi'), '$1')
    .replace(/\s+/g, ' ')
    .trim()

  const parts = stripped
    .split(/[；;，,、/]/)
    .map((part) => part.trim())
    .filter(Boolean)

  const senses = new Set()
  for (const part of parts) {
    const withoutParen = part.replace(/[（(][^）)]*[）)]/g, '').trim()
    const flat = part.replace(/[（）()]/g, '').replace(/\s+/g, '').trim()
    if (withoutParen) senses.add(withoutParen)
    if (flat) senses.add(flat)

    const innerGroups = [...part.matchAll(/[（(]([^）)]*)[）)]/g)]
    for (const match of innerGroups) {
      const innerParts = match[1]
        .split(/[、，,；;/]/)
        .map((item) => item.trim())
        .filter(Boolean)

      for (const inner of innerParts) {
        if (inner.length >= 2) senses.add(inner)
        const combo = `${withoutParen}${inner}`
        if (combo.length >= 2) senses.add(combo)
      }
    }
  }

  // 极端情况下至少保留去掉词性后的整句
  if (!senses.size && stripped) senses.add(stripped)
  return [...senses]
}

function parseLine(line) {
  const match = line.match(/^\s*(\d+)\.\s+([A-Za-z][A-Za-z'’-]*)\s+(.*)$/)
  if (!match) return null

  const id = Number(match[1])
  const word = match[2]
  const rest = match[3]
  const phoneticMatches = [...rest.matchAll(/\/[^/]+\//g)]
  if (!phoneticMatches.length) {
    throw new Error(`第 ${id} 条缺少音标：${line}`)
  }

  const phonetics = unique(phoneticMatches.map((item) => item[0]))

  // 第一个音标是主音标；后续音标通常对应另一词性，换成中文分号保留语义分组
  let meaningRaw = rest
  phoneticMatches.forEach((item, index) => {
    meaningRaw = meaningRaw.replace(item[0], index === 0 ? ' ' : '；')
  })
  meaningRaw = cleanup(meaningRaw)

  // 音标里可能含 (r)，此时已经随音标一起移除。
  // 中文释义里偶尔用括号补充英式/美式拼写，如“分析（analyze）”，
  // 把它收进 aliases，同时从展示文本中移除，避免汉译英题面泄露答案。
  const aliases = []
  const displayMeaning = cleanup(
    meaningRaw.replace(/[（(]\s*([A-Za-z][A-Za-z'’ -]*?)\s*[）)]/g, (_, alias) => {
      const value = alias.trim()
      if (value.length >= 2) aliases.push(value)
      return ''
    })
  )

  const pos = unique(
    [...displayMeaning.matchAll(new RegExp(`\\b(${POS_TAGS})\\.`, 'gi'))].map((item) => item[1].toLowerCase())
  )

  if (!pos.length) throw new Error(`第 ${id} 条缺少词性标记：${line}`)
  if (!/[一-龥]/.test(displayMeaning)) throw new Error(`第 ${id} 条缺少中文释义：${line}`)

  return {
    id,
    word,
    phonetic: phonetics[0],
    phonetics,
    meaning: displayMeaning,
    promptMeaning: displayMeaning,
    pos,
    aliases: unique(aliases.map((item) => item.toLowerCase())),
    senses: buildSenses(displayMeaning)
  }
}

function main() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`找不到词库文件：${sourcePath}`)
  }

  const raw = fs.readFileSync(sourcePath, 'utf8')
  const entries = []
  const ignored = []

  for (const [index, line] of raw.split(/\r?\n/).entries()) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const parsed = parseLine(line)
    if (!parsed) {
      ignored.push({ line: index + 1, text: line.trim() })
      continue
    }
    entries.push(parsed)
  }

  if (ignored.length) {
    throw new Error(`存在 ${ignored.length} 行无法解析，请检查格式：\n${ignored.map((item) => `  第 ${item.line} 行：${item.text}`).join('\n')}`)
  }
  if (entries.length !== EXPECTED_COUNT) {
    throw new Error(`词库应为 ${EXPECTED_COUNT} 条，实际解析到 ${entries.length} 条。为避免词库被误改，构建已中止。`)
  }

  const idSet = new Set(entries.map((entry) => entry.id))
  if (idSet.size !== entries.length) {
    throw new Error('词库编号存在重复，请检查 word.md。')
  }

  const wordCounts = new Map()
  for (const entry of entries) {
    const key = entry.word.toLowerCase()
    wordCounts.set(key, (wordCounts.get(key) || 0) + 1)
  }
  const duplicates = [...wordCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([word, count]) => ({ word, count }))

  const payload = {
    meta: {
      source: 'word.md',
      title: '雅思500高频核心词汇（乱序版）',
      total: entries.length,
      unique: wordCounts.size,
      duplicates
    },
    words: entries
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  console.log(`已解析 ${entries.length} 条词条（${wordCounts.size} 个不同单词）→ ${path.relative(process.cwd(), outputPath)}`)
  if (duplicates.length) {
    console.warn(`提示：word.md 中有重复词条：${duplicates.map((item) => `${item.word} ×${item.count}`).join('、')}。已按原样保留。`)
  }
}

main()
