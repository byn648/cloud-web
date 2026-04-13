<template>
  <div class="resource-page">
    <header class="toolbar">
      <div class="left">
        <select v-model.number="selectedProjectId" @change="handleProjectChange">
          <option :value="0">请选择项目</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.name }}{{ project.isSystem === 1 ? " (系统)" : "" }}
          </option>
        </select>
        <select v-model="filters.clusterUuid" @change="loadData">
          <option value="">全部集群</option>
          <option v-for="cluster in clusters" :key="cluster.uuid" :value="cluster.uuid">
            {{ cluster.name }} ({{ cluster.environment }})
          </option>
        </select>
      </div>
      <div class="right">
        <button @click="openCreate" :disabled="selectedProjectId <= 0">分配资源池</button>
        <button @click="loadData" :disabled="selectedProjectId <= 0">刷新</button>
      </div>
    </header>

    <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="success">{{ successMsg }}</div>
    <div v-else-if="selectedProjectId <= 0" class="hint">请先选择项目后再查看资源池</div>

    <table v-if="selectedProjectId > 0" class="resource-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>集群</th>
          <th>CPU(已分配/容量)</th>
          <th>内存(已分配/容量)</th>
          <th>存储(已分配/上限)</th>
          <th>GPU(已分配/容量)</th>
          <th>Pod(已分配/上限)</th>
          <th>超分比例(CPU/内存/GPU)</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="9" class="empty">正在加载资源池...</td>
        </tr>
        <tr v-else-if="resources.length === 0">
          <td colspan="9" class="empty">暂无资源池</td>
        </tr>
        <tr v-for="item in resources" v-else :key="item.id">
          <td>{{ item.id }}</td>
          <td>
            <div>{{ item.clusterName || "-" }}</div>
            <small>{{ item.clusterUuid }}</small>
          </td>
          <td>{{ formatNum(item.cpuAllocated) }}/{{ formatNum(item.cpuCapacity) }}</td>
          <td>{{ formatNum(item.memAllocated) }}/{{ formatNum(item.memCapacity) }}</td>
          <td>{{ formatNum(item.storageAllocated) }}/{{ formatNum(item.storageLimit) }}</td>
          <td>{{ formatNum(item.gpuAllocated) }}/{{ formatNum(item.gpuCapacity) }}</td>
          <td>{{ item.podsAllocated }}/{{ item.podsLimit }}</td>
          <td>
            {{ formatNum(item.cpuOvercommitRatio) }}/{{ formatNum(item.memOvercommitRatio) }}/{{
              formatNum(item.gpuOvercommitRatio)
            }}
          </td>
          <td class="actions">
            <button @click="openEdit(item)">编辑</button>
            <button :disabled="syncLoadingMap[item.id]" @click="syncResource(item)">
              {{ syncLoadingMap[item.id] ? "同步中..." : "同步" }}
            </button>
            <button @click="remove(item)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="dialog.visible" class="dialog-mask" @click.self="closeDialog">
      <div class="dialog">
        <h3>{{ dialog.mode === "create" ? "分配资源池" : "编辑资源池" }}</h3>

        <label>项目</label>
        <select v-model.number="dialog.form.projectId" :disabled="dialog.mode === 'edit'">
          <option :value="0">请选择项目</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.name }}
          </option>
        </select>

        <label>集群</label>
        <select
          v-model="dialog.form.clusterUuid"
          :disabled="dialog.mode === 'edit'"
          @change="handleDialogClusterChange"
        >
          <option value="">请选择集群</option>
          <option v-for="cluster in clusters" :key="cluster.uuid" :value="cluster.uuid">
            {{ cluster.name }} ({{ cluster.environment }})
          </option>
        </select>

        <label>计费配置</label>
        <select v-model.number="dialog.form.priceConfigId" :disabled="dialog.mode === 'edit'">
          <option :value="0">请选择计费配置</option>
          <option v-for="item in priceConfigs" :key="item.id" :value="item.id">
            {{ item.configName }}{{ item.isSystem === 1 ? " (系统)" : "" }}
          </option>
        </select>

        <div v-if="dialog.form.clusterUuid" class="cluster-overview">
          <div class="overview-head">
            <div>
              <div class="overview-title">集群资源概览</div>
              <div class="overview-meta">
                <template v-if="dialogOverview.updatedAt > 0">
                  更新于 {{ formatTime(dialogOverview.updatedAt) }} · 10s 自动刷新
                </template>
                <template v-else>首次加载中</template>
              </div>
            </div>
            <button @click="refreshDialogClusterOverview" :disabled="dialogOverview.loading">
              {{ dialogOverview.loading ? "刷新中..." : "刷新概览" }}
            </button>
          </div>

          <div v-if="dialogOverview.error" class="overview-error">
            {{ dialogOverview.error }}
          </div>

          <div class="overview-grid">
            <div v-for="card in dialogOverviewCards" :key="card.key" class="overview-card">
              <div class="card-title">{{ card.label }}</div>
              <div class="card-values">
                <span :class="['available', { insufficient: card.available < 0 }]">
                  {{ formatMetric(card.available) }}
                </span>
                <span class="divider">/</span>
                <span>{{ formatMetric(card.total) }} {{ card.unit }}</span>
              </div>
              <div class="card-hint">
                资源池已分配容量 {{ formatMetric(card.allocated) }} {{ card.unit }} ({{
                  formatPercent(card.allocatedPercent)
                }})
              </div>
              <div class="progress">
                <div class="progress-inner" :style="{ width: `${Math.min(100, Math.max(0, card.allocatedPercent))}%` }"></div>
              </div>
              <div class="card-sub">当前物理分配率 {{ formatPercent(card.allocatedPercent) }}</div>
            </div>
          </div>
        </div>

        <div class="grid">
          <div class="field">
            <label>CPU 配额(核)</label>
            <input v-model.number="dialog.form.cpuLimit" type="number" min="0" step="0.1" />
          </div>
          <div class="field">
            <label>CPU 超分比例</label>
            <input
              v-model.number="dialog.form.cpuOvercommitRatio"
              type="number"
              min="0.1"
              step="0.1"
            />
          </div>
          <div class="field">
            <label>内存配额(GiB)</label>
            <input v-model.number="dialog.form.memLimit" type="number" min="0" step="0.1" />
          </div>
          <div class="field">
            <label>内存超分比例</label>
            <input
              v-model.number="dialog.form.memOvercommitRatio"
              type="number"
              min="0.1"
              step="0.1"
            />
          </div>
          <div class="field">
            <label>存储配额(GiB)</label>
            <input v-model.number="dialog.form.storageLimit" type="number" min="0" step="1" />
          </div>
          <div class="field">
            <label>GPU 配额</label>
            <input v-model.number="dialog.form.gpuLimit" type="number" min="0" step="1" />
          </div>
          <div class="field">
            <label>GPU 超分比例</label>
            <input
              v-model.number="dialog.form.gpuOvercommitRatio"
              type="number"
              min="0.1"
              step="0.1"
            />
          </div>
          <div class="field">
            <label>Pod 配额</label>
            <input v-model.number="dialog.form.podsLimit" type="number" min="0" step="1" />
          </div>
        </div>

        <section class="advanced-panel">
          <button class="advanced-head" type="button" @click="advancedOpen = !advancedOpen">
            <div class="advanced-title">
              <span class="advanced-icon">⚙</span>
              <span>高级配置</span>
              <span class="advanced-tag">Kubernetes 资源限制</span>
            </div>
            <span class="advanced-arrow">{{ advancedOpen ? "⌃" : "⌄" }}</span>
          </button>

          <div v-if="advancedOpen" class="advanced-body">
            <div class="limit-grid">
              <div v-for="item in k8sLimitFields" :key="item.key" class="limit-item">
                <label>{{ item.label }}</label>
                <div class="stepper">
                  <button
                    type="button"
                    :disabled="dialog.form[item.key] <= 0"
                    @click="adjustLimit(item.key, -item.step)"
                  >
                    −
                  </button>
                  <input
                    v-model.number="dialog.form[item.key]"
                    type="number"
                    min="0"
                    :step="item.step"
                    @blur="normalizeLimitValue(item.key)"
                  />
                  <button type="button" @click="adjustLimit(item.key, item.step)">+</button>
                </div>
              </div>
            </div>

            <div class="ephemeral-card">
              <label>临时存储</label>
              <div class="stepper">
                <button
                  type="button"
                  :disabled="dialog.form.ephemeralStorageLimit <= 0"
                  @click="adjustEphemeral(-1)"
                >
                  −
                </button>
                <input
                  v-model.number="dialog.form.ephemeralStorageLimit"
                  type="number"
                  min="0"
                  step="1"
                  @blur="normalizeEphemeral()"
                />
                <button type="button" @click="adjustEphemeral(1)">+</button>
              </div>
              <small>单位：Gi</small>
            </div>
          </div>
        </section>

        <div class="dialog-actions">
          <button @click="closeDialog">取消</button>
          <button @click="submitDialog">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import {
  addProjectClusterApi,
  deleteProjectClusterApi,
  searchProjectApi,
  searchProjectClusterApi,
  syncProjectClusterResourceApi,
  type AddProjectClusterRequest,
  type Project,
  type ProjectCluster,
  type UpdateProjectClusterRequest,
  updateProjectClusterApi
} from "../../../api/manager/project";
import { getBillingPriceConfigListApi, type BillingPriceConfig } from "../../../api/manager/billing";
import {
  getResourceDashboardSummaryApi,
  type ResourceDashboardSummary
} from "../../../api/manager/dashboard";
import { searchClusterApi, type Cluster } from "../../../api/manager/cluster";

