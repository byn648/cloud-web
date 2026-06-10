import { buildQuery, parseNumber, parseString, requestJson } from "../shared";

const CLUSTER_MONITOR_BASE_PATH = "/console/v1/cluster-monitor";
const NODE_MONITOR_BASE_PATH = "/console/v1/node-monitor";

export interface ClusterOverviewMetrics {
  clusterUuid: string;
  timestamp: number;
  nodeTotal: number;
  nodeReady: number;
  podRunning: number;
  podCapacity: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
}

export interface ClusterCPUResource {
  capacity: number;
  allocatable: number;
  requestsAllocated: number;
  limitsAllocated: number;
  usage: number;
  requestsPercent: number;
  usagePercent: number;
}

export interface ClusterMemoryResource {
  capacityBytes: number;
  allocatableBytes: number;
  requestsAllocatedBytes: number;
  limitsAllocatedBytes: number;
  usageBytes: number;
  requestsPercent: number;
  usagePercent: number;
}

export interface ClusterPodsResource {
  running: number;
  capacity: number;
  usagePercent: number;
}

export interface ClusterStorageResource {
  capacityBytes: number;
  allocatableBytes: number;
  requestsAllocatedBytes: number;
  limitsAllocatedBytes: number;
  usageBytes: number;
  requestsPercent: number;
  usagePercent: number;
}

export interface ClusterGPUResource {
  capacity: number;
  allocatable: number;
  requestsAllocated: number;
  limitsAllocated: number;
  usage: number;
  requestsPercent: number;
  usagePercent: number;
}

export interface ClusterResourcesMetrics {
  clusterUuid: string;
  timestamp: number;
  cpu: ClusterCPUResource;
  memory: ClusterMemoryResource;
  storage: ClusterStorageResource;
  gpu: ClusterGPUResource;
  pods: ClusterPodsResource;
}

export interface NodeMetricItem {
  nodeName: string;
  internalIp: string;
  instance: string;
  ready: boolean;
  cpuUsage: number;
  memoryUsage: number;
}

export interface ListNodesMetricsResponse {
  items: NodeMetricItem[];
  total: number;
}

export interface NodePodBrief {
  namespace: string;
  podName: string;
  phase: string;
  cpuUsage: number;
  memoryUsage: number;
  restartCount: number;
  podCurrentPowerWatts: number;
  podEnergyDeltaJoules: number;
}

export interface NodePodsMetrics {
  nodeName: string;
  totalPods: number;
  runningPods: number;
  pendingPods: number;
  failedPods: number;
  podList: NodePodBrief[];
}

export interface NodeMicroserviceAnomalyQueryParams {
  clusterUuid?: string;
  nodeName?: string;
  start?: string;
  end?: string;
  limit?: number;
  minPowerWatts?: number;
}

export interface MicroserviceAnomalySummary {
  totalEvents: number;
  highRiskServices: number;
  relatedClusters: number;
  extraPowerKwh: number;
}

export interface MicroserviceAnomalyItem {
  id: string;
  clusterUuid: string;
  clusterName: string;
  nodeName: string;
  namespace: string;
  service: string;
  workload: string;
  anomalyType: string;
  reason: string;
  severity: string;
  currentPowerWatts: number;
  baselinePowerWatts: number;
  extraPowerKwh: number;
  deltaPercent: number;
  detectedAt: number;
}

export interface NodeMicroserviceAnomaly {
  summary: MicroserviceAnomalySummary;
  items: MicroserviceAnomalyItem[];
  warnings: string[];
}

export interface NodeCPUCurrent {
  timestamp: number;
  totalCores: number;
  usagePercent: number;
  userPercent: number;
  systemPercent: number;
}

export interface NodeCPUTrendPoint {
  timestamp: number;
  usagePercent: number;
}

export interface NodeCPUMetrics {
  nodeName: string;
  current: NodeCPUCurrent;
  trend: NodeCPUTrendPoint[];
}

export interface BaseClusterQueryParams {
  clusterUuid: string;
}

export interface BaseNodeQueryParams extends BaseClusterQueryParams {
  nodeName: string;
  start?: string;
  end?: string;
  step?: string;
}

