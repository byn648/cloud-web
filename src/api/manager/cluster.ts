import { buildQuery, parseNumber, parseString, requestJson } from "../shared";

const CLUSTER_BASE_PATH = "/manager/v1/cluster";
const DEFAULT_CLUSTER_PAGE = 1;
const DEFAULT_CLUSTER_PAGE_SIZE = 200;

export type ClusterKind = "standard" | "edge" | "serverless";
export type ClusterAuthType = "kubeconfig" | "token" | "certificate" | "incluster";
export type ClusterProvider =
  | "aws"
  | "azure"
  | "gcp"
  | "alibaba"
  | "tencent"
  | "huawei"
  | "self-hosted";

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

export interface ClusterDetail extends Cluster {
  description: string;
  region: string;
  zone: string;
  datacenter: string;
  provider: string;
  isManaged: number;
  nodeLb: string;
  masterLb: string;
  ingressDomain: string;
  lastSyncAt: number;
  gitCommit: string;
  platform: string;
  versionBuildAt: number;
  clusterCreatedAt: number;
  costCenter: string;
  businessUnit: string;
  ownerTeam: string;
  ownerEmail: string;
  priority: number;
  createdBy: string;
  updatedBy: string;
  updatedAt: number;
}

export interface AddClusterRequest {
  name: string;
  avatar?: string | File;
  description?: string;
  priceConfigId?: number;
  clusterType: ClusterKind;
  environment: string;
  region?: string;
  zone?: string;
  datacenter?: string;
  provider: ClusterProvider;
  isManaged?: number;
  nodeLb?: string;
  masterLb?: string;
  ingressDomain?: string;
  authType: ClusterAuthType;
  apiServerHost?: string;
  kubeFile?: string;
  token?: string;
  caCert?: string;
  caFile?: string;
  clientCert?: string;
  certFile?: string;
  clientKey?: string;
  keyFile?: string;
  insecureSkipVerify?: number;
}

export interface UpdateClusterRequest {
  id: number;
  name?: string;
  description?: string;
  clusterType?: ClusterKind;
  environment?: string;
  region?: string;
  zone?: string;
  datacenter?: string;
  provider?: ClusterProvider;
  isManaged?: number;
  nodeLb?: string;
  masterLb?: string;
  ingressDomain?: string;
}

export interface UpdateClusterAuthInfoRequest {
  id: number;
  authType: ClusterAuthType;
  apiServerHost?: string;
  kubeFile?: string;
  token?: string;
  caCert?: string;
  caFile?: string;
  clientCert?: string;
  certFile?: string;
  clientKey?: string;
  keyFile?: string;
  insecureSkipVerify?: number;
}

export interface SearchClusterResponse {
  items: Cluster[];
  total: number;
}

export interface SearchClusterRequest {
  page?: number;
  pageSize?: number;
  orderStr?: string;
  isAsc?: boolean;
  name?: string;
  uuid?: string;
  environment?: string;
}

export interface ClusterUpdateAvatarRequest {
  id: number;
  avatar: string | File;
}

export interface ClusterAudit {
  id: number;
  clusterUuid: string;
  operator: string;
  auditType: string;
  auditContent: string;
  color: number;
  createdAt: number;
}

export interface SearchClusterAuditRequest {
  page?: number;
  pageSize?: number;
  orderStr?: string;
  isAsc?: boolean;
  clusterUuid: string;
}

export interface SearchClusterAuditResponse {
  items: ClusterAudit[];
  total: number;
}

export interface ClusterAuthInfo {
  id: number;
  clusterUuid: string;
  authType: string;
  apiServerHost: string;
  kubeFile: string;
  token: string;
  caCert: string;
  caFile: string;
  clientCert: string;
  certFile: string;
  clientKey: string;
  keyFile: string;
  insecureSkipVerify: number;
  createdAt: number;
  updatedAt: number;
}

export interface ClusterResourceInfo {
  id: number;
  clusterUuid: string;
  cpuPhysicalCapacity: number;
  cpuAllocatedTotal: number;
  cpuCapacityTotal: number;
  memPhysicalCapacity: number;
  memAllocatedTotal: number;
  memCapacityTotal: number;
  storagePhysicalCapacity: number;
  storageAllocatedTotal: number;
  gpuPhysicalCapacity: number;
  gpuAllocatedTotal: number;
  gpuCapacityTotal: number;
  gpuUsedTotal: number;
  podsPhysicalCapacity: number;
  podsAllocatedTotal: number;
}

export interface TestClusterConnectivityRequest {
  authType: ClusterAuthType;
  apiServerHost?: string;
  kubeFile?: string;
  token?: string;
  caCert?: string;
  caFile?: string;
  clientCert?: string;
  certFile?: string;
  clientKey?: string;
  keyFile?: string;
  insecureSkipVerify?: number;
}

