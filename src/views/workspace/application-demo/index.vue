<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import {
  Plus,
  RefreshCw,
  Server,
  Eye,
  EyeOff,
  Box,
  Layers,
  Database,
  Clock,
  Briefcase,
  Package,
  ChevronRight
} from "lucide-vue-next";
import DemoServiceTree from "./components/DemoServiceTree.vue";
import DemoBasicInfo from "./components/tabs/DemoBasicInfo.vue";
import DemoVersionManagement from "./components/tabs/DemoVersionManagement.vue";
import DemoServiceManagement from "./components/tabs/DemoServiceManagement.vue";
import DemoIngressManagement from "./components/tabs/DemoIngressManagement.vue";
import DemoFlaggerManagement from "./components/tabs/DemoFlaggerManagement.vue";
import DemoOperationAudit from "./components/tabs/DemoOperationAudit.vue";
import {
  MOCK_PROJECTS,
  MOCK_WORKSPACES,
  type DemoApplication,
  type ResourceType
} from "./mock/data";
import { appsForWorkspace, clusterUuidById, demoApplications, getDemoCluster, workspacesForProject } from "./mock/demoStore";

defineOptions({ name: "ApplicationDemoCenter" });

const route = useRoute();
const router = useRouter();

const selectedProjectId = ref<number | null>(null);
const selectedWorkspaceId = ref<number | null>(null);
const selectedApplicationId = ref<number | null>(null);
const activeTab = ref("basic");
const showServiceTree = ref(true);
const sidebarWidth = ref(280);

const loadedTabs = ref<Record<string, boolean>>({ basic: true });

const projects = MOCK_PROJECTS;

const workspaces = computed(() => workspacesForProject(selectedProjectId.value));

const workspaceApplications = computed(() => appsForWorkspace(selectedWorkspaceId.value));

const filteredApplications = computed(() => workspaceApplications.value);

const selectedProject = computed(
  () => projects.find((p) => p.id === selectedProjectId.value) ?? null
);
const selectedWorkspace = computed(
  () => workspaces.value.find((w) => w.id === selectedWorkspaceId.value) ?? null
);
const selectedCluster = computed(() => getDemoCluster(selectedWorkspace.value?.clusterId ?? null));
const selectedApplication = computed(
  () => filteredApplications.value.find((a) => a.id === selectedApplicationId.value) ?? null
);

function normalizeResourceType(type: string) {
  return type || "unknown";
}

function getResourceIcon(type: ResourceType) {
  const map: Record<string, typeof Box> = {
    pod: Box,
    deployment: Layers,
    statefulset: Database,
    daemonset: Server,
    cronjob: Clock,
    job: Briefcase
  };
  return map[type] ?? Package;
}

function getResourceTypeTag(type: ResourceType) {
  const map: Record<string, string> = {
    pod: "info",
    deployment: "success",
    statefulset: "warning",
    daemonset: "primary",
    cronjob: "danger",
    job: ""
  };
  return map[type] ?? "info";
}

function handleProjectChange() {
  selectedWorkspaceId.value = workspaces.value[0]?.id ?? null;
  selectedApplicationId.value = null;
}

function handleProjectClear() {
  selectedWorkspaceId.value = null;
  selectedApplicationId.value = null;
}

function handleWorkspaceChange() {
  selectedApplicationId.value = filteredApplications.value[0]?.id ?? null;
}

function handleWorkspaceClear() {
  selectedApplicationId.value = null;
}

function handleApplicationChange() {
  /* selection only */
}

function handleApplicationClear() {
  selectedApplicationId.value = null;
}

function handleServiceClick(app: DemoApplication) {
  selectedApplicationId.value = app.id;
}

function handleTabChange(name: string | number) {
  const tab = String(name);
  loadedTabs.value[tab] = true;
}

function toggleServiceTree() {
  showServiceTree.value = !showServiceTree.value;
}

function handleCreate() {
  if (!selectedProjectId.value || !selectedWorkspaceId.value || !selectedWorkspace.value) {
    ElMessage.warning("请先选择项目和工作空间");
    return;
  }
  router.push({
    path: "/workspace/application-demo/create/deployment",
    query: {
      resourceClusterId: String(selectedWorkspace.value.clusterId),
      clusterUuid: clusterUuidById(selectedWorkspace.value.clusterId),
      workspaceId: String(selectedWorkspaceId.value),
      appProjectId: String(selectedProjectId.value),
      namespace: selectedWorkspace.value.namespace ?? "default",
      mode: "createApp",
      demo: "1"
    }
  });
}

function handleRefresh() {
  ElMessage.success("已刷新（Mock 数据无网络请求）");
}

