<template>
  <div class="green-error-budget-wrap">
    <div ref="chartRef" style="height: 130px;"></div>
    <div class="green-error-budget-legend">
      <div class="green-error-budget-legend-item">
        <span class="green-error-budget-dot" style="background: #ef4444;"></span>
        <span class="green-error-budget-legend-label">已消耗</span>
        <span class="green-error-budget-legend-value">{{ budget.consumed }}</span>
      </div>
      <div class="green-error-budget-legend-item">
        <span class="green-error-budget-dot" style="background: #22c55e;"></span>
        <span class="green-error-budget-legend-label">剩余</span>
        <span class="green-error-budget-legend-value">{{ budget.remaining }}</span>
      </div>
    </div>
    <div class="green-progress-bar">
      <div class="green-progress-fill" :style="{ width: `${usedPct}%`, background: 'linear-gradient(90deg, #22c55e 0%, #f59e0b 70%, #ef4444 100%)' }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import * as echarts from 'echarts'

export interface ErrorBudget {
  total: number
  consumed: number
  remaining: number
}

const props = defineProps<{
  budget: ErrorBudget
}>()

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

const usedPct = computed(() => {
  return Math.min((props.budget.consumed / props.budget.total) * 100, 100)
})

function initChart() {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  updateChart()
}

function updateChart() {
  if (!chart) return
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: { color: '#1f1f1f', fontSize: 12 },
      formatter: '{b}: {c}% ({d}%)',
    },
    series: [{
      type: 'pie',
      radius: ['55%', '80%'],
      center: ['50%', '50%'],
      data: [
        { value: usedPct.value.toFixed(1), name: '已消耗', itemStyle: { color: '#ef4444' } },
        { value: (100 - usedPct.value).toFixed(1), name: '剩余', itemStyle: { color: '#22c55e' } },
      ],
      label: { show: false },
      emphasis: { scale: true, scaleSize: 6 },
    }],
  }
  chart.setOption(option)
}

onMounted(() => {
  initChart()
})

watch(() => props.budget, () => {
  updateChart()
}, { deep: true })
</script>
