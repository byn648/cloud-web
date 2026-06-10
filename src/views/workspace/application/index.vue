<template>
  <div class="application-management">
    <!-- 面包屑式选择器 -->
    <div class="breadcrumb-selector">
      <div class="breadcrumb-content">
        <!-- 项目：kube-nova 在全局顶栏选项目；cloud-web 在此显式选择，否则集群会一直禁用 -->
        <div class="breadcrumb-item">
          <span class="breadcrumb-label">
            <Briefcase :size="14" />
            项目
          </span>
          <ElSelect
            :model-value="projectStore.selectedProjectId ?? undefined"
            placeholder="请先选择项目"
            clearable
            filterable
            size="default"
            :loading="projectStore.loading"
            class="breadcrumb-select"
            @change="handleProjectSelect"
          >
            <ElOption v-for="p in projectStore.projects" :key="p.id" :label="p.name" :value="p.id" />
          </ElSelect>
      </div>

        <div class="breadcrumb-separator">
          <ChevronRight :size="16" />
        </div>

        <!-- 工作空间选择 -->
        <div class="breadcrumb-item">
          <span class="breadcrumb-label">
            <Box :size="14" />
            工作空间
          </span>
          <ElSelect
            v-model="managementStore.selectedWorkspaceId"
            placeholder="选择工作空间"
            clearable
            size="default"
            :disabled="!selectedProject"
            :loading="loadingWorkspaces"
            @change="handleWorkspaceChange"
            @clear="handleWorkspaceClear"
            popper-class="workspace-dropdown"
            class="breadcrumb-select"
          >
            <ElOption
              v-for="workspace in workspaces"
              :key="workspace.id"
              :label="workspace.name"
              :value="workspace.id"
            >
              <div class="workspace-option">
                <div class="workspace-left">
                  <Box :size="16" class="workspace-icon" />
                  <span class="option-name">{{ workspace.name }}</span>
        </div>
                <div class="workspace-tags">
                  <ElTag size="small" type="info" class="workspace-tag">
                    {{ workspace.namespace }}
                  </ElTag>
                  <ElTag size="small" type="success" class="workspace-tag">
                    {{ workspace.boundClusters.length }} 集群
                  </ElTag>
                </div>
        </div>
            </ElOption>
          </ElSelect>
      </div>

        <div class="breadcrumb-separator">
          <ChevronRight :size="16" />
    </div>

        <!-- 服务选择 -->
        <div class="breadcrumb-item">
          <span class="breadcrumb-label">
            <Server :size="14" />
            服务
          </span>
          <ElSelect
            v-model="managementStore.selectedApplicationId"
            placeholder="选择服务"
            clearable
            filterable
            size="default"
            :disabled="!managementStore.selectedWorkspace"
            :loading="loadingApplications"
            @change="handleApplicationChange"
            @clear="handleApplicationClear"
            popper-class="application-dropdown"
            class="breadcrumb-select"
          >
            <ElOption
              v-for="app in filteredApplications"
              :key="app.id"
              :label="app.nameCn || app.nameEn"
              :value="app.id"
            >
              <div class="application-option">
                <component :is="getResourceIcon(app.resourceType)" :size="16" class="app-icon" />
                <span class="option-name">{{ app.nameCn || app.nameEn }}</span>
                <ElTag :type="getResourceTypeTag(app.resourceType)" size="small" class="app-tag">
                  {{ normalizeResourceType(app.resourceType) }}
                </ElTag>
        </div>
            </ElOption>
          </ElSelect>
      </div>

        <div class="breadcrumb-separator">
          <ChevronRight :size="16" />
    </div>

        <!-- 资源类型选择 -->
        <div class="breadcrumb-item">
          <span class="breadcrumb-label">
            <Filter :size="14" />
            类型
          </span>
          <ElSelect
            v-model="managementStore.selectedResourceType"
            placeholder="全部类型"
            clearable
            size="default"
            @change="handleResourceTypeChange"
            class="breadcrumb-select"
          >
            <ElOption label="全部" value="all" />
            <ElOption label="Pod" value="pod" />
            <ElOption label="Deployment" value="deployment" />
            <ElOption label="StatefulSet" value="statefulset" />
            <ElOption label="DaemonSet" value="daemonset" />
            <ElOption label="CronJob" value="cronjob" />
            <ElOption label="Job" value="job" />
          </ElSelect>
        </div>
        </div>

      <!-- 操作按钮 -->
      <div class="breadcrumb-actions">
        <ElTooltip content="显示/隐藏服务树" placement="bottom">
          <ElButton
            :type="managementStore.showServiceTree ? 'primary' : 'default'"
            :icon="managementStore.showServiceTree ? EyeOff : Eye"
            circle
            size="default"
            :disabled="!managementStore.selectedWorkspace"
            @click="toggleServiceTree"
          />
        </ElTooltip>
        <ElTooltip content="创建服务" placement="bottom">
          <ElButton
            type="primary"
            :icon="Plus"
            circle
            size="default"
            :loading="creatingService"
            @click="handleCreate"
          />
        </ElTooltip>
        <ElTooltip content="刷新数据" placement="bottom">
          <ElButton
            :icon="RefreshCw"
            circle
            size="default"
            :disabled="!managementStore.selectedWorkspace"
            :loading="loadingApplications"
            @click="handleRefresh"
          />
        </ElTooltip>
        </div>
      </div>

    <!-- 主体内容 -->
    <div class="main-container">
      <ElContainer>
        <!-- 左侧服务树 -->
        <transition name="slide-fade">
          <ElAside
            v-show="managementStore.showServiceTree"
            :width="managementStore.sidebarWidth + 'px'"
            class="sidebar-container"
          >
            <div class="resize-handle" @mousedown="startResize"></div>
            <div class="sidebar-content">
              <ServiceTree
                :workspace="managementStore.selectedWorkspace"
                :resource-type="managementStore.selectedResourceType"
                :search-keyword="treeSearchKeyword"
                :applications="applications"
                @node-click="handleServiceClick"
                @refresh="loadApplications"
              />
    </div>
          </ElAside>
        </transition>

        <!-- 右侧内容区 -->
        <ElMain
          class="content-container"
          :style="{ marginLeft: managementStore.showServiceTree ? '16px' : '0' }"
        >
          <template v-if="managementStore.selectedApplication">
            <!-- 主要Tabs -->
            <ElCard class="main-tabs-card">
              <ElTabs
                v-model="managementStore.activeTab"
                class="main-tabs"
                @tab-change="handleTabChange"
              >
                <ElTabPane label="基础信息" name="basic">
                  <BasicInfo
                    v-if="loadedTabs.basic"
                    :application="managementStore.selectedApplication"
                    :workspace="managementStore.selectedWorkspace"
                    :cluster="managementStore.selectedCluster"
                    :refresh-trigger="refreshTriggers.basic"
                    @refresh="loadApplications"
                  />
                </ElTabPane>

                <ElTabPane label="版本管理" name="version">
                  <VersionManagement
                    v-if="loadedTabs.version"
                    :application="managementStore.selectedApplication"
                    :cluster="managementStore.selectedCluster"
                    :workspace="managementStore.selectedWorkspace"
                    :refresh-trigger="refreshTriggers.version"
                    @refresh="loadApplications"
                    @application-deleted="handleVersionApplicationDeleted"
                  />
                </ElTabPane>

                <ElTabPane label="服务管理" name="service">
                  <ServiceManagement
                    v-if="loadedTabs.service"
                    :application="managementStore.selectedApplication"
                    :cluster="managementStore.selectedCluster"
                    :workspace="managementStore.selectedWorkspace"
                    :refresh-trigger="refreshTriggers.service"
                  />
                </ElTabPane>

                <ElTabPane label="Ingress管理" name="ingress">
                  <IngressManagement
                    v-if="loadedTabs.ingress"
                    :application="managementStore.selectedApplication"
                    :cluster="managementStore.selectedCluster"
                    :workspace="managementStore.selectedWorkspace"
                    :refresh-trigger="refreshTriggers.ingress"
                  />
                </ElTabPane>
                <ElTabPane label="Flagger 发布" name="flagger">
                  <FlaggerManagement
                    v-if="loadedTabs.flagger"
                    :application="managementStore.selectedApplication"
                    :workspace="managementStore.selectedWorkspace"
                    :refresh-trigger="refreshTriggers.flagger"
                  />
                </ElTabPane>

                <ElTabPane label="操作审计" name="audit">
                  <OperationAudit
                    v-if="loadedTabs.audit"
                    :application="managementStore.selectedApplication"
                    :workspace="managementStore.selectedWorkspace"
                    :refresh-trigger="refreshTriggers.audit"
                  />
                </ElTabPane>
              </ElTabs>
            </ElCard>
          </template>

          <!-- 空状态 -->
          <template v-else>
            <div class="empty-container">
              <ElEmpty description="请选择一个服务" :image-size="140">
                <template #description>
                  <div class="empty-description">
                    <Server :size="32" style="color: #c0c4cc; margin-bottom: 12px" />
                    <p>请从上方服务列表中选择一个服务</p>
                    <p class="empty-hint">或者点击"显示服务树"浏览完整服务列表</p>
        </div>
                </template>
                <div class="empty-actions">
                  <ElButton
                    type="primary"
                    :loading="creatingService"
                    @click="handleCreate"
                    :disabled="!canCreate"
                  >
                    <Plus :size="16" />
                    创建服务
                  </ElButton>
                  <ElButton
                    v-if="managementStore.selectedWorkspace && !managementStore.showServiceTree"
                    @click="toggleServiceTree"
                  >
                    <Eye :size="16" />
                    显示服务树
                  </ElButton>
      </div>
              </ElEmpty>
            </div>
          </template>
        </ElMain>
      </ElContainer>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted, onActivated, nextTick } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
