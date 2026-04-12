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

function isNodeReady(conditions?: Array<Record<string, unknown>>): boolean {
  if (!Array.isArray(conditions)) {
    return false;
  }

  return conditions.some((condition) => {
    return parseString(condition.type).toLowerCase() === "ready" && Boolean(condition.status);
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
