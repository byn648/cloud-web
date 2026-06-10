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

    <!-- Filter bar -->
    <div class="perf-filter-bar" v-if="activeTab === 'performance'">
      <SelectGroup
        label="服务器"
        :options="SLO_SERVERS"
        :modelValue="sloStore.sloServer"
        @update:modelValue="(v) => sloStore.setSLOServer(v)"
      />
      <SelectGroup
        label="服务"
        :options="SLO_SERVICES"
        :modelValue="sloStore.sloService"
        @update:modelValue="(v) => sloStore.setSLOService(v)"
      />
      <SelectGroup
        label="实例"
        :options="SLO_INSTANCES"
        :modelValue="sloStore.sloInstance"
        @update:modelValue="(v) => sloStore.setSLOInstance(v)"
      />
    </div>

    <!-- Page content -->
    <div class="page-content">
      <div v-if="apiError" class="green-error-banner">
        加载失败：{{ apiError }}（显示演示数据）
      </div>

      <!-- SLO metric rings -->
      <SLOMetrics v-if="sloData" :data="sloMetrics" />

      <div class="slo-status-panel" v-if="activeTab === 'performance' && sloStatusSummary">
        <div class="slo-status-summary" :class="statusClass(sloStatusSummary.status)">
          <div class="slo-status-main">
            <span class="slo-status-label">当前 SLO 状态</span>
            <span class="slo-status-value">{{ statusLabel(sloStatusSummary.status) }}</span>
          </div>
          <div class="slo-risk-meter">
            <div class="slo-risk-top">
              <span>违约风险</span>
              <strong>{{ riskPercent(sloStatusSummary.currentRisk) }}%</strong>
            </div>
            <div class="slo-risk-track">
              <div class="slo-risk-fill" :style="{ width: `${riskPercent(sloStatusSummary.currentRisk)}%` }"></div>
            </div>
          </div>
          <div class="slo-status-counts">
            <span>{{ sloStatusSummary.normalCount }} 正常</span>
            <span>{{ sloStatusSummary.warningCount }} 预警</span>
            <span>{{ sloStatusSummary.violatedCount }} 违约</span>
          </div>
        </div>

        <div class="slo-status-table">
          <div class="slo-status-row header">
            <span>服务 / API</span>
            <span>状态</span>
            <span>P99</span>
            <span>错误率</span>
            <span>QPS</span>
            <span>风险</span>
          </div>
          <div v-for="row in sloStatusRows" :key="`${row.serviceId}-${row.apiId}`" class="slo-status-row">
            <span class="slo-service-cell">
              <strong>{{ row.serviceName || row.serviceId }}</strong>
              <small>{{ row.apiId }}</small>
            </span>
            <span class="slo-pill" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
            <span>{{ row.p99Latency.toFixed(0) }}ms</span>
            <span>{{ row.errorRate.toFixed(3) }}%</span>
            <span>{{ row.qps.toFixed(0) }}</span>
            <span>{{ riskPercent(row.violationRisk) }}%</span>
          </div>
        </div>
      </div>

      <div class="slo-budget-panel" v-if="activeTab === 'performance' && sloBudgetAllocation">
        <div class="green-card-header">
          <span class="green-card-title">端到端 SLO 分解</span>
          <span class="green-card-badge">{{ allocationMethodLabel(sloBudgetAllocation.method) }}</span>
        </div>
        <div class="slo-budget-summary">
          <div>
            <span>业务流程</span>
            <strong>{{ sloBudgetAllocation.businessFlow }}</strong>
          </div>
          <div>
            <span>端到端 P99</span>
            <strong>{{ sloBudgetAllocation.targetP99Latency.toFixed(0) }}ms</strong>
          </div>
          <div>
            <span>端到端错误率</span>
            <strong>{{ sloBudgetAllocation.targetErrorRate.toFixed(3) }}%</strong>
          </div>
          <div>
            <span>服务数</span>
            <strong>{{ sloBudgetAllocation.services.length }}</strong>
          </div>
        </div>
        <div class="slo-budget-table">
          <div class="slo-budget-row header">
            <span>服务 / API</span>
            <span>P99预算</span>
            <span>错误率预算</span>
            <span>贡献占比</span>
            <span>QPS</span>
            <span>关键路径</span>
          </div>
          <div v-for="row in sloBudgetAllocation.services" :key="`${row.serviceId}-${row.apiId}`" class="slo-budget-row">
            <span class="slo-service-cell">
              <strong>{{ row.serviceName || row.serviceId }}</strong>
              <small>{{ row.apiId }}</small>
            </span>
            <span>{{ row.p99LatencyBudget.toFixed(0) }}ms</span>
            <span>{{ row.errorRateBudget.toFixed(4) }}%</span>
            <span>{{ (row.latencyContribution * 100).toFixed(1) }}%</span>
            <span>{{ row.qps.toFixed(0) }}</span>
            <span>
              <span class="slo-path-pill" :class="{ critical: row.criticalPath }">
                {{ row.criticalPath ? '是' : '否' }}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div class="slo-proxy-panel" v-if="activeTab === 'performance' && sloProxyPrediction && sloProxyRows.length">
        <div class="green-card-header">
          <span class="green-card-title">SLO 代理模型预测</span>
          <span class="green-card-badge">{{ sloProxyPrediction.modelVersion || sloProxyPrediction.modelName }}</span>
        </div>
        <div class="slo-proxy-summary">
          <div>
            <span>模型</span>
            <strong>{{ sloProxyPrediction.modelName }}</strong>
          </div>
          <div>
            <span>预测条目</span>
            <strong>{{ sloProxyRows.length }}</strong>
          </div>
          <div>
            <span>最高违约概率</span>
            <strong>{{ riskPercent(proxyMaxRisk) }}%</strong>
          </div>
          <div>
            <span>关注服务</span>
            <strong>{{ proxyRiskService }}</strong>
          </div>
        </div>
        <div class="slo-proxy-table">
          <div class="slo-proxy-row header">
            <span>服务 / API</span>
            <span>窗口</span>
            <span>QPS预测</span>
            <span>资源配置</span>
            <span>P99预测 / 预算</span>
            <span>违约概率</span>
            <span>结论</span>
          </div>
          <div v-for="row in sloProxyRows" :key="`${row.serviceId}-${row.apiId}-${row.horizonMinutes}`" class="slo-proxy-row">
            <span class="slo-service-cell">
              <strong>{{ row.serviceName || row.serviceId }}</strong>
              <small>{{ row.apiId }}</small>
            </span>
            <span>{{ row.horizonMinutes }}min</span>
            <span>{{ row.qpsForecast.toFixed(0) }}</span>
            <span class="slo-resource-cell">
              <strong>{{ row.replicaCount }}副本 · {{ row.cpuRequest.toFixed(1) }}C</strong>
              <small>{{ row.gpuRequest.toFixed(1) }}GPU · {{ row.memoryRequestGb.toFixed(1) }}GB</small>
            </span>
            <span>{{ row.predictedP99Latency.toFixed(0) }} / {{ row.p99LatencyBudget.toFixed(0) }}ms</span>
            <span>{{ riskPercent(row.violationProbability) }}%</span>
            <span>
              <span class="slo-result-pill" :class="proxyResultClass(row)">
                {{ proxyResultText(row) }}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div class="green-main-grid" v-if="activeTab === 'performance'">
        <!-- SLO trend chart -->
        <div class="green-chart-card">
          <div class="green-card-header">
            <span class="green-card-title">SLO 达标率趋势</span>
            <span class="green-card-badge">近 48 小时</span>
          </div>
          <div ref="sloTrendRef" style="height: 200px;"></div>
        </div>

        <!-- Right column: Error budget + Resource -->
        <div class="green-right-column">
          <div class="green-chart-card">
            <div class="green-card-header">
              <span class="green-card-title">错误预算</span>
            </div>
            <ErrorBudgetChart v-if="errorBudgetData" :budget="budget" />
          </div>

          <div class="green-chart-card">
            <div class="green-card-header">
              <span class="green-card-title">资源争用状态</span>
            </div>
            <div class="green-resource-list">
              <div v-for="r in resourceItems" :key="r.label" class="green-resource-item">
                <div class="green-resource-header">
                  <span class="green-resource-label">{{ r.label }}</span>
                  <span class="green-resource-value" :style="{ color: r.color }">{{ r.value }}{{ r.unit }}</span>
                </div>
                <div class="green-progress-bar">
                  <div class="green-progress-fill" :style="{ width: `${(r.value / r.max) * 100}%`, background: (r.value / r.max) * 100 > 80 ? '#ef4444' : r.color }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Power & Storage trend -->
      <div class="green-chart-card" v-if="activeTab === 'performance'">
        <div class="green-card-header">
          <span class="green-card-title">功率 &amp; 储能状态图</span>
          <span class="green-card-badge">协同态势</span>
        </div>
        <div ref="powerTrendRef" style="height: 180px;"></div>
      </div>

      <!-- Service chain table -->
      <div class="green-bottom-card" v-if="activeTab === 'performance'">
        <div class="green-card-header">
          <span class="green-card-title">服务链路状态</span>
        </div>
        <ServiceStatusTable v-if="serviceChainData" :services="filteredServices" />
      </div>

      <!-- Energy forecast -->
      <div class="green-chart-card" v-if="activeTab === 'performance'">
        <div class="green-card-header">
          <span class="green-card-title">能耗预测管控</span>
          <span class="green-card-sub">基于负载历史的 EWMA 预测 · 置信度 {{ Math.round((energyForecastData?.confidenceLevel ?? 0.95) * 100) }}%</span>
        </div>

        <div class="green-energy-stats">
          <div v-for="stat in energyStatCards" :key="stat.label"
            class="green-stat-card">
            <span class="green-stat-label">{{ stat.label }}</span>
            <span class="green-stat-value" :style="{ color: stat.color }">{{ stat.value }}</span>
            <span class="green-stat-unit">{{ stat.unit }}</span>
          </div>
        </div>

        <div class="green-chart-legend">
          <span class="green-legend-dot" style="background: #a855f7;"></span>
          <span class="green-legend-text">历史功率</span>
          <span class="green-legend-dot" style="background: #f59e0b;"></span>
          <span class="green-legend-text">预测功率</span>
          <span class="green-legend-dot" style="background: rgba(245,158,11,0.3);"></span>
          <span class="green-legend-text">置信区间</span>
        </div>
        <div ref="energyTrendRef" style="height: 220px;"></div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import SelectGroup from '@/components/green/SelectGroup.vue'
