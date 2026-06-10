import { parseNumber, requestJson } from '../shared'
import type { RlSchedulePlan } from '@/scheduling/twoLevelRl'

const SCHEDULE_BASE_PATH = '/manager/v1/schedule'

export interface BuildRlSchedulePlanPayload {
  projectId?: number
  workspaceId: number
  scheduleMode?: 'cost' | 'performance' | 'balanced'
  service: {
    serviceName?: string
    replicas: number
    cpuRequestCores: number
    memoryRequestGiB: number
    gpuRequest: number
  }
}

interface BackendClusterCandidate {
  projectClusterId?: unknown
  targetWorkspaceId?: unknown
  namespace?: string
  workspaceName?: string
  clusterUuid?: string
  clusterName?: string
  region?: string
  authorized?: boolean
  status?: string
  cpuFreeCores?: unknown
  memoryFreeGiB?: unknown
  gpuFree?: unknown
  realtimeResourceReady?: boolean
  realtimeResourceError?: string
  gridPricePerKwh?: unknown
  hasEnergyProfile?: boolean
  storageSoc?: unknown
  hasStorageSoc?: boolean
  hasCurrentPower?: boolean
  currentPowerW?: unknown
  actionMasked?: boolean
  maskReason?: string
  selected?: boolean
}

interface BackendNodeCandidate {
  clusterUuid?: string
  nodeName?: string
  nodeStatus?: string
  unschedulable?: unknown
  cpuFreeCores?: unknown
  memoryFreeGiB?: unknown
  gpuFree?: unknown
  podsFree?: unknown
  hasCurrentPower?: boolean
  currentPowerW?: unknown
  actionMasked?: boolean
  maskReason?: string
  assignedReplicas?: unknown
}

interface BackendPlacement {
  replicaName?: string
  nodeName?: string
}

interface BackendRlSchedulePlan {
  planId?: string
  modelVersion?: string
  targetCluster?: BackendClusterCandidate
  clusterCandidates?: BackendClusterCandidate[]
  nodeCandidates?: BackendNodeCandidate[]
  placements?: BackendPlacement[]
  reason?: string
  executable?: boolean
}

export async function buildRlSchedulePlanApi(
  payload: BuildRlSchedulePlanPayload
): Promise<RlSchedulePlan> {
  const response = await requestJson<BackendRlSchedulePlan>(`${SCHEDULE_BASE_PATH}/rl-plan`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return normalizeBackendPlan(response)
}

function normalizeBackendPlan(raw: BackendRlSchedulePlan): RlSchedulePlan {
  const clusterCandidates = (raw.clusterCandidates || []).map(normalizeClusterCandidate)
  const targetCluster = raw.targetCluster?.clusterUuid
    ? normalizeClusterCandidate(raw.targetCluster)
    : clusterCandidates.find((item) => item.selected) || null

  return {
    planId: raw.planId || `rl-plan-${Date.now()}`,
    modelVersion: raw.modelVersion || 'rl-policy-backend',
    targetProjectClusterId: targetCluster?.projectClusterId,
    targetWorkspaceId: targetCluster?.targetWorkspaceId,
    namespace: targetCluster?.namespace,
    targetCluster,
    clusterCandidates,
    nodeCandidates: (raw.nodeCandidates || []).map(normalizeNodeCandidate),
    placements: (raw.placements || []).map((item) => ({
      replicaName: item.replicaName || '',
      nodeName: item.nodeName || ''
    })),
    reason: raw.reason || '',
    executable: Boolean(raw.executable)
  }
}

function normalizeClusterCandidate(raw: BackendClusterCandidate) {
  const hasEnergyProfile = raw.hasEnergyProfile !== false
  const hasStorageSoc = raw.hasStorageSoc !== false
  return {
    projectClusterId: parseNumber(raw.projectClusterId, 0),
    targetWorkspaceId: parseNumber(raw.targetWorkspaceId, 0),
    namespace: raw.namespace || '',
    workspaceName: raw.workspaceName || '',
    uuid: raw.clusterUuid || '',
    name: raw.clusterName || raw.clusterUuid || '未命名集群',
    region: raw.region || raw.clusterUuid || '',
    authorized: raw.authorized !== false,
    status: normalizeClusterStatus(raw.status),
    cpuFreeCores: parseNumber(raw.cpuFreeCores, 0),
    memoryFreeGiB: parseNumber(raw.memoryFreeGiB, 0),
    gpuFree: parseNumber(raw.gpuFree, 0),
    realtimeResourceReady: raw.realtimeResourceReady !== false,
    realtimeResourceError: raw.realtimeResourceError || '',
    electricityPrice: hasEnergyProfile ? parseNumber(raw.gridPricePerKwh, 0) : 0,
    hasEnergyProfile,
    batterySoc: hasStorageSoc ? parseNumber(raw.storageSoc, 0) : Number.NaN,
    hasStorageSoc,
    currentPowerW: parseCollectedPower(raw.hasCurrentPower, raw.currentPowerW),
    requiredCpuCores: 0,
    requiredMemoryGiB: 0,
    requiredGpu: 0,
    actionMasked: Boolean(raw.actionMasked),
    maskReason: raw.maskReason || '可作为跨集群动作候选',
    selected: Boolean(raw.selected)
  }
}

function normalizeNodeCandidate(raw: BackendNodeCandidate) {
  const unschedulable = parseNumber(raw.unschedulable, 0)
  return {
    id: raw.nodeName || '',
    clusterUuid: raw.clusterUuid || '',
    name: raw.nodeName || '未命名节点',
    status: normalizeNodeStatus(raw.nodeStatus, unschedulable),
    cpuCapacityCores: Number.NaN,
    cpuFreeCores: parseNumber(raw.cpuFreeCores, Number.NaN),
    memoryFreeGiB: parseNumber(raw.memoryFreeGiB, Number.NaN),
    gpuFree: parseNumber(raw.gpuFree, Number.NaN),
    currentPowerW: parseCollectedPower(raw.hasCurrentPower, raw.currentPowerW),
    actionMasked: Boolean(raw.actionMasked),
    maskReason: raw.maskReason || '可作为节点动作候选',
    assignedReplicas: parseNumber(raw.assignedReplicas, 0)
  }
}

function normalizeClusterStatus(status?: string) {
  const normalized = String(status || '').trim().toLowerCase()
  if (!normalized || ['1', 'normal', 'healthy', 'ready'].includes(normalized)) {
    return 'healthy' as const
  }
  if (['offline', 'down', 'unreachable'].includes(normalized)) {
    return 'offline' as const
  }
  return 'warning' as const
}

function normalizeNodeStatus(status?: string, unschedulable = 0) {
  if (unschedulable === 2) return 'Unschedulable' as const
  const normalized = String(status || '').trim().toLowerCase()
  if (['ready', 'normal', 'healthy'].includes(normalized)) return 'Ready' as const
  return 'NotReady' as const
}

function parseCollectedPower(collected?: boolean, value?: unknown): number | null {
  if (!collected) return null
  const parsed = parseNumber(value, Number.NaN)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}
