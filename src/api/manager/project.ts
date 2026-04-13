import { buildQuery, parseNumber, parseString, requestJson } from "../shared";

const PROJECT_BASE_PATH = "/manager/v1/project";

const PROJECT_NUMBER_FIELDS = [
  "id",
  "isSystem",
  "createdAt",
  "updatedAt",
  "adminCount",
  "resourceCount"
] as const;

const PROJECT_ADMIN_NUMBER_FIELDS = ["id", "projectId", "userId", "createdAt"] as const;

const PROJECT_CLUSTER_NUMBER_FIELDS = [
  "id",
  "projectId",
  "cpuLimit",
  "cpuOvercommitRatio",
  "cpuCapacity",
  "cpuAllocated",
  "memLimit",
  "memOvercommitRatio",
  "memCapacity",
  "memAllocated",
  "storageLimit",
  "storageAllocated",
  "gpuLimit",
  "gpuOvercommitRatio",
  "gpuCapacity",
  "gpuAllocated",
  "podsLimit",
  "podsAllocated",
  "configmapLimit",
  "configmapAllocated",
  "secretLimit",
  "secretAllocated",
  "pvcLimit",
  "pvcAllocated",
  "ephemeralStorageLimit",
  "ephemeralStorageAllocated",
  "serviceLimit",
  "serviceAllocated",
  "loadbalancersLimit",
  "loadbalancersAllocated",
  "nodeportsLimit",
  "nodeportsAllocated",
  "deploymentsLimit",
  "deploymentsAllocated",
  "jobsLimit",
  "jobsAllocated",
  "cronjobsLimit",
  "cronjobsAllocated",
  "daemonsetsLimit",
  "daemonsetsAllocated",
  "statefulsetsLimit",
  "statefulsetsAllocated",
  "ingressesLimit",
  "ingressesAllocated",
  "createdAt",
  "updatedAt"
] as const;

const PROJECT_WORKSPACE_NUMBER_FIELDS = [
  "id",
  "projectClusterId",
  "projectId",
  "cpuAllocated",
  "memAllocated",
  "storageAllocated",
  "gpuAllocated",
  "podsAllocated",
  "createdAt",
  "updatedAt"
] as const;

export interface Project {
  id: number;
  name: string;
  uuid: string;
  description: string;
  isSystem: number;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
  adminCount: number;
  resourceCount: number;
}

export interface SearchProjectRequest {
  page?: number;
  pageSize?: number;
  name?: string;
  uuid?: string;
}

export interface SearchProjectResponse {
  items: Project[];
  total: number;
}

export interface AddProjectRequest {
  name: string;
  description?: string;
  isSystem?: number;
}

export interface UpdateProjectRequest {
  name: string;
  description?: string;
}

export interface GetProjectsByUserRequest {
  name?: string;
}

export interface ProjectAdmin {
  id: number;
  projectId: number;
  userId: number;
  createdAt: number;
}

export interface AddProjectAdminRequest {
  projectId: number;
  userIds: number[];
}