import SLOMetrics from '@/components/green/SLOMetrics.vue'
import ErrorBudgetChart from '@/components/green/ErrorBudget.vue'
import ServiceStatusTable from '@/components/green/ServiceStatusTable.vue'
import { useSLOPageStore } from '@/stores/greenStore'
import { SLO_SERVERS, SLO_SERVICES, SLO_INSTANCES } from '@/utils/chartConfig'
import { forecastApi, performanceApi } from '@/api/green'
import type {
  SLOResponse, ErrorBudgetResponse, ResourceResponse,
  PowerStorageResponse, ServiceChainResponse, ServiceNode,
  EnergyForecastResponse, SLOProxyPrediction,
} from '@/api/green/types'
import {
  MOCK_SLO,
  MOCK_ERROR_BUDGET,
  MOCK_RESOURCE,
  MOCK_POWER_STORAGE,
  MOCK_SERVICE_CHAIN,
  MOCK_ENERGY_FORECAST,
  getErrorBudget,
  getSLOServices,
  type ErrorBudget,
} from '@/utils/mockData'
import dayjs from 'dayjs'

const props = defineProps<{
  initialTab?: 'forecast' | 'performance'
}>()

const emit = defineEmits<{
  switchTab: [tab: 'forecast' | 'performance']
}>()