const loading = ref(false);
const errorMsg = ref("");
const successMsg = ref("");
const selectedProjectId = ref(0);
const projects = ref<Project[]>([]);
const clusters = ref<Cluster[]>([]);
const resources = ref<ProjectCluster[]>([]);
const priceConfigs = ref<BillingPriceConfig[]>([]);
const syncLoadingMap = ref<Record<number, boolean>>({});
let successTimer = 0;
const DEFAULT_NO_BILLING_CONFIG: BillingPriceConfig = {
  id: 1,
  configName: "不计费",
  description: "默认不计费",
  cpuPrice: 0,
  memoryPrice: 0,
  storagePrice: 0,
  gpuPrice: 0,
  podPrice: 0,
  managementFee: 0,
  isSystem: 1,
  createdBy: "",
  updatedBy: "",
  createdAt: 0,
  updatedAt: 0
};

const filters = reactive({
  clusterUuid: ""
});

const dialog = reactive({
  visible: false,
  mode: "create" as "create" | "edit",
  targetId: 0,
  form: {
    projectId: 0,
    clusterUuid: "",
    priceConfigId: 0,
    cpuLimit: 0,
    cpuOvercommitRatio: 1,
    memLimit: 0,
    memOvercommitRatio: 1,
    storageLimit: 0,
    ephemeralStorageLimit: 100,
    gpuLimit: 0,
    gpuOvercommitRatio: 1,
    podsLimit: 100,
    configmapLimit: 100,
    secretLimit: 100,
    pvcLimit: 100,
    serviceLimit: 100,
    loadbalancersLimit: 10,
    nodeportsLimit: 100,
    deploymentsLimit: 100,
    jobsLimit: 100,
    cronjobsLimit: 50,
    daemonsetsLimit: 10,
    statefulsetsLimit: 50,
    ingressesLimit: 50
  },
  baseline: {
    cpu: 0,
    memory: 0,
    storage: 0,
    gpu: 0
  }
});

