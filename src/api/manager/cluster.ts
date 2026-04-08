export interface Cluster {
  id: number;
  name: string;
  avatar: string;
  environment: string;
  clusterType: string;
  version: string;
  status: number;
  healthStatus: number;
  uuid: string;
  cpuUsage: number;
  memoryUsage: number;
  podUsage: number;
  storageUsage: number;
  createdAt: number;
}

export interface SearchClusterResponse {
  items: Cluster[];
  total: number;
}

export interface SyncClusterResponse {
  message: string;
  clusterId: number;
  clusterUuid: string;
  clusterName: string;
  nodeCount: number;
  source: string;
}

const CLUSTER_BASE_PATH = "/manager/v1/cluster";

export async function searchClusterApi(name?: string, environment?: string): Promise<SearchClusterResponse> {
  const params = new URLSearchParams();
  if (name) params.set("name", name);
  if (environment) params.set("environment", environment);
  const query = params.size > 0 ? `?${params.toString()}` : "";

  const response = await fetch(`${CLUSTER_BASE_PATH}${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Search cluster failed with status ${response.status}`);
  }
  return (await response.json()) as SearchClusterResponse;
}

export async function getClusterDetailApi(id: number): Promise<Cluster> {
  const response = await fetch(`${CLUSTER_BASE_PATH}/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Get cluster detail failed with status ${response.status}`);
  }
  return (await response.json()) as Cluster;
}

export async function syncClusterApi(id: number): Promise<SyncClusterResponse> {
  const response = await fetch(`/manager/v1/sync/cluster/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Sync cluster failed with status ${response.status}`);
  }
  return (await response.json()) as SyncClusterResponse;
}