const route = useRoute()
const router = useRouter()
const activeTab = ref<'forecast' | 'performance'>('performance')
const sloStore = useSLOPageStore()

// 从 URL 读取当前节点信息
const currentNodeUuid = computed(() => route.query.nodeUuid as string | undefined)
const currentNodeName = computed(() => route.query.nodeName as string | undefined)
const currentClusterUuid = computed(() => route.query.clusterUuid as string | undefined)
const showingNodeInfo = computed(() => currentNodeUuid.value ? `${currentNodeName.value || currentNodeUuid.value}` : '全部服务器')

// 返回集群概览
function goBack() {
  router.push({ path: '/green', query: { clusterUuid: currentClusterUuid.value } })
}

const currentTime = ref(dayjs().format('HH:mm:ss'))
let clockTimer: ReturnType<typeof setInterval>

// Data refs
const sloData = ref<SLOResponse | null>(null)
const errorBudgetData = ref<ErrorBudgetResponse | null>(null)
const resourceData = ref<ResourceResponse | null>(null)
const powerStorageData = ref<PowerStorageResponse | null>(null)
const serviceChainData = ref<ServiceChainResponse | null>(null)
const energyForecastData = ref<EnergyForecastResponse | null>(null)
const apiError = ref('')

// Chart refs
const sloTrendRef = ref<HTMLDivElement>()
const powerTrendRef = ref<HTMLDivElement>()
const energyTrendRef = ref<HTMLDivElement>()
let sloChart: echarts.ECharts | null = null
let powerChart: echarts.ECharts | null = null
let energyChart: echarts.ECharts | null = null

function switchTab(tab: 'forecast' | 'performance') {
  activeTab.value = tab
  emit('switchTab', tab)
}

// Computed
const sloMetrics = computed(() =>
  sloData.value?.metrics?.map(m => ({
    ...m,
    status: m.status as 'normal' | 'warning' | 'danger',
  })) ?? []
)

const sloStatusSummary = computed(() => sloData.value?.statusSummary ?? null)
const sloStatusRows = computed(() =>
  [...(sloData.value?.serviceStatuses ?? [])].sort((a, b) => b.violationRisk - a.violationRisk)
)
const sloBudgetAllocation = computed(() => sloData.value?.budgetAllocation ?? null)
const sloProxyPrediction = computed(() => sloData.value?.proxyPrediction ?? null)
const sloProxyRows = computed(() =>
  [...(sloData.value?.proxyPrediction?.predictions ?? [])].sort((a, b) => {
    if (b.violationProbability !== a.violationProbability) {
      return b.violationProbability - a.violationProbability
    }
    return a.horizonMinutes - b.horizonMinutes
  })
)
const proxyMaxRisk = computed(() =>
  sloProxyRows.value.reduce((max, row) => Math.max(max, row.violationProbability), 0)
)
const proxyRiskService = computed(() => {
  const row = sloProxyRows.value[0]
  return row ? (row.serviceName || row.serviceId) : '—'
})

function statusClass(status?: string) {
  const normalized = (status || '').toUpperCase()
  if (normalized === 'VIOLATED') return 'violated'
  if (normalized === 'WARNING') return 'warning'
  return 'normal'
}

function statusLabel(status?: string) {
  const normalized = (status || '').toUpperCase()
  if (normalized === 'VIOLATED') return '已违约'
  if (normalized === 'WARNING') return '预警'
  return '正常'
}

function riskPercent(risk?: number) {
  return Math.round(Math.min(Math.max(risk ?? 0, 0), 1) * 100)
}

function allocationMethodLabel(method?: string) {
  if (method === 'baseline') return '比例分配 baseline'
  if (method === 'risk_weighted' || method === 'improved') return '风险加权 improved'
  return method || 'SLO Budget Allocator'
}

function proxyResultClass(row: SLOProxyPrediction) {
  if (!row.canMeetBudget || row.violationProbability >= 0.7) return 'violated'
  if (row.violationProbability >= 0.45 || row.predictedP99Latency >= row.p99LatencyBudget * 0.85) return 'warning'
  return 'normal'
}

function proxyResultText(row: SLOProxyPrediction) {
  const level = proxyResultClass(row)
  if (level === 'violated') return '需扩容'
  if (level === 'warning') return '需关注'
  return '可满足'
}

