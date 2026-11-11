<script setup>
import { computed } from 'vue'
import BaseChart from '../components/BaseChart.vue'
import EmptyState from '../components/EmptyState.vue'
import { donutOption, trendOption, typeBarOption } from '../lib/charts'
import { buildStats } from '../lib/stats'
import { store } from '../lib/store'

const emit = defineEmits(['navigate'])

const stats = computed(() => buildStats(store.records, store.wrong.length))
const hasData = computed(() => stats.value.total > 0)
const donut = computed(() => donutOption(stats.value))
const typeBar = computed(() => typeBarOption(stats.value))
const trend = computed(() => trendOption(stats.value))

const accuracyText = computed(() => (stats.value.accuracy === null ? '—' : `${stats.value.accuracy}%`))
const todayAccuracyText = computed(() =>
  stats.value.todayAccuracy === null ? '—' : `${stats.value.todayAccuracy}%`
)
</script>

<template>
  <div class="stats-view">
    <div class="page-head">
      <div>
        <h1>正确率统计</h1>
        <p>根据本机练习记录实时计算，包含错题重练的每一次作答。</p>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card card">
        <span class="stat-label">累计答题</span>
        <strong class="stat-value">{{ stats.total }}</strong>
        <span class="stat-sub">答对 {{ stats.correct }} 题</span>
      </div>
      <div class="stat-card card">
        <span class="stat-label">总正确率</span>
        <strong class="stat-value">{{ accuracyText }}</strong>
        <span class="stat-sub">{{ stats.correct }} / {{ stats.total }}</span>
      </div>
      <div class="stat-card card">
        <span class="stat-label">今日练习</span>
        <strong class="stat-value">{{ stats.todayTotal }}</strong>
        <span class="stat-sub">今日正确率 {{ todayAccuracyText }}</span>
      </div>
      <div class="stat-card card">
        <span class="stat-label">错题本</span>
        <strong class="stat-value">{{ stats.wrongCount }}</strong>
        <span class="stat-sub">道待复习</span>
      </div>
    </div>

    <template v-if="hasData">
      <div class="charts-grid">
        <section class="chart-card card">
          <div class="card-head">
            <h2>总正确率</h2>
            <span>累计 {{ stats.total }} 题</span>
          </div>
          <BaseChart :option="donut" height="248px" aria-label="总正确率环形图" />
        </section>

        <section class="chart-card card">
          <div class="card-head">
            <h2>各题型正确率</h2>
            <span>按答题量统计</span>
          </div>
          <BaseChart :option="typeBar" height="248px" aria-label="各题型正确率柱状图" />
        </section>

        <section class="chart-card card wide">
          <div class="card-head">
            <h2>近 7 天练习趋势</h2>
            <span>答题量与正确率</span>
          </div>
          <BaseChart :option="trend" height="280px" aria-label="近七天答题量与正确率趋势图" />
        </section>
      </div>

      <section class="type-detail card">
        <div class="card-head">
          <h2>题型明细</h2>
          <span>正确率 = 答对题数 / 答题数</span>
        </div>
        <table>
          <thead>
            <tr>
              <th scope="col">题型</th>
              <th scope="col" class="num">答题</th>
              <th scope="col" class="num col-correct">正确</th>
              <th scope="col">正确率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in stats.byType" :key="row.type">
              <td>
                <span class="type-badge">{{ row.label }}</span>
              </td>
              <td class="num">{{ row.total }}</td>
              <td class="num col-correct">{{ row.correct }}</td>
              <td>
                <div class="rate-cell">
                  <span class="rate-bar" aria-hidden="true">
                    <i :style="{ width: `${row.accuracy ?? 0}%` }"></i>
                  </span>
                  <span class="rate-text">{{ row.accuracy === null ? '—' : `${row.accuracy}%` }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <EmptyState
      v-else
      title="还没有练习数据"
      text="完成几道题后，这里会生成总正确率、分题型正确率和近 7 天趋势图。"
      action-text="开始练习"
      @action="emit('navigate', 'practice')"
    />

    <p class="stats-note">统计和错题都保存在本机浏览器。更换设备或清理站点数据前，请留意记录会丢失。</p>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  padding: 16px 18px 15px;
  box-shadow: none;
}

.stat-label {
  color: var(--muted);
  font-size: 11.5px;
  letter-spacing: 0.02em;
}

.stat-value {
  margin-top: 3px;
  color: var(--brand-deep);
  font-size: 30px;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  letter-spacing: -0.03em;
  line-height: 1.25;
}

.stat-sub {
  margin-top: 2px;
  color: var(--muted);
  font-size: 11.5px;
  white-space: nowrap;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.chart-card {
  padding: 16px 16px 6px;
  box-shadow: none;
  min-width: 0;
}

.chart-card.wide {
  grid-column: 1 / -1;
}

.card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 0 2px 4px;
}

.card-head h2 {
  margin: 0;
  color: var(--ink);
  font-size: 14.5px;
  font-weight: 650;
  letter-spacing: -0.005em;
}

.card-head span {
  color: var(--muted);
  font-size: 11.5px;
  text-align: right;
}

.type-detail {
  margin-top: 14px;
  padding: 16px 20px 10px;
  box-shadow: none;
}

.type-detail table {
  width: 100%;
  margin-top: 6px;
  border-collapse: collapse;
}

.type-detail th,
.type-detail td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--line);
  color: var(--ink-2);
  font-size: 12.5px;
  text-align: left;
}

.type-detail th {
  color: var(--muted);
  font-size: 11px;
  font-weight: 500;
}

.type-detail tbody tr:last-child td {
  border-bottom: 0;
}

.type-detail .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.rate-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rate-bar {
  display: block;
  width: 90px;
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: #edf2f7;
}

.rate-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--brand);
  transition: width 0.3s ease;
}

.rate-text {
  min-width: 34px;
  color: var(--ink-2);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.stats-note {
  margin: 16px 2px 0;
  color: var(--muted);
  font-size: 11.5px;
  line-height: 1.7;
  text-align: center;
}

@media (max-width: 720px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .stat-card {
    padding: 13px 14px;
  }

  .stat-value {
    font-size: 25px;
  }

  .charts-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .chart-card.wide {
    grid-column: auto;
  }

  .chart-card {
    padding: 14px 10px 4px;
  }

  .card-head {
    padding: 0 6px 2px;
  }

  .card-head h2 {
    font-size: 13.5px;
  }

  .card-head span {
    font-size: 10.5px;
  }

  .type-detail {
    padding: 14px 12px 8px;
    overflow-x: auto;
  }

  .type-detail th,
  .type-detail td {
    padding: 9px 6px;
  }

  .rate-bar {
    width: 54px;
  }

  .col-correct {
    display: none;
  }
}
</style>
