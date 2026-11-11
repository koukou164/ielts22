const FONT = '"Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'

export const palette = {
  brand: '#35577c',
  brandDeep: '#27425f',
  brandLight: '#b9c9d9',
  bar: '#c9d7e5',
  ok: '#5b8a72',
  bad: '#b5746b',
  ink: '#33475c',
  muted: '#8593a4',
  grid: '#edf2f7',
  surface: '#ffffff'
}

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const base = {
  animation: !reduceMotion,
  textStyle: {
    fontFamily: FONT,
    color: palette.ink
  }
}

const percentText = (value) => (typeof value === 'number' ? `${value}%` : '—')

export function donutOption(stats) {
  const wrong = Math.max(stats.total - stats.correct, 0)
  return {
    ...base,
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(31,45,61,.92)',
      borderWidth: 0,
      textStyle: { color: '#fff', fontSize: 12 },
      formatter: '{b}：{c} 题（{d}%）'
    },
    legend: {
      bottom: 2,
      left: 'center',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 18,
      textStyle: { color: palette.muted, fontSize: 12 }
    },
    title: {
      text: percentText(stats.accuracy),
      subtext: '总正确率',
      left: 'center',
      top: '33%',
      textAlign: 'center',
      textStyle: {
        color: palette.brandDeep,
        fontSize: 34,
        fontWeight: 650,
        fontFamily: FONT
      },
      subtextStyle: {
        color: palette.muted,
        fontSize: 12,
        lineHeight: 22,
        fontFamily: FONT
      }
    },
    series: [
      {
        type: 'pie',
        radius: ['60%', '78%'],
        center: ['50%', '45%'],
        startAngle: 90,
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: palette.surface,
          borderWidth: 3,
          borderRadius: 5
        },
        label: { show: false },
        labelLine: { show: false },
        emphasis: { scale: false },
        data: [
          { value: stats.correct, name: '正确', itemStyle: { color: palette.brand } },
          { value: wrong, name: '错误', itemStyle: { color: palette.bad } }
        ]
      }
    ]
  }
}

export function typeBarOption(stats) {
  const rows = stats.byType
  return {
    ...base,
    grid: { left: 62, right: 54, top: 14, bottom: 24 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(31,45,61,.92)',
      borderWidth: 0,
      textStyle: { color: '#fff', fontSize: 12 },
      formatter(params) {
        const row = rows[params[0].dataIndex]
        return `${row.label}<br/>答题：${row.total} 题<br/>正确：${row.correct} 题<br/>正确率：${percentText(row.accuracy)}`
      }
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { formatter: '{value}%', color: palette.muted, fontSize: 11 },
      splitLine: { lineStyle: { color: palette.grid } },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'category',
      data: rows.map((row) => row.label),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: palette.ink, fontSize: 12 }
    },
    series: [
      {
        type: 'bar',
        barWidth: 16,
        showBackground: true,
        backgroundStyle: { color: '#f2f6fa', borderRadius: 8 },
        data: rows.map((row) => ({
          value: row.accuracy ?? 0,
          itemStyle: {
            color: row.total ? palette.brand : '#dfe7ef',
            borderRadius: [0, 8, 8, 0]
          }
        })),
        label: {
          show: true,
          position: 'right',
          distance: 8,
          color: palette.muted,
          fontSize: 11,
          formatter(params) {
            return rows[params.dataIndex].total ? `${params.value}%` : '暂无'
          }
        }
      }
    ]
  }
}

export function trendOption(stats) {
  const days = stats.last7
  return {
    ...base,
    grid: { left: 38, right: 44, top: 44, bottom: 28 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: '#d7e1ea' } },
      backgroundColor: 'rgba(31,45,61,.92)',
      borderWidth: 0,
      textStyle: { color: '#fff', fontSize: 12 },
      formatter(params) {
        const day = days[params[0].dataIndex]
        return `${day.label}<br/>答题：${day.total} 题<br/>正确：${day.correct} 题<br/>正确率：${percentText(day.accuracy)}`
      }
    },
    legend: {
      right: 0,
      top: 2,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 6,
      itemGap: 16,
      textStyle: { color: palette.muted, fontSize: 11 }
    },
    xAxis: {
      type: 'category',
      data: days.map((day) => day.label),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#dfe7ef' } },
      axisLabel: { color: palette.muted, fontSize: 11 }
    },
    yAxis: [
      {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: palette.muted, fontSize: 11 },
        splitLine: { lineStyle: { color: palette.grid } }
      },
      {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { formatter: '{value}%', color: palette.muted, fontSize: 11 },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '答题数',
        type: 'bar',
        barWidth: 18,
        data: days.map((day) => day.total),
        itemStyle: { color: palette.bar, borderRadius: [4, 4, 0, 0] }
      },
      {
        name: '正确率',
        type: 'line',
        yAxisIndex: 1,
        data: days.map((day) => day.accuracy),
        connectNulls: false,
        smooth: 0.25,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { width: 2, color: palette.brand },
        itemStyle: { color: palette.brand, borderColor: '#fff', borderWidth: 2 },
        areaStyle: { color: 'rgba(53, 87, 124, 0.06)' }
      }
    ]
  }
}
