<!-- kube-nova-web: src/views/workspace/pod-manager/index.vue — Pod 管理（与上游路径一致；无 Art* 依赖处用 Element Plus 实现） -->
<template>
  <div class="pod-manager-page art-full-height">
    <div class="breadcrumb-selector">
      <div class="breadcrumb-content">
        <div class="breadcrumb-item">
          <span class="breadcrumb-label">
            <Server :size="14" />
            集群
          </span>
          <ElSelect
            v-model="selectedClusterId"
            placeholder="选择集群"
            clearable
            size="default"
            :disabled="!selectedProject"
            :loading="loadingClusters"
            popper-class="pod-cluster-dropdown"
            class="breadcrumb-select"
            @change="handleClusterChange"
            @clear="handleClusterClear"
          >
            <ElOption
              v-for="cluster in clusters"
              :key="cluster.id"
              :label="cluster.clusterName"
              :value="cluster.id"
            >
              <div class="cluster-option">
                <span class="option-name">{{ cluster.clusterName }}</span>
                <span class="option-meta"> CPU {{ cluster.cpuCapacity }}核 · 内存 {{ cluster.memCapacity }}GB </span>
              </div>
            </ElOption>
          </ElSelect>
        </div>

        <div class="breadcrumb-separator">
          <ChevronRight :size="16" />
        </div>

        <div class="breadcrumb-item">
          <span class="breadcrumb-label">
            <Box :size="14" />
            工作空间
          </span>
          <ElSelect
            v-model="selectedWorkspaceId"
            placeholder="选择工作空间"
            clearable
            size="default"
            :disabled="!selectedClusterId"
            :loading="loadingWorkspaces"
            popper-class="pod-workspace-dropdown"
            class="breadcrumb-select"
            @change="handleWorkspaceChange"
            @clear="handleWorkspaceClear"
          >
            <ElOption
              v-for="workspace in workspaces"
              :key="workspace.id"
              :label="workspace.name"
              :value="workspace.id"
            >
              <div class="workspace-option">
                <span class="option-name">{{ workspace.name }}</span>
                <ElTag size="small" type="info">{{ workspace.namespace }}</ElTag>
              </div>
            </ElOption>
          </ElSelect>
        </div>
      </div>

      <div class="breadcrumb-actions">
        <ElDropdown trigger="click" @command="handleRefreshCommand">
          <ElButton :icon="RefreshCw" :loading="loading">
            {{ refreshButtonText }}
            <ChevronDown :size="14" style="margin-left: 4px" />
          </ElButton>
          <template #dropdown>
            <ElDropdownMenu>
              <ElDropdownItem command="manual">
                <RefreshCw :size="14" style="margin-right: 6px" />
                手动刷新
              </ElDropdownItem>
              <ElDropdownItem divided command="disable">
                <span :style="{ color: !autoRefreshEnabled ? '#409eff' : undefined }">
                  {{ !autoRefreshEnabled ? "✓ " : "" }}关闭自动刷新
                </span>
              </ElDropdownItem>
              <ElDropdownItem v-for="sec in [1, 3, 5, 10, 30]" :key="sec" :command="String(sec)">
                <span :style="{ color: autoRefreshInterval === sec ? '#409eff' : undefined }">
                  {{ autoRefreshInterval === sec ? "✓ " : "" }}每{{ sec }}秒刷新
                </span>
              </ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>
      </div>
    </div>

    <p v-if="activeWorkspace" class="scope-hint">
      与集群已连通，列表仅包含命名空间
      <code class="ns">{{ activeWorkspace.namespace }}</code>
      下的 Pod（工作空间名「{{ activeWorkspace.name }}」不等于 K8s 命名空间）。当前集群：
      <code>{{ activeWorkspace.clusterName }}</code>
      <span v-if="selectedProject" class="proj">· 项目：{{ selectedProject.name }}</span>
    </p>

    <template v-if="activeWorkspace">
      <ElCard class="search-card" shadow="never">
        <div class="search-bar-toggle">
          <span class="search-title">查询</span>
          <ElButton text type="primary" @click="showSearchBar = !showSearchBar">
            {{ showSearchBar ? "收起" : "展开" }}
          </ElButton>
        </div>
        <div v-show="showSearchBar" class="search-form">
          <ElForm :inline="true" @submit.prevent>
            <ElFormItem label="Pod 名称">
              <ElInput
                v-model="searchForm.search"
                clearable
                placeholder="支持名称模糊搜索"
                style="width: 200px"
                @keyup.enter="handleSearch"
              />
            </ElFormItem>
            <ElFormItem label="排序字段">
              <ElSelect v-model="searchForm.sortBy" style="width: 140px">
                <ElOption label="名称" value="name" />
                <ElOption label="创建时间" value="creationTime" />
                <ElOption label="状态" value="status" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="降序">
              <ElSwitch v-model="searchForm.sortDesc" />
            </ElFormItem>
            <ElFormItem>
              <ElButton type="primary" @click="handleSearch">查询</ElButton>
              <ElButton @click="handleReset">重置</ElButton>
            </ElFormItem>
          </ElForm>
        </div>
      </ElCard>

      <ElCard class="art-table-card" shadow="never" :style="{ marginTop: showSearchBar ? '12px' : '0' }">
        <div class="table-toolbar">
          <span class="table-hint">共 {{ pagination.total }} 条</span>
          <ElButton :icon="RefreshCw" :loading="loading" size="small" @click="handleRefresh"> 刷新 </ElButton>
        </div>

        <ElTable
          v-loading="loading"
          :data="tableData"
          :row-key="(row: PodDetailInfo) => row.name"
          border
          stripe
          class="pod-table"
          max-height="560"
          empty-text="该命名空间下当前无 Pod。若在 kubectl 能看到 Pod，请核对平台中该工作空间绑定的「集群、命名空间」是否与实际工作负载一致"
        >
          <ElTableColumn type="index" label="序号" width="64" :index="indexMethod" />
          <ElTableColumn label="Pod 名称" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="pod-name-link" @click="handleViewMonitor(row)">{{ row.name }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="状态" width="160">
            <template #default="{ row }">
              <ElTag :type="getStatusType(row.status)">
                <span class="status-cell">
                  <component :is="getStatusIcon(row.status)" :size="12" class="status-ico" />
                  {{ row.status }}
                </span>
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="ready" label="就绪" width="80" align="center" />
          <ElTableColumn prop="restarts" label="重启" width="70" align="center" />
          <ElTableColumn prop="node" label="节点" min-width="130" show-overflow-tooltip />
          <ElTableColumn prop="podIP" label="Pod IP" width="130" show-overflow-tooltip />
          <ElTableColumn prop="age" label="运行时长" width="100" />
          <ElTableColumn label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.creationTime) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="操作" width="240" align="center" fixed="right">
            <template #default="{ row }">
              <div class="op-btns">
                <ElButton
                  size="small"
                  link
                  type="primary"
                  :disabled="opLoading(row.name)"
                  @click="onLogNotAvailable"
                >
                  日志
                </ElButton>
                <ElButton
                  size="small"
                  link
                  type="success"
                  :disabled="opLoading(row.name) || !canExecTerminal(row.status)"
                  @click="handleTerminal(row)"
                >
                  终端
                </ElButton>
                <ElButton
                  size="small"
                  link
                  type="primary"
                  :disabled="opLoading(row.name) || !canExecTerminal(row.status)"
                  @click="handleFileManager(row)"
                >
                  文件
                </ElButton>
                <ElDropdown trigger="click" @command="(k: string) => handleMoreCommand(k, row)">
                  <ElButton size="small" link :disabled="opLoading(row.name)"> 更多 </ElButton>
                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem command="monitor">监控</ElDropdownItem>
                      <ElDropdownItem command="container">容器列表</ElDropdownItem>
                      <ElDropdownItem command="yaml">YAML</ElDropdownItem>
                      <ElDropdownItem command="detail">详情</ElDropdownItem>
                      <ElDropdownItem command="inject">注入临时容器</ElDropdownItem>
                      <ElDropdownItem command="evict" divided>驱逐</ElDropdownItem>
                      <ElDropdownItem command="delete">删除</ElDropdownItem>
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
              </div>
            </template>
          </ElTableColumn>
        </ElTable>

        <div class="pod-pagination">
          <ElPagination
            v-model:current-page="pagination.current"
            v-model:page-size="pagination.size"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="pagination.total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </ElCard>
    </template>

    <div v-else class="empty-container">
      <ElEmpty description="请选择工作空间" :image-size="140">
        <template #description>
          <div class="empty-description">
            <Box :size="32" style="color: #c0c4cc; margin-bottom: 12px" />
            <p>请从上方下拉框中选择集群和工作空间</p>
          </div>
        </template>
      </ElEmpty>
    </div>

    <ElDialog v-model="containerDialogVisible" :title="`容器信息 - ${containerDialogPodName}`" width="900px" top="5vh">
      <div v-if="containerDialogLoading" v-loading="true" class="container-loading" />
      <div v-else-if="currentContainerData" class="container-table-wrap">
        <div v-if="(currentContainerData.initContainers?.length || 0) > 0" class="csec">
          <h4>Init 容器</h4>
          <ElTable :data="currentContainerData.initContainers" size="small" border>
            <ElTableColumn prop="name" label="名称" />
            <ElTableColumn prop="image" label="镜像" min-width="220" show-overflow-tooltip />
          </ElTable>
        </div>
        <div v-if="(currentContainerData.containers?.length || 0) > 0" class="csec">
          <h4>主容器</h4>
          <ElTable :data="currentContainerData.containers" size="small" border>
            <ElTableColumn prop="name" label="名称" />
            <ElTableColumn prop="image" label="镜像" min-width="220" show-overflow-tooltip />
          </ElTable>
        </div>
        <div v-if="(currentContainerData.ephemeralContainers?.length || 0) > 0" class="csec">
          <h4>临时容器</h4>
          <ElTable :data="currentContainerData.ephemeralContainers" size="small" border>
            <ElTableColumn prop="name" label="名称" />
            <ElTableColumn prop="image" label="镜像" min-width="220" show-overflow-tooltip />
          </ElTable>
        </div>
      </div>
    </ElDialog>

    <ElDialog v-model="yamlDialog.visible" :title="yamlDialog.title" width="85%" top="5vh" class="yaml-dialog">
      <YamlEditor
        v-model="yamlDialog.content"
        height="650px"
        :readonly="true"
        :show-status-bar="true"
        :validate-on-change="true"
        :filename="yamlDialog.filename"
      />
    </ElDialog>

    <ElDialog
      v-model="injectDialogVisible"
      title="注入临时容器"
      width="520px"
      :close-on-click-modal="false"
      @closed="resetInjectForm"
    >
      <ElForm label-width="100px" @submit.prevent>
        <ElFormItem label="目标 Pod">
          <span>{{ injectTargetPodName }}</span>
        </ElFormItem>
        <ElFormItem label="容器名">
          <ElInput v-model="injectForm.containerName" placeholder="可留空自动生成" clearable />
        </ElFormItem>
        <ElFormItem label="镜像" required>
          <ElInput v-model="injectForm.image" placeholder="例如：busybox:latest" clearable />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="injectDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="injectingEphemeral" @click="submitInject"> 确定 </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onActivated, onUnmounted, markRaw } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  RefreshCw,
  Server,
  Box,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  AlertTriangle
} from "lucide-vue-next";
import { useProjectStore, type Project } from "@/store/modules/project";
import { useApplicationManagementStore } from "@/store/modules/applicationManagement";
import YamlEditor from "@/components/yaml-editor-pro/index.vue";
import {
  searchProjectClusterApi,
  searchProjectWorkspaceApi,
  listPodsWithPaginationApi,
  GetPodContainersWithClusterNamespaceApi,
  getPodYamlWithClusterUuidApi,
  getPodDetailWithClusterUuidApi,
  evictPodWithClusterUuidApi,
  deletePodWithClusterUuidApi,
  injectEphemeralContainerWithClusterUuidApi,
  type ProjectCluster,
  type ProjectWorkspace,
  type PodDetailInfo,
  type ContainerInfoList,
  type InjectEphemeralContainerWithClusterUuidRequest
} from "@/api";

