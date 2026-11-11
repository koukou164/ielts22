<script setup>
import { computed, ref } from 'vue'
import EmptyState from '../components/EmptyState.vue'
import { TYPE_LABELS } from '../lib/quiz'
import { clearWrong, removeWrong, store } from '../lib/store'
import { formatDateTime } from '../lib/stats'
import { notify } from '../lib/toast'

const emit = defineEmits(['navigate', 'practice-wrong'])

const filter = ref('all')
const typeFilters = [
  { value: 'all', label: '全部' },
  { value: 'en2zh', label: '英译汉' },
  { value: 'zh2en', label: '汉译英' },
  { value: 'cloze', label: '选词填空' }
]

const items = computed(() =>
  store.wrong
    .filter((item) => filter.value === 'all' || item.type === filter.value)
    .slice()
    .sort((a, b) => b.at - a.at)
)

function countOf(type) {
  if (type === 'all') return store.wrong.length
  return store.wrong.filter((item) => item.type === type).length
}

function startPractice(keys) {
  if (!keys.length) return
  emit('practice-wrong', keys)
}

function retryAll() {
  startPractice(items.value.map((item) => item.key))
}

function retryOne(item) {
  startPractice([item.key])
}

function removeOne(item) {
  removeWrong(item.key)
  notify('已移出错题本')
}

function clearAll() {
  if (!store.wrong.length) return
  if (window.confirm('确定清空全部错题吗？此操作不可恢复。')) {
    clearWrong()
    notify('错题本已清空', 'ok')
  }
}
</script>

<template>
  <div class="wrong-view">
    <div class="page-head">
      <div>
        <h1>错题本</h1>
        <p>答错自动收录，重练答对后自动移除，也可以手动移出。</p>
      </div>
      <span v-if="store.wrong.length" class="wrong-count">{{ store.wrong.length }} 题待复习</span>
    </div>

    <template v-if="store.wrong.length">
      <div class="toolbar">
        <div class="chip-row" aria-label="按题型筛选错题">
          <button
            v-for="item in typeFilters"
            :key="item.value"
            class="chip"
            :class="{ active: filter === item.value }"
            type="button"
            @click="filter = item.value"
          >
            {{ item.label }}
            <span class="chip-count">{{ countOf(item.value) }}</span>
          </button>
        </div>

        <div class="toolbar-actions">
          <button class="btn btn-primary btn-small" type="button" :disabled="!items.length" @click="retryAll">
            重练当前 {{ items.length }} 题
          </button>
          <button class="btn btn-danger btn-small" type="button" @click="clearAll">清空错题本</button>
        </div>
      </div>

      <div v-if="items.length" class="wrong-list">
        <article v-for="item in items" :key="item.key" class="wrong-card card">
          <div class="wrong-main">
            <div class="wrong-title">
              <strong>{{ item.word }}</strong>
              <span class="phonetic">{{ item.phonetic }}</span>
              <span class="type-badge">{{ TYPE_LABELS[item.type] }}</span>
              <span class="count-badge">错 {{ item.count || 1 }} 次</span>
            </div>
            <p class="wrong-meaning">{{ item.meaning }}</p>
            <div class="wrong-meta">
              <span>你的答案：<b>{{ item.input || '（空）' }}</b></span>
              <span>正确答案：<b>{{ item.answer }}</b></span>
              <span>{{ formatDateTime(item.at) }}</span>
            </div>
          </div>
          <div class="wrong-actions">
            <button class="btn btn-primary btn-small" type="button" @click="retryOne(item)">重练</button>
            <button class="btn btn-ghost btn-small" type="button" @click="removeOne(item)">移出</button>
          </div>
        </article>
      </div>

      <EmptyState
        v-else
        title="这个题型还没有错题"
        text="切换到其他题型看看，或者继续练习。"
        action-text="去练习"
        @action="emit('navigate', 'practice')"
      />
    </template>

    <EmptyState
      v-else
      title="错题本是空的"
      text="练习时答错的题会自动收录在这里，重练答对后自动移除。"
      action-text="去练习"
      @action="emit('navigate', 'practice')"
    />
  </div>
</template>

<style scoped>
.wrong-count {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--warn-soft);
  color: var(--warn);
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}

.chip-count {
  display: inline-grid;
  place-items: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: rgba(53, 87, 124, 0.08);
  color: var(--brand);
  font-size: 10px;
  line-height: 1;
}

.chip.active .chip-count {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.wrong-list {
  display: grid;
  gap: 10px;
}

.wrong-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 17px 20px;
  box-shadow: none;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.wrong-card:hover {
  border-color: var(--line-strong);
  box-shadow: var(--shadow);
}

.wrong-main {
  min-width: 0;
}

.wrong-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.wrong-title strong {
  color: var(--brand-deep);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 23px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.phonetic {
  color: var(--muted);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 12.5px;
}

.wrong-meaning {
  margin: 5px 0 0;
  color: var(--ink-2);
  font-size: 13.5px;
}

.wrong-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-top: 9px;
  color: var(--muted);
  font-size: 11.5px;
  line-height: 1.7;
}

.wrong-meta b {
  color: var(--ink-2);
  font-weight: 550;
  overflow-wrap: anywhere;
}

.wrong-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 6px;
}

@media (max-width: 720px) {
  .wrong-card {
    flex-direction: column;
    gap: 13px;
    padding: 15px 15px;
  }

  .wrong-title strong {
    font-size: 21px;
  }

  .wrong-actions {
    width: 100%;
  }

  .wrong-actions .btn {
    flex: 1;
  }

  .wrong-meta {
    gap: 2px 12px;
  }
}
</style>