export interface ProjectCluster {
  id: number;
  clusterUuid: string;
  clusterName: string;
  projectId: number;
  cpuLimit: number;
  cpuOvercommitRatio: number;
  cpuCapacity: number;
  cpuAllocated: number;
  memLimit: number;
  memOvercommitRatio: number;
  memCapacity: number;
  memAllocated: number;
  storageLimit: number;
  storageAllocated: number;
  gpuLimit: number;
  gpuOvercommitRatio: number;
  gpuCapacity: number;
  gpuAllocated: number;
  podsLimit: number;
  podsAllocated: number;
  configmapLimit: number;
  configmapAllocated: number;
  secretLimit: number;
  secretAllocated: number;
  pvcLimit: number;
  pvcAllocated: number;
  ephemeralStorageLimit: number;
  ephemeralStorageAllocated: number;
  serviceLimit: number;
  serviceAllocated: number;
  loadbalancersLimit: number;
  loadbalancersAllocated: number;
  nodeportsLimit: number;
  nodeportsAllocated: number;
  deploymentsLimit: number;
  deploymentsAllocated: number;
  jobsLimit: number;
  jobsAllocated: number;
  cronjobsLimit: number;
  cronjobsAllocated: number;
  daemonsetsLimit: number;
  daemonsetsAllocated: number;
  statefulsetsLimit: number;
  statefulsetsAllocated: number;
  ingressesLimit: number;
  ingressesAllocated: number;
  createdBy: string;
  updatedBy: string;
  status?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AddProjectClusterRequest {
  clusterUuid: string;
  projectId: number;
  priceConfigId: number;
  billingStartTime?: number;
  cpuLimit: number;
  cpuOvercommitRatio?: number;
  cpuCapacity?: number;
  memLimit: number;
  memOvercommitRatio?: number;
  memCapacity?: number;
  storageLimit?: number;
  gpuLimit?: number;
  gpuOvercommitRatio?: number;
  gpuCapacity?: number;
  podsLimit?: number;
  configmapLimit?: number;
  secretLimit?: number;
  pvcLimit?: number;
  ephemeralStorageLimit?: number;
  serviceLimit?: number;
  loadbalancersLimit?: number;
  nodeportsLimit?: number;
  deploymentsLimit?: number;
  jobsLimit?: number;
  cronjobsLimit?: number;
  daemonsetsLimit?: number;
  statefulsetsLimit?: number;
  ingressesLimit?: number;
}

export interface UpdateProjectClusterRequest {
  cpuLimit: number;
  cpuOvercommitRatio?: number;
  cpuCapacity?: number;
  memLimit: number;
  memOvercommitRatio?: number;
  memCapacity?: number;
  storageLimit?: number;
  gpuLimit?: number;
  gpuOvercommitRatio?: number;
  gpuCapacity?: number;
  podsLimit?: number;
  configmapLimit?: number;
  secretLimit?: number;
  pvcLimit?: number;
  ephemeralStorageLimit?: number;
  serviceLimit?: number;
  loadbalancersLimit?: number;
  nodeportsLimit?: number;
  deploymentsLimit?: number;
  jobsLimit?: number;
  cronjobsLimit?: number;
  daemonsetsLimit?: number;
  statefulsetsLimit?: number;
  ingressesLimit?: number;
}

export interface SearchProjectClusterRequest {
  projectId: number;
  clusterUuid?: string;
}

export interface ProjectWorkspace {
  id: number;
  projectClusterId: number;
  projectId: number;
  clusterUuid: string;
  clusterName: string;
  name: string;
  namespace: string;
  description: string;
  cpuAllocated: number;
  memAllocated: number;
  storageAllocated: number;
  gpuAllocated: number;
  podsAllocated: number;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface AddProjectWorkspaceRequest {
  projectClusterId: number;
  clusterUuid: string;
  name: string;
  namespace: string;
  description?: string;
  cpuAllocated: number;
  memAllocated: number;
  storageAllocated?: number;
  gpuAllocated?: number;
  podsAllocated: number;
}

export interface UpdateProjectWorkspaceRequest {
  name: string;
  description?: string;
  cpuAllocated: number;
  memAllocated: number;
  storageAllocated?: number;
  gpuAllocated?: number;
  podsAllocated: number;
}

export interface SearchProjectWorkspaceRequest {
  projectClusterId: number;
  name?: string;
  namespace?: string;
}

function normalizeNumberFields<T extends Record<string, unknown>, K extends readonly string[]>(
  payload: unknown,
  numericFields: K
): T {
  const item = { ...((payload ?? {}) as Record<string, unknown>) };

  numericFields.forEach((field) => {
    item[field] = parseNumber(item[field]);
  });

  return item as T;
}

function normalizeProject(payload: unknown): Project {
  const item = normalizeNumberFields<Record<string, unknown>, typeof PROJECT_NUMBER_FIELDS>(
    payload,
    PROJECT_NUMBER_FIELDS
  );

  return {
    id: parseNumber(item.id),
    name: parseString(item.name),
    uuid: parseString(item.uuid),
    description: parseString(item.description),
    isSystem: parseNumber(item.isSystem),
    createdBy: parseString(item.createdBy),
    updatedBy: parseString(item.updatedBy),
    createdAt: parseNumber(item.createdAt),
    updatedAt: parseNumber(item.updatedAt),
    adminCount: parseNumber(item.adminCount),
    resourceCount: parseNumber(item.resourceCount)
  };
}

function normalizeProjectAdmin(payload: unknown): ProjectAdmin {
  const item = normalizeNumberFields<Record<string, unknown>, typeof PROJECT_ADMIN_NUMBER_FIELDS>(
    payload,
    PROJECT_ADMIN_NUMBER_FIELDS
  );

  return {
    id: parseNumber(item.id),
    projectId: parseNumber(item.projectId),
    userId: parseNumber(item.userId),
    createdAt: parseNumber(item.createdAt)
  };
}

function normalizeProjectCluster(payload: unknown): ProjectCluster {
  const item = normalizeNumberFields<Record<string, unknown>, typeof PROJECT_CLUSTER_NUMBER_FIELDS>(
    payload,
    PROJECT_CLUSTER_NUMBER_FIELDS
  );

  return {
    id: parseNumber(item.id),
    clusterUuid: parseString(item.clusterUuid),
    clusterName: parseString(item.clusterName),
    projectId: parseNumber(item.projectId),
    cpuLimit: parseNumber(item.cpuLimit),
    cpuOvercommitRatio: parseNumber(item.cpuOvercommitRatio, 1),
    cpuCapacity: parseNumber(item.cpuCapacity),
    cpuAllocated: parseNumber(item.cpuAllocated),
    memLimit: parseNumber(item.memLimit),
    memOvercommitRatio: parseNumber(item.memOvercommitRatio, 1),
    memCapacity: parseNumber(item.memCapacity),
    memAllocated: parseNumber(item.memAllocated),
    storageLimit: parseNumber(item.storageLimit),
    storageAllocated: parseNumber(item.storageAllocated),
    gpuLimit: parseNumber(item.gpuLimit),
    gpuOvercommitRatio: parseNumber(item.gpuOvercommitRatio, 1),
    gpuCapacity: parseNumber(item.gpuCapacity),
    gpuAllocated: parseNumber(item.gpuAllocated),
    podsLimit: parseNumber(item.podsLimit),
    podsAllocated: parseNumber(item.podsAllocated),
    configmapLimit: parseNumber(item.configmapLimit),
    configmapAllocated: parseNumber(item.configmapAllocated),
    secretLimit: parseNumber(item.secretLimit),
    secretAllocated: parseNumber(item.secretAllocated),
    pvcLimit: parseNumber(item.pvcLimit),
    pvcAllocated: parseNumber(item.pvcAllocated),
    ephemeralStorageLimit: parseNumber(item.ephemeralStorageLimit),
    ephemeralStorageAllocated: parseNumber(item.ephemeralStorageAllocated),
    serviceLimit: parseNumber(item.serviceLimit),
    serviceAllocated: parseNumber(item.serviceAllocated),
    loadbalancersLimit: parseNumber(item.loadbalancersLimit),
    loadbalancersAllocated: parseNumber(item.loadbalancersAllocated),
    nodeportsLimit: parseNumber(item.nodeportsLimit),
    nodeportsAllocated: parseNumber(item.nodeportsAllocated),
    deploymentsLimit: parseNumber(item.deploymentsLimit),
    deploymentsAllocated: parseNumber(item.deploymentsAllocated),
    jobsLimit: parseNumber(item.jobsLimit),
    jobsAllocated: parseNumber(item.jobsAllocated),
    cronjobsLimit: parseNumber(item.cronjobsLimit),
    cronjobsAllocated: parseNumber(item.cronjobsAllocated),
    daemonsetsLimit: parseNumber(item.daemonsetsLimit),
    daemonsetsAllocated: parseNumber(item.daemonsetsAllocated),
    statefulsetsLimit: parseNumber(item.statefulsetsLimit),
    statefulsetsAllocated: parseNumber(item.statefulsetsAllocated),
    ingressesLimit: parseNumber(item.ingressesLimit),
    ingressesAllocated: parseNumber(item.ingressesAllocated),
    createdBy: parseString(item.createdBy),
    updatedBy: parseString(item.updatedBy),
    status: parseString(item.status),
    createdAt: parseNumber(item.createdAt),
    updatedAt: parseNumber(item.updatedAt)
  };
}

function normalizeProjectWorkspace(payload: unknown): ProjectWorkspace {
  const item = normalizeNumberFields<Record<string, unknown>, typeof PROJECT_WORKSPACE_NUMBER_FIELDS>(
    payload,
    PROJECT_WORKSPACE_NUMBER_FIELDS
  );

  return {
    id: parseNumber(item.id),
    projectClusterId: parseNumber(item.projectClusterId),
    projectId: parseNumber(item.projectId),
    clusterUuid: parseString(item.clusterUuid),
    clusterName: parseString(item.clusterName),
    name: parseString(item.name),
    namespace: parseString(item.namespace),
    description: parseString(item.description),
    cpuAllocated: parseNumber(item.cpuAllocated),
    memAllocated: parseNumber(item.memAllocated),
    storageAllocated: parseNumber(item.storageAllocated),
    gpuAllocated: parseNumber(item.gpuAllocated),
    podsAllocated: parseNumber(item.podsAllocated),
    createdBy: parseString(item.createdBy),
    updatedBy: parseString(item.updatedBy),
    createdAt: parseNumber(item.createdAt),
    updatedAt: parseNumber(item.updatedAt)
  };
}

function toQuantity(value: number | undefined): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Number.isFinite(value)) {
    return undefined;
  }
  return String(value);
}