export interface UpdateClusterStorageCapacityRequest {
  resourceId: number;
  storagePhysicalCapacity: number;
}

export interface ClusterNetwork {
  id: number;
  clusterUuid: string;
  clusterCidr: string;
  serviceCidr: string;
  nodeCidrMaskSize: number;
  dnsDomain: string;
  dnsServiceIp: string;
  dnsProvider: string;
  cniPlugin: string;
  cniVersion: string;
  proxyMode: string;
  ingressController: string;
  ingressClass: string;
  ipv6Enabled: boolean;
  dualStackEnabled: boolean;
  mtuSize: number;
  enableNodePort: boolean;
  nodePortRange: string;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
}

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }
  return fallback;
}

function appendFormDataValue(formData: FormData, key: string, value: unknown): void {
  if (value === undefined || value === null || value === "") {
    return;
  }
  if (typeof File !== "undefined" && value instanceof File) {
    formData.append(key, value);
    return;
  }
  formData.append(key, String(value));
}

function toFormData(record: object): FormData {
  const formData = new FormData();
  Object.entries(record).forEach(([key, value]) => {
    appendFormDataValue(formData, key, value);
  });
  return formData;
}

function normalizeCluster(payload: unknown): Cluster {
  const item = (payload ?? {}) as Record<string, unknown>;

  return {
    id: parseNumber(item.id),
    name: parseString(item.name),
    avatar: parseString(item.avatar),
    environment: parseString(item.environment),
    clusterType: parseString(item.clusterType),
    version: parseString(item.version),
    status: parseNumber(item.status),
    healthStatus: parseNumber(item.healthStatus),
    uuid: parseString(item.uuid),
    cpuUsage: parseNumber(item.cpuUsage),
    memoryUsage: parseNumber(item.memoryUsage),
    podUsage: parseNumber(item.podUsage),
    storageUsage: parseNumber(item.storageUsage),
    createdAt: parseNumber(item.createdAt)
  };
}

function normalizeClusterDetail(payload: unknown): ClusterDetail {
  const item = (payload ?? {}) as Record<string, unknown>;
  const base = normalizeCluster(item);

  return {
    ...base,
    description: parseString(item.description),
    region: parseString(item.region),
    zone: parseString(item.zone),
    datacenter: parseString(item.datacenter),
    provider: parseString(item.provider),
    isManaged: parseNumber(item.isManaged),
    nodeLb: parseString(item.nodeLb),
    masterLb: parseString(item.masterLb),
    ingressDomain: parseString(item.ingressDomain),
    lastSyncAt: parseNumber(item.lastSyncAt),
    gitCommit: parseString(item.gitCommit),
    platform: parseString(item.platform),
    versionBuildAt: parseNumber(item.versionBuildAt),
    clusterCreatedAt: parseNumber(item.clusterCreatedAt),
    costCenter: parseString(item.costCenter),
    businessUnit: parseString(item.businessUnit),
    ownerTeam: parseString(item.ownerTeam),
    ownerEmail: parseString(item.ownerEmail),
    priority: parseNumber(item.priority),
    createdBy: parseString(item.createdBy),
    updatedBy: parseString(item.updatedBy),
    updatedAt: parseNumber(item.updatedAt)
  };
}

function normalizeClusterAudit(payload: unknown): ClusterAudit {
  const item = (payload ?? {}) as Record<string, unknown>;
  return {
    id: parseNumber(item.id),
    clusterUuid: parseString(item.clusterUuid),
    operator: parseString(item.operator),
    auditType: parseString(item.auditType),
    auditContent: parseString(item.auditContent),
    color: parseNumber(item.color),
    createdAt: parseNumber(item.createdAt)
  };
}

function normalizeClusterAuthInfo(payload: unknown): ClusterAuthInfo {
  const item = (payload ?? {}) as Record<string, unknown>;
  return {
    id: parseNumber(item.id),
    clusterUuid: parseString(item.clusterUuid),
    authType: parseString(item.authType),
    apiServerHost: parseString(item.apiServerHost),
    kubeFile: parseString(item.kubeFile),
    token: parseString(item.token),
    caCert: parseString(item.caCert),
    caFile: parseString(item.caFile),
    clientCert: parseString(item.clientCert),
    certFile: parseString(item.certFile),
    clientKey: parseString(item.clientKey),
    keyFile: parseString(item.keyFile),
    insecureSkipVerify: parseNumber(item.insecureSkipVerify),
    createdAt: parseNumber(item.createdAt),
    updatedAt: parseNumber(item.updatedAt)
  };
}

