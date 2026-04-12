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

        <select v-model.number="selectedProjectClusterId" @change="loadData" :disabled="selectedProjectId <= 0">
          <option :value="0">请选择资源池</option>
          <option v-for="item in projectClusters" :key="item.id" :value="item.id">
            {{ item.clusterName || item.clusterUuid }} ({{ item.clusterUuid }})
          </option>
        </select>

        <input v-model.trim="filters.name" placeholder="按工作空间名称搜索" />
        <input v-model.trim="filters.namespace" placeholder="按命名空间搜索" />
        <button @click="search">搜索</button>
        <button @click="reset">重置</button>
      </div>
      <div class="right">
        <button @click="openCreate" :disabled="selectedProjectClusterId <= 0">新建工作空间</button>
        <button @click="loadData" :disabled="selectedProjectClusterId <= 0">刷新</button>
      </div>
    </header>

    <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
    <div v-else-if="selectedProjectId <= 0" class="hint">请先选择项目</div>
    <div v-else-if="selectedProjectClusterId <= 0" class="hint">请先选择资源池后查看工作空间</div>

    <table v-if="selectedProjectClusterId > 0" class="workspace-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>工作空间</th>
          <th>命名空间</th>
          <th>集群</th>
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
        <tr v-for="item in workspaces" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.namespace }}</td>
          <td>
            <div>{{ item.clusterName || "-" }}</div>
            <small>{{ item.clusterUuid }}</small>
          </td>
          <td>{{ formatNum(item.cpuAllocated) }}</td>
          <td>{{ formatNum(item.memAllocated) }}</td>
          <td>{{ formatNum(item.storageAllocated) }}</td>
          <td>{{ formatNum(item.gpuAllocated) }}</td>
          <td>{{ item.podsAllocated }}</td>
          <td>{{ item.description || "-" }}</td>
          <td class="actions">
            <button @click="openEdit(item)">编辑</button>
            <button @click="remove(item)">删除</button>
          </td>
        </tr>
        <tr v-if="!loading && workspaces.length === 0">
          <td colspan="11" class="empty">暂无工作空间</td>
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
import { onMounted, reactive, ref } from "vue";
import {
  addProjectWorkspaceApi,
  deleteProjectWorkspaceApi,
  searchProjectApi,
  searchProjectClusterApi,
  searchProjectWorkspaceApi,
  type AddProjectWorkspaceRequest,
  type Project,
  type ProjectCluster,
  type ProjectWorkspace,
  type UpdateProjectWorkspaceRequest,
  updateProjectWorkspaceApi
} from "../../../api/manager/project";

const loading = ref(false);
const errorMsg = ref("");

const selectedProjectId = ref(0);
const selectedProjectClusterId = ref(0);
const projects = ref<Project[]>([]);
const projectClusters = ref<ProjectCluster[]>([]);
const workspaces = ref<ProjectWorkspace[]>([]);

const filters = reactive({
  name: "",
  namespace: ""
});

const dialog = reactive({
  visible: false,
  mode: "create" as "create" | "edit",
  targetId: 0,
  form: {
    name: "",
    namespace: "",
    description: "",
    cpuAllocated: 0,
    memAllocated: 0,
    storageAllocated: 0,
    gpuAllocated: 0,
    podsAllocated: 0
  }
});

function formatNum(v: number | undefined): string {
  if (typeof v !== "number" || Number.isNaN(v)) return "0";
  return v.toFixed(2);
}

async function loadProjects() {
  const resp = await searchProjectApi({ page: 1, pageSize: 200 });
  projects.value = resp.items ?? [];
}

async function loadProjectClusters() {
  if (selectedProjectId.value <= 0) {
    projectClusters.value = [];
    selectedProjectClusterId.value = 0;
    return;
  }
  const items = await searchProjectClusterApi({ projectId: selectedProjectId.value });
  projectClusters.value = items ?? [];
  if (!projectClusters.value.some((item) => item.id === selectedProjectClusterId.value)) {
    selectedProjectClusterId.value = projectClusters.value[0]?.id ?? 0;
  }
}

async function loadData() {
  if (selectedProjectClusterId.value <= 0) {
    workspaces.value = [];
    return;
  }
  loading.value = true;
  errorMsg.value = "";
  try {
    workspaces.value = await searchProjectWorkspaceApi({
      projectClusterId: selectedProjectClusterId.value,
      name: filters.name || undefined,
      namespace: filters.namespace || undefined
    });
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "加载工作空间失败";
  } finally {
    loading.value = false;
  }
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
}

function openCreate() {
  dialog.visible = true;
  dialog.mode = "create";
  dialog.targetId = 0;
  resetDialogForm();
}

function openEdit(item: ProjectWorkspace) {
  dialog.visible = true;
  dialog.mode = "edit";
  dialog.targetId = item.id;
  dialog.form.name = item.name;
  dialog.form.namespace = item.namespace;
  dialog.form.description = item.description || "";
  dialog.form.cpuAllocated = item.cpuAllocated || 0;
  dialog.form.memAllocated = item.memAllocated || 0;
  dialog.form.storageAllocated = item.storageAllocated || 0;
  dialog.form.gpuAllocated = item.gpuAllocated || 0;
  dialog.form.podsAllocated = item.podsAllocated || 0;
}

function closeDialog() {
  dialog.visible = false;
}

async function submitDialog() {
  if (selectedProjectClusterId.value <= 0) {
    errorMsg.value = "请先选择资源池";
    return;
  }
  const selectedProjectCluster = projectClusters.value.find((item) => item.id === selectedProjectClusterId.value);
  if (!selectedProjectCluster?.clusterUuid) {
    errorMsg.value = "当前资源池缺少集群信息";
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
      const payload: AddProjectWorkspaceRequest = {
        projectClusterId: selectedProjectClusterId.value,
        clusterUuid: selectedProjectCluster.clusterUuid,
        name: dialog.form.name,
        namespace: dialog.form.namespace,
        description: dialog.form.description,
        cpuAllocated: dialog.form.cpuAllocated,
        memAllocated: dialog.form.memAllocated,
        storageAllocated: dialog.form.storageAllocated,
        gpuAllocated: dialog.form.gpuAllocated,
        podsAllocated: dialog.form.podsAllocated
      };
      await addProjectWorkspaceApi(payload);
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
      await updateProjectWorkspaceApi(dialog.targetId, payload);
    }
    dialog.visible = false;
    await loadData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "保存工作空间失败";
  }
}

async function remove(item: ProjectWorkspace) {
  if (!confirm(`确定删除工作空间 "${item.name}" 吗？`)) return;
  try {
    await deleteProjectWorkspaceApi(item.id);
    await loadData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "删除工作空间失败";
  }
}

onMounted(async () => {
  try {
    await loadProjects();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "初始化失败";
  }
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

button {
  cursor: pointer;
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
