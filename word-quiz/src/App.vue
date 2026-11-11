<script setup>
import { computed, defineAsyncComponent, ref } from 'vue'
import PracticeView from './views/PracticeView.vue'
import WrongBookView from './views/WrongBookView.vue'
import RecordsView from './views/RecordsView.vue'

// 统计页依赖 ECharts，按需加载，避免首次打开练习页时下载图表库。
const StatsView = defineAsyncComponent(() => import('./views/StatsView.vue'))
import { store } from './lib/store'
import { toast } from './lib/toast'

const views = {
  practice: PracticeView,
  wrong: WrongBookView,
  stats: StatsView,
  records: RecordsView
}

const navItems = [
  { value: 'practice', label: '练习' },
  { value: 'wrong', label: '错题本' },
  { value: 'stats', label: '统计' },
  { value: 'records', label: '记录' }
]

const view = ref('practice')
const wrongRequest = ref(null)
let requestSeq = 0

const currentComponent = computed(() => views[view.value])

const viewBindings = computed(() => {
  const bindings = { onNavigate: navigate }
  if (view.value === 'practice') {
    bindings.wrongRequest = wrongRequest.value
  }
  if (view.value === 'wrong') {
    bindings.onPracticeWrong = startWrongPractice
  }
  return bindings
})

function navigate(nextView) {
  if (!views[nextView]) return
  view.value = nextView
  window.scrollTo(0, 0)
}

function startWrongPractice(keys) {
  if (!Array.isArray(keys) || !keys.length) return
  requestSeq += 1
  wrongRequest.value = { id: requestSeq, keys: [...keys] }
  navigate('practice')
}
</script>

<template>
  <div class="app-shell" :data-view="view">
    <header class="site-header">
      <div class="wrap header-inner">
        <button class="brand" type="button" aria-label="词练，返回练习" @click="navigate('practice')">
          <span class="brand-mark" aria-hidden="true">词</span>
          <span class="brand-text">
            <strong>雅思高频词</strong>
            <small>500 词 · 三种题型</small>
          </span>
        </button>

        <nav class="main-nav" aria-label="主导航">
          <button
            v-for="item in navItems"
            :key="item.value"
            class="nav-btn"
            :class="{ active: view === item.value }"
            type="button"
            :aria-current="view === item.value ? 'page' : undefined"
            @click="navigate(item.value)"
          >
            <span>{{ item.label }}</span>
            <em v-if="item.value === 'wrong' && store.wrong.length" class="nav-badge">
              {{ store.wrong.length > 99 ? '99+' : store.wrong.length }}
            </em>
          </button>
        </nav>
      </div>
    </header>

    <main class="page">
      <div class="wrap">
        <KeepAlive>
          <component :is="currentComponent" v-bind="viewBindings" />
        </KeepAlive>
      </div>
    </main>

    <footer class="site-footer">
      <div class="wrap footer-inner">
        <span>词库来自 word.md · 共 500 条</span>
        <span>学习记录仅保存在本机浏览器，不会上传</span>
      </div>
    </footer>

    <Transition name="toast">
      <div
        v-if="toast.message"
        :key="toast.id"
        class="toast"
        :class="`toast--${toast.tone}`"
        role="status"
        aria-live="polite"
      >
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>
