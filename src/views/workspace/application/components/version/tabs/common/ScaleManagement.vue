<template>
  <div class="scale-management-container">
    <div class="content-layout">
      <!-- 左侧 Tabs -->
      <div class="tabs-sidebar">
        <ElMenu :default-active="activeTab" @select="handleTabChange" class="scale-menu">
          <!-- 副本管理 -->
          <ElMenuItem index="replica">
            <Layers :size="16" />
            <span>副本管理</span>
          </ElMenuItem>

          <!-- HPA - 根据资源类型判断是否显示 -->
          <ElMenuItem v-if="supportsAutoscaling" index="hpa">
            <TrendingUp :size="16" />
            <span>弹性策略</span>
            <ElTag v-if="!hpaSupported" type="info" size="small" class="status-tag">未配置</ElTag>
          </ElMenuItem>

          <!-- VPA - 根据资源类型判断是否显示 -->
          <ElMenuItem v-if="supportsAutoscaling && !hideVpa" index="vpa">
            <Zap :size="16" />
            <span>VPA</span>
            <ElTag v-if="!vpaSupported" type="info" size="small" class="status-tag">未配置</ElTag>
          </ElMenuItem>
        </ElMenu>

        <!-- 🔥 不支持提示 - 放在 tabs 最底部 -->
        <div v-if="!supportsAutoscaling" class="unsupported-tip">
          <ElAlert type="warning" :closable="false" show-icon>
            <template #title>
              <span class="alert-title">当前资源类型不支持自动扩缩</span>
            </template>
            <template #default>
              <div class="alert-content">
                <p>
                  <strong>{{ resourceTypeDisplay }}</strong> 类型的工作负载不支持弹性策略和 VPA
                  自动扩缩。
                </p>
                <p class="support-tip">
                  支持的类型：<strong>Deployment</strong>、<strong>StatefulSet</strong>
                </p>
              </div>
            </template>
          </ElAlert>
        </div>
      </div>

      <!-- 右侧内容区 -->
      <div class="config-content">
        <!-- 副本管理 -->
        <div v-show="activeTab === 'replica'" class="config-section">
          <ReplicaManagement
            v-if="loadedTabs.replica"
            ref="replicaRef"
            :version="version"
            :resource-type="resourceType"
            :refresh-trigger="refreshTriggers.replica"
            @success="handleReplicaSuccess"
          />
        </div>

        <!-- HPA 管理 -->
        <div v-show="activeTab === 'hpa'" class="config-section">
          <HPAManagement
            v-if="loadedTabs.hpa && supportsAutoscaling"
            ref="hpaRef"
            :version="version"
            :application="application"
            :workspace="workspace"
            :resource-type="resourceType"
            :refresh-trigger="refreshTriggers.hpa"
            @success="handleHPASuccess"
          />
        </div>

        <!-- VPA 管理 -->
        <div v-show="activeTab === 'vpa' && !hideVpa" class="config-section">
          <VPAManagement
            v-if="loadedTabs.vpa && supportsAutoscaling && !hideVpa"
            ref="vpaRef"
            :version="version"
            :application="application"
            :workspace="workspace"
            :resource-type="resourceType"
            :refresh-trigger="refreshTriggers.vpa"
            @success="handleVPASuccess"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted, nextTick } from 'vue'
  import { useRoute } from 'vue-router'
  import { ElMessageBox } from 'element-plus'
  import { Layers, TrendingUp, Zap } from 'lucide-vue-next'
  import type { OnecProjectVersion, OnecProjectApplication, ProjectWorkspace } from '@/api'
  import { isDemoApplicationContext } from '@/views/workspace/application-demo/create/demoNavigation'
  import ReplicaManagement from './scale/ReplicaManagement.vue'
  import HPAManagement from './scale/HPAManagement.vue'
  import VPAManagement from './scale/VPAManagement.vue'

  defineOptions({ name: 'ScaleManagement' })

  interface Props {
    version: OnecProjectVersion
    application: OnecProjectApplication
    workspace: ProjectWorkspace
    refreshTrigger?: number
  }

  const props = defineProps<Props>()

  const route = useRoute()
  const hideVpa = computed(() => isDemoApplicationContext(route))

  const activeTab = ref('replica')
  const pendingTab = ref('replica')

  // HPA/VPA 支持状态
  const hpaSupported = ref(false)
  const vpaSupported = ref(false)

  // 为每个子组件创建 ref
  const replicaRef = ref<InstanceType<typeof ReplicaManagement>>()
  const hpaRef = ref<InstanceType<typeof HPAManagement>>()
  const vpaRef = ref<InstanceType<typeof VPAManagement>>()

  const loadedTabs = ref({
    replica: false,
    hpa: false,
    vpa: false
  })

  const refreshTriggers = ref({
    replica: 0,
    hpa: 0,
    vpa: 0
  })

  // 🔥 兼容获取 resourceType - 优先从 application，其次从 version
  const resourceType = computed(() => {
    const type = props.application?.resourceType || props.version?.resourceType || ''
    const normalized = type.toLowerCase()

    return normalized
  })

  // 🔥 资源类型显示名称（首字母大写）
  const resourceTypeDisplay = computed(() => {
    const type = props.application?.resourceType || props.version?.resourceType || ''
    return type.charAt(0).toUpperCase() + type.slice(1)
  })

  // 🔥 判断资源类型是否支持自动扩缩容
  // DaemonSet 和 CronJob 不支持 HPA/VPA
  const supportsAutoscaling = computed(() => {
    const type = resourceType.value
    const supports = type === 'deployment' || type === 'statefulset'

    return supports
  })

  // 检查当前 tab 是否有未保存的修改
  const hasUnsavedChanges = (): boolean => {
    const currentTab = activeTab.value
    const refMap: Record<string, any> = {
      replica: replicaRef.value,
      hpa: hpaRef.value,
      vpa: vpaRef.value
    }

    const currentRef = refMap[currentTab]

    // 检查子组件是否暴露了 hasUnsavedChanges 方法
    if (currentRef && typeof currentRef.hasUnsavedChanges === 'function') {
      return currentRef.hasUnsavedChanges()
    }

    // 兼容：直接检查 editing 状态
    if (currentRef && currentRef.editing === true) {
      return true
    }

    return false
  }

  // 重置当前 tab 的编辑状态
  const resetCurrentTab = async () => {
    const currentTab = activeTab.value
    const tab = currentTab as keyof typeof refreshTriggers.value

    if (tab in refreshTriggers.value) {
      refreshTriggers.value[tab]++
    }
  }

  // 切换 Tab 处理
  const handleTabChange = async (tabName: string) => {
    // 如果当前 tab 有未保存的修改，弹出确认对话框
    if (hasUnsavedChanges()) {
      try {
        await ElMessageBox.confirm(
          '当前有未保存的修改，切换标签页将丢失这些修改。是否继续？',
          '提示',
          {
            confirmButtonText: '继续切换',
            cancelButtonText: '取消',
            type: 'warning',
            distinguishCancelAndClose: true
          }
        )

        // 用户确认切换，重置当前 tab 数据
        await resetCurrentTab()
      } catch (error) {
        // 用户取消，阻止切换
        // 恢复到之前的 tab
        nextTick(() => {
          activeTab.value = pendingTab.value
        })
        return
      }
    }

    // 执行切换
    activeTab.value = tabName
    pendingTab.value = tabName
    const tab = tabName as keyof typeof loadedTabs.value

    // 只在首次点击时加载
    if (!loadedTabs.value[tab]) {
      loadedTabs.value[tab] = true

      // 首次加载时触发刷新
      nextTick(() => {
        if (tab in refreshTriggers.value) {
          refreshTriggers.value[tab]++
        }
      })
    }
  }

  // 副本管理成功回调
  const handleReplicaSuccess = () => {
    // 可以触发其他操作，比如刷新 HPA/VPA 状态
    checkAutoscalingStatus()
  }

  // HPA 成功回调
  const handleHPASuccess = () => {
    hpaSupported.value = true
    // 刷新副本管理，因为 HPA 会影响副本数
    if (loadedTabs.value.replica) {
      refreshTriggers.value.replica++
    }
  }

  // VPA 成功回调
  const handleVPASuccess = () => {
    vpaSupported.value = true
  }

  // 检查自动扩缩容状态
  const checkAutoscalingStatus = async () => {
    // TODO: 可以通过 API 检查 HPA/VPA 是否已配置
    // 这里暂时简单处理，如果子组件已加载且有数据则认为已配置
    if (hpaRef.value && typeof hpaRef.value.hasData === 'function') {
      hpaSupported.value = hpaRef.value.hasData()
    }
    if (vpaRef.value && typeof vpaRef.value.hasData === 'function') {
      vpaSupported.value = vpaRef.value.hasData()
    }
  }

  // 监听 activeTab 变化，同步 pendingTab
  watch(activeTab, (newVal) => {
    if (newVal && !hasUnsavedChanges()) {
      pendingTab.value = newVal
    }
  })

  // 监听外部刷新触发
  watch(
    () => props.refreshTrigger,
    (newVal) => {
      if (newVal && newVal > 0) {
        const tab = activeTab.value as keyof typeof refreshTriggers.value
        if (tab in refreshTriggers.value) {
          refreshTriggers.value[tab]++
        }
      }
    }
  )

  // 监听版本变化
  watch(
    () => props.version,
    () => {
      resetState()
    }
  )

  // 🔥 监听应用变化
  watch(
    () => props.application,
    (newApp, oldApp) => {
      if (newApp?.id !== oldApp?.id) {
        resetState()
      }
    }
  )

  // 重置状态的辅助函数
  const resetState = () => {
    // 重置所有 tab 为未加载状态
    loadedTabs.value = {
      replica: false,
      hpa: false,
      vpa: false
    }
    // 切回副本管理 tab
    activeTab.value = 'replica'
    pendingTab.value = 'replica'
    // 重置支持状态
    hpaSupported.value = false
    vpaSupported.value = false
  }

  // 组件挂载时自动加载当前 tab
  onMounted(() => {
    if (hideVpa.value && activeTab.value === 'vpa') {
      activeTab.value = 'replica'
      pendingTab.value = 'replica'
    }

    const tab = activeTab.value as keyof typeof loadedTabs.value
    if (!loadedTabs.value[tab]) {
      loadedTabs.value[tab] = true
      nextTick(() => {
        if (tab in refreshTriggers.value) {
          refreshTriggers.value[tab]++
        }
      })
    }

    // 初始化 pendingTab
    pendingTab.value = activeTab.value
  })
