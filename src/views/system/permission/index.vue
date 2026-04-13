<template>
  <div class="permission-page">
    <header class="page-head">
      <div>
        <h2>系统权限管理</h2>
        <p>按角色绑定菜单权限与 API 权限，支持从“角色授权入口”带入并锁定当前角色。</p>
      </div>
      <button class="refresh-btn" :disabled="loadingBase || loadingPermission || loadingApiList" @click="refreshAll">
        {{ loadingBase || loadingPermission || loadingApiList ? "刷新中..." : "刷新数据" }}
      </button>
    </header>

    <section class="role-picker-card">
      <template v-if="roleContextLocked">
        <div class="field">
          <span>当前角色（授权入口）</span>
          <div class="locked-role-line">
            <strong>{{ currentRole?.name || "-" }}</strong>
            <small>（{{ currentRole?.code || "-" }}）</small>
          </div>
        </div>
        <div class="actions">
          <button type="button" class="secondary" :disabled="loadingBase" @click="unlockRoleContext">解除锁定</button>
        </div>
      </template>
      <template v-else>
        <label class="field">
          <span>角色筛选</span>
          <input v-model.trim="roleKeyword" placeholder="按角色名称或编码过滤" />
        </label>
        <label class="field">
          <span>当前角色</span>
          <select v-model.number="selectedRoleId" :disabled="loadingBase || filteredRoles.length === 0">
            <option v-if="filteredRoles.length === 0" :value="0">暂无可选角色</option>
            <option v-for="item in filteredRoles" :key="item.id" :value="item.id">
              {{ item.name }} ({{ item.code || "-" }})
            </option>
          </select>
        </label>
      </template>
    </section>

    <section class="panel-switch-card">
      <span>授权视图</span>
      <div class="panel-switch-actions">
        <button class="switch-btn" :class="{ active: panelMode === 'menu' }" @click="setPanelMode('menu')">
          菜单权限
        </button>
        <button class="switch-btn" :class="{ active: panelMode === 'api' }" @click="setPanelMode('api')">
          API权限
        </button>
        <button class="switch-btn" :class="{ active: panelMode === 'all' }" @click="setPanelMode('all')">
          全部
        </button>
      </div>
    </section>

    <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>
    <p v-if="successMessage" class="alert success">{{ successMessage }}</p>

    <section class="permission-grid" :class="{ 'single-col': panelMode !== 'all' }">
      <article v-if="showMenuCard" class="card">
        <header class="card-head">
          <div>
            <h3>菜单权限</h3>
            <p>已选 {{ selectedMenuIds.length }} 项</p>
          </div>
          <div class="card-actions">
            <button class="secondary" :disabled="loadingPermission || flatMenuNodes.length === 0" @click="selectAllMenus">
              全选
            </button>
            <button class="secondary" :disabled="loadingPermission || selectedMenuIds.length === 0" @click="clearMenus">
              清空
            </button>
            <button :disabled="savingMenu || selectedRoleId <= 0" @click="saveMenuPermissions">
              {{ savingMenu ? "保存中..." : "保存菜单权限" }}
            </button>
          </div>
        </header>

        <div class="menu-tree">
          <p v-if="loadingPermission" class="empty">正在加载角色权限...</p>
          <p v-else-if="flatMenuNodes.length === 0" class="empty">暂无菜单数据</p>
          <label
            v-for="node in flatMenuNodes"
            v-else
            :key="node.id"
            class="menu-row"
            :style="{ paddingLeft: `${node.depth * 18 + 10}px` }"
          >
            <input
              type="checkbox"
              :checked="selectedMenuIds.includes(node.id)"
              :disabled="savingMenu || selectedRoleId <= 0"
              @change="toggleMenu(node.id, ($event.target as HTMLInputElement).checked)"
            />
            <span>{{ node.title || `菜单-${node.id}` }}</span>
          </label>
        </div>
      </article>

      <article v-if="showApiCard" class="card api-card">
        <header class="card-head">
          <div>
            <h3>API 权限</h3>
            <p>已选 {{ selectedApiIds.length }} 项</p>
          </div>
          <div class="card-actions">
            <button class="secondary" :disabled="loadingApiList || apiList.length === 0" @click="selectAllApisOnPage">
              全选当前页
            </button>
            <button class="secondary" :disabled="loadingApiList || apiList.length === 0" @click="clearApisOnPage">
              清空当前页
            </button>
            <button :disabled="savingApi || selectedRoleId <= 0" @click="saveApiPermissions">
              {{ savingApi ? "保存中..." : "保存 API 权限" }}
            </button>
          </div>
        </header>

        <div class="api-layout">
          <aside class="api-group-pane">
            <div class="api-group-head">
              <strong>API 包</strong>
              <button class="mini-btn" :disabled="loadingApiGroups" @click="selectApiGroup(0)">全部</button>
            </div>
            <div class="api-group-list">
              <p v-if="loadingApiGroups" class="empty">正在加载 API 包...</p>
              <p v-else-if="flatApiGroups.length === 0" class="empty">暂无 API 包</p>
              <button
                v-for="group in flatApiGroups"
                v-else
                :key="group.id"
                class="group-row"
                :class="{ active: selectedApiGroupId === group.id }"
                :style="{ paddingLeft: `${group.depth * 18 + 10}px` }"
                @click="selectApiGroup(group.id)"
              >
                {{ group.name || `分组-${group.id}` }}
              </button>
            </div>
          </aside>

          <section class="api-main-pane">
            <form class="api-search-grid" @submit.prevent="handleApiSearch">
              <label class="field">
                <span>API 名称</span>
                <input v-model.trim="apiSearchForm.name" :disabled="loadingApiList" placeholder="请输入 API 名称" />
              </label>
              <label class="field">
                <span>API 路径</span>
                <input v-model.trim="apiSearchForm.path" :disabled="loadingApiList" placeholder="例如：/portal/v1/user" />
              </label>
              <label class="field">
                <span>HTTP 方法</span>
                <select v-model="apiSearchForm.method" :disabled="loadingApiList">
                  <option value="">全部</option>
                  <option v-for="item in methodOptions" :key="item" :value="item">{{ item }}</option>
                </select>
              </label>
              <div class="search-actions">
                <button type="submit" :disabled="loadingApiList">搜索</button>
                <button type="button" class="secondary" :disabled="loadingApiList" @click="resetApiSearch">重置</button>
              </div>
            </form>

            <div class="api-table-wrap">
              <table class="api-table">
                <thead>
                  <tr>
                    <th class="col-check">
                      <input
                        type="checkbox"
                        :checked="currentPageAllApiSelected"
                        :disabled="apiList.length === 0 || loadingApiList"
                        @change="toggleCurrentPageApis(($event.target as HTMLInputElement).checked)"
                      />
                    </th>
                    <th>ID</th>
                    <th>API 名称</th>
                    <th>API 路径</th>
                    <th>HTTP 方法</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loadingApiList">
                    <td colspan="5" class="empty">正在加载 API 列表...</td>
                  </tr>
                  <tr v-else-if="apiList.length === 0">
                    <td colspan="5" class="empty">暂无 API 数据</td>
                  </tr>
                  <tr v-for="api in apiList" v-else :key="api.id">
                    <td class="col-check">
                      <input
                        type="checkbox"
                        :checked="selectedApiIds.includes(api.id)"
                        :disabled="savingApi || selectedRoleId <= 0"
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

            <footer class="api-footer">
              <div>共 {{ apiTotal }} 条，第 {{ apiPagination.page }} / {{ apiPageCount }} 页</div>
              <div class="pager">
                <button :disabled="apiPagination.page <= 1 || loadingApiList" @click="changeApiPage(apiPagination.page - 1)">
                  上一页
                </button>
                <button
                  :disabled="apiPagination.page >= apiPageCount || loadingApiList"
                  @click="changeApiPage(apiPagination.page + 1)"
                >
                  下一页
                </button>
              </div>
            </footer>
          </section>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { getSysMenuSimpleTreeApi, type MenuSysMenuSimpleTreeNode } from "../../../api/portal/menu";