defineOptions({ name: "PodManager" });

const router = useRouter();
const projectStore = useProjectStore();
const managementStore = useApplicationManagementStore();
const selectedProject = computed(() => projectStore.selectedProject);

const STORAGE_KEY_CLUSTER = "pod-manager-selected-cluster";
const STORAGE_KEY_WORKSPACE = "pod-manager-selected-workspace";

/** 避免 ElSelect / 接口 把 id 以 string 返回时 find 不到、activeWorkspace 为空、列表永远不请求 */
function normalizeId(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function loadFromStorage(key: string): number | null {
  try {
    const v = localStorage.getItem(key);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}
function saveToStorage(key: string, value: number | null) {
  try {
    if (value !== null) localStorage.setItem(key, String(value));
    else localStorage.removeItem(key);
  } catch {
    /* empty */
  }
}

const clusters = ref<ProjectCluster[]>([]);
const workspaces = ref<ProjectWorkspace[]>([]);
const tableData = ref<PodDetailInfo[]>([]);

const selectedClusterId = ref<number | null>(null);
const selectedWorkspaceId = ref<number | null>(null);
const selectedCluster = ref<ProjectCluster | null>(null);
const selectedWorkspace = ref<ProjectWorkspace | null>(null);

const isInitializing = ref(false);
const hasCompletedInitialLoad = ref(false);

const loadingClusters = ref(false);
const loadingWorkspaces = ref(false);
const loading = ref(false);
const showSearchBar = ref(true);

const evictLoadingMap = ref<Record<string, boolean>>({});
const deleteLoadingMap = ref<Record<string, boolean>>({});
const opLoading = (name: string) => !!(evictLoadingMap.value[name] || deleteLoadingMap.value[name]);

const searchForm = reactive({
  search: "",
  sortBy: "creationTime" as "name" | "creationTime" | "status",
  sortDesc: true
});

const pagination = reactive({ current: 1, size: 20, total: 0 });

const autoRefreshEnabled = ref(false);
const autoRefreshInterval = ref(0);
const autoRefreshTimer = ref<ReturnType<typeof setInterval> | null>(null);
const countdown = ref(0);
const countdownTimer = ref<ReturnType<typeof setInterval> | null>(null);

const refreshButtonText = computed(() => {
  if (!autoRefreshEnabled.value) return "刷新";
  return `刷新 (${countdown.value}s)`;
});

const indexMethod = (idx: number) => (pagination.current - 1) * pagination.size + idx + 1;

/** 与所选 id 对应的工作空间对象：始终从工作空间列表解析，避免 ElSelect 有值但 ref 未赋导致不拉数 */
const activeWorkspace = computed((): ProjectWorkspace | null => {
  const id = normalizeId(selectedWorkspaceId.value as number | string | null | undefined);
  if (id == null) return null;
  if (selectedWorkspace.value && normalizeId(selectedWorkspace.value.id) === id) {
    return selectedWorkspace.value;
  }
  return workspaces.value.find((w) => normalizeId(w.id) === id) ?? null;
});
watch(
  activeWorkspace,
  (w) => {
    if (w) {
      if (selectedWorkspace.value?.id !== w.id) selectedWorkspace.value = w;
    } else if (selectedWorkspaceId.value == null) {
      selectedWorkspace.value = null;
    }
  },
  { immediate: true }
);

function syncOrClearWorkspaceIfMissing() {
  if (selectedWorkspaceId.value == null || selectedWorkspaceId.value === "") return;
  if (activeWorkspace.value) return;
  if (loadingWorkspaces.value) return;
  selectedWorkspaceId.value = null;
  saveToStorage(STORAGE_KEY_WORKSPACE, null);
  selectedWorkspace.value = null;
}

function formatTime(ts: number) {
  if (!ts || !Number.isFinite(ts)) return "-";
  return new Date(ts).toLocaleString("zh-CN", { hour12: false });
}

const getStatusIcon = (status: string) => {
  const m: Record<string, unknown> = {
    Running: markRaw(CheckCircle),
    Pending: markRaw(Clock),
    Succeeded: markRaw(CheckCircle),
    Failed: markRaw(XCircle),
    Unknown: markRaw(AlertTriangle)
  };
  return (m[status] as typeof AlertCircle) || markRaw(AlertCircle);
};

const getStatusType = (status: string) => {
  const t: Record<string, "success" | "warning" | "danger" | "info"> = {
    Running: "success",
    Pending: "warning",
    Succeeded: "success",
    Failed: "danger",
    Unknown: "info"
  };
  return t[status] || "info";
};

const canExecTerminal = (status: string) => status === "Running";

/* YAML */
const yamlDialog = reactive({ visible: false, title: "", content: "", filename: "" });
function openYamlDialog(title: string, content: string, filename: string) {
  yamlDialog.title = title;
  yamlDialog.content = content;
  yamlDialog.filename = filename;
  yamlDialog.visible = true;
}

/* 容器 */
const containerDialogVisible = ref(false);
const containerDialogLoading = ref(false);
const currentContainerData = ref<ContainerInfoList | null>(null);
const containerDialogPodName = ref("");

/* 注入 */
const injectDialogVisible = ref(false);
const injectingEphemeral = ref(false);
const injectTargetPod = ref<PodDetailInfo | null>(null);
const injectTargetPodName = computed(() => injectTargetPod.value?.name || "");
const injectForm = reactive({ containerName: "", image: "" });

function resetInjectForm() {
  injectForm.containerName = "";
  injectForm.image = "";
  injectTargetPod.value = null;
}

const handleViewMonitor = (pod: PodDetailInfo) => {
  if (!selectedCluster.value || !selectedWorkspace.value) return;
  if (!router.hasRoute("podMonitoring")) {
    ElMessage.info("Pod 监控路由未注册（全量 kube-nova-web 包含 podMonitoring）");
    return;
  }
  void router.push({
    name: "podMonitoring",
    query: {
      clusterUuid: selectedCluster.value.clusterUuid,
      namespace: selectedWorkspace.value.namespace,
      podName: pod.name,
      clusterId: String(selectedCluster.value.id)
    }
  });
};

function onLogNotAvailable() {
  ElMessage.info("Pod 实时日志在完整 kube-nova-web 中对接 workload 日志/WS；当前控制台可稍后在同路径接入 getPodLogs");
}

const handleViewContainers = async (pod: PodDetailInfo) => {
  if (!selectedCluster.value || !selectedWorkspace.value) return;
  containerDialogPodName.value = pod.name;
  containerDialogVisible.value = true;
  containerDialogLoading.value = true;
  currentContainerData.value = null;
  try {
    const response = await GetPodContainersWithClusterNamespaceApi({
      podName: pod.name,
      clusterUuid: selectedCluster.value.clusterUuid,
      namespace: selectedWorkspace.value.namespace
    });
    currentContainerData.value = response || { initContainers: [], containers: [], ephemeralContainers: [] };
  } catch {
    currentContainerData.value = { initContainers: [], containers: [], ephemeralContainers: [] };
  } finally {
    containerDialogLoading.value = false;
  }
};

const handleViewYaml = async (pod: PodDetailInfo) => {
  if (!selectedCluster.value || !selectedWorkspace.value) return;
  openYamlDialog("Pod YAML", "# 加载中...", `${pod.name}.yaml`);
  try {
    const response = await getPodYamlWithClusterUuidApi({
      clusterUuid: selectedCluster.value.clusterUuid,
      namespace: selectedWorkspace.value.namespace,
      podName: pod.name
    });
    yamlDialog.content = response || "# 获取失败";
  } catch {
    yamlDialog.content = "# 获取失败";
  }
};

const handleViewPodDetail = async (pod: PodDetailInfo) => {
  if (!selectedCluster.value || !selectedWorkspace.value) return;
  openYamlDialog("Pod 详情", "# 加载中...", `${pod.name}-detail.yaml`);
  try {
    const response = await getPodDetailWithClusterUuidApi({
      clusterUuid: selectedCluster.value.clusterUuid,
      namespace: selectedWorkspace.value.namespace,
      podName: pod.name
    });
    yamlDialog.content = response || "# 获取失败";
  } catch {
    yamlDialog.content = "# 获取失败";
  }
};

const handleTerminal = (pod: PodDetailInfo) => {
  if (!canExecTerminal(pod.status) || !selectedWorkspace.value?.id) return;
  if (!router.hasRoute("TerminalManager")) {
    ElMessage.info("终端页未注册（参考 kube-nova-web 的 TerminalManager 路由）");
    return;
  }
  const href = router.resolve({
    name: "TerminalManager",
    query: { workloadId: String(selectedWorkspace.value.id), podName: pod.name }
  });
  window.open(href.href, "_blank", "noopener,noreferrer");
  ElMessage.success("终端已尝试在新窗口打开");
};

const handleFileManager = (pod: PodDetailInfo) => {
  if (!canExecTerminal(pod.status) || !selectedWorkspace.value?.id) return;
  if (!router.hasRoute("FileManager")) {
    ElMessage.info("文件管理页未注册（参考 kube-nova-web 的 FileManager 路由）");
    return;
  }
  const href = router.resolve({
    name: "FileManager",
    query: { workspaceId: String(selectedWorkspace.value.id), podName: pod.name }
  });
  window.open(href.href, "_blank", "noopener,noreferrer");
  ElMessage.success("文件管理已尝试在新窗口打开");
};

const handleInjectOpen = (pod: PodDetailInfo) => {
  injectTargetPod.value = pod;
  injectDialogVisible.value = true;
};

const submitInject = async () => {
  if (!injectTargetPod.value || !selectedCluster.value || !selectedWorkspace.value) return;
  if (!injectForm.image?.trim()) {
    ElMessage.warning("请填写镜像");
    return;
  }
  injectingEphemeral.value = true;
  try {
    const payload: InjectEphemeralContainerWithClusterUuidRequest = {
      clusterUuid: selectedCluster.value.clusterUuid,
      namespace: selectedWorkspace.value.namespace,
      podName: injectTargetPod.value.name,
      image: injectForm.image.trim()
    };
    if (injectForm.containerName?.trim()) payload.containerName = injectForm.containerName.trim();
    await injectEphemeralContainerWithClusterUuidApi(payload);
    ElMessage.success("临时容器注入成功");
    injectDialogVisible.value = false;
    await loadPods(true);
  } catch {
    /* 全局错误提示或拦截器已处理 */
  } finally {
    injectingEphemeral.value = false;
  }
};

const handleEvict = async (pod: PodDetailInfo) => {
  if (!selectedCluster.value || !selectedWorkspace.value) return;
  try {
    await ElMessageBox.confirm(`确定要驱逐 Pod "${pod.name}" 吗？`, "驱逐确认", {
      type: "warning",
      confirmButtonText: "确定",
      cancelButtonText: "取消"
    });
    evictLoadingMap.value[pod.name] = true;
    await evictPodWithClusterUuidApi({
      clusterUuid: selectedCluster.value.clusterUuid,
      namespace: selectedWorkspace.value.namespace,
      podName: pod.name
    });
    ElMessage.success("驱逐成功");
    await loadPods(true);
  } catch (e) {
    if (e !== "cancel") {
      /* noop */
    }
  } finally {
    evictLoadingMap.value[pod.name] = false;
  }
};

const handleDelete = async (pod: PodDetailInfo) => {
  if (!selectedCluster.value || !selectedWorkspace.value) return;
  try {
    await ElMessageBox.confirm(`确定要删除 Pod "${pod.name}" 吗？`, "删除确认", {
      type: "warning",
      confirmButtonText: "确定",
      cancelButtonText: "取消"
    });
    deleteLoadingMap.value[pod.name] = true;
    await deletePodWithClusterUuidApi({
      clusterUuid: selectedCluster.value.clusterUuid,
      namespace: selectedWorkspace.value.namespace,
      podName: pod.name
    });
    ElMessage.success("删除成功");
    await loadPods(true);
  } catch (e) {
    if (e !== "cancel") {
      /* noop */
    }
  } finally {
    deleteLoadingMap.value[pod.name] = false;
  }
};

function handleMoreCommand(key: string, row: PodDetailInfo) {
  if (opLoading(row.name)) return;
  switch (key) {
    case "monitor":
      handleViewMonitor(row);
      break;
    case "container":
      void handleViewContainers(row);
      break;
    case "yaml":
      void handleViewYaml(row);
      break;
    case "detail":
      void handleViewPodDetail(row);
      break;
    case "inject":
      handleInjectOpen(row);
      break;
    case "evict":
      void handleEvict(row);
      break;
    case "delete":
      void handleDelete(row);
      break;
    default:
  }
}

async function loadPods(silent = false) {
  const ws = activeWorkspace.value;
  if (!ws) {
    tableData.value = [];
    pagination.total = 0;
    return;
  }
  if (!silent) loading.value = true;
  try {
    const id = normalizeId(ws.id);
    if (id == null) {
      tableData.value = [];
      pagination.total = 0;
      if (!silent) ElMessage.error("工作空间 ID 无效，请重新选择工作空间");
      return;
    }
    const response = await listPodsWithPaginationApi(id, {
      page: pagination.current,
      pageSize: pagination.size,
      search: searchForm.search || undefined,
      sortBy: searchForm.sortBy,
      sortDesc: searchForm.sortDesc
    });
    tableData.value = response?.items || [];
    pagination.total = response?.total || 0;
  } catch (e) {
    console.error(e);
    if (!silent) ElMessage.error("拉取 Pod 列表失败，请检查集群与权限");
    tableData.value = [];
    pagination.total = 0;
  } finally {
    if (!silent) loading.value = false;
  }
}

const stopAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value);
    autoRefreshTimer.value = null;
  }
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value);
    countdownTimer.value = null;
  }
  autoRefreshEnabled.value = false;
  autoRefreshInterval.value = 0;
  countdown.value = 0;
};