export async function searchProjectApi(params: SearchProjectRequest): Promise<SearchProjectResponse> {
  const query = buildQuery({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 10,
    name: params.name?.trim() || undefined,
    uuid: params.uuid?.trim() || undefined
  });

  const response = await requestJson<{ items?: unknown[]; total?: unknown }>(`${PROJECT_BASE_PATH}/search${query}`, {
    method: "GET"
  });

  return {
    items: Array.isArray(response.items) ? response.items.map((item) => normalizeProject(item)) : [],
    total: parseNumber(response.total)
  };
}

export async function addProjectApi(data: AddProjectRequest): Promise<string> {
  return requestJson<string>(PROJECT_BASE_PATH, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updateProjectApi(id: number, data: UpdateProjectRequest): Promise<string> {
  return requestJson<string>(`${PROJECT_BASE_PATH}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export async function deleteProjectApi(id: number): Promise<string> {
  return requestJson<string>(`${PROJECT_BASE_PATH}/${id}`, { method: "DELETE" });
}

export async function getProjectApi(id: number): Promise<Project> {
  const response = await requestJson<unknown>(`${PROJECT_BASE_PATH}/${id}`, { method: "GET" });
  return normalizeProject(response);
}

export async function getProjectsByUserApi(params?: GetProjectsByUserRequest): Promise<Project[]> {
  const query = buildQuery({
    name: params?.name?.trim() || undefined
  });

  const response = await requestJson<unknown[]>(`${PROJECT_BASE_PATH}/user${query}`, { method: "GET" });
  return Array.isArray(response) ? response.map((item) => normalizeProject(item)) : [];
}

export async function addProjectAdminApi(data: AddProjectAdminRequest): Promise<string> {
  return requestJson<string>(`${PROJECT_BASE_PATH}/admin`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function getProjectAdminsApi(projectId: number): Promise<ProjectAdmin[]> {
  const query = buildQuery({ projectId });
  const response = await requestJson<unknown[]>(`${PROJECT_BASE_PATH}/admin/list${query}`, { method: "GET" });
  return Array.isArray(response) ? response.map((item) => normalizeProjectAdmin(item)) : [];
}

export async function addProjectClusterApi(data: AddProjectClusterRequest): Promise<string> {
  return requestJson<string>(`${PROJECT_BASE_PATH}/cluster`, {
    method: "POST",
    body: JSON.stringify({
      clusterUuid: data.clusterUuid,
      projectId: data.projectId,
      priceConfigId: data.priceConfigId,
      billingStartTime: data.billingStartTime,
      cpuLimit: toQuantity(data.cpuLimit ?? 0),
      cpuOvercommitRatio: data.cpuOvercommitRatio ?? 1,
      cpuCapacity: toQuantity(data.cpuCapacity ?? 0),
      memLimit: toQuantity(data.memLimit ?? 0),
      memOvercommitRatio: data.memOvercommitRatio ?? 1,
      memCapacity: toQuantity(data.memCapacity ?? 0),
      storageLimit: toQuantity(data.storageLimit ?? 0),
      gpuLimit: toQuantity(data.gpuLimit ?? 0),
      gpuOvercommitRatio: data.gpuOvercommitRatio ?? 1,
      gpuCapacity: toQuantity(data.gpuCapacity ?? 0),
      podsLimit: data.podsLimit ?? 0,
      configmapLimit: data.configmapLimit ?? 0,
      secretLimit: data.secretLimit ?? 0,
      pvcLimit: data.pvcLimit ?? 0,
      ephemeralStorageLimit: toQuantity(data.ephemeralStorageLimit ?? 0),
      serviceLimit: data.serviceLimit ?? 0,
      loadbalancersLimit: data.loadbalancersLimit ?? 0,
      nodeportsLimit: data.nodeportsLimit ?? 0,
      deploymentsLimit: data.deploymentsLimit ?? 0,
      jobsLimit: data.jobsLimit ?? 0,
      cronjobsLimit: data.cronjobsLimit ?? 0,
      daemonsetsLimit: data.daemonsetsLimit ?? 0,
      statefulsetsLimit: data.statefulsetsLimit ?? 0,
      ingressesLimit: data.ingressesLimit ?? 0
    })
  });
}

export async function updateProjectClusterApi(id: number, data: UpdateProjectClusterRequest): Promise<string> {
  return requestJson<string>(`${PROJECT_BASE_PATH}/cluster/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      cpuLimit: toQuantity(data.cpuLimit ?? 0),
      cpuOvercommitRatio: data.cpuOvercommitRatio ?? 1,
      cpuCapacity: toQuantity(data.cpuCapacity ?? 0),
      memLimit: toQuantity(data.memLimit ?? 0),
      memOvercommitRatio: data.memOvercommitRatio ?? 1,
      memCapacity: toQuantity(data.memCapacity ?? 0),
      storageLimit: toQuantity(data.storageLimit ?? 0),
      gpuLimit: toQuantity(data.gpuLimit ?? 0),
      gpuOvercommitRatio: data.gpuOvercommitRatio ?? 1,
      gpuCapacity: toQuantity(data.gpuCapacity ?? 0),
      podsLimit: data.podsLimit ?? 0,
      configmapLimit: data.configmapLimit ?? 0,
      secretLimit: data.secretLimit ?? 0,
      pvcLimit: data.pvcLimit ?? 0,
      ephemeralStorageLimit: toQuantity(data.ephemeralStorageLimit ?? 0),
      serviceLimit: data.serviceLimit ?? 0,
      loadbalancersLimit: data.loadbalancersLimit ?? 0,
      nodeportsLimit: data.nodeportsLimit ?? 0,
      deploymentsLimit: data.deploymentsLimit ?? 0,
      jobsLimit: data.jobsLimit ?? 0,
      cronjobsLimit: data.cronjobsLimit ?? 0,
      daemonsetsLimit: data.daemonsetsLimit ?? 0,
      statefulsetsLimit: data.statefulsetsLimit ?? 0,
      ingressesLimit: data.ingressesLimit ?? 0
    })
  });
}