type K8sLimitKey =
  | "configmapLimit"
  | "secretLimit"
  | "pvcLimit"
  | "serviceLimit"
  | "ingressesLimit"
  | "deploymentsLimit"
  | "jobsLimit"
  | "cronjobsLimit"
  | "daemonsetsLimit"
  | "statefulsetsLimit"
  | "loadbalancersLimit"
  | "nodeportsLimit";

const k8sLimitFields: Array<{ key: K8sLimitKey; label: string; step: number }> = [
  { key: "configmapLimit", label: "ConfigMap", step: 1 },
  { key: "secretLimit", label: "Secret", step: 1 },
  { key: "pvcLimit", label: "PVC", step: 1 },
  { key: "serviceLimit", label: "Service", step: 1 },
  { key: "ingressesLimit", label: "Ingress", step: 1 },
  { key: "deploymentsLimit", label: "Deployment", step: 1 },
  { key: "jobsLimit", label: "Job", step: 1 },
  { key: "cronjobsLimit", label: "CronJob", step: 1 },
  { key: "daemonsetsLimit", label: "DaemonSet", step: 1 },
  { key: "statefulsetsLimit", label: "StatefulSet", step: 1 },
  { key: "loadbalancersLimit", label: "LoadBalancer", step: 1 },
  { key: "nodeportsLimit", label: "NodePort", step: 1 }
];