const startAutoRefresh = (interval: number) => {
  stopAutoRefresh();
  if (interval <= 0) return;
  autoRefreshInterval.value = interval;
  autoRefreshEnabled.value = true;
  countdown.value = interval;
  countdownTimer.value = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) countdown.value = interval;
  }, 1000);
  autoRefreshTimer.value = setInterval(() => {
    void loadPods(true);
  }, interval * 1000);
};

const handleRefreshCommand = (command: string) => {
  if (command === "manual") {
    handleRefresh();
  } else if (command === "disable") {
    stopAutoRefresh();
    ElMessage.success("已关闭自动刷新");
  } else {
    const n = parseInt(command, 10);
    if (!isNaN(n) && n > 0) {
      startAutoRefresh(n);
      ElMessage.success(`已开启自动刷新，每 ${n} 秒一次`);
    }
  }
};

const handleClusterChange = async (clusterId: number | string | null) => {
  const cid = normalizeId(clusterId as number | string | null | undefined);
  saveToStorage(STORAGE_KEY_CLUSTER, cid);
  if (cid) {
    const cluster = clusters.value.find((c: ProjectCluster) => normalizeId(c.id) === cid) ?? null;
    if (cluster) {
      const previousClusterId = selectedCluster.value?.id != null ? normalizeId(selectedCluster.value.id) : null;
      const clusterSwitched = previousClusterId != null && cid != null && previousClusterId !== cid;
      selectedCluster.value = cluster;
      if (clusterSwitched) {
        selectedWorkspaceId.value = null;
        selectedWorkspace.value = null;
        workspaces.value = [];
        tableData.value = [];
        pagination.total = 0;
        saveToStorage(STORAGE_KEY_WORKSPACE, null);
      }
      managementStore.setCluster(cluster, false);
      await loadWorkspaces();
    }
  } else {
    selectedCluster.value = null;
    selectedWorkspaceId.value = null;
    selectedWorkspace.value = null;
    workspaces.value = [];
    tableData.value = [];
    pagination.total = 0;
    managementStore.setCluster(null, false);
    saveToStorage(STORAGE_KEY_WORKSPACE, null);
  }
};