export interface ScopedClusterEnergyOverviewQueryParams {
  start?: string;
  end?: string;
  step?: string;
}

export interface ClusterEnergyScopeSummary {
  clusterCount: number;
  durationSeconds: number;
  podCurrentPowerWatts: number;
  podEnergyDeltaJoules: number;
  nodeCurrentPowerWatts: number;
  nodeEnergyDeltaJoules: number;
}

export interface ClusterEnergyScopeItem {
  clusterUuid: string;
  clusterName: string;
  environment: string;
  durationSeconds: number;
  podCurrentPowerWatts: number;
  podEnergyDeltaJoules: number;
  nodeCurrentPowerWatts: number;
  nodeEnergyDeltaJoules: number;
  nodeMetric: string;
  error?: string;
}

export interface ScopedClusterEnergyOverview {
  summary: ClusterEnergyScopeSummary;
  items: ClusterEnergyScopeItem[];
}

interface BackendScopedClusterEnergyOverview {
  summary?: {
    clusterCount?: unknown;
    durationSeconds?: unknown;
    podCurrentPowerWatts?: unknown;
    podEnergyDeltaJoules?: unknown;
    nodeCurrentPowerWatts?: unknown;
    nodeEnergyDeltaJoules?: unknown;
  };
  items?: Array<{
    clusterUuid?: unknown;
    clusterName?: unknown;
    environment?: unknown;
    durationSeconds?: unknown;
    podCurrentPowerWatts?: unknown;
    podEnergyDeltaJoules?: unknown;
    nodeCurrentPowerWatts?: unknown;
    nodeEnergyDeltaJoules?: unknown;
    nodeMetric?: unknown;
    error?: unknown;
  }>;
}

interface BackendScopedClusterEnergyOverviewEnvelope {
  data?: BackendScopedClusterEnergyOverview;
}

interface BackendClusterOverview {
  timestamp?: unknown;
  resources?: {
    cpu?: { usagePercent?: unknown };
    memory?: { usagePercent?: unknown };
    pods?: { running?: unknown; capacity?: unknown };
  };
  nodes?: { total?: unknown; ready?: unknown };
}

interface BackendClusterResources {
  cpu?: {
    capacity?: unknown;
    allocatable?: unknown;
    requestsAllocated?: unknown;
    limitsAllocated?: unknown;
    usage?: unknown;
    requestsPercent?: unknown;
    usagePercent?: unknown;
  };
  memory?: {
    capacity?: unknown;
    allocatable?: unknown;
    requestsAllocated?: unknown;
    limitsAllocated?: unknown;
    usage?: unknown;
    requestsPercent?: unknown;
    usagePercent?: unknown;
  };
  pods?: {
    running?: unknown;
    capacity?: unknown;
    usagePercent?: unknown;
  };
  storage?: {
    totalCapacityBytes?: unknown;
    allocatedBytes?: unknown;
    allocationPercent?: unknown;
  };
}

interface BackendNodeMetrics {
  nodeName?: unknown;
  cpu?: {
    current?: {
      usagePercent?: unknown;
      userPercent?: unknown;
      systemPercent?: unknown;
      totalCores?: unknown;
      timestamp?: unknown;
    };
    trend?: Array<{
      timestamp?: unknown;
      usagePercent?: unknown;
    }>;
  };
  memory?: {
    current?: {
      usagePercent?: unknown;
    };
  };
  k8sStatus?: {
    conditions?: Array<{
      type?: unknown;
      status?: unknown;
    }>;
  };
}

interface BackendNodePodsMetrics {
  nodeName?: unknown;
  totalPods?: unknown;
  runningPods?: unknown;
  pendingPods?: unknown;
  failedPods?: unknown;
  podList?: Array<{
    namespace?: unknown;
    podName?: unknown;
    phase?: unknown;
    cpuUsage?: unknown;
    memoryUsage?: unknown;
    restartCount?: unknown;
    podCurrentPowerWatts?: unknown;
    podEnergyDeltaJoules?: unknown;
  }>;
}

interface BackendNodePodsEnvelope {
  data?: BackendNodePodsMetrics;
}