const budget = computed<ErrorBudget>(() => {
  const eb = errorBudgetData.value
  if (!eb) return { total: 0, consumed: 0, remaining: 0 }
  return {
    total: eb.totalBudgetHours,
    consumed: eb.consumedHours,
    remaining: eb.remainingHours,
  }
})

const filteredServices = computed(() => {
  const services = serviceChainData.value?.services ?? []
  if (sloStore.sloService === 'all') return services as any
  return services.filter((s) => s.id === sloStore.sloService) as any
})

const resourceItems = computed(() => {
  const items = resourceData.value?.items ?? []
  if (items.length > 0) return items
  return [
    { label: 'CPU 争用', value: 34, max: 100, unit: '%', color: '#0b57d0' },
    { label: 'GPU 争用', value: 67, max: 100, unit: '%', color: '#a855f7' },
    { label: '内存使用', value: 78, max: 100, unit: '%', color: '#f59e0b' },
    { label: '网络带宽', value: 42, max: 100, unit: '%', color: '#3b82f6' },
  ]
})

const energyStatCards = computed(() => {
  const d = energyForecastData.value
  if (!d) {
    return [
      { label: '总预测能耗', value: '—', unit: 'kWh', color: '#a855f7' },
      { label: '碳排放预估', value: '—', unit: 'kg CO₂', color: '#22c55e' },
      { label: '平均 CPU', value: '—', unit: '%', color: '#0b57d0' },
      { label: '平均功率', value: '—', unit: 'kW', color: '#f59e0b' },
    ]
  }
  return [
    { label: '总预测能耗', value: d.totalEnergy.toFixed(1), unit: 'kWh', color: '#a855f7' },
    { label: '碳排放预估', value: d.carbonEmission.toFixed(2), unit: 'kg CO₂', color: '#22c55e' },
    { label: '平均 CPU', value: d.avgCpu.toFixed(1), unit: '%', color: '#0b57d0' },
    { label: '平均功率', value: d.avgPower.toFixed(2), unit: 'kW', color: '#f59e0b' },
  ]
})


// Data loaders with mock fallback
async function loadAll() {
  apiError.value = ''
  try {
    const [slo, eb, resource, powerStorage, serviceChain] = await Promise.all([
      performanceApi.getSLO({ nodeUuid: currentNodeUuid.value, clusterUuid: currentClusterUuid.value }),
      performanceApi.getErrorBudget({ nodeUuid: currentNodeUuid.value, clusterUuid: currentClusterUuid.value }),
      performanceApi.getResource({ nodeUuid: currentNodeUuid.value, clusterUuid: currentClusterUuid.value }),
      performanceApi.getPowerStorage({ nodeUuid: currentNodeUuid.value, clusterUuid: currentClusterUuid.value }),
      performanceApi.getServiceChain({ nodeUuid: currentNodeUuid.value, clusterUuid: currentClusterUuid.value }),
    ])
    sloData.value = slo
    errorBudgetData.value = eb
    resourceData.value = resource
    powerStorageData.value = powerStorage
    serviceChainData.value = serviceChain
  } catch (err: any) {
    // Use mock data for demo mode
    sloData.value = MOCK_SLO
    errorBudgetData.value = MOCK_ERROR_BUDGET
    resourceData.value = MOCK_RESOURCE
    powerStorageData.value = MOCK_POWER_STORAGE
    serviceChainData.value = MOCK_SERVICE_CHAIN
    apiError.value = err.message || '未知错误'
  }

  try {
    energyForecastData.value = await forecastApi.getEnergyForecast({
      hours: 24,
      confidenceLevel: 0.95,
      nodeUuid: currentNodeUuid.value,
      clusterUuid: currentClusterUuid.value,
    })
  } catch {
    energyForecastData.value = MOCK_ENERGY_FORECAST
  }

  updateCharts()
}

function updateCharts() {
  updateSLOChart()
  updatePowerChart()
  updateEnergyChart()
}

function updateSLOChart() {
  if (!sloChart || !sloData.value) return
  const trend = sloData.value.trend48h ?? []
  sloChart.setOption({
    series: [
      { name: 'API 网关', type: 'line', data: trend.map((d) => [d.timestamp, d.apiGw]), smooth: 0.4, symbol: 'none', lineStyle: { color: '#0b57d0', width: 2 } },
      { name: '模型推理', type: 'line', data: trend.map((d) => [d.timestamp, d.modelInference]), smooth: 0.4, symbol: 'none', lineStyle: { color: '#f59e0b', width: 2, type: 'dashed' } },
      { name: '数据处理', type: 'line', data: trend.map((d) => [d.timestamp, d.dataProcess]), smooth: 0.4, symbol: 'none', lineStyle: { color: '#3b82f6', width: 2 } },
    ],
  })
}

function updatePowerChart() {
  if (!powerChart || !powerStorageData.value) return
  const trend = powerStorageData.value.trend48h ?? []
  powerChart.setOption({
    series: [
      {
        name: '算力功率', type: 'line',
        data: trend.map((d) => [d.timestamp, d.computePower]),
        smooth: 0.4, symbol: 'none',
        lineStyle: { color: '#a855f7', width: 2 },
        areaStyle: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(168,85,247,0.15)' }, { offset: 1, color: 'rgba(168,85,247,0)' }] },
      },
      {
        name: '储能状态', type: 'line',
        data: trend.map((d) => [d.timestamp, d.storageStatus]),
        smooth: 0.4, symbol: 'none',
        lineStyle: { color: '#3b82f6', width: 2, type: 'dashed' },
      },
    ],
  })
}

