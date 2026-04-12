import { buildQuery, parseNumber, parseString, requestJson } from "../shared";

const NODE_BASE_PATH = "/manager/v1/node";

export interface ClusterNodeInfo {
  id: number;
  clusterUuid: string;
  nodeName: string;
  nodeIp: string;
  nodeStatus: string;
  cpuUsge: number;
  memoryUsge: number;
  podTotal: number;
  podUsge: number;
  createdAt: number;
  updatedAt: number;
  nodeRole: string;
  architecture: string;
  unschedulable: number;
}

export interface ClusterNodeDetail {
  id: number;
  clusterUuid: string;
  nodeUuid: string;
  name: string;
  hostname: string;
  roles: string;
  osImage: string;
  nodeIp: string;
  kernelVersion: string;
  operatingSystem: string;
  architecture: string;
  cpu: number;
  memory: number;
  pods: number;
  isGpu: number;
  runtime: string;
  joinAt: number;
  unschedulable: number;
  kubeletVersion: string;
  status: string;
  podCidr: string;
  podCidrs: string;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface SearchClusterNodeRequest {
  page?: number;
  pageSize?: number;
  orderField?: string;
  isAsc?: boolean;
  clusterUuid: string;
}

export interface SearchClusterNodeResponse {
  items: ClusterNodeInfo[];
  total: number;
}

function normalizeNodeInfo(payload: unknown): ClusterNodeInfo {
  const item = (payload ?? {}) as Record<string, unknown>;

  return {
    id: parseNumber(item.id),
    clusterUuid: parseString(item.clusterUuid),
    nodeName: parseString(item.nodeName),
    nodeIp: parseString(item.nodeIp),
    nodeStatus: parseString(item.nodeStatus),
    cpuUsge: parseNumber(item.cpuUsge),
    memoryUsge: parseNumber(item.memoryUsge),
    podTotal: parseNumber(item.podTotal),
    podUsge: parseNumber(item.podUsge),
    createdAt: parseNumber(item.createdAt),
    updatedAt: parseNumber(item.updatedAt),
    nodeRole: parseString(item.nodeRole),
    architecture: parseString(item.architecture),
    unschedulable: parseNumber(item.unschedulable)
  };
}

function normalizeNodeDetail(payload: unknown): ClusterNodeDetail {
  const item = (payload ?? {}) as Record<string, unknown>;

  return {
    id: parseNumber(item.id),
    clusterUuid: parseString(item.clusterUuid),
    nodeUuid: parseString(item.nodeUuid),
    name: parseString(item.name),
    hostname: parseString(item.hostname),
    roles: parseString(item.roles),
    osImage: parseString(item.osImage),
    nodeIp: parseString(item.nodeIp),
    kernelVersion: parseString(item.kernelVersion),
    operatingSystem: parseString(item.operatingSystem),
    architecture: parseString(item.architecture),
    cpu: parseNumber(item.cpu),
    memory: parseNumber(item.memory),
    pods: parseNumber(item.pods),
    isGpu: parseNumber(item.isGpu),
    runtime: parseString(item.runtime),
    joinAt: parseNumber(item.joinAt),
    unschedulable: parseNumber(item.unschedulable),
    kubeletVersion: parseString(item.kubeletVersion),
    status: parseString(item.status),
    podCidr: parseString(item.podCidr),
    podCidrs: parseString(item.podCidrs),
    createdBy: parseString(item.createdBy),
    updatedBy: parseString(item.updatedBy),
    createdAt: parseNumber(item.createdAt),
    updatedAt: parseNumber(item.updatedAt)
  };
}

export async function getNodeListApi(params: SearchClusterNodeRequest): Promise<SearchClusterNodeResponse> {
  const query = buildQuery({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 10,
    orderField: params.orderField ?? "id",
    isAsc: params.isAsc ?? false,
    clusterUuid: params.clusterUuid
  });

  const response = await requestJson<{ items?: unknown[]; total?: unknown }>(`${NODE_BASE_PATH}${query}`, {
    method: "GET"
  });

  return {
    items: Array.isArray(response.items) ? response.items.map((item) => normalizeNodeInfo(item)) : [],
    total: parseNumber(response.total)
  };
}

export async function getNodeDetailApi(id: number): Promise<ClusterNodeDetail> {
  const response = await requestJson<unknown>(`${NODE_BASE_PATH}/${id}`, {
    method: "GET"
  });
  return normalizeNodeDetail(response);
}
