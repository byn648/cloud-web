<template>
  <div class="cluster-page">
    <header class="toolbar">
      <div class="toolbar-left">
        <h2>集群管理</h2>
        <span class="count-chip">共 {{ filteredClusters.length }} 个</span>
      </div>

      <div class="toolbar-right">
        <div class="switch-group">
          <button :class="{ active: viewMode === 'card' }" @click="switchViewMode('card')">卡片</button>
          <button :class="{ active: viewMode === 'table' }" @click="switchViewMode('table')">列表</button>
        </div>
        <button class="primary" :disabled="loading" @click="openAddPage">新增集群</button>
        <button class="outline" :disabled="loading" @click="showSearchBar = !showSearchBar">
          {{ showSearchBar ? "收起筛选" : "展开筛选" }}
        </button>
        <button class="outline" :disabled="loading || refreshLoading" @click="refreshData">
          {{ refreshLoading ? "刷新中..." : "刷新" }}
        </button>
        <button class="warning" :disabled="loading || syncAllLoading || clusters.length === 0" @click="handleSyncAll">
          {{ syncAllLoading ? "同步中..." : "同步全部" }}
        </button>
      </div>
    </header>

    <section v-if="showSearchBar" class="search-card">
      <ClusterSearch
        v-model="searchForm"
        @search="handleSearch"
        @reset="handleResetSearch"
      />
    </section>

    <p v-if="errorMsg" class="notice error">{{ errorMsg }}</p>
    <p v-if="successMsg" class="notice success">{{ successMsg }}</p>

    <section v-if="loading" class="state-card loading">
      <div class="spinner"></div>
      <span>正在加载集群数据...</span>
    </section>

    <template v-else>
      <section v-if="pagedClusters.length === 0" class="state-card empty">
        当前条件下暂无集群数据
      </section>

      <section v-else-if="viewMode === 'card'" class="card-grid">
        <ClusterCard
          v-for="cluster in pagedClusters"
          :key="cluster.id"
          :cluster="cluster"
          :can-assign="canAssignUsers"
          :assign-loading="Boolean(assignLoadingMap[cluster.id])"
          :sync-loading="Boolean(syncLoadingMap[cluster.id])"
          :delete-loading="Boolean(deleteLoadingMap[cluster.id])"
          @open="openConsole"
          @assign="openAssignDialog"
          @sync="handleSync"
          @delete="handleDelete"
        />
      </section>

      <section v-else class="table-wrap">
        <table class="cluster-table">
          <thead>
            <tr>
              <th>集群名称</th>
              <th>环境/类型</th>
              <th>版本</th>
              <th>健康状态</th>
              <th>同步状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cluster in pagedClusters" :key="`table-${cluster.id}`">
              <td>
                <button class="name-link" @click="openConsole(cluster.id)">{{ cluster.name }}</button>
              </td>
              <td>
                <span class="env-chip" :class="resolveEnvironmentClass(cluster.environment)">
                  {{ formatEnvironment(cluster.environment) }}
                </span>
                <span class="muted"> / {{ resolveClusterType(cluster.clusterType) }}</span>
              </td>
              <td>{{ cluster.version || "-" }}</td>
              <td>
                <span class="status-chip" :class="resolveHealth(cluster.healthStatus).className">
                  {{ resolveHealth(cluster.healthStatus).label }}
                </span>
              </td>
              <td>
                <span class="status-chip" :class="resolveSync(cluster.status).className">
                  {{ resolveSync(cluster.status).label }}
                </span>
              </td>
              <td>{{ formatDate(cluster.createdAt) }}</td>
              <td class="actions">
                <button
                  v-if="canAssignUsers"
                  class="primary-soft"
                  :disabled="Boolean(assignLoadingMap[cluster.id]) || syncLoadingMap[cluster.id]"
                  @click="openAssignDialog(cluster)"
                >
                  {{ assignLoadingMap[cluster.id] ? "加载中" : "分配用户" }}
                </button>
                <button class="outline" :disabled="syncLoadingMap[cluster.id]" @click="handleSync(cluster)">
                  {{ syncLoadingMap[cluster.id] ? "同步中" : "同步" }}
                </button>
                <button
                  class="danger"
                  :disabled="deleteLoadingMap[cluster.id] || syncLoadingMap[cluster.id]"
                  @click="handleDelete(cluster)"
                >
                  {{ deleteLoadingMap[cluster.id] ? "删除中" : "删除" }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer v-if="filteredClusters.length > 0" class="pagination">
        <div class="left">
          <span>共 {{ filteredClusters.length }} 条</span>
          <select v-model.number="pagination.pageSize" @change="handlePageSizeChange">
            <option :value="12">12 / 页</option>
            <option :value="20">20 / 页</option>
            <option :value="36">36 / 页</option>
            <option :value="50">50 / 页</option>
          </select>
        </div>
        <div class="right">
          <button :disabled="pagination.page <= 1" @click="changePage(pagination.page - 1)">上一页</button>
          <span>{{ pagination.page }} / {{ pageCount }}</span>
          <button :disabled="pagination.page >= pageCount" @click="changePage(pagination.page + 1)">下一页</button>
        </div>
      </footer>
    </template>

    <div v-if="assignDialog.visible" class="dialog-mask" @click.self="closeAssignDialog">
      <div class="dialog-card">
        <header class="dialog-head">
          <div>
            <h3>分配集群用户</h3>
            <p>集群：{{ assignDialog.clusterName }}（{{ assignDialog.clusterUuid }}）</p>
          </div>
          <button class="icon-btn" :disabled="assignDialog.submitting" @click="closeAssignDialog">关闭</button>
        </header>

        <section class="dialog-search">
          <input
            v-model.trim="assignDialog.keyword"
            type="text"
            placeholder="搜索用户名/昵称/邮箱"
            :disabled="assignDialog.loading || assignDialog.submitting"
            @keyup.enter="searchAssignUsers"
          />
          <button class="outline" :disabled="assignDialog.loading || assignDialog.submitting" @click="searchAssignUsers">
            查询
          </button>
          <button class="outline" :disabled="assignDialog.loading || assignDialog.submitting" @click="resetAssignSearch">
            重置
          </button>
        </section>

        <section class="dialog-body">
          <div class="dialog-tools">
            <label class="checkbox">
              <input
                type="checkbox"
                :checked="isCurrentAssignPageAllChecked"
                :disabled="assignDialog.loading || assignDialog.userOptions.length === 0 || assignDialog.submitting"
                @change="toggleAssignCurrentPage(($event.target as HTMLInputElement).checked)"
              />
              <span>当前页全选</span>
            </label>
            <span class="dialog-meta">已选 {{ assignDialog.selectedUserIds.length }} 人</span>
          </div>

          <div v-if="assignDialog.loading" class="dialog-state">正在加载用户数据...</div>
          <div v-else-if="assignDialog.userOptions.length === 0" class="dialog-state">暂无可选用户</div>
          <table v-else class="dialog-table">
            <thead>
              <tr>
                <th style="width: 72px">选择</th>
                <th>用户名</th>
                <th>昵称</th>
                <th>邮箱</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in assignDialog.userOptions" :key="`assign-user-${user.id}`">
                <td>
                  <input
                    type="checkbox"
                    :checked="assignDialog.selectedUserIds.includes(user.id)"
                    :disabled="assignDialog.submitting"
                    @change="toggleAssignMember(user, ($event.target as HTMLInputElement).checked)"
                  />
                </td>
                <td>{{ user.username || "-" }}</td>
                <td>{{ user.nickname || "-" }}</td>
                <td>{{ user.email || "-" }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <footer class="dialog-foot">
          <div class="dialog-page">
            <span>共 {{ assignDialog.total }} 条</span>
            <button :disabled="assignDialog.page <= 1 || assignDialog.loading" @click="changeAssignPage(assignDialog.page - 1)">
              上一页
            </button>
            <span>{{ assignDialog.page }} / {{ assignPageCount }}</span>
            <button
              :disabled="assignDialog.page >= assignPageCount || assignDialog.loading"
              @click="changeAssignPage(assignDialog.page + 1)"
            >
              下一页
            </button>
          </div>
          <div class="dialog-actions">
            <button class="outline" :disabled="assignDialog.submitting" @click="closeAssignDialog">取消</button>
            <button class="primary" :disabled="assignDialog.loading || assignDialog.submitting" @click="submitAssignDialog">
              {{ assignDialog.submitting ? "保存中..." : "保存分配" }}
            </button>
          </div>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import {
  deleteClusterApi,
  getClusterMembersApi,
  searchClusterApi,
  setClusterMembersApi,
  syncAllClustersApi,
  syncClusterApi,
  type Cluster
} from "../../../api/manager/cluster";
import { searchUserApi } from "../../../api/portal/user";
import { isSuperAdminUser } from "../../../utils/permission";
import { clusterTypeOptions, environmentOptions, healthStatusConfig, syncStatusConfig } from "./constants";
import ClusterCard from "./modules/cluster-card.vue";
import ClusterSearch, { type ClusterSearchForm } from "./modules/cluster-search.vue";

const emit = defineEmits<{
  "open-console": [clusterId: number];
  "open-add": [];
}>();

const loading = ref(false);
const refreshLoading = ref(false);
const syncAllLoading = ref(false);
const showSearchBar = ref(false);
const viewMode = ref<"card" | "table">("card");
const clusters = ref<Cluster[]>([]);
const errorMsg = ref("");
const successMsg = ref("");
const syncLoadingMap = reactive<Record<number, boolean>>({});
const deleteLoadingMap = reactive<Record<number, boolean>>({});
const assignLoadingMap = reactive<Record<number, boolean>>({});

type AssignableUser = {
  id: number;
  username: string;
  nickname: string;
  email: string;
};

const assignDialog = reactive({
  visible: false,
  loading: false,
  submitting: false,
  clusterId: 0,
  clusterUuid: "",
  clusterName: "",
  keyword: "",
  userOptions: [] as AssignableUser[],
  selectedUserIds: [] as number[],
  page: 1,
  pageSize: 12,
  total: 0
});

const searchForm = ref<ClusterSearchForm>({
  name: "",
  environment: "",
  clusterType: ""
});

const pagination = reactive({
  page: 1,
  pageSize: 12
});

let successTimer = 0;

const filteredClusters = computed(() => {
  const name = searchForm.value.name.trim().toLowerCase();
  const environment = searchForm.value.environment.trim().toLowerCase();
  const clusterType = searchForm.value.clusterType.trim().toLowerCase();

  return clusters.value.filter((cluster) => {
    if (name && !cluster.name.toLowerCase().includes(name)) {
      return false;
    }
    if (environment && cluster.environment.toLowerCase() !== environment) {
      return false;
    }
    if (clusterType && cluster.clusterType.toLowerCase() !== clusterType) {
      return false;
    }
    return true;
  });
});

const pageCount = computed(() => {
  const total = filteredClusters.value.length;
  if (total <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(total / pagination.pageSize));
});

const pagedClusters = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize;
  return filteredClusters.value.slice(start, start + pagination.pageSize);
});

