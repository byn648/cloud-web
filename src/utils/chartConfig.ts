// ===================== Forecast Config =====================
export const FORECAST_CATEGORIES = [
  { value: 'all', label: '全部类别' },
  { value: 'cpu', label: 'CPU 利用率' },
  { value: 'gpu', label: 'GPU 利用率' },
  { value: 'memory', label: '内存使用' },
  { value: 'network', label: '网络带宽' },
  { value: 'energy', label: '能耗' },
]

export const TIME_RANGES = [
  { value: '1d', label: '最近 1 天' },
  { value: '7d', label: '最近 7 天' },
  { value: '30d', label: '最近 30 天' },
  { value: '90d', label: '最近 90 天' },
]

export const FORECAST_SERVERS = [
  { value: 'all', label: '全部服务器' },
  { value: 'node-01', label: '计算节点-01' },
  { value: 'node-02', label: '计算节点-02' },
  { value: 'node-03', label: '计算节点-03' },
  { value: 'gpu-01', label: 'GPU 服务器-01' },
  { value: 'gpu-02', label: 'GPU 服务器-02' },
]

export const FORECAST_SERVICES = [
  { value: 'all', label: '全部服务' },
  { value: 'api-gateway', label: 'API 网关' },
  { value: 'inference', label: '模型推理服务' },
  { value: 'data-pipeline', label: '数据处理管道' },
  { value: 'scheduler', label: '任务调度器' },
]

export const FORECAST_INSTANCES = [
  { value: 'all', label: '全部实例' },
  { value: 'ins-001', label: 'API 实例-001' },
  { value: 'ins-002', label: '推理实例-002' },
  { value: 'ins-003', label: '数据实例-003' },
]

export const FORECAST_MODELS = [
  { value: 'lightgbm', label: 'LightGBM' },
  { value: 'patchtst', label: 'PatchTST' },
  { value: 'itransformer', label: 'iTransformer' },
  { value: 'heterostgnn', label: 'Hetero-STGNN' },
]

export const MODEL_TYPES = [
  { value: 'arima', label: 'ARIMA' },
  { value: 'lstm', label: 'LSTM' },
  { value: 'prophet', label: 'Prophet' },
  { value: 'exponential', label: '指数平滑' },
]

export const CONFIDENCE_LEVELS = [
  { value: 0.80, label: '80%' },
  { value: 0.90, label: '90%' },
  { value: 0.95, label: '95%' },
  { value: 0.99, label: '99%' },
]

export const FORECAST_HORIZONS = [
  { value: 12, label: '12 小时' },
  { value: 24, label: '24 小时' },
  { value: 48, label: '48 小时' },
  { value: 72, label: '72 小时' },
  { value: 168, label: '7 天' },
]

export const DATA_SOURCES = [
  { value: 'realtime', label: '实时流' },
  { value: 'historical', label: '历史数据' },
]

export const REFRESH_INTERVALS = [
  { value: 5, label: '5 秒' },
  { value: 15, label: '15 秒' },
  { value: 30, label: '30 秒' },
  { value: 60, label: '1 分钟' },
  { value: 300, label: '5 分钟' },
]

// ===================== SLO/Performance Config =====================
export const SLO_SERVERS = [
  { value: 'all', label: '全部服务器' },
  { value: 'node-01', label: '计算节点-01' },
  { value: 'node-02', label: '计算节点-02' },
  { value: 'node-03', label: '计算节点-03' },
  { value: 'gpu-01', label: 'GPU 服务器-01' },
  { value: 'gpu-02', label: 'GPU 服务器-02' },
]

export const SLO_SERVICES = [
  { value: 'all', label: '全部服务' },
  { value: 'api-gateway', label: 'API 网关' },
  { value: 'inference', label: '模型推理服务' },
  { value: 'data-pipeline', label: '数据处理管道' },
  { value: 'scheduler', label: '任务调度器' },
]

export const SLO_INSTANCES = [
  { value: 'all', label: '全部实例' },
  { value: 'ins-001', label: 'API 实例-001' },
  { value: 'ins-002', label: '推理实例-002' },
  { value: 'ins-003', label: '数据实例-003' },
]

// ===================== Chart Colors =====================
export const CHART_COLORS = {
  primary: '#0b57d0',
  secondary: '#3b82f6',
  tertiary: '#a855f7',
  warning: '#f59e0b',
  danger: '#ef4444',
  success: '#22c55e',
  grid: 'rgba(0, 0, 0, 0.05)',
  axisLabel: '#6b7280',
  tooltip: {
    background: '#ffffff',
    border: '#e5e7eb',
  },
}

// Dark mode chart colors
export const CHART_COLORS_DARK = {
  primary: '#a8c7fa',
  secondary: '#93c5fd',
  tertiary: '#d8b4fe',
  warning: '#fcd34d',
  danger: '#fca5a5',
  success: '#86efac',
  grid: 'rgba(255, 255, 255, 0.06)',
  axisLabel: '#94a3b8',
  tooltip: {
    background: '#1e293b',
    border: 'rgba(255,255,255,0.08)',
  },
}
