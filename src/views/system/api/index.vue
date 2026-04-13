<template>
  <div class="api-page">
    <header class="page-head">
      <div>
        <h2>系统权限管理</h2>
        <p>对齐 kube-nova-web 的 API 管理能力：分组树 + API 列表 + 增删改。</p>
      </div>
      <button class="refresh-btn" :disabled="loading || treeLoading" @click="refreshData">
        {{ loading || treeLoading ? "刷新中..." : "刷新数据" }}
      </button>
    </header>

    <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>
    <p v-if="successMessage" class="alert success">{{ successMessage }}</p>

    <section class="layout-grid">
      <article class="left-card">
        <header class="card-head">
          <h3>API 分组</h3>
          <div class="head-actions">
            <button class="action-btn secondary" :disabled="treeLoading" @click="clearGroupFilter">全部</button>
            <button class="action-btn" :disabled="treeLoading" @click="openAddGroupDialog">新增分组</button>
          </div>
        </header>
        <div class="tree-wrap">
          <p v-if="treeLoading" class="empty">正在加载分组...</p>
          <p v-else-if="groupRows.length === 0" class="empty">暂无分组</p>
          <template v-else>
            <button
              v-for="row in groupRows"
              :key="row.id"
              class="tree-row"
              :class="{ active: selectedGroupId === row.id }"
              :style="{ paddingLeft: `${row.depth * 18 + 12}px` }"
              @click="selectGroup(row.id)"
            >
              <span class="folder">📁</span>
              <span>{{ row.name || `分组-${row.id}` }}</span>
            </button>
          </template>
        </div>
      </article>

      <article class="right-card">
        <section class="search-card">
          <form class="search-grid" @submit.prevent="handleSearch">
            <label class="field">
              <span>API 名称</span>
              <input v-model.trim="searchForm.name" :disabled="loading" placeholder="请输入 API 名称" />
            </label>
            <label class="field">
              <span>API 路径</span>
              <input v-model.trim="searchForm.path" :disabled="loading" placeholder="例如：/portal/v1/user" />
            </label>
            <label class="field">
              <span>HTTP 方法</span>
              <select v-model="searchForm.method" :disabled="loading">
                <option value="">全部</option>
                <option v-for="item in methodOptions" :key="item" :value="item">{{ item }}</option>
              </select>
            </label>
            <div class="search-actions">
              <button type="submit" :disabled="loading">搜索</button>
              <button type="button" class="secondary" :disabled="loading" @click="resetSearch">重置</button>
              <button type="button" class="secondary" :disabled="loading" @click="openAddApiDialog">新增 API</button>
            </div>
          </form>
        </section>

        <section class="table-card">
          <div class="table-head">
            <h3>API 列表</h3>
            <span>共 {{ total }} 条</span>
          </div>
          <div class="table-wrap">
            <table class="api-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>API 名称</th>
                  <th>API 路径</th>
                  <th>HTTP 方法</th>
                  <th>类型</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="7" class="empty">正在加载 API 数据...</td>
                </tr>
                <tr v-else-if="apis.length === 0">
                  <td colspan="7" class="empty">暂无 API 数据</td>
                </tr>
                <tr v-for="item in apis" :key="item.id">
                  <td>{{ item.id }}</td>
                  <td>{{ item.name || "-" }}</td>
                  <td>{{ item.path || "-" }}</td>
                  <td>
                    <span class="method-chip" :class="methodClass(item.method)">
                      {{ item.method || "-" }}
                    </span>
                  </td>
                  <td>
                    <span class="type-chip" :class="item.isPermission === 1 ? 'permission' : 'group'">
                      {{ item.isPermission === 1 ? "权限" : "分组" }}
                    </span>
                  </td>
                  <td>{{ formatTimestamp(item.updatedAt || item.createdAt) }}</td>
                  <td class="row-actions">
                    <button class="action-btn secondary" :disabled="deletingMap[item.id]" @click="openEditDialog(item)">
                      编辑
                    </button>
                    <button class="action-btn danger" :disabled="deletingMap[item.id]" @click="handleDelete(item)">
                      {{ deletingMap[item.id] ? "删除中..." : "删除" }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <footer class="table-footer">
            <div class="page-info">第 {{ pagination.page }} / {{ pageCount }} 页</div>
            <div class="pager">
              <button :disabled="pagination.page <= 1 || loading" @click="changePage(pagination.page - 1)">
                上一页
              </button>
              <button :disabled="pagination.page >= pageCount || loading" @click="changePage(pagination.page + 1)">
                下一页
              </button>
            </div>
          </footer>
        </section>
      </article>
    </section>

    <div v-if="dialog.visible" class="dialog-mask" @click.self="closeDialog">
      <div class="dialog">
        <h3>{{ dialog.mode === "add" ? "新增 API" : "编辑 API" }}</h3>
        <div class="dialog-grid">
          <label class="dialog-field">
            <span>上级分组</span>
            <select v-model.number="dialog.form.parentId">
              <option :value="0">顶级分组</option>
              <option v-for="row in groupRows" :key="`parent-${row.id}`" :value="row.id">
                {{ `${"　".repeat(row.depth)}${row.name || `分组-${row.id}`}` }}
              </option>
            </select>
          </label>
          <label class="dialog-field">
            <span>类型</span>
            <select v-model.number="dialog.form.isPermission">
              <option :value="0">分组</option>
              <option :value="1">权限 API</option>
            </select>
          </label>
          <label class="dialog-field">
            <span>名称</span>
            <input v-model.trim="dialog.form.name" maxlength="100" placeholder="请输入名称" />
          </label>
          <label class="dialog-field" v-if="dialog.form.isPermission === 1">
            <span>HTTP 方法</span>
            <select v-model="dialog.form.method">
              <option v-for="item in methodOptions" :key="`dlg-${item}`" :value="item">{{ item }}</option>
            </select>
          </label>
          <label class="dialog-field wide" v-if="dialog.form.isPermission === 1">
            <span>API 路径</span>
            <input v-model.trim="dialog.form.path" maxlength="220" placeholder="例如：/manager/v1/project" />
          </label>
        </div>
        <div class="dialog-actions">
          <button class="action-btn secondary" :disabled="dialog.submitting" @click="closeDialog">取消</button>
          <button class="action-btn" :disabled="dialog.submitting" @click="submitDialog">
            {{ dialog.submitting ? "提交中..." : "确定" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import {
  addApiApi,
  deleteApiApi,
  getApiGroupsTreeApi,
  searchApiApi,
  updateApiApi,
  type ApiGroupTreeNode,
  type ApiSysAPI
} from "../../../api/portal/api";

interface GroupRow {
  id: number;
  name: string;
  depth: number;
}

const methodOptions = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"];

const loading = ref(false);
const treeLoading = ref(false);
const apis = ref<ApiSysAPI[]>([]);
const total = ref(0);
const groups = ref<ApiGroupTreeNode[]>([]);
const selectedGroupId = ref(0);
const errorMessage = ref("");
const successMessage = ref("");
const deletingMap = ref<Record<number, boolean>>({});
let successTimer = 0;

const pagination = reactive({
  page: 1,
  pageSize: 20
});

const searchForm = ref({
  name: "",
  path: "",
  method: ""
});

const dialog = reactive({
  visible: false,
  mode: "add" as "add" | "edit",
  targetId: 0,
  submitting: false,
  form: {
    parentId: 0,
    name: "",
    path: "",
    method: "GET",
    isPermission: 1
  }
});

const groupRows = computed<GroupRow[]>(() => {
  const rows: GroupRow[] = [];
  const walk = (list: ApiGroupTreeNode[], depth: number) => {
    list.forEach((item) => {
      rows.push({ id: item.id, name: item.name, depth });
      if (item.children.length > 0) {
        walk(item.children, depth + 1);
      }
    });
  };
  walk(groups.value, 0);
  return rows;
});

const pageCount = computed(() => {
  if (total.value <= 0 || pagination.pageSize <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(total.value / pagination.pageSize));
});

function formatTimestamp(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "-";
  }
  return new Date(timestamp * 1000).toLocaleString("zh-CN", { hour12: false });
}

function methodClass(method: string): string {
  const value = method.toUpperCase();
  if (value === "GET") return "get";
  if (value === "POST") return "post";
  if (value === "PUT") return "put";
  if (value === "DELETE") return "delete";
  return "default";
}

function showSuccess(message: string): void {
  successMessage.value = message;
  window.clearTimeout(successTimer);
  successTimer = window.setTimeout(() => {
    successMessage.value = "";
  }, 2200);
}

async function loadGroups(): Promise<void> {
  treeLoading.value = true;
  try {
    groups.value = await getApiGroupsTreeApi();
  } catch (error) {
    console.error("Load api groups failed", error);
  } finally {
    treeLoading.value = false;
  }
}

async function loadApis(): Promise<void> {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await searchApiApi({
      page: pagination.page,
      pageSize: pagination.pageSize,
      parentId: selectedGroupId.value > 0 ? selectedGroupId.value : undefined,
      name: searchForm.value.name.trim() || undefined,
      path: searchForm.value.path.trim() || undefined,
      method: searchForm.value.method || undefined
    });
    apis.value = response.items;
    total.value = response.total;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "加载 API 列表失败";
  } finally {
    loading.value = false;
  }
}

function refreshData(): void {
  void loadGroups();
  void loadApis();
}

function selectGroup(groupId: number): void {
  selectedGroupId.value = groupId;
  pagination.page = 1;
  void loadApis();
}

function clearGroupFilter(): void {
  selectedGroupId.value = 0;
  pagination.page = 1;
  void loadApis();
}

function handleSearch(): void {
  pagination.page = 1;
  void loadApis();
}

function resetSearch(): void {
  searchForm.value.name = "";
  searchForm.value.path = "";
  searchForm.value.method = "";
  pagination.page = 1;
  void loadApis();
}

function changePage(page: number): void {
  if (page < 1 || page > pageCount.value || page === pagination.page) {
    return;
  }
  pagination.page = page;
  void loadApis();
}

function openDialog(mode: "add" | "edit", api?: ApiSysAPI): void {
  dialog.visible = true;
  dialog.mode = mode;
  dialog.targetId = api?.id ?? 0;
  dialog.form.parentId = api?.parentId ?? (selectedGroupId.value > 0 ? selectedGroupId.value : 0);
  dialog.form.name = api?.name ?? "";
  dialog.form.path = api?.path ?? "";
  dialog.form.method = api?.method?.toUpperCase() || "GET";
  dialog.form.isPermission = api?.isPermission ?? 1;
}

function openAddGroupDialog(): void {
  openDialog("add");
  dialog.form.isPermission = 0;
  dialog.form.path = "";
  dialog.form.method = "GET";
}

function openAddApiDialog(): void {
  openDialog("add");
  dialog.form.isPermission = 1;
}

function openEditDialog(api: ApiSysAPI): void {
  openDialog("edit", api);
}

function closeDialog(): void {
  if (dialog.submitting) return;
  dialog.visible = false;
}

async function submitDialog(): Promise<void> {
  const name = dialog.form.name.trim();
  if (!name) {
    errorMessage.value = "名称不能为空";
    return;
  }
  if (dialog.form.isPermission === 1 && !dialog.form.path.trim()) {
    errorMessage.value = "权限 API 需要填写路径";
    return;
  }

  dialog.submitting = true;
  errorMessage.value = "";

  try {
    const payload = {
      parentId: dialog.form.parentId || 0,
      name,
      path: dialog.form.isPermission === 1 ? dialog.form.path.trim() : "",
      method: dialog.form.isPermission === 1 ? dialog.form.method.toUpperCase() : "",
      isPermission: dialog.form.isPermission
    };

    if (dialog.mode === "add") {
      await addApiApi(payload);
      showSuccess(dialog.form.isPermission === 1 ? "API 新增成功" : "分组新增成功");
    } else {
      await updateApiApi({
        id: dialog.targetId,
        ...payload
      });
      showSuccess("更新成功");
    }

    dialog.visible = false;
    await loadGroups();
    await loadApis();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "保存失败";
  } finally {
    dialog.submitting = false;
  }
}

async function handleDelete(api: ApiSysAPI): Promise<void> {
  if (!confirm(`确定删除 "${api.name}" 吗？`)) return;
  deletingMap.value[api.id] = true;
  errorMessage.value = "";

  try {
    await deleteApiApi(api.id);
    showSuccess("删除成功");
    await loadGroups();
    await loadApis();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "删除失败";
  } finally {
    deletingMap.value[api.id] = false;
  }
}

onMounted(async () => {
  await loadGroups();
  await loadApis();
});

onBeforeUnmount(() => {
  window.clearTimeout(successTimer);
});
</script>

<style scoped>
.api-page {
  min-height: 100%;
  padding: 16px;
  background:
    radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.1) 0, rgba(59, 130, 246, 0) 36%),
    radial-gradient(circle at 100% 0%, rgba(16, 185, 129, 0.08) 0, rgba(16, 185, 129, 0) 34%),
    #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.page-head h2 {
  margin: 0;
  color: #0f172a;
  font-size: 20px;
}

