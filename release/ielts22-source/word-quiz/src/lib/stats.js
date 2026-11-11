import { TYPE_LABELS, TYPES } from './quiz.js'

const pad = (value) => String(value).padStart(2, '0')

export function dateKey(timestamp = Date.now()) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formatTime(timestamp) {
  const date = new Date(timestamp)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatDateTime(timestamp) {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${formatTime(timestamp)}`
}

export function dayLabel(key, now = Date.now()) {
  const [, month, day] = key.split('-').map(Number)
  const today = dateKey(now)
  const yesterday = dateKey(now - 24 * 60 * 60 * 1000)
  if (key === today) return `今天 · ${month}月${day}日`
  if (key === yesterday) return `昨天 · ${month}月${day}日`
  return `${month}月${day}日`
}

export function percent(part, total) {
  if (!total) return null
  return Math.round((part / total) * 100)
}

/** 所有统计均由本地练习记录实时计算，没有单独存储统计值 */
export function buildStats(records, wrongCount = 0, now = Date.now()) {
  const total = records.length
  const correct = records.filter((item) => item.correct).length
  const today = dateKey(now)
  const todayRecords = records.filter((item) => dateKey(item.at) === today)
  const todayCorrect = todayRecords.filter((item) => item.correct).length

  const byType = TYPES.map((type) => {
    const rows = records.filter((item) => item.type === type)
    const right = rows.filter((item) => item.correct).length
    return {
      type,
      label: TYPE_LABELS[type],
      total: rows.length,
      correct: right,
      accuracy: percent(right, rows.length)
    }
  })

  const last7 = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now)
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - offset)
    const key = dateKey(date.getTime())
    const rows = records.filter((item) => dateKey(item.at) === key)
    const right = rows.filter((item) => item.correct).length
    last7.push({
      key,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      total: rows.length,
      correct: right,
      accuracy: percent(right, rows.length)
    })
  }

  return {
    total,
    correct,
    accuracy: percent(correct, total),
    todayTotal: todayRecords.length,
    todayCorrect,
    todayAccuracy: percent(todayCorrect, todayRecords.length),
    byType,
    last7,
    wrongCount
  }
}