function normalizeClusterResourceInfo(payload: unknown): ClusterResourceInfo {
  const item = (payload ?? {}) as Record<string, unknown>;
  return {
    id: parseNumber(item.id),
    clusterUuid: parseString(item.clusterUuid),
    cpuPhysicalCapacity: parseNumber(item.cpuPhysicalCapacity),
    cpuAllocatedTotal: parseNumber(item.cpuAllocatedTotal),
    cpuCapacityTotal: parseNumber(item.cpuCapacityTotal),
    memPhysicalCapacity: parseNumber(item.memPhysicalCapacity),
    memAllocatedTotal: parseNumber(item.memAllocatedTotal),
    memCapacityTotal: parseNumber(item.memCapacityTotal),
    storagePhysicalCapacity: parseNumber(item.storagePhysicalCapacity),
    storageAllocatedTotal: parseNumber(item.storageAllocatedTotal),
    gpuPhysicalCapacity: parseNumber(item.gpuPhysicalCapacity),
    gpuAllocatedTotal: parseNumber(item.gpuAllocatedTotal),
    gpuCapacityTotal: parseNumber(item.gpuCapacityTotal),
    gpuUsedTotal: parseNumber(item.gpuUsedTotal),
    podsPhysicalCapacity: parseNumber(item.podsPhysicalCapacity),
    podsAllocatedTotal: parseNumber(item.podsAllocatedTotal)
  };
}

function normalizeClusterNetwork(payload: unknown): ClusterNetwork {
  const item = (payload ?? {}) as Record<string, unknown>;
  return {
    id: parseNumber(item.id),
    clusterUuid: parseString(item.clusterUuid),
    clusterCidr: parseString(item.clusterCidr),
    serviceCidr: parseString(item.serviceCidr),
    nodeCidrMaskSize: parseNumber(item.nodeCidrMaskSize),
    dnsDomain: parseString(item.dnsDomain),
    dnsServiceIp: parseString(item.dnsServiceIp),
    dnsProvider: parseString(item.dnsProvider),
    cniPlugin: parseString(item.cniPlugin),
    cniVersion: parseString(item.cniVersion),
    proxyMode: parseString(item.proxyMode),
    ingressController: parseString(item.ingressController),
    ingressClass: parseString(item.ingressClass),
    ipv6Enabled: parseBoolean(item.ipv6Enabled),
    dualStackEnabled: parseBoolean(item.dualStackEnabled),
    mtuSize: parseNumber(item.mtuSize),
    enableNodePort: parseBoolean(item.enableNodePort),
    nodePortRange: parseString(item.nodePortRange),
    createdBy: parseString(item.createdBy),
    updatedBy: parseString(item.updatedBy),
    createdAt: parseNumber(item.createdAt),
    updatedAt: parseNumber(item.updatedAt)
  };
}

function normalizeStringArray(payload: unknown): string[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload.map((item) => parseString(item)).filter((item) => item.length > 0);
}

export async function addClusterApi(data: AddClusterRequest): Promise<string> {
  const body = toFormData(data);
  return requestJson<string>(`${CLUSTER_BASE_PATH}`, {
    method: "POST",
    body
  });
}

export async function updateClusterApi(data: UpdateClusterRequest): Promise<string> {
  const { id, ...params } = data;
  return requestJson<string>(`${CLUSTER_BASE_PATH}/${id}`, {
    method: "PUT",
    body: JSON.stringify(params)
  });
}

export async function updateClusterAuthInfoApi(data: UpdateClusterAuthInfoRequest): Promise<string> {
  const { id, ...params } = data;
  return requestJson<string>(`${CLUSTER_BASE_PATH}/${id}/auth`, {
    method: "PUT",
    body: JSON.stringify(params)
  });
}

export async function searchClusterApi(
  params?: SearchClusterRequest
): Promise<SearchClusterResponse>;
export async function searchClusterApi(
  paramsOrName?: SearchClusterRequest | string,
  environment?: string,
  page = DEFAULT_CLUSTER_PAGE,
  pageSize = DEFAULT_CLUSTER_PAGE_SIZE
): Promise<SearchClusterResponse> {
  const firstParam = paramsOrName;
  const normalizedParams: SearchClusterRequest =
    typeof firstParam === "object" && firstParam !== null
      ? {
          page: firstParam.page ?? DEFAULT_CLUSTER_PAGE,
          pageSize: firstParam.pageSize ?? DEFAULT_CLUSTER_PAGE_SIZE,
          orderStr: firstParam.orderStr,
          isAsc: firstParam.isAsc,
          name: firstParam.name,
          uuid: firstParam.uuid,
          environment: firstParam.environment
        }
      : {
          page,
          pageSize,
          name: firstParam,
          environment
        };

  const query = buildQuery({
    page: normalizedParams.page,
    pageSize: normalizedParams.pageSize,
    orderStr: normalizedParams.orderStr?.trim() || undefined,
    isAsc: normalizedParams.isAsc,
    name: normalizedParams.name?.trim() || undefined,
    uuid: normalizedParams.uuid?.trim() || undefined,
    environment: normalizedParams.environment?.trim() || undefined
  });

  const response = await requestJson<{ items?: unknown[]; total?: unknown }>(
    `${CLUSTER_BASE_PATH}${query}`,
    {
      method: "GET"
    }
  );

  return {
    items: Array.isArray(response.items) ? response.items.map((item) => normalizeCluster(item)) : [],
    total: parseNumber(response.total)
  };
}