const handleClusterClear = () => {
  void handleClusterChange(null);
  saveToStorage(STORAGE_KEY_CLUSTER, null);
};

const handleWorkspaceChange = async (workspaceId: number | string | null) => {
  const wid = normalizeId(workspaceId as number | string | null | undefined);
  saveToStorage(STORAGE_KEY_WORKSPACE, wid);
  if (wid) {
    const w = workspaces.value.find((x: ProjectWorkspace) => normalizeId(x.id) === wid) ?? null;
    if (w) {
      selectedWorkspace.value = w;
      managementStore.setWorkspace(w, true);
      pagination.current = 1;
      await loadPods();
    } else {
      selectedWorkspaceId.value = null;
      selectedWorkspace.value = null;
      saveToStorage(STORAGE_KEY_WORKSPACE, null);
    }
  } else {
    selectedWorkspace.value = null;
    tableData.value = [];
    pagination.total = 0;
    managementStore.setWorkspace(null, true);
  }
};

const handleWorkspaceClear = () => {
  void handleWorkspaceChange(null);
  saveToStorage(STORAGE_KEY_WORKSPACE, null);
};

const handleReset = () => {
  searchForm.search = "";
  searchForm.sortBy = "creationTime";
  searchForm.sortDesc = true;
  pagination.current = 1;
  void loadPods();
};

