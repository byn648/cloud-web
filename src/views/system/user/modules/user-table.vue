<template>
  <section class="table-card">
    <div class="table-head">
      <h3>用户列表</h3>
      <span>共 {{ total }} 条</span>
    </div>

    <div class="table-wrap">
      <table class="user-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>邮箱</th>
            <th>手机号</th>
            <th>工号</th>
            <th>状态</th>
            <th>重置密码</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9" class="empty">正在加载用户数据...</td>
          </tr>
          <tr v-else-if="users.length === 0">
            <td colspan="9" class="empty">暂无符合条件的数据</td>
          </tr>
          <tr v-for="item in users" :key="item.id">
            <td>{{ item.id }}</td>
            <td>
              <div class="user-name">
                <span>{{ item.username }}</span>
                <span v-if="item.username === currentUsername" class="self-tag">当前账号</span>
              </div>
              <div class="user-sub">{{ item.nickname || "-" }}</div>
            </td>
            <td>{{ item.email || "-" }}</td>
            <td>{{ item.phone || "-" }}</td>
            <td>{{ item.workNumber || "-" }}</td>
            <td>
              <span class="status-chip" :class="getStatusMeta(item.status).className">
                {{ getStatusMeta(item.status).label }}
              </span>
            </td>
            <td>{{ item.isNeedResetPwd === 1 ? "是" : "否" }}</td>
            <td>{{ formatTimestamp(item.updatedAt || item.createdAt) }}</td>
            <td class="actions">
              <div class="menu-wrap" @click.stop>
                <button
                  class="more-btn"
                  :disabled="isActionDisabled(item.id)"
                  @click.stop="toggleActionMenu(item.id)"
                >
                  ⋮
                </button>
                <div v-if="openedActionMenuUserId === item.id" class="action-menu">
                  <button class="menu-item" @click="handleEdit(item)">编辑用户</button>
                  <button class="menu-item" @click="handleRole(item)">分配角色</button>
                  <button class="menu-item" @click="handlePlatform(item)">平台授权</button>
                  <button
                    class="menu-item"
                    :disabled="resetLoadingMap[item.id] || item.username === currentUsername"
                    @click="handleResetPassword(item)"
                  >
                    {{ resetLoadingMap[item.id] ? "重置中..." : "重置密码" }}
                  </button>
                  <button
                    class="menu-item danger"
                    :disabled="deleteLoadingMap[item.id] || item.username === currentUsername"
                    @click="handleDeleteUser(item)"
                  >
                    {{ deleteLoadingMap[item.id] ? "删除中..." : "删除用户" }}
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="table-footer">
      <div class="page-info">第 {{ page }} / {{ pageCount }} 页</div>
      <div class="pager">
        <button :disabled="page <= 1 || loading" @click="emit('change-page', page - 1)">上一页</button>
        <button :disabled="page >= pageCount || loading" @click="emit('change-page', page + 1)">下一页</button>
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { UserSysUser } from "../../../../api/portal/user";
import { formatTimestamp, getStatusMeta } from "./table-config";

const props = defineProps<{
  users: UserSysUser[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  currentUsername: string;
  resetLoadingMap: Record<number, boolean>;
  deleteLoadingMap: Record<number, boolean>;
  roleLoadingMap: Record<number, boolean>;
  platformLoadingMap: Record<number, boolean>;
}>();

const emit = defineEmits<{
  "edit-user": [user: UserSysUser];
  "assign-role": [user: UserSysUser];
  "authorize-platform": [user: UserSysUser];
  "reset-password": [user: UserSysUser];
  "delete-user": [user: UserSysUser];
  "change-page": [page: number];
}>();

const openedActionMenuUserId = ref<number | null>(null);

const pageCount = computed(() => {
  if (props.total <= 0 || props.pageSize <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(props.total / props.pageSize));
});

function isActionDisabled(userId: number): boolean {
  return !!props.deleteLoadingMap[userId] || !!props.resetLoadingMap[userId];
}

function toggleActionMenu(userId: number): void {
  openedActionMenuUserId.value = openedActionMenuUserId.value === userId ? null : userId;
}

function closeActionMenu(): void {
  openedActionMenuUserId.value = null;
}

function handleEdit(user: UserSysUser): void {
  emit("edit-user", user);
  closeActionMenu();
}

function handleRole(user: UserSysUser): void {
  if (props.roleLoadingMap[user.id]) {
    return;
  }
  emit("assign-role", user);
  closeActionMenu();
}

function handlePlatform(user: UserSysUser): void {
  if (props.platformLoadingMap[user.id]) {
    return;
  }
  emit("authorize-platform", user);
  closeActionMenu();
}

function handleResetPassword(user: UserSysUser): void {
  if (props.resetLoadingMap[user.id] || user.username === props.currentUsername) {
    return;
  }
  emit("reset-password", user);
  closeActionMenu();
}

function handleDeleteUser(user: UserSysUser): void {
  if (props.deleteLoadingMap[user.id] || user.username === props.currentUsername) {
    return;
  }
  emit("delete-user", user);
  closeActionMenu();
}

function handleDocumentClick(): void {
  closeActionMenu();
}

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    document.removeEventListener("click", handleDocumentClick);
  }
});

onMounted(() => {
  if (typeof window !== "undefined") {
    document.addEventListener("click", handleDocumentClick);
  }
});
</script>

<style scoped>
.table-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.35);
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

.user-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
}

.user-table th,
.user-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #f1f5f9;
  text-align: left;
  color: #0f172a;
  font-size: 13px;
  white-space: nowrap;
}

.user-table th {
  background: #f8fafc;
  font-weight: 700;
  color: #334155;
}

.user-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.user-sub {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}

.self-tag {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 600;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  height: 22px;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
}

.status-chip.enabled {
  background: #dcfce7;
  color: #166534;
}

.status-chip.disabled {
  background: #fee2e2;
  color: #991b1b;
}

.actions {
  position: relative;
}

.menu-wrap {
  position: relative;
  display: inline-flex;
}

.more-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid #dbe3ef;
  background: #f8fafc;
  color: #334155;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.more-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.action-menu {
  position: absolute;
  right: 0;
  top: 38px;
  z-index: 20;
  width: 148px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 20px 40px -30px rgba(15, 23, 42, 0.45);
  padding: 6px;
  display: grid;
  gap: 4px;
}

.menu-item {
  height: 34px;
  border: 0;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  font-size: 13px;
  text-align: left;
  padding: 0 10px;
  cursor: pointer;
}

.menu-item:hover:not(:disabled) {
  background: #f1f5f9;
}

.menu-item.danger {
  color: #dc2626;
}

.menu-item:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.empty {
  text-align: center !important;
  color: #64748b !important;
  padding: 26px !important;
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
  cursor: not-allowed;
  opacity: 0.55;
}
</style>
