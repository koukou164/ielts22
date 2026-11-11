<script setup>
import { nextTick, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer
])

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: String, default: '260px' },
  ariaLabel: { type: String, default: '统计图表' }
})

const el = ref(null)
let chart = null
let observer = null

function render() {
  if (!chart || !props.option) return
  chart.setOption(props.option, true)
}

function resize() {
  chart?.resize()
}

onMounted(async () => {
  await nextTick()
  if (!el.value) return
  chart = echarts.init(el.value, null, { renderer: 'canvas' })
  render()

  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => resize())
    observer.observe(el.value)
  }
})

watch(() => props.option, render, { deep: true })

onActivated(() => {
  nextTick(() => resize())
})

onBeforeUnmount(() => {
  observer?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="el" class="chart" :style="{ height }" role="img" :aria-label="ariaLabel"></div>
</template>

<style scoped>
.chart {
  width: 100%;
  min-height: 180px;
}
</style>