const handleSearch = () => {
  pagination.current = 1;
  void loadPods();
};

const handleRefresh = () => {
  void loadPods();
};

const handleSizeChange = (size: number) => {
  pagination.size = size;
  pagination.current = 1;
  void loadPods();
};

const handleCurrentChange = (c: number) => {
  pagination.current = c;
  void loadPods();
};

const loadClusters = async () => {
  if (!selectedProject.value) {
    clusters.value = [];
    return;
  }
  if (loadingClusters.value) return;
  loadingClusters.value = true;
  try {
    const list = await searchProjectClusterApi({ projectId: selectedProject.value.id });
    clusters.value = list || [];

    if (isInitializing.value) {
      const saved = normalizeId(loadFromStorage(STORAGE_KEY_CLUSTER));
      if (saved) {
        const c = clusters.value.find((x: ProjectCluster) => normalizeId(x.id) === saved) || null;
        if (c) {
          selectedClusterId.value = saved;
          selectedCluster.value = c;
        } else {
          saveToStorage(STORAGE_KEY_CLUSTER, null);
          saveToStorage(STORAGE_KEY_WORKSPACE, null);
        }
      } else if (managementStore.selectedClusterId) {
        const mid = normalizeId(managementStore.selectedClusterId);
        const c = mid
          ? clusters.value.find((x: ProjectCluster) => normalizeId(x.id) === mid) || null
          : null;
        if (c) {
          selectedClusterId.value = c.id;
          selectedCluster.value = c;
          saveToStorage(STORAGE_KEY_CLUSTER, c.id);
        }
      }
    }
  } catch (e) {
    console.error(e);
    clusters.value = [];
  } finally {
    loadingClusters.value = false;
  }
};

