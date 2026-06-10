import { buildQuery, parseNumber, parseString, requestJson } from "../shared";

const RESOURCE_DASHBOARD_BASE_PATH = "/manager/v1/resource/dashboard";

export interface ResourceDashboardFilterCondition {
  clusterUuid: string;
  clusterName: string;
  projectId: number;
  projectName: string;
  filteredClusterCount: number;
  filteredProjectCount: number;
  filteredWorkspaceCount: number;
}

export interface ResourceDashboardSummaryCards {
  clusterTotalCount: number;
  projectTotalCount: number;
  workspaceTotalCount: number;
  cpuPhysical: number;
  cpuLimit: number;
  cpuPhysicalRate: number;
  memPhysical: number;
  memLimit: number;
  memPhysicalRate: number;
  gpuPhysical: number;
  gpuLimit: number;
  gpuPhysicalRate: number;
  storagePhysical: number;
  storageLimit: number;
  storagePhysicalRate: number;
  podPhysical: number;
  podLimit: number;
  podPhysicalRate: number;
}

export interface ResourceOverviewItem {
  physical: number;
  limit: number;
  capacity: number;
  unit: string;
}

export interface ResourceDashboardAllocationOverview {
  cpu: ResourceOverviewItem;
  mem: ResourceOverviewItem;
  gpu: ResourceOverviewItem;
  storage: ResourceOverviewItem;
  pod: ResourceOverviewItem;
}

export interface ResourceDashboardOversellSavingItem {
  limitTotal: number;
  capacityTotal: number;
  savingAmount: number;
  savingRate: number;
  unit: string;
}

export interface ResourceDashboardSummary {
  currentFilter: ResourceDashboardFilterCondition;
  summaryCards: ResourceDashboardSummaryCards;
  allocationOverview: ResourceDashboardAllocationOverview;
  oversellSavings: {
    cpu: ResourceDashboardOversellSavingItem;
    mem: ResourceDashboardOversellSavingItem;
    gpu: ResourceDashboardOversellSavingItem;
  };
}

export interface ResourceDashboardSummaryRequest {
  clusterUuid?: string;
  projectId?: number;
}

function normalizeOverviewItem(payload: unknown): ResourceOverviewItem {
  const item = (payload ?? {}) as Record<string, unknown>;

  return {
    physical: parseNumber(item.physical),
    limit: parseNumber(item.limit),
    capacity: parseNumber(item.capacity),
    unit: parseString(item.unit)
  };
}

function normalizeSavingItem(payload: unknown): ResourceDashboardOversellSavingItem {
  const item = (payload ?? {}) as Record<string, unknown>;

  return {
    limitTotal: parseNumber(item.limitTotal),
    capacityTotal: parseNumber(item.capacityTotal),
    savingAmount: parseNumber(item.savingAmount),
    savingRate: parseNumber(item.savingRate),
    unit: parseString(item.unit)
  };
}

export async function getResourceDashboardSummaryApi(
  params: ResourceDashboardSummaryRequest = {}
): Promise<ResourceDashboardSummary> {
  const query = buildQuery({
    clusterUuid: params.clusterUuid?.trim() || undefined,
    projectId: params.projectId
  });

  const response = await requestJson<Record<string, unknown>>(
    `${RESOURCE_DASHBOARD_BASE_PATH}/summary${query}`,
    {
      method: "GET"
    }
  );

  const currentFilter = (response.currentFilter ?? {}) as Record<string, unknown>;
  const summaryCards = (response.summaryCards ?? {}) as Record<string, unknown>;
  const allocationOverview = (response.allocationOverview ?? {}) as Record<string, unknown>;
  const oversellSavings = (response.oversellSavings ?? {}) as Record<string, unknown>;

  return {
    currentFilter: {
      clusterUuid: parseString(currentFilter.clusterUuid),
      clusterName: parseString(currentFilter.clusterName),
      projectId: parseNumber(currentFilter.projectId),
      projectName: parseString(currentFilter.projectName),
      filteredClusterCount: parseNumber(currentFilter.filteredClusterCount),
      filteredProjectCount: parseNumber(currentFilter.filteredProjectCount),
      filteredWorkspaceCount: parseNumber(currentFilter.filteredWorkspaceCount)
    },
    summaryCards: {
      clusterTotalCount: parseNumber(summaryCards.clusterTotalCount),
      projectTotalCount: parseNumber(summaryCards.projectTotalCount),
      workspaceTotalCount: parseNumber(summaryCards.workspaceTotalCount),
      cpuPhysical: parseNumber(summaryCards.cpuPhysical),
      cpuLimit: parseNumber(summaryCards.cpuLimit),
      cpuPhysicalRate: parseNumber(summaryCards.cpuPhysicalRate),
      memPhysical: parseNumber(summaryCards.memPhysical),
      memLimit: parseNumber(summaryCards.memLimit),
      memPhysicalRate: parseNumber(summaryCards.memPhysicalRate),
      gpuPhysical: parseNumber(summaryCards.gpuPhysical),
      gpuLimit: parseNumber(summaryCards.gpuLimit),
      gpuPhysicalRate: parseNumber(summaryCards.gpuPhysicalRate),
      storagePhysical: parseNumber(summaryCards.storagePhysical),
      storageLimit: parseNumber(summaryCards.storageLimit),
      storagePhysicalRate: parseNumber(summaryCards.storagePhysicalRate),
      podPhysical: parseNumber(summaryCards.podPhysical),
      podLimit: parseNumber(summaryCards.podLimit),
      podPhysicalRate: parseNumber(summaryCards.podPhysicalRate)
    },
    allocationOverview: {
      cpu: normalizeOverviewItem(allocationOverview.cpu),
      mem: normalizeOverviewItem(allocationOverview.mem),
      gpu: normalizeOverviewItem(allocationOverview.gpu),
      storage: normalizeOverviewItem(allocationOverview.storage),
      pod: normalizeOverviewItem(allocationOverview.pod)
    },
    oversellSavings: {
      cpu: normalizeSavingItem(oversellSavings.cpu),
      mem: normalizeSavingItem(oversellSavings.mem),
      gpu: normalizeSavingItem(oversellSavings.gpu)
    }
  };
}

