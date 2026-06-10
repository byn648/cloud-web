const GREEN_BASE = "/green/v1";

interface QueryParams {
  nodeUuid?: string;
  clusterUuid?: string;
  [key: string]: string | number | undefined;
}

const parse = async <T>(res: Response): Promise<T> => {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
};

const buildQuery = (params: QueryParams): string => {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined)
  );
  const qs = new URLSearchParams(filtered as Record<string, string>).toString();
  return qs ? `?${qs}` : '';
};

export const forecastApi = {
  /** 预测分析 */
  getForecast(params: Record<string, string | number | undefined> = {}) {
    const qs = buildQuery(params as QueryParams);
    return fetch(`${GREEN_BASE}/forecast${qs}`).then(parse);
  },
  /** 能耗预测 */
  getEnergyForecast(params: {
    hours?: number;
    confidenceLevel?: number;
    taskType?: string;
    model?: string;
    nodeUuid?: string;
    clusterUuid?: string;
  } = {}) {
    const qs = buildQuery(params as QueryParams);
    return fetch(`${GREEN_BASE}/forecast/energy${qs}`).then(parse);
  },
  /** 手动触发采集 */
  triggerCollect() {
    return fetch(`${GREEN_BASE}/forecast/collect`, { method: "POST" }).then(parse);
  }
};

export const performanceApi = {
  getSLO(params: QueryParams = {}) {
    const qs = buildQuery(params);
    return fetch(`${GREEN_BASE}/performance/slo${qs}`).then(parse);
  },
  getErrorBudget(params: QueryParams = {}) {
    const qs = buildQuery(params);
    return fetch(`${GREEN_BASE}/performance/error-budget${qs}`).then(parse);
  },
  getResource(params: QueryParams = {}) {
    const qs = buildQuery(params);
    return fetch(`${GREEN_BASE}/performance/resource${qs}`).then(parse);
  },
  getPowerStorage(params: QueryParams = {}) {
    const qs = buildQuery(params);
    return fetch(`${GREEN_BASE}/performance/power-storage${qs}`).then(parse);
  },
  getServiceChain(params: QueryParams = {}) {
    const qs = buildQuery(params);
    return fetch(`${GREEN_BASE}/performance/service-chain${qs}`).then(parse);
  }
};

export const modelPredictApi = {
  predict(body: { cluster_uuid: string; node_uuids: string[]; horizons: number[]; model_name?: string }) {
    return fetch(`${GREEN_BASE}/model/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(parse);
  },
  getHistory(params: { cluster_uuid: string; node_uuid: string; start_time?: string; end_time?: string }) {
    const qs = buildQuery(params as QueryParams);
    return fetch(`${GREEN_BASE}/model/history${qs}`).then(parse);
  },
  getMetadata() {
    return fetch(`${GREEN_BASE}/model/metadata`).then(parse);
  },
};