export async function getClusterDetailApi(id: number): Promise<ClusterDetail> {
  const response = await requestJson<unknown>(`${CLUSTER_BASE_PATH}/${id}`, {
    method: "GET"
  });
  return normalizeClusterDetail(response);
}

export async function deleteClusterApi(id: number): Promise<string> {
  return requestJson<string>(`${CLUSTER_BASE_PATH}/${id}`, {
    method: "DELETE"
  });
}

export async function updateClusterAvatarApi(data: ClusterUpdateAvatarRequest): Promise<string> {
  const body = new FormData();
  appendFormDataValue(body, "avatar", data.avatar);
  return requestJson<string>(`${CLUSTER_BASE_PATH}/${data.id}/avatar`, {
    method: "PUT",
    body
  });
}

export async function getClusterNamespaceListApi(clusterUuid: string): Promise<string[]> {
  const response = await requestJson<unknown>(`${CLUSTER_BASE_PATH}/${clusterUuid}/namespaces`, {
    method: "GET"
  });
  return normalizeStringArray(response);
}

export async function searchClusterAuditApi(
  params: SearchClusterAuditRequest
): Promise<SearchClusterAuditResponse> {
  const query = buildQuery({
    page: params.page ?? DEFAULT_CLUSTER_PAGE,
    pageSize: params.pageSize ?? DEFAULT_CLUSTER_PAGE_SIZE,
    orderStr: params.orderStr?.trim() || undefined,
    isAsc: params.isAsc,
    clusterUuid: params.clusterUuid?.trim()
  });
  const response = await requestJson<{ items?: unknown[]; total?: unknown }>(
    `${CLUSTER_BASE_PATH}/audit${query}`,
    {
      method: "GET"
    }
  );
  return {
    items: Array.isArray(response.items) ? response.items.map((item) => normalizeClusterAudit(item)) : [],
    total: parseNumber(response.total)
  };
}

export async function getClusterAuthInfoApi(id: number): Promise<ClusterAuthInfo> {
  const response = await requestJson<unknown>(`${CLUSTER_BASE_PATH}/${id}/auth`, {
    method: "GET"
  });
  return normalizeClusterAuthInfo(response);
}

export async function getClusterResourceInfoApi(id: number): Promise<ClusterResourceInfo> {
  const response = await requestJson<unknown>(`${CLUSTER_BASE_PATH}/${id}/resource`, {
    method: "GET"
  });
  return normalizeClusterResourceInfo(response);
}

export async function testClusterConnectivityApi(data: TestClusterConnectivityRequest): Promise<string> {
  return requestJson<string>(`${CLUSTER_BASE_PATH}/test`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function getClusterIngressDomainsApi(uuid: string): Promise<string[]> {
  const response = await requestJson<unknown>(`${CLUSTER_BASE_PATH}/${uuid}/ingress`, {
    method: "GET"
  });
  return normalizeStringArray(response);
}

export async function updateClusterStorageCapacityApi(
  data: UpdateClusterStorageCapacityRequest
): Promise<string> {
  const { resourceId, ...params } = data;
  return requestJson<string>(`${CLUSTER_BASE_PATH}/${resourceId}/storage`, {
    method: "PUT",
    body: JSON.stringify(params)
  });
}

export async function getClusterNetworkApi(clusterUuid: string): Promise<ClusterNetwork> {
  const response = await requestJson<unknown>(`${CLUSTER_BASE_PATH}/${clusterUuid}/network`, {
    method: "GET"
  });
  return normalizeClusterNetwork(response);
}

export async function syncClusterApi(id: number): Promise<string> {
  return requestJson<string>(`/manager/v1/sync/cluster/${id}`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function syncAllClustersApi(): Promise<string> {
  return requestJson<string>("/manager/v1/sync/cluster/all", {
    method: "POST",
    body: JSON.stringify({})
  });
}