const advancedOpen = ref(true);
const DIALOG_OVERVIEW_REFRESH_MS = 10_000;

interface DialogOverviewCard {
  key: "cpu" | "memory" | "storage" | "gpu";
  label: string;
  unit: string;
  total: number;
  allocated: number;
  available: number;
  allocatedPercent: number;
}

const dialogOverview = reactive({
  loading: false,
  error: "",
  updatedAt: 0,
  summary: null as ResourceDashboardSummary | null
});

let dialogOverviewTimer: ReturnType<typeof setInterval> | null = null;

const dialogOverviewCards = computed<DialogOverviewCard[]>(() => {
  const summary = dialogOverview.summary;
  const cpuOverview = summary?.allocationOverview.cpu;
  const memOverview = summary?.allocationOverview.mem;
  const storageOverview = summary?.allocationOverview.storage;
  const gpuOverview = summary?.allocationOverview.gpu;

  const cpuAllocated = Math.max(0, safeNumber(cpuOverview?.capacity) - dialog.baseline.cpu);
  const memAllocated = Math.max(0, safeNumber(memOverview?.capacity) - dialog.baseline.memory);
  const storageAllocated = Math.max(0, safeNumber(storageOverview?.limit) - dialog.baseline.storage);
  const gpuAllocated = Math.max(0, safeNumber(gpuOverview?.capacity) - dialog.baseline.gpu);

  return [
    buildOverviewCard(
      "cpu",
      "CPU 资源",
      cpuOverview?.unit || "核",
      safeNumber(cpuOverview?.physical),
      cpuAllocated
    ),
    buildOverviewCard(
      "memory",
      "内存资源",
      memOverview?.unit || "GiB",
      safeNumber(memOverview?.physical),
      memAllocated
    ),
    buildOverviewCard(
      "storage",
      "存储资源",
      storageOverview?.unit || "GiB",
      safeNumber(storageOverview?.physical),
      storageAllocated
    ),
    buildOverviewCard(
      "gpu",
      "GPU 资源",
      gpuOverview?.unit || "个",
      safeNumber(gpuOverview?.physical),
      gpuAllocated
    )
  ];
});

function formatNum(v: number | undefined): string {
  if (typeof v !== "number" || Number.isNaN(v)) return "0";
  return v.toFixed(2);
}

function showSuccess(message: string): void {
  successMsg.value = message;
  window.clearTimeout(successTimer);
  successTimer = window.setTimeout(() => {
    successMsg.value = "";
  }, 2200);
}

function formatMetric(v: number): string {
  if (!Number.isFinite(v)) return "0";
  const abs = Math.abs(v);
  if (abs >= 1000) return v.toFixed(0);
  if (abs >= 100) return v.toFixed(1);
  return v.toFixed(2);
}

