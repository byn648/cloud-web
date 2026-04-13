<template>
  <div v-if="modelValue" class="dialog-mask" @click.self="handleCancel">
    <div class="dialog">
      <header class="dialog-head">
        <div>
          <h3>API 权限授权</h3>
          <p>角色：{{ role?.name || "-" }}（{{ role?.code || "-" }}）</p>
        </div>
        <button class="icon-btn" :disabled="saving" @click="handleCancel">关闭</button>
      </header>

      <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="alert success">{{ successMessage }}</p>

      <section class="summary-bar">
        <span>已选 {{ selectedApiIds.length }} 项 API 权限</span>
        <div class="summary-actions">
          <button class="ghost-btn" :disabled="loadingList || apiList.length === 0" @click="selectCurrentPageApis">
            全选当前页
          </button>
          <button class="ghost-btn" :disabled="loadingList || apiList.length === 0" @click="clearCurrentPageApis">
            清空当前页
          </button>
          <button class="ghost-btn" :disabled="loadingGroups || loadingList || loadingRole" @click="reloadAll">
            刷新
          </button>
        </div>
      </section>

      <section class="content-layout">
        <aside class="group-card">
          <header class="group-head">
            <strong>API 分组</strong>
            <button class="mini-btn" :disabled="loadingGroups" @click="selectGroup(0)">全部</button>
          </header>
          <div class="group-list">
            <p v-if="loadingGroups" class="empty">正在加载分组...</p>
            <p v-else-if="groupRows.length === 0" class="empty">暂无分组</p>
            <button
              v-for="group in groupRows"
              v-else
              :key="group.id"
              class="group-row"
              :class="{ active: selectedGroupId === group.id }"
              :style="{ paddingLeft: `${group.depth * 18 + 12}px` }"
              @click="selectGroup(group.id)"
            >
              <span>📁</span>
              <span>{{ group.name || `分组-${group.id}` }}</span>
            </button>
          </div>
        </aside>

        <article class="api-card">
          <form class="search-grid" @submit.prevent="handleSearch">
            <label class="field">
              <span>API 名称</span>
              <input v-model.trim="searchForm.name" :disabled="loadingList" placeholder="请输入 API 名称" />
            </label>
            <label class="field">
              <span>API 路径</span>
              <input v-model.trim="searchForm.path" :disabled="loadingList" placeholder="例如：/portal/v1/user" />
            </label>
            <label class="field">
              <span>HTTP 方法</span>
              <select v-model="searchForm.method" :disabled="loadingList">
                <option value="">全部</option>
                <option v-for="method in methodOptions" :key="method" :value="method">{{ method }}</option>
              </select>
            </label>
            <div class="search-actions">
              <button type="submit" class="primary-btn" :disabled="loadingList">搜索</button>
              <button type="button" class="ghost-btn" :disabled="loadingList" @click="resetSearch">重置</button>
            </div>
          </form>

          <div class="table-wrap">
            <table class="api-table">
              <thead>
                <tr>
                  <th class="col-check">
                    <input
                      type="checkbox"
                      :checked="currentPageAllChecked"
                      :disabled="loadingList || apiList.length === 0"
                      @change="toggleCurrentPage(($event.target as HTMLInputElement).checked)"
                    />
                  </th>
                  <th>ID</th>
                  <th>API 名称</th>
                  <th>API 路径</th>
                  <th>HTTP 方法</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loadingList || loadingRole">
                  <td colspan="5" class="empty">正在加载 API 数据...</td>
                </tr>
                <tr v-else-if="apiList.length === 0">
                  <td colspan="5" class="empty">暂无 API 数据</td>
                </tr>
                <tr v-for="api in apiList" v-else :key="api.id">
                  <td class="col-check">
                    <input
                      type="checkbox"
                      :checked="selectedApiIds.includes(api.id)"
                      :disabled="saving"
                      @change="toggleApi(api.id, ($event.target as HTMLInputElement).checked)"
                    />
                  </td>
                  <td>{{ api.id }}</td>
                  <td>{{ api.name || "-" }}</td>
                  <td>{{ api.path || "-" }}</td>
                  <td>
                    <span class="method-chip" :class="methodClass(api.method)">
                      {{ api.method || "-" }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section class="bottom-bar">
        <div class="pager-section">
          <span>共 {{ apiTotal }} 条，第 {{ pagination.page }} / {{ pageCount }} 页</span>
          <div class="pager-actions">
            <button class="ghost-btn" :disabled="pagination.page <= 1 || loadingList" @click="changePage(pagination.page - 1)">
              上一页
            </button>
            <button class="ghost-btn" :disabled="pagination.page >= pageCount || loadingList" @click="changePage(pagination.page + 1)">
              下一页
            </button>
          </div>
        </div>
        <div class="submit-actions">
          <button class="secondary-btn" :disabled="saving" @click="handleCancel">取消</button>
          <button class="primary-btn" :disabled="saving || !role?.id" @click="handleSubmit">
            {{ saving ? "保存中..." : "保存 API 权限" }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { getApiGroupsTreeApi, searchApiApi, type ApiGroupTreeNode, type ApiSysAPI } from "../../../../api/portal/api";
import { bindRoleApiApi, getRoleApiApi, type RoleSysRole } from "../../../../api/portal/role";

interface Props {
  modelValue: boolean;
  role: RoleSysRole | null;
}

interface FlatGroupRow {
  id: number;
  name: string;
  depth: number;
}

const methodOptions = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD", "*"];

const props = defineProps<Props>();
const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
  (event: "success", message: string): void;
}>();

const loadingGroups = ref(false);
const loadingRole = ref(false);
const loadingList = ref(false);
const saving = ref(false);

const groupTree = ref<ApiGroupTreeNode[]>([]);
const selectedGroupId = ref(0);
const apiList = ref<ApiSysAPI[]>([]);
const apiTotal = ref(0);
const selectedApiIds = ref<number[]>([]);

const searchForm = reactive({
  name: "",
  path: "",
  method: ""
});

const pagination = reactive({
  page: 1,
  pageSize: 12
});

const errorMessage = ref("");
const successMessage = ref("");
let successTimer = 0;

const groupRows = computed<FlatGroupRow[]>(() => {
  const rows: FlatGroupRow[] = [];
  const walk = (list: ApiGroupTreeNode[], depth: number) => {
    list.forEach((item) => {
      rows.push({ id: item.id, name: item.name, depth });
      if (item.children.length > 0) {
        walk(item.children, depth + 1);
      }
    });
  };
  walk(groupTree.value, 0);
  return rows;
});

const pageCount = computed(() => {
  if (apiTotal.value <= 0 || pagination.pageSize <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(apiTotal.value / pagination.pageSize));
});

const currentPageAllChecked = computed(() => {
  if (apiList.value.length === 0) {
    return false;
  }
  return apiList.value.every((item) => selectedApiIds.value.includes(item.id));
});

function sanitizeIds(source: number[]): number[] {
  return Array.from(new Set(source.filter((item) => Number.isFinite(item) && item > 0)));
}

function sameNumberSet(left: number[], right: number[]): boolean {
  const l = sanitizeIds(left).sort((a, b) => a - b);
  const r = sanitizeIds(right).sort((a, b) => a - b);
  if (l.length !== r.length) {
    return false;
  }
  return l.every((item, index) => item === r[index]);
}

function showSuccess(message: string): void {
  successMessage.value = message;
  window.clearTimeout(successTimer);
  successTimer = window.setTimeout(() => {
    successMessage.value = "";
  }, 2200);
}

function clearTransientMessage(): void {
  errorMessage.value = "";
  successMessage.value = "";
  window.clearTimeout(successTimer);
}

function methodClass(method: string): string {
  const value = method.toUpperCase();
  if (value === "GET") return "get";
  if (value === "POST") return "post";
  if (value === "PUT") return "put";
  if (value === "DELETE") return "delete";
  if (value === "*") return "all";
  return "default";
}

function handleCancel(): void {
  if (saving.value) {
    return;
  }
  emit("update:modelValue", false);
}

function toggleApi(apiId: number, checked: boolean): void {
  if (checked) {
    selectedApiIds.value = sanitizeIds([...selectedApiIds.value, apiId]);
    return;
  }
  selectedApiIds.value = selectedApiIds.value.filter((item) => item !== apiId);
}

function toggleCurrentPage(checked: boolean): void {
  const currentPageIds = sanitizeIds(apiList.value.map((item) => item.id));
  if (checked) {
    selectedApiIds.value = sanitizeIds([...selectedApiIds.value, ...currentPageIds]);
    return;
  }
  const currentSet = new Set(currentPageIds);
  selectedApiIds.value = selectedApiIds.value.filter((item) => !currentSet.has(item));
}

function selectCurrentPageApis(): void {
  toggleCurrentPage(true);
}

function clearCurrentPageApis(): void {
  toggleCurrentPage(false);
}

function selectGroup(groupId: number): void {
  if (selectedGroupId.value === groupId) {
    return;
  }
  selectedGroupId.value = groupId;
  pagination.page = 1;
  void loadApiList();
}

function handleSearch(): void {
  pagination.page = 1;
  void loadApiList();
}

function resetSearch(): void {
  searchForm.name = "";
  searchForm.path = "";
  searchForm.method = "";
  pagination.page = 1;
  void loadApiList();
}

function changePage(page: number): void {
  if (page < 1 || page > pageCount.value || page === pagination.page) {
    return;
  }
  pagination.page = page;
  void loadApiList();
}

async function loadGroups(): Promise<void> {
  loadingGroups.value = true;
  try {
    groupTree.value = await getApiGroupsTreeApi({ isPermission: 0 });
  } catch (error) {
    groupTree.value = [];
    throw error;
  } finally {
    loadingGroups.value = false;
  }
}

async function loadRolePermissions(): Promise<void> {
  const roleId = props.role?.id ?? 0;
  if (!roleId) {
    selectedApiIds.value = [];
    return;
  }

  loadingRole.value = true;
  try {
    const ids = await getRoleApiApi(roleId);
    selectedApiIds.value = sanitizeIds(ids);
  } catch (error) {
    selectedApiIds.value = [];
    throw error;
  } finally {
    loadingRole.value = false;
  }
}

async function loadApiList(): Promise<void> {
  loadingList.value = true;
  try {
    const response = await searchApiApi({
      page: pagination.page,
      pageSize: pagination.pageSize,
      parentId: selectedGroupId.value > 0 ? selectedGroupId.value : undefined,
      name: searchForm.name.trim() || undefined,
      path: searchForm.path.trim() || undefined,
      method: searchForm.method.trim() || undefined,
      isPermission: 1
    });
    apiList.value = response.items;
    apiTotal.value = response.total;
  } catch (error) {
    apiList.value = [];
    apiTotal.value = 0;
    throw error;
  } finally {
    loadingList.value = false;
  }
}

async function reloadAll(): Promise<void> {
  errorMessage.value = "";
  try {
    await Promise.all([loadGroups(), loadRolePermissions()]);
    await loadApiList();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "加载 API 权限数据失败";
  }
}

async function handleSubmit(): Promise<void> {
  const roleId = props.role?.id ?? 0;
  if (!roleId) {
    errorMessage.value = "未识别当前角色";
    return;
  }

  saving.value = true;
  errorMessage.value = "";

  try {
    const expectedApiIds = sanitizeIds(selectedApiIds.value);
    await bindRoleApiApi({
      roleId,
      apiIds: expectedApiIds
    });

    const latestApiIds = sanitizeIds(await getRoleApiApi(roleId));
    if (!sameNumberSet(expectedApiIds, latestApiIds)) {
      throw new Error("API 权限保存后校验失败，请重试");
    }

    selectedApiIds.value = latestApiIds;
    const message = "API 权限保存成功（已校验）";
    showSuccess(message);
    emit("success", message);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "保存 API 权限失败";
  } finally {
    saving.value = false;
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      clearTransientMessage();
      selectedGroupId.value = 0;
      pagination.page = 1;
      searchForm.name = "";
      searchForm.path = "";
      searchForm.method = "";
      void reloadAll();
      return;
    }
    clearTransientMessage();
  }
);
</script>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  display: grid;
  place-items: center;
  z-index: 90;
}