import {
    Plus,
    RefreshCw,
    Server,
    Edit,
    Eye,
    EyeOff,
    Box,
    Database,
    Layers,
    Clock,
    Briefcase,
    Package,
    ChevronRight,
    Filter,
    Info
  } from 'lucide-vue-next'
  import { useProjectStore } from '@/store/modules/project'
  import { useApplicationManagementStore } from '@/store/modules/applicationManagement'
  import {
    searchProjectClusterApi,
    searchProjectWorkspaceApi,
    searchApplicationApi,
    type ProjectCluster,
    type ProjectWorkspace,
    type OnecProjectApplication
  } from '@/api'
  import ServiceTree from './components/ServiceTree.vue'
  import BasicInfo from './components/tabs/BasicInfo.vue'
  import VersionManagement from './components/tabs/VersionManagement.vue'
  import ServiceManagement from './components/tabs/ServiceManagement.vue'
  import IngressManagement from './components/tabs/IngressManagement.vue'
  import FlaggerManagement from './components/tabs/FlaggerManagement.vue'
  import OperationAudit from './components/tabs/OperationAudit.vue'
  import {
    computeProjectClusterSchedule,
    CLUSTER_SCHEDULE_TOOLTIP,
    formatClusterSelectLabel as buildClusterSelectScheduleLabel,
    formatEnergyPriceLabel,
    formatScheduleScore,
    formatStorageSocLabel
  } from '@/scheduling'
  defineOptions({ name: 'ApplicationManagement' })

  const router = useRouter()
  const projectStore = useProjectStore()
  const managementStore = useApplicationManagementStore()

  const selectedProject = computed(() => projectStore.selectedProject)

  function handleProjectSelect(projectId: number | string | null | undefined) {
    if (projectId === null || projectId === undefined || projectId === '') {
      projectStore.clearSelection()
      return
    }
    const id = typeof projectId === 'string' ? Number(projectId) : projectId
    if (!Number.isFinite(id)) {
      projectStore.clearSelection()
      return
    }
    const match = projectStore.projects.find((p) => p.id === id)
    if (match) {
      projectStore.selectProject(match)
    }
  }

  // 🔥 本地存储的 key
  const STORAGE_KEY_CLUSTER = 'app-mgmt-selected-cluster'
  const STORAGE_KEY_WORKSPACE = 'app-mgmt-selected-workspace'
  const STORAGE_KEY_APPLICATION = 'app-mgmt-selected-application'
  const STORAGE_KEY_RESOURCE_TYPE = 'app-mgmt-resource-type'
  const STORAGE_KEY_TAB = 'app-mgmt-active-tab'
  const STORAGE_KEY_SHOW_TREE = 'app-mgmt-show-tree'

  // 🔥 工具函数:从 localStorage 加载
  function loadFromStorage(key: string): number | string | boolean | null {
    try {
      const value = localStorage.getItem(key)
      if (value === null) return null

      // 尝试解析为数字
      const numValue = Number(value)
      if (!isNaN(numValue) && value === String(numValue)) {
        return numValue
      }

      // 尝试解析为布尔值
      if (value === 'true') return true
      if (value === 'false') return false

      // 返回字符串
      return value
    } catch (error) {
      console.error('加载存储失败:', error)
      return null
    }
  }

  // 🔥 工具函数:保存到 localStorage
  function saveToStorage(key: string, value: number | string | boolean | null) {
    try {
      if (value !== null && value !== undefined) {
        localStorage.setItem(key, String(value))
      } else {
        localStorage.removeItem(key)
      }
    } catch (error) {
      console.error('保存存储失败:', error)
    }
  }

  /** 未选项目时禁用集群下拉 */
  const clusterSelectDisabled = computed(() => !selectedProject.value)

  const clusterSelectPlaceholder = computed(() => {
    if (!selectedProject.value) {
      return '请先选择项目'
    }
    return '选择集群'
  })

  const clusterScheduleTooltip = CLUSTER_SCHEDULE_TOOLTIP

  const clusters = ref<ProjectCluster[]>([])

  const clusterSchedule = computed(() => computeProjectClusterSchedule(clusters.value, null))

  const recommendedClusterId = computed(() => clusterSchedule.value.recommendedClusterId)

  function getSchedulingScoreForCluster(cluster: ProjectCluster) {
    return clusterSchedule.value.getScore(cluster)
  }

  function getScheduleRank(cluster: ProjectCluster) {
    return clusterSchedule.value.getRank(cluster)
  }

  function formatClusterSelectLabel(cluster: ProjectCluster) {
    return buildClusterSelectScheduleLabel(
      cluster,
      clusterSchedule.value.getScore(cluster)
    )
  }

  interface BoundWorkspaceCluster {
    id: number
    projectClusterId: number
    clusterUuid: string
    clusterName: string
  }

  interface LogicalProjectWorkspace extends ProjectWorkspace {
    key: string
    bindingIds: number[]
    projectClusterIds: number[]
    boundClusters: BoundWorkspaceCluster[]
    sourceRows: ProjectWorkspace[]
  }

  const workspaces = ref<LogicalProjectWorkspace[]>([])
  const applications = ref<OnecProjectApplication[]>([])

  const loadingClusters = ref(false)
  const loadingWorkspaces = ref(false)
  const loadingApplications = ref(false)
  const creatingService = ref(false)
  const editingApp = ref(false)

  // 🔥 修复：简化初始化标志
  const isInitializing = ref(false)
  const hasCompletedInitialLoad = ref(false)

  const treeSearchKeyword = ref('')
  const isResizing = ref(false)

  const canCreate = computed(() => {
    return !!selectedProject.value && !!managementStore.selectedWorkspace
  })

  // 🔥 统一 resourceType 为小写
  const normalizeResourceType = (type?: string | null): string => {
    return type?.toLowerCase() || ''
  }

  // 懒加载标记 - 每个 tab 只有点击过才会加载
  const loadedTabs = ref({
    basic: false,
    version: false,
    service: false,
    ingress: false,
    monitoring: false,
    flagger: false,
    log: false,
    audit: false
  })

  // 刷新触发器 - 每次切换 tab 都会增加，触发子组件重新加载数据
  const refreshTriggers = ref({
    basic: 0,
    version: 0,
    service: 0,
    ingress: 0,
    monitoring: 0,
    flagger: 0,
    log: 0,
    audit: 0
  })

  // 🔥 过滤应用列表（统一小写比较）
  const filteredApplications = computed(() => {
    const selectedType = normalizeResourceType(managementStore.selectedResourceType)
    if (!selectedType || selectedType === 'all') {
      return applications.value
    }
    return applications.value.filter((app) => {
      return normalizeResourceType(app.resourceType) === selectedType
    })
  })

  // 🔥 获取资源图标（统一小写处理）
  const getResourceIcon = (type: string) => {
    const resourceType = normalizeResourceType(type)
    const iconMap: Record<string, any> = {
      pod: Box,
      deployment: Layers,
      statefulset: Database,
      daemonset: Server,
      cronjob: Clock,
      job: Briefcase
    }
    return iconMap[resourceType] || Package
  }

  // 🔥 获取资源类型标签（统一小写处理）
  const getResourceTypeTag = (type: string) => {
    const resourceType = normalizeResourceType(type)
    const tagMap: Record<string, string> = {
      pod: 'info',
      deployment: 'success',
      statefulset: 'warning',
      daemonset: 'primary',
      cronjob: 'danger',
      job: ''
    }
    return tagMap[resourceType] || 'info'
  }

  // 🔥 切换服务树显示/隐藏 - 添加保存逻辑
  const toggleServiceTree = () => {
    const newValue = !managementStore.showServiceTree
    managementStore.setShowServiceTree(newValue)
    saveToStorage(STORAGE_KEY_SHOW_TREE, newValue)
  }

  // 🔥 修复：监听项目切换
  watch(selectedProject, async (newProject, oldProject) => {
    // 如果正在初始化，跳过
    if (isInitializing.value) {
      return
    }

    // 如果项目真的发生了变化
    if (newProject?.id !== oldProject?.id) {
      // 清除所有存储
      saveToStorage(STORAGE_KEY_CLUSTER, null)
      saveToStorage(STORAGE_KEY_WORKSPACE, null)
      saveToStorage(STORAGE_KEY_APPLICATION, null)
      saveToStorage(STORAGE_KEY_RESOURCE_TYPE, null)
      saveToStorage(STORAGE_KEY_TAB, null)

      // 清空 store 状态
      managementStore.clearState()

      // 清空本地数据
      clusters.value = []
      workspaces.value = []
      applications.value = []
      resetLoadedTabs()

      // 只有在项目存在时才加载候选集群与工作空间；集群不再作为用户创建入口
      if (newProject) {
        await loadClusters()
        await loadWorkspaces()
      }
    }
  })

  // 🔥 修复：监听集群变化，但在初始化时跳过
  watch(
    () => managementStore.selectedClusterId,
    async (newId, oldId) => {
      // 初始化期间跳过
      if (isInitializing.value) {
        return
      }

      // ID 没变化，跳过
      if (newId === oldId) {
        return
      }

      if (newId) {
        const cluster = clusters.value.find((item) => item.id === newId)
        if (cluster) {
          managementStore.setCluster(cluster, true)
        }
      }
    }
  )

  // 🔥 修复：监听工作空间变化
  watch(
    () => managementStore.selectedWorkspaceId,
    async (newId, oldId) => {
      // 初始化期间跳过
      if (isInitializing.value) {
        return
      }

      // ID 没变化，跳过
      if (newId === oldId) {
        return
      }

      if (newId) {
        const workspace = resolveLogicalWorkspace(newId)
        if (workspace && managementStore.selectedWorkspace?.id !== workspace.id) {
          managementStore.setWorkspace(workspace, true)
          syncClusterFromWorkspace(workspace)
        }
        await loadApplications()
      } else {
        applications.value = []
      }
    }
  )

  // 重置已加载的 tabs
  const resetLoadedTabs = () => {
    loadedTabs.value = {
      basic: false,
      version: false,
      service: false,
      ingress: false,
      flagger: false,
      monitoring: false,
      log: false,
      audit: false
    }
  }

  // 🔥 修复：加载集群列表
  const loadClusters = async () => {
    if (!selectedProject.value) {
      clusters.value = []
      return
    }

    if (loadingClusters.value) {
      return
    }

    loadingClusters.value = true

    try {
      // 集群列表来自项目-集群绑定；能源字段 onec_cluster_energy_profile 由后端在 search 中合并
      const response = await searchProjectClusterApi({
        projectId: selectedProject.value.id
      })
      clusters.value = response || []

      // 集群只作为工作空间授权范围和后端旧字段来源，不再要求用户手动选择。
      managementStore.setCluster(null, true)
    } catch (error) {
      console.error('❌ 加载集群失败:', error)
      clusters.value = []
    } finally {
      loadingClusters.value = false
    }
  }

  // 🔥 集群切换
  const handleClusterChange = async (clusterId: number | null) => {
    saveToStorage(STORAGE_KEY_CLUSTER, clusterId)

    if (clusterId) {
      const cluster = clusters.value.find((c) => c.id === clusterId)
      if (cluster) {
        managementStore.setCluster(cluster)
        resetLoadedTabs()
        await loadWorkspaces()
      }
    } else {
      saveToStorage(STORAGE_KEY_WORKSPACE, null)
      saveToStorage(STORAGE_KEY_APPLICATION, null)
      saveToStorage(STORAGE_KEY_TAB, null)
    }
  }

  // 🔥 清空集群
  const handleClusterClear = () => {
    managementStore.setCluster(null)
    workspaces.value = []
    applications.value = []
    resetLoadedTabs()

    saveToStorage(STORAGE_KEY_CLUSTER, null)
    saveToStorage(STORAGE_KEY_WORKSPACE, null)
    saveToStorage(STORAGE_KEY_APPLICATION, null)
    saveToStorage(STORAGE_KEY_TAB, null)
  }

  function syncClusterFromWorkspace(workspace: ProjectWorkspace | null) {
    if (!workspace) {
      managementStore.setCluster(null, true)
      saveToStorage(STORAGE_KEY_CLUSTER, null)
      return
    }

    const cluster =
      clusters.value.find((item) => item.id === workspace.projectClusterId) ||
      clusters.value.find((item) => item.clusterUuid === workspace.clusterUuid) ||
      null

    if (cluster) {
      managementStore.setCluster(cluster, true)
      saveToStorage(STORAGE_KEY_CLUSTER, cluster.id)
    } else {
      managementStore.setCluster(
        {
          id: workspace.projectClusterId,
          clusterUuid: workspace.clusterUuid,
          clusterName: workspace.clusterName,
          projectId: workspace.projectId,
          cpuLimit: 0,
          cpuOvercommitRatio: 1,
          cpuCapacity: 0,
          cpuAllocated: 0,
          memLimit: 0,
          memOvercommitRatio: 1,
          memCapacity: 0,
          memAllocated: 0,
          storageLimit: 0,
          storageAllocated: 0,
          gpuLimit: 0,
          gpuOvercommitRatio: 1,
          gpuCapacity: 0,
          gpuAllocated: 0,
          podsLimit: 0,
          podsAllocated: 0,
          configmapLimit: 0,
          configmapAllocated: 0,
          secretLimit: 0,
          secretAllocated: 0,
          pvcLimit: 0,
          pvcAllocated: 0,
          ephemeralStorageLimit: 0,
          ephemeralStorageAllocated: 0,
          serviceLimit: 0,
          serviceAllocated: 0,
          loadbalancersLimit: 0,
          loadbalancersAllocated: 0,
          nodeportsLimit: 0,
          nodeportsAllocated: 0,
          deploymentsLimit: 0,
          deploymentsAllocated: 0,
          jobsLimit: 0,
          jobsAllocated: 0,
          cronjobsLimit: 0,
          cronjobsAllocated: 0,
          daemonsetsLimit: 0,
          daemonsetsAllocated: 0,
          statefulsetsLimit: 0,
          statefulsetsAllocated: 0,
          ingressesLimit: 0,
          ingressesAllocated: 0,
          createdBy: '',
          updatedBy: '',
          createdAt: 0,
          updatedAt: 0
        },
        true
      )
      saveToStorage(STORAGE_KEY_CLUSTER, workspace.projectClusterId)
    }
  }

  function getWorkspaceGroupKey(workspace: Pick<ProjectWorkspace, 'id' | 'namespace' | 'name'>) {
    return `${workspace.namespace || workspace.id}::${workspace.name || ''}`
  }

  function groupWorkspacesByNamespace(rows: ProjectWorkspace[]): LogicalProjectWorkspace[] {
    const grouped = new Map<string, LogicalProjectWorkspace>()

    rows.forEach((workspace) => {
      const key = getWorkspaceGroupKey(workspace)
      const boundCluster: BoundWorkspaceCluster = {
        id: workspace.id,
        projectClusterId: workspace.projectClusterId,
        clusterUuid: workspace.clusterUuid,
        clusterName: workspace.clusterName
      }
      const existing = grouped.get(key)

      if (!existing) {
        grouped.set(key, {
          ...workspace,
          key,
          bindingIds: [workspace.id],
          projectClusterIds: [workspace.projectClusterId],
          boundClusters: [boundCluster],
          sourceRows: [workspace]
        })
        return
      }

      existing.bindingIds.push(workspace.id)
      existing.projectClusterIds.push(workspace.projectClusterId)
      existing.boundClusters.push(boundCluster)
      existing.sourceRows.push(workspace)
    })

    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  function resolveLogicalWorkspace(workspaceId?: number | null) {
    const selected = managementStore.selectedWorkspace as LogicalProjectWorkspace | null
    const id = workspaceId ?? managementStore.selectedWorkspaceId ?? selected?.id

    if (id) {
      const byBindingId = workspaces.value.find((workspace) => workspace.bindingIds.includes(id))
      if (byBindingId) {
        return byBindingId
      }
    }

    if (selected) {
      const selectedKey =
        selected.key ||
        getWorkspaceGroupKey({
          id: selected.id,
          namespace: selected.namespace,
          name: selected.name
        })
      const byKey = workspaces.value.find((workspace) => workspace.key === selectedKey)
      if (byKey) {
        return byKey
      }
    }

    return null
  }

  // 🔥 修复：加载工作空间列表
  const loadWorkspaces = async () => {
    if (!selectedProject.value) {
      workspaces.value = []
      return
    }

    if (loadingWorkspaces.value) {
      return
    }

    loadingWorkspaces.value = true

    try {
      if (clusters.value.length === 0) {
        await loadClusters()
      }

      const workspaceLists = await Promise.all(
        clusters.value.map((cluster) =>
          searchProjectWorkspaceApi({
            projectClusterId: cluster.id
          }).catch((error) => {
            console.warn(`加载集群 ${cluster.clusterName} 的工作空间失败`, error)
            return []
          })
        )
      )
      const merged = workspaceLists.flat()
      workspaces.value = groupWorkspacesByNamespace(merged)

      // 🔥 关键修复：只在初始化时恢复缓存的工作空间
      if (isInitializing.value) {
        const savedWorkspaceId = loadFromStorage(STORAGE_KEY_WORKSPACE)
        if (savedWorkspaceId && typeof savedWorkspaceId === 'number') {
          const workspace = resolveLogicalWorkspace(savedWorkspaceId)
          if (workspace) {
            // 静默设置，不触发watch
            managementStore.setWorkspace(workspace, true)
            syncClusterFromWorkspace(workspace)
          } else {
            console.warn('⚠️ 缓存的工作空间不存在，清空选择')
            saveToStorage(STORAGE_KEY_WORKSPACE, null)
            saveToStorage(STORAGE_KEY_APPLICATION, null)
            saveToStorage(STORAGE_KEY_TAB, null)
          }
        }
      }
    } catch (error) {
      console.error('❌ 加载工作空间失败:', error)
      workspaces.value = []
  } finally {
      loadingWorkspaces.value = false
    }
  }

  // 🔥 工作空间切换
  const handleWorkspaceChange = (workspaceId: number | null) => {
    if (workspaceId) {
      const workspace = resolveLogicalWorkspace(workspaceId)
      if (workspace) {
        saveToStorage(STORAGE_KEY_WORKSPACE, workspace.id)
        syncClusterFromWorkspace(workspace)
        managementStore.setWorkspace(workspace)
        resetLoadedTabs()
        loadApplications()
      }
    } else {
      saveToStorage(STORAGE_KEY_WORKSPACE, null)
      saveToStorage(STORAGE_KEY_APPLICATION, null)
      saveToStorage(STORAGE_KEY_TAB, null)
    }
  }

  // 🔥 清空工作空间
  const handleWorkspaceClear = () => {
    managementStore.setWorkspace(null)
    syncClusterFromWorkspace(null)
    applications.value = []
    resetLoadedTabs()

    saveToStorage(STORAGE_KEY_WORKSPACE, null)
    saveToStorage(STORAGE_KEY_APPLICATION, null)
    saveToStorage(STORAGE_KEY_TAB, null)
  }

  // 🔥 资源类型切换
  const handleResourceTypeChange = () => {
    const selectedType = normalizeResourceType(managementStore.selectedResourceType) || 'all'
    saveToStorage(STORAGE_KEY_RESOURCE_TYPE, selectedType)
    managementStore.setResourceType(selectedType)

    if (managementStore.selectedApplication && selectedType !== 'all') {
      const appResourceType = normalizeResourceType(
        managementStore.selectedApplication.resourceType
      )
      if (appResourceType !== selectedType) {
        managementStore.setApplication(null)
        resetLoadedTabs()
        saveToStorage(STORAGE_KEY_APPLICATION, null)
        saveToStorage(STORAGE_KEY_TAB, null)
      }
    }
  }

  /** 版本管理内删除整个服务后：清空选中并刷新列表（与 kube-nova 行为一致） */
  async function handleVersionApplicationDeleted() {
    managementStore.setApplication(null)
    saveToStorage(STORAGE_KEY_APPLICATION, null)
    await loadApplications()
  }

  // 🔥 修复：加载应用列表
  const loadApplications = async () => {
    const workspace = resolveLogicalWorkspace()
    if (!workspace) {
      applications.value = []
      return
    }

    if (loadingApplications.value) {
      return
    }

    loadingApplications.value = true

    try {
      if (managementStore.selectedWorkspace?.id !== workspace.id) {
        managementStore.setWorkspace(workspace, true)
      }
      const workspaceIds = workspace.bindingIds?.length ? workspace.bindingIds : [workspace.id]
      const responses = await Promise.all(
        workspaceIds.map((workspaceId) =>
          searchApplicationApi({ workspaceId }).catch((error) => {
            console.warn(`加载工作空间 ${workspaceId} 的服务失败`, error)
            return []
          })
        )
      )
      const unique = new Map<number, OnecProjectApplication>()
      responses.flat().forEach((application) => unique.set(application.id, application))
      applications.value = Array.from(unique.values())

      // 🔥 关键修复：只在初始化时恢复缓存的应用
      if (isInitializing.value) {
        const savedAppId = loadFromStorage(STORAGE_KEY_APPLICATION)
        if (savedAppId && typeof savedAppId === 'number') {
          const app = applications.value.find((a) => a.id === savedAppId)
          if (app) {
            managementStore.setApplication(app)

            // 恢复资源类型
            const savedResourceType = loadFromStorage(STORAGE_KEY_RESOURCE_TYPE)
            if (savedResourceType && typeof savedResourceType === 'string') {
              managementStore.setResourceType(savedResourceType)
            }

            // 恢复 Tab
            const savedTab = loadFromStorage(STORAGE_KEY_TAB)
            if (savedTab && typeof savedTab === 'string') {
              managementStore.setActiveTab(savedTab)
              resetLoadedTabs()
              nextTick(() => {
                loadedTabs.value[savedTab as keyof typeof loadedTabs.value] = true
                refreshTriggers.value[savedTab as keyof typeof refreshTriggers.value]++
              })
            } else {
              // 默认加载 basic tab
              resetLoadedTabs()
              nextTick(() => {
                loadedTabs.value.basic = true
                refreshTriggers.value.basic++
              })
            }
          } else {
            saveToStorage(STORAGE_KEY_APPLICATION, null)
            saveToStorage(STORAGE_KEY_TAB, null)
          }
        }
      }
    } catch (error) {
      console.error('❌ 加载应用列表失败:', error)
      applications.value = []
  } finally {
      loadingApplications.value = false
    }
  }

  // 🔥 应用切换
  const handleApplicationChange = (appId: number | null) => {
    saveToStorage(STORAGE_KEY_APPLICATION, appId)

    if (appId) {
      const app = applications.value.find((a) => a.id === appId)
      if (app) {
        managementStore.setApplication(app)
        managementStore.setActiveTab('basic')
        resetLoadedTabs()

        saveToStorage(STORAGE_KEY_TAB, 'basic')

        nextTick(() => {
          loadedTabs.value.basic = true
          refreshTriggers.value.basic++
        })
      }
    } else {
      saveToStorage(STORAGE_KEY_TAB, null)
    }
  }

  // 🔥 清空应用
  const handleApplicationClear = () => {
    managementStore.setApplication(null)
    resetLoadedTabs()

    saveToStorage(STORAGE_KEY_APPLICATION, null)
    saveToStorage(STORAGE_KEY_TAB, null)
  }

  const handleServiceClick = (application: OnecProjectApplication) => {
    saveToStorage(STORAGE_KEY_APPLICATION, application.id)
    saveToStorage(STORAGE_KEY_TAB, 'basic')

    managementStore.setApplication(application)
    managementStore.setActiveTab('basic')
    resetLoadedTabs()
    nextTick(() => {
      loadedTabs.value.basic = true
      refreshTriggers.value.basic++
    })
  }

  // 在 handleCreate 函数中添加配额检查
  const handleCreate = async () => {
    if (!selectedProject.value) {
      ElMessage.warning('请先选择项目')
      return
    }

    if (!managementStore.selectedWorkspace) {
      ElMessage.warning('请先选择工作空间')
      return
    }

    creatingService.value = true

    try {
      syncClusterFromWorkspace(managementStore.selectedWorkspace)
      const selectedWorkspace = managementStore.selectedWorkspace
      const selectedCluster = managementStore.selectedCluster
      const resourceClusterId = selectedWorkspace.projectClusterId || selectedCluster?.id || 0
      const clusterUuid =
        selectedWorkspace.clusterUuid ||
        selectedCluster?.clusterUuid ||
        selectedCluster?.uuid ||
        `cluster-${resourceClusterId}`

      router.push({
        name: 'AppCreateManager',
        query: {
          resourceClusterId: String(resourceClusterId),
          clusterUuid: clusterUuid,
          appProjectId: String(selectedProject.value.id),
          workspaceId: String(selectedWorkspace.id),
          namespace: selectedWorkspace.namespace || 'default',
          mode: 'createApp'
        }
      })
    } catch (error: any) {
      // 用户取消操作
      if (error === 'cancel') {
        return
      }
      console.error('❌ 创建服务失败:', error)
  } finally {
      creatingService.value = false
    }
  }

  const handleRefresh = async () => {
    await loadApplications()
    if (managementStore.selectedApplication && managementStore.activeTab) {
      const tab = managementStore.activeTab as keyof typeof refreshTriggers.value
      if (tab in refreshTriggers.value) {
        refreshTriggers.value[tab]++
      }
    }
  }

  const handleEditApp = () => {
    editingApp.value = true
    setTimeout(() => {
      ElMessage.info('编辑服务信息功能')
      editingApp.value = false
    }, 500)
  }

  // 🔥 Tab 切换
  const handleTabChange = (tabName: string) => {
    saveToStorage(STORAGE_KEY_TAB, tabName)

    const tab = tabName as keyof typeof loadedTabs.value

    if (!loadedTabs.value[tab]) {
      loadedTabs.value[tab] = true
    }

    nextTick(() => {
      if (tab in refreshTriggers.value) {
        refreshTriggers.value[tab as keyof typeof refreshTriggers.value]++
      }
    })
  }

  const startResize = (e: MouseEvent) => {
    isResizing.value = true
    const startX = e.clientX
    const startWidth = managementStore.sidebarWidth

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.value) return
      const deltaX = e.clientX - startX
      const newWidth = startWidth + deltaX
      const clampedWidth = Math.max(250, Math.min(500, newWidth))
      managementStore.setSidebarWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      isResizing.value = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // 🔥 修复：完全重写初始化逻辑
  const initPage = async () => {
    if (isInitializing.value) {
      return
    }

    isInitializing.value = true

    try {
      // 1. 确保 store 初始化
      await projectStore.ensureInitialized()
      await managementStore.ensureInitialized()

      // 仅有一个项目时自动选中（常见于单租户控制台）
      if (!selectedProject.value && projectStore.projects.length === 1) {
        const only = projectStore.projects[0]
        if (only) {
          projectStore.selectProject(only)
        }
      }

      // 2. 恢复显示树状态
      const savedShowTree = loadFromStorage(STORAGE_KEY_SHOW_TREE)
      if (savedShowTree !== null && typeof savedShowTree === 'boolean') {
        managementStore.setShowServiceTree(savedShowTree)
      }

      // 3. 检查项目是否存在
      if (!selectedProject.value) {
        console.warn('⚠️ 未选择项目，清空所有状态')
        saveToStorage(STORAGE_KEY_CLUSTER, null)
        saveToStorage(STORAGE_KEY_WORKSPACE, null)
        saveToStorage(STORAGE_KEY_APPLICATION, null)
        saveToStorage(STORAGE_KEY_RESOURCE_TYPE, null)
        saveToStorage(STORAGE_KEY_TAB, null)
        return
      }

      // 加载集群（开推荐时 loadClusters 内会 apply 自动选）
      await loadClusters()

      await loadWorkspaces()

      // 如果有选中的工作空间，加载应用
      if (managementStore.selectedWorkspaceId) {
        await loadApplications()
      }
    } catch (error) {
      console.error('❌ 页面初始化失败:', error)
    } finally {
      // 🔥 关键：确保在所有异步操作完成后才解除初始化标志
      setTimeout(() => {
        isInitializing.value = false
        hasCompletedInitialLoad.value = true
      }, 100)
    }
  }

  // 🔥 修复：只初始化一次
  let initPromise: Promise<void> | null = null

  onMounted(async () => {
    if (!initPromise) {
      initPromise = initPage()
    }
    await initPromise
  })

  onActivated(async () => {
    // 如果还没有完成初始加载，等待初始化
    if (!hasCompletedInitialLoad.value) {
      if (!initPromise) {
        initPromise = initPage()
      }
      await initPromise
      return
    }

    // 如果有选中的工作空间，刷新应用列表
    if (managementStore.selectedWorkspace && !loadingApplications.value) {
      await loadApplications()

      // 刷新当前 tab
      if (managementStore.selectedApplication && managementStore.activeTab) {
        const tab = managementStore.activeTab as keyof typeof refreshTriggers.value
        if (tab in refreshTriggers.value) {
          refreshTriggers.value[tab]++
        }
      }
    }
  })
</script>

<style lang="scss" scoped>
  .application-management {
    height: 100vh;
  display: flex;
  flex-direction: column;
    padding: 0px;
    background: #f5f7fa;

    .breadcrumb-selector {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 16px;
      margin-bottom: 12px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e4e7ed;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);

      .breadcrumb-content {
        flex: 1;
        display: flex;
        align-items: center;
        align-content: center;
        gap: 8px 10px;
        row-gap: 8px;
        min-width: 0;
        flex-wrap: wrap;

        .breadcrumb-item {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;

          &.cluster-breadcrumb {
            .cluster-inline {
              display: flex;
              flex-direction: row;
              align-items: center;
              flex-wrap: wrap;
              gap: 6px 10px;
              min-width: 0;
            }

            .cluster-schedule-hint {
              display: inline-flex;
              align-items: center;
              color: #909399;
              cursor: help;
              flex-shrink: 0;
              line-height: 1;

              &:focus {
                outline: none;
              }
            }

            .recommend-inline {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              flex-shrink: 0;
            }

            .recommend-hint {
              font-size: 12px;
              color: #909399;
              cursor: default;
              user-select: none;
              line-height: 1;
            }

            .cluster-breadcrumb-select {
              min-width: 180px;
              max-width: 280px;
              width: 220px;
            }
          }

          .breadcrumb-label {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 13px;
            color: #606266;
            font-weight: 500;
            white-space: nowrap;
            flex-shrink: 0;
          }

          .breadcrumb-select {
            min-width: 150px;
            max-width: 250px;

            :deep(.el-input__wrapper) {
              background-color: #f5f7fa;
              border: 1px solid #dcdfe6;
              transition: all 0.2s;

              &:hover {
                border-color: #c0c4cc;
              }
            }

            :deep(.el-input__inner) {
  font-size: 13px;
              font-weight: 500;
            }
          }
        }

        .breadcrumb-separator {
          color: #c0c4cc;
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }
      }

      .breadcrumb-actions {
        flex-shrink: 0;
  display: flex;
  gap: 8px;
      }
    }

    .main-container {
      flex: 1;
      overflow: hidden;

      :deep(.el-container) {
        height: 100%;
      }

      .sidebar-container {
        position: relative;
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        overflow: hidden;

        .resize-handle {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          cursor: col-resize;
          background: transparent;
          z-index: 10;
          transition: background 0.2s;

          &:hover {
            background: #409eff;
          }
        }

        .sidebar-content {
          height: 100%;
          overflow: hidden;
        }
      }

      .content-container {
        padding: 0;
        margin: 0;
        height: 100%;
  overflow: hidden;
        transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        .main-tabs-card {
          flex: 1;
          overflow: hidden;
          height: 100%;
          border: 1px solid #e4e7ed;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
          border-radius: 8px;

          :deep(.el-card__body) {
            height: 100%;
            padding: 0;
          }

          .main-tabs {
            height: 100%;
  display: flex;
            flex-direction: column;

            :deep(.el-tabs__header) {
              padding: 0 20px;
  margin: 0;
              background: #fafafa;
              border-bottom: 1px solid #e4e7ed;
              flex-shrink: 0;

              .el-tabs__nav-wrap::after {
                display: none;
              }

              .el-tabs__item {
                height: 50px;
                line-height: 50px;
                padding: 0 20px;
                font-size: 14px;
                color: #606266;

                &:hover {
                  color: #409eff;
                }

                &.is-active {
                  color: #409eff;
                  font-weight: 500;
                }
              }

              .el-tabs__active-bar {
                height: 2px;
                background-color: #409eff;
              }
            }

            > :deep(.el-tabs__content) {
              padding: 0px;
              flex: 1;
              overflow-y: auto;
              background: #fafbfc;
              min-height: 0;
            }
          }
        }

        .empty-container {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);

          .empty-description {
            display: flex;
            flex-direction: column;
            align-items: center;

            p {
              margin: 0;
              font-size: 15px;
              color: #606266;

              &.empty-hint {
  font-size: 13px;
                color: #909399;
                margin-top: 6px;
              }
            }
          }

          :deep(.el-empty__bottom) {
            margin-top: 24px;

            .empty-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
            }
          }
        }
      }
    }
  }

  .slide-fade-enter-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .slide-fade-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .slide-fade-enter-from {
    transform: translateX(-20px);
    opacity: 0;
  }

  .slide-fade-leave-to {
    transform: translateX(-20px);
    opacity: 0;
  }

  @media (max-width: 1400px) {
    .breadcrumb-selector {
      .breadcrumb-content {
        .breadcrumb-item {
          .breadcrumb-select {
            min-width: 130px;
            max-width: 200px;
          }

          &.cluster-breadcrumb .cluster-breadcrumb-select {
            width: 180px;
            min-width: 130px;
            max-width: 200px;
          }
        }
      }
    }
  }
