<template>
  <div class="project-page">
    <header class="page-head">
      <div>
        <h2>项目管理</h2>
        <p>支持项目新增、编辑、删除、成员分配和项目同步。</p>
      </div>
      <div class="head-actions">
        <button class="secondary-btn" :disabled="loading" @click="refreshData">
          {{ loading ? "刷新中..." : "刷新数据" }}
        </button>
        <button class="secondary-btn" :disabled="syncAllLoading" @click="syncAllProjects">
          {{ syncAllLoading ? "同步中..." : "同步全部项目" }}
        </button>
        <button class="primary-btn" :disabled="loading" @click="openCreate">新建项目</button>
      </div>
    </header>

    <section class="search-card">
      <form class="search-grid" @submit.prevent="search">
        <label class="field">
          <span>项目名称</span>
          <input v-model.trim="filters.name" :disabled="loading" placeholder="按项目名搜索" />
        </label>
        <label class="field">
          <span>UUID</span>
          <input v-model.trim="filters.uuid" :disabled="loading" placeholder="按 UUID 搜索" />
        </label>
        <div class="search-actions">
          <button type="submit" :disabled="loading">搜索</button>
          <button type="button" class="secondary" :disabled="loading" @click="reset">重置</button>
        </div>
      </form>
    </section>

    <p v-if="errorMsg" class="alert error">{{ errorMsg }}</p>
    <p v-if="successMsg" class="alert success">{{ successMsg }}</p>

    <section class="table-card">
      <div class="table-head">
        <h3>项目列表</h3>
        <span>共 {{ total }} 条</span>
      </div>

      <div class="table-wrap">
        <table class="project-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>项目名称</th>
              <th>UUID</th>
              <th>系统项目</th>
              <th>管理员数</th>
              <th>资源池数</th>
              <th>描述</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="9" class="empty">正在加载项目数据...</td>
            </tr>
            <tr v-else-if="projects.length === 0">
              <td colspan="9" class="empty">暂无项目数据</td>
            </tr>
            <tr v-for="item in projects" v-else :key="item.id">
              <td>{{ item.id }}</td>
              <td>{{ item.name || "-" }}</td>
              <td>{{ item.uuid || "-" }}</td>
              <td>
                <span class="tag" :class="item.isSystem === 1 ? 'system' : 'normal'">
                  {{ item.isSystem === 1 ? "系统" : "普通" }}
                </span>
              </td>
              <td>
                <button class="count-btn" :disabled="loading" @click="openMemberViewDialog(item)">
                  {{ item.adminCount }}
                </button>
              </td>
              <td>{{ item.resourceCount }}</td>
              <td class="desc-cell">{{ item.description || "-" }}</td>
              <td>{{ formatTimestamp(item.updatedAt || item.createdAt) }}</td>
              <td class="row-actions">
                <button class="action-btn secondary" :disabled="loading" @click="openEdit(item)">编辑</button>
                <button class="action-btn" :disabled="loading" @click="openMemberDialog(item)">成员</button>
                <button class="action-btn secondary" :disabled="syncLoadingMap[item.id]" @click="syncProject(item)">
                  {{ syncLoadingMap[item.id] ? "同步中..." : "同步" }}
                </button>
                <button class="action-btn danger" :disabled="deletingMap[item.id]" @click="remove(item)">
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
          <button :disabled="pagination.page <= 1 || loading" @click="prevPage">上一页</button>
          <button :disabled="pagination.page >= pageCount || loading" @click="nextPage">下一页</button>
        </div>
      </footer>
    </section>

    <div v-if="dialog.visible" class="dialog-mask" @click.self="closeDialog">
      <div class="dialog">
        <h3>{{ dialog.mode === "create" ? "新建项目" : "编辑项目" }}</h3>
        <label class="dialog-field">
          <span>项目名称</span>
          <input v-model.trim="dialog.form.name" maxlength="100" />
        </label>
        <label class="dialog-field">
          <span>项目描述</span>
          <textarea v-model.trim="dialog.form.description" maxlength="500" rows="4" />
        </label>
        <div class="dialog-actions">
          <button class="secondary-btn" :disabled="dialog.submitting" @click="closeDialog">取消</button>
          <button class="primary-btn" :disabled="dialog.submitting" @click="submitDialog">
            {{ dialog.submitting ? "提交中..." : "确定" }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="memberDialog.visible" class="dialog-mask" @click.self="closeMemberDialog">
      <div class="dialog large-dialog">
        <h3>分配项目成员</h3>
        <p class="tip">项目：{{ memberDialog.projectName || "-" }}</p>

        <div class="member-search">
          <input
            v-model.trim="memberDialog.keyword"
            :disabled="memberDialog.loading || memberDialog.submitting"
            placeholder="按用户名/昵称/邮箱搜索用户"
            @keyup.enter="searchMembers"
          />
          <button
            class="secondary-btn"
            :disabled="memberDialog.loading || memberDialog.submitting"
            @click="searchMembers"
          >
            搜索
          </button>
          <button
            class="secondary-btn"
            :disabled="memberDialog.loading || memberDialog.submitting"
            @click="resetMemberSearch"
          >
            重置
          </button>
        </div>

        <div class="member-layout">
          <section class="member-panel">
            <header class="panel-head">
              <strong>可选用户</strong>
              <span>共 {{ memberDialog.total }} 条</span>
            </header>
            <label class="check-line all-line" v-if="memberDialog.userOptions.length > 0">
              <input
                type="checkbox"
                :checked="currentPageAllSelected"
                :disabled="memberDialog.loading || memberDialog.submitting"
                @change="toggleCurrentPageMembers(($event.target as HTMLInputElement).checked)"
              />
              <span>选择当前页全部用户</span>
            </label>
            <div class="check-list">
              <p v-if="memberDialog.loading" class="empty">正在加载用户...</p>
              <p v-else-if="memberDialog.userOptions.length === 0" class="empty">暂无用户数据</p>
              <label v-for="user in memberDialog.userOptions" v-else :key="user.id" class="check-line">
                <input
                  type="checkbox"
                  :checked="memberDialog.selectedUserIds.includes(user.id)"
                  :disabled="memberDialog.submitting"
                  @change="toggleMember(user, ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ user.nickname || user.username }}（{{ user.username }}）</span>
              </label>
            </div>
            <footer class="panel-footer">
              <span>第 {{ memberDialog.page }} / {{ memberPageCount }} 页</span>
              <div class="pager">
                <button :disabled="memberDialog.page <= 1 || memberDialog.loading" @click="changeMemberPage(memberDialog.page - 1)">
                  上一页
                </button>
                <button
                  :disabled="memberDialog.page >= memberPageCount || memberDialog.loading"
                  @click="changeMemberPage(memberDialog.page + 1)"
                >
                  下一页
                </button>
              </div>
            </footer>
          </section>

          <section class="member-panel">
            <header class="panel-head">
              <strong>已选成员</strong>
              <span>{{ memberDialog.selectedUserIds.length }} 人</span>
            </header>
            <div class="check-list">
              <p v-if="memberDialog.selectedUserIds.length === 0" class="empty">暂无已选成员</p>
              <label v-for="user in selectedMemberUsers" v-else :key="`selected-${user.id}`" class="check-line">
                <input
                  type="checkbox"
                  checked
                  :disabled="memberDialog.submitting"
                  @change="toggleMember(user, ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ user.nickname || user.username }}（{{ user.username }}）</span>
              </label>
            </div>
          </section>
        </div>

        <div class="dialog-actions">
          <button class="secondary-btn" :disabled="memberDialog.submitting" @click="closeMemberDialog">取消</button>
          <button class="primary-btn" :disabled="memberDialog.submitting" @click="submitMemberDialog">
            {{ memberDialog.submitting ? "保存中..." : "保存成员" }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="memberViewDialog.visible" class="dialog-mask" @click.self="closeMemberViewDialog">
      <div class="dialog">
        <h3>项目成员</h3>
        <p class="tip">项目：{{ memberViewDialog.projectName || "-" }}</p>
        <div class="check-list member-view-list">
          <p v-if="memberViewDialog.loading" class="empty">正在加载成员...</p>
          <p v-else-if="memberViewDialog.members.length === 0" class="empty">当前项目暂无已分配成员</p>
          <label v-for="user in memberViewDialog.members" v-else :key="`view-${user.id}`" class="check-line">
            <span>{{ user.nickname || user.username }}（{{ user.username }}）</span>
          </label>
        </div>
        <div class="dialog-actions">
          <button class="primary-btn" :disabled="memberViewDialog.loading" @click="closeMemberViewDialog">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import {
  addProjectAdminApi,
  addProjectApi,
  deleteProjectApi,
  getProjectAdminsApi,
  searchProjectApi,
  syncAllProjectsApi,
  syncProjectApi,
  type Project,
  updateProjectApi
} from "../../../api/manager/project";
import { getUserByIdApi, getUserInfoApi, searchUserApi, type UserSysUser } from "../../../api/portal/user";

const loading = ref(false);
const errorMsg = ref("");
const successMsg = ref("");
const projects = ref<Project[]>([]);
const total = ref(0);
const deletingMap = ref<Record<number, boolean>>({});
const syncLoadingMap = ref<Record<number, boolean>>({});
const syncAllLoading = ref(false);
let successTimer = 0;
const currentUsername = ref("");

const pagination = reactive({
  page: 1,
  pageSize: 10
});

const filters = reactive({
  name: "",
  uuid: ""
});

const dialog = reactive({
  visible: false,
  mode: "create" as "create" | "edit",
  targetId: 0,
  submitting: false,
  form: {
    name: "",
    description: ""
  }
});

const memberDialog = reactive({
  visible: false,
  loading: false,
  submitting: false,
  projectId: 0,
  projectName: "",
  keyword: "",
  page: 1,
  pageSize: 12,
  total: 0,
  userOptions: [] as UserSysUser[],
  selectedUserIds: [] as number[],
  selectedUserMap: {} as Record<number, UserSysUser>
});

const memberViewDialog = reactive({
  visible: false,
  loading: false,
  projectId: 0,
  projectName: "",
  members: [] as UserSysUser[]
});

const pageCount = computed(() => {
  if (total.value <= 0 || pagination.pageSize <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(total.value / pagination.pageSize));
});

const memberPageCount = computed(() => {
  if (memberDialog.total <= 0 || memberDialog.pageSize <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(memberDialog.total / memberDialog.pageSize));
});

const currentPageAllSelected = computed(() => {
  if (memberDialog.userOptions.length === 0) {
    return false;
  }
  return memberDialog.userOptions.every((item) => memberDialog.selectedUserIds.includes(item.id));
});

const selectedMemberUsers = computed<UserSysUser[]>(() => {
  return memberDialog.selectedUserIds.map((id) => {
    const user = memberDialog.selectedUserMap[id];
    if (user) {
      return user;
    }
    return {
      id,
      username: `user-${id}`,
      nickname: "",
      avatar: "",
      email: "",
      phone: "",
      workNumber: "",
      deptId: 0,
      status: 1,
      isNeedResetPwd: 0,
      createdBy: "",
      updatedBy: "",
      createdAt: 0,
      updatedAt: 0,
      dingtalkId: "",
      wechatId: "",
      feishuId: ""
    };
  });
});

function formatTimestamp(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "-";
  }
  return new Date(timestamp * 1000).toLocaleString("zh-CN", { hour12: false });
}

function showSuccess(message: string): void {
  successMsg.value = message;
  window.clearTimeout(successTimer);
  successTimer = window.setTimeout(() => {
    successMsg.value = "";
  }, 2200);
}

function uniquePositiveNumbers(values: number[]): number[] {
  return Array.from(new Set(values.filter((item) => Number.isInteger(item) && item > 0)));
}

function readUsernameFromStorage(): string {
  const raw = localStorage.getItem("userInfo");
  if (!raw) {
    return "";
  }

  try {
    const parsed = JSON.parse(raw) as { username?: string };
    return (parsed.username || "").trim();
  } catch {
    return "";
  }
}

async function loadCurrentUsername(): Promise<void> {
  try {
    const user = await getUserInfoApi();
    currentUsername.value = (user.username || "").trim();
  } catch {
    currentUsername.value = readUsernameFromStorage();
  }
}

async function loadData() {
  loading.value = true;
  errorMsg.value = "";

  try {
    const resp = await searchProjectApi({
      page: pagination.page,
      pageSize: pagination.pageSize,
      name: filters.name.trim() || undefined,
      uuid: filters.uuid.trim() || undefined
    });
    projects.value = resp.items ?? [];
    total.value = resp.total ?? 0;
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "加载项目失败";
  } finally {
    loading.value = false;
  }
}

function refreshData() {
  void loadData();
}

function search() {
  pagination.page = 1;
  void loadData();
}

function reset() {
  filters.name = "";
  filters.uuid = "";
  pagination.page = 1;
  void loadData();
}

function openCreate() {
  dialog.visible = true;
  dialog.mode = "create";
  dialog.targetId = 0;
  dialog.form.name = "";
  dialog.form.description = "";
}

function openEdit(item: Project) {
  if (item.isSystem === 1) {
    errorMsg.value = "系统项目不允许编辑";
    return;
  }
  dialog.visible = true;
  dialog.mode = "edit";
  dialog.targetId = item.id;
  dialog.form.name = item.name;
  dialog.form.description = item.description || "";
}

function closeDialog() {
  if (dialog.submitting) {
    return;
  }
  dialog.visible = false;
}

async function submitDialog() {
  const name = dialog.form.name.trim();
  const description = dialog.form.description.trim();

  if (!name) {
    errorMsg.value = "项目名称不能为空";
    return;
  }

  dialog.submitting = true;
  errorMsg.value = "";
  try {
    if (dialog.mode === "create") {
      await addProjectApi({
        name,
        description: description || undefined,
        isSystem: 0
      });
      showSuccess("项目创建成功");
    } else {
      await updateProjectApi(dialog.targetId, {
        name,
        description: description || undefined
      });
      showSuccess("项目更新成功");
    }
    dialog.visible = false;
    await loadData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "保存项目失败";
  } finally {
    dialog.submitting = false;
  }
}

async function remove(item: Project) {
  if (item.isSystem === 1) {
    errorMsg.value = "系统项目不允许删除";
    return;
  }
  if (!confirm(`确定删除项目 "${item.name}" 吗？删除后资源池和工作空间关联将受影响。`)) {
    return;
  }

  deletingMap.value[item.id] = true;
  errorMsg.value = "";
  try {
    await deleteProjectApi(item.id);
    if (projects.value.length === 1 && pagination.page > 1) {
      pagination.page -= 1;
    }
    showSuccess("项目删除成功");
    await loadData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "删除项目失败";
  } finally {
    deletingMap.value[item.id] = false;
  }
}

async function syncProject(item: Project) {
  syncLoadingMap.value[item.id] = true;
  errorMsg.value = "";
  try {
    await syncProjectApi(item.id);
    showSuccess(`项目 ${item.name} 同步已触发`);
    await loadData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "同步项目失败";
  } finally {
    syncLoadingMap.value[item.id] = false;
  }
}

async function syncAllProjects() {
  syncAllLoading.value = true;
  errorMsg.value = "";
  try {
    await syncAllProjectsApi();
    showSuccess("全部项目同步已触发");
    await loadData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "同步全部项目失败";
  } finally {
    syncAllLoading.value = false;
  }
}

function prevPage() {
  if (pagination.page <= 1) {
    return;
  }
  pagination.page -= 1;
  void loadData();
}

function nextPage() {
  if (pagination.page >= pageCount.value) {
    return;
  }
  pagination.page += 1;
  void loadData();
}

function resetMemberDialogState(): void {
  memberDialog.projectId = 0;
  memberDialog.projectName = "";
  memberDialog.keyword = "";
  memberDialog.page = 1;
  memberDialog.pageSize = 12;
  memberDialog.total = 0;
  memberDialog.userOptions = [];
  memberDialog.selectedUserIds = [];
  memberDialog.selectedUserMap = {};
}

async function loadCurrentProjectAdmins(projectId: number): Promise<void> {
  const admins = await getProjectAdminsApi(projectId);
  const adminUserIds = uniquePositiveNumbers(admins.map((item) => item.userId));
  memberDialog.selectedUserIds = adminUserIds;

  if (adminUserIds.length === 0) {
    return;
  }

  const users = await Promise.all(
    adminUserIds.map(async (userId) => {
      try {
        return await getUserByIdApi(userId);
      } catch {
        return null;
      }
    })
  );

  users.forEach((user) => {
    if (user && user.id > 0) {
      memberDialog.selectedUserMap[user.id] = user;
    }
  });
}

async function loadMemberUsers(): Promise<void> {
  const keyword = memberDialog.keyword.trim();
  const owner = currentUsername.value || readUsernameFromStorage();
  const isSuperAdmin = owner.toLowerCase() === "super_admin";
  const response = await searchUserApi({
    page: memberDialog.page,
    pageSize: memberDialog.pageSize,
    username: keyword || undefined,
    nickname: keyword || undefined,
    email: keyword || undefined,
    createBy: isSuperAdmin ? undefined : owner || undefined
  });

  const normalizedKeyword = keyword.toLowerCase();
  const matchKeyword = (user: UserSysUser): boolean => {
    if (!normalizedKeyword) {
      return true;
    }
    return [user.username, user.nickname, user.email].some((field) => field.toLowerCase().includes(normalizedKeyword));
  };

  // 规则：可选用户 = 自己创建的用户 + 当前项目已分配成员
  const optionsMap = new Map<number, UserSysUser>();
  response.items.forEach((user) => {
    optionsMap.set(user.id, user);
  });
  Object.values(memberDialog.selectedUserMap).forEach((user) => {
    if (user && user.id > 0 && matchKeyword(user)) {
      optionsMap.set(user.id, user);
    }
  });

  const options = Array.from(optionsMap.values());

  memberDialog.userOptions = options;
  memberDialog.total = options.length > response.total ? options.length : response.total;
  memberDialog.userOptions.forEach((item) => {
    memberDialog.selectedUserMap[item.id] = item;
  });
}

async function openMemberDialog(item: Project): Promise<void> {
  memberDialog.visible = true;
  memberDialog.loading = true;
  memberDialog.projectId = item.id;
  memberDialog.projectName = item.name;
  memberDialog.keyword = "";
  memberDialog.page = 1;
  memberDialog.total = 0;
  memberDialog.userOptions = [];
  memberDialog.selectedUserIds = [];
  memberDialog.selectedUserMap = {};
  errorMsg.value = "";

  try {
    await loadCurrentProjectAdmins(item.id);
    await loadMemberUsers();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "加载项目成员失败";
  } finally {
    memberDialog.loading = false;
  }
}

function closeMemberDialog(): void {
  if (memberDialog.submitting) {
    return;
  }
  memberDialog.visible = false;
  resetMemberDialogState();
}

async function openMemberViewDialog(item: Project): Promise<void> {
  memberViewDialog.visible = true;
  memberViewDialog.loading = true;
  memberViewDialog.projectId = item.id;
  memberViewDialog.projectName = item.name;
  memberViewDialog.members = [];
  errorMsg.value = "";

  try {
    const admins = await getProjectAdminsApi(item.id);
    const adminUserIds = uniquePositiveNumbers(admins.map((admin) => admin.userId));
    if (adminUserIds.length === 0) {
      memberViewDialog.members = [];
      return;
    }

    const users = await Promise.all(
      adminUserIds.map(async (userId) => {
        try {
          return await getUserByIdApi(userId);
        } catch {
          return null;
        }
      })
    );

    memberViewDialog.members = users.filter((user): user is UserSysUser => Boolean(user && user.id > 0));
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "加载项目成员失败";
  } finally {
    memberViewDialog.loading = false;
  }
}

function closeMemberViewDialog(): void {
  if (memberViewDialog.loading) {
    return;
  }
  memberViewDialog.visible = false;
  memberViewDialog.projectId = 0;
  memberViewDialog.projectName = "";
  memberViewDialog.members = [];
}

function changeMemberPage(page: number): void {
  if (page < 1 || page === memberDialog.page || page > memberPageCount.value) {
    return;
  }
  memberDialog.page = page;
  memberDialog.loading = true;
  errorMsg.value = "";
  void loadMemberUsers()
    .catch((error: unknown) => {
      errorMsg.value = error instanceof Error ? error.message : "加载用户列表失败";
    })
    .finally(() => {
      memberDialog.loading = false;
    });
}

function toggleMember(user: UserSysUser, checked: boolean): void {
  const next = uniquePositiveNumbers(memberDialog.selectedUserIds);
  if (checked) {
    if (!next.includes(user.id)) {
      next.push(user.id);
    }
    memberDialog.selectedUserMap[user.id] = user;
    memberDialog.selectedUserIds = uniquePositiveNumbers(next);
    return;
  }
  memberDialog.selectedUserIds = next.filter((item) => item !== user.id);
}

function toggleCurrentPageMembers(checked: boolean): void {
  const currentPageIds = uniquePositiveNumbers(memberDialog.userOptions.map((item) => item.id));
  if (checked) {
    memberDialog.selectedUserIds = uniquePositiveNumbers([...memberDialog.selectedUserIds, ...currentPageIds]);
    memberDialog.userOptions.forEach((user) => {
      memberDialog.selectedUserMap[user.id] = user;
    });
    return;
  }
  const currentSet = new Set(currentPageIds);
  memberDialog.selectedUserIds = memberDialog.selectedUserIds.filter((item) => !currentSet.has(item));
}

function searchMembers(): void {
  memberDialog.page = 1;
  memberDialog.loading = true;
  errorMsg.value = "";
  void loadMemberUsers()
    .catch((error: unknown) => {
      errorMsg.value = error instanceof Error ? error.message : "加载用户列表失败";
    })
    .finally(() => {
      memberDialog.loading = false;
    });
}

function resetMemberSearch(): void {
  memberDialog.keyword = "";
  memberDialog.page = 1;
  memberDialog.loading = true;
  errorMsg.value = "";
  void loadMemberUsers()
    .catch((error: unknown) => {
      errorMsg.value = error instanceof Error ? error.message : "加载用户列表失败";
    })
    .finally(() => {
      memberDialog.loading = false;
    });
}

async function submitMemberDialog(): Promise<void> {
  if (memberDialog.projectId <= 0) {
    errorMsg.value = "项目信息缺失";
    return;
  }
  memberDialog.submitting = true;
  errorMsg.value = "";
  try {
    await addProjectAdminApi({
      projectId: memberDialog.projectId,
      userIds: uniquePositiveNumbers(memberDialog.selectedUserIds)
    });
    memberDialog.visible = false;
    resetMemberDialogState();
    showSuccess("项目成员保存成功");
    await loadData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "保存项目成员失败";
  } finally {
    memberDialog.submitting = false;
  }
}

onMounted(() => {
  void loadCurrentUsername();
  void loadData();
});

onBeforeUnmount(() => {
  window.clearTimeout(successTimer);
});
</script>

<style scoped>
.project-page {
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

.search-actions {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.search-actions button {
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

.search-actions .secondary {
  border-color: #cbd5e1;
  background: #fff;
  color: #0f172a;
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

.project-table {
  width: 100%;
  min-width: 1200px;
  border-collapse: collapse;
}

.project-table th,
.project-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
  color: #0f172a;
  white-space: nowrap;
  text-align: left;
}

.project-table th {
  background: #f8fafc;
  font-weight: 700;
  color: #334155;
}

.desc-cell {
  max-width: 260px;
  white-space: normal !important;
}

.count-btn {
  border: none;
  background: transparent;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}

.count-btn:hover {
  text-decoration: underline;
}

.count-btn:disabled {
  color: #94a3b8;
  cursor: not-allowed;
  text-decoration: none;
}

.tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
}

.tag.system {
  background: #ffedd5;
  color: #9a3412;
}

.tag.normal {
  background: #dbeafe;
  color: #1d4ed8;
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

.member-view-list {
  max-height: 360px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px;
  margin-top: 8px;
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
  max-height: calc(100vh - 40px);
}

.large-dialog {
  width: min(980px, calc(100vw - 32px));
}

.dialog h3 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
}

.tip {
  margin: -2px 0 0;
  color: #64748b;
  font-size: 12px;
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
  margin-top: 2px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.member-search {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
}

.member-search input {
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0 10px;
  font-size: 13px;
}

.member-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-height: 320px;
}

.member-panel {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-head {
  height: 42px;
  padding: 0 12px;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #334155;
  font-size: 12px;
}

.panel-head strong {
  color: #0f172a;
  font-size: 13px;
}

.all-line {
  padding: 8px 10px 0;
}

.check-list {
  padding: 10px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 240px;
}

.check-line {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0f172a;
  font-size: 13px;
}

.panel-footer {
  border-top: 1px solid #eef2f7;
  height: 42px;
  padding: 0 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #64748b;
  font-size: 12px;
}

@media (max-width: 1080px) {
  .search-grid {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}

@media (max-width: 860px) {
  .member-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .search-grid {
    grid-template-columns: 1fr;
  }

  .head-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .head-actions button {
    flex: 1;
  }

  .member-search {
    grid-template-columns: 1fr;
  }
}
</style>
