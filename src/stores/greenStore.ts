import { reactive } from 'vue'

// ===================== Forecast Store =====================
const forecastStoreState = reactive({
  forecastCategory: 'all',
  timeRange: '30d',
  filterServer: 'all',
  filterService: 'all',
  filterInstance: 'all',
  forecastModel: 'lightgbm',
  setForecastCategory(v: string) { this.forecastCategory = v },
  setTimeRange(v: string) { this.timeRange = v },
  setFilterServer(v: string) { this.filterServer = v },
  setFilterService(v: string) { this.filterService = v },
  setFilterInstance(v: string) { this.filterInstance = v },
  setForecastModel(v: string) { this.forecastModel = v },

  confidenceLevel: 0.95,
  forecastHorizon: 48,
  smoothingFactor: 0.3,
  setConfidenceLevel(v: number) { this.confidenceLevel = v },
  setForecastHorizon(v: number) { this.forecastHorizon = v },
  setSmoothingFactor(v: number) { this.smoothingFactor = v },

  dataSource: 'realtime',
  refreshInterval: 5,
  setDataSource(v: string) { this.dataSource = v },
  setRefreshInterval(v: number) { this.refreshInterval = v },
})

export function useForecastStore() {
  return forecastStoreState
}

// ===================== SLO Page Store =====================
const sloPageStoreState = reactive({
  sloService: 'all',
  sloServer: 'all',
  sloInstance: 'all',
  setSLOService(v: string) { this.sloService = v },
  setSLOServer(v: string) { this.sloServer = v },
  setSLOInstance(v: string) { this.sloInstance = v },
})

export function useSLOPageStore() {
  return sloPageStoreState
}

// ===================== Dashboard Store =====================
const dashboardStoreState = reactive({
  refreshKey: 0,
  incrementRefresh() { this.refreshKey++ },
})

export function useDashboardStore() {
  return dashboardStoreState
}

// ===================== Green API Store (loading/error state) =====================
const greenApiStoreState = reactive({
  forecastLoading: false,
  forecastError: '' as string,
  sloLoading: false,
  sloError: '' as string,
  errorBudgetLoading: false,
  errorBudgetError: '' as string,
  resourceLoading: false,
  resourceError: '' as string,
  powerStorageLoading: false,
  powerStorageError: '' as string,
  serviceChainLoading: false,
  serviceChainError: '' as string,
  modelPredictLoading: false,
  modelPredictError: '' as string,
})

export function useGreenApiStore() {
  return greenApiStoreState
}

// ===================== Model Predict Store =====================
const modelPredictStoreState = reactive({
  selectedNodeUuid: '' as string,
  selectedNodeName: '' as string,
  selectedClusterUuid: '' as string,
  selectedHorizons: [15, 30, 60] as number[],
  setSelectedNode(uuid: string, name: string, clusterUuid: string) {
    this.selectedNodeUuid = uuid
    this.selectedNodeName = name
    this.selectedClusterUuid = clusterUuid
  },
  setSelectedHorizons(horizons: number[]) {
    this.selectedHorizons = horizons
  },
})

export function useModelPredictStore() {
  return modelPredictStoreState
}
