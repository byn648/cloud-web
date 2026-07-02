import type {
  SLOResponse,
  ErrorBudgetResponse,
  ResourceResponse,
  PowerStorageResponse,
  ServiceChainResponse,
  EnergyForecastResponse,
} from "@/api/green/types";

// ===================== Error Budget (for ErrorBudget component) =====================
export interface ErrorBudget {
  total: number
  consumed: number
  remaining: number
}

export function getErrorBudget(sloRate = 99.5): ErrorBudget {
  const windowHours = 30 * 24
  const allowedErrors = (100 - sloRate) * windowHours / 100
  const consumed = allowedErrors * (0.3 + Math.abs(Math.sin(1) * 0.4))
  return {
    total: Math.round(allowedErrors * 100) / 100,
    consumed: Math.round(consumed * 100) / 100,
    remaining: Math.round((allowedErrors - consumed) * 100) / 100,
  }
}

// ===================== SLO Services (for ServiceStatusTable) =====================
export interface SLOService {
  id: string
  name: string
  sloRate: number
  latency: number
  throughput: number
  errorRate: number
  status: 'healthy' | 'warning' | 'critical'
}

export function getSLOServices(): SLOService[] {
  return [
    { id: 'api', name: 'API 网关', sloRate: 99.5, latency: 48, throughput: 99.1, errorRate: 0.02, status: 'healthy' },
    { id: 'model', name: '模型推理', sloRate: 98.2, latency: 230, throughput: 97.8, errorRate: 0.15, status: 'warning' },
    { id: 'data', name: '数据处理', sloRate: 99.8, latency: 85, throughput: 99.5, errorRate: 0.01, status: 'healthy' },
    { id: 'storage', name: '存储服务', sloRate: 99.9, latency: 12, throughput: 99.9, errorRate: 0.00, status: 'healthy' },
  ]
}

// ===================== Control Recommendations =====================
export interface Recommendation {
  id: number
  type: 'scale' | 'schedule' | 'cache'
  priority: 'high' | 'medium' | 'low'
  title: string
  desc: string
  saving: string
}

export function getControlRecommendations(): Recommendation[] {
  return [
    {
      id: 1,
      type: 'scale',
      priority: 'high',
      title: 'GPU 资源扩容建议',
      desc: '模型推理服务 SLO 接近阈值，建议临时扩容 20% GPU 算力，预计可将时延降低 18ms。',
      saving: '约 2.3kW · 节省 ¥18/小时',
    },
    {
      id: 2,
      type: 'schedule',
      priority: 'medium',
      title: '训练任务调度优化',
      desc: '当前 14:00–18:00 为负荷高峰期，建议将非紧急训练任务迁移至 22:00–06:00 谷时执行。',
      saving: '峰谷差降低 15%，节省 ¥42/天',
    },
    {
      id: 3,
      type: 'cache',
      priority: 'low',
      title: '数据缓存命中率提升',
      desc: '数据处理服务缓存命中率偏低（67%），建议扩大热点数据集缓存规模至 2.5TB。',
      saving: '约 0.8kW · 节省 ¥6/小时',
    },
  ]
}

const now = () => Date.now();
const ago = (hours: number) => now() - hours * 3600 * 1000;

function randomWalk(base: number, range: number, count: number): number[] {
  const values: number[] = [];
  let current = base;
  for (let i = 0; i < count; i++) {
    current += (Math.random() - 0.5) * range;
    current = Math.max(base - range, Math.min(base + range, current));
    values.push(current);
  }
  return values;
}

function trendPoints(
  count: number,
  baseValue: number,
  range: number,
  intervalHours = 1
): { timestamp: number }[] {
  const values = randomWalk(baseValue, range, count);
  return values.map((v, i) => ({
    timestamp: ago((count - i) * intervalHours),
    value: v,
  }));
}