.page-head p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}

.refresh-btn {
  height: 36px;
  border-radius: 10px;
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #fff;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.refresh-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.layout-grid {
  display: grid;
  grid-template-columns: 290px 1fr;
  gap: 12px;
}

.left-card,
.right-card,
.search-card,
.table-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.35);
}

.left-card {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 620px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 14px;
  border-bottom: 1px solid #eef2f7;
}

.card-head h3 {
  margin: 0;
  color: #0f172a;
  font-size: 15px;
}

.head-actions {
  display: inline-flex;
  gap: 6px;
}

.tree-wrap {
  padding: 10px 8px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tree-row {
  height: 34px;
  border: none;
  background: transparent;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #0f172a;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}

.tree-row.active {
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 600;
}

.tree-row:hover {
  background: #f8fafc;
}

.folder {
  width: 16px;
}

.right-card {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-card {
  padding: 12px;
}

.search-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field span {
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.field input,
.field select {
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0 10px;
  font-size: 13px;
}

.search-actions {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.search-actions button,
.action-btn {
  height: 32px;
  border-radius: 8px;
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #fff;
  padding: 0 10px;
  font-size: 12px;
  cursor: pointer;
}

.search-actions .secondary,
.action-btn.secondary {
  border-color: #cbd5e1;
  background: #fff;
  color: #0f172a;
}

.action-btn.danger {
  border-color: #dc2626;
  background: #dc2626;
}

.search-actions button:disabled,
.action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.table-card {
  overflow: hidden;
}

.table-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #eef2f7;
}

.table-head h3 {
  margin: 0;
  color: #0f172a;
  font-size: 15px;
}

.table-head span {
  color: #64748b;
  font-size: 12px;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

.api-table {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
}

.api-table th,
.api-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
  color: #0f172a;
  text-align: left;
  white-space: nowrap;
}

.api-table th {
  background: #f8fafc;
  font-weight: 700;
  color: #334155;
}

.method-chip,
.type-chip {
  display: inline-flex;
  align-items: center;
  height: 22px;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
}

.method-chip.get {
  background: #ccfbf1;
  color: #0f766e;
}

.method-chip.post {
  background: #dbeafe;
  color: #1d4ed8;
}

.method-chip.put {
  background: #fef3c7;
  color: #b45309;
}

.method-chip.delete {
  background: #fee2e2;
  color: #b91c1c;
}

.method-chip.default {
  background: #e2e8f0;
  color: #334155;
}

.type-chip.group {
  background: #e2e8f0;
  color: #334155;
}

.type-chip.permission {
  background: #dcfce7;
  color: #166534;
}

.row-actions {
  display: flex;
  gap: 8px;
}

.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
}

.page-info {
  color: #64748b;
  font-size: 12px;
}

.pager {
  display: inline-flex;
  gap: 8px;
}

.pager button {
  height: 30px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #0f172a;
  padding: 0 12px;
  font-size: 12px;
  cursor: pointer;
}

.pager button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.empty {
  text-align: center;
  color: #64748b;
  padding: 20px !important;
  margin: 0;
}

.alert {
  margin: 0;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
}

.alert.error {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.alert.success {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #166534;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  display: grid;
  place-items: center;
  z-index: 80;
}

.dialog {
  width: min(640px, calc(100vw - 32px));
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 30px 80px -45px rgba(15, 23, 42, 0.8);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dialog h3 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
}

.dialog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(160px, 1fr));
  gap: 10px 12px;
}

.dialog-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dialog-field.wide {
  grid-column: 1 / -1;
}

.dialog-field span {
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.dialog-field input,
.dialog-field select {
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0 10px;
  font-size: 13px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 1080px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }

  .left-card {
    min-height: 220px;
  }
}

@media (max-width: 900px) {
  .search-grid {
    grid-template-columns: repeat(2, minmax(140px, 1fr));
  }
}

@media (max-width: 640px) {
  .search-grid {
    grid-template-columns: 1fr;
  }

  .dialog-grid {
    grid-template-columns: 1fr;
  }
}
</style>