import {
  bindRoleApiApi,
  bindRoleMenuApi,
  getRoleApiApi,
  getRoleMenuApi,
  searchRoleApi,
  type RoleSysRole
} from "../../../api/portal/role";
import { getApiGroupsTreeApi, searchApiApi, type ApiGroupTreeNode, type ApiSysAPI } from "../../../api/portal/api";

interface FlatMenuNode {
  id: number;
  title: string;
  depth: number;
}

interface FlatApiGroupNode {
  id: number;
  name: string;
  depth: number;
}

type PermissionPanelMode = "menu" | "api" | "all";

const methodOptions = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD", "*"];

const loadingBase = ref(false);
const loadingPermission = ref(false);
const loadingApiGroups = ref(false);
const loadingApiList = ref(false);
const savingMenu = ref(false);
const savingApi = ref(false);

const roles = ref<RoleSysRole[]>([]);
const roleKeyword = ref("");
const selectedRoleId = ref(0);
const roleContextLocked = ref(false);
const panelMode = ref<PermissionPanelMode>("all");

const menuTree = ref<MenuSysMenuSimpleTreeNode[]>([]);
const selectedMenuIds = ref<number[]>([]);

const apiGroups = ref<ApiGroupTreeNode[]>([]);
const selectedApiGroupId = ref(0);
const apiList = ref<ApiSysAPI[]>([]);
const apiTotal = ref(0);
const selectedApiIds = ref<number[]>([]);

