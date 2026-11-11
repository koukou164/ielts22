<script setup>
import { computed, ref } from 'vue'
import EmptyState from '../components/EmptyState.vue'
import { TYPE_LABELS } from '../lib/quiz'
import { clearRecords, store } from '../lib/store'
import { buildStats, dateKey, dayLabel, formatTime } from '../lib/stats'
import { notify } from '../lib/toast'

const emit = defineEmits(['navigate'])

const typeFilter = ref('all')
const resultFilter = ref('all')

const typeFilters = [
  { value: 'all', label: '全部题型' },
  { value: 'en2zh', label: '英译汉' },
  { value: 'zh2en', label: '汉译英' },
  { value: 'cloze', label: '选词填空' }
]

const resultFilters = [
  { value: 'all', label: '全部结果' },
  { value: 'right', label: '正确' },
  { value: 'wrong', label: '错误' }
]

const summary = computed(() => buildStats(store.records, store.wrong.length))

const filtered = computed(() => {
  let rows = store.records.slice().reverse()
  if (typeFilter.value !== 'all') rows = rows.filter((item) => item.type === typeFilter.value)
  if (resultFilter.value !== 'all') {
    rows = rows.filter((item) => (resultFilter.value === 'right' ? item.correct : !item.correct))
  }
  return rows
})

const shown = computed(() => filtered.value.slice(0, 300))

const groups = computed(() => {
  const map = new Map()
  for (const record of shown.value) {
    const key = dateKey(record.at)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(record)
  }
  return [...map.entries()].map(([key, records]) => ({
    key,
    label: dayLabel(key),
    records
  }))
})

function clearAll() {
  if (!store.records.length) return
  if (window.confirm('确定清空全部练习记录吗？正确率统计会归零，错题本不受影响。')) {
    clearRecords()
    notify('练习记录已清空', 'ok')
  }
}
</script>

<template>
  <div class="records-view">
    <div class="page-head">
      <div>
        <h1>练习记录</h1>
        <p>按时间倒序展示每一次作答，最多保留最近 3000 条。</p>
      </div>
      <button v-if="store.records.length" class="btn btn-danger btn-small" type="button" @click="clearAll">
        清空记录
      </button>
    </div>

    <div v-if="store.records.length" class="summary-bar card">
      <div>
        <span>累计答题</span>
        <strong>{{ summary.total }}</strong>
      </div>
      <div>
        <span>今日</span>
        <strong>{{ summary.todayTotal }}</strong>
      </div>
      <div>
        <span>总正确率</span>
        <strong>{{ summary.accuracy === null ? '—' : `${summary.accuracy}%` }}</strong>
      </div>
      <div>
        <span>错题本</span>
        <strong>{{ summary.wrongCount }}</strong>
      </div>
    </div>

    <template v-if="store.records.length">
      <div class="filter-panel">
        <div class="filter-line">
          <span class="filter-label">题型</span>
          <div class="chip-row">
            <button
              v-for="item in typeFilters"
              :key="item.value"
              class="chip"
              :class="{ active: typeFilter === item.value }"
              type="button"
              @click="typeFilter = item.value"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
        <div class="filter-line">
          <span class="filter-label">结果</span>
          <div class="chip-row">
            <button
              v-for="item in resultFilters"
              :key="item.value"
              class="chip"
              :class="{ active: resultFilter === item.value }"
              type="button"
              @click="resultFilter = item.value"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
      </div>

      <template v-if="groups.length">
        <section v-for="group in groups" :key="group.key" class="record-group">
          <div class="group-head">
            <h2>{{ group.label }}</h2>
            <span>{{ group.records.length }} 题</span>
          </div>

          <div class="record-list card">
            <article v-for="record in group.records" :key="record.id" class="record-row">
              <span class="result-dot" :class="record.correct ? 'ok' : 'bad'" aria-hidden="true"></span>
              <div class="record-main">
                <div class="record-title">
                  <strong>{{ record.word }}</strong>
                  <span class="type-badge">{{ TYPE_LABELS[record.type] }}</span>
                  <span class="result-text" :class="record.correct ? 'ok-text' : 'bad-text'">
                    {{ record.correct ? '正确' : '错误' }}
                  </span>
                </div>
                <p>
                  你的答案：<b>{{ record.input || '（空）' }}</b>
                  <span class="separator">·</span>
                  正确答案：<b>{{ record.answer }}</b>
                </p>
              </div>
              <time :datetime="new Date(record.at).toISOString()">{{ formatTime(record.at) }}</time>
            </article>
          </div>
        </section>

        <p v-if="filtered.length > shown.length" class="limit-note">
          当前筛选共 {{ filtered.length }} 条，这里仅显示最近 300 条。
        </p>
      </template>

      <EmptyState
        v-else
        title="没有符合筛选的记录"
        text="换一个题型或结果筛选试试。"
        action-text="查看全部记录"
        @action="typeFilter = 'all'; resultFilter = 'all'"
      />
    </template>

    <EmptyState
      v-else
      title="还没有练习记录"
      text="每答一道题都会记录在这里，方便回看你的答案和正确释义。"
      action-text="开始练习"
      @action="emit('navigate', 'practice')"
    />
  </div>
</template>

<style scoped>
.summary-bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
  padding: 14px 18px;
  box-shadow: none;
}

.summary-bar div {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.summary-bar span {
  color: var(--muted);
  font-size: 10.5px;
}

.summary-bar strong {
  color: var(--brand-deep);
  font-size: 21px;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  line-height: 1.3;
}

.filter-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.62);
}

.filter-line {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-label {
  flex: 0 0 auto;
  color: var(--muted);
  font-size: 11.5px;
}

.record-group {
  margin-bottom: 18px;
}

.group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 0 2px 7px;
}

.group-head h2 {
  margin: 0;
  color: var(--ink-2);
  font-size: 13px;
  font-weight: 650;
}

.group-head span {
  color: var(--muted);
  font-size: 11px;
}

.record-list {
  overflow: hidden;
  box-shadow: none;
}

.record-row {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  align-items: start;
  gap: 11px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
}

.record-row:last-child {
  border-bottom: 0;
}

.result-dot {
  width: 7px;
  height: 7px;
  margin-top: 8px;
  border-radius: 50%;
}

.result-dot.ok {
  background: var(--ok);
}

.result-dot.bad {
  background: var(--bad);
}

.record-main {
  min-width: 0;
}

.record-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
}

.record-title strong {
  color: var(--ink);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 16.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
}

.result-text {
  font-size: 11px;
  font-weight: 650;
}

.record-main p {
  margin: 3px 0 0;
  color: var(--muted);
  font-size: 11.5px;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.record-main b {
  color: var(--ink-2);
  font-weight: 550;
}

.separator {
  margin: 0 5px;
  color: #c0cbd6;
}

.record-row time {
  padding-top: 2px;
  color: var(--muted);
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.limit-note {
  margin: 8px 2px 0;
  color: var(--muted);
  font-size: 11px;
  text-align: center;
}

@media (max-width: 720px) {
  .summary-bar {
    gap: 4px;
    padding: 12px 13px;
  }

  .summary-bar strong {
    font-size: 18px;
  }

  .filter-panel {
    padding: 10px 11px;
  }

  .filter-line {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }

  .record-row {
    grid-template-columns: 8px minmax(0, 1fr);
    gap: 9px;
    padding: 11px 13px;
  }

  .record-row time {
    grid-column: 2;
    padding-top: 0;
  }

  .record-title strong {
    font-size: 16px;
  }
}
</style>