function sloTrendPoints(count: number) {
  const apiGwVals = randomWalk(99.5, 0.3, count);
  const modelVals = randomWalk(99.2, 0.4, count);
  const dataVals = randomWalk(99.7, 0.2, count);
  return apiGwVals.map((_, i) => ({
    timestamp: ago((count - i) * 1),
    apiGw: apiGwVals[i],
    modelInference: modelVals[i],
    dataProcess: dataVals[i],
  }));
}

export const MOCK_SLO: SLOResponse = {
  metrics: [
    { key: "availability", label: "可用性", value: 99.97, unit: "%", color: "#22c55e", target: 99.9, status: "normal", max: 100 },
    { key: "latency", label: "P99 时延", value: 45.2, unit: "ms", color: "#3b82f6", target: 100, status: "normal", max: 100 },
    { key: "errorRate", label: "错误率", value: 0.023, unit: "%", color: "#f59e0b", target: 0.05, status: "normal", max: 0.1 },
    { key: "throughput", label: "吞吐量", value: 2847, unit: "req/s", color: "#a855f7", target: 2000, status: "normal", max: 5000 },
  ],
  trend48h: sloTrendPoints(48),
  statusSummary: {
    status: "WARNING",
    currentRisk: 0.72,
    normalCount: 2,
    warningCount: 1,
    violatedCount: 0,
    totalCount: 3,
    lastUpdated: Date.now(),
  },
  serviceStatuses: [
    { clusterUuid: "demo", serviceId: "api-gw", serviceName: "API 网关", apiId: "/api/v1/orders", status: "NORMAL", violationRisk: 0.18, reason: "所有核心指标处于SLO阈值内", timestamp: Date.now(), qps: 2400, p95Latency: 62, p99Latency: 118, errorRate: 0.018, replicaCount: 4, cpuUtil: 42, gpuUtil: 0, nodePower: 6.8 },
    { clusterUuid: "demo", serviceId: "model-inference", serviceName: "模型推理", apiId: "/api/v1/infer", status: "WARNING", violationRisk: 0.72, reason: "P99时延接近阈值且GPU利用率偏高", timestamp: Date.now(), qps: 760, p95Latency: 290, p99Latency: 430, errorRate: 0.052, replicaCount: 3, cpuUtil: 68, gpuUtil: 84, nodePower: 10.6 },
    { clusterUuid: "demo", serviceId: "data-process", serviceName: "数据处理", apiId: "/api/v1/features", status: "NORMAL", violationRisk: 0.26, reason: "吞吐与错误率稳定", timestamp: Date.now(), qps: 1200, p95Latency: 95, p99Latency: 160, errorRate: 0.02, replicaCount: 3, cpuUtil: 51, gpuUtil: 20, nodePower: 7.2 },
  ],
  statusTrend48h: Array.from({ length: 48 }, (_, index) => ({
    timestamp: Date.now() - (47 - index) * 3600000,
    risk: Number((0.24 + Math.abs(Math.sin(index / 6)) * 0.36).toFixed(3)),
    normalCount: 2,
    warningCount: index % 9 === 0 ? 1 : 0,
    violatedCount: 0,
  })),
  budgetAllocation: {
    objectiveId: "checkout-flow",
    businessFlow: "下单流程",
    method: "risk_weighted",
    targetP99Latency: 1000,
    targetErrorRate: 0.1,
    allocatedLatency: 1000,
    allocatedErrorRate: 0.1,
    generatedAt: Date.now(),
    services: [
      { serviceId: "api-gw", serviceName: "API 网关", apiId: "/api/v1/orders", p99LatencyBudget: 180, errorRateBudget: 0.033, budgetRatio: 0.18, latencyContribution: 0.17, qps: 2400, qpsCv: 0.12, errorRate: 0.018, criticalPath: true, riskWeight: 1.18 },
      { serviceId: "model-inference", serviceName: "模型推理", apiId: "/api/v1/infer", p99LatencyBudget: 610, errorRateBudget: 0.024, budgetRatio: 0.61, latencyContribution: 0.61, qps: 760, qpsCv: 0.24, errorRate: 0.052, criticalPath: true, riskWeight: 1.52 },
      { serviceId: "data-process", serviceName: "数据处理", apiId: "/api/v1/features", p99LatencyBudget: 210, errorRateBudget: 0.043, budgetRatio: 0.21, latencyContribution: 0.22, qps: 1200, qpsCv: 0.13, errorRate: 0.02, criticalPath: false, riskWeight: 1.09 },
    ],
  },
  proxyPrediction: {
    modelName: "slo_proxy_heuristic",
    modelVersion: "v0.3_heuristic_baseline",
    generatedAt: Date.now(),
    predictions: [
      { objectiveId: "checkout-flow", businessFlow: "下单流程", serviceId: "api-gw", serviceName: "API 网关", apiId: "/api/v1/orders", forecastTime: Date.now() + 15 * 60000, horizonMinutes: 15, qpsForecast: 2530, requestMix: "critical-path", replicaCount: 4, cpuRequest: 3.98, gpuRequest: 0, memoryRequestGb: 8.98, predictedCpuUtil: 58.4, predictedGpuUtil: 0, p99LatencyBudget: 180, errorRateBudget: 0.033, predictedP95Latency: 76.2, predictedP99Latency: 135.4, violationProbability: 0.18, canMeetBudget: true, modelName: "slo_proxy_heuristic", modelVersion: "v0.3_heuristic_baseline" },
      { objectiveId: "checkout-flow", businessFlow: "下单流程", serviceId: "model-inference", serviceName: "模型推理", apiId: "/api/v1/infer", forecastTime: Date.now() + 30 * 60000, horizonMinutes: 30, qpsForecast: 865, requestMix: "critical-path", replicaCount: 3, cpuRequest: 1.36, gpuRequest: 1, memoryRequestGb: 17.7, predictedCpuUtil: 72.1, predictedGpuUtil: 86.8, p99LatencyBudget: 610, errorRateBudget: 0.024, predictedP95Latency: 338.7, predictedP99Latency: 513.5, violationProbability: 0.43, canMeetBudget: true, modelName: "slo_proxy_heuristic", modelVersion: "v0.3_heuristic_baseline" },
      { objectiveId: "checkout-flow", businessFlow: "下单流程", serviceId: "model-inference", serviceName: "模型推理", apiId: "/api/v1/infer", forecastTime: Date.now() + 60 * 60000, horizonMinutes: 60, qpsForecast: 925, requestMix: "critical-path", replicaCount: 4, cpuRequest: 1.45, gpuRequest: 2, memoryRequestGb: 29.81, predictedCpuUtil: 68.5, predictedGpuUtil: 72.4, p99LatencyBudget: 610, errorRateBudget: 0.024, predictedP95Latency: 356.4, predictedP99Latency: 552.8, violationProbability: 0.49, canMeetBudget: true, modelName: "slo_proxy_heuristic", modelVersion: "v0.3_heuristic_baseline" },
      { objectiveId: "checkout-flow", businessFlow: "下单流程", serviceId: "data-process", serviceName: "数据处理", apiId: "/api/v1/features", forecastTime: Date.now() + 30 * 60000, horizonMinutes: 30, qpsForecast: 1285, requestMix: "feature-batch", replicaCount: 3, cpuRequest: 1.84, gpuRequest: 0.25, memoryRequestGb: 9.3, predictedCpuUtil: 61.2, predictedGpuUtil: 22.5, p99LatencyBudget: 210, errorRateBudget: 0.043, predictedP95Latency: 112.9, predictedP99Latency: 188.3, violationProbability: 0.2, canMeetBudget: true, modelName: "slo_proxy_heuristic", modelVersion: "v0.3_heuristic_baseline" },
    ],
  },
  sloBudget: {
    totalBudgetPercent: 100,
    remainingPercent: 78.3,
    burnRate: 0.91,
    projectedExhaustDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: "healthy",
  },
};