export async function deleteProjectClusterApi(id: number): Promise<string> {
  return requestJson<string>(`${PROJECT_BASE_PATH}/cluster/${id}`, { method: "DELETE" });
}

export async function getProjectClusterApi(id: number): Promise<ProjectCluster> {
  const response = await requestJson<unknown>(`${PROJECT_BASE_PATH}/cluster/${id}`, { method: "GET" });
  return normalizeProjectCluster(response);
}

export async function searchProjectClusterApi(params: SearchProjectClusterRequest): Promise<ProjectCluster[]> {
  const query = buildQuery({
    projectId: params.projectId,
    clusterUuid: params.clusterUuid?.trim() || undefined
  });

  const response = await requestJson<unknown[]>(`${PROJECT_BASE_PATH}/cluster/search${query}`, { method: "GET" });
  return Array.isArray(response) ? response.map((item) => normalizeProjectCluster(item)) : [];
}

export async function addProjectWorkspaceApi(data: AddProjectWorkspaceRequest): Promise<string> {
  return requestJson<string>(`${PROJECT_BASE_PATH}/workspace`, {
    method: "POST",
    body: JSON.stringify({
      projectClusterId: data.projectClusterId,
      clusterUuid: data.clusterUuid,
      name: data.name,
      namespace: data.namespace,
      description: data.description,
      cpuAllocated: toQuantity(data.cpuAllocated),
      memAllocated: toQuantity(data.memAllocated),
      storageAllocated: toQuantity(data.storageAllocated),
      gpuAllocated: toQuantity(data.gpuAllocated),
      podsAllocated: data.podsAllocated
    })
  });
}

