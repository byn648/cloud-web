<template>
  <div class="role-page">
    <header class="page-head">
      <div>
        <h2>系统角色管理</h2>
        <p>参考 kube-nova-web 的角色管理能力，支持查询、新增、编辑、删除与权限配置入口。</p>
      </div>
      <div class="head-actions">
        <button class="secondary-btn" :disabled="loading" @click="refreshData">
          {{ loading ? "刷新中..." : "刷新数据" }}
        </button>
        <button class="primary-btn" :disabled="loading" @click="openDialog('add')">新增角色</button>
      </div>
    </header>

    <section class="search-card">
      <form class="search-grid" @submit.prevent="handleSearch">
        <label class="field">
          <span>角色名称</span>
          <input v-model.trim="searchForm.name" :disabled="loading" placeholder="请输入角色名称" />
        </label>
        <label class="field">
          <span>角色编码</span>
          <input v-model.trim="searchForm.code" :disabled="loading" placeholder="例如：admin" />
        </label>
        <div class="actions">
          <button type="submit" :disabled="loading">搜索</button>
          <button type="button" class="secondary" :disabled="loading" @click="handleResetSearch">重置</button>
        </div>
      </form>
    </section>

    <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>
    <p v-if="successMessage" class="alert success">{{ successMessage }}</p>

    <section class="table-card">
      <div class="table-head">
        <div>
          <h3>角色列表</h3>
          <p class="table-tip">角色是全局模板，未分配给当前用户的角色也会显示在列表中。</p>
        </div>
        <div class="table-head-right">
          <span>共 {{ total }} 条</span>
          <button class="primary-btn table-add-btn" :disabled="loading" @click="openDialog('add')">新增角色</button>
        </div>
      </div>

      <div class="table-wrap">
        <table class="role-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>角色名称</th>
              <th>角色编码</th>
              <th>备注</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="empty">正在加载角色数据...</td>
            </tr>
            <tr v-else-if="roles.length === 0">
              <td colspan="7" class="empty">暂无角色数据</td>
            </tr>
            <tr v-for="item in roles" :key="item.id">
              <td>{{ item.id }}</td>
              <td>{{ item.name || "-" }}</td>
              <td>{{ item.code || "-" }}</td>
              <td>{{ item.remark || "-" }}</td>
              <td>
                <span class="status-chip" :class="item.status === 1 ? 'enabled' : 'disabled'">
                  {{ item.status === 1 ? "启用" : "禁用" }}
                </span>
              </td>
              <td>{{ formatTimestamp(item.updatedAt || item.createdAt) }}</td>
              <td class="row-actions">
                <button
                  class="action-btn secondary"
                  :disabled="deletingMap[item.id]"
                  @click="openMenuPermissionDialog(item)"
                >
                  菜单权限
                </button>
                <button
                  class="action-btn secondary"
                  :disabled="deletingMap[item.id]"
                  @click="openApiPermissionDialog(item)"
                >
                  API权限
                </button>
                <button class="action-btn secondary" :disabled="deletingMap[item.id]" @click="openDialog('edit', item)">
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
          <button :disabled="pagination.page <= 1 || loading" @click="changePage(pagination.page - 1)">上一页</button>
          <button :disabled="pagination.page >= pageCount || loading" @click="changePage(pagination.page + 1)">
            下一页
          </button>
        </div>
      </footer>
    </section>

    <div v-if="dialog.visible" class="dialog-mask" @click.self="closeDialog">
      <div class="dialog">
        <h3>{{ dialog.mode === "add" ? "新增角色" : "编辑角色" }}</h3>
        <label class="dialog-field">
          <span>角色名称</span>
          <input v-model.trim="dialog.form.name" maxlength="50" placeholder="请输入角色名称" />
        </label>
        <label class="dialog-field">
          <span>角色编码</span>
          <input v-model.trim="dialog.form.code" maxlength="50" placeholder="请输入角色编码" />
        </label>
        <label class="dialog-field">
          <span>备注</span>
          <textarea v-model.trim="dialog.form.remark" rows="4" maxlength="200" placeholder="请输入备注（选填）" />
        </label>
        <div class="dialog-actions">
          <button class="secondary-btn" :disabled="dialog.submitting" @click="closeDialog">取消</button>
          <button class="primary-btn" :disabled="dialog.submitting" @click="submitDialog">
            {{ dialog.submitting ? "提交中..." : "确定" }}
          </button>
        </div>
      </div>
    </div>

    <MenuPermissionDialog
      v-model="menuPermissionDialogVisible"
      :role="currentPermissionRole"
      @success="handlePermissionSaved"
    />
    <ApiPermissionDialog
      v-model="apiPermissionDialogVisible"
      :role="currentPermissionRole"
      @success="handlePermissionSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import {
  addRoleApi,
  deleteRoleApi,
  searchRoleApi,
  updateRoleApi,
  type RoleSysRole
} from "../../../api/portal/role";
import ApiPermissionDialog from "./modules/api-permission-dialog.vue";
import MenuPermissionDialog from "./modules/menu-permission-dialog.vue";

