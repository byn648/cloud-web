<template>
  <div class="green-page">
    <!-- Header -->
    <header class="page-header">
      <div class="page-logo">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#0b57d0" opacity="0.9" />
          <path d="M2 17l10 5 10-5" stroke="#0b57d0" stroke-width="1.5" stroke-linecap="round" />
          <path d="M2 12l10 5 10-5" stroke="#0b57d0" stroke-width="1.5" stroke-linecap="round" opacity="0.6" />
        </svg>
        <span class="page-logo-text">GreenCC</span>
      </div>
      <nav class="page-nav">
        <div
          class="page-nav-item"
          :class="{ active: activeTab === 'forecast' }"
          @click="switchTab('forecast')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <span>预测分析</span>
        </div>
        <div
          class="page-nav-item"
          :class="{ active: activeTab === 'performance' }"
          @click="switchTab('performance')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>性能管控</span>
        </div>
      </nav>
      <div class="header-right">
        <button v-if="currentNodeUuid" class="back-btn" @click="goBack">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          返回概览
        </button>
        <span v-if="showingNodeInfo !== '全部服务器'" class="node-badge">
          {{ showingNodeInfo }}
        </span>
        <div class="page-clock">{{ currentTime }}</div>
      </div>
    </header>

    <!-- Forecast Filters -->
    <ForecastFilters
      v-if="activeTab === 'forecast'"
      :forecast-category="forecastStore.forecastCategory"
      :time-range="forecastStore.timeRange"
      :filter-server="forecastStore.filterServer"
      :filter-service="forecastStore.filterService"
      :filter-instance="forecastStore.filterInstance"
      :forecast-model="forecastStore.forecastModel"
      :confidence-level="forecastStore.confidenceLevel"
      :forecast-horizon="forecastStore.forecastHorizon"
      :smoothing-factor="forecastStore.smoothingFactor"
      :data-source="forecastStore.dataSource"
      :refresh-interval="forecastStore.refreshInterval"
      @forecast-category="(v) => forecastStore.setForecastCategory(v)"
      @time-range="(v) => forecastStore.setTimeRange(v)"
      @filter-server="(v) => forecastStore.setFilterServer(v)"
      @filter-service="(v) => forecastStore.setFilterService(v)"
      @filter-instance="(v) => forecastStore.setFilterInstance(v)"
      @forecast-model="(v) => forecastStore.setForecastModel(v)"
      @confidence-level="(v) => forecastStore.setConfidenceLevel(v)"
      @forecast-horizon="(v) => forecastStore.setForecastHorizon(v)"
      @smoothing-factor="(v) => forecastStore.setSmoothingFactor(v)"
      @data-source="(v) => forecastStore.setDataSource(v)"
      @refresh-interval="(v) => forecastStore.setRefreshInterval(v)"
    />

    <!-- Page content -->
    <div class="page-content">
      <!-- Error banner -->
      <div v-if="loadingError" class="green-error-banner">
        加载失败：{{ loadingError }}
      </div>

      <!-- Summary cards -->
      <div class="green-summary-grid">
        <div v-for="c in summaryCards" :key="c.label" class="green-summary-card">
          <span class="green-summary-label">{{ c.label }}</span>
          <span class="green-summary-value" :style="{ color: c.color }">{{ c.value }}</span>
        </div>
      </div>

      <!-- Main chart -->
      <div class="green-chart-card" style="margin-bottom: 20px;">
        <div class="green-card-header">
          <span class="green-card-title">综合资源时序 — 历史数据 &amp; 未来预测</span>
          <div class="green-chart-legend">
            <span class="green-legend-dot" style="background: #0b57d0;"></span>
            <span class="green-legend-text">历史</span>
            <span class="green-legend-dot" style="background: #f59e0b;"></span>
            <span class="green-legend-text">预测</span>
            <span class="green-legend-dot" style="background: rgba(245,158,11,0.3);"></span>
            <span class="green-legend-text">置信区间</span>
            <span
              class="green-legend-dot"
              :style="{ background: collectionStatusColor, boxShadow: `0 0 5px ${collectionStatusColor}` }"
            ></span>
            <span class="green-legend-text" :style="{ color: collectionStatusColor }">
              {{ collectionStatusLabel }}
            </span>
            <span v-if="lastCollectedAt" class="green-legend-hint">
              · 末次采集 {{ lastCollectedAtStr }}
            </span>
          </div>
        </div>
        <div ref="chartRef" style="height: 340px;"></div>
      </div>

      <!-- Energy stats -->
      <div class="green-bottom-card">
        <div class="green-card-header">
          <span class="green-card-title">能耗与碳排放统计</span>
          <span class="green-card-sub">{{ selectedModelLabel }} 预测 · 置信度 {{ Math.round((apiData?.confidenceLevel ?? 0.95) * 100) }}%</span>
        </div>
        <div class="green-stats-grid">
          <div
            v-for="stat in energyStats"
            :key="stat.label"
            class="green-stat-card"
          >
            <span class="green-stat-label">{{ stat.label }}</span>
            <span class="green-stat-value" :style="{ color: stat.color }">
              {{ stat.value }}
            </span>
            <span class="green-stat-unit">{{ stat.unit }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import ForecastFilters from '../../components/green/ForecastFilters.vue'
import { useForecastStore, useGreenApiStore } from '../../stores/greenStore'
import { forecastApi, modelPredictApi } from '@/api/green'
import type { EnergyDataPoint, EnergyForecastResponse } from '@/api/green/types'
import type { ModelHistoryResponse, ModelMetricItem, ModelPredictResponse } from '@/api/green/modelPredict'
import { FORECAST_MODELS } from '@/utils/chartConfig'
import dayjs from 'dayjs'

const props = defineProps<{
  initialTab?: 'forecast' | 'performance'
}>()

const route = useRoute()
const router = useRouter()
const emit = defineEmits<{
  switchTab: [tab: 'forecast' | 'performance']
}>()

const activeTab = ref<'forecast' | 'performance'>('forecast')
const forecastStore = useForecastStore()
const greenApi = useGreenApiStore()

// 从 URL 读取当前节点信息
const currentNodeUuid = computed(() => route.query.nodeUuid as string | undefined)
const currentNodeName = computed(() => route.query.nodeName as string | undefined)
const currentClusterUuid = computed(() => route.query.clusterUuid as string | undefined)
const predictClusterUuid = computed(() => currentClusterUuid.value || 'run_20260527_134101')
const predictNodeUuid = computed(() => currentNodeUuid.value || 'cluster3-gpu')

// 显示当前节点信息
const showingNodeInfo = computed(() => currentNodeUuid.value ? `${currentNodeName.value || currentNodeUuid.value}` : '全部服务器')

// 返回集群概览
function goBack() {
  router.push({ path: '/green', query: { clusterUuid: currentClusterUuid.value } })
}

const apiData = ref<EnergyForecastResponse | null>(null)
const modelPredictResponses = ref<ModelPredictResponse[]>([])
const modelHistoryData = ref<ModelHistoryResponse | null>(null)
const modelPredictError = ref('')
const loadingError = ref('')
const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null
let refreshTimer: ReturnType<typeof setTimeout> | null = null

const currentTime = ref(dayjs().format('HH:mm:ss'))
let clockTimer: ReturnType<typeof setInterval>

const TIME_RANGE_TO_HOURS: Record<string, number> = {
  '1d': 24,
  '7d': 168,
  '30d': 720,
  '90d': 2160,
}

const selectedModelLabel = computed(() => {
  return FORECAST_MODELS.find((item) => item.value === forecastStore.forecastModel)?.label ?? 'LightGBM'
})

const TOPIC1_MODELS = [
  { value: 'lightgbm', label: 'LightGBM' },
  { value: 'patchtst', label: 'PatchTST' },
  { value: 'itransformer', label: 'iTransformer' },
  { value: 'heterostgnn', label: 'Hetero-STGNN' },
] as const

const TOPIC1_HORIZONS = [15, 30]
const useCheckpointChart = computed(() => TOPIC1_MODELS.some((item) => item.value === forecastStore.forecastModel))
const activeTopic1Model = computed(() => {
  return TOPIC1_MODELS.find((item) => item.value === forecastStore.forecastModel)?.value ?? 'lightgbm'
})

const selectedMetric = computed<keyof ModelMetricItem>(() => {
  if (forecastStore.forecastCategory === 'cpu') return 'cpu_util'
  if (forecastStore.forecastCategory === 'memory') return 'gpu_mem_util'
  return 'gpu_util'
})

const selectedMetricLabel = computed(() => {
  if (selectedMetric.value === 'cpu_util') return 'CPU'
  if (selectedMetric.value === 'gpu_mem_util') return 'GPU显存'
  if (selectedMetric.value === 'node_power') return '功率'
  return 'GPU'
})

function parseTime(value: string) {
  const t = new Date(value.includes('T') ? value : value.replace(' ', 'T')).getTime()
  return Number.isFinite(t) ? t : 0
}

function metricValue(metrics: Partial<ModelMetricItem> | undefined, metric: keyof ModelMetricItem) {
  const value = metrics?.[metric]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const selectedModelPrediction = computed(() => {
  return modelPredictResponses.value.find((resp) => resp.model_name === forecastStore.forecastModel)
})

const selectedModelPredictions = computed(() => {
  return selectedModelPrediction.value?.results?.[0]?.predictions ?? []
})

function normalizeEnergySeries(data: EnergyDataPoint[]) {
  const byTime = new Map<number, EnergyDataPoint>()
  data.forEach((item) => {
    const timestamp = Number(item.timestamp)
    if (Number.isFinite(timestamp)) {
      byTime.set(timestamp, { ...item, timestamp })
    }
  })
  return Array.from(byTime.values()).sort((a, b) => a.timestamp - b.timestamp)
}

function inferForecastInterval(forecast: EnergyDataPoint[], history: EnergyDataPoint[]) {
  const forecastSteps = forecast
    .slice(1)
    .map((item, index) => item.timestamp - forecast[index].timestamp)
    .filter((step) => Number.isFinite(step) && step > 0)
  if (forecastSteps.length > 0) {
    return Math.min(...forecastSteps)
  }

  const historySteps = history
    .slice(1)
    .map((item, index) => item.timestamp - history[index].timestamp)
    .filter((step) => Number.isFinite(step) && step > 0)
  if (historySteps.length > 0) {
    return Math.min(...historySteps)
  }

  return 60 * 60 * 1000
}

function switchTab(tab: 'forecast' | 'performance') {
  activeTab.value = tab
  emit('switchTab', tab)
}

const collectionStatusColor = computed(() => {
  if (useCheckpointChart.value) {
    return historyData.value.length > 0 ? '#3b82f6' : '#ef4444'
  }
  switch (apiData.value?.collectionStatus) {
    case 'collecting': return '#22c55e'
    case 'idle': return '#3b82f6'
    default: return '#ef4444'
  }
})

const collectionStatusLabel = computed(() => {
  if (useCheckpointChart.value) {
    return historyData.value.length > 0 ? 'Checkpoint' : '无数据'
  }
  switch (apiData.value?.collectionStatus) {
    case 'collecting': return '采集中'
    case 'idle': return '已采集'
    default: return '无数据'
  }
})

const lastCollectedAtStr = computed(() => {
  if (useCheckpointChart.value) {
    const last = historyData.value[historyData.value.length - 1]
    return last ? dayjs(last.timestamp).format('YYYY-MM-DD HH:mm') : '—'
  }
  const t = apiData.value?.lastCollectedAt
  if (!t) return '—'
  return dayjs(t).format('YYYY-MM-DD HH:mm')
})

const lastCollectedAt = computed(() => useCheckpointChart.value ? historyData.value.length > 0 : !!apiData.value?.lastCollectedAt)

const historyData = computed(() => {
  if (useCheckpointChart.value) {
    const metric = selectedMetric.value
    const points = modelHistoryData.value?.metrics ?? []
    return normalizeEnergySeries(points.map((point) => {
      const value = metricValue(point, metric) ?? 0
      return {
        timestamp: parseTime(point.time),
        cpuUsage: value,
        gpuUsage: point.gpu_util ?? 0,
        memoryUsage: point.gpu_mem_util ?? 0,
        nodePower: point.node_power ?? 0,
        upper: value,
        lower: value,
        isForecast: false,
      }
    }))
  }
  return normalizeEnergySeries(apiData.value?.history ?? [])
})
const forecastData = computed(() => {
  if (useCheckpointChart.value) {
    const metric = selectedMetric.value
    const lastHistory = historyData.value[historyData.value.length - 1]
    const lastValue = lastHistory?.cpuUsage ?? 0
    return normalizeEnergySeries(selectedModelPredictions.value.map((prediction) => {
      const value = metricValue(prediction.metrics, metric) ?? lastValue
      const upper = metricValue(prediction.confidence_interval?.upper, metric)
        ?? metricValue(prediction.quantiles?.p90, metric)
        ?? Math.min(100, value + 4)
      const lower = metricValue(prediction.confidence_interval?.lower, metric)
        ?? metricValue(prediction.quantiles?.p10, metric)
        ?? Math.max(0, value - 4)
      return {
        timestamp: parseTime(prediction.forecast_time),
        cpuUsage: value,
        gpuUsage: prediction.metrics.gpu_util ?? 0,
        memoryUsage: prediction.metrics.gpu_mem_util ?? 0,
        nodePower: prediction.metrics.node_power ?? 0,
        upper,
        lower,
        isForecast: true,
      }
    }))
  }
  const history = historyData.value
  const forecast = normalizeEnergySeries(apiData.value?.forecast ?? [])
  const lastHistoryTime = history.length > 0 ? history[history.length - 1].timestamp : undefined
  if (!lastHistoryTime || forecast.length === 0) {
    return forecast
  }

  const forecastStartsInHistory = forecast[0].timestamp <= lastHistoryTime
  if (!forecastStartsInHistory) {
    return forecast
  }

  const intervalMs = inferForecastInterval(forecast, history)
  return forecast.map((item, index) => ({
    ...item,
    timestamp: lastHistoryTime + (index + 1) * intervalMs,
  }))
})
const forecastStartTime = computed(() => forecastData.value[0]?.timestamp ?? 0)

const lastActual = computed(() => {
  const h = historyData.value
  return h.length > 0 ? h[h.length - 1] : undefined
})

const lastForecast = computed(() => forecastData.value[0])

const deviation = computed(() => {
  const a = lastActual.value
  const f = lastForecast.value
  if (!a || !f) return 0
  return Math.abs(f.cpuUsage - a.cpuUsage)
})

const summaryCards = computed(() => {
  const a = lastActual.value
  const fd = forecastData.value
  const peak = fd.length ? Math.max(...fd.map((d) => d.cpuUsage)) : 0
  return [
    { label: `当前${selectedMetricLabel.value}`, value: a ? `${a.cpuUsage.toFixed(1)}%` : '—', color: '#0b57d0' },
    { label: '预测峰值', value: fd.length ? `${peak.toFixed(1)}%` : '—', color: '#f59e0b' },
    { label: '预测偏差', value: `±${deviation.value.toFixed(1)}%`, color: '#3b82f6' },
    { label: '置信水平', value: `${Math.round(forecastStore.confidenceLevel * 100)}%`, color: '#a855f7' },
  ]
})

const energyStats = computed(() => {
  if (useCheckpointChart.value) {
    const preds = selectedModelPredictions.value
    const p15 = preds.find((item) => item.horizon === 15)
    const p30 = preds.find((item) => item.horizon === 30)
    const p15Value = metricValue(p15?.metrics, selectedMetric.value)
    const p30Value = metricValue(p30?.metrics, selectedMetric.value)
    const risk = p30?.risk_level || p15?.risk_level || 'LOW'
    return [
      { label: '当前模型', value: selectedModelLabel.value, unit: '', color: '#a855f7' },
      { label: '15min预测', value: p15Value === null ? '—' : p15Value.toFixed(1), unit: '%', color: '#f59e0b' },
      { label: '30min预测', value: p30Value === null ? '—' : p30Value.toFixed(1), unit: '%', color: '#0b57d0' },
      { label: '风险等级', value: riskLabel(risk), unit: '', color: risk === 'HIGH' ? '#ef4444' : risk === 'MEDIUM' ? '#f59e0b' : '#22c55e' },
    ]
  }
  const d = apiData.value
  if (!d) return [
    { label: '总预测能耗', value: '—', unit: 'kWh', color: '#a855f7' },
    { label: '碳排放预估', value: '—', unit: 'kg CO₂', color: '#22c55e' },
    { label: '平均 CPU', value: '—', unit: '%', color: '#0b57d0' },
    { label: '平均功率', value: '—', unit: 'kW', color: '#f59e0b' },
  ]
  return [
    { label: '总预测能耗', value: d.totalEnergy.toFixed(1), unit: 'kWh', color: '#a855f7' },
    { label: '碳排放预估', value: d.carbonEmission.toFixed(2), unit: 'kg CO₂', color: '#22c55e' },
    { label: '平均 CPU', value: d.avgCpu.toFixed(1), unit: '%', color: '#0b57d0' },
    { label: '平均功率', value: d.avgPower.toFixed(2), unit: 'kW', color: '#f59e0b' },
  ]
})

async function fetchData() {
  greenApi.forecastLoading = true
  greenApi.forecastError = ''
  loadingError.value = ''
  try {
    if (useCheckpointChart.value) {
      modelHistoryData.value = await modelPredictApi.getHistory({
        cluster_uuid: predictClusterUuid.value,
        node_uuid: predictNodeUuid.value,
      }) as ModelHistoryResponse
      updateChart()
      return
    }
    const hours = TIME_RANGE_TO_HOURS[forecastStore.timeRange] ?? 720
    apiData.value = await forecastApi.getEnergyForecast({
      hours,
      confidenceLevel: forecastStore.confidenceLevel,
      taskType: forecastStore.forecastCategory === 'all' ? '' : forecastStore.forecastCategory,
      model: forecastStore.forecastModel,
      nodeUuid: currentNodeUuid.value,
      clusterUuid: currentClusterUuid.value,
    })
    updateChart()
  } catch (err: any) {
    loadingError.value = err.message || '未知错误'
    greenApi.forecastError = loadingError.value
  } finally {
    greenApi.forecastLoading = false
  }
}

async function fetchModelPredictions() {
  if (!useCheckpointChart.value) {
    modelPredictResponses.value = []
    updateChart()
    return
  }

  greenApi.modelPredictLoading = true
  greenApi.modelPredictError = ''
  modelPredictError.value = ''
  try {
    const response = await modelPredictApi.predict({
      cluster_uuid: predictClusterUuid.value,
      node_uuids: [predictNodeUuid.value],
      horizons: TOPIC1_HORIZONS,
      model_name: activeTopic1Model.value,
    }) as ModelPredictResponse
    modelPredictResponses.value = [response]
    updateChart()
  } catch (err: any) {
    modelPredictError.value = err.message || 'checkpoint 预测失败'
    greenApi.modelPredictError = modelPredictError.value
    loadingError.value = modelPredictError.value
  } finally {
    greenApi.modelPredictLoading = false
  }
}

function riskLabel(value: string) {
  if (value === 'HIGH') return '高'
  if (value === 'MEDIUM') return '中'
  return '低'
}

function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer)
  const interval = forecastStore.refreshInterval * 1000
  if (interval > 0) {
    refreshTimer = setTimeout(() => { fetchData(); fetchModelPredictions(); scheduleRefresh() }, interval)
  }
}