function updateEnergyChart() {
  if (!energyChart || !energyForecastData.value) return
  const history = energyForecastData.value.history ?? []
  const forecast = energyForecastData.value.forecast ?? []
  const splitIdx = history.length
  const allData = [...history, ...forecast]

  energyChart.setOption({
    xAxis: {
      type: 'time',
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#6b7280', fontSize: 10, hideOverlap: true,
        formatter: (v: number) => dayjs(v).format(allData.length <= 48 ? 'HH:mm' : 'MM/DD HH:mm'),
      },
      splitLine: { show: false },
      markLine: splitIdx > 0 && history[splitIdx - 1]
        ? { silent: true, symbol: 'none', data: [{ xAxis: history[splitIdx - 1].timestamp, lineStyle: { color: 'rgba(245,158,11,0.5)', type: 'dashed', width: 1.5 }, label: { formatter: '← 预测起点', color: '#b45309', fontSize: 10 } }] }
        : undefined,
    },
    series: [
      { name: '历史功率', type: 'line', data: history.map((d) => [d.timestamp, d.nodePower]), smooth: 0.4, symbol: 'none', lineStyle: { color: '#a855f7', width: 2 }, areaStyle: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(168,85,247,0.2)' }, { offset: 1, color: 'rgba(168,85,247,0)' }] } },
      {
        name: '预测功率', type: 'line',
        data: splitIdx > 0 && history[splitIdx - 1]
          ? [[history[splitIdx - 1].timestamp, history[splitIdx - 1].nodePower], ...forecast.map((d) => [d.timestamp, d.nodePower])]
          : forecast.map((d) => [d.timestamp, d.nodePower]),
        smooth: 0.4, symbol: 'none',
        lineStyle: { color: '#f59e0b', width: 2, type: 'dashed' },
      },
      {
        name: '置信上界', type: 'line',
        data: splitIdx > 0 && history[splitIdx - 1]
          ? [[history[splitIdx - 1].timestamp, history[splitIdx - 1].nodePower], ...forecast.map((d) => [d.timestamp, d.upper ?? d.nodePower + 3])]
          : forecast.map((d) => [d.timestamp, d.upper ?? d.nodePower + 3]),
        smooth: 0.4, lineStyle: { color: 'rgba(245,158,11,0.15)', width: 1 },
        areaStyle: { color: 'rgba(245,158,11,0.05)' }, symbol: 'none',
      },
      {
        name: '置信下界', type: 'line',
        data: splitIdx > 0 && history[splitIdx - 1]
          ? [[history[splitIdx - 1].timestamp, history[splitIdx - 1].nodePower], ...forecast.map((d) => [d.timestamp, d.lower ?? Math.max(0, d.nodePower - 3)])]
          : forecast.map((d) => [d.timestamp, d.lower ?? Math.max(0, d.nodePower - 3)]),
        smooth: 0.4, lineStyle: { color: 'rgba(245,158,11,0.15)', width: 1 },
        areaStyle: { color: 'rgba(0,0,0,0)' }, symbol: 'none',
      },
    ],
  })
}