interface BackendNodeMicroserviceAnomalyItem {
  id?: unknown;
  clusterUuid?: unknown;
  clusterName?: unknown;
  nodeName?: unknown;
  namespace?: unknown;
  service?: unknown;
  workload?: unknown;
  anomalyType?: unknown;
  reason?: unknown;
  severity?: unknown;
  currentPowerWatts?: unknown;
  baselinePowerWatts?: unknown;
  extraPowerKwh?: unknown;
  deltaPercent?: unknown;
  detectedAt?: unknown;
}

interface BackendNodeMicroserviceAnomaly {
  summary?: {
    totalEvents?: unknown;
    highRiskServices?: unknown;
    relatedClusters?: unknown;
    extraPowerKwh?: unknown;
  };
  items?: BackendNodeMicroserviceAnomalyItem[];
  warnings?: unknown[];
}

interface BackendNodeMicroserviceAnomalyEnvelope {
  data?: BackendNodeMicroserviceAnomaly;
}

function parseConditionStatus(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }

  return false;
}

function isNodeReady(conditions?: Array<Record<string, unknown>>): boolean {
  if (!Array.isArray(conditions)) {
    return false;
  }

  return conditions.some((condition) => {
    return parseString(condition.type).toLowerCase() === "ready" && parseConditionStatus(condition.status);
  });
}

export async function getClusterOverviewApi(params: BaseClusterQueryParams): Promise<ClusterOverviewMetrics> {
  const query = buildQuery({ clusterUuid: params.clusterUuid });
  const data = await requestJson<BackendClusterOverview>(`${CLUSTER_MONITOR_BASE_PATH}/overview${query}`, {
    method: "GET",
    unwrapData: true
  });

  return {
    clusterUuid: params.clusterUuid,
    timestamp: parseNumber(data.timestamp),
    nodeTotal: parseNumber(data.nodes?.total),
    nodeReady: parseNumber(data.nodes?.ready),
    podRunning: parseNumber(data.resources?.pods?.running),
    podCapacity: parseNumber(data.resources?.pods?.capacity),
    cpuUsagePercent: parseNumber(data.resources?.cpu?.usagePercent),
    memoryUsagePercent: parseNumber(data.resources?.memory?.usagePercent)
  };
}

export async function getClusterResourcesApi(params: BaseClusterQueryParams): Promise<ClusterResourcesMetrics> {
  const query = buildQuery({ clusterUuid: params.clusterUuid });
  const data = await requestJson<BackendClusterResources>(`${CLUSTER_MONITOR_BASE_PATH}/resources${query}`, {
    method: "GET",
    unwrapData: true
  });

  const storageCapacityBytes = parseNumber(data.storage?.totalCapacityBytes);
  const storageAllocatedBytes = parseNumber(data.storage?.allocatedBytes);
  const storageAllocationPercent = parseNumber(data.storage?.allocationPercent);

  return {
    clusterUuid: params.clusterUuid,
    timestamp: Date.now(),
    cpu: {
      capacity: parseNumber(data.cpu?.capacity),
      allocatable: parseNumber(data.cpu?.allocatable),
      requestsAllocated: parseNumber(data.cpu?.requestsAllocated),
      limitsAllocated: parseNumber(data.cpu?.limitsAllocated),
      usage: parseNumber(data.cpu?.usage),
      requestsPercent: parseNumber(data.cpu?.requestsPercent),
      usagePercent: parseNumber(data.cpu?.usagePercent)
    },
    memory: {
      capacityBytes: parseNumber(data.memory?.capacity),
      allocatableBytes: parseNumber(data.memory?.allocatable),
      requestsAllocatedBytes: parseNumber(data.memory?.requestsAllocated),
      limitsAllocatedBytes: parseNumber(data.memory?.limitsAllocated),
      usageBytes: parseNumber(data.memory?.usage),
      requestsPercent: parseNumber(data.memory?.requestsPercent),
      usagePercent: parseNumber(data.memory?.usagePercent)
    },
    storage: {
      capacityBytes: storageCapacityBytes,
      allocatableBytes: storageCapacityBytes,
      requestsAllocatedBytes: storageAllocatedBytes,
      limitsAllocatedBytes: storageAllocatedBytes,
      usageBytes: storageAllocatedBytes,
      requestsPercent: storageAllocationPercent,
      usagePercent: storageAllocationPercent
    },
    gpu: {
      capacity: 0,
      allocatable: 0,
      requestsAllocated: 0,
      limitsAllocated: 0,
      usage: 0,
      requestsPercent: 0,
      usagePercent: 0
    },
    pods: {
      running: parseNumber(data.pods?.running),
      capacity: parseNumber(data.pods?.capacity),
      usagePercent: parseNumber(data.pods?.usagePercent)
    }
  };
}