function updateChart() {
  if (!chart) return
  const d = historyData.value.length + forecastData.value.length
  const splitIdx = historyData.value.length
  const lineSmooth = 0.35
  const allTimes = [...historyData.value, ...forecastData.value].map((item) => item.timestamp)
  const minTime = allTimes.length ? Math.min(...allTimes) : undefined
  const maxTime = allTimes.length ? Math.max(...allTimes) : undefined

  chart.setOption({
    backgroundColor: 'transparent',
    grid: { top: 40, right: 24, bottom: 36, left: 56 },
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: { color: '#1f1f1f', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" },
      axisPointer: { type: 'line', lineStyle: { color: 'rgba(11,87,208,0.2)', type: 'dashed' } },
      formatter(params: any[]) {
        const axisT = params[0].axisValue
        const time = dayjs(axisT).format(d <= 24 ? 'HH:mm' : 'MM/DD HH:mm')
        const isForecast = forecastStartTime.value > 0 && axisT >= forecastStartTime.value
        let html = `<div style="margin-bottom:4px;color:#6b7280;font-size:11px">${time} <span style="color:${isForecast ? '#f59e0b' : '#0b57d0'};font-size:10px">${isForecast ? '预测' : '历史'}</span></div>`
        params.forEach((p: any) => {
          if (p.seriesName !== '置信上界' && p.seriesName !== '置信下界') {
            const y = Array.isArray(p.value) ? p.value[1] : p.value
            html += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span>${p.seriesName}: <b>${y?.toFixed(1) ?? '-'}%</b></span>
            </div>`
          }
        })
        return html
      },
    },
    legend: {
      show: false,
    },
    xAxis: {
      type: 'time' as const,
      min: minTime,
      max: maxTime,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#6b7280',
        fontSize: 10,
        hideOverlap: true,
        formatter: (v: number) => dayjs(v).format(d <= 24 ? 'HH:mm' : 'MM/DD'),
      },
      splitLine: { show: false },
      markLine: {
        silent: true,
        symbol: 'none',
        data: splitIdx > 0 && historyData.value[splitIdx - 1]
          ? [{ xAxis: historyData.value[splitIdx - 1].timestamp, lineStyle: { color: 'rgba(245,158,11,0.5)', type: 'dashed', width: 1.5 }, label: { formatter: '← 预测起点', color: '#b45309', fontSize: 11 } }]
          : [],
      },
    },
    yAxis: {
      type: 'value' as const,
      min: 0,
      max: 100,
      name: '负荷 %',
      nameTextStyle: { color: '#6b7280', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#6b7280', fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } },
    },
    series: [
      {
        name: '历史数据',
        type: 'line' as const,
        data: historyData.value.map((d) => [d.timestamp, d.cpuUsage]),
        smooth: lineSmooth,
        symbol: 'none',
        lineStyle: { color: '#0b57d0', width: 2 },
        areaStyle: { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(11,87,208,0.15)' }, { offset: 1, color: 'rgba(11,87,208,0)' }] },
      },
      {
        name: '预测数据',
        type: 'line' as const,
        data: splitIdx > 0 && historyData.value[splitIdx - 1]
          ? [[historyData.value[splitIdx - 1].timestamp, historyData.value[splitIdx - 1].cpuUsage], ...forecastData.value.map((d) => [d.timestamp, d.cpuUsage])]
          : forecastData.value.map((d) => [d.timestamp, d.cpuUsage]),
        smooth: lineSmooth,
        symbol: 'none',
        lineStyle: { color: '#f59e0b', width: 2, type: 'dashed' as const },
      },
      {
        name: '置信上界',
        type: 'line' as const,
        data: splitIdx > 0 && historyData.value[splitIdx - 1]
          ? [[historyData.value[splitIdx - 1].timestamp, historyData.value[splitIdx - 1].cpuUsage], ...forecastData.value.map((d) => [d.timestamp, d.upper ?? d.cpuUsage + 4])]
          : forecastData.value.map((d) => [d.timestamp, d.upper ?? d.cpuUsage + 4]),
        smooth: lineSmooth,
        lineStyle: { color: 'rgba(245,158,11,0.2)', width: 1 },
        areaStyle: { color: 'rgba(245,158,11,0.05)' },
        symbol: 'none',
      },
      {
        name: '置信下界',
        type: 'line' as const,
        data: splitIdx > 0 && historyData.value[splitIdx - 1]
          ? [[historyData.value[splitIdx - 1].timestamp, historyData.value[splitIdx - 1].cpuUsage], ...forecastData.value.map((d) => [d.timestamp, d.lower ?? Math.max(0, d.cpuUsage - 4)])]
          : forecastData.value.map((d) => [d.timestamp, d.lower ?? Math.max(0, d.cpuUsage - 4)]),
        smooth: lineSmooth,
        lineStyle: { color: 'rgba(245,158,11,0.2)', width: 1 },
        areaStyle: { color: 'rgba(0,0,0,0)' },
        symbol: 'none',
      },
    ],
  })
}

function initChart() {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  updateChart()
}

// 监听 activeTab 变化
watch(() => activeTab.value, (tab) => {
  emit('switchTab', tab)
})

onMounted(() => {
  clockTimer = setInterval(() => {
    currentTime.value = dayjs().format('HH:mm:ss')
  }, 1000)
  fetchData()
  fetchModelPredictions()
  scheduleRefresh()
  initChart()
})

watch([
  () => forecastStore.forecastCategory,
  () => forecastStore.timeRange,
  () => forecastStore.confidenceLevel,
  () => forecastStore.forecastHorizon,
  () => forecastStore.smoothingFactor,
  () => forecastStore.forecastModel,
], () => {
  fetchData()
  fetchModelPredictions()
  scheduleRefresh()
})

watch([predictClusterUuid, predictNodeUuid], () => {
  fetchData()
  fetchModelPredictions()
})

onUnmounted(() => {
  clearInterval(clockTimer)
  if (refreshTimer) clearTimeout(refreshTimer)
  chart?.dispose()
})
</script>

<style scoped>
/* Page layout */
.green-page {
  width: 100%;
  min-height: 100vh;
  background: var(--m3-background);
  display: flex;
  flex-direction: column;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  height: var(--m3-topbar-height);
  padding: 0 24px;
  background: var(--m3-surface);
  border-bottom: 1px solid var(--m3-border);
  gap: 24px;
  flex-shrink: 0;
}

.page-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.page-logo-text {
  font-size: 17px;
  font-weight: 700;
  color: #0b57d0;
}

.page-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.page-nav-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--m3-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}

.page-nav-item:hover {
  background: var(--m3-surface-variant);
  color: var(--m3-text-main);
}

.page-nav-item.active {
  background: rgba(11, 87, 208, 0.08);
  color: #0b57d0;
  border-color: rgba(11, 87, 208, 0.2);
}

.page-nav-item svg {
  flex-shrink: 0;
}

.page-clock {
  font-size: 12px;
  color: var(--m3-text-secondary);
  font-family: 'JetBrains Mono', monospace;
  background: var(--m3-surface-variant);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--m3-border);
  flex-shrink: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: 1px solid var(--m3-border);
  border-radius: 6px;
  background: var(--m3-surface);
  color: var(--m3-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.back-btn:hover {
  background: var(--m3-surface-variant);
  color: var(--m3-text-main);
  border-color: rgba(11, 87, 208, 0.3);
}

.node-badge {
  font-size: 11px;
  font-weight: 500;
  color: #0b57d0;
  background: rgba(11, 87, 208, 0.08);
  padding: 4px 10px;
  border-radius: 5px;
  border: 1px solid rgba(11, 87, 208, 0.2);
}

/* Content */
.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.page-content::-webkit-scrollbar {
  width: 6px;
}

.page-content::-webkit-scrollbar-track {
  background: transparent;
}

.page-content::-webkit-scrollbar-thumb {
  background: var(--m3-border);
  border-radius: 3px;
}

/* Summary grid */
.green-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.green-summary-card {
  background: var(--m3-surface);
  border: 1px solid var(--m3-border);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.green-summary-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--m3-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.green-summary-value {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-family: 'JetBrains Mono', monospace;
}

/* Error banner */
.green-error-banner {
  padding: 10px 16px;
  color: #ef4444;
  font-size: 13px;
  margin-bottom: 16px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
}

/* Chart card */
.green-chart-card {
  background: var(--m3-surface);
  border: 1px solid var(--m3-border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.green-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}

.green-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--m3-text-main);
}

.green-card-sub {
  font-size: 11px;
  color: var(--m3-text-secondary);
}

.green-chart-legend {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.green-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.green-legend-text {
  font-size: 11px;
  color: var(--m3-text-secondary);
}

.green-legend-hint {
  font-size: 10px;
  color: var(--m3-text-hint);
}

/* Bottom card */
.green-bottom-card {
  background: var(--m3-surface);
  border: 1px solid var(--m3-border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.green-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 4px;
}

.green-stat-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: rgba(11, 87, 208, 0.04);
  border-radius: 8px;
  border: 1px solid rgba(11, 87, 208, 0.08);
}

.green-stat-label {
  font-size: 11px;
  color: var(--m3-text-secondary);
  font-weight: 500;
}

.green-stat-value {
  font-size: 18px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}

.green-stat-unit {
  font-size: 10px;
  color: var(--m3-text-hint);
}

@media (max-width: 768px) {
  .green-summary-grid,
  .green-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
