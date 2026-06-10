export interface ModelMetricItem {
  cpu_util: number | null;
  gpu_util: number | null;
  gpu_mem_util: number | null;
  node_power: number | null;
}

export interface ModelPredictionItem {
  horizon: number;
  forecast_time: string;
  metrics: ModelMetricItem;
  quantiles?: Record<string, ModelMetricItem>;
  confidence_interval?: {
    lower: ModelMetricItem;
    upper: ModelMetricItem;
  };
  overload_risk?: Record<string, number | null>;
  slo_violation_risk?: number | null;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ModelNodeResult {
  node_uuid: string;
  predictions?: ModelPredictionItem[];
  error?: string;
}

export interface ModelPredictResponse {
  cluster_uuid: string;
  horizons: number[];
  model_name: string;
  model_version: string;
  results: ModelNodeResult[];
}

export interface ModelHistoryPoint {
  time: string;
  cpu_util: number | null;
  gpu_util: number | null;
  gpu_mem_util: number | null;
  node_power: number | null;
}

export interface ModelHistoryResponse {
  node_uuid: string;
  cluster_uuid: string;
  start_time: string;
  end_time: string;
  metrics: ModelHistoryPoint[];
}

export interface ModelMetadataMetrics {
  mae: number | null;
  rmse: number | null;
  mape: number | null;
  r2: number | null;
}

export interface ModelMetadataResponse {
  model_version: string;
  created_at: string;
  horizons: number[];
  target_columns: string[];
  metrics: Record<string, ModelMetadataMetrics>;
  warnings: string[];
}
