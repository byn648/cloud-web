<template>
  <div class="rl-plan">
    <div class="plan-head">
      <div class="plan-title">
        <div class="eyebrow">电-储-算感知分层强化学习调度</div>
        <ElTag v-if="activeStage === 0" type="success" effect="plain" size="small">
          {{ scheduleModeLabel }}模式
        </ElTag>
      </div>
      <ElDropdown
        v-if="activeStage === 0"
        trigger="click"
        :disabled="planning"
        @command="handleRegenerateMode"
      >
        <ElButton :icon="RefreshCw" :loading="planning">
          选择调度模式
        </ElButton>
        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem
              v-for="option in scheduleModeOptions"
              :key="option.value"
              :command="option.value"
            >
              {{ option.label }}
            </ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>
    </div>

    <div class="stage-tabs" :style="stageGridStyle">
      <button
        v-for="step in visibleStageSteps"
        :key="step.index"
        class="stage-tab"
        :class="{ active: activeStage === step.index, done: activeStage > step.index }"
        type="button"
        @click="activeStage = step.index"
      >
        <span>{{ step.index + 1 }}</span>
        <strong>{{ step.title }}</strong>
      </button>
    </div>

    <div class="service-strip">
      <div class="service-name">
        <Box :size="18" />
        <div>
          <span>调度对象</span>
          <strong>{{ serviceDemand.serviceName }}</strong>
        </div>
      </div>
      <div>
        <span>镜像</span>
        <strong>{{ serviceDemand.image || '未填写' }}</strong>
      </div>
      <div>
        <span>副本</span>
        <strong>{{ serviceDemand.replicas }}</strong>
      </div>
      <div>
        <span>资源请求</span>
        <strong>
          {{ serviceDemand.cpuRequestCores }}C /
          {{ serviceDemand.memoryRequestGiB }}Gi /
          {{ serviceDemand.gpuRequest }}GPU
        </strong>
      </div>
    </div>

    <div class="result-banner" :class="{ warning: !plan.executable }">
      <CheckCircle2 v-if="plan.executable" :size="18" />
      <AlertTriangle v-else :size="18" />
      <span>{{ bannerText }}</span>
    </div>

    <section v-show="activeStage === 0" class="plan-section">
      <div class="section-head">
        <div>
          <Network :size="18" />
          <span>跨集群调度输入状态</span>
        </div>
        <ElTag type="primary" effect="plain">RL 动作：选择目标集群</ElTag>
      </div>

      <ElTable :data="plan.clusterCandidates" class="schedule-table">
        <ElTableColumn label="集群" min-width="210" fixed="left">
          <template #default="{ row }">
            <div class="name-cell">
              <div>
                <strong>{{ row.name }}</strong>
              </div>
              <ElTag v-if="row.selected" type="success" size="small">目标集群</ElTag>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="平台状态" width="110">
          <template #default="{ row }">
            <ElTag :type="row.status === 'healthy' ? 'success' : 'warning'" size="small">
              {{ clusterStatusText(row.status) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="集群 CPU 余量" width="135">
          <template #default="{ row }">
            <strong>{{ formatRealtimeResource(row.cpuFreeCores, 'C', row.realtimeResourceReady) }}</strong>
          </template>
        </ElTableColumn>
        <ElTableColumn label="集群内存余量" width="140">
          <template #default="{ row }">
            <strong>{{ formatRealtimeResource(row.memoryFreeGiB, 'Gi', row.realtimeResourceReady) }}</strong>
          </template>
        </ElTableColumn>
        <ElTableColumn label="集群 GPU 余量" width="135">
          <template #default="{ row }">
            <strong>{{ formatRealtimeResource(row.gpuFree, '', row.realtimeResourceReady) }}</strong>
          </template>
        </ElTableColumn>
        <ElTableColumn label="当前电价" width="130">
          <template #default="{ row }">
            <div class="metric-cell">
              <template v-if="hasCollectedMetric(row.electricityPrice, row.hasEnergyProfile)">
                <strong>{{ formatElectricityPrice(row.electricityPrice, row.hasEnergyProfile) }}</strong>
                <span>元/kWh</span>
              </template>
              <span v-else class="missing-value">未采集</span>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="储能 SOC" width="135">
          <template #default="{ row }">
            <template v-if="hasCollectedMetric(row.batterySoc, row.hasStorageSoc)">
              <ElProgress
                :percentage="normalizePercentage(row.batterySoc)"
                :stroke-width="8"
                :show-text="false"
                :status="row.batterySoc < 20 ? 'exception' : 'success'"
              />
              <span class="progress-text">{{ formatSoc(row.batterySoc) }}</span>
            </template>
            <span v-else class="missing-value">未采集</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="可选状态 / 过滤原因" min-width="210" fixed="right">
          <template #default="{ row }">
            <ElTag
              :title="row.realtimeResourceError || row.maskReason"
              :type="row.actionMasked ? 'danger' : 'success'"
              size="small"
            >
              {{ row.actionMasked ? row.maskReason : row.selected ? 'RL 已选择' : '可作为动作候选' }}
            </ElTag>
          </template>
        </ElTableColumn>
      </ElTable>
    </section>

    <section v-show="activeStage === 1" class="plan-section">
      <div class="section-head">
        <div>
          <Server :size="18" />
          <span>集群内调度输入状态</span>
        </div>
        <ElTag type="primary" effect="plain">
          目标集群：{{ plan.targetCluster?.name || '暂无' }}
        </ElTag>
      </div>

      <ElTable
        :data="plan.nodeCandidates"
        class="schedule-table"
        empty-text="请先得到可行目标集群"
      >
        <ElTableColumn label="节点" min-width="220" fixed="left">
          <template #default="{ row }">
            <div class="name-cell">
              <div>
                <strong>{{ row.name }}</strong>
              </div>
              <ElTag v-if="row.assignedReplicas > 0" type="success" size="small">
                {{ row.assignedReplicas }} 副本
              </ElTag>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="节点状态" width="115">
          <template #default="{ row }">
            <ElTag :type="row.status === 'Ready' ? 'success' : 'danger'" size="small">
              {{ row.status }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="节点 CPU 余量" width="135">
          <template #default="{ row }">
            <strong>{{ formatResource(row.cpuFreeCores, 'C') }}</strong>
          </template>
        </ElTableColumn>
        <ElTableColumn label="节点内存余量" width="140">
          <template #default="{ row }">
            <strong>{{ formatResource(row.memoryFreeGiB, 'Gi') }}</strong>
          </template>
        </ElTableColumn>
        <ElTableColumn label="节点 GPU 余量" width="135">
          <template #default="{ row }">
            <strong>{{ formatResource(row.gpuFree, '') }}</strong>
          </template>
        </ElTableColumn>
        <ElTableColumn label="当前功率" width="125">
          <template #default="{ row }">
            <strong v-if="hasCollectedMetric(row.currentPowerW)">{{ formatPower(row.currentPowerW) }}</strong>
            <span v-else class="missing-value">未采集</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="可选状态 / 过滤原因" min-width="210">
          <template #default="{ row }">
            <ElTag :title="row.maskReason" :type="row.actionMasked ? 'danger' : 'success'" size="small">
              {{ row.actionMasked ? row.maskReason : '可作为节点动作候选' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="RL 放置结果" width="130" fixed="right">
          <template #default="{ row }">
            <ElTag v-if="row.assignedReplicas > 0" type="success" size="small">
              {{ row.assignedReplicas }} 个副本
            </ElTag>
            <span v-else class="muted">未放置</span>
          </template>
        </ElTableColumn>
      </ElTable>
    </section>

    <section v-show="activeStage === 2" class="plan-section">
      <div class="section-head">
        <div>
          <GitBranch :size="18" />
          <span>调度计划输出</span>
        </div>
        <ElTag type="success" effect="plain">{{ plan.modelVersion }}</ElTag>
      </div>

      <div class="execution-card">
        <div class="execution-grid">
          <div>
            <span>目标集群</span>
            <strong>{{ plan.targetCluster?.name || '暂无可行集群' }}</strong>
          </div>
          <div>
            <span>执行调度器</span>
            <strong>green-rl-scheduler</strong>
          </div>
          <div>
            <span>模型版本</span>
            <strong>{{ plan.modelVersion }}</strong>
          </div>
          <div>
            <span>调度计划 ID</span>
            <strong>{{ plan.planId }}</strong>
          </div>
        </div>

        <div v-if="plan.placements.length" class="placement-panel">
          <div class="placement-title">副本落点</div>
          <div class="placement-list">
            <div
              v-for="placement in plan.placements"
              :key="placement.replicaName"
              class="placement-item"
            >
              <div class="placement-side">
                <span>副本</span>
                <strong class="replica-name">{{ placement.replicaName }}</strong>
              </div>
              <span class="placement-arrow">→</span>
              <div class="placement-side target">
                <span>节点</span>
                <strong class="node-name">{{ placement.nodeName }}</strong>
              </div>
            </div>
          </div>
        </div>
        <ElEmpty v-else description="暂无副本分布" :image-size="64" />
      </div>
    </section>

    <div class="step-actions">
      <ElButton :disabled="activeStage === 0" @click="prevStage">上一步</ElButton>
      <ElButton v-if="activeStage < 2" type="primary" @click="nextStage">下一步</ElButton>
      <ElButton v-else type="success" :disabled="!plan.executable" @click="useCurrentPlan">
        使用该调度计划
      </ElButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, inject, ref, watch, type Ref } from 'vue'
  import { useRoute } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import {
    AlertTriangle,
    Box,
    CheckCircle2,
    GitBranch,
    Network,
    RefreshCw,
    Server
  } from 'lucide-vue-next'
  import { useContainersStore, useMetadataStore, useSchedulingStore } from '@/store/workload'
  import { useDeploymentStore } from '@/store/workload/deployment'
  import { getCpuInCore, getMemoryInBytes } from '@/utils/resource'
  import {
    buildTwoLevelRlPlan,
    type ClusterCandidate,
    type NodeCandidate,
    type RlSchedulePlan
  } from '@/scheduling/twoLevelRl'
  import { mockWorkspaceClusters, mockWorkspaceNodes } from '@/scheduling/mockSchedulingSnapshot'
  import { buildRlSchedulePlanApi } from '@/api/manager/schedule'
  import { isDemoCreateRoute } from '@/views/workspace/application-demo/create/demoWorkloadBridge'
  import {
    getProjectClusterApi,
    getProjectWorkspaceApi,
    searchProjectClusterApi,
    searchProjectWorkspaceApi,
    type ProjectCluster,
    type ProjectWorkspace
  } from '@/api/manager/project'
  import { getNodeListApi } from '@/api/manager/node'

  const emit = defineEmits<{
    change: []
    next: []
  }>()

  const metadataStore = useMetadataStore()
  const containersStore = useContainersStore()
  const deploymentStore = useDeploymentStore()
  const schedulingStore = useSchedulingStore()
  const route = useRoute()
  const demoMode = computed(() => isDemoCreateRoute(route))
  const activeStage = ref(0)
  const planning = ref(false)
  const planSource = ref<'backend' | 'mock' | 'empty'>(demoMode.value ? 'mock' : 'empty')
  type ScheduleMode = 'cost' | 'performance' | 'balanced'

  const scheduleModeOptions: Array<{ value: ScheduleMode; label: string }> = [
    { value: 'cost', label: '成本优先' },
    { value: 'performance', label: '性能优先' },
    { value: 'balanced', label: '均衡' }
  ]
  const scheduleMode = ref<ScheduleMode>('balanced')
  const scheduleModeLabel = computed(
    () => scheduleModeOptions.find((option) => option.value === scheduleMode.value)?.label || '均衡'
  )

  const workspaceIdRef = inject<Ref<number>>('workspaceId')
  const projectIdRef = inject<Ref<number>>('appProjectId')

  const stageSteps = [
    { index: 0, title: '跨集群调度' },
    { index: 1, title: '集群内调度' },
    { index: 2, title: '调度计划' }
  ]

  const visibleStageSteps = computed(() =>
    stageSteps.filter((step) => step.index <= activeStage.value)
  )

  const stageGridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${visibleStageSteps.value.length}, minmax(0, 1fr))`
  }))

  const stageTitle = computed(() => {
    if (activeStage.value === 0) return '跨集群调度：查看集群输入状态'
    if (activeStage.value === 1) return '集群内调度：查看节点输入状态'
    return '调度计划：确认 RL 输出'
  })

  const bannerText = computed(() => {
    if (activeStage.value === 0) {
      return plan.value.targetCluster
        ? `RL 策略已选择 ${plan.value.targetCluster.name} 作为目标集群`
        : plan.value.reason
    }
    return plan.value.reason
  })

  const mainContainers = computed(() =>
    containersStore.mainContainers.length
      ? containersStore.mainContainers
      : containersStore.allContainers
  )

  const firstContainer = computed(() => mainContainers.value[0])

  const serviceDemand = computed(() => {
    const resources = mainContainers.value.reduce(
      (acc, container) => {
        const requests = container.resources?.requests || {}
        acc.cpu += getCpuInCore(requests.cpu as string | number | undefined)
        acc.memoryGiB += getMemoryInBytes(requests.memory as string | number | undefined) / 1024 ** 3
        const gpu =
          requests['nvidia.com/gpu'] ||
          requests['amd.com/gpu'] ||
          requests['k8s.amazonaws.com/accelerator']
        acc.gpu += Number(gpu || 0)
        return acc
      },
      { cpu: 0, memoryGiB: 0, gpu: 0 }
    )

    return {
      serviceName: metadataStore.metadata.nameEn || metadataStore.metadata.resourceName || 'service',
      image: firstContainer.value?.image || '',
      replicas: Math.max(1, Number(deploymentStore.replicas || 1)),
      cpuRequestCores: resources.cpu > 0 ? Number(resources.cpu.toFixed(3)) : 1,
      memoryRequestGiB: resources.memoryGiB > 0 ? Number(resources.memoryGiB.toFixed(3)) : 1,
      gpuRequest: resources.gpu
    }
  })

  function buildEmptyPlan(reason: string): RlSchedulePlan {
    return {
      planId: '',
      modelVersion: 'green-rl-scheduler',
      targetCluster: null,
      clusterCandidates: [],
      nodeCandidates: [],
      placements: [],
      reason,
      executable: false
    }
  }

  const plan = ref<RlSchedulePlan>(
    demoMode.value
      ? buildTwoLevelRlPlan(serviceDemand.value, mockWorkspaceClusters, mockWorkspaceNodes)
      : buildEmptyPlan('等待后端返回当前项目/工作空间的真实调度计划')
  )

  function syncPlan(nextPlan: RlSchedulePlan) {
    plan.value = nextPlan
    schedulingStore.setRlSchedulePlan(nextPlan)
    emit('change')
  }

  async function rebuildPlan(showMessage = true) {
    planning.value = true
    const nextPlan = await buildPlan(showMessage)
    syncPlan(nextPlan)
    planning.value = false
    if (showMessage) {
      if (planSource.value === 'backend') {
        ElMessage.success('已从后端生成真实 RL 调度计划')
      } else if (planSource.value === 'mock') {
        ElMessage.success('演示创建流程已使用本地 mock 生成 RL 调度计划')
      } else {
        ElMessage.warning(plan.value.reason)
      }
    }
  }

  async function handleRegenerateMode(command: string | number | object) {
    const mode = String(command)
    if (!scheduleModeOptions.some((option) => option.value === mode)) return
    scheduleMode.value = mode as ScheduleMode
    await rebuildPlan(true)
  }

  async function buildPlan(showFallbackWarning: boolean) {
    const workspaceId = Number(workspaceIdRef?.value || 0)
    const projectId = Number(projectIdRef?.value || 0)
    if (workspaceId > 0) {
      try {
        const backendPlan = await buildRlSchedulePlanApi({
          projectId: projectId > 0 ? projectId : undefined,
          workspaceId,
          scheduleMode: scheduleMode.value,
          service: {
            serviceName: serviceDemand.value.serviceName,
            replicas: serviceDemand.value.replicas,
            cpuRequestCores: serviceDemand.value.cpuRequestCores,
            memoryRequestGiB: serviceDemand.value.memoryRequestGiB,
            gpuRequest: serviceDemand.value.gpuRequest
          }
        })
        planSource.value = 'backend'
        return backendPlan
      } catch (error) {
        const message = error instanceof Error ? error.message : '调度服务接口请求失败'
        if (!demoMode.value) {
          planSource.value = 'empty'
          const reason = `未获取到后端真实调度计划：${message}`
          if (showFallbackWarning) {
            ElMessage.warning(reason)
          }
          return buildEmptyPlan(reason)
        }
        if (showFallbackWarning) {
          ElMessage.warning(`演示创建流程未连接后端，已使用本地 mock 计划：${message}`)
        }
      }
    }
    if (!demoMode.value) {
      planSource.value = 'empty'
      return buildEmptyPlan('缺少工作空间上下文，无法读取真实关联集群')
    }
    planSource.value = 'mock'
    return buildTwoLevelRlPlan(serviceDemand.value, mockWorkspaceClusters, mockWorkspaceNodes)
  }

  async function buildRealFallbackPlan(projectId: number, workspaceId: number): Promise<RlSchedulePlan | null> {
    if (workspaceId <= 0) return null

    try {
      const workspace = await getProjectWorkspaceApi(workspaceId)
      const currentCluster = workspace.projectClusterId
        ? await getProjectClusterApi(workspace.projectClusterId)
        : null
      const resolvedProjectId = projectId || workspace.projectId || currentCluster?.projectId || 0
      const projectClusters = resolvedProjectId
        ? await searchProjectClusterApi({ projectId: resolvedProjectId })
        : []
      const clusterScopes = await buildWorkspaceClusterScopes(
        mergeProjectClusters(projectClusters, currentCluster),
        workspace
      )
      const clusterCandidates = clusterScopes.map(({ cluster, workspace: binding }) =>
        toClusterCandidate(cluster, binding)
      )
      if (!clusterCandidates.length) {
        return buildEmptyPlan('当前项目没有可读取的授权集群资源池')
      }

      const clusterOnlyPlan = buildTwoLevelRlPlan(serviceDemand.value, clusterCandidates, [])
      const targetUuid = clusterOnlyPlan.targetCluster?.uuid
      if (!targetUuid) {
        return clusterOnlyPlan
      }

      const nodes = await loadFallbackNodes(targetUuid)
      return {
        ...buildTwoLevelRlPlan(serviceDemand.value, clusterCandidates, nodes),
        modelVersion: 'frontend-real-state-fallback'
      }
    } catch (fallbackError) {
      console.warn('[RlSchedulePlan] 真实数据兜底调度失败:', fallbackError)
      return null
    }
  }

  function mergeProjectClusters(
    projectClusters: ProjectCluster[],
    currentCluster: ProjectCluster | null
  ): ProjectCluster[] {
    const byId = new Map<number, ProjectCluster>()
    projectClusters.forEach((cluster) => {
      if (cluster.id) byId.set(cluster.id, cluster)
    })
    if (currentCluster?.id && !byId.has(currentCluster.id)) {
      byId.set(currentCluster.id, currentCluster)
    }
    return Array.from(byId.values())
  }

  async function buildWorkspaceClusterScopes(
    projectClusters: ProjectCluster[],
    currentWorkspace: ProjectWorkspace
  ): Promise<Array<{ cluster: ProjectCluster; workspace: ProjectWorkspace | null }>> {
    const checks = await Promise.all(
      projectClusters.map(async (cluster) => {
        if (!cluster.id) return { cluster, workspace: null }
        if (cluster.id === currentWorkspace.projectClusterId) {
          return { cluster, workspace: currentWorkspace }
        }
        try {
          const spaces = await searchProjectWorkspaceApi({
            projectClusterId: cluster.id,
            namespace: currentWorkspace.namespace,
            name: currentWorkspace.name
          })
          const matched =
            spaces.find(
              (space) =>
                space.projectClusterId === cluster.id &&
                space.namespace === currentWorkspace.namespace &&
                space.name === currentWorkspace.name
            ) || null
          return {
            cluster,
            workspace: matched
          }
        } catch {
          return {
            cluster,
            workspace: null
          }
        }
      })
    )
    return checks
  }

  async function loadFallbackNodes(clusterUuid: string): Promise<NodeCandidate[]> {
    const response = await getNodeListApi({
      clusterUuid,
      page: 1,
      pageSize: 200,
      orderField: 'id',
      isAsc: true
    })
    const items = response?.items || []
    return items.map((node) => ({
      id: String(node.id || node.nodeName),
      clusterUuid: node.clusterUuid || clusterUuid,
      name: node.nodeName || `node-${node.id}`,
      status:
        node.unschedulable === 2
          ? 'Unschedulable'
          : node.nodeStatus === 'Ready'
            ? 'Ready'
            : 'NotReady',
      cpuCapacityCores: Number.NaN,
      cpuFreeCores: Number.POSITIVE_INFINITY,
      memoryFreeGiB: Number.POSITIVE_INFINITY,
      gpuFree: Number.POSITIVE_INFINITY,
      currentPowerW: null
    })) as NodeCandidate[]
  }

  function toClusterCandidate(
    cluster: ProjectCluster,
    workspaceBinding: ProjectWorkspace | null
  ): ClusterCandidate {
    const cpuFree = Math.max(0, (cluster.cpuCapacity || cluster.cpuLimit || 0) - (cluster.cpuAllocated || 0))
    const memoryFree = Math.max(0, (cluster.memCapacity || cluster.memLimit || 0) - (cluster.memAllocated || 0))
    const gpuFree = Math.max(0, (cluster.gpuCapacity || cluster.gpuLimit || 0) - (cluster.gpuAllocated || 0))

    return {
      projectClusterId: cluster.id,
      targetWorkspaceId: workspaceBinding?.id,
      namespace: workspaceBinding?.namespace,
      workspaceName: workspaceBinding?.name,
      uuid: cluster.clusterUuid,
      name: cluster.clusterName || cluster.clusterUuid,
      region: cluster.clusterUuid || '',
      authorized: Boolean(workspaceBinding),
      status: isHealthyClusterStatus(cluster.status) ? 'healthy' : 'warning',
      cpuFreeCores: Number(cpuFree.toFixed(3)),
      memoryFreeGiB: Number(memoryFree.toFixed(3)),
      gpuFree: Number(gpuFree.toFixed(3)),
      electricityPrice: cluster.hasEnergyProfile ? cluster.gridPricePerKwh || 0 : 0,
      hasEnergyProfile: Boolean(cluster.hasEnergyProfile),
      batterySoc: cluster.hasStorageSoc ? cluster.storageSoc || 0 : 100,
      hasStorageSoc: Boolean(cluster.hasStorageSoc),
      realtimeResourceReady: true,
      realtimeResourceError: '',
      currentPowerW: null
    }
  }

  function isHealthyClusterStatus(status?: string) {
    const normalized = String(status || '').trim().toLowerCase()
    return !normalized || ['1', 'normal', 'healthy', 'ready'].includes(normalized)
  }

  function nextStage() {
    activeStage.value = Math.min(2, activeStage.value + 1)
  }

  function prevStage() {
    activeStage.value = Math.max(0, activeStage.value - 1)
  }

  function useCurrentPlan() {
    schedulingStore.setRlSchedulePlan(plan.value)
    emit('change')
    ElMessage.success('已采用该调度计划，创建 Deployment 时会按目标集群和节点分布提交')
    emit('next')
  }

  function formatPower(value: number | null | undefined) {
    if (value === null || value === undefined || !Number.isFinite(value)) return '未采集'
    return `${value} W`
  }

  function formatElectricityPrice(value: number | null | undefined, collected?: boolean) {
    if (collected === false || value === null || value === undefined || !Number.isFinite(value)) {
      return '未采集'
    }
    return String(value)
  }

  function hasCollectedMetric(value: number | null | undefined, collected = true) {
    return collected !== false && value !== null && value !== undefined && Number.isFinite(value)
  }

  function normalizePercentage(value: number | null | undefined) {
    if (value === null || value === undefined || !Number.isFinite(value)) return 0
    return Math.max(0, Math.min(100, value))
  }

  function formatSoc(value: number | null | undefined) {
    if (value === null || value === undefined || !Number.isFinite(value)) return '未采集'
    return `${normalizePercentage(value)}%`
  }

  function formatResource(value: number | null | undefined, unit: string) {
    if (value === null || value === undefined || !Number.isFinite(value)) return '未采集'
    return unit ? `${value} ${unit}` : String(value)
  }

  function formatRealtimeResource(value: number | null | undefined, unit: string, ready?: boolean) {
    if (ready === false) return '未采集'
    return formatResource(value, unit)
  }

  function clusterStatusText(status: string) {
    if (status === 'healthy') return '正常'
    if (status === 'warning') return '异常'
    if (status === 'offline') return '离线'
    return status
  }

  watch(
    serviceDemand,
    () => {
      void rebuildPlan(false)
    },
    { immediate: true, deep: true }
  )
</script>

<style scoped>
  .rl-plan {
    width: 100%;
    padding: 12px;
    border: 1px solid #dbe5f0;
    border-radius: 8px;
    background: #f7fafc;
  }

  .plan-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .plan-title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .eyebrow {
    color: #166534;
    font-size: 13px;
    font-weight: 700;
  }

  .plan-head h3 {
    margin: 0;
    color: #111827;
    font-size: 18px;
    line-height: 1.35;
  }

  .service-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 10px;
  }

  .service-strip > div {
    min-width: 0;
    padding: 9px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #fff;
  }

  .service-name {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .service-name svg {
    color: #16a34a;
  }

  .service-strip span,
  .execution-grid span {
    display: block;
    margin-bottom: 3px;
    color: #64748b;
    font-size: 12px;
  }

  .service-strip strong,
  .execution-grid strong {
    display: block;
    overflow: hidden;
    color: #111827;
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stage-tabs {
    display: grid;
    gap: 8px;
    margin-bottom: 10px;
  }

  .stage-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #fff;
    color: #64748b;
    cursor: pointer;
    text-align: left;
  }

  .stage-tab span {
    display: grid;
    flex: 0 0 auto;
    width: 22px;
    height: 22px;
    place-items: center;
    border-radius: 50%;
    background: #eef2f7;
    font-size: 12px;
    font-weight: 800;
  }

  .stage-tab strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stage-tab.active {
    border-color: #86efac;
    background: #f0fdf4;
    color: #14532d;
  }

  .stage-tab.active span {
    color: #fff;
    background: #16a34a;
  }

  .stage-tab.done {
    border-color: #bbf7d0;
  }

  .result-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    padding: 10px 12px;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
    background: #f0fdf4;
    color: #15803d;
    font-size: 14px;
    font-weight: 600;
  }

  .result-banner.warning {
    border-color: #fed7aa;
    background: #fff7ed;
    color: #c2410c;
  }

  .plan-section {
    margin-top: 10px;
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
  }

  .section-head > div {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #1f2937;
    font-weight: 700;
  }

  .section-head svg {
    color: #16a34a;
  }

  .schedule-table {
    overflow: hidden;
    border: 1px solid #e5edf6;
    border-radius: 8px;
  }

  .schedule-table :deep(.el-table__header th) {
    background: #f8fafc;
    color: #475569;
    font-weight: 700;
  }

  .schedule-table :deep(.el-table__cell) {
    padding: 10px 0;
  }

  .name-cell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .name-cell strong {
    display: block;
    color: #111827;
    font-size: 14px;
  }

  .name-cell span,
  .metric-cell span,
  .progress-text,
  .muted {
    color: #64748b;
    font-size: 12px;
  }

  .metric-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .metric-cell strong {
    color: #111827;
    font-size: 14px;
  }

  .missing-value {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    min-height: 22px;
    padding: 2px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    background: #f8fafc;
    color: #64748b;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.2;
  }

  .progress-text {
    display: inline-block;
    margin-top: 4px;
    font-weight: 600;
  }

  .execution-card {
    padding: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
  }

  .execution-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 12px;
  }

  .execution-grid > div {
    min-width: 0;
    padding: 12px;
    border: 1px solid #dcfce7;
    border-radius: 6px;
    background: #f8fff9;
  }

  .placement-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .placement-panel {
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
  }

  .placement-title {
    margin-bottom: 8px;
    color: #334155;
    font-size: 13px;
    font-weight: 700;
  }

  .placement-item {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    max-width: 100%;
    min-height: 48px;
    padding: 8px 12px;
    border: 1px solid #dbeafe;
    border-radius: 6px;
    background: #f8fbff;
  }

  .placement-side {
    display: grid;
    min-width: 96px;
    gap: 2px;
  }

  .placement-side span {
    color: #64748b;
    font-size: 12px;
  }

  .placement-side.target {
    min-width: 88px;
  }

  .replica-name,
  .node-name {
    display: block;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .replica-name {
    color: #0f172a;
    font-size: 13px;
  }

  .placement-arrow {
    color: #2563eb;
    font-size: 14px;
    font-weight: 800;
  }

  .node-name {
    color: #166534;
    font-size: 13px;
  }

  .step-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }

  @media (max-width: 1200px) {
    .service-strip,
    .execution-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .plan-head,
    .section-head {
      align-items: stretch;
      flex-direction: column;
    }

    .service-strip,
    .execution-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
