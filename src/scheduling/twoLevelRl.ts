export type ClusterStatus = 'healthy' | 'warning' | 'offline'
export type NodeStatus = 'Ready' | 'NotReady' | 'Unschedulable'

export interface ServiceDemand {
  serviceName: string
  image?: string
  workspaceName?: string
  replicas: number
  cpuRequestCores: number
  memoryRequestGiB: number
  gpuRequest: number
}

export interface ClusterCandidate {
  projectClusterId?: number
  targetWorkspaceId?: number
  namespace?: string
  workspaceName?: string
  uuid: string
  name: string
  region: string
  authorized: boolean
  status: ClusterStatus
  cpuFreeCores: number
  memoryFreeGiB: number
  gpuFree: number
  realtimeResourceReady?: boolean
  realtimeResourceError?: string
  electricityPrice: number
  hasEnergyProfile?: boolean
  batterySoc: number
  hasStorageSoc?: boolean
  currentPowerW: number | null
  powerLimitW?: number
}

export interface NodeCandidate {
  id: string
  clusterUuid: string
  name: string
  status: NodeStatus
  cpuCapacityCores: number
  cpuFreeCores: number
  cpuUsage?: number
  memoryFreeGiB: number
  gpuFree: number
  currentPowerW: number | null
  powerLimitW?: number
  idlePowerW?: number
  maxPowerW?: number
}

export interface ClusterDecision extends ClusterCandidate {
  requiredCpuCores: number
  requiredMemoryGiB: number
  requiredGpu: number
  actionMasked: boolean
  maskReason: string
  selected: boolean
}

export interface NodeDecision extends NodeCandidate {
  actionMasked: boolean
  maskReason: string
  assignedReplicas: number
}

export interface ReplicaPlacement {
  replicaName: string
  nodeName: string
}

export interface RlSchedulePlan {
  planId: string
  modelVersion: string
  targetProjectClusterId?: number
  targetWorkspaceId?: number
  namespace?: string
  targetCluster: ClusterDecision | null
  clusterCandidates: ClusterDecision[]
  nodeCandidates: NodeDecision[]
  placements: ReplicaPlacement[]
  reason: string
  executable: boolean
}

const SOC_MIN = 20
const MODEL_VERSION = 'rl-policy-mock-v0.1'