const loadWorkspaces = async () => {
  const pcid = normalizeId(selectedClusterId.value);
  if (!pcid) {
    workspaces.value = [];
    return;
  }
  if (loadingWorkspaces.value) return;
  loadingWorkspaces.value = true;
  try {
    const list = await searchProjectWorkspaceApi({ projectClusterId: pcid });
    workspaces.value = list || [];
    if (isInitializing.value) {
      const saved = normalizeId(loadFromStorage(STORAGE_KEY_WORKSPACE));
      if (saved) {
        const w = workspaces.value.find((x: ProjectWorkspace) => normalizeId(x.id) === saved) || null;
        if (w) {
          selectedWorkspaceId.value = saved;
          selectedWorkspace.value = w;
        } else {
          saveToStorage(STORAGE_KEY_WORKSPACE, null);
        }
      } else if (managementStore.selectedWorkspaceId) {
        const mid = normalizeId(managementStore.selectedWorkspaceId);
        const w = mid
          ? workspaces.value.find((x: ProjectWorkspace) => normalizeId(x.id) === mid) || null
          : null;
        if (w) {
          selectedWorkspaceId.value = w.id;
          selectedWorkspace.value = w;
          saveToStorage(STORAGE_KEY_WORKSPACE, w.id);
        }
      }
    }
  } catch (e) {
    console.error(e);
    workspaces.value = [];
  } finally {
    loadingWorkspaces.value = false;
    syncOrClearWorkspaceIfMissing();
  }
};

