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

function toQueryString(params: Record<string, string>): string {
  const query = new URLSearchParams(params);
  return query.size > 0 ? `?${query.toString()}` : "";
}

export async function getNodeListApi(params: SearchClusterNodeRequest): Promise<SearchClusterNodeResponse> {
  const query = toQueryString({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 10),
    orderField: params.orderField ?? "id",
    isAsc: String(params.isAsc ?? false),
    clusterUuid: params.clusterUuid
  });
  const response = await fetch(`${NODE_BASE_PATH}${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Get node list failed with status ${response.status}`);
  }
  return (await response.json()) as SearchClusterNodeResponse;
}

export async function getNodeDetailApi(id: number): Promise<ClusterNodeDetail> {
  const response = await fetch(`${NODE_BASE_PATH}/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Get node detail failed with status ${response.status}`);
  }
  return (await response.json()) as ClusterNodeDetail;
}