/** 集群资源排行单条（/ranking/cluster），与 manager-api `ClusterRankingItem` 一致 */
export interface ClusterResourceRankingItem {
  rank: number;
  clusterUuid: string;
  clusterName: string;
  environment: string;
  region: string;
  provider: string;
  projectCount: number;
  workspaceCount: number;
  cpuCapacity: number;
  cpuLimit: number;
  cpuAllocated: number;
  cpuAllocationRate: number;
  memCapacityGib: number;
  memLimitGib: number;
  memAllocatedGib: number;
  memAllocationRate: number;
  gpuCapacity: number;
  gpuLimit: number;
  gpuAllocated: number;
  gpuAllocationRate: number;
  storageLimitGib: number;
  storageAllocatedGib: number;
  storageAllocationRate: number;
  podsLimit: number;
  podsAllocated: number;
  podsAllocationRate: number;
  overallUsageRate: number;
}

export interface GetClusterResourceRankingRequest {
  projectId?: number;
  /** 逗号+方向，如 cpuCapacity:desc；不依赖排序时由前端自算分 */
  sortBy?: string;
  topN?: number;
}

function normalizeClusterRankingItem(payload: unknown): ClusterResourceRankingItem {
  const r = (payload ?? {}) as Record<string, unknown>;
  return {
    rank: parseNumber(r.rank),
    clusterUuid: parseString(r.clusterUuid),
    clusterName: parseString(r.clusterName),
    environment: parseString(r.environment),
    region: parseString(r.region),
    provider: parseString(r.provider),
    projectCount: parseNumber(r.projectCount),
    workspaceCount: parseNumber(r.workspaceCount),
    cpuCapacity: parseNumber(r.cpuCapacity),
    cpuLimit: parseNumber(r.cpuLimit),
    cpuAllocated: parseNumber(r.cpuAllocated),
    cpuAllocationRate: parseNumber(r.cpuAllocationRate),
    memCapacityGib: parseNumber(r.memCapacityGib),
    memLimitGib: parseNumber(r.memLimitGib),
    memAllocatedGib: parseNumber(r.memAllocatedGib),
    memAllocationRate: parseNumber(r.memAllocationRate),
    gpuCapacity: parseNumber(r.gpuCapacity),
    gpuLimit: parseNumber(r.gpuLimit),
    gpuAllocated: parseNumber(r.gpuAllocated),
    gpuAllocationRate: parseNumber(r.gpuAllocationRate),
    storageLimitGib: parseNumber(r.storageLimitGib),
    storageAllocatedGib: parseNumber(r.storageAllocatedGib),
    storageAllocationRate: parseNumber(r.storageAllocationRate),
    podsLimit: parseNumber(r.podsLimit),
    podsAllocated: parseNumber(r.podsAllocated),
    podsAllocationRate: parseNumber(r.podsAllocationRate),
    overallUsageRate: parseNumber(r.overallUsageRate)
  };
}

/**
 * 集群资源排行。配合项目 cluster 列表时可计算「调度分」（余量等）。
 * 与 onec_cluster_energy_profile 的融合可后续在接口中补充字段，前端会透传并参与展示。
 */
export async function getClusterResourceRankingApi(
  params: GetClusterResourceRankingRequest = {}
): Promise<ClusterResourceRankingItem[]> {
  const query = buildQuery({
    projectId: params.projectId,
    sortBy: params.sortBy?.trim() || undefined,
    topN: params.topN
  });
  const response = await requestJson<Record<string, unknown>>(
    `${RESOURCE_DASHBOARD_BASE_PATH}/ranking/cluster${query}`,
    { method: "GET" }
  );
  const items = (response?.items as unknown) ?? [];
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((i) => normalizeClusterRankingItem(i));
}
