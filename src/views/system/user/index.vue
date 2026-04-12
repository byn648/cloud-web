<template>
  <div class="user-page">
    <header class="page-head">
      <div>
        <h2>系统用户管理</h2>
        <p>对齐 kube-nova-web 风格的用户管理页面，支持检索、状态切换与密码重置。</p>
      </div>
      <button class="refresh-btn" :disabled="loading" @click="refreshData">
        {{ loading ? "刷新中..." : "刷新数据" }}
      </button>
    </header>

    <UserSearch v-model="searchForm" :loading="loading" @search="handleSearch" @reset="handleResetSearch" />

    <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>
    <p v-if="successMessage" class="alert success">{{ successMessage }}</p>

    <UserTable
      :users="users"
      :loading="loading"
      :total="total"
      :page="pagination.page"
      :page-size="pagination.pageSize"
      :current-username="currentUsername"
      :status-loading-map="statusLoadingMap"
      :reset-loading-map="resetLoadingMap"
      @toggle-status="handleStatusChange"
      @reset-password="handleResetPassword"
      @change-page="handlePageChange"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import {
  getUserInfoApi,
  resetUserPasswordApi,
  searchUserApi,
  type UserSearchRequest,
  type UserSysUser,
  updateUserStatusApi
} from "../../../api/portal/user";
import UserSearch from "./modules/user-search.vue";
import UserTable from "./modules/user-table.vue";
import { createDefaultSearchForm, toUserSearchParams } from "./modules/table-config";

const loading = ref(false);
const users = ref<UserSysUser[]>([]);
const total = ref(0);
const currentUsername = ref("");
const errorMessage = ref("");
const successMessage = ref("");
const statusLoadingMap = ref<Record<number, boolean>>({});
const resetLoadingMap = ref<Record<number, boolean>>({});
let successTimer = 0;

const pagination = reactive({
  page: 1,
  pageSize: 20
});

const searchForm = ref(createDefaultSearchForm());

function readUsernameFromStorage(): string {
  const raw = localStorage.getItem("userInfo");
  if (!raw) {
    return "";
  }

  try {
    const parsed = JSON.parse(raw) as { username?: string };
    return parsed.username || "";
  } catch {
    return "";
  }
}

function showSuccess(message: string) {
  successMessage.value = message;
  window.clearTimeout(successTimer);
  successTimer = window.setTimeout(() => {
    successMessage.value = "";
  }, 2200);
}

async function loadCurrentUser() {
  try {
    const user = await getUserInfoApi();
    currentUsername.value = user.username;
  } catch {
    currentUsername.value = readUsernameFromStorage();
  }
}

async function loadData() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const params: UserSearchRequest = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...toUserSearchParams(searchForm.value)
    };

    const response = await searchUserApi(params);
    users.value = response.items;
    total.value = response.total;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "加载用户列表失败";
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  void loadData();
}

function handleResetSearch() {
  searchForm.value = createDefaultSearchForm();
  pagination.page = 1;
  void loadData();
}

function handlePageChange(page: number) {
  if (page < 1 || page === pagination.page) {
    return;
  }
  pagination.page = page;
  void loadData();
}

async function handleStatusChange(user: UserSysUser) {
  if (user.username === currentUsername.value) {
    errorMessage.value = "当前登录账号不允许在此页面直接禁用";
    return;
  }

  const targetStatus = user.status === 1 ? 0 : 1;
  const actionLabel = targetStatus === 1 ? "启用" : "禁用";
  if (!confirm(`确定${actionLabel}账号 "${user.username}" 吗？`)) {
    return;
  }

  statusLoadingMap.value[user.id] = true;
  errorMessage.value = "";

  try {
    await updateUserStatusApi({
      id: user.id,
      status: targetStatus as 0 | 1
    });
    user.status = targetStatus;
    showSuccess(`${actionLabel}成功`);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : `${actionLabel}失败`;
  } finally {
    statusLoadingMap.value[user.id] = false;
  }
}

async function handleResetPassword(user: UserSysUser) {
  if (!confirm(`确定重置用户 "${user.username}" 的密码吗？`)) {
    return;
  }

  resetLoadingMap.value[user.id] = true;
  errorMessage.value = "";

  try {
    await resetUserPasswordApi(user.id);
    showSuccess(`已重置 ${user.username} 的密码`);
    await loadData();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "重置密码失败";
  } finally {
    resetLoadingMap.value[user.id] = false;
  }
}

function refreshData() {
  void loadData();
}

onMounted(async () => {
  await loadCurrentUser();
  await loadData();
});

onBeforeUnmount(() => {
  window.clearTimeout(successTimer);
});
</script>

<style scoped>
.user-page {
  min-height: 100%;
  padding: 16px;
  background:
    radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.12) 0, rgba(56, 189, 248, 0) 30%),
    radial-gradient(circle at 100% 0%, rgba(16, 185, 129, 0.1) 0, rgba(16, 185, 129, 0) 35%),
    #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
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
</style>