</script>

<style scoped lang="scss">
  .scale-management-container {
    height: 100%;
    background: #fff;
    border-radius: 8px;

    .content-layout {
      display: flex;
      height: 100%;

      // 🎨 左侧 Tabs
      .tabs-sidebar {
        width: 160px;
        border-right: 1px solid var(--el-border-color);
        padding: 20px 16px 20px 20px;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: 16px;

        .scale-menu {
          border: none;

          :deep(.el-menu-item) {
            display: flex;
            align-items: center;
            gap: 8px;
            border-radius: 6px;
            margin-bottom: 4px;
            height: 40px;
            padding: 0 12px;
            position: relative;

            &:hover {
              background-color: #f5f7fa;
              color: var(--el-color-primary);
            }

            &.is-active {
              background-color: var(--el-color-primary-light-9);
              color: var(--el-color-primary);
              font-weight: 500;
            }

            span {
              font-size: 14px;
              flex: 1;
            }

            .status-tag {
              margin-left: auto;
            }
          }
        }

        // 🔥 不支持提示 - 在 tabs 菜单最底部
        .unsupported-tip {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--el-border-color-lighter);

          :deep(.el-alert) {
            padding: 12px;
            border-radius: 6px;
            background: #fef0f0;
            border: 1px solid #fde2e2;

            .el-alert__icon {
              font-size: 16px;
            }

            .el-alert__content {
              .alert-title {
                font-size: 13px;
                font-weight: 600;
                color: var(--el-color-warning-dark-2);
              }

              .alert-content {
                margin-top: 8px;

                p {
                  font-size: 12px;
                  line-height: 1.6;
                  margin: 4px 0;
                  color: var(--el-text-color-regular);

                  &:first-child {
                    margin-top: 0;
                  }

                  &.support-tip {
                    margin-top: 6px;
                    color: var(--el-text-color-secondary);
                  }

                  strong {
                    color: var(--el-color-warning-dark-2);
                    font-weight: 600;
                  }
                }
              }
            }
          }
        }
      }

      // 🎨 右侧内容区
      .config-content {
        flex: 1;
        overflow-y: auto;
        background: #f5f7fa;

        .config-section {
          height: 100%;
        }
      }
    }
  }
</style>