function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function makePlanId(): string {
  return `rl-plan-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function statusLabel(status: ClusterStatus | NodeStatus): string {
  if (status === 'healthy') return '正常'
  if (status === 'warning') return '异常'
  if (status === 'offline') return '离线'
  if (status === 'Ready') return 'Ready'
  if (status === 'NotReady') return 'NotReady'
  return '不可调度'
}

function buildClusterDecision(cluster: ClusterCandidate, demand: ServiceDemand): ClusterDecision {
  const requiredCpuCores = demand.cpuRequestCores * demand.replicas
  const requiredMemoryGiB = demand.memoryRequestGiB * demand.replicas
  const requiredGpu = demand.gpuRequest * demand.replicas

  let maskReason = ''
  if (!cluster.authorized) {
    maskReason = '当前工作空间未绑定该集群'
  } else if (cluster.status !== 'healthy') {
    maskReason = `集群状态${statusLabel(cluster.status)}`
  } else if (cluster.cpuFreeCores < requiredCpuCores) {
    maskReason = 'CPU 余量不足'
  } else if (cluster.memoryFreeGiB < requiredMemoryGiB) {
    maskReason = '内存余量不足'
  } else if (cluster.gpuFree < requiredGpu) {
    maskReason = 'GPU 余量不足'
  } else if (cluster.batterySoc < SOC_MIN) {
    maskReason = '储能 SOC 低于安全阈值'
  }

  return {
    ...cluster,
    requiredCpuCores: round(requiredCpuCores),
    requiredMemoryGiB: round(requiredMemoryGiB),
    requiredGpu: round(requiredGpu),
    actionMasked: Boolean(maskReason),
    maskReason: maskReason || '可作为跨集群动作候选',
    selected: false
  }
}

function selectTargetCluster(candidates: ClusterDecision[]): ClusterDecision | null {
  const feasible = candidates.filter((cluster) => !cluster.actionMasked)
  if (!feasible.length) return null

  const selected = [...feasible].sort((a, b) => {
    if (a.electricityPrice !== b.electricityPrice) {
      return a.electricityPrice - b.electricityPrice
    }
    if (b.batterySoc !== a.batterySoc) {
      return b.batterySoc - a.batterySoc
    }
    if (b.cpuFreeCores !== a.cpuFreeCores) {
      return b.cpuFreeCores - a.cpuFreeCores
    }
    return b.memoryFreeGiB - a.memoryFreeGiB
  })[0]

  return selected ?? null
}

function evaluateNodeForReplica(node: NodeCandidate, demand: ServiceDemand): {
  actionMasked: boolean
  maskReason: string
} {
  let maskReason = ''
  if (node.status !== 'Ready') {
    maskReason = `节点状态${statusLabel(node.status)}`
  } else if (node.cpuFreeCores < demand.cpuRequestCores) {
    maskReason = 'CPU 余量不足'
  } else if (node.memoryFreeGiB < demand.memoryRequestGiB) {
    maskReason = '内存余量不足'
  } else if (node.gpuFree < demand.gpuRequest) {
    maskReason = 'GPU 余量不足'
  }

  return {
    actionMasked: Boolean(maskReason),
    maskReason: maskReason || '可作为节点动作候选'
  }
}

function placeReplicas(
  targetCluster: ClusterDecision,
  nodes: NodeCandidate[],
  demand: ServiceDemand
): { nodes: NodeDecision[]; placements: ReplicaPlacement[]; reason: string; executable: boolean } {
  const mutableNodes = nodes
    .filter((node) => node.clusterUuid === targetCluster.uuid)
    .map((node) => ({ ...node }))

  const placements: ReplicaPlacement[] = []
  const assignedCounts = new Map<string, number>()

  for (let index = 0; index < demand.replicas; index += 1) {
    const feasible = mutableNodes
      .map((node) => ({
        node,
        evaluation: evaluateNodeForReplica(node, demand)
      }))
      .filter((item) => !item.evaluation.actionMasked)
      .sort((a, b) => {
        const aAssigned = assignedCounts.get(a.node.name) ?? 0
        const bAssigned = assignedCounts.get(b.node.name) ?? 0
        if (aAssigned !== bAssigned) return aAssigned - bAssigned

        const aPower = a.node.currentPowerW ?? Number.POSITIVE_INFINITY
        const bPower = b.node.currentPowerW ?? Number.POSITIVE_INFINITY
        if (aPower !== bPower) return aPower - bPower

        if (b.node.cpuFreeCores !== a.node.cpuFreeCores) {
          return b.node.cpuFreeCores - a.node.cpuFreeCores
        }
        return b.node.memoryFreeGiB - a.node.memoryFreeGiB
      })

    const best = feasible[0]
    if (!best) {
      return {
        nodes: buildNodeDecisions(mutableNodes, demand, assignedCounts),
        placements,
        reason: `已放置 ${placements.length}/${demand.replicas} 个副本，剩余副本没有可行动作候选`,
        executable: false
      }
    }

    const node = best.node
    placements.push({
      replicaName: `${demand.serviceName}-${index}`,
      nodeName: node.name
    })
    assignedCounts.set(node.name, (assignedCounts.get(node.name) ?? 0) + 1)
    node.cpuFreeCores = round(node.cpuFreeCores - demand.cpuRequestCores)
    node.memoryFreeGiB = round(node.memoryFreeGiB - demand.memoryRequestGiB)
    node.gpuFree = round(node.gpuFree - demand.gpuRequest)
  }

  return {
    nodes: buildNodeDecisions(mutableNodes, demand, assignedCounts),
    placements,
    reason: `RL 策略选择 ${targetCluster.name}，完成 ${placements.length} 个副本的节点分布`,
    executable: true
  }
}

function buildNodeDecisions(
  nodes: NodeCandidate[],
  demand: ServiceDemand,
  assignedCounts: Map<string, number>
): NodeDecision[] {
  return nodes
    .map((node) => ({
      ...node,
      ...evaluateNodeForReplica(node, demand),
      assignedReplicas: assignedCounts.get(node.name) ?? 0
    }))
    .sort((a, b) => {
      if (a.assignedReplicas !== b.assignedReplicas) {
        return b.assignedReplicas - a.assignedReplicas
      }
      if (a.actionMasked !== b.actionMasked) return a.actionMasked ? 1 : -1
      return a.name.localeCompare(b.name)
    })
}

export function buildTwoLevelRlPlan(
  demand: ServiceDemand,
  clusters: ClusterCandidate[],
  nodes: NodeCandidate[]
): RlSchedulePlan {
  const initialClusterCandidates = clusters.map((cluster) => buildClusterDecision(cluster, demand))
  const selectedCluster = selectTargetCluster(initialClusterCandidates)
  const clusterCandidates = initialClusterCandidates
    .map((cluster) => ({
      ...cluster,
      selected: selectedCluster?.uuid === cluster.uuid
    }))
    .sort((a, b) => {
      if (a.selected !== b.selected) return a.selected ? -1 : 1
      if (a.actionMasked !== b.actionMasked) return a.actionMasked ? 1 : -1
      return a.name.localeCompare(b.name)
    })

  if (!selectedCluster) {
    return {
      planId: makePlanId(),
      modelVersion: MODEL_VERSION,
      targetCluster: null,
      clusterCandidates,
      nodeCandidates: [],
      placements: [],
      reason: '没有满足授权、资源和储能 SOC 约束的候选集群',
      executable: false
    }
  }

  const targetCluster = clusterCandidates.find((cluster) => cluster.uuid === selectedCluster.uuid) ?? null
  if (!targetCluster) {
    return {
      planId: makePlanId(),
      modelVersion: MODEL_VERSION,
      targetCluster: null,
      clusterCandidates,
      nodeCandidates: [],
      placements: [],
      reason: 'RL 策略未返回有效目标集群',
      executable: false
    }
  }

  const placementResult = placeReplicas(targetCluster, nodes, demand)

  return {
    planId: makePlanId(),
    modelVersion: MODEL_VERSION,
    targetProjectClusterId: targetCluster.projectClusterId,
    targetWorkspaceId: targetCluster.targetWorkspaceId,
    namespace: targetCluster.namespace,
    targetCluster,
    clusterCandidates,
    nodeCandidates: placementResult.nodes,
    placements: placementResult.placements,
    reason: placementResult.reason,
    executable: placementResult.executable
  }
}