interface RoleSearchForm {
  name: string;
  code: string;
}

const loading = ref(false);
const roles = ref<RoleSysRole[]>([]);
const total = ref(0);
const errorMessage = ref("");
const successMessage = ref("");
const deletingMap = ref<Record<number, boolean>>({});
const currentPermissionRole = ref<RoleSysRole | null>(null);
const menuPermissionDialogVisible = ref(false);
const apiPermissionDialogVisible = ref(false);
let successTimer = 0;

const searchForm = ref<RoleSearchForm>({
  name: "",
  code: ""
});

const pagination = reactive({
  page: 1,
  pageSize: 20
});

const dialog = reactive({
  visible: false,
  mode: "add" as "add" | "edit",
  targetId: 0,
  submitting: false,
  form: {
    name: "",
    code: "",
    remark: ""
  }
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

function showSuccess(message: string): void {
  successMessage.value = message;
  window.clearTimeout(successTimer);
  successTimer = window.setTimeout(() => {
    successMessage.value = "";
  }, 2200);
}

async function loadData(): Promise<void> {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await searchRoleApi({
      page: pagination.page,
      pageSize: pagination.pageSize,
      name: searchForm.value.name.trim() || undefined,
      code: searchForm.value.code.trim() || undefined
    });

    roles.value = response.items;
    total.value = response.total;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "加载角色列表失败";
  } finally {
    loading.value = false;
  }
}

function refreshData(): void {
  void loadData();
}

function handleSearch(): void {
  pagination.page = 1;
  void loadData();
}

function handleResetSearch(): void {
  searchForm.value = {
    name: "",
    code: ""
  };
  pagination.page = 1;
  void loadData();
}

function changePage(page: number): void {
  if (page < 1 || page > pageCount.value || page === pagination.page) {
    return;
  }
  pagination.page = page;
  void loadData();
}

function openDialog(mode: "add" | "edit", role?: RoleSysRole): void {
  dialog.visible = true;
  dialog.mode = mode;
  dialog.targetId = role?.id ?? 0;
  dialog.form.name = role?.name ?? "";
  dialog.form.code = role?.code ?? "";
  dialog.form.remark = role?.remark ?? "";
}

function closeDialog(): void {
  if (dialog.submitting) {
    return;
  }
  dialog.visible = false;
}

async function submitDialog(): Promise<void> {
  const name = dialog.form.name.trim();
  const code = dialog.form.code.trim();
  const remark = dialog.form.remark.trim();

  if (!name) {
    errorMessage.value = "角色名称不能为空";
    return;
  }
  if (!code) {
    errorMessage.value = "角色编码不能为空";
    return;
  }

  dialog.submitting = true;
  errorMessage.value = "";

  try {
    if (dialog.mode === "add") {
      await addRoleApi({
        name,
        code,
        remark: remark || undefined
      });
      showSuccess("角色新增成功");
    } else {
      await updateRoleApi({
        id: dialog.targetId,
        name,
        code,
        remark: remark || undefined
      });
      showSuccess("角色更新成功");
    }

    dialog.visible = false;
    await loadData();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "保存角色失败";
  } finally {
    dialog.submitting = false;
  }
}

async function handleDelete(role: RoleSysRole): Promise<void> {
  if (!confirm(`确定删除角色 "${role.name}" 吗？`)) {
    return;
  }

  deletingMap.value[role.id] = true;
  errorMessage.value = "";

  try {
    await deleteRoleApi(role.id);
    showSuccess("角色删除成功");
    await loadData();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "删除角色失败";
  } finally {
    deletingMap.value[role.id] = false;
  }
}

function openMenuPermissionDialog(role: RoleSysRole): void {
  currentPermissionRole.value = role;
  menuPermissionDialogVisible.value = true;
}

function openApiPermissionDialog(role: RoleSysRole): void {
  currentPermissionRole.value = role;
  apiPermissionDialogVisible.value = true;
}

function handlePermissionSaved(message: string): void {
  showSuccess(message);
  void loadData();
}

onMounted(() => {
  void loadData();
});

onBeforeUnmount(() => {
  window.clearTimeout(successTimer);
});
</script>

<style scoped>
.role-page {
  min-height: 100%;
  padding: 16px;
  background:
    radial-gradient(circle at 0% 0%, rgba(14, 165, 233, 0.1) 0, rgba(14, 165, 233, 0) 34%),
    radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.1) 0, rgba(59, 130, 246, 0) 36%),
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
  font-size: 20px;
  color: #0f172a;
}

