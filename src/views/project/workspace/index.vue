<template>
  <div class="workspace-page">
    <header class="toolbar">
      <div class="left">
        <select v-model.number="selectedProjectId" @change="handleProjectChange">
          <option :value="0">请选择项目</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.name }}{{ project.isSystem === 1 ? " (系统)" : "" }}
          </option>
        </select>

        <div class="project-cluster-summary">
          已授权 {{ projectClusters.length }} 个集群
        </div>

        <input v-model.trim="filters.name" placeholder="按工作空间名称搜索" />
        <input v-model.trim="filters.namespace" placeholder="按命名空间搜索" />
        <button @click="search">搜索</button>
        <button @click="reset">重置</button>
      </div>
      <div class="right">
        <button @click="openCreate" :disabled="selectedProjectId <= 0 || projectClusters.length === 0">新建工作空间</button>
        <button @click="loadData" :disabled="selectedProjectId <= 0">刷新</button>
      </div>
    </header>

    <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="success">{{ successMsg }}</div>
    <div v-else-if="selectedProjectId <= 0" class="hint">请先选择项目</div>
    <div v-else-if="projectClusters.length === 0" class="hint">当前项目还没有授权集群资源池，请先在资源池中分配集群</div>

    <table v-if="selectedProjectId > 0 && projectClusters.length > 0" class="workspace-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>工作空间</th>
          <th>命名空间</th>
          <th>绑定集群</th>
          <th>CPU</th>
          <th>内存(GiB)</th>
          <th>存储(GiB)</th>
          <th>GPU</th>
          <th>Pods</th>
          <th>描述</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="11" class="empty">正在加载工作空间...</td>
        </tr>
        <tr v-else-if="workspaces.length === 0">
          <td colspan="11" class="empty">暂无工作空间</td>
        </tr>
        <tr v-for="item in workspaces" v-else :key="item.key">
          <td>{{ item.id }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.namespace }}</td>
          <td>
            <div class="bound-clusters">
              <span v-for="cluster in item.boundClusters" :key="cluster.projectClusterId">
                {{ cluster.clusterName || cluster.clusterUuid }}
              </span>
            </div>
          </td>
          <td>{{ formatNum(item.cpuAllocated) }}</td>
          <td>{{ formatNum(item.memAllocated) }}</td>
          <td>{{ formatNum(item.storageAllocated) }}</td>
          <td>{{ formatNum(item.gpuAllocated) }}</td>
          <td>{{ item.podsAllocated }}</td>
          <td>{{ item.description || "-" }}</td>
          <td class="actions">
            <button @click="openEdit(item)">编辑</button>
            <button :disabled="syncLoadingMap[item.id]" @click="syncWorkspace(item)">
              {{ syncLoadingMap[item.id] ? "同步中..." : "同步" }}
            </button>
            <button @click="remove(item)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="dialog.visible" class="dialog-mask" @click.self="closeDialog">
      <div class="dialog">
        <h3>{{ dialog.mode === "create" ? "新建工作空间" : "编辑工作空间" }}</h3>
        <label>工作空间名称</label>
        <input v-model.trim="dialog.form.name" maxlength="100" />

        <label>命名空间</label>
        <input
          v-model.trim="dialog.form.namespace"
          maxlength="63"
          :disabled="dialog.mode === 'edit'"
          placeholder="例如 dev-default"
        />

        <template v-if="dialog.mode === 'create'">
          <label>关联集群</label>
          <div class="cluster-binding-summary">
            <strong>自动关联当前项目的全部 {{ projectClusters.length }} 个集群</strong>
            <span v-for="item in projectClusters" :key="item.id">
              {{ item.clusterName || item.clusterUuid }}
            </span>
          </div>
          <p class="form-hint">
            将在当前项目已授权的所有集群中创建同名 Namespace，并分别配置 ResourceQuota / LimitRange。
          </p>
        </template>

        <div class="grid">
          <div class="field">
            <label>CPU</label>
            <input v-model.number="dialog.form.cpuAllocated" type="number" min="0" step="0.1" />
          </div>
          <div class="field">
            <label>内存(GiB)</label>
            <input v-model.number="dialog.form.memAllocated" type="number" min="0" step="0.1" />
          </div>
          <div class="field">
            <label>存储(GiB)</label>
            <input v-model.number="dialog.form.storageAllocated" type="number" min="0" step="0.1" />
          </div>
          <div class="field">
            <label>GPU</label>
            <input v-model.number="dialog.form.gpuAllocated" type="number" min="0" step="0.1" />
          </div>
          <div class="field">
            <label>Pods</label>
            <input v-model.number="dialog.form.podsAllocated" type="number" min="0" step="1" />
          </div>
        </div>

        <label>描述</label>
        <textarea v-model.trim="dialog.form.description" rows="3" maxlength="500" />

        <div class="dialog-actions">
          <button @click="closeDialog">取消</button>
          <button @click="submitDialog">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  addProjectWorkspaceApi,
  deleteProjectWorkspaceApi,
  getProjectWorkspaceApi,
  listProjectsForSelectors,
  searchProjectClusterApi,
  searchProjectWorkspaceApi,
  syncWorkspaceApi,
  type AddProjectWorkspaceRequest,
  type Project,
  type ProjectCluster,
  type ProjectWorkspace,
  type UpdateProjectWorkspaceRequest,
  updateProjectWorkspaceApi
} from "../../../api/manager/project";

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const errorMsg = ref("");
const successMsg = ref("");
const syncLoadingMap = ref<Record<number, boolean>>({});
let successTimer = 0;