const apiSearchForm = reactive({
  name: "",
  path: "",
  method: ""
});

const apiPagination = reactive({
  page: 1,
  pageSize: 12
});

const errorMessage = ref("");
const successMessage = ref("");
let successTimer = 0;

const filteredRoles = computed(() => {
  const keyword = roleKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return roles.value;
  }
  return roles.value.filter((item) => {
    return item.name.toLowerCase().includes(keyword) || item.code.toLowerCase().includes(keyword);
  });
});

const currentRole = computed(() => {
  return roles.value.find((item) => item.id === selectedRoleId.value) || null;
});

const showMenuCard = computed(() => panelMode.value === "all" || panelMode.value === "menu");
const showApiCard = computed(() => panelMode.value === "all" || panelMode.value === "api");

const flatMenuNodes = computed<FlatMenuNode[]>(() => {
  const rows: FlatMenuNode[] = [];

  const walk = (list: MenuSysMenuSimpleTreeNode[], depth: number) => {
    list.forEach((item) => {
      rows.push({
        id: item.id,
        title: item.title,
        depth
      });
      if (item.children.length > 0) {
        walk(item.children, depth + 1);
      }
    });
  };

  walk(menuTree.value, 0);
  return rows;
});

const flatApiGroups = computed<FlatApiGroupNode[]>(() => {
  const rows: FlatApiGroupNode[] = [];

  const walk = (list: ApiGroupTreeNode[], depth: number) => {
    list.forEach((item) => {
      rows.push({
        id: item.id,
        name: item.name,
        depth
      });
      if (item.children.length > 0) {
        walk(item.children, depth + 1);
      }
    });
  };

  walk(apiGroups.value, 0);
  return rows;
});

const apiPageCount = computed(() => {
  if (apiTotal.value <= 0 || apiPagination.pageSize <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(apiTotal.value / apiPagination.pageSize));
});

const currentPageAllApiSelected = computed(() => {
  if (apiList.value.length === 0) {
    return false;
  }
  return apiList.value.every((item) => selectedApiIds.value.includes(item.id));
});

function showSuccess(message: string): void {
  successMessage.value = message;
  window.clearTimeout(successTimer);
  successTimer = window.setTimeout(() => {
    successMessage.value = "";
  }, 2200);
}

function toUniquePositiveNumbers(values: number[]): number[] {
  return Array.from(new Set(values.filter((item) => Number.isFinite(item) && item > 0)));
}