watch(selectedProject, async (np: Project | null, op: Project | null) => {
  if (isInitializing.value) return;
  if (np?.id === op?.id) return;
  saveToStorage(STORAGE_KEY_CLUSTER, null);
  saveToStorage(STORAGE_KEY_WORKSPACE, null);
  selectedClusterId.value = null;
  selectedWorkspaceId.value = null;
  selectedCluster.value = null;
  selectedWorkspace.value = null;
  clusters.value = [];
  workspaces.value = [];
  tableData.value = [];
  pagination.total = 0;
  if (np) await loadClusters();
});

const initPage = async () => {
  if (isInitializing.value) return;
  isInitializing.value = true;
  try {
    await projectStore.ensureInitialized();
    await managementStore.ensureInitialized();
    if (!selectedProject.value) {
      saveToStorage(STORAGE_KEY_CLUSTER, null);
      saveToStorage(STORAGE_KEY_WORKSPACE, null);
      return;
    }
    await loadClusters();
    if (selectedClusterId.value) {
      await loadWorkspaces();
      if (activeWorkspace.value && selectedCluster.value) {
        managementStore.setCluster(selectedCluster.value, false);
        managementStore.setWorkspace(activeWorkspace.value, true);
        await loadPods();
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    setTimeout(() => {
      isInitializing.value = false;
      hasCompletedInitialLoad.value = true;
    }, 100);
  }
};

let initPromise: Promise<void> | null = null;
onMounted(async () => {
  if (!initPromise) initPromise = initPage();
  await initPromise;
});
onActivated(async () => {
  if (!hasCompletedInitialLoad.value) {
    if (!initPromise) initPromise = initPage();
    await initPromise;
    return;
  }
  if (activeWorkspace.value) {
    await loadPods(true);
  }
});
onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<style lang="scss" scoped>
.art-full-height {
  min-height: 60vh;
}
.pod-manager-page {
  padding-bottom: 16px;
}
.scope-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin: 0 0 12px;
  line-height: 1.5;
  code {
    font-size: 12px;
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--el-fill-color-light);
  }
  code.ns {
    color: var(--el-color-primary);
    font-weight: 600;
  }
  .proj {
    margin-left: 4px;
  }
}
.breadcrumb-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
}
.breadcrumb-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
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
  color: var(--el-text-color-secondary);
  font-weight: 500;
  white-space: nowrap;
}
.breadcrumb-select {
  min-width: 200px;
  max-width: 300px;
}
.breadcrumb-separator {
  color: var(--el-text-color-placeholder);
  display: flex;
  align-items: center;
}
.breadcrumb-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.cluster-option,
.workspace-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 8px;
  padding: 8px 0;
  .option-name {
    font-weight: 500;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .option-meta {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }
}
.search-card {
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  margin-bottom: 0;
}
.search-bar-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  .search-title {
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}
.search-form {
  :deep(.el-form-item) {
    margin-bottom: 8px;
  }
}
.art-table-card {
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  padding: 0 0 8px;
}
.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px 0;
  .table-hint {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}
.pod-name-link {
  color: var(--el-color-primary);
  cursor: pointer;
  font-weight: 500;
  &:hover {
    text-decoration: underline;
  }
}
.status-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.status-ico {
  vertical-align: -2px;
}
.op-btns {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0 2px;
}
.pod-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  padding: 0 12px 4px;
}
.empty-container {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--el-border-color-lighter);
}
.empty-description {
  display: flex;
  flex-direction: column;
  align-items: center;
  p {
    margin: 0;
    font-size: 15px;
    color: var(--el-text-color-secondary);
  }
}
.container-loading {
  min-height: 120px;
}
.container-table-wrap {
  h4 {
    margin: 12px 0 8px;
    font-size: 14px;
  }
  .csec:first-child h4 {
    margin-top: 0;
  }
}
.yaml-dialog :deep(.el-dialog__body) {
  padding: 12px 16px 20px;
}
</style>

<style lang="scss">
.pod-cluster-dropdown,
.pod-workspace-dropdown {
  min-width: 360px !important;
}
</style>