function formatPercent(v: number): string {
  if (!Number.isFinite(v) || v < 0) return "0.00%";
  return `${v.toFixed(2)}%`;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  const ss = `${date.getSeconds()}`.padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function safeNumber(v: number | undefined): number {
  if (typeof v !== "number" || Number.isNaN(v) || !Number.isFinite(v)) {
    return 0;
  }
  return v;
}

function normalizeNonNegativeInt(v: number): number {
  if (!Number.isFinite(v)) {
    return 0;
  }
  return Math.max(0, Math.floor(v));
}

function adjustLimit(key: K8sLimitKey, delta: number): void {
  const current = normalizeNonNegativeInt(Number(dialog.form[key]));
  const next = Math.max(0, current + delta);
  dialog.form[key] = next;
}

function normalizeLimitValue(key: K8sLimitKey): void {
  dialog.form[key] = normalizeNonNegativeInt(Number(dialog.form[key]));
}

function adjustEphemeral(delta: number): void {
  const current = Number(dialog.form.ephemeralStorageLimit);
  const safeCurrent = Number.isFinite(current) ? current : 0;
  dialog.form.ephemeralStorageLimit = Math.max(0, Math.round((safeCurrent + delta) * 100) / 100);
}

function normalizeEphemeral(): void {
  const current = Number(dialog.form.ephemeralStorageLimit);
  if (!Number.isFinite(current) || current < 0) {
    dialog.form.ephemeralStorageLimit = 0;
    return;
  }
  dialog.form.ephemeralStorageLimit = Math.round(current * 100) / 100;
}

function buildOverviewCard(
  key: DialogOverviewCard["key"],
  label: string,
  unit: string,
  total: number,
  allocated: number
): DialogOverviewCard {
  const safeTotal = safeNumber(total);
  const safeAllocated = safeNumber(allocated);
  return {
    key,
    label,
    unit,
    total: safeTotal,
    allocated: safeAllocated,
    available: safeTotal - safeAllocated,
    allocatedPercent: safeTotal > 0 ? (safeAllocated / safeTotal) * 100 : 0
  };
}

async function loadProjects() {
  const resp = await searchProjectApi({ page: 1, pageSize: 200 });
  projects.value = resp.items ?? [];
  if (selectedProjectId.value <= 0 && projects.value.length > 0) {
    selectedProjectId.value = projects.value[0]?.id ?? 0;
  }
}

async function loadClusters() {
  const resp = await searchClusterApi();
  clusters.value = resp.items ?? [];
}

async function loadPriceConfigs() {
  try {
    const configs = await getBillingPriceConfigListApi();
    if (configs.length > 0) {
      priceConfigs.value = configs;
    } else {
      priceConfigs.value = [DEFAULT_NO_BILLING_CONFIG];
    }
  } catch (error) {
    // 若当前角色无计费配置读取权限，默认兜底为“不计费”。
    priceConfigs.value = [DEFAULT_NO_BILLING_CONFIG];
    const message = error instanceof Error ? error.message : "";
    if (message.includes("无权限访问")) {
      errorMsg.value = "当前角色无计费配置访问权限，已自动使用“默认不计费”。";
    } else if (message) {
      errorMsg.value = message;
    }
  }

  if (dialog.mode === "create" && dialog.form.priceConfigId <= 0) {
    dialog.form.priceConfigId = priceConfigs.value[0]?.id ?? DEFAULT_NO_BILLING_CONFIG.id;
  }
}

async function loadData() {
  if (selectedProjectId.value <= 0) {
    resources.value = [];
    return;
  }
  loading.value = true;
  errorMsg.value = "";
  try {
    resources.value = await searchProjectClusterApi({
      projectId: selectedProjectId.value,
      clusterUuid: filters.clusterUuid || undefined
    });
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "加载资源池失败";
  } finally {
    loading.value = false;
  }
}

function handleProjectChange() {
  filters.clusterUuid = "";
  void loadData();
}

function resetDialogForm() {
  dialog.form.projectId = selectedProjectId.value;
  dialog.form.clusterUuid = "";
  dialog.form.priceConfigId = priceConfigs.value[0]?.id ?? DEFAULT_NO_BILLING_CONFIG.id;
  dialog.form.cpuLimit = 0;
  dialog.form.cpuOvercommitRatio = 1;
  dialog.form.memLimit = 0;
  dialog.form.memOvercommitRatio = 1;
  dialog.form.storageLimit = 0;
  dialog.form.ephemeralStorageLimit = 100;
  dialog.form.gpuLimit = 0;
  dialog.form.gpuOvercommitRatio = 1;
  dialog.form.podsLimit = 100;
  dialog.form.configmapLimit = 100;
  dialog.form.secretLimit = 100;
  dialog.form.pvcLimit = 100;
  dialog.form.serviceLimit = 100;
  dialog.form.loadbalancersLimit = 10;
  dialog.form.nodeportsLimit = 100;
  dialog.form.deploymentsLimit = 100;
  dialog.form.jobsLimit = 100;
  dialog.form.cronjobsLimit = 50;
  dialog.form.daemonsetsLimit = 10;
  dialog.form.statefulsetsLimit = 50;
  dialog.form.ingressesLimit = 50;
  dialog.baseline.cpu = 0;
  dialog.baseline.memory = 0;
  dialog.baseline.storage = 0;
  dialog.baseline.gpu = 0;
}

function resetDialogOverview() {
  dialogOverview.loading = false;
  dialogOverview.error = "";
  dialogOverview.updatedAt = 0;
  dialogOverview.summary = null;
}

function stopDialogOverviewPolling() {
  if (dialogOverviewTimer) {
    clearInterval(dialogOverviewTimer);
    dialogOverviewTimer = null;
  }
}

function startDialogOverviewPolling() {
  stopDialogOverviewPolling();
  if (!dialog.visible || !dialog.form.clusterUuid) {
    return;
  }
  dialogOverviewTimer = setInterval(() => {
    void refreshDialogClusterOverview();
  }, DIALOG_OVERVIEW_REFRESH_MS);
}

function handleDialogClusterChange() {
  void refreshDialogClusterOverview();
  startDialogOverviewPolling();
}

async function refreshDialogClusterOverview() {
  const clusterUuid = dialog.form.clusterUuid.trim();
  if (!clusterUuid) {
    resetDialogOverview();
    return;
  }

  dialogOverview.loading = true;
  dialogOverview.error = "";
  try {
    dialogOverview.summary = await getResourceDashboardSummaryApi({ clusterUuid });
    dialogOverview.updatedAt = Date.now();
  } catch (error) {
    dialogOverview.error = error instanceof Error ? error.message : "集群资源概览加载失败";
  } finally {
    dialogOverview.loading = false;
  }
}

function openCreate() {
  dialog.visible = true;
  dialog.mode = "create";
  dialog.targetId = 0;
  advancedOpen.value = true;
  resetDialogForm();
  resetDialogOverview();
}

function openEdit(item: ProjectCluster) {
  dialog.visible = true;
  dialog.mode = "edit";
  dialog.targetId = item.id;
  advancedOpen.value = true;
  dialog.form.projectId = item.projectId;
  dialog.form.clusterUuid = item.clusterUuid;
  dialog.form.priceConfigId = 0;
  dialog.form.cpuLimit = item.cpuLimit;
  dialog.form.cpuOvercommitRatio = item.cpuOvercommitRatio || 1;
  dialog.form.memLimit = item.memLimit;
  dialog.form.memOvercommitRatio = item.memOvercommitRatio || 1;
  dialog.form.storageLimit = item.storageLimit || 0;
  dialog.form.ephemeralStorageLimit = item.ephemeralStorageLimit || 0;
  dialog.form.gpuLimit = item.gpuLimit || 0;
  dialog.form.gpuOvercommitRatio = item.gpuOvercommitRatio || 1;
  dialog.form.podsLimit = item.podsLimit || 0;
  dialog.form.configmapLimit = item.configmapLimit || 0;
  dialog.form.secretLimit = item.secretLimit || 0;
  dialog.form.pvcLimit = item.pvcLimit || 0;
  dialog.form.serviceLimit = item.serviceLimit || 0;
  dialog.form.loadbalancersLimit = item.loadbalancersLimit || 0;
  dialog.form.nodeportsLimit = item.nodeportsLimit || 0;
  dialog.form.deploymentsLimit = item.deploymentsLimit || 0;
  dialog.form.jobsLimit = item.jobsLimit || 0;
  dialog.form.cronjobsLimit = item.cronjobsLimit || 0;
  dialog.form.daemonsetsLimit = item.daemonsetsLimit || 0;
  dialog.form.statefulsetsLimit = item.statefulsetsLimit || 0;
  dialog.form.ingressesLimit = item.ingressesLimit || 0;
  dialog.baseline.cpu = safeNumber(item.cpuCapacity > 0 ? item.cpuCapacity : item.cpuLimit);
  dialog.baseline.memory = safeNumber(item.memCapacity > 0 ? item.memCapacity : item.memLimit);
  dialog.baseline.storage = safeNumber(item.storageLimit);
  dialog.baseline.gpu = safeNumber(item.gpuCapacity > 0 ? item.gpuCapacity : item.gpuLimit);
  void refreshDialogClusterOverview();
  startDialogOverviewPolling();
}

function closeDialog() {
  dialog.visible = false;
  stopDialogOverviewPolling();
}

async function submitDialog() {
  if (dialog.form.projectId <= 0) {
    errorMsg.value = "请选择项目";
    return;
  }
  if (!dialog.form.clusterUuid) {
    errorMsg.value = "请选择集群";
    return;
  }
  if (dialog.form.cpuLimit < 0 || dialog.form.memLimit < 0) {
    errorMsg.value = "资源配额不能小于0";
    return;
  }
  if (dialog.mode === "create" && dialog.form.priceConfigId <= 0) {
    dialog.form.priceConfigId = priceConfigs.value[0]?.id ?? DEFAULT_NO_BILLING_CONFIG.id;
    if (dialog.form.priceConfigId <= 0) {
      errorMsg.value = "请选择计费配置";
      return;
    }
  }

  try {
    if (dialog.mode === "create") {
      const payload: AddProjectClusterRequest = {
        projectId: dialog.form.projectId,
        clusterUuid: dialog.form.clusterUuid,
        priceConfigId: dialog.form.priceConfigId,
        cpuLimit: dialog.form.cpuLimit,
        cpuOvercommitRatio: dialog.form.cpuOvercommitRatio,
        cpuCapacity: dialog.form.cpuLimit * dialog.form.cpuOvercommitRatio,
        memLimit: dialog.form.memLimit,
        memOvercommitRatio: dialog.form.memOvercommitRatio,
        memCapacity: dialog.form.memLimit * dialog.form.memOvercommitRatio,
        storageLimit: dialog.form.storageLimit,
        ephemeralStorageLimit: dialog.form.ephemeralStorageLimit,
        gpuLimit: dialog.form.gpuLimit,
        gpuOvercommitRatio: dialog.form.gpuOvercommitRatio,
        gpuCapacity: dialog.form.gpuLimit * dialog.form.gpuOvercommitRatio,
        podsLimit: dialog.form.podsLimit,
        configmapLimit: dialog.form.configmapLimit,
        secretLimit: dialog.form.secretLimit,
        pvcLimit: dialog.form.pvcLimit,
        serviceLimit: dialog.form.serviceLimit,
        loadbalancersLimit: dialog.form.loadbalancersLimit,
        nodeportsLimit: dialog.form.nodeportsLimit,
        deploymentsLimit: dialog.form.deploymentsLimit,
        jobsLimit: dialog.form.jobsLimit,
        cronjobsLimit: dialog.form.cronjobsLimit,
        daemonsetsLimit: dialog.form.daemonsetsLimit,
        statefulsetsLimit: dialog.form.statefulsetsLimit,
        ingressesLimit: dialog.form.ingressesLimit
      };
      await addProjectClusterApi(payload);
      showSuccess("资源池分配成功");
    } else {
      const payload: UpdateProjectClusterRequest = {
        cpuLimit: dialog.form.cpuLimit,
        cpuOvercommitRatio: dialog.form.cpuOvercommitRatio,
        cpuCapacity: dialog.form.cpuLimit * dialog.form.cpuOvercommitRatio,
        memLimit: dialog.form.memLimit,
        memOvercommitRatio: dialog.form.memOvercommitRatio,
        memCapacity: dialog.form.memLimit * dialog.form.memOvercommitRatio,
        storageLimit: dialog.form.storageLimit,
        ephemeralStorageLimit: dialog.form.ephemeralStorageLimit,
        gpuLimit: dialog.form.gpuLimit,
        gpuOvercommitRatio: dialog.form.gpuOvercommitRatio,
        gpuCapacity: dialog.form.gpuLimit * dialog.form.gpuOvercommitRatio,
        podsLimit: dialog.form.podsLimit,
        configmapLimit: dialog.form.configmapLimit,
        secretLimit: dialog.form.secretLimit,
        pvcLimit: dialog.form.pvcLimit,
        serviceLimit: dialog.form.serviceLimit,
        loadbalancersLimit: dialog.form.loadbalancersLimit,
        nodeportsLimit: dialog.form.nodeportsLimit,
        deploymentsLimit: dialog.form.deploymentsLimit,
        jobsLimit: dialog.form.jobsLimit,
        cronjobsLimit: dialog.form.cronjobsLimit,
        daemonsetsLimit: dialog.form.daemonsetsLimit,
        statefulsetsLimit: dialog.form.statefulsetsLimit,
        ingressesLimit: dialog.form.ingressesLimit
      };
      await updateProjectClusterApi(dialog.targetId, payload);
      showSuccess("资源池更新成功");
    }
    dialog.visible = false;
    await loadData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "保存资源池失败";
  }
}

async function remove(item: ProjectCluster) {
  if (!confirm(`确定删除资源池 "${item.clusterName}" 吗？`)) return;
  try {
    await deleteProjectClusterApi(item.id);
    showSuccess("资源池删除成功");
    await loadData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "删除资源池失败";
  }
}

async function syncResource(item: ProjectCluster): Promise<void> {
  syncLoadingMap.value[item.id] = true;
  errorMsg.value = "";
  try {
    await syncProjectClusterResourceApi(item.id);
    showSuccess(`已触发 ${item.clusterName || item.clusterUuid} 资源池同步`);
    await loadData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "同步资源池失败";
  } finally {
    syncLoadingMap.value[item.id] = false;
  }
}

watch(
  () => dialog.visible,
  (visible) => {
    if (!visible) {
      stopDialogOverviewPolling();
      return;
    }
    if (dialog.form.clusterUuid) {
      void refreshDialogClusterOverview();
      startDialogOverviewPolling();
    }
  }
);

watch(
  () => dialog.form.clusterUuid,
  (clusterUuid) => {
    if (!dialog.visible) {
      return;
    }
    if (!clusterUuid) {
      resetDialogOverview();
      stopDialogOverviewPolling();
      return;
    }
    void refreshDialogClusterOverview();
    startDialogOverviewPolling();
  }
);

onBeforeUnmount(() => {
  stopDialogOverviewPolling();
  window.clearTimeout(successTimer);
});

onMounted(async () => {
  try {
    await Promise.all([loadProjects(), loadClusters(), loadPriceConfigs()]);
    if (selectedProjectId.value > 0) {
      await loadData();
    }
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "初始化失败";
  }
});
</script>

<style scoped>
.resource-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.left,
.right {
  display: flex;
  align-items: center;
  gap: 8px;
}

select,
input,
button {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  background: #fff;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.hint {
  color: #6b7280;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  padding: 10px 12px;
}

.error {
  color: #b91c1c;
  background: #fee2e2;
  border: 1px solid #fecaca;
  padding: 8px 10px;
  border-radius: 6px;
}

.success {
  color: #166534;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  padding: 8px 10px;
  border-radius: 6px;
}

.resource-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}