function startResize(e: MouseEvent) {
  const startX = e.clientX;
  const startWidth = sidebarWidth.value;
  const onMove = (ev: MouseEvent) => {
    sidebarWidth.value = Math.min(480, Math.max(200, startWidth + ev.clientX - startX));
  };
  const onUp = () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  };
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

watch(selectedWorkspaceId, () => {
  if (!selectedApplicationId.value && filteredApplications.value.length) {
    selectedApplicationId.value = filteredApplications.value[0].id;
  }
});

onMounted(() => {
  const qProject = Number(route.query.projectId);
  const qCluster = Number(route.query.clusterId);
  const qWorkspace = Number(route.query.workspaceId);
  const qApp = Number(route.query.appId);

  if (qProject > 0) {
    selectedProjectId.value = qProject;
  } else if (qCluster > 0) {
    const ws = MOCK_WORKSPACES.find((w) => w.clusterId === qCluster);
    selectedProjectId.value = ws?.projectId ?? projects[0]?.id ?? null;
  } else {
    selectedProjectId.value = projects[0]?.id ?? null;
  }

  selectedWorkspaceId.value =
    qWorkspace > 0
      ? qWorkspace
      : workspacesForProject(selectedProjectId.value)[0]?.id ?? null;

  if (qApp && demoApplications.value.some((a) => a.id === qApp)) {
    selectedApplicationId.value = qApp;
  } else {
    selectedApplicationId.value = filteredApplications.value[0]?.id ?? null;
  }
});
</script>

<template>
  <div class="application-management application-demo">
    <div class="breadcrumb-selector">
      <div class="breadcrumb-content">
        <div class="breadcrumb-item">
          <span class="breadcrumb-label"><Briefcase :size="14" /> 项目</span>
          <ElSelect
            v-model="selectedProjectId"
            placeholder="选择项目"
            clearable
            filterable
            class="breadcrumb-select"
            popper-class="project-dropdown"
            @change="handleProjectChange"
            @clear="handleProjectClear"
          >
            <ElOption
              v-for="project in projects"
              :key="project.id"
              :label="project.name"
              :value="project.id"
            >
              <div class="project-option">
                <span class="option-name">{{ project.name }}</span>
                <span v-if="project.description" class="option-meta">{{ project.description }}</span>
              </div>
            </ElOption>
          </ElSelect>
        </div>

        <div class="breadcrumb-separator"><ChevronRight :size="16" /></div>

        <div class="breadcrumb-item">
          <span class="breadcrumb-label"><Box :size="14" /> 工作空间</span>
          <ElSelect
            v-model="selectedWorkspaceId"
            placeholder="选择工作空间"
            clearable
            :disabled="!selectedProjectId"
            class="breadcrumb-select"
            popper-class="workspace-dropdown"
            @change="handleWorkspaceChange"
            @clear="handleWorkspaceClear"
          >
            <ElOption
              v-for="ws in workspaces"
              :key="ws.id"
              :label="ws.name"
              :value="ws.id"
            >
              <div class="workspace-option">
                <div class="workspace-left">
                  <Box :size="16" class="workspace-icon" />
                  <span class="option-name">{{ ws.name }}</span>
                </div>
                <ElTag size="small" type="info">{{ ws.namespace }}</ElTag>
              </div>
            </ElOption>
          </ElSelect>
        </div>

        <div class="breadcrumb-separator"><ChevronRight :size="16" /></div>

        <div class="breadcrumb-item">
          <span class="breadcrumb-label"><Server :size="14" /> 服务</span>
          <ElSelect
            v-model="selectedApplicationId"
            placeholder="选择服务"
            clearable
            filterable
            :disabled="!selectedWorkspaceId"
            class="breadcrumb-select"
            popper-class="application-dropdown"
            @change="handleApplicationChange"
            @clear="handleApplicationClear"
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
                <ElTag :type="getResourceTypeTag(app.resourceType)" size="small">
                  {{ normalizeResourceType(app.resourceType) }}
                </ElTag>
              </div>
            </ElOption>
          </ElSelect>
        </div>
      </div>

      <div class="breadcrumb-actions">
        <ElTooltip content="显示/隐藏服务树" placement="bottom">
          <ElButton
            :type="showServiceTree ? 'primary' : 'default'"
            :icon="showServiceTree ? EyeOff : Eye"
            circle
            :disabled="!selectedWorkspaceId"
            @click="toggleServiceTree"
          />
        </ElTooltip>
        <ElTooltip content="创建服务" placement="bottom">
          <ElButton type="primary" :icon="Plus" circle @click="handleCreate" />
        </ElTooltip>
        <ElTooltip content="刷新" placement="bottom">
          <ElButton :icon="RefreshCw" circle :disabled="!selectedWorkspaceId" @click="handleRefresh" />
        </ElTooltip>
      </div>
    </div>

    <div class="main-container">
      <ElContainer>
        <transition name="slide-fade">
          <ElAside v-show="showServiceTree" :width="sidebarWidth + 'px'" class="sidebar-container">
            <div class="resize-handle" @mousedown="startResize" />
            <div class="sidebar-content">
              <DemoServiceTree
                :applications="workspaceApplications"
                @node-click="handleServiceClick"
              />
            </div>
          </ElAside>
        </transition>

        <ElMain class="content-container" :style="{ marginLeft: showServiceTree ? '16px' : '0' }">
          <template v-if="selectedApplication">
            <ElCard class="main-tabs-card">
              <ElTabs v-model="activeTab" class="main-tabs" @tab-change="handleTabChange">
                <ElTabPane label="基础信息" name="basic">
                  <DemoBasicInfo
                    v-if="loadedTabs.basic"
                    :application="selectedApplication"
                    :workspace="selectedWorkspace"
                    :cluster="selectedCluster"
                  />
                </ElTabPane>
                <ElTabPane label="版本管理" name="version">
                  <DemoVersionManagement
                    v-if="loadedTabs.version"
                    :application="selectedApplication"
                    :cluster="selectedCluster"
                    :workspace="selectedWorkspace"
                  />
                </ElTabPane>
                <ElTabPane label="服务管理" name="service">
                  <DemoServiceManagement v-if="loadedTabs.service" :application="selectedApplication" />
                </ElTabPane>
                <ElTabPane label="网关管理" name="ingress">
                  <DemoIngressManagement v-if="loadedTabs.ingress" :application="selectedApplication" />
                </ElTabPane>
                <ElTabPane label="灰度发布" name="flagger">
                  <DemoFlaggerManagement v-if="loadedTabs.flagger" :application="selectedApplication" />
                </ElTabPane>
                <ElTabPane label="操作审计" name="audit">
                  <DemoOperationAudit
                    v-if="loadedTabs.audit"
                    :application="selectedApplication"
                    :workspace="selectedWorkspace"
                    :cluster="selectedCluster"
                  />
                </ElTabPane>
              </ElTabs>
            </ElCard>
          </template>

          <template v-else>
            <div class="empty-container">
              <ElEmpty :image-size="140">
                <template #description>
                  <div class="empty-description">
                    <Server :size="32" style="color: #c0c4cc; margin-bottom: 12px" />
                    <p>请从上方选择项目、工作空间与服务</p>
                    <p class="empty-hint">或打开左侧服务树浏览 Mock 列表</p>
                  </div>
                </template>
                <div class="empty-actions">
                  <ElButton type="primary" @click="handleCreate">
                    <Plus :size="16" /> 创建服务
                  </ElButton>
                  <ElButton v-if="selectedWorkspaceId && !showServiceTree" @click="toggleServiceTree">
                    <Eye :size="16" /> 显示服务树
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