.dialog {
  width: min(1120px, calc(100vw - 32px));
  max-height: calc(100vh - 40px);
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 30px 80px -45px rgba(15, 23, 42, 0.8);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.dialog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.dialog-head h3 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
}

.dialog-head p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 12px;
}

.icon-btn {
  height: 30px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #0f172a;
  padding: 0 10px;
  font-size: 12px;
  cursor: pointer;
}

.summary-bar {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 13px;
  color: #334155;
}

.summary-actions {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
}

.content-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 12px;
  min-height: 420px;
  min-width: 0;
}

.group-card,
.api-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}

.group-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.group-head {
  height: 46px;
  border-bottom: 1px solid #eef2f7;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.group-head strong {
  color: #0f172a;
  font-size: 13px;
}

.mini-btn {
  height: 28px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #0f172a;
  padding: 0 10px;
  font-size: 12px;
  cursor: pointer;
}

.group-list {
  padding: 8px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
}

.group-row {
  height: 34px;
  border: none;
  border-radius: 8px;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0f172a;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}

.group-row:hover {
  background: #f8fafc;
}

.group-row.active {
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 600;
}

.api-card {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
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
  height: 34px;
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

.table-wrap {
  border: 1px solid #eef2f7;
  border-radius: 10px;
  overflow: auto;
  flex: 1;
  min-height: 0;
}

.api-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
}