export async function updateProjectWorkspaceApi(id: number, data: UpdateProjectWorkspaceRequest): Promise<string> {
  return requestJson<string>(`${PROJECT_BASE_PATH}/workspace/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      cpuAllocated: toQuantity(data.cpuAllocated),
      memAllocated: toQuantity(data.memAllocated),
      storageAllocated: toQuantity(data.storageAllocated),
      gpuAllocated: toQuantity(data.gpuAllocated),
      podsAllocated: data.podsAllocated
    })
  });
}

export async function deleteProjectWorkspaceApi(id: number): Promise<string> {
  return requestJson<string>(`${PROJECT_BASE_PATH}/workspace/${id}`, { method: "DELETE" });
}

export async function getProjectWorkspaceApi(id: number): Promise<ProjectWorkspace> {
  const response = await requestJson<unknown>(`${PROJECT_BASE_PATH}/workspace/${id}`, { method: "GET" });
  return normalizeProjectWorkspace(response);
}

export async function searchProjectWorkspaceApi(
  params: SearchProjectWorkspaceRequest
): Promise<ProjectWorkspace[]> {
  const query = buildQuery({
    projectClusterId: params.projectClusterId,
    name: params.name?.trim() || undefined,
    namespace: params.namespace?.trim() || undefined
  });

  const response = await requestJson<unknown[]>(`${PROJECT_BASE_PATH}/workspace/search${query}`, {
    method: "GET"
  });

  return Array.isArray(response) ? response.map((item) => normalizeProjectWorkspace(item)) : [];
}

export async function syncProjectApi(id: number): Promise<string> {
  return requestJson<string>(`/manager/v1/sync/project/${id}`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function syncProjectClusterResourceApi(id: number): Promise<string> {
  return requestJson<string>(`/manager/v1/sync/project/${id}/sync`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function syncAllProjectsApi(): Promise<string> {
  return requestJson<string>("/manager/v1/sync/project/all", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function syncWorkspaceApi(id: number): Promise<string> {
  return requestJson<string>(`/manager/v1/sync/workspace/${id}/sync`, {
    method: "POST",
    body: JSON.stringify({})
  });
}