const canAssignUsers = computed(() => isSuperAdminUser());

const assignPageCount = computed(() => {
  if (assignDialog.total <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(assignDialog.total / assignDialog.pageSize));
});

const isCurrentAssignPageAllChecked = computed(() => {
  if (assignDialog.userOptions.length === 0) {
    return false;
  }
  return assignDialog.userOptions.every((item) => assignDialog.selectedUserIds.includes(item.id));
});

function showSuccess(message: string): void {
  successMsg.value = message;
  window.clearTimeout(successTimer);
  successTimer = window.setTimeout(() => {
    successMsg.value = "";
  }, 2200);
}

function clearNotices(): void {
  errorMsg.value = "";
  successMsg.value = "";
}

function resolveHealth(status: number): { label: string; className: string } {
  return healthStatusConfig[status] || { label: "未知", className: "warn" };
}

function resolveSync(status: number): { label: string; className: string } {
  return syncStatusConfig[status] || { label: "未知", className: "warn" };
}

function resolveEnvironmentClass(environment: string): string {
  const option = environmentOptions.find((item) => item.value === environment);
  return option?.className || "";
}

function resolveClusterType(clusterType: string): string {
  const option = clusterTypeOptions.find((item) => item.value === clusterType);
  return option?.label || clusterType || "-";
}