export async function listNodesMetricsApi(params: BaseClusterQueryParams): Promise<ListNodesMetricsResponse> {
  const query = buildQuery({ clusterUuid: params.clusterUuid });
  const data = await requestJson<BackendNodeMetrics[]>(`${NODE_MONITOR_BASE_PATH}/list${query}`, {
    method: "GET",
    unwrapData: true
  });

  const items = Array.isArray(data)
    ? data.map((item) => ({
        nodeName: parseString(item.nodeName),
        internalIp: "",
        instance: "",
        ready: isNodeReady(item.k8sStatus?.conditions as Array<Record<string, unknown>> | undefined),
        cpuUsage: parseNumber(item.cpu?.current?.usagePercent),
        memoryUsage: parseNumber(item.memory?.current?.usagePercent)
      }))
    : [];

  return {
    items,
    total: items.length
  };
}

export async function getNodePodsApi(params: BaseNodeQueryParams): Promise<NodePodsMetrics> {
  const query = buildQuery({
    clusterUuid: params.clusterUuid,
    nodeName: params.nodeName,
    start: params.start,
    end: params.end
  });

  const raw = await requestJson<BackendNodePodsMetrics | BackendNodePodsEnvelope>(
    `${NODE_MONITOR_BASE_PATH}/pods${query}`,
    {
      method: "GET",
      unwrapData: true
    }
  );

  const data =
    raw &&
    typeof raw === "object" &&
    "data" in raw &&
    raw.data &&
    typeof raw.data === "object"
      ? (raw.data as BackendNodePodsMetrics)
      : (raw as BackendNodePodsMetrics);

  return {
    nodeName: parseString(data.nodeName),
    totalPods: parseNumber(data.totalPods),
    runningPods: parseNumber(data.runningPods),
    pendingPods: parseNumber(data.pendingPods),
    failedPods: parseNumber(data.failedPods),
    podList: Array.isArray(data.podList)
      ? data.podList.map((item) => ({
          namespace: parseString(item.namespace),
          podName: parseString(item.podName),
          phase: parseString(item.phase),
          cpuUsage: parseNumber(item.cpuUsage),
          memoryUsage: parseNumber(item.memoryUsage),
          restartCount: parseNumber(item.restartCount),
          podCurrentPowerWatts: parseNumber(item.podCurrentPowerWatts),
          podEnergyDeltaJoules: parseNumber(item.podEnergyDeltaJoules)
        }))
      : []
  };
}

export async function getNodeMicroserviceAnomalyApi(
  params: NodeMicroserviceAnomalyQueryParams
): Promise<NodeMicroserviceAnomaly> {
  const query = buildQuery({
    clusterUuid: params.clusterUuid,
    nodeName: params.nodeName,
    start: params.start,
    end: params.end,
    limit: params.limit,
    minPowerWatts: params.minPowerWatts
  });

  const raw = await requestJson<BackendNodeMicroserviceAnomaly | BackendNodeMicroserviceAnomalyEnvelope>(
    `${NODE_MONITOR_BASE_PATH}/microservice-anomaly${query}`,
    {
      method: "GET",
      unwrapData: true
    }
  );

  const data =
    raw &&
    typeof raw === "object" &&
    "data" in raw &&
    raw.data &&
    typeof raw.data === "object"
      ? (raw.data as BackendNodeMicroserviceAnomaly)
      : (raw as BackendNodeMicroserviceAnomaly);

  return {
    summary: {
      totalEvents: parseNumber(data.summary?.totalEvents),
      highRiskServices: parseNumber(data.summary?.highRiskServices),
      relatedClusters: parseNumber(data.summary?.relatedClusters),
      extraPowerKwh: parseNumber(data.summary?.extraPowerKwh)
    },
    items: Array.isArray(data.items)
      ? data.items.map((item) => ({
          id: parseString(item.id),
          clusterUuid: parseString(item.clusterUuid),
          clusterName: parseString(item.clusterName),
          nodeName: parseString(item.nodeName),
          namespace: parseString(item.namespace),
          service: parseString(item.service),
          workload: parseString(item.workload),
          anomalyType: parseString(item.anomalyType),
          reason: parseString(item.reason),
          severity: parseString(item.severity),
          currentPowerWatts: parseNumber(item.currentPowerWatts),
          baselinePowerWatts: parseNumber(item.baselinePowerWatts),
          extraPowerKwh: parseNumber(item.extraPowerKwh),
          deltaPercent: parseNumber(item.deltaPercent),
          detectedAt: parseNumber(item.detectedAt)
        }))
      : [],
    warnings: Array.isArray(data.warnings)
      ? data.warnings.map((item) => parseString(item)).filter((item) => item.length > 0)
      : []
  };
}