</style>
<style lang="scss">
  /* 集群下拉菜单样式 */
  .cluster-dropdown {
    min-width: 400px !important;

    .el-select-dropdown__wrap {
      min-height: 300px !important;
      max-height: 300px !important;
    }

    .el-select-dropdown__item {
      height: auto !important;
      line-height: normal !important;
      padding: 0 !important;
      margin: 0 !important;

      &.hover {
        background-color: transparent !important;

        .cluster-option {
          background-color: #f5f7fa;
        }
      }

      &.selected {
        background-color: transparent !important;
        font-weight: normal !important;

        .cluster-option {
          background-color: #ecf5ff;

          .option-name {
            color: #409eff;
            font-weight: 500;
          }
        }
      }
    }

    .cluster-option {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      width: 100%;
      gap: 12px;
      padding: 10px 16px !important;
      border-radius: 4px;
      transition: background-color 0.2s;
      height: auto !important;
      box-sizing: border-box;

      &.is-platform-recommend {
        background: linear-gradient(90deg, rgba(103, 194, 58, 0.1) 0%, transparent 100%) !important;
        border-left: 3px solid #67c23a;
        padding-left: 13px !important;
      }

      .recommend-badge {
        margin-left: 6px;
        vertical-align: middle;
        font-size: 11px !important;
        height: 20px;
        line-height: 18px;
      }

      .option-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
        flex-shrink: 0;
        text-align: right;
      }

      .option-name {
        font-weight: 500;
        color: #303133;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 14px;
        line-height: 1;
        margin: 0 !important;
        padding: 0 !important;
        vertical-align: middle;
      }

      .option-meta {
        font-size: 12px;
        color: #909399;
        flex-shrink: 0;
        white-space: nowrap;
        line-height: 1;
        margin: 0 !important;
        padding: 0 !important;
        vertical-align: middle;
      }

      .option-meta.sub.muted {
        font-size: 11px;
        opacity: 0.85;
      }
    }

  }

  /* 工作空间下拉菜单样式 */
  .workspace-dropdown {
    min-width: 400px !important;

    .el-select-dropdown__wrap {
      min-height: 300px !important;
      max-height: 300px !important;
    }

    .el-select-dropdown__item {
      height: auto !important;
      line-height: normal !important;
      padding: 0 !important;
      margin: 0 !important;

      &.hover {
        background-color: transparent !important;

        .workspace-option {
          background-color: #f5f7fa;
        }
      }

      &.selected {
        background-color: transparent !important;
        font-weight: normal !important;

        .workspace-option {
          background-color: #ecf5ff;

          .option-name {
            color: #409eff;
            font-weight: 500;
          }
        }
      }
    }

    .workspace-option {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      width: 100%;
      gap: 12px;
      padding: 10px 16px !important;
      border-radius: 4px;
      transition: background-color 0.2s;
      height: auto !important;
      box-sizing: border-box;

      .workspace-left {
        display: flex !important;
        align-items: center !important;
        flex: 1;
        min-width: 0;
        gap: 10px;

        .workspace-icon {
          flex-shrink: 0;
          color: #606266;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 16px;
          height: 16px;
          line-height: 1;
        }

        .option-name {
          font-weight: 500;
          color: #303133;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
          line-height: 1;
          margin: 0 !important;
          padding: 0 !important;
          vertical-align: middle;
        }
      }

      .workspace-tags {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        gap: 6px;
      }

      .workspace-tag {
        flex-shrink: 0 !important;
        margin: 0 !important;

        :deep(.el-tag) {
          margin: 0 !important;
          vertical-align: middle !important;
        }
      }
    }
  }

  /* 应用/服务下拉菜单样式 */
  .application-dropdown {
    min-width: 500px !important;
    max-width: 600px !important;

    .el-select-dropdown__wrap {
      min-height: 300px !important;
      max-height: 300px !important;
    }

    .el-select-dropdown__item {
      height: auto !important;
      line-height: normal !important;
      padding: 0 !important;
      margin: 0 !important;

      &.hover {
        background-color: transparent !important;

        .application-option {
          background-color: #f5f7fa;
        }
      }

      &.selected {
        background-color: transparent !important;
        font-weight: normal !important;

        .application-option {
          background-color: #ecf5ff;

          .option-name {
            color: #409eff;
            font-weight: 500;
          }
        }
      }
    }

    .application-option {
      display: flex !important;
      align-items: center !important;
  gap: 10px;
      width: 100%;
      padding: 10px 16px !important;
      border-radius: 4px;
      transition: background-color 0.2s;
      height: auto !important;
      box-sizing: border-box;

      .app-icon {
        flex-shrink: 0;
        color: #606266;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 16px;
        height: 16px;
        line-height: 1;
      }

      .option-name {
        flex: 1;
        min-width: 0;
        font-weight: 500;
        color: #303133;
        font-size: 14px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 1;
        margin: 0 !important;
        padding: 0 !important;
        vertical-align: middle;
      }

      .app-tag {
        flex-shrink: 0 !important;
        margin: 0 !important;

        :deep(.el-tag) {
          margin: 0 !important;
          vertical-align: middle !important;
        }
      }
    }
  }
</style>