function initSLOChart() {
  if (!sloTrendRef.value) return
  sloChart = echarts.init(sloTrendRef.value)
  sloChart.setOption({
    backgroundColor: 'transparent',
    grid: { top: 12, right: 16, bottom: 28, left: 48 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: { color: '#1f1f1f', fontSize: 12 },
      formatter(params: any[]) {
        const time = dayjs(params[0].axisValue).format('MM/DD HH:mm')
        let html = `<div style="margin-bottom:4px;color:#6b7280;font-size:11px">${time}</div>`
        params.forEach((p: any) => {
          const y = Array.isArray(p.value) ? p.value[1] : p.value
          html += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
            <span>${p.seriesName}: <b>${y?.toFixed(2) ?? '-'}%</b></span>
          </div>`
        })
        return html
      },
    },
    legend: {
      data: ['API 网关', '模型推理', '数据处理'],
      top: 4, right: 8,
      textStyle: { color: '#6b7280', fontSize: 11 },
      icon: 'circle', itemWidth: 8,
    },
    xAxis: {
      type: 'time',
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#6b7280', fontSize: 10, hideOverlap: true,
        formatter: (v: number) => dayjs(v).format('MM/DD HH:mm'),
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 90, max: 100.5,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#6b7280', fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } },
      markLine: {
        silent: true, symbol: 'none',
        data: [{ yAxis: 99.5, lineStyle: { color: 'rgba(185,28,28,0.4)', type: 'dashed', width: 1 }, label: { formatter: 'SLO 99.5%', color: '#b91c1c', fontSize: 10 } }],
      },
    },
    series: [
      { name: 'API 网关', type: 'line', data: [], smooth: 0.4, symbol: 'none', lineStyle: { color: '#0b57d0', width: 2 } },
      { name: '模型推理', type: 'line', data: [], smooth: 0.4, symbol: 'none', lineStyle: { color: '#f59e0b', width: 2, type: 'dashed' } },
      { name: '数据处理', type: 'line', data: [], smooth: 0.4, symbol: 'none', lineStyle: { color: '#3b82f6', width: 2 } },
    ],
  })
}

function initPowerChart() {
  if (!powerTrendRef.value) return
  powerChart = echarts.init(powerTrendRef.value)
  powerChart.setOption({
    backgroundColor: 'transparent',
    grid: { top: 12, right: 16, bottom: 28, left: 48 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: { color: '#1f1f1f', fontSize: 12 },
      formatter(params: any[]) {
        const time = dayjs(params[0].axisValue).format('MM/DD HH:mm')
        let html = `<div style="margin-bottom:4px;color:#6b7280;font-size:11px">${time}</div>`
        params.forEach((p: any) => {
          const unit = p.seriesName === '储能状态' ? '%' : 'kW'
          const y = Array.isArray(p.value) ? p.value[1] : p.value
          html += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
            <span>${p.seriesName}: <b>${y}${unit}</b></span>
          </div>`
        })
        return html
      },
    },
    legend: {
      data: ['算力功率', '储能状态'],
      top: 4, right: 8,
      textStyle: { color: '#6b7280', fontSize: 11 },
      icon: 'circle', itemWidth: 8,
    },
    xAxis: {
      type: 'time',
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#6b7280', fontSize: 10, hideOverlap: true,
        formatter: (v: number) => dayjs(v).format('MM/DD HH:mm'),
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#6b7280', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } },
    },
    series: [
      { name: '算力功率', type: 'line', data: [], smooth: 0.4, symbol: 'none', lineStyle: { color: '#a855f7', width: 2 }, areaStyle: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(168,85,247,0.15)' }, { offset: 1, color: 'rgba(168,85,247,0)' }] } },
      { name: '储能状态', type: 'line', data: [], smooth: 0.4, symbol: 'none', lineStyle: { color: '#3b82f6', width: 2, type: 'dashed' } },
    ],
  })
}

function initEnergyChart() {
  if (!energyTrendRef.value) return
  energyChart = echarts.init(energyTrendRef.value)
  energyChart.setOption({
    backgroundColor: 'transparent',
    grid: { top: 12, right: 16, bottom: 28, left: 48 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: { color: '#1f1f1f', fontSize: 12 },
      formatter(params: any[]) {
        const time = dayjs(params[0].axisValue).format('MM/DD HH:mm')
        let html = `<div style="margin-bottom:4px;color:#6b7280;font-size:11px">${time}</div>`
        params.forEach((p: any) => {
          if (p.seriesName !== '置信上界' && p.seriesName !== '置信下界') {
            const y = Array.isArray(p.value) ? p.value[1] : p.value
            html += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span>${p.seriesName}: <b>${y} kW</b></span>
            </div>`
          }
        })
        return html
      },
    },
    legend: {
      data: ['历史功率', '预测功率', '置信上界', '置信下界'],
      top: 4, right: 8,
      textStyle: { color: '#6b7280', fontSize: 11 },
      icon: 'circle', itemWidth: 8,
    },
    xAxis: {
      type: 'time',
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#6b7280', fontSize: 10, hideOverlap: true,
        formatter: (v: number) => dayjs(v).format('MM/DD HH:mm'),
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#6b7280', fontSize: 11, formatter: '{value} kW' },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } },
    },
    series: [
      { name: '历史功率', type: 'line', data: [], smooth: 0.4, symbol: 'none', lineStyle: { color: '#a855f7', width: 2 }, areaStyle: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(168,85,247,0.2)' }, { offset: 1, color: 'rgba(168,85,247,0)' }] } },
      { name: '预测功率', type: 'line', data: [], smooth: 0.4, symbol: 'none', lineStyle: { color: '#f59e0b', width: 2, type: 'dashed' } },
      { name: '置信上界', type: 'line', data: [], smooth: 0.4, lineStyle: { color: 'rgba(245,158,11,0.15)', width: 1 }, areaStyle: { color: 'rgba(245,158,11,0.05)' }, symbol: 'none' },
      { name: '置信下界', type: 'line', data: [], smooth: 0.4, lineStyle: { color: 'rgba(245,158,11,0.15)', width: 1 }, areaStyle: { color: 'rgba(0,0,0,0)' }, symbol: 'none' },
    ],
  })
}

let ro: ResizeObserver | null = null

onMounted(async () => {
  clockTimer = setInterval(() => {
    currentTime.value = dayjs().format('HH:mm:ss')
  }, 1000)

  initSLOChart()
  initPowerChart()
  initEnergyChart()

  await loadAll()

  ro = new ResizeObserver(() => {
    sloChart?.resize()
    powerChart?.resize()
    energyChart?.resize()
  })
  ;[sloTrendRef.value, powerTrendRef.value, energyTrendRef.value].forEach((el) => {
    if (el) ro!.observe(el)
  })
})

onUnmounted(() => {
  clearInterval(clockTimer)
  ro?.disconnect()
  sloChart?.dispose()
  powerChart?.dispose()
  energyChart?.dispose()
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

/* Filter bar */
.perf-filter-bar {
  display: flex;
  gap: 12px;
  padding: 12px 24px;
  background: var(--m3-surface);
  border-bottom: 1px solid var(--m3-border);
  flex-wrap: wrap;
}

/* Content */
.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.page-content::-webkit-scrollbar { width: 6px; }
.page-content::-webkit-scrollbar-track { background: transparent; }
.page-content::-webkit-scrollbar-thumb { background: var(--m3-border); border-radius: 3px; }

/* Error banner */
.green-error-banner {
  padding: 10px 16px;
  color: #f59e0b;
  font-size: 13px;
  margin-bottom: 16px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 8px;
}

/* SLO grid (from SLOMetrics component styles) */
:deep(.green-slo-grid) {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

:deep(.green-slo-card) {
  background: var(--m3-surface);
  border: 1px solid var(--m3-border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

:deep(.green-slo-ring) {
  flex-shrink: 0;
}

:deep(.green-slo-info) {
  flex: 1;
  min-width: 0;
}

:deep(.green-slo-label) {
  font-size: 12px;
  font-weight: 600;
  color: var(--m3-text-secondary);
  margin-bottom: 2px;
}

:deep(.green-slo-sub) {
  font-size: 11px;
  color: var(--m3-text-hint);
  margin-bottom: 4px;
}

:deep(.green-slo-status) {
  font-size: 11px;
  font-weight: 500;
}

:deep(.green-slo-status.normal) { color: #22c55e; }
:deep(.green-slo-status.warning) { color: #f59e0b; }
:deep(.green-slo-status.danger) { color: #ef4444; }

/* V0.1 SLO status panel */
.slo-status-panel {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 14px;
  margin-bottom: 20px;
}

.slo-status-summary,
.slo-status-table {
  background: var(--m3-surface);
  border: 1px solid var(--m3-border);
  border-radius: 12px;
}

.slo-status-summary {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-left: 4px solid #22c55e;
}

.slo-status-summary.warning { border-left-color: #f59e0b; }
.slo-status-summary.violated { border-left-color: #ef4444; }

.slo-status-main {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.slo-status-label,
.slo-risk-top,
.slo-status-counts {
  font-size: 12px;
  color: var(--m3-text-secondary);
}

.slo-status-value {
  font-size: 22px;
  font-weight: 700;
  color: #22c55e;
}

.slo-status-summary.warning .slo-status-value { color: #f59e0b; }
.slo-status-summary.violated .slo-status-value { color: #ef4444; }

.slo-risk-meter {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slo-risk-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.slo-risk-top strong {
  color: var(--m3-text-main);
  font-size: 16px;
}

.slo-risk-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--m3-surface-variant);
}

.slo-risk-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #22c55e, #f59e0b, #ef4444);
}

.slo-status-counts {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.slo-status-table {
  overflow: hidden;
}

.slo-status-row {
  display: grid;
  grid-template-columns: minmax(180px, 1.6fr) 72px 72px 78px 64px 64px;
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--m3-border);
  font-size: 12px;
  color: var(--m3-text-main);
}

.slo-status-row:last-child {
  border-bottom: 0;
}

.slo-status-row.header {
  color: var(--m3-text-secondary);
  font-size: 11px;
  font-weight: 600;
  background: var(--m3-surface-variant);
}

.slo-service-cell {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.slo-service-cell strong,
.slo-service-cell small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slo-service-cell small {
  color: var(--m3-text-secondary);
  font-size: 11px;
}

.slo-pill {
  width: fit-content;
  min-width: 52px;
  text-align: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: #166534;
  background: rgba(34, 197, 94, 0.12);
}

.slo-pill.warning {
  color: #92400e;
  background: rgba(245, 158, 11, 0.14);
}

.slo-pill.violated {
  color: #991b1b;
  background: rgba(239, 68, 68, 0.14);
}

/* V0.2 SLO budget allocator */
.slo-budget-panel {
  background: var(--m3-surface);
  border: 1px solid var(--m3-border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.slo-budget-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.slo-budget-summary > div {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--m3-border);
  border-radius: 8px;
  background: var(--m3-surface-variant);
}

.slo-budget-summary span {
  display: block;
  margin-bottom: 4px;
  color: var(--m3-text-secondary);
  font-size: 11px;
}

.slo-budget-summary strong {
  color: var(--m3-text-main);
  font-size: 15px;
  font-weight: 700;
}

.slo-budget-table {
  overflow: hidden;
  border: 1px solid var(--m3-border);
  border-radius: 8px;
}

.slo-budget-row {
  display: grid;
  grid-template-columns: minmax(180px, 1.7fr) 88px 98px 82px 68px 72px;
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--m3-border);
  font-size: 12px;
  color: var(--m3-text-main);
}

.slo-budget-row:last-child {
  border-bottom: 0;
}

.slo-budget-row.header {
  color: var(--m3-text-secondary);
  font-size: 11px;
  font-weight: 600;
  background: var(--m3-surface-variant);
}

.slo-path-pill {
  display: inline-flex;
  min-width: 34px;
  justify-content: center;
  padding: 3px 8px;
  border-radius: 999px;
  color: var(--m3-text-secondary);
  background: var(--m3-surface-variant);
  font-size: 11px;
  font-weight: 600;
}

.slo-path-pill.critical {
  color: #1d4ed8;
  background: rgba(59, 130, 246, 0.12);
}

/* V0.3 SLO proxy model */
.slo-proxy-panel {
  background: var(--m3-surface);
  border: 1px solid var(--m3-border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.slo-proxy-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.slo-proxy-summary > div {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--m3-border);
  border-radius: 8px;
  background: var(--m3-surface-variant);
}

.slo-proxy-summary span {
  display: block;
  margin-bottom: 4px;
  color: var(--m3-text-secondary);
  font-size: 11px;
}

.slo-proxy-summary strong {
  display: block;
  overflow: hidden;
  color: var(--m3-text-main);
  font-size: 15px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slo-proxy-table {
  overflow: hidden;
  border: 1px solid var(--m3-border);
  border-radius: 8px;
}

.slo-proxy-row {
  display: grid;
  grid-template-columns: minmax(180px, 1.5fr) 64px 76px minmax(130px, 1fr) 118px 72px 72px;
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--m3-border);
  font-size: 12px;
  color: var(--m3-text-main);
}

.slo-proxy-row:last-child {
  border-bottom: 0;
}

.slo-proxy-row.header {
  color: var(--m3-text-secondary);
  font-size: 11px;
  font-weight: 600;
  background: var(--m3-surface-variant);
}

.slo-resource-cell {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.slo-resource-cell strong,
.slo-resource-cell small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slo-resource-cell small {
  color: var(--m3-text-secondary);
  font-size: 11px;
}

.slo-result-pill {
  display: inline-flex;
  min-width: 52px;
  justify-content: center;
  padding: 3px 8px;
  border-radius: 999px;
  color: #166534;
  background: rgba(34, 197, 94, 0.12);
  font-size: 11px;
  font-weight: 600;
}

.slo-result-pill.warning {
  color: #92400e;
  background: rgba(245, 158, 11, 0.14);
}

.slo-result-pill.violated {
  color: #991b1b;
  background: rgba(239, 68, 68, 0.14);
}

/* Main grid */
.green-main-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 16px;
  margin-bottom: 16px;
}

.green-right-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Chart card */
.green-chart-card {
  background: var(--m3-surface);
  border: 1px solid var(--m3-border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.green-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 8px;
}

.green-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--m3-text-main);
}

.green-card-badge {
  font-size: 11px;
  color: var(--m3-text-secondary);
  background: var(--m3-surface-variant);
  padding: 2px 8px;
  border-radius: 5px;
  border: 1px solid var(--m3-border);
}

.green-card-sub {
  font-size: 11px;
  color: var(--m3-text-secondary);
}

/* Error budget (from ErrorBudget component styles) */
:deep(.green-error-budget-wrap) {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

:deep(.green-error-budget-legend) {
  display: flex;
  gap: 16px;
}

:deep(.green-error-budget-legend-item) {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

:deep(.green-error-budget-dot) {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

:deep(.green-error-budget-legend-label) {
  color: var(--m3-text-secondary);
}

:deep(.green-error-budget-legend-value) {
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  color: var(--m3-text-main);
}

:deep(.green-progress-bar) {
  height: 6px;
  background: var(--m3-border);
  border-radius: 3px;
  overflow: hidden;
}

:deep(.green-progress-fill) {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease;
}

/* Resource list */
.green-resource-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.green-resource-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.green-resource-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.green-resource-label {
  font-size: 12px;
  color: var(--m3-text-secondary);
}

.green-resource-value {
  font-size: 13px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}

.green-progress-bar {
  height: 6px;
  background: var(--m3-border);
  border-radius: 3px;
  overflow: hidden;
}

.green-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease;
}

/* Bottom card */
.green-bottom-card {
  background: var(--m3-surface);
  border: 1px solid var(--m3-border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

/* Service status table (from ServiceStatusTable component styles) */
:deep(.green-table) {
  width: 100%;
}

:deep(.green-table-header) {
  display: grid;
  grid-template-columns: 2fr 1fr 1.2fr 1fr 1fr 1fr;
  gap: 8px;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--m3-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--m3-border);
}

:deep(.green-table-row) {
  display: grid;
  grid-template-columns: 2fr 1fr 1.2fr 1fr 1fr 1fr;
  gap: 8px;
  padding: 10px 8px;
  font-size: 13px;
  border-bottom: 1px solid var(--m3-divider);
  align-items: center;
}

:deep(.green-table-row:last-child) {
  border-bottom: none;
}

:deep(.green-table-name) {
  font-weight: 500;
  color: var(--m3-text-main);
}

:deep(.green-table-status) {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
}

:deep(.green-status-dot) {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

:deep(.green-table-metric) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}

/* Energy stats */
.green-energy-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.green-stat-card {
  flex: 1;
  min-width: 110px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 14px;
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
  font-size: 16px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}

.green-stat-unit {
  font-size: 10px;
  color: var(--m3-text-hint);
}

/* Legend */
.green-chart-legend {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
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

/* SelectGroup */
:deep(.green-select-group) {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

:deep(.green-select-label) {
  font-size: 11px;
  font-weight: 600;
  color: var(--m3-text-secondary);
}

:deep(.green-select) {
  height: 34px;
  border: 1px solid var(--m3-border);
  border-radius: 8px;
  padding: 0 10px;
  background: var(--m3-surface);
  color: var(--m3-text-main);
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

:deep(.green-select:focus) {
  border-color: #0b57d0;
  box-shadow: 0 0 0 3px rgba(11, 87, 208, 0.12);
}


@media (max-width: 1024px) {
  .green-main-grid {
    grid-template-columns: 1fr;
  }
  .slo-status-panel {
    grid-template-columns: 1fr;
  }
  .slo-budget-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .slo-proxy-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  :deep(.green-slo-grid) {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .page-header { padding: 0 16px; }
  .page-content { padding: 16px; }
  .perf-filter-bar { padding: 12px 16px; }
  .slo-status-table {
    overflow-x: auto;
  }
  .slo-budget-table {
    overflow-x: auto;
  }
  .slo-proxy-table {
    overflow-x: auto;
  }
  .slo-status-row,
  .slo-budget-row,
  .slo-proxy-row {
    min-width: 720px;
  }
  .slo-budget-summary,
  .slo-proxy-summary {
    grid-template-columns: 1fr;
  }
}
</style>