.resource-table th,
.resource-table td {
  border: 1px solid #e5e7eb;
  padding: 8px 10px;
  text-align: left;
  font-size: 13px;
}

.resource-table th {
  background: #f3f4f6;
}

.actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.empty {
  text-align: center;
  color: #6b7280;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: grid;
  place-items: center;
  z-index: 1000;
}

.dialog {
  width: min(920px, 94vw);
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 90vh;
  overflow: auto;
}

.cluster-overview {
  border: 1px solid #dbe4f2;
  background: #f8fbff;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.overview-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.overview-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.overview-meta {
  font-size: 12px;
  color: #64748b;
}

.overview-error {
  color: #b91c1c;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 12px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.overview-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.card-values {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.available {
  color: #166534;
}

.available.insufficient {
  color: #b91c1c;
}

.divider {
  color: #64748b;
  margin: 0 2px;
}

.card-hint,
.card-sub {
  font-size: 12px;
  color: #475569;
}

.progress {
  height: 6px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.progress-inner {
  height: 100%;
  background: linear-gradient(90deg, #60a5fa 0%, #2563eb 100%);
  transition: width 0.3s ease;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.advanced-panel {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.advanced-head {
  width: 100%;
  border: none;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.advanced-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.advanced-icon {
  color: #475569;
}

.advanced-tag {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 999px;
  font-size: 12px;
  padding: 2px 8px;
  font-weight: 500;
}

.advanced-arrow {
  color: #64748b;
  font-size: 16px;
  line-height: 1;
}

.advanced-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.limit-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 12px;
}

.limit-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stepper {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 40px;
  align-items: center;
}

.stepper > button {
  border-radius: 0;
  height: 34px;
  padding: 0;
  font-size: 20px;
  color: #334155;
}

.stepper > button:first-child {
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}

.stepper > button:last-child {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

.stepper > input {
  border-radius: 0;
  text-align: center;
  height: 34px;
}

.ephemeral-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 280px;
}

.ephemeral-card small {
  color: #64748b;
  font-size: 12px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 768px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }

  .grid {
    grid-template-columns: 1fr;
  }

  .limit-grid {
    grid-template-columns: 1fr;
  }
}
</style>