const selectedProjectId = ref(0);
const selectedProjectClusterId = ref(0);
const projects = ref<Project[]>([]);
const projectClusters = ref<ProjectCluster[]>([]);

interface BoundWorkspaceCluster {
  id: number;
  projectClusterId: number;
  clusterUuid: string;
  clusterName: string;
}

interface WorkspaceRow extends ProjectWorkspace {
  key: string;
  bindingIds: number[];
  projectClusterIds: number[];
  boundClusters: BoundWorkspaceCluster[];
  sourceRows: ProjectWorkspace[];
}

const workspaces = ref<WorkspaceRow[]>([]);

const filters = reactive({
  name: "",
  namespace: ""
});

const dialog = reactive({
  visible: false,
  mode: "create" as "create" | "edit",
  targetId: 0,
  targetIds: [] as number[],
  form: {
    name: "",
    namespace: "",
    description: "",
    cpuAllocated: 0,
    memAllocated: 0,
    storageAllocated: 0,
    gpuAllocated: 0,
    podsAllocated: 0,
    projectClusterIds: [] as number[]
  }
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

async function loadProjects() {
  projects.value = await listProjectsForSelectors();
  if (selectedProjectId.value <= 0 && projects.value.length > 0) {
    selectedProjectId.value = projects.value[0]?.id ?? 0;
  }
}

async function loadProjectClusters() {
  if (selectedProjectId.value <= 0) {
    projectClusters.value = [];
    selectedProjectClusterId.value = 0;
    return;
  }
  const items = await searchProjectClusterApi({ projectId: selectedProjectId.value });
  projectClusters.value = items ?? [];
  selectedProjectClusterId.value = projectClusters.value[0]?.id ?? 0;
}

async function loadData() {
  if (selectedProjectId.value <= 0 || projectClusters.value.length === 0) {
    workspaces.value = [];
    return;
  }
  loading.value = true;
  errorMsg.value = "";
  try {
    const rowsByCluster = await Promise.all(
      projectClusters.value.map(async (cluster) => {
        try {
          return await searchProjectWorkspaceApi({
            projectClusterId: cluster.id,
            name: filters.name || undefined,
            namespace: filters.namespace || undefined
          });
        } catch {
          return [];
        }
      })
    );
    workspaces.value = groupWorkspaceRows(rowsByCluster.flat());
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "加载工作空间失败";
  } finally {
    loading.value = false;
  }
}

function groupWorkspaceRows(rows: ProjectWorkspace[]): WorkspaceRow[] {
  const grouped = new Map<string, WorkspaceRow>();
  rows.forEach((row) => {
    const key = `${row.namespace || row.id}::${row.name || ""}`;
    const existing = grouped.get(key);
    const boundCluster: BoundWorkspaceCluster = {
      id: row.id,
      projectClusterId: row.projectClusterId,
      clusterUuid: row.clusterUuid,
      clusterName: row.clusterName
    };

    if (!existing) {
      grouped.set(key, {
        ...row,
        key,
        bindingIds: [row.id],
        projectClusterIds: [row.projectClusterId],
        boundClusters: [boundCluster],
        sourceRows: [row]
      });
      return;
    }

    existing.bindingIds.push(row.id);
    existing.projectClusterIds.push(row.projectClusterId);
    existing.boundClusters.push(boundCluster);
    existing.sourceRows.push(row);
  });

  return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
}

async function handleProjectChange() {
  filters.name = "";
  filters.namespace = "";
  try {
    await loadProjectClusters();
    await loadData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "加载资源池失败";
  }
}

function search() {
  void loadData();
}

function reset() {
  filters.name = "";
  filters.namespace = "";
  void loadData();
}

function resetDialogForm() {
  dialog.form.name = "";
  dialog.form.namespace = "";
  dialog.form.description = "";
  dialog.form.cpuAllocated = 0;
  dialog.form.memAllocated = 0;
  dialog.form.storageAllocated = 0;
  dialog.form.gpuAllocated = 0;
  dialog.form.podsAllocated = 0;
  dialog.form.projectClusterIds = [];
}

function openCreate() {
  dialog.visible = true;
  dialog.mode = "create";
  dialog.targetId = 0;
  dialog.targetIds = [];
  resetDialogForm();
  dialog.form.projectClusterIds = projectClusters.value.map((item) => item.id).filter((id) => id > 0);
}

function openEdit(item: WorkspaceRow) {
  dialog.visible = true;
  dialog.mode = "edit";
  dialog.targetId = item.id;
  dialog.targetIds = [...item.bindingIds];
  dialog.form.name = item.name;
  dialog.form.namespace = item.namespace;
  dialog.form.description = item.description || "";
  dialog.form.cpuAllocated = item.cpuAllocated || 0;
  dialog.form.memAllocated = item.memAllocated || 0;
  dialog.form.storageAllocated = item.storageAllocated || 0;
  dialog.form.gpuAllocated = item.gpuAllocated || 0;
  dialog.form.podsAllocated = item.podsAllocated || 0;
  dialog.form.projectClusterIds = [...item.projectClusterIds];
}

function closeDialog() {
  dialog.visible = false;
}

async function submitDialog() {
  const targetProjectClusterIds =
    dialog.mode === "create"
      ? projectClusters.value.map((item) => item.id).filter((id) => id > 0)
      : [...dialog.form.projectClusterIds];
  if (targetProjectClusterIds.length === 0) {
    errorMsg.value = "请至少选择一个关联集群";
    return;
  }
  const selectedProjectClusters = targetProjectClusterIds
    .map((id) => projectClusters.value.find((item) => item.id === Number(id)))
    .filter((item): item is ProjectCluster => Boolean(item?.clusterUuid));
  if (selectedProjectClusters.length !== targetProjectClusterIds.length) {
    errorMsg.value = "部分关联集群缺少集群信息";
    return;
  }
  if (!dialog.form.name) {
    errorMsg.value = "工作空间名称不能为空";
    return;
  }
  if (dialog.mode === "create" && !dialog.form.namespace) {
    errorMsg.value = "命名空间不能为空";
    return;
  }
  if (dialog.form.cpuAllocated <= 0 || dialog.form.memAllocated <= 0 || dialog.form.podsAllocated <= 0) {
    errorMsg.value = "CPU、内存和 Pods 配额必须大于 0";
    return;
  }

  try {
    if (dialog.mode === "create") {
      const failures: string[] = [];
      let successCount = 0;
      for (const projectCluster of selectedProjectClusters) {
        const payload: AddProjectWorkspaceRequest = {
          projectClusterId: projectCluster.id,
          clusterUuid: projectCluster.clusterUuid,
          name: dialog.form.name,
          namespace: dialog.form.namespace,
          description: dialog.form.description,
          cpuAllocated: dialog.form.cpuAllocated,
          memAllocated: dialog.form.memAllocated,
          storageAllocated: dialog.form.storageAllocated,
          gpuAllocated: dialog.form.gpuAllocated,
          podsAllocated: dialog.form.podsAllocated
        };
        try {
          await addProjectWorkspaceApi(payload);
          successCount += 1;
        } catch (error) {
          const clusterName = projectCluster.clusterName || projectCluster.clusterUuid || `集群 ${projectCluster.id}`;
          const message = error instanceof Error ? error.message : "创建失败";
          failures.push(`${clusterName}: ${message}`);
        }
      }
      if (failures.length > 0) {
        errorMsg.value = `工作空间部分创建成功：成功 ${successCount} 个，失败 ${failures.length} 个；${failures.join("；")}`;
      } else {
        showSuccess(`工作空间创建成功，已关联 ${selectedProjectClusters.length} 个集群`);
      }
    } else {
      const payload: UpdateProjectWorkspaceRequest = {
        name: dialog.form.name,
        description: dialog.form.description,
        cpuAllocated: dialog.form.cpuAllocated,
        memAllocated: dialog.form.memAllocated,
        storageAllocated: dialog.form.storageAllocated,
        gpuAllocated: dialog.form.gpuAllocated,
        podsAllocated: dialog.form.podsAllocated
      };
      const failures: string[] = [];
      let successCount = 0;
      for (const id of dialog.targetIds.length ? dialog.targetIds : [dialog.targetId]) {
        try {
          await updateProjectWorkspaceApi(id, payload);
          successCount += 1;
        } catch (error) {
          const row = workspaces.value.flatMap((item) => item.sourceRows).find((item) => item.id === id);
          const clusterName = row?.clusterName || row?.clusterUuid || `绑定 ${id}`;
          const message = error instanceof Error ? error.message : "更新失败";
          failures.push(`${clusterName}: ${message}`);
        }
      }
      if (failures.length > 0) {
        errorMsg.value = `工作空间部分更新成功：成功 ${successCount} 个，失败 ${failures.length} 个；${failures.join("；")}`;
      } else {
        showSuccess("工作空间更新成功");
      }
    }
    dialog.visible = false;
    await loadData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "保存工作空间失败";
  }
}

async function remove(item: WorkspaceRow) {
  if (!confirm(`确定删除工作空间 "${item.name}" 吗？`)) return;
  const failures: string[] = [];
  try {
    for (const row of item.sourceRows) {
      try {
        await deleteProjectWorkspaceApi(row.id);
      } catch (error) {
        const clusterName = row.clusterName || row.clusterUuid || `绑定 ${row.id}`;
        const message = error instanceof Error ? error.message : "删除失败";
        failures.push(`${clusterName}: ${message}`);
      }
    }
    await loadData();
    if (failures.length > 0) {
      errorMsg.value = `部分工作空间绑定删除失败：${failures.join("；")}`;
      return;
    }
    showSuccess("工作空间删除成功");
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "删除工作空间失败";
  }
}

async function syncWorkspace(item: WorkspaceRow): Promise<void> {
  syncLoadingMap.value[item.id] = true;
  errorMsg.value = "";
  const failures: string[] = [];
  try {
    for (const row of item.sourceRows) {
      try {
        await syncWorkspaceApi(row.id);
      } catch (error) {
        const clusterName = row.clusterName || row.clusterUuid || `绑定 ${row.id}`;
        const message = error instanceof Error ? error.message : "同步失败";
        failures.push(`${clusterName}: ${message}`);
      }
    }
    await loadData();
    if (failures.length > 0) {
      errorMsg.value = `部分工作空间绑定同步失败：${failures.join("；")}`;
      return;
    }
    showSuccess(`已触发工作空间 ${item.name} 同步`);
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "同步工作空间失败";
  } finally {
    syncLoadingMap.value[item.id] = false;
  }
}

async function applyHighlightFromQuery(): Promise<void> {
  const raw = route.query.highlight;
  const id = typeof raw === "string" ? Number(raw) : Array.isArray(raw) ? Number(raw[0]) : Number.NaN;
  if (!Number.isFinite(id) || id <= 0) {
    return;
  }
  try {
    const ws = await getProjectWorkspaceApi(id);
    selectedProjectId.value = ws.projectId;
    await loadProjectClusters();
    selectedProjectClusterId.value = ws.projectClusterId;
    await loadData();
    await router.replace({ path: "/project/workspace", query: {} });
  } catch {
    /* 忽略：无权限或记录不存在时保持默认 */
  }
}

onMounted(async () => {
  try {
    await loadProjects();
    const rawHi = route.query.highlight;
    const hiStr = typeof rawHi === "string" ? rawHi : Array.isArray(rawHi) ? rawHi[0] : "";
    const hadHighlight = hiStr !== "" && Number(hiStr) > 0;

    if (hadHighlight) {
      await applyHighlightFromQuery();
    } else if (selectedProjectId.value > 0) {
      await loadProjectClusters();
      await loadData();
    }
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "初始化失败";
  }
});

onBeforeUnmount(() => {
  window.clearTimeout(successTimer);
});
</script>

<style scoped>
.workspace-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.left,
.right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

input,
select,
textarea,
button {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  background: #fff;
}

.project-cluster-summary {
  padding: 7px 12px;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 600;
}

.multi-select {
  min-height: 96px;
}

.cluster-binding-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #eff6ff;
}

.cluster-binding-summary strong {
  flex: 0 0 100%;
  color: #1e3a8a;
  font-size: 13px;
}

.cluster-binding-summary span {
  padding: 3px 8px;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #fff;
  color: #1d4ed8;
  font-size: 12px;
}

.form-hint {
  margin: -4px 0 2px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
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

.workspace-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}

.workspace-table th,
.workspace-table td {
  border: 1px solid #e5e7eb;
  padding: 8px 10px;
  text-align: left;
  font-size: 13px;
}

.workspace-table th {
  background: #f3f4f6;
}

.bound-clusters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 420px;
}

.bound-clusters span {
  padding: 3px 8px;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
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
  width: min(700px, 92vw);
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