export async function getNodeCPUApi(params: BaseNodeQueryParams): Promise<NodeCPUMetrics> {
  const query = buildQuery({
    clusterUuid: params.clusterUuid,
    nodeName: params.nodeName,
    start: params.start,
    end: params.end,
    step: params.step
  });

  const data = await requestJson<BackendNodeMetrics["cpu"]>(`${NODE_MONITOR_BASE_PATH}/cpu${query}`, {
    method: "GET",
    unwrapData: true
  });

  return {
    nodeName: params.nodeName,
    current: {
      timestamp: parseNumber(data?.current?.timestamp),
      totalCores: parseNumber(data?.current?.totalCores),
      usagePercent: parseNumber(data?.current?.usagePercent),
      userPercent: parseNumber(data?.current?.userPercent),
      systemPercent: parseNumber(data?.current?.systemPercent)
    },
    trend: Array.isArray(data?.trend)
      ? data.trend.map((item) => ({
          timestamp: parseNumber(item.timestamp),
          usagePercent: parseNumber(item.usagePercent)
        }))
      : []
  };
}

export async function getScopedClusterEnergyOverviewApi(
  params: ScopedClusterEnergyOverviewQueryParams = {}
): Promise<ScopedClusterEnergyOverview> {
  const query = buildQuery({
    start: params.start,
    end: params.end,
    step: params.step
  });

  const raw = await requestJson<BackendScopedClusterEnergyOverview | BackendScopedClusterEnergyOverviewEnvelope>(
    `${CLUSTER_MONITOR_BASE_PATH}/energy/scope-overview${query}`,
    {
      method: "GET",
      unwrapData: true
    }
  );

  const data =
    raw &&
    typeof raw === "object" &&
    "data" in raw &&
    raw.data &&
    typeof raw.data === "object"
      ? (raw.data as BackendScopedClusterEnergyOverview)
      : (raw as BackendScopedClusterEnergyOverview);

  return {
    summary: {
      clusterCount: parseNumber(data.summary?.clusterCount),
      durationSeconds: parseNumber(data.summary?.durationSeconds),
      podCurrentPowerWatts: parseNumber(data.summary?.podCurrentPowerWatts),
      podEnergyDeltaJoules: parseNumber(data.summary?.podEnergyDeltaJoules),
      nodeCurrentPowerWatts: parseNumber(data.summary?.nodeCurrentPowerWatts),
      nodeEnergyDeltaJoules: parseNumber(data.summary?.nodeEnergyDeltaJoules)
    },
    items: Array.isArray(data.items)
      ? data.items.map((item) => ({
          clusterUuid: parseString(item.clusterUuid),
          clusterName: parseString(item.clusterName),
          environment: parseString(item.environment),
          durationSeconds: parseNumber(item.durationSeconds),
          podCurrentPowerWatts: parseNumber(item.podCurrentPowerWatts),
          podEnergyDeltaJoules: parseNumber(item.podEnergyDeltaJoules),
          nodeCurrentPowerWatts: parseNumber(item.nodeCurrentPowerWatts),
          nodeEnergyDeltaJoules: parseNumber(item.nodeEnergyDeltaJoules),
          nodeMetric: parseString(item.nodeMetric),
          error: parseString(item.error)
        }))
      : []
  };
}
