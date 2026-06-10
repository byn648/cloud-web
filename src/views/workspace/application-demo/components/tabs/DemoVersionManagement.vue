<template>
  <div class="version-management">
    <!-- 版本卡片网格 -->
    <div class="versions-grid">
      <div class="version-card add-card" @click="handleAddVersion">
        <Plus :size="24" />
        <span>发布新版本</span>
      </div>

      <!-- 删除服务按钮 - 仅在没有版本时显示 -->
      <div
        v-if="versions.length === 0 && !loading"
        class="version-card delete-card"
        @click="handleDeleteApplication"
      >
        <Trash2 :size="24" />
        <span>删除服务</span>
      </div>

      <div
        v-for="version in versions"
        :key="version.id"
        class="version-card"
        :class="{
          active: selectedVersion?.id === version.id,
          abnormal: !version.status || version.status === 0,
          // 🔥 根据版本角色添加不同样式
          'role-stable': version.versionRole === 'stable',
          'role-primary': version.versionRole === 'primary',
          'role-canary': version.versionRole === 'canary',
          'role-blue': version.versionRole === 'blue',
          'role-green': version.versionRole === 'green'
        }"
        @click="handleSelectVersion(version)"
      >
        <div class="card-header">
          <div class="version-title">
            <Tag :size="16" />
            <ElTooltip
              :content="version.version"
              placement="top"
              :disabled="version.version.length <= 20"
              :show-after="300"
            >
              <span class="version-text">{{ version.version }}</span>
            </ElTooltip>
          </div>
          <!-- 🔥 只有 stable 版本才显示操作菜单 -->
          <ElDropdown
            v-if="version.versionRole === 'stable'"
            trigger="click"
            @command="(cmd) => handleCommand(cmd, version)"
            @click.stop
          >
            <ElButton class="more-btn" size="small" text circle>
              <MoreVertical :size="16" />
            </ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="edit">
                  <Edit :size="14" />
                  编辑
                </ElDropdownItem>
                <ElDropdownItem command="delete" divided>
                  <Trash2 :size="14" />
                  删除版本
                </ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>

        <!-- 🔥 版本角色标签 -->
        <div v-if="version.versionRole" class="version-role-tag">
          <ElTag :type="getVersionRoleTagType(version.versionRole)" size="small" effect="dark">
            {{ getVersionRoleLabel(version.versionRole) }}
          </ElTag>
        </div>

        <div v-if="version.label && Object.keys(version.label).length > 0" class="card-labels">
          <ElTooltip
            v-for="(value, key) in version.label"
            :key="key"
            :content="`${key}=${value}`"
            placement="top"
            :show-after="300"
          >
            <ElTag size="small" class="label-tag"> {{ key }}={{ value }} </ElTag>
          </ElTooltip>
        </div>

        <!-- 🔥 异常标签 - 优化提示文案 -->
        <ElTooltip
          v-if="!version.status || version.status === 0"
          content="该版本在K8s集群中已被删除，请检查或重新同步"
          placement="top"
        >
          <ElTag type="danger" size="small" effect="dark" class="status-tag-corner"> 已删除 </ElTag>
        </ElTooltip>
      </div>
    </div>

    <!-- 版本详情 - 根据资源类型动态加载对应的管理组件 -->
    <div v-if="selectedVersion" class="version-detail">
      <component
        :is="currentResourceComponent"
        :key="selectedVersion.id"
        :version="selectedVersion"
        :application="application"
        :cluster="cluster"
        :workspace="workspace"
        :refresh-trigger="versionRefreshTrigger"
        @refresh="handleRefresh"
      />
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading && versions.length === 0" class="empty-state">
      <Layers :size="48" style="color: #c0c4cc" />
      <p>暂无版本，请新增一个版本</p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
    Plus,
    Tag,
    MoreVertical,
    Edit,
    Trash2,
    Layers
  } from 'lucide-vue-next'
  import type { DemoApplication, DemoCluster, DemoWorkspace } from '../../mock/data'
  import { demoApplications, demoVersions, versionsForApp } from '../../mock/demoStore'
  import {
    toApiApplication,
    toApiCluster,
    toApiWorkspace,
    toApiVersions,
    type ApiVersion
  } from '../../mock/demoAdapters'
  import { DEMO_DEPLOYMENT_CREATE_PATH } from '../../create/demoNavigation'

  import DeploymentManagement from '../../../application/components/version/resource-management/DeploymentManagement.vue'
  import StatefulSetManagement from '../../../application/components/version/resource-management/StatefulSetManagement.vue'
  import DaemonSetManagement from '../../../application/components/version/resource-management/DaemonSetManagement.vue'
  import JobManagement from '../../../application/components/version/resource-management/JobManagement.vue'
  import CronJobManagement from '../../../application/components/version/resource-management/CronJobManagement.vue'
  import PodResourceManagement from '../../../application/components/version/resource-management/PodResourceManagement.vue'

  defineOptions({ name: 'DemoVersionManagement' })

  const ENABLE_MULTI_VERSION = false
  const DEMO_APP_PROJECT_ID = 1

  interface Props {
    application: DemoApplication
    cluster: DemoCluster | null
    workspace: DemoWorkspace | null
    refreshTrigger?: number
  }

  const props = defineProps<Props>()
  const emit = defineEmits<{
    refresh: []
    applicationDeleted: []
  }>()

  const router = useRouter()
  const application = computed(() => toApiApplication(props.application))
  const cluster = computed(() => toApiCluster(props.cluster))
  const workspace = computed(() => toApiWorkspace(props.workspace))

  const versions = ref<ApiVersion[]>([])
  const selectedVersion = ref<ApiVersion | null>(null)
  const loading = ref(false)
  const deleting = ref(false)
  const versionRefreshTrigger = ref(0)
  const isInitialized = ref(false)

  function buildDemoWizardQuery(extra: Record<string, string> = {}) {
    return {
      resourceClusterId: String(props.cluster?.id ?? ''),
      clusterUuid: props.cluster?.uuid ?? '',
      workspaceId: String(props.workspace?.id ?? ''),
      appProjectId: String(DEMO_APP_PROJECT_ID),
      namespace: props.workspace?.namespace ?? 'default',
      demo: '1',
      applicationId: String(props.application.id),
      ...extra
    }
  }

  const normalizeResourceType = (type: string): string => {
    return type?.toLowerCase() || ''
  }

  const currentResourceComponent = computed(() => {
    const resourceType = normalizeResourceType(props.application.resourceType)
    const componentMap: Record<string, any> = {
      pod: PodResourceManagement,
      deployment: DeploymentManagement,
      statefulset: StatefulSetManagement,
      daemonset: DaemonSetManagement,
      cronjob: CronJobManagement,
      job: JobManagement
    }
    return componentMap[resourceType]
  })

  const getDemoCreatePath = (_resourceType?: string): string => DEMO_DEPLOYMENT_CREATE_PATH

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

  // 🔥 获取版本角色标签类型
  const getVersionRoleTagType = (role: string): string => {
    const typeMap: Record<string, string> = {
      stable: 'success', // 用户发布的稳定版本
      primary: 'primary', // Flagger金丝雀主版本
      canary: 'warning', // 金丝雀测试版本
      blue: 'info', // 蓝版本
      green: '' // 绿版本
    }
    return typeMap[role] || 'info'
  }

  // 🔥 获取版本角色标签文本
  const getVersionRoleLabel = (role: string): string => {
    const labelMap: Record<string, string> = {
      stable: '稳定版本', // 用户发布的主版本
      primary: '金丝雀主版本', // Flagger管理的主版本
      canary: '金丝雀测试', // 金丝雀测试版本
      blue: '蓝版本',
      green: '绿版本'
    }
    return labelMap[role] || role
  }

  const loadVersions = async () => {
    loading.value = true
    try {
      versions.value = toApiVersions(versionsForApp(props.application.id))
      if (versions.value.length > 0 && !selectedVersion.value) {
        handleSelectVersion(versions.value[0])
      }
    } finally {
      loading.value = false
    }
  }

  const handleSelectVersion = (version: ApiVersion) => {
    selectedVersion.value = version
    versionRefreshTrigger.value++
  }

  const handleAddVersion = async () => {
    if (!ENABLE_MULTI_VERSION && versions.value.length > 0) {
      try {
        await ElMessageBox.confirm(
          '当前暂未开启多版本管理功能，多版本功能需要通过灰度发布或AB测试等方式操作。',
          '多版本管理提示',
          {
            type: 'warning',
            confirmButtonText: '我知道了',
            showCancelButton: false,
            closeOnClickModal: false
          }
        )
      } catch {
        /* closed */
      }
      return
    }

    if (!props.cluster || !props.workspace) return
    const path = getDemoCreatePath(props.application.resourceType)
    if (!path) return
    router.push({ path, query: buildDemoWizardQuery({ mode: 'createAppVersion' }) })
  }

  const handleDeleteApplication = async () => {
    if (deleting.value) return
    const appName = props.application.nameCn || props.application.nameEn || '当前服务'
    try {
      await ElMessageBox.confirm(
        `确定要删除服务 "${appName}" 吗？删除后将无法恢复。`,
        '删除服务确认',
        { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' }
      )
      deleting.value = true
      demoApplications.value = demoApplications.value.filter((a) => a.id !== props.application.id)
      ElMessage.success('服务删除成功（Mock）')
      emit('applicationDeleted')
      emit('refresh')
    } catch {
      /* cancel */
    } finally {
      deleting.value = false
    }
  }

  const handleCommand = async (command: string, version: ApiVersion) => {
    if (!props.cluster || !props.workspace) return
    const path = getDemoCreatePath(props.application.resourceType)
    if (!path) return

    switch (command) {
      case 'edit':
        router.push({
          path,
          query: buildDemoWizardQuery({
            mode: 'editAppVersion',
            applicationVersionId: String(version.id)
          })
        })
        break
      case 'delete':
        if (deleting.value) return
        try {
          await ElMessageBox.confirm(`确定要删除版本 "${version.version}" 吗？`, '删除版本确认', {
            type: 'warning',
            confirmButtonText: '确定删除',
            cancelButtonText: '取消'
          })
          deleting.value = true
          const list = versionsForApp(props.application.id).filter((v) => v.id !== version.id)
          demoVersions.value = { ...demoVersions.value, [props.application.id]: list }
          ElMessage.success('版本删除成功（Mock）')
          if (selectedVersion.value?.id === version.id) {
            selectedVersion.value = null
          }
          await loadVersions()
          emit('refresh')
        } catch {
          /* cancel */
        } finally {
          deleting.value = false
        }
        break
    }
  }

  const handleRefresh = () => {
    emit('refresh')
  }

  watch(
    () => props.application,
    () => {
      selectedVersion.value = null
      isInitialized.value = false
      loadVersions()
    }
  )

  watch(
    () => props.refreshTrigger,
    (newVal) => {
      if ((newVal ?? 0) > 0 && isInitialized.value) {
        loadVersions()
      }
    }
  )

  onMounted(() => {
    loadVersions().then(() => {
      isInitialized.value = true
    })
  })

  defineExpose({ refresh: loadVersions })
</script>

<style lang="scss" scoped>
  .version-management {
    .versions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
      padding: 16px 16px 0 16px;

      .version-card {
        position: relative;
        padding: 16px;
        background: white;
        border: 2px solid #e4e7ed;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        min-height: 90px;

        &:hover {
          border-color: #409eff;
          box-shadow: 0 2px 12px rgba(64, 158, 255, 0.1);
          transform: translateY(-1px);
        }

        &.active {
          border-color: #409eff;
          background: #ecf5ff;
          .version-title .version-text {
            color: #409eff;
            font-weight: 600;
          }
        }

        // 🔥 版本角色样式
        &.role-stable {
          border-color: #67c23a;
          &:hover {
            box-shadow: 0 2px 12px rgba(103, 194, 58, 0.15);
          }
          &.active {
            background: #f0f9ff;
            border-color: #67c23a;
          }
        }

        &.role-primary {
          border-color: #409eff;
          &:hover {
            box-shadow: 0 2px 12px rgba(64, 158, 255, 0.15);
          }
        }

        &.role-canary {
          border-color: #e6a23c;
          &:hover {
            box-shadow: 0 2px 12px rgba(230, 162, 60, 0.15);
          }
          &.active {
            background: #fdf6ec;
            border-color: #e6a23c;
          }
        }

        &.role-blue {
          border-color: #909399;
          &:hover {
            box-shadow: 0 2px 12px rgba(144, 147, 153, 0.15);
          }
        }

        &.role-green {
          border-color: #95de64;
          &:hover {
            box-shadow: 0 2px 12px rgba(149, 222, 100, 0.15);
          }
        }

        &.abnormal {
          border-color: #f56c6c;

          &:hover {
            box-shadow: 0 2px 12px rgba(245, 108, 108, 0.15);
          }

          &.active {
            background: #fef0f0;
          }
        }

        &.add-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-style: dashed;
          color: #909399;
          font-size: 14px;
          &:hover {
            color: #409eff;
            background: #f5f7fa;
          }
        }

        &.delete-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-style: dashed;
          border-color: #f56c6c;
          color: #f56c6c;
          font-size: 14px;
          background: #fef0f0;

          &:hover {
            border-color: #f56c6c;
            background: #fde2e2;
            box-shadow: 0 2px 12px rgba(245, 108, 108, 0.15);
          }
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
          gap: 8px;

          .version-title {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            font-weight: 500;
            color: #303133;
            flex: 1;
            min-width: 0;
            overflow: hidden;

            .version-text {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              display: block;
              cursor: help;
              transition: color 0.2s;

              &:hover {
                color: #409eff;
              }
            }
          }

          .more-btn {
            opacity: 0;
            transition: opacity 0.2s;
            flex-shrink: 0;
          }
        }

        &:hover .more-btn {
          opacity: 1;
        }

        // 🔥 版本角色标签
        .version-role-tag {
          margin-bottom: 6px;
        }

        .card-labels {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding-right: 50px;

          .label-tag {
            font-size: 11px;
            height: 20px;
            line-height: 20px;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            cursor: help;

            &:hover {
              opacity: 0.8;
            }
          }
        }

        .status-tag-corner {
          position: absolute;
          right: 8px;
          bottom: 8px;
          font-size: 11px;
          height: 20px;
          line-height: 20px;
          padding: 0 8px;
          border-radius: 4px;
          z-index: 1;
          box-shadow: 0 2px 6px rgba(245, 108, 108, 0.35);
          font-weight: 500;
          cursor: help;
        }
      }
    }

    .version-detail {
      // 由各资源管理组件自己控制样式
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 0;
      color: #909399;
      p {
        margin-top: 12px;
        font-size: 14px;
      }
    }

    .app-option {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }
  }

  :deep(.el-tooltip__popper) {
    max-width: 400px;
    word-break: break-all;
  }
</style>