function formatEnvironment(environment: string): string {
  const option = environmentOptions.find((item) => item.value === environment);
  return option?.label || environment || "未知";
}

function formatDate(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) {
    return "-";
  }
  const date = new Date(unixSeconds * 1000);
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mi = `${date.getMinutes()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function syncPagination(): void {
  if (pagination.page > pageCount.value) {
    pagination.page = pageCount.value;
  }
  if (pagination.page < 1) {
    pagination.page = 1;
  }
}

function uniquePositiveNumbers(values: number[]): number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  values.forEach((value) => {
    const normalized = Number(value);
    if (!Number.isFinite(normalized) || normalized <= 0 || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    result.push(normalized);
  });
  return result;
}

function normalizeAssignableUser(payload: {
  id: number;
  username?: string;
  nickname?: string;
  email?: string;
}): AssignableUser {
  return {
    id: payload.id,
    username: payload.username ?? "",
    nickname: payload.nickname ?? "",
    email: payload.email ?? ""
  };
}

async function fetchClusters(): Promise<void> {
  loading.value = true;
  clearNotices();

  try {
    const response = await searchClusterApi({
      page: 1,
      pageSize: 200,
      name: searchForm.value.name || undefined,
      environment: searchForm.value.environment || undefined
    });
    clusters.value = response.items || [];
    syncPagination();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "获取集群列表失败";
  } finally {
    loading.value = false;
  }
}

function handleSearch(form: ClusterSearchForm): void {
  searchForm.value = { ...form };
  pagination.page = 1;
  void fetchClusters();
}

function handleResetSearch(): void {
  searchForm.value = {
    name: "",
    environment: "",
    clusterType: ""
  };
  pagination.page = 1;
  void fetchClusters();
}

function switchViewMode(mode: "card" | "table"): void {
  if (viewMode.value === mode) {
    return;
  }
  viewMode.value = mode;
  pagination.page = 1;
  pagination.pageSize = mode === "card" ? 12 : 20;
  if (mode === "table") {
    showSearchBar.value = true;
  }
  syncPagination();
}

function changePage(page: number): void {
  if (page < 1 || page > pageCount.value) {
    return;
  }
  pagination.page = page;
}

function handlePageSizeChange(): void {
  pagination.page = 1;
  syncPagination();
}

function openConsole(clusterId: number): void {
  if (!Number.isFinite(clusterId) || clusterId <= 0) {
    return;
  }
  emit("open-console", clusterId);
}

function openAddPage(): void {
  emit("open-add");
}

async function refreshData(): Promise<void> {
  refreshLoading.value = true;
  try {
    await fetchClusters();
  } finally {
    refreshLoading.value = false;
  }
}

async function handleSync(cluster: Cluster): Promise<void> {
  syncLoadingMap[cluster.id] = true;
  clearNotices();

  try {
    const message = await syncClusterApi(cluster.id);
    showSuccess(message || `已触发集群 ${cluster.name} 的同步任务`);
    await fetchClusters();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "同步集群失败";
  } finally {
    delete syncLoadingMap[cluster.id];
  }
}

async function handleSyncAll(): Promise<void> {
  if (!confirm("确定要同步全部集群吗？该操作可能需要几分钟。")) {
    return;
  }

  syncAllLoading.value = true;
  clearNotices();

  try {
    const message = await syncAllClustersApi();
    showSuccess(message || "已触发全部集群同步任务");
    await fetchClusters();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "同步全部集群失败";
  } finally {
    syncAllLoading.value = false;
  }
}

async function handleDelete(cluster: Cluster): Promise<void> {
  if (!confirm(`确定删除集群 "${cluster.name}" 吗？此操作不可恢复。`)) {
    return;
  }

  deleteLoadingMap[cluster.id] = true;
  clearNotices();

  try {
    const message = await deleteClusterApi(cluster.id);
    showSuccess(message || `已删除集群 ${cluster.name}`);
    await fetchClusters();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "删除集群失败";
  } finally {
    delete deleteLoadingMap[cluster.id];
  }
}

function resetAssignDialogState(): void {
  assignDialog.clusterId = 0;
  assignDialog.clusterUuid = "";
  assignDialog.clusterName = "";
  assignDialog.keyword = "";
  assignDialog.page = 1;
  assignDialog.total = 0;
  assignDialog.userOptions = [];
  assignDialog.selectedUserIds = [];
}

async function loadAssignedClusterUsers(clusterUuid: string): Promise<void> {
  const assigned = await getClusterMembersApi(clusterUuid);
  assignDialog.selectedUserIds = uniquePositiveNumbers(assigned.map((item) => item.userId));
}

async function loadAssignableUsers(): Promise<void> {
  const response = await searchUserApi({
    page: assignDialog.page,
    pageSize: assignDialog.pageSize,
    username: assignDialog.keyword.trim() || undefined,
    nickname: assignDialog.keyword.trim() || undefined,
    email: assignDialog.keyword.trim() || undefined
  });

  const optionsMap = new Map<number, AssignableUser>();
  response.items.forEach((item) => {
    const user = normalizeAssignableUser({
      id: item.id,
      username: item.username,
      nickname: item.nickname,
      email: item.email
    });
    if (user.id > 0) {
      optionsMap.set(user.id, user);
    }
  });

  assignDialog.userOptions = Array.from(optionsMap.values());
  assignDialog.total = response.total > 0 ? response.total : assignDialog.userOptions.length;
}

async function openAssignDialog(cluster: Cluster): Promise<void> {
  if (!canAssignUsers.value) {
    errorMsg.value = "仅超级管理员可分配集群用户";
    return;
  }

  assignLoadingMap[cluster.id] = true;
  clearNotices();
  assignDialog.visible = true;
  assignDialog.loading = true;
  assignDialog.submitting = false;
  assignDialog.clusterId = cluster.id;
  assignDialog.clusterUuid = cluster.uuid;
  assignDialog.clusterName = cluster.name;
  assignDialog.keyword = "";
  assignDialog.page = 1;
  assignDialog.total = 0;
  assignDialog.userOptions = [];
  assignDialog.selectedUserIds = [];

  try {
    await loadAssignedClusterUsers(cluster.uuid);
    await loadAssignableUsers();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "加载集群分配用户失败";
  } finally {
    assignDialog.loading = false;
    delete assignLoadingMap[cluster.id];
  }
}

function closeAssignDialog(): void {
  if (assignDialog.submitting) {
    return;
  }
  assignDialog.visible = false;
  resetAssignDialogState();
}

function toggleAssignMember(user: AssignableUser, checked: boolean): void {
  const selected = uniquePositiveNumbers(assignDialog.selectedUserIds);
  if (checked) {
    if (!selected.includes(user.id)) {
      selected.push(user.id);
    }
    assignDialog.selectedUserIds = uniquePositiveNumbers(selected);
    return;
  }
  assignDialog.selectedUserIds = selected.filter((item) => item !== user.id);
}

function toggleAssignCurrentPage(checked: boolean): void {
  const currentIds = uniquePositiveNumbers(assignDialog.userOptions.map((item) => item.id));
  if (checked) {
    assignDialog.selectedUserIds = uniquePositiveNumbers([...assignDialog.selectedUserIds, ...currentIds]);
    return;
  }
  const currentSet = new Set(currentIds);
  assignDialog.selectedUserIds = assignDialog.selectedUserIds.filter((item) => !currentSet.has(item));
}

function searchAssignUsers(): void {
  assignDialog.page = 1;
  assignDialog.loading = true;
  errorMsg.value = "";
  void loadAssignableUsers()
    .catch((error: unknown) => {
      errorMsg.value = error instanceof Error ? error.message : "加载用户列表失败";
    })
    .finally(() => {
      assignDialog.loading = false;
    });
}

function resetAssignSearch(): void {
  assignDialog.keyword = "";
  assignDialog.page = 1;
  assignDialog.loading = true;
  errorMsg.value = "";
  void loadAssignableUsers()
    .catch((error: unknown) => {
      errorMsg.value = error instanceof Error ? error.message : "加载用户列表失败";
    })
    .finally(() => {
      assignDialog.loading = false;
    });
}

function changeAssignPage(page: number): void {
  if (page < 1 || page > assignPageCount.value || page === assignDialog.page) {
    return;
  }
  assignDialog.page = page;
  assignDialog.loading = true;
  errorMsg.value = "";
  void loadAssignableUsers()
    .catch((error: unknown) => {
      errorMsg.value = error instanceof Error ? error.message : "加载用户列表失败";
    })
    .finally(() => {
      assignDialog.loading = false;
    });
}

async function submitAssignDialog(): Promise<void> {
  if (!assignDialog.clusterUuid) {
    errorMsg.value = "集群信息缺失";
    return;
  }
  assignDialog.submitting = true;
  errorMsg.value = "";
  try {
    const message = await setClusterMembersApi(
      assignDialog.clusterUuid,
      uniquePositiveNumbers(assignDialog.selectedUserIds)
    );
    showSuccess(message || "集群分配用户保存成功");
    assignDialog.visible = false;
    resetAssignDialogState();
    await fetchClusters();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "保存集群分配用户失败";
  } finally {
    assignDialog.submitting = false;
  }
}

onMounted(async () => {
  await fetchClusters();
});

onBeforeUnmount(() => {
  window.clearTimeout(successTimer);
});
</script>

<style scoped>
.cluster-page {
  width: 100%;
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

.toolbar-left {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.toolbar-left h2 {
  margin: 0;
  color: #1f2a3d;
  font-size: 22px;
}

.count-chip {
  height: 24px;
  border-radius: 999px;
  padding: 0 10px;
  background: #ebf2ff;
  color: #2756ba;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
}

.toolbar-right {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.switch-group {
  border: 1px solid #d8e2ee;
  border-radius: 10px;
  overflow: hidden;
  display: inline-flex;
}

.switch-group button {
  border: none;
  background: #fff;
  color: #4b5f7a;
  height: 34px;
  padding: 0 12px;
  font-size: 13px;
  cursor: pointer;
}

.switch-group button.active {
  background: #1a73e8;
  color: #fff;
}

.toolbar-right > button {
  height: 34px;
  border-radius: 10px;
  border: 1px solid #d8e2ee;
  background: #fff;
  color: #334155;
  padding: 0 12px;
  font-size: 13px;
  cursor: pointer;
}

.toolbar-right > button.warning {
  background: #fff7e6;
  border-color: #ffd591;
  color: #ad4e00;
}

.toolbar-right > button.primary {
  background: #1a73e8;
  border-color: #1a73e8;
  color: #fff;
}

.toolbar-right > button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.search-card {
  background: #fff;
  border: 1px solid #dbe5f1;
  border-radius: 14px;
  padding: 12px;
}

.notice {
  margin: 0;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
}

.notice.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.notice.success {
  background: #effcf3;
  border: 1px solid #bbf7d0;
  color: #0f8e4f;
}

.state-card {
  border: 1px dashed #d1d9e6;
  border-radius: 14px;
  background: #fff;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5c6f87;
  font-size: 14px;
}

.state-card.loading {
  flex-direction: column;
  gap: 10px;
}

.spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid #d6e2f6;
  border-top-color: #2e6fdb;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid #dbe5f1;
  border-radius: 14px;
  background: #fff;
}

.cluster-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
}

.cluster-table th,
.cluster-table td {
  border-bottom: 1px solid #edf2f7;
  text-align: left;
  padding: 10px 10px;
  font-size: 13px;
  color: #1f2a3d;
}

.cluster-table th {
  background: #f8fafd;
  color: #4b5f7a;
  font-weight: 700;
}

.name-link {
  border: none;
  background: none;
  color: #1a5fd1;
  cursor: pointer;
  padding: 0;
  font-size: 13px;
}

.name-link:hover {
  text-decoration: underline;
}

.env-chip {
  display: inline-flex;
  align-items: center;
  height: 22px;
  border-radius: 999px;
  padding: 0 9px;
  font-size: 12px;
  color: #4b5f7a;
  background: #eef3f9;
}

.env-chip.production {
  color: #116a43;
  background: #e9f7ef;
}

.env-chip.staging {
  color: #ad5c00;
  background: #fff4df;
}

.env-chip.testing {
  color: #0f529b;
  background: #eaf4ff;
}

.env-chip.development {
  color: #5b3ac0;
  background: #efeafe;
}

.muted {
  color: #6b7b92;
  margin-left: 4px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  height: 22px;
  border-radius: 999px;
  padding: 0 9px;
  font-size: 12px;
  font-weight: 600;
}

.status-chip.ok {
  color: #0f8e4f;
  background: #e8f9ef;
}

.status-chip.warn {
  color: #be6a00;
  background: #fff4e6;
}

.status-chip.danger {
  color: #bf1d1d;
  background: #feecec;
}

.actions {
  display: inline-flex;
  gap: 8px;
}

.actions button {
  height: 28px;
  border-radius: 8px;
  border: 1px solid #d3dceb;
  padding: 0 10px;
  background: #fff;
  color: #334155;
  font-size: 12px;
  cursor: pointer;
}

.actions button.danger {
  border-color: #f2c9c9;
  color: #c53030;
}

.actions button.primary-soft {
  border-color: #bfdbfe;
  color: #1d4ed8;
  background: #eff6ff;
}

.actions button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 1200;
}

.dialog-card {
  width: min(860px, 100%);
  background: #fff;
  border-radius: 16px;
  border: 1px solid #dbe5f1;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.25);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.dialog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid #edf2f7;
}

.dialog-head h3 {
  margin: 0;
  font-size: 18px;
  color: #1f2a3d;
}

.dialog-head p {
  margin: 6px 0 0;
  font-size: 12px;
  color: #64748b;
  word-break: break-all;
}

.icon-btn {
  height: 30px;
  border: 1px solid #d3dceb;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  padding: 0 10px;
  cursor: pointer;
}

.dialog-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  border-bottom: 1px solid #edf2f7;
  flex-wrap: wrap;
}

.dialog-search input {
  flex: 1 1 260px;
  min-width: 180px;
  height: 34px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0 10px;
  font-size: 13px;
}

.dialog-search button {
  height: 34px;
  border-radius: 10px;
  border: 1px solid #d8e2ee;
  background: #fff;
  color: #334155;
  padding: 0 12px;
  font-size: 13px;
  cursor: pointer;
}

.dialog-body {
  padding: 12px 18px;
  overflow: auto;
  max-height: 56vh;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dialog-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #334155;
}

.dialog-meta {
  font-size: 12px;
  color: #64748b;
}

.dialog-state {
  min-height: 120px;
  border: 1px dashed #d1d9e6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 13px;
  background: #f8fafc;
}

.dialog-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 620px;
}

.dialog-table th,
.dialog-table td {
  border-bottom: 1px solid #edf2f7;
  text-align: left;
  padding: 9px 10px;
  font-size: 13px;
  color: #1f2a3d;
}

.dialog-table th {
  position: sticky;
  top: 0;
  background: #f8fafd;
  color: #4b5f7a;
  font-weight: 700;
  z-index: 1;
}

.dialog-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 18px 16px;
  border-top: 1px solid #edf2f7;
}

.dialog-page {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #4b5f7a;
}

.dialog-page button {
  height: 30px;
  border: 1px solid #d2dcea;
  border-radius: 8px;
  background: #fff;
  padding: 0 10px;
  cursor: pointer;
}

.dialog-page button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.dialog-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.dialog-actions button {
  height: 34px;
  border-radius: 10px;
  border: 1px solid #d8e2ee;
  background: #fff;
  color: #334155;
  padding: 0 12px;
  cursor: pointer;
}

.dialog-actions button.primary {
  background: #1a73e8;
  border-color: #1a73e8;
  color: #fff;
}

.dialog-actions button:disabled,
.icon-btn:disabled,
.dialog-search button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  border: 1px solid #dbe5f1;
  border-radius: 12px;
  background: #fff;
  padding: 10px 12px;
}

.pagination .left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #4b5f7a;
  font-size: 13px;
}

.pagination .left select {
  height: 30px;
  border: 1px solid #d2dcea;
  border-radius: 8px;
  padding: 0 8px;
}

.pagination .right {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #4b5f7a;
  font-size: 13px;
}

.pagination .right button {
  height: 30px;
  border: 1px solid #d2dcea;
  border-radius: 8px;
  background: #fff;
  padding: 0 10px;
  cursor: pointer;
}

.pagination .right button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
