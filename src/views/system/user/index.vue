<template>
  <div class="user-page">
    <header class="page-head">
      <div>
        <h2>系统用户管理</h2>
        <p>对齐 kube-nova-web，支持新增、编辑、分配角色、平台授权、重置密码、删除用户。</p>
      </div>
      <div class="head-actions">
        <button class="secondary-btn" :disabled="loading" @click="refreshData">
          {{ loading ? "刷新中..." : "刷新数据" }}
        </button>
        <button class="primary-btn" :disabled="loading" @click="openCreateDialog">新增用户</button>
      </div>
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
      :reset-loading-map="resetLoadingMap"
      :delete-loading-map="deleteLoadingMap"
      :role-loading-map="roleLoadingMap"
      :platform-loading-map="platformLoadingMap"
      @edit-user="openEditDialog"
      @assign-role="openRoleDialog"
      @authorize-platform="openPlatformDialog"
      @reset-password="handleResetPassword"
      @delete-user="handleDeleteUser"
      @change-page="handlePageChange"
    />

    <div v-if="createDialog.visible" class="dialog-mask" @click.self="closeCreateDialog">
      <div class="dialog">
        <h3>新增用户</h3>
        <div class="dialog-grid">
          <label class="dialog-field">
            <span>用户名 *</span>
            <input v-model.trim="createDialog.form.username" maxlength="64" placeholder="例如：alice" />
          </label>
          <label class="dialog-field">
            <span>昵称 *</span>
            <input v-model.trim="createDialog.form.nickname" maxlength="64" placeholder="请输入昵称" />
          </label>
          <label class="dialog-field">
            <span>邮箱 *</span>
            <input v-model.trim="createDialog.form.email" maxlength="100" placeholder="例如：a@corp.com" />
          </label>
          <label class="dialog-field">
            <span>手机号 *</span>
            <input v-model.trim="createDialog.form.phone" maxlength="20" placeholder="请输入手机号" />
          </label>
          <label class="dialog-field">
            <span>工号 *</span>
            <input v-model.trim="createDialog.form.workNumber" maxlength="64" placeholder="请输入工号" />
          </label>
          <label class="dialog-field">
            <span>部门ID</span>
            <input v-model.number="createDialog.form.deptId" type="number" min="0" placeholder="默认 0（可选）" />
          </label>
          <label class="dialog-field">
            <span>初始密码（可选）</span>
            <input
              v-model.trim="createDialog.form.password"
              type="password"
              maxlength="60"
              autocomplete="new-password"
              placeholder="不填则使用系统默认密码"
            />
          </label>
          <label class="dialog-field">
            <span>确认密码</span>
            <input
              v-model.trim="createDialog.form.confirmPassword"
              type="password"
              maxlength="60"
              autocomplete="new-password"
              placeholder="请再次输入初始密码"
            />
          </label>
        </div>
        <div class="dialog-actions">
          <button class="secondary-btn" :disabled="createDialog.submitting" @click="closeCreateDialog">取消</button>
          <button class="primary-btn" :disabled="createDialog.submitting" @click="submitCreateDialog">
            {{ createDialog.submitting ? "提交中..." : "确定" }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="editDialog.visible" class="dialog-mask" @click.self="closeEditDialog">
      <div class="dialog">
        <h3>编辑用户</h3>
        <div class="dialog-grid">
          <label class="dialog-field">
            <span>用户名</span>
            <input :value="editDialog.form.username" disabled />
          </label>
          <label class="dialog-field">
            <span>昵称 *</span>
            <input v-model.trim="editDialog.form.nickname" maxlength="64" placeholder="请输入昵称" />
          </label>
          <label class="dialog-field">
            <span>邮箱 *</span>
            <input v-model.trim="editDialog.form.email" maxlength="100" placeholder="请输入邮箱" />
          </label>
          <label class="dialog-field">
            <span>手机号 *</span>
            <input v-model.trim="editDialog.form.phone" maxlength="20" placeholder="请输入手机号" />
          </label>
          <label class="dialog-field">
            <span>工号 *</span>
            <input v-model.trim="editDialog.form.workNumber" maxlength="64" placeholder="请输入工号" />
          </label>
          <label class="dialog-field">
            <span>部门ID *</span>
            <input v-model.number="editDialog.form.deptId" type="number" min="1" placeholder="请输入部门ID" />
          </label>
          <label class="dialog-field">
            <span>状态</span>
            <select v-model.number="editDialog.form.status">
              <option :value="1">启用</option>
              <option :value="0">禁用</option>
            </select>
          </label>
          <label class="dialog-field">
            <span>需重置密码</span>
            <select v-model.number="editDialog.form.isNeedResetPwd">
              <option :value="0">否</option>
              <option :value="1">是</option>
            </select>
          </label>
        </div>
        <div class="dialog-actions">
          <button class="secondary-btn" :disabled="editDialog.submitting" @click="closeEditDialog">取消</button>
          <button class="primary-btn" :disabled="editDialog.submitting" @click="submitEditDialog">
            {{ editDialog.submitting ? "保存中..." : "保存" }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="roleDialog.visible" class="dialog-mask" @click.self="closeRoleDialog">
      <div class="dialog dialog-narrow">
        <h3>分配角色</h3>
        <p class="dialog-tip">用户：{{ roleDialog.user?.username || "-" }}</p>
        <p v-if="roleDialog.loading" class="dialog-tip">正在加载角色数据...</p>
        <div v-else class="checkbox-grid">
          <label v-for="role in roleDialog.roleOptions" :key="role.id" class="checkbox-item">
            <input
              type="checkbox"
              :checked="roleDialog.selectedRoleIds.includes(role.id)"
              @change="
                roleDialog.selectedRoleIds = toggleNumberInList(
                  roleDialog.selectedRoleIds,
                  role.id,
                  ($event.target as HTMLInputElement).checked
                )
              "
            />
            <span>{{ role.name }}（{{ role.code || "-" }}）</span>
          </label>
          <p v-if="roleDialog.roleOptions.length === 0" class="empty-tip">暂无角色可选</p>
        </div>
        <div class="dialog-actions">
          <button class="secondary-btn" :disabled="roleDialog.submitting" @click="closeRoleDialog">取消</button>
          <button class="primary-btn" :disabled="roleDialog.submitting || roleDialog.loading" @click="submitRoleDialog">
            {{ roleDialog.submitting ? "保存中..." : "保存角色" }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="platformDialog.visible" class="dialog-mask" @click.self="closePlatformDialog">
      <div class="dialog dialog-narrow">
        <h3>平台授权</h3>
        <p class="dialog-tip">用户：{{ platformDialog.user?.username || "-" }}</p>
        <p v-if="platformDialog.loading" class="dialog-tip">正在加载平台数据...</p>
        <div v-else class="checkbox-grid">
          <label v-for="platform in platformDialog.platforms" :key="platform.id" class="checkbox-item">
            <input
              type="checkbox"
              :checked="platformDialog.selectedPlatformIds.includes(platform.id)"
              @change="
                platformDialog.selectedPlatformIds = toggleNumberInList(
                  platformDialog.selectedPlatformIds,
                  platform.id,
                  ($event.target as HTMLInputElement).checked
                )
              "
            />
            <span>{{ platform.platformName }}（{{ platform.platformCode || platform.id }}）</span>
          </label>
          <p v-if="platformDialog.platforms.length === 0" class="empty-tip">暂无平台可授权</p>
        </div>
        <div class="dialog-actions">
          <button class="secondary-btn" :disabled="platformDialog.submitting" @click="closePlatformDialog">取消</button>
          <button
            class="primary-btn"
            :disabled="platformDialog.submitting || platformDialog.loading"
            @click="submitPlatformDialog"
          >
            {{ platformDialog.submitting ? "保存中..." : "保存平台授权" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import {
  addUserApi,
  deleteUserApi,
  getUserInfoApi,
  getUserRolesApi,
  resetUserPasswordApi,
  searchUserApi,
  updateUserApi,
  updateUserBindRoleApi,
  updateUserPasswordApi,
  type UserSearchRequest,
  type UserSysUser
} from "../../../api/portal/user";
import { getRoleByIdApi, searchRoleApi, type RoleSysRole } from "../../../api/portal/role";
import {
  bindUserPlatformApi,
  getPlatformUsersApi,
  searchPlatformApi,
  unbindUserPlatformApi,
  type PlatformSysPlatform
} from "../../../api/portal/platform";
import UserSearch from "./modules/user-search.vue";
import UserTable from "./modules/user-table.vue";
import { createDefaultSearchForm, toUserSearchParams } from "./modules/table-config";

const loading = ref(false);
const users = ref<UserSysUser[]>([]);
const total = ref(0);
const currentUsername = ref("");
const errorMessage = ref("");
const successMessage = ref("");
const resetLoadingMap = ref<Record<number, boolean>>({});
const deleteLoadingMap = ref<Record<number, boolean>>({});
const roleLoadingMap = ref<Record<number, boolean>>({});
const platformLoadingMap = ref<Record<number, boolean>>({});
let successTimer = 0;

const pagination = reactive({
  page: 1,
  pageSize: 20
});

const searchForm = ref(createDefaultSearchForm());
const createDialog = reactive({
  visible: false,
  submitting: false,
  form: {
    username: "",
    nickname: "",
    email: "",
    phone: "",
    workNumber: "",
    deptId: 0,
    password: "",
    confirmPassword: ""
  }
});

const editDialog = reactive({
  visible: false,
  submitting: false,
  form: {
    id: 0,
    username: "",
    nickname: "",
    email: "",
    phone: "",
    workNumber: "",
    deptId: 1,
    status: 1,
    isNeedResetPwd: 0
  }
});

const roleDialog = reactive({
  visible: false,
  loading: false,
  submitting: false,
  user: null as UserSysUser | null,
  roleOptions: [] as RoleSysRole[],
  selectedRoleIds: [] as number[]
});

const platformDialog = reactive({
  visible: false,
  loading: false,
  submitting: false,
  user: null as UserSysUser | null,
  platforms: [] as PlatformSysPlatform[],
  originalPlatformIds: [] as number[],
  selectedPlatformIds: [] as number[]
});

const MAX_QUERY_PAGE_SIZE = 200;
const PASSWORD_COMPLEXITY_REGEXP = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/;

function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function buildDefaultPasswordCandidates(): string[] {
  const now = new Date();
  const offsets = [0, -1, 1];
  const result: string[] = [];

  for (const offset of offsets) {
    const candidateDate = new Date(now);
    candidateDate.setDate(now.getDate() + offset);
    const candidate = `Ikubeops@${formatDateYYYYMMDD(candidateDate)}`;
    if (!result.includes(candidate)) {
      result.push(candidate);
    }
  }

  return result;
}

function validateCustomPassword(password: string, confirmPassword: string): string {
  if (!password && !confirmPassword) {
    return "";
  }

  if (!password) {
    return "请输入初始密码";
  }
  if (!confirmPassword) {
    return "请输入确认密码";
  }
  if (password.length <= 6) {
    return "初始密码长度必须大于6位";
  }
  if (!PASSWORD_COMPLEXITY_REGEXP.test(password)) {
    return "初始密码必须包含大写字母、小写字母、数字和特殊字符";
  }
  if (password !== confirmPassword) {
    return "初始密码与确认密码不一致";
  }

  return "";
}

function validateBaseUserFields(data: {
  nickname: string;
  email: string;
  phone: string;
  workNumber: string;
}): string {
  if (!data.nickname) {
    return "昵称不能为空";
  }
  if (!data.email) {
    return "邮箱不能为空";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return "邮箱格式不正确";
  }
  if (!data.phone) {
    return "手机号不能为空";
  }
  if (data.phone.length < 10) {
    return "手机号长度至少 10 位";
  }
  if (!data.workNumber) {
    return "工号不能为空";
  }
  return "";
}

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

function uniquePositiveNumbers(list: number[]): number[] {
  return Array.from(new Set(list.filter((item) => Number.isFinite(item) && item > 0)));
}

function toggleNumberInList(source: number[], value: number, checked: boolean): number[] {
  const target = uniquePositiveNumbers(source);
  if (checked) {
    if (!target.includes(value)) {
      target.push(value);
    }
    return target;
  }
  return target.filter((item) => item !== value);
}

function sameNumberSet(left: number[], right: number[]): boolean {
  const l = uniquePositiveNumbers(left).sort((a, b) => a - b);
  const r = uniquePositiveNumbers(right).sort((a, b) => a - b);
  if (l.length !== r.length) {
    return false;
  }
  return l.every((item, index) => item === r[index]);
}

function mergeRoleOptions(base: RoleSysRole[], extras: RoleSysRole[]): RoleSysRole[] {
  const map = new Map<number, RoleSysRole>();
  [...base, ...extras].forEach((item) => {
    if (!item || !Number.isFinite(item.id) || item.id <= 0) {
      return;
    }
    map.set(item.id, item);
  });
  return Array.from(map.values()).sort((a, b) => a.id - b.id);
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
    if (currentUsername.value && currentUsername.value !== "super_admin") {
      params.createBy = currentUsername.value;
    }

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

async function handleDeleteUser(user: UserSysUser) {
  if (user.username === currentUsername.value) {
    errorMessage.value = "当前登录账号不允许删除";
    return;
  }

  if (!confirm(`确定删除用户 "${user.username}" 吗？该操作不可恢复。`)) {
    return;
  }

  deleteLoadingMap.value[user.id] = true;
  errorMessage.value = "";

  try {
    await deleteUserApi(user.id);
    showSuccess(`已删除用户 ${user.username}`);

    if (users.value.length === 1 && pagination.page > 1) {
      pagination.page -= 1;
    }

    await loadData();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "删除用户失败";
  } finally {
    deleteLoadingMap.value[user.id] = false;
  }
}

function refreshData() {
  void loadData();
}

function openCreateDialog(): void {
  createDialog.visible = true;
  createDialog.form.username = "";
  createDialog.form.nickname = "";
  createDialog.form.email = "";
  createDialog.form.phone = "";
  createDialog.form.workNumber = "";
  createDialog.form.deptId = 0;
  createDialog.form.password = "";
  createDialog.form.confirmPassword = "";
}

function closeCreateDialog(): void {
  if (createDialog.submitting) {
    return;
  }
  createDialog.visible = false;
}

function openEditDialog(user: UserSysUser): void {
  editDialog.visible = true;
  editDialog.form.id = user.id;
  editDialog.form.username = user.username;
  editDialog.form.nickname = user.nickname;
  editDialog.form.email = user.email;
  editDialog.form.phone = user.phone;
  editDialog.form.workNumber = user.workNumber;
  editDialog.form.deptId = user.deptId > 0 ? user.deptId : 1;
  editDialog.form.status = user.status;
  editDialog.form.isNeedResetPwd = user.isNeedResetPwd;
}

function closeEditDialog(): void {
  if (editDialog.submitting) {
    return;
  }
  editDialog.visible = false;
}

async function submitEditDialog(): Promise<void> {
  const nickname = editDialog.form.nickname.trim();
  const email = editDialog.form.email.trim();
  const phone = editDialog.form.phone.trim();
  const workNumber = editDialog.form.workNumber.trim();
  const validateMessage = validateBaseUserFields({ nickname, email, phone, workNumber });
  if (validateMessage) {
    errorMessage.value = validateMessage;
    return;
  }
  const deptId = Number(editDialog.form.deptId);
  if (!Number.isFinite(deptId) || deptId <= 0) {
    errorMessage.value = "部门ID必须大于0";
    return;
  }

  editDialog.submitting = true;
  errorMessage.value = "";

  try {
    await updateUserApi({
      id: editDialog.form.id,
      nickname,
      email,
      phone,
      workNumber,
      deptId,
      status: Number(editDialog.form.status) === 0 ? 0 : 1,
      isNeedResetPwd: Number(editDialog.form.isNeedResetPwd) === 1 ? 1 : 0
    });
    editDialog.visible = false;
    showSuccess("用户更新成功");
    await loadData();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "编辑用户失败";
  } finally {
    editDialog.submitting = false;
  }
}

async function submitCreateDialog(): Promise<void> {
  const username = createDialog.form.username.trim();
  const nickname = createDialog.form.nickname.trim();
  const email = createDialog.form.email.trim();
  const phone = createDialog.form.phone.trim();
  const workNumber = createDialog.form.workNumber.trim();
  const password = createDialog.form.password.trim();
  const confirmPassword = createDialog.form.confirmPassword.trim();

  if (!username) {
    errorMessage.value = "用户名不能为空";
    return;
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_]{1,63}$/.test(username)) {
    errorMessage.value = "用户名格式不正确（字母开头，可含数字下划线）";
    return;
  }
  if (username.length < 4) {
    errorMessage.value = "用户名长度至少 4 位";
    return;
  }
  const validateMessage = validateBaseUserFields({ nickname, email, phone, workNumber });
  if (validateMessage) {
    errorMessage.value = validateMessage;
    return;
  }
  const customPasswordValidationMessage = validateCustomPassword(password, confirmPassword);
  if (customPasswordValidationMessage) {
    errorMessage.value = customPasswordValidationMessage;
    return;
  }

  createDialog.submitting = true;
  errorMessage.value = "";

  try {
    await addUserApi({
      username,
      nickname,
      email,
      phone,
      workNumber,
      deptId:
        Number.isFinite(createDialog.form.deptId) && Number(createDialog.form.deptId) > 0
          ? Number(createDialog.form.deptId)
          : undefined
    });

    if (password) {
      const oldPasswordCandidates = buildDefaultPasswordCandidates();
      let passwordSetSuccess = false;
      let lastPasswordSetError: unknown;

      for (const oldPassword of oldPasswordCandidates) {
        try {
          await updateUserPasswordApi(
            {
              username,
              oldPassword,
              newPassword: password,
              confirmPassword
            },
            { auth: false }
          );
          passwordSetSuccess = true;
          break;
        } catch (error) {
          lastPasswordSetError = error;
        }
      }

      if (!passwordSetSuccess) {
        const fallbackDefaultPassword = oldPasswordCandidates[0];
        const reason =
          lastPasswordSetError instanceof Error ? lastPasswordSetError.message : "未知错误";
        errorMessage.value = `用户已创建，但设置初始密码失败（${reason}）。请先使用默认密码 ${fallbackDefaultPassword} 登录后再修改。`;
        createDialog.visible = false;
        pagination.page = 1;
        showSuccess("用户新增成功");
        await loadData();
        return;
      }
    }

    createDialog.visible = false;
    pagination.page = 1;
    showSuccess(password ? "用户新增成功，初始密码已设置" : "用户新增成功");
    await loadData();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "新增用户失败";
  } finally {
    createDialog.submitting = false;
  }
}

async function openRoleDialog(user: UserSysUser): Promise<void> {
  roleLoadingMap.value[user.id] = true;
  errorMessage.value = "";
  roleDialog.visible = true;
  roleDialog.loading = true;
  roleDialog.user = user;
  roleDialog.roleOptions = [];
  roleDialog.selectedRoleIds = [];

  try {
    const isSuperAdmin = currentUsername.value === "super_admin";
    const searchRequest =
      isSuperAdmin
        ? { page: 1, pageSize: MAX_QUERY_PAGE_SIZE }
        : {
            page: 1,
            pageSize: MAX_QUERY_PAGE_SIZE,
            createBy: currentUsername.value || "__no_creator__"
          };

    const [roleResponse, userRoles] = await Promise.all([searchRoleApi(searchRequest), getUserRolesApi(user.id)]);
    const selectedRoleIds = uniquePositiveNumbers(userRoles.roleIds || []);
    const ownCreatedRoles = roleResponse.items || [];
    const assignedRolesInList = ownCreatedRoles.filter((item) => selectedRoleIds.includes(item.id));

    const mergedRoleOptions = mergeRoleOptions(ownCreatedRoles, assignedRolesInList);
    const missingAssignedIds = selectedRoleIds.filter((id) => !mergedRoleOptions.some((item) => item.id === id));

    if (missingAssignedIds.length > 0) {
      const missingRoleResponses = await Promise.allSettled(missingAssignedIds.map((id) => getRoleByIdApi(id)));
      const missingRoles = missingRoleResponses
        .filter((result): result is PromiseFulfilledResult<RoleSysRole> => result.status === "fulfilled")
        .map((result) => result.value);
      roleDialog.roleOptions = mergeRoleOptions(mergedRoleOptions, missingRoles);
    } else {
      roleDialog.roleOptions = mergedRoleOptions;
    }

    roleDialog.selectedRoleIds = selectedRoleIds;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "加载角色信息失败";
  } finally {
    roleDialog.loading = false;
    roleLoadingMap.value[user.id] = false;
  }
}

function closeRoleDialog(): void {
  if (roleDialog.submitting) {
    return;
  }
  roleDialog.visible = false;
}

async function submitRoleDialog(): Promise<void> {
  if (!roleDialog.user) {
    return;
  }

  roleDialog.submitting = true;
  errorMessage.value = "";
  try {
    const expectedRoleIds = uniquePositiveNumbers(roleDialog.selectedRoleIds);
    await updateUserBindRoleApi({
      id: roleDialog.user.id,
      roleIds: expectedRoleIds
    });

    const latestRoles = await getUserRolesApi(roleDialog.user.id);
    const actualRoleIds = uniquePositiveNumbers(latestRoles.roleIds || []);
    if (!sameNumberSet(expectedRoleIds, actualRoleIds)) {
      throw new Error("角色保存后校验失败，请刷新页面后重试");
    }

    roleDialog.visible = false;
    showSuccess("角色分配成功（已校验）");
    await loadData();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "分配角色失败";
  } finally {
    roleDialog.submitting = false;
  }
}

async function isUserBoundToPlatform(userId: number, platformId: number): Promise<boolean> {
  let page = 1;
  const pageSize = MAX_QUERY_PAGE_SIZE;
  let seen = 0;
  let total = 0;

  while (page <= 50) {
    const response = await getPlatformUsersApi({
      platformId,
      page,
      pageSize
    });
    const ids = response.userIds;
    total = response.total;
    seen += ids.length;
    if (ids.includes(userId)) {
      return true;
    }
    if (ids.length === 0 || seen >= total) {
      return false;
    }
    page += 1;
  }

  return false;
}

async function openPlatformDialog(user: UserSysUser): Promise<void> {
  platformLoadingMap.value[user.id] = true;
  errorMessage.value = "";
  platformDialog.visible = true;
  platformDialog.loading = true;
  platformDialog.user = user;
  platformDialog.platforms = [];
  platformDialog.selectedPlatformIds = [];
  platformDialog.originalPlatformIds = [];

  try {
    const platformResponse = await searchPlatformApi({
      page: 1,
      pageSize: MAX_QUERY_PAGE_SIZE,
      orderStr: "sort",
      isAsc: true
    });
    const platforms = platformResponse.items;
    platformDialog.platforms = platforms;
    const checks = await Promise.all(platforms.map((item) => isUserBoundToPlatform(user.id, item.id)));
    const boundIds = platforms.filter((_, index) => checks[index]).map((item) => item.id);
    platformDialog.originalPlatformIds = boundIds;
    platformDialog.selectedPlatformIds = [...boundIds];
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "加载平台授权信息失败";
  } finally {
    platformDialog.loading = false;
    platformLoadingMap.value[user.id] = false;
  }
}

function closePlatformDialog(): void {
  if (platformDialog.submitting) {
    return;
  }
  platformDialog.visible = false;
}

async function submitPlatformDialog(): Promise<void> {
  if (!platformDialog.user) {
    return;
  }

  const userId = platformDialog.user.id;
  const selected = uniquePositiveNumbers(platformDialog.selectedPlatformIds);
  const original = uniquePositiveNumbers(platformDialog.originalPlatformIds);

  if (sameNumberSet(selected, original)) {
    platformDialog.visible = false;
    return;
  }

  platformDialog.submitting = true;
  errorMessage.value = "";
  try {
    if (selected.length === 0) {
      if (original.length > 0) {
        await unbindUserPlatformApi({
          userId,
          platformIds: original
        });
      }
    } else {
      await bindUserPlatformApi({
        userId,
        platformIds: selected
      });
    }

    platformDialog.visible = false;
    showSuccess("平台授权保存成功");
    await loadData();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "保存平台授权失败";
  } finally {
    platformDialog.submitting = false;
  }
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
  color: #0f172a;
  border-color: #cbd5e1;
}

.primary-btn:disabled,
.secondary-btn:disabled {
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

.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  display: grid;
  place-items: center;
  z-index: 80;
}

.dialog {
  width: min(680px, calc(100vw - 32px));
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 30px 80px -45px rgba(15, 23, 42, 0.8);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dialog-narrow {
  width: min(520px, calc(100vw - 32px));
}

.dialog h3 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
}

.dialog-tip {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}

.dialog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: 10px 12px;
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
.dialog-field select,
.dialog-field textarea {
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0 10px;
  font-size: 13px;
}

.dialog-field textarea {
  height: auto;
  min-height: 80px;
  padding: 8px 10px;
}

.dialog-field input:disabled {
  background: #f8fafc;
  color: #64748b;
}

.checkbox-grid {
  max-height: 320px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px;
  display: grid;
  gap: 8px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1e293b;
  font-size: 13px;
}

.empty-tip {
  margin: 0;
  color: #64748b;
  font-size: 13px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 760px) {
  .dialog-grid {
    grid-template-columns: 1fr;
  }
}
</style>
