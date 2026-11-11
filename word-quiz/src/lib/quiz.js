export const TYPES = ['en2zh', 'zh2en', 'cloze']

export const TYPE_LABELS = Object.freeze({
  en2zh: '英译汉',
  zh2en: '汉译英',
  cloze: '选词填空'
})

export const MODES = [
  { value: 'mix', label: '随机混合' },
  { value: 'en2zh', label: '英译汉' },
  { value: 'zh2en', label: '汉译英' },
  { value: 'cloze', label: '选词填空' }
]

const CN_PUNCTUATION = /[\s　，。；、,.!?！？:：;'"“”‘’（）()【】\[\]…—\-·]/g

/** 洗牌，返回新数组，不修改入参 */
export function shuffle(list) {
  const result = list.slice()
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** 英文答案标准化：忽略大小写、首尾标点和多余空格 */
export function normalizeEn(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[^a-z]+|[^a-z]+$/g, '')
}

/** 中文答案标准化：忽略空格、中英文标点和词性符号 */
export function normalizeCn(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(CN_PUNCTUATION, '')
}

function senseKeyOf(word) {
  return [...new Set((word.senses || []).map(normalizeCn).filter(Boolean))].sort().join('|')
}

function hasSenseOverlap(a, b) {
  const left = (a.senses || []).map(normalizeCn).filter(Boolean)
  const right = (b.senses || []).map(normalizeCn).filter(Boolean)
  return left.some((x) =>
    right.some((y) => {
      if (x === y) return true
      if (x.length < 2 || y.length < 2) return false
      return x.includes(y) || y.includes(x)
    })
  )
}

/**
 * 建立词库索引：
 * - 同一个中文义项集合的单词视为同义词组（例如 assess / evaluate）
 * - 汉译英接受同义词组内的任意答案
 */
export function createWordIndex(words) {
  const bySense = new Map()
  for (const word of words) {
    const key = senseKeyOf(word)
    if (!bySense.has(key)) bySense.set(key, [])
    bySense.get(key).push(word)
  }

  const info = new Map()
  for (const word of words) {
    const key = senseKeyOf(word)
    const group = bySense.get(key)
    const english = new Set()
    for (const item of group) {
      english.add(normalizeEn(item.word))
      for (const alias of item.aliases || []) english.add(normalizeEn(alias))
    }
    info.set(word.id, { word, senseKey: key, group, english })
  }

  return { bySense, info }
}

export function isChineseAnswerCorrect(input, word) {
  const answer = normalizeCn(input)
  if (!answer) return false

  const senses = [...new Set((word.senses || []).map(normalizeCn).filter(Boolean))]
  if (senses.includes(answer)) return true

  // 允许“适应”“适应，改编”这类包含任一义项的回答。
  return senses.some(
    (sense) => sense.length >= 2 && answer.length >= 2 && (answer.includes(sense) || sense.includes(answer))
  )
}

export function isEnglishAnswerCorrect(input, word, index) {
  const value = normalizeEn(input)
  if (!value) return false
  const entry = index.info.get(word.id)
  return Boolean(entry && entry.english.has(value))
}

export function getAcceptedWords(word, index) {
  const entry = index.info.get(word.id)
  if (!entry) return [word.word]
  const seen = new Set()
  const result = []
  for (const item of entry.group) {
    const key = normalizeEn(item.word)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item.word)
  }
  return result
}

function makeOptions(target, words, index) {
  const targetInfo = index.info.get(target.id)
  const targetWord = normalizeEn(target.word)
  const sameWord = (item) => normalizeEn(item.word) === targetWord

  const safe = words.filter(
    (item) =>
      item.id !== target.id &&
      !sameWord(item) &&
      index.info.get(item.id).senseKey !== targetInfo.senseKey &&
      !hasSenseOverlap(target, item)
  )

  const picks = []
  const usedIds = new Set()
  const usedWords = new Set([targetWord])

  function take(list) {
    for (const item of shuffle(list)) {
      if (picks.length >= 3) return
      const key = normalizeEn(item.word)
      if (usedIds.has(item.id) || usedWords.has(key)) continue
      usedIds.add(item.id)
      usedWords.add(key)
      picks.push(item.word)
    }
  }

  // 优先同词性，避免选项一眼就能按词性排除
  take(safe.filter((item) => item.pos.some((pos) => target.pos.includes(pos))))
  take(safe)

  // 极端兜底：只排除同词和同义项，保证仍能凑满四个选项
  if (picks.length < 3) {
    take(
      words.filter(
        (item) =>
          item.id !== target.id &&
          !sameWord(item) &&
          index.info.get(item.id).senseKey !== targetInfo.senseKey
      )
    )
  }

  if (picks.length < 3) {
    throw new Error(`词库中无法为 ${target.word} 生成四个不重复选项`)
  }

  return shuffle([target.word, ...picks])
}

/** 生成一轮牌堆；混合模式保证三种题型数量尽量均衡 */
export function buildDeck(words, mode) {
  const shuffled = shuffle(words)
  const activeMode = MODES.some((item) => item.value === mode) ? mode : 'mix'

  let types
  if (activeMode === 'mix') {
    types = []
    while (types.length < shuffled.length) {
      for (const type of shuffle(TYPES)) {
        types.push(type)
        if (types.length >= shuffled.length) break
      }
    }
  } else {
    types = shuffled.map(() => activeMode)
  }

  return shuffled.map((word, index) => ({ word, type: types[index] }))
}

export function createQuestion(item, words, index) {
  const question = {
    key: `${item.word.id}-${item.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    word: item.word,
    type: item.type
  }
  if (item.type === 'cloze') {
    question.options = makeOptions(item.word, words, index)
  }
  return question
}

export function correctAnswer(question) {
  return question.type === 'en2zh' ? question.word.meaning : question.word.word
}

export function gradeQuestion(question, value, index) {
  const given = String(value ?? '').trim()
  if (!given) return { correct: false, given, alternative: false }

  if (question.type === 'en2zh') {
    return { correct: isChineseAnswerCorrect(given, question.word), given, alternative: false }
  }

  if (question.type === 'zh2en') {
    const correct = isEnglishAnswerCorrect(given, question.word, index)
    const alternative = correct && normalizeEn(given) !== normalizeEn(question.word.word)
    return { correct, given, alternative }
  }

  return {
    correct: normalizeEn(given) === normalizeEn(question.word.word),
    given,
    alternative: false
  }
}