function sameNumberSet(left: number[], right: number[]): boolean {
  const l = toUniquePositiveNumbers(left).sort((a, b) => a - b);
  const r = toUniquePositiveNumbers(right).sort((a, b) => a - b);
  if (l.length !== r.length) {
    return false;
  }
  return l.every((item, index) => item === r[index]);
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

async function loadApiGroups(): Promise<void> {
  loadingApiGroups.value = true;
  try {
    apiGroups.value = await getApiGroupsTreeApi({ isPermission: 0 });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "加载 API 包失败";
    apiGroups.value = [];
  } finally {
    loadingApiGroups.value = false;
  }
}

async function loadApiList(): Promise<void> {
  loadingApiList.value = true;
  errorMessage.value = "";

  try {
    const response = await searchApiApi({
      page: apiPagination.page,
      pageSize: apiPagination.pageSize,
      parentId: selectedApiGroupId.value > 0 ? selectedApiGroupId.value : undefined,
      name: apiSearchForm.name.trim() || undefined,
      path: apiSearchForm.path.trim() || undefined,
      method: apiSearchForm.method.trim() || undefined,
      isPermission: 1
    });
    apiList.value = response.items;
    apiTotal.value = response.total;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "加载 API 列表失败";
    apiList.value = [];
    apiTotal.value = 0;
  } finally {
    loadingApiList.value = false;
  }
}

async function loadRolePermissions(roleId: number): Promise<void> {
  if (roleId <= 0) {
    selectedMenuIds.value = [];
    selectedApiIds.value = [];
    return;
  }

  loadingPermission.value = true;
  errorMessage.value = "";

  try {
    const [menuIds, apiIds] = await Promise.all([getRoleMenuApi(roleId), getRoleApiApi(roleId)]);
    selectedMenuIds.value = toUniquePositiveNumbers(menuIds);
    selectedApiIds.value = toUniquePositiveNumbers(apiIds);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "加载角色权限失败";
    selectedMenuIds.value = [];
    selectedApiIds.value = [];
  } finally {
    loadingPermission.value = false;
  }
}

async function loadBaseData(): Promise<void> {
  loadingBase.value = true;
  errorMessage.value = "";

  try {
    const [roleResponse, tree] = await Promise.all([searchRoleApi({ page: 1, pageSize: 200 }), getSysMenuSimpleTreeApi()]);
    roles.value = roleResponse.items;
    menuTree.value = tree;

    await loadApiGroups();

    const preferredRoleId = Number(localStorage.getItem("systemPermissionRoleId") || "0");
    localStorage.removeItem("systemPermissionRoleId");

    const hasPreferred = roleResponse.items.some((item) => item.id === preferredRoleId);
    if (hasPreferred) {
      selectedRoleId.value = preferredRoleId;
      roleContextLocked.value = true;
      return;
    }

    roleContextLocked.value = false;
    const fallbackRoleId = roleResponse.items[0]?.id ?? 0;
    selectedRoleId.value = fallbackRoleId;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "加载角色与菜单数据失败";
  } finally {
    loadingBase.value = false;
  }
}

function unlockRoleContext(): void {
  roleContextLocked.value = false;
}

function setPanelMode(mode: PermissionPanelMode): void {
  panelMode.value = mode;
}

function toggleMenu(menuId: number, checked: boolean): void {
  if (checked) {
    selectedMenuIds.value = toUniquePositiveNumbers([...selectedMenuIds.value, menuId]);
    return;
  }
  selectedMenuIds.value = selectedMenuIds.value.filter((id) => id !== menuId);
}

function selectAllMenus(): void {
  selectedMenuIds.value = flatMenuNodes.value.map((item) => item.id);
}

function clearMenus(): void {
  selectedMenuIds.value = [];
}

function selectApiGroup(groupId: number): void {
  if (selectedApiGroupId.value === groupId) {
    return;
  }
  selectedApiGroupId.value = groupId;
}

function handleApiSearch(): void {
  apiPagination.page = 1;
  void loadApiList();
}

function resetApiSearch(): void {
  apiSearchForm.name = "";
  apiSearchForm.path = "";
  apiSearchForm.method = "";
  apiPagination.page = 1;
  void loadApiList();
}

function changeApiPage(page: number): void {
  if (page < 1 || page > apiPageCount.value || page === apiPagination.page) {
    return;
  }
  apiPagination.page = page;
  void loadApiList();
}

function toggleApi(apiId: number, checked: boolean): void {
  if (checked) {
    selectedApiIds.value = toUniquePositiveNumbers([...selectedApiIds.value, apiId]);
    return;
  }
  selectedApiIds.value = selectedApiIds.value.filter((id) => id !== apiId);
}

function toggleCurrentPageApis(checked: boolean): void {
  const currentPageIds = toUniquePositiveNumbers(apiList.value.map((item) => item.id));
  if (checked) {
    selectedApiIds.value = toUniquePositiveNumbers([...selectedApiIds.value, ...currentPageIds]);
    return;
  }
  const currentSet = new Set(currentPageIds);
  selectedApiIds.value = selectedApiIds.value.filter((id) => !currentSet.has(id));
}

function selectAllApisOnPage(): void {
  toggleCurrentPageApis(true);
}

function clearApisOnPage(): void {
  toggleCurrentPageApis(false);
}

async function saveMenuPermissions(): Promise<void> {
  if (selectedRoleId.value <= 0) {
    errorMessage.value = "请先选择角色";
    return;
  }

  savingMenu.value = true;
  errorMessage.value = "";

  try {
    const expectedMenuIds = toUniquePositiveNumbers(selectedMenuIds.value);
    await bindRoleMenuApi({
      roleId: selectedRoleId.value,
      menuIds: expectedMenuIds
    });

    const latestMenuIds = toUniquePositiveNumbers(await getRoleMenuApi(selectedRoleId.value));
    if (!sameNumberSet(expectedMenuIds, latestMenuIds)) {
      throw new Error("菜单权限保存后校验失败，请刷新后重试");
    }

    selectedMenuIds.value = latestMenuIds;
    showSuccess("菜单权限保存成功（已校验）");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "保存菜单权限失败";
  } finally {
    savingMenu.value = false;
  }
}

async function saveApiPermissions(): Promise<void> {
  if (selectedRoleId.value <= 0) {
    errorMessage.value = "请先选择角色";
    return;
  }

  savingApi.value = true;
  errorMessage.value = "";

  try {
    const expectedApiIds = toUniquePositiveNumbers(selectedApiIds.value);
    await bindRoleApiApi({
      roleId: selectedRoleId.value,
      apiIds: expectedApiIds
    });

    const latestApiIds = toUniquePositiveNumbers(await getRoleApiApi(selectedRoleId.value));
    if (!sameNumberSet(expectedApiIds, latestApiIds)) {
      throw new Error("API 权限保存后校验失败，请刷新后重试");
    }

    selectedApiIds.value = latestApiIds;
    showSuccess("API 权限保存成功（已校验）");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "保存 API 权限失败";
  } finally {
    savingApi.value = false;
  }
}

async function refreshAll(): Promise<void> {
  await Promise.all([loadBaseData(), loadApiList()]);
}

watch(selectedRoleId, (roleId) => {
  void loadRolePermissions(roleId);
});

watch(selectedApiGroupId, () => {
  apiPagination.page = 1;
  void loadApiList();
});

onMounted(async () => {
  const preferredPanelMode = localStorage.getItem("systemPermissionPanelMode");
  localStorage.removeItem("systemPermissionPanelMode");
  if (preferredPanelMode === "menu" || preferredPanelMode === "api" || preferredPanelMode === "all") {
    panelMode.value = preferredPanelMode;
  }

  await loadBaseData();
  await loadApiList();
});

onBeforeUnmount(() => {
  window.clearTimeout(successTimer);
});
</script>

<style scoped>
.permission-page {
  min-height: 100%;
  padding: 16px;
  background:
    radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.1) 0, rgba(56, 189, 248, 0) 34%),
    radial-gradient(circle at 100% 0%, rgba(34, 197, 94, 0.08) 0, rgba(34, 197, 94, 0) 35%),
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

