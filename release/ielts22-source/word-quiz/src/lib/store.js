import { reactive } from 'vue'
import { normalizeEn } from './quiz.js'

export const STORAGE_KEY = 'ielts.word-quiz.v1'
const MAX_RECORDS = 3000
const ALLOWED_MODES = ['mix', 'en2zh', 'zh2en', 'cloze']

function emptyState() {
  return {
    settings: { mode: 'mix' },
    records: [],
    wrong: []
  }
}

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function load() {
  const base = emptyState()
  if (typeof localStorage === 'undefined') return base

  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!parsed || typeof parsed !== 'object') return base

    if (parsed.settings && ALLOWED_MODES.includes(parsed.settings.mode)) {
      base.settings.mode = parsed.settings.mode
    }

    if (Array.isArray(parsed.records)) {
      base.records = parsed.records
        .filter((item) => item && typeof item.at === 'number' && item.word && item.type)
        .slice(-MAX_RECORDS)
    }

    if (Array.isArray(parsed.wrong)) {
      base.wrong = parsed.wrong.filter((item) => item && item.key && item.word && item.type)
    }
  } catch (error) {
    console.warn('[word-quiz] 读取本地记录失败，将使用空数据。', error)
  }

  return base
}

export const store = reactive(load())

function write() {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      settings: store.settings,
      records: store.records,
      wrong: store.wrong
    })
  )
}

function persist() {
  try {
    write()
  } catch (error) {
    // localStorage 写满时优先保留错题本和最近记录
    if (store.records.length > 500) {
      store.records.splice(0, store.records.length - 500)
      try {
        write()
        return
      } catch (retryError) {
        console.warn('[word-quiz] 本地存储空间不足，记录未能保存。', retryError)
        return
      }
    }
    console.warn('[word-quiz] 本地存储写入失败。', error)
  }
}

export function setMode(mode) {
  if (!ALLOWED_MODES.includes(mode)) return
  store.settings.mode = mode
  persist()
}

export function recordAttempt({ word, type, input, correct, answer, at = Date.now() }) {
  const attempt = {
    id: makeId(),
    wordId: word.id,
    word: word.word,
    type,
    correct: Boolean(correct),
    input: String(input ?? '').slice(0, 300),
    answer: String(answer ?? '').slice(0, 300),
    at
  }

  store.records.push(attempt)
  if (store.records.length > MAX_RECORDS) {
    store.records.splice(0, store.records.length - MAX_RECORDS)
  }

  // 重复词条（word.md 中 appetite、colleague 各出现两次）合并成同一条错题
  const key = `${normalizeEn(word.word)}:${type}`
  const wrongIndex = store.wrong.findIndex((item) => item.key === key)
  let wrongChange = 'none'

  if (!attempt.correct) {
    if (wrongIndex >= 0) {
      const item = store.wrong[wrongIndex]
      item.count = (item.count || 1) + 1
      item.input = attempt.input
      item.answer = attempt.answer
      item.at = attempt.at
      wrongChange = 'updated'
    } else {
      store.wrong.unshift({
        key,
        wordId: word.id,
        word: word.word,
        phonetic: word.phonetic,
        meaning: word.meaning,
        type,
        input: attempt.input,
        answer: attempt.answer,
        count: 1,
        at: attempt.at
      })
      wrongChange = 'added'
    }
  } else if (wrongIndex >= 0) {
    store.wrong.splice(wrongIndex, 1)
    wrongChange = 'removed'
  }

  persist()
  return { attempt, wrongChange }
}

export function removeWrong(key) {
  const index = store.wrong.findIndex((item) => item.key === key)
  if (index >= 0) {
    store.wrong.splice(index, 1)
    persist()
  }
}

export function clearWrong() {
  store.wrong.splice(0, store.wrong.length)
  persist()
}

export function clearRecords() {
  store.records.splice(0, store.records.length)
  persist()
}