.api-table th,
.api-table td {
  border-bottom: 1px solid #f1f5f9;
  padding: 10px;
  font-size: 13px;
  color: #0f172a;
  white-space: nowrap;
  text-align: left;
}

.api-table th {
  background: #f8fafc;
  color: #334155;
  font-weight: 700;
}

.col-check {
  width: 48px;
  text-align: center;
}

.method-chip {
  height: 22px;
  border-radius: 999px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
}

.method-chip.get {
  background: #dbeafe;
  color: #1d4ed8;
}

.method-chip.post {
  background: #dcfce7;
  color: #166534;
}

.method-chip.put {
  background: #fef3c7;
  color: #92400e;
}

.method-chip.delete {
  background: #fee2e2;
  color: #b91c1c;
}

.method-chip.all {
  background: #ede9fe;
  color: #5b21b6;
}

.method-chip.default {
  background: #e2e8f0;
  color: #1e293b;
}

.bottom-bar {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.pager-section {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #64748b;
  font-size: 12px;
}

.pager-actions {
  display: inline-flex;
  gap: 8px;
}

.submit-actions {
  display: inline-flex;
  gap: 8px;
}

.primary-btn,
.secondary-btn {
  height: 34px;
  border-radius: 10px;
  border: 1px solid #2563eb;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.primary-btn {
  background: #2563eb;
  color: #fff;
}

.secondary-btn {
  background: #fff;
  border-color: #cbd5e1;
  color: #0f172a;
}

.ghost-btn {
  height: 32px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #475569;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.primary-btn:disabled,
.secondary-btn:disabled,
.ghost-btn:disabled,
.mini-btn:disabled,
.icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
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

.empty {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  padding: 16px;
}

@media (max-width: 980px) {
  .content-layout {
    grid-template-columns: 1fr;
  }

  .group-card {
    max-height: 220px;
  }

  .search-grid {
    grid-template-columns: 1fr;
  }

  .pager-section {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .submit-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