export const MOCK_ERROR_BUDGET: ErrorBudgetResponse = {
  totalBudgetHours: 438.0,
  consumedHours: 95.2,
  remainingHours: 342.8,
  burnRate: 0.91,
  projectedExhaustDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  status: "healthy",
  dailyBurnRate: 3.18,
  weeklyTrend: Array.from({ length: 7 }, (_, i) => ({
    day: new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10),
    consumed: 3.1 + Math.random() * 0.5,
  })),
};

export const MOCK_RESOURCE: ResourceResponse = {
  items: [
    { label: "CPU 争用", value: 34, max: 100, unit: "%", color: "#0b57d0" },
    { label: "GPU 争用", value: 67, max: 100, unit: "%", color: "#a855f7" },
    { label: "内存使用", value: 78, max: 100, unit: "%", color: "#f59e0b" },
    { label: "网络带宽", value: 42, max: 100, unit: "%", color: "#3b82f6" },
  ],
  powerTrend48h: trendPoints(48, 12, 3).map((p) => ({
    timestamp: p.timestamp,
    computePower: p.value,
    storagePower: p.value * 0.4,
  })),
};

export const MOCK_POWER_STORAGE: PowerStorageResponse = {
  soc: 78,
  soh: 98,
  dischargePowerLimit: 50,
  chargePowerLimit: 40,
  availableCapacity: 312,
  backupRequired: 80,
  batteryTemp: 28,
  status: "balanced",
  currentMode: "balanced",
  trend48h: trendPoints(48, 50, 15).map((p, i) => ({
    timestamp: p.timestamp,
    computePower: p.value,
    storageStatus: 65 + Math.sin(i / 6) * 15,
    pvOutput: 8 + Math.random() * 4,
  })),
};