.role-picker-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 12px;
  box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.35);
}

.panel-switch-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  min-height: 52px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.35);
}

.panel-switch-card > span {
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.panel-switch-actions {
  display: inline-flex;
  gap: 8px;
}

.switch-btn {
  height: 32px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #0f172a;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.switch-btn.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}

.locked-role-line {
  min-height: 38px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  background: #f8fafc;
}

.permission-grid {
  display: grid;
  grid-template-columns: 1.05fr 1.4fr;
  gap: 12px;
}

.permission-grid.single-col {
  grid-template-columns: 1fr;
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 420px;
  box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.35);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid #eef2f7;
}

.card-head h3 {
  margin: 0;
  font-size: 15px;
  color: #0f172a;
}

.card-head p {
  margin: 6px 0 0;
  font-size: 12px;
  color: #64748b;
}

.card-head button,
.field button,
.actions button,
.search-actions button,
.mini-btn,
.pager button {
  height: 32px;
  border-radius: 8px;
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #fff;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.card-head button.secondary,
.field button.secondary,
.actions button.secondary,
.search-actions button.secondary,
.mini-btn.secondary,
.pager button.secondary {
  border-color: #cbd5e1;
  background: #fff;
  color: #0f172a;
}

.card-head button:disabled,
.field button:disabled,
.actions button:disabled,
.search-actions button:disabled,
.mini-btn:disabled,
.pager button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.card-actions {
  display: inline-flex;
  gap: 8px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field span {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.field input,
.field select {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 13px;
  outline: none;
}

.actions {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
}

.menu-tree {
  padding: 10px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-row {
  min-height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0f172a;
  font-size: 13px;
}

.menu-row:hover {
  background: #f8fafc;
}

.api-card {
  min-height: 560px;
}

.api-layout {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(220px, 300px) 1fr;
  min-height: 0;
}

.api-group-pane {
  border-right: 1px solid #eef2f7;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.api-group-head {
  height: 44px;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 10px;
}

.mini-btn {
  height: 28px;
  padding: 0 9px;
}

.api-group-list {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
}

.group-row {
  height: 32px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: #0f172a;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
}

.group-row:hover {
  background: #f8fafc;
}

.group-row.active {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.api-main-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.api-search-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 150px auto;
  gap: 8px;
  border-bottom: 1px solid #eef2f7;
  padding: 10px;
}

.search-actions {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.api-table-wrap {
  flex: 1;
  overflow: auto;
}

.api-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;
}

.api-table th,
.api-table td {
  border-bottom: 1px solid #eef2f7;
  padding: 10px 10px;
  text-align: left;
  font-size: 13px;
  color: #0f172a;
}

.api-table thead th {
  position: sticky;
  top: 0;
  background: #f8fafc;
  z-index: 1;
}

.col-check {
  width: 42px;
  text-align: center;
}

.method-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  height: 24px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid transparent;
  color: #334155;
  background: #e2e8f0;
}

.method-chip.get {
  background: #dcfce7;
  color: #166534;
}

.method-chip.post {
  background: #dbeafe;
  color: #1d4ed8;
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

.api-footer {
  border-top: 1px solid #eef2f7;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
}

.pager {
  display: inline-flex;
  gap: 8px;
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
  text-align: center;
  padding: 20px 12px;
  color: #64748b;
  font-size: 13px;
}

@media (max-width: 1280px) {
  .permission-grid {
    grid-template-columns: 1fr;
  }

  .api-layout {
    grid-template-columns: 260px 1fr;
  }
}

@media (max-width: 980px) {
  .role-picker-card {
    grid-template-columns: 1fr;
  }

  .api-layout {
    grid-template-columns: 1fr;
  }

  .api-group-pane {
    border-right: 0;
    border-bottom: 1px solid #eef2f7;
    max-height: 220px;
  }

  .api-search-grid {
    grid-template-columns: 1fr;
  }
}
</style>