.page-head p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #64748b;
}

.head-actions {
  display: flex;
  gap: 8px;
}

.primary-btn,
.secondary-btn {
  height: 36px;
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

.primary-btn:disabled,
.secondary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.search-card,
.table-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.35);
}

.search-card {
  padding: 14px;
}

.search-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  gap: 10px 12px;
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

.field input {
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0 10px;
  font-size: 13px;
}

.actions {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.actions button {
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

.actions .secondary {
  border-color: #cbd5e1;
  background: #fff;
  color: #0f172a;
}

.table-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #eef2f7;
  gap: 10px;
  flex-wrap: wrap;
}

.table-head h3 {
  margin: 0;
  color: #0f172a;
  font-size: 15px;
}

.table-tip {
  margin: 4px 0 0;
  color: #94a3b8;
  font-size: 12px;
}

.table-head span {
  color: #64748b;
  font-size: 12px;
}

.table-head-right {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.table-add-btn {
  height: 32px;
  border-radius: 8px;
  padding: 0 10px;
  font-size: 12px;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

.role-table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
}

.role-table th,
.role-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
  color: #0f172a;
  white-space: nowrap;
  text-align: left;
}

.role-table th {
  background: #f8fafc;
  font-weight: 700;
  color: #334155;
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

.row-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  height: 30px;
  border-radius: 8px;
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #fff;
  padding: 0 10px;
  font-size: 12px;
  cursor: pointer;
}

.action-btn.secondary {
  border-color: #cbd5e1;
  background: #fff;
  color: #0f172a;
}

.action-btn.danger {
  border-color: #dc2626;
  background: #dc2626;
}

.action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
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
  text-align: center !important;
  color: #64748b !important;
  padding: 26px !important;
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
  width: min(560px, calc(100vw - 32px));
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 30px 80px -45px rgba(15, 23, 42, 0.8);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dialog h3 {
  margin: 0 0 4px;
  color: #0f172a;
  font-size: 18px;
}

.dialog-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dialog-field span {
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.dialog-field input,
.dialog-field textarea {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 9px 10px;
  font-size: 13px;
  resize: vertical;
}

.dialog-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 1080px) {
  .search-grid {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}

@media (max-width: 700px) {
  .search-grid {
    grid-template-columns: 1fr;
  }

  .head-actions {
    width: 100%;
  }

  .head-actions button {
    flex: 1;
  }
}
</style>