export const MOCK_SERVICE_CHAIN: ServiceChainResponse = {
  services: [
    { id: "svc-1", name: "API 网关", status: "healthy", sloRate: 99.97, latency: 12, throughput: 2847, errorRate: 0.023, cpuUsage: 28, memoryUsage: 42 },
    { id: "svc-2", name: "用户认证", status: "healthy", sloRate: 99.99, latency: 8, throughput: 1203, errorRate: 0.008, cpuUsage: 15, memoryUsage: 31 },
    { id: "svc-3", name: "模型推理", status: "warning", sloRate: 99.12, latency: 156, throughput: 342, errorRate: 0.052, cpuUsage: 78, memoryUsage: 65 },
    { id: "svc-4", name: "数据处理", status: "healthy", sloRate: 99.85, latency: 45, throughput: 892, errorRate: 0.031, cpuUsage: 54, memoryUsage: 58 },
    { id: "svc-5", name: "任务调度", status: "healthy", sloRate: 99.78, latency: 23, throughput: 456, errorRate: 0.018, cpuUsage: 22, memoryUsage: 35 },
    { id: "svc-6", name: "日志收集", status: "healthy", sloRate: 99.91, latency: 18, throughput: 3201, errorRate: 0.012, cpuUsage: 19, memoryUsage: 28 },
  ],
};

function makeEnergyPoint(ts: number, basePower: number, isForecast = false) {
  const power = basePower + (Math.random() - 0.5) * 4;
  const band = 3;
  return {
    timestamp: ts,
    cpuUsage: 30 + Math.random() * 30,
    gpuUsage: 50 + Math.random() * 30,
    memoryUsage: 40 + Math.random() * 30,
    nodePower: Math.max(0, power),
    upper: Math.max(0, power + band),
    lower: Math.max(0, power - band),
    isForecast,
  };
}

export const MOCK_ENERGY_FORECAST: EnergyForecastResponse = {
  history: Array.from({ length: 48 }, (_, i) =>
    makeEnergyPoint(ago((48 - i) * 0.5), 15 + Math.sin(i / 8) * 5, false)
  ),
  forecast: Array.from({ length: 24 }, (_, i) =>
    makeEnergyPoint(ago(-(i + 1) * 0.5), 15 + Math.sin((48 + i) / 8) * 5, true)
  ),
  totalEnergy: 385.4,
  carbonEmission: 142.8,
  avgCpu: 52.3,
  avgGpu: 68.7,
  avgPower: 16.1,
  collectionStatus: "success",
  lastCollectedAt: new Date().toISOString(),
  confidenceLevel: 0.95,
};
