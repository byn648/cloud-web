// ===================== Forecast Types =====================

export interface EnergyDataPoint {
  timestamp: number;
  cpuUsage: number;
  gpuUsage: number;
  memoryUsage: number;
  nodePower: number;
  upper: number;
  lower: number;
  isForecast: boolean;
}

export interface HistoryDataPoint {
  timestamp: number;
  cpuUsage: number;
  gpuUsage: number;
  gpuMemoryUsage: number;
  memoryUsage: number;
  ioRead: number;
  ioWrite: number;
  networkRx: number;
  networkTx: number;
  nodePower: number;
  upsPower: number;
  serviceEnergy: number;
  taskType: string;
  batchSize: number;
  concurrency: number;
  requestRate: number;
  resourceRequests: { cpu: string; memory: string };
  replicaCount: number;
  schedulePolicy: string;
}

export interface ResourceRequests {
  cpu: string;
  memory: string;
}

export interface ForecastDataPoint {
  timestamp: number;
  cpuUsage: number;
  gpuUsage: number;
  gpuMemoryUsage: number;
  memoryUsage: number;
  nodePower: number;
  upper: number;
  lower: number;
}

export interface InfluenceFactor {
  name: string;
  value: number;
  trend: number;
}

export interface ForecastResponse {
  history: HistoryDataPoint[];
  forecast: ForecastDataPoint[];
  influenceFactors: InfluenceFactor[];
}

export interface EnergyForecastResponse {
  history: EnergyDataPoint[];
  forecast: EnergyDataPoint[];
  totalEnergy: number;
  carbonEmission: number;
  avgCpu: number;
  avgGpu: number;
  avgPower: number;
  collectionStatus: string;
  lastCollectedAt: string;
  confidenceLevel: number;
}

export interface CollectResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

// ===================== Performance Types =====================

export interface SLOMetric {
  key: string;
  label: string;
  value: number;
  unit: string;
  color: string;
  target: number;
  status: string;
  max: number;
}

export interface SLOTimePoint {
  timestamp: number;
  apiGw: number;
  modelInference: number;
  dataProcess: number;
}

export interface SLOBudget {
  totalBudgetPercent: number;
  remainingPercent: number;
  burnRate: number;
  projectedExhaustDate: string;
  status: string;
}

export interface SLOStatusSummary {
  status: 'NORMAL' | 'WARNING' | 'VIOLATED' | string;
  currentRisk: number;
  normalCount: number;
  warningCount: number;
  violatedCount: number;
  totalCount: number;
  lastUpdated: number;
}

export interface SLOServiceStatus {
  clusterUuid: string;
  serviceId: string;
  serviceName: string;
  apiId: string;
  status: 'NORMAL' | 'WARNING' | 'VIOLATED' | string;
  violationRisk: number;
  reason: string;
  timestamp: number;
  qps: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  replicaCount: number;
  cpuUtil: number;
  gpuUtil: number;
  nodePower: number;
}

export interface SLOStatusTrendPoint {
  timestamp: number;
  risk: number;
  normalCount: number;
  warningCount: number;
  violatedCount: number;
}

export interface SLOServiceBudget {
  serviceId: string;
  serviceName: string;
  apiId: string;
  p99LatencyBudget: number;
  errorRateBudget: number;
  budgetRatio: number;
  latencyContribution: number;
  qps: number;
  qpsCv: number;
  errorRate: number;
  criticalPath: boolean;
  riskWeight: number;
}

export interface SLOBudgetAllocation {
  objectiveId: string;
  businessFlow: string;
  method: string;
  targetP99Latency: number;
  targetErrorRate: number;
  allocatedLatency: number;
  allocatedErrorRate: number;
  generatedAt: number;
  services: SLOServiceBudget[];
}

export interface SLOProxyPrediction {
  objectiveId: string;
  businessFlow: string;
  serviceId: string;
  serviceName: string;
  apiId: string;
  forecastTime: number;
  horizonMinutes: number;
  qpsForecast: number;
  requestMix: string;
  replicaCount: number;
  cpuRequest: number;
  gpuRequest: number;
  memoryRequestGb: number;
  predictedCpuUtil: number;
  predictedGpuUtil: number;
  p99LatencyBudget: number;
  errorRateBudget: number;
  predictedP95Latency: number;
  predictedP99Latency: number;
  violationProbability: number;
  canMeetBudget: boolean;
  modelName: string;
  modelVersion: string;
}

export interface SLOProxyResponse {
  modelName: string;
  modelVersion: string;
  generatedAt: number;
  predictions: SLOProxyPrediction[];
}

export interface SLOResponse {
  metrics: SLOMetric[];
  trend48h: SLOTimePoint[];
  sloBudget: SLOBudget;
  statusSummary?: SLOStatusSummary;
  serviceStatuses?: SLOServiceStatus[];
  statusTrend48h?: SLOStatusTrendPoint[];
  budgetAllocation?: SLOBudgetAllocation;
  proxyPrediction?: SLOProxyResponse;
}

export interface DailyBurnRate {
  day: string;
  consumed: number;
}

export interface ErrorBudgetResponse {
  totalBudgetHours: number;
  consumedHours: number;
  remainingHours: number;
  burnRate: number;
  projectedExhaustDate: string;
  status: string;
  dailyBurnRate: number;
  weeklyTrend: DailyBurnRate[];
}

export interface ResourceItem {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
}

export interface PowerTrendPoint {
  timestamp: number;
  computePower: number;
  storagePower: number;
}

export interface ResourceResponse {
  items: ResourceItem[];
  powerTrend48h: PowerTrendPoint[];
}

export interface StorageTrendPoint {
  timestamp: number;
  computePower: number;
  storageStatus: number;
  pvOutput: number;
}

export interface PowerStorageResponse {
  soc: number;
  soh: number;
  dischargePowerLimit: number;
  chargePowerLimit: number;
  availableCapacity: number;
  backupRequired: number;
  batteryTemp: number;
  status: string;
  currentMode: string;
  trend48h: StorageTrendPoint[];
}

export interface ServiceNode {
  id: string;
  name: string;
  status: string;
  sloRate: number;
  latency: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
}

export interface ServiceChainResponse {
  services: ServiceNode[];
}