<style scoped lang="scss">
.application-management {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
  background: #f5f7fa;
  box-sizing: border-box;

  .breadcrumb-selector {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 16px;
    margin-bottom: 16px;
    background: white;
    border-radius: 8px;
    border: 1px solid #e4e7ed;
    flex-shrink: 0;

    .breadcrumb-content {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      min-width: 0;
    }

    .breadcrumb-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .breadcrumb-label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #606266;
      font-weight: 500;
      white-space: nowrap;
    }

    .breadcrumb-select {
      min-width: 150px;
      max-width: 220px;
    }

    .breadcrumb-separator {
      color: #c0c4cc;
      display: flex;
      align-items: center;
    }

    .breadcrumb-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
  }

  .main-container {
    flex: 1;
    min-height: 0;
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
        z-index: 10;
        &:hover {
          background: #409eff;
        }
      }

      .sidebar-content {
        height: 100%;
      }
    }

    .content-container {
      padding: 0;
      height: 100%;
      overflow: hidden;
      transition: margin-left 0.3s ease;

      .main-tabs-card {
        height: 100%;
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
          }

          :deep(.el-tabs__content) {
            flex: 1;
            overflow-y: auto;
            min-height: 0;
            background: #fafbfc;
          }
        }
      }

      .empty-container {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border-radius: 8px;

        .empty-description {
          text-align: center;
          p {
            margin: 0;
            color: #606266;
            &.empty-hint {
              font-size: 13px;
              color: #909399;
              margin-top: 6px;
            }
          }
        }

        .empty-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
      }
    }
  }
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
</style>

<style lang="scss">
.project-dropdown,
.workspace-dropdown,
.application-dropdown {
  min-width: 360px !important;
}
.project-option,
.workspace-option,
.application-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 4px;
  width: 100%;
}
.workspace-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.option-name {
  font-size: 14px;
  color: #303133;
}
.option-meta {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}
.application-option .app-icon {
  flex-shrink: 0;
  color: #606266;
}
</style>
