<template>
  <div class="menu-page">
    <header class="page-head">
      <div>
        <h2>系统菜单管理</h2>
        <p>支持树形菜单维护，接口与 kube-nova-web 的 `/portal/v1/menu` 保持一致。</p>
      </div>
      <div class="head-actions">
        <button class="secondary-btn" :disabled="loading || platformLoading" @click="refreshData">
          {{ loading || platformLoading ? "刷新中..." : "刷新" }}
        </button>
        <button class="primary-btn" :disabled="loading || !selectedPlatformId" @click="openAddRootDialog">新增菜单</button>
      </div>
    </header>

    <section class="content-layout">
      <aside class="platform-card">
        <div class="platform-head">
          <h3>平台列表</h3>
          <button class="secondary-btn mini" :disabled="platformLoading || loading" @click="refreshPlatforms">
            {{ platformLoading ? "刷新中..." : "刷新" }}
          </button>
        </div>
        <p v-if="platformErrorMessage" class="platform-alert">{{ platformErrorMessage }}</p>
        <div v-if="platforms.length === 0" class="platform-empty">
          暂无可用平台
        </div>
        <button
          v-for="platform in platforms"
          :key="platform.id"
          class="platform-item"
          :class="{ active: platform.id === selectedPlatformId }"
          :disabled="loading || platformLoading"
          @click="handleSelectPlatform(platform.id)"
        >
          <span class="platform-name">{{ platform.platformName || `平台-${platform.id}` }}</span>
          <span v-if="platform.isDefault === 1" class="default-tag">默认</span>
        </button>
      </aside>

      <div class="menu-content">
        <section class="search-card">
          <form class="search-grid" @submit.prevent="handleSearch">
            <label class="field">
              <span>菜单名称</span>
              <input v-model.trim="searchForm.name" :disabled="loading || !selectedPlatformId" placeholder="按路由名称搜索" />
            </label>
            <label class="field">
              <span>菜单标题</span>
              <input v-model.trim="searchForm.title" :disabled="loading || !selectedPlatformId" placeholder="按展示标题搜索" />
            </label>
            <div class="actions">
              <button type="submit" :disabled="loading || !selectedPlatformId">搜索</button>
              <button type="button" class="secondary" :disabled="loading || !selectedPlatformId" @click="handleResetSearch">重置</button>
              <button type="button" class="secondary" :disabled="loading || visibleRows.length === 0" @click="expandAll">
                全部展开
              </button>
              <button type="button" class="secondary" :disabled="loading || visibleRows.length === 0" @click="collapseAll">
                全部收起
              </button>
            </div>
          </form>
        </section>

        <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>
        <p v-if="successMessage" class="alert success">{{ successMessage }}</p>

        <section class="table-card">
          <div class="table-head">
            <h3>菜单树</h3>
            <span v-if="selectedPlatformName">{{ selectedPlatformName }} · 共 {{ total }} 条</span>
            <span v-else>请选择平台</span>
          </div>

          <div class="table-wrap">
            <table class="menu-table">
              <thead>
                <tr>
                  <th>菜单名称</th>
                  <th>类型</th>
                  <th>路由名称</th>
                  <th>路由地址</th>
                  <th>组件路径</th>
                  <th>权限标识</th>
                  <th>排序</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="9" class="empty">正在加载菜单数据...</td>
                </tr>
                <tr v-else-if="!selectedPlatformId">
                  <td colspan="9" class="empty">请选择左侧平台后查看菜单</td>
                </tr>
                <tr v-else-if="visibleRows.length === 0">
                  <td colspan="9" class="empty">暂无菜单数据</td>
                </tr>
                <tr v-for="row in visibleRows" :key="row.item.id">
                  <td>
                    <div class="menu-title-cell" :style="{ paddingLeft: `${row.depth * 20 + 6}px` }">
                      <button
                        v-if="row.item.children.length > 0"
                        class="expand-btn"
                        type="button"
                        @click="toggleExpand(row.item.id)"
                      >
                        {{ isExpanded(row.item.id) ? "▾" : "▸" }}
                      </button>
                      <span v-else class="expand-placeholder"></span>
                      <span>{{ row.item.title || "-" }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="type-chip" :class="typeClass(row.item.menuType)">
                      {{ typeLabel(row.item.menuType) }}
                    </span>
                  </td>
                  <td>{{ row.item.name || "-" }}</td>
                  <td>{{ row.item.menuType === 3 ? "-" : row.item.path || "-" }}</td>
                  <td>{{ row.item.menuType === 3 ? "-" : row.item.component || "-" }}</td>
                  <td>{{ row.item.menuType === 3 ? row.item.authLabel || "-" : row.item.label || "-" }}</td>
                  <td>{{ row.item.sort }}</td>
                  <td>
                    <span class="status-chip" :class="row.item.status === 1 ? 'enabled' : 'disabled'">
                      {{ row.item.status === 1 ? "启用" : "禁用" }}
                    </span>
                  </td>
                  <td class="row-actions">
                    <button
                      v-if="row.item.menuType !== 3"
                      class="action-btn secondary"
                      :disabled="deletingMap[row.item.id]"
                      @click="openAddChildDialog(row.item)"
                    >
                      新增子级
                    </button>
                    <button class="action-btn secondary" :disabled="deletingMap[row.item.id]" @click="openEditDialog(row.item)">
                      编辑
                    </button>
                    <button class="action-btn danger" :disabled="deletingMap[row.item.id]" @click="handleDelete(row.item)">
                      {{ deletingMap[row.item.id] ? "删除中..." : "删除" }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>

    <div v-if="dialog.visible" class="dialog-mask" @click.self="closeDialog">
      <div class="dialog">
        <h3>{{ dialog.mode === "add" ? "新增菜单" : "编辑菜单" }}</h3>
        <div class="dialog-grid">
          <label class="dialog-field">
            <span>父级菜单</span>
            <select v-model.number="dialog.form.parentId">
              <option :value="0">顶级菜单</option>
              <option v-for="item in parentOptions" :key="item.id" :value="item.id">
                {{ `${"　".repeat(item.depth)}${item.title}` }}
              </option>
            </select>
          </label>
          <label class="dialog-field">
            <span>菜单类型</span>
            <select v-model.number="dialog.form.menuType">
              <option :value="1">目录</option>
              <option :value="2">菜单</option>
              <option :value="3">按钮</option>
            </select>
          </label>
          <label class="dialog-field">
            <span>菜单标题</span>
            <input v-model.trim="dialog.form.title" maxlength="50" placeholder="请输入菜单标题" />
          </label>
          <label class="dialog-field">
            <span>路由名称</span>
            <input v-model.trim="dialog.form.name" maxlength="50" placeholder="请输入路由名称" />
          </label>
          <label v-if="dialog.form.menuType !== 3" class="dialog-field">
            <span>路由地址</span>
            <input v-model.trim="dialog.form.path" maxlength="120" placeholder="例如：/system/menu 或 menu" />
          </label>
          <label v-if="dialog.form.menuType !== 3" class="dialog-field">
            <span>组件路径</span>
            <input v-model.trim="dialog.form.component" maxlength="180" placeholder="例如：/system/menu" />
          </label>
          <label class="dialog-field">
            <span>权限标识</span>
            <input
              v-model.trim="dialog.form.label"
              maxlength="60"
              :placeholder="dialog.form.menuType === 3 ? '例如：menu:add' : '例如：SystemMenu'"
            />
          </label>
          <label class="dialog-field">
            <span>排序</span>
            <input v-model.number="dialog.form.sort" type="number" min="0" />
          </label>
          <label v-if="dialog.form.menuType === 3" class="dialog-field">
            <span>按钮名称</span>
            <input v-model.trim="dialog.form.authName" maxlength="50" placeholder="例如：新增、删除" />
          </label>
          <label v-if="dialog.form.menuType === 3" class="dialog-field">
            <span>按钮标识</span>
            <input v-model.trim="dialog.form.authLabel" maxlength="60" placeholder="例如：add、delete" />
          </label>
          <label class="dialog-field inline-switch">
            <input v-model="dialog.form.status" type="checkbox" />
            <span>启用状态</span>
          </label>
          <label class="dialog-field inline-switch" v-if="dialog.form.menuType !== 3">
            <input v-model="dialog.form.isMenu" type="checkbox" />
            <span>显示为菜单</span>
          </label>
          <label class="dialog-field inline-switch" v-if="dialog.form.menuType !== 3">
            <input v-model="dialog.form.keepAlive" type="checkbox" />
            <span>页面缓存</span>
          </label>
          <label class="dialog-field inline-switch" v-if="dialog.form.menuType !== 3">
            <input v-model="dialog.form.isHide" type="checkbox" />
            <span>隐藏菜单</span>
          </label>
        </div>
        <div class="dialog-actions">
          <button class="secondary-btn" :disabled="dialog.submitting" @click="closeDialog">取消</button>
          <button class="primary-btn" :disabled="dialog.submitting" @click="submitDialog">
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
  addMenuApi,
  deleteMenuApi,
  getSysMenuSimpleTreeApi,
  searchMenuTreeApi,
  updateMenuApi,
  type MenuSysMenuSimpleTreeNode,
  type MenuSysMenuTree
} from "../../../api/portal/menu";
import { getUserPlatformsApi, searchPlatformApi, type PlatformSysPlatform } from "../../../api/portal/platform";
import { resolvePlatformId } from "../../../api/shared";

interface VisibleMenuRow {
  item: MenuSysMenuTree;
  depth: number;
}

interface MenuSearchForm {
  name: string;
  title: string;
}

interface ParentOption {
  id: number;
  title: string;
  depth: number;
}

const loading = ref(false);
const total = ref(0);
const menuTree = ref<MenuSysMenuTree[]>([]);
const expandedIds = ref<number[]>([]);
const parentMenuTree = ref<MenuSysMenuSimpleTreeNode[]>([]);
const deletingMap = ref<Record<number, boolean>>({});
const searchForm = ref<MenuSearchForm>({
  name: "",
  title: ""
});
const errorMessage = ref("");
const successMessage = ref("");
let successTimer = 0;
const platforms = ref<PlatformSysPlatform[]>([]);
const platformLoading = ref(false);
const platformErrorMessage = ref("");
const selectedPlatformId = ref<number>(0);

const dialog = reactive({
  visible: false,
  mode: "add" as "add" | "edit",
  submitting: false,
  targetId: 0,
  form: {
    parentId: 0,
    menuType: 2,
    title: "",
    name: "",
    path: "",
    component: "",
    label: "",
    sort: 0,
    status: true,
    isMenu: true,
    keepAlive: false,
    isHide: false,
    authName: "",
    authLabel: ""
  }
});

const visibleRows = computed<VisibleMenuRow[]>(() => {
  const rows: VisibleMenuRow[] = [];
  const expandedSet = new Set(expandedIds.value);

  const walk = (list: MenuSysMenuTree[], depth: number) => {
    list.forEach((item) => {
      rows.push({ item, depth });
      if (item.children.length > 0 && expandedSet.has(item.id)) {
        walk(item.children, depth + 1);
      }
    });
  };

  walk(menuTree.value, 0);
  return rows;
});

const parentOptions = computed<ParentOption[]>(() => {
  const rows: ParentOption[] = [];
  const walk = (list: MenuSysMenuSimpleTreeNode[], depth: number) => {
    list.forEach((item) => {
      rows.push({
        id: item.id,
        title: item.title || `菜单-${item.id}`,
        depth
      });
      if (item.children.length > 0) {
        walk(item.children, depth + 1);
      }
    });
  };
  walk(parentMenuTree.value, 0);
  return rows.filter((item) => item.id !== dialog.targetId);
});

const selectedPlatformName = computed<string>(() => {
  const target = platforms.value.find((item) => item.id === selectedPlatformId.value);
  return target?.platformName || "";
});

function showSuccess(message: string): void {
  successMessage.value = message;
  window.clearTimeout(successTimer);
  successTimer = window.setTimeout(() => {
    successMessage.value = "";
  }, 2200);
}

function readStoredPlatformId(): number {
  return resolvePlatformId();
}

function persistSelectedPlatformId(platformId: number): void {
  if (typeof window === "undefined" || !Number.isFinite(platformId) || platformId <= 0) {
    return;
  }
  const value = String(platformId);
  window.localStorage.setItem("platformId", value);
  window.localStorage.setItem("currentPlatformId", value);
  window.localStorage.setItem("selectedPlatformId", value);
  window.localStorage.setItem("resourcePlatformId", value);
}

function sortPlatforms(list: PlatformSysPlatform[]): PlatformSysPlatform[] {
  return [...list].sort((a, b) => {
    if (a.isDefault !== b.isDefault) {
      return b.isDefault - a.isDefault;
    }
    if (a.sort !== b.sort) {
      return a.sort - b.sort;
    }
    return a.id - b.id;
  });
}

async function loadPlatforms(): Promise<void> {
  platformLoading.value = true;
  platformErrorMessage.value = "";

  try {
    let list = await getUserPlatformsApi();
    if (list.length === 0) {
      const response = await searchPlatformApi({
        page: 1,
        pageSize: 200,
        orderStr: "sort",
        isAsc: true,
        isEnable: 1
      });
      list = response.items;
    }

    const enabledList = list.filter((item) => item.isEnable !== 0);
    const sortedList = sortPlatforms(enabledList);
    platforms.value = sortedList;

    if (sortedList.length === 0) {
      selectedPlatformId.value = 0;
      menuTree.value = [];
      parentMenuTree.value = [];
      total.value = 0;
      return;
    }

    const currentSelected = selectedPlatformId.value;
    const storedPlatformId = readStoredPlatformId();
    const nextPlatform =
      sortedList.find((item) => item.id === currentSelected) ||
      sortedList.find((item) => item.id === storedPlatformId) ||
      sortedList.find((item) => item.isDefault === 1) ||
      sortedList[0];

    selectedPlatformId.value = nextPlatform.id;
    persistSelectedPlatformId(nextPlatform.id);
  } catch (error) {
    platformErrorMessage.value = error instanceof Error ? error.message : "加载平台列表失败";
    platforms.value = [];
    selectedPlatformId.value = 0;
  } finally {
    platformLoading.value = false;
  }
}

function refreshPlatforms(): void {
  void (async () => {
    await loadPlatforms();
    await loadData();
    await loadParentMenus();
  })();
}

function handleSelectPlatform(platformId: number): void {
  if (platformId === selectedPlatformId.value) {
    return;
  }
  selectedPlatformId.value = platformId;
  persistSelectedPlatformId(platformId);
  void loadData();
  void loadParentMenus();
}

function collectTreeIds(list: MenuSysMenuTree[]): number[] {
  const ids: number[] = [];
  const walk = (nodes: MenuSysMenuTree[]) => {
    nodes.forEach((item) => {
      ids.push(item.id);
      if (item.children.length > 0) {
        walk(item.children);
      }
    });
  };
  walk(list);
  return ids;
}

function typeLabel(menuType: number): string {
  if (menuType === 1) return "目录";
  if (menuType === 2) return "菜单";
  if (menuType === 3) return "按钮";
  return "未知";
}

function typeClass(menuType: number): string {
  if (menuType === 1) return "dir";
  if (menuType === 2) return "menu";
  if (menuType === 3) return "btn";
  return "";
}

function isExpanded(id: number): boolean {
  return expandedIds.value.includes(id);
}

function toggleExpand(id: number): void {
  if (expandedIds.value.includes(id)) {
    expandedIds.value = expandedIds.value.filter((item) => item !== id);
    return;
  }
  expandedIds.value = [...expandedIds.value, id];
}

function expandAll(): void {
  expandedIds.value = collectTreeIds(menuTree.value);
}

function collapseAll(): void {
  expandedIds.value = [];
}

async function loadParentMenus(): Promise<void> {
  if (!selectedPlatformId.value) {
    parentMenuTree.value = [];
    return;
  }

  try {
    parentMenuTree.value = await getSysMenuSimpleTreeApi({
      platformId: selectedPlatformId.value
    });
  } catch (error) {
    console.error("Load parent menu failed", error);
  }
}

async function loadData(): Promise<void> {
  if (!selectedPlatformId.value) {
    menuTree.value = [];
    total.value = 0;
    expandedIds.value = [];
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await searchMenuTreeApi({
      platformId: selectedPlatformId.value,
      name: searchForm.value.name.trim() || undefined,
      title: searchForm.value.title.trim() || undefined
    });

    menuTree.value = response.items;
    total.value = response.total;
    expandedIds.value = collectTreeIds(response.items);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "加载菜单列表失败";
    menuTree.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function refreshData(): void {
  void (async () => {
    await loadPlatforms();
    await loadData();
    await loadParentMenus();
  })();
}

function handleSearch(): void {
  if (!selectedPlatformId.value) {
    errorMessage.value = "请先选择平台";
    return;
  }
  void loadData();
}

function handleResetSearch(): void {
  searchForm.value = {
    name: "",
    title: ""
  };
  if (!selectedPlatformId.value) {
    errorMessage.value = "请先选择平台";
    return;
  }
  void loadData();
}

function openDialog(mode: "add" | "edit", menu?: MenuSysMenuTree): void {
  dialog.visible = true;
  dialog.mode = mode;
  dialog.targetId = menu?.id ?? 0;
  dialog.form.parentId = menu?.parentId ?? 0;
  dialog.form.menuType = menu?.menuType ?? 2;
  dialog.form.title = menu?.title ?? "";
  dialog.form.name = menu?.name ?? "";
  dialog.form.path = menu?.path ?? "";
  dialog.form.component = menu?.component ?? "";
  dialog.form.label = menu?.menuType === 3 ? menu?.authLabel ?? "" : menu?.label ?? "";
  dialog.form.sort = menu?.sort ?? 0;
  dialog.form.status = (menu?.status ?? 1) === 1;
  dialog.form.isMenu = (menu?.isMenu ?? 1) === 1;
  dialog.form.keepAlive = (menu?.keepAlive ?? 0) === 1;
  dialog.form.isHide = (menu?.isHide ?? 0) === 1;
  dialog.form.authName = menu?.authName ?? "";
  dialog.form.authLabel = menu?.authLabel ?? "";
}

function openAddRootDialog(): void {
  if (!selectedPlatformId.value) {
    errorMessage.value = "请先选择平台";
    return;
  }
  openDialog("add");
  dialog.form.parentId = 0;
  dialog.form.menuType = 2;
}

function openAddChildDialog(parent: MenuSysMenuTree): void {
  openDialog("add");
  dialog.form.parentId = parent.id;
  dialog.form.menuType = 2;
}

function openEditDialog(menu: MenuSysMenuTree): void {
  openDialog("edit", menu);
}

function closeDialog(): void {
  if (dialog.submitting) {
    return;
  }
  dialog.visible = false;
}

async function submitDialog(): Promise<void> {
  const title = dialog.form.title.trim();
  const name = dialog.form.name.trim();

  if (!selectedPlatformId.value) {
    errorMessage.value = "请先选择平台";
    return;
  }
  if (!title) {
    errorMessage.value = "菜单标题不能为空";
    return;
  }
  if (!name) {
    errorMessage.value = "路由名称不能为空";
    return;
  }
  if (dialog.form.menuType === 3 && !dialog.form.authLabel.trim()) {
    errorMessage.value = "按钮类型需要填写按钮标识";
    return;
  }

  dialog.submitting = true;
  errorMessage.value = "";

  try {
    const payload = {
      platformId: selectedPlatformId.value,
      parentId: dialog.form.parentId,
      menuType: dialog.form.menuType,
      title,
      name,
      path: dialog.form.menuType === 3 ? undefined : dialog.form.path.trim() || undefined,
      component: dialog.form.menuType === 3 ? undefined : dialog.form.component.trim() || undefined,
      label: dialog.form.menuType === 3 ? undefined : dialog.form.label.trim() || undefined,
      sort: Number.isFinite(dialog.form.sort) ? Number(dialog.form.sort) : 0,
      status: dialog.form.status ? 1 : 0,
      isMenu: dialog.form.menuType === 3 ? 0 : dialog.form.isMenu ? 1 : 0,
      keepAlive: dialog.form.menuType === 3 ? 0 : dialog.form.keepAlive ? 1 : 0,
      isHide: dialog.form.menuType === 3 ? 0 : dialog.form.isHide ? 1 : 0,
      authName: dialog.form.menuType === 3 ? dialog.form.authName.trim() || undefined : undefined,
      authLabel: dialog.form.menuType === 3 ? dialog.form.authLabel.trim() || undefined : undefined
    };

    if (dialog.mode === "add") {
      await addMenuApi(payload);
      showSuccess("菜单新增成功");
    } else {
      await updateMenuApi({
        id: dialog.targetId,
        ...payload
      });
      showSuccess("菜单更新成功");
    }

    dialog.visible = false;
    await loadData();
    await loadParentMenus();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "保存菜单失败";
  } finally {
    dialog.submitting = false;
  }
}

async function handleDelete(menu: MenuSysMenuTree): Promise<void> {
  if (!selectedPlatformId.value) {
    errorMessage.value = "请先选择平台";
    return;
  }
  if (!confirm(`确定删除菜单 "${menu.title}" 吗？`)) {
    return;
  }

  deletingMap.value[menu.id] = true;
  errorMessage.value = "";
  try {
    await deleteMenuApi(menu.id, selectedPlatformId.value);
    showSuccess("菜单删除成功");
    await loadData();
    await loadParentMenus();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "删除菜单失败";
  } finally {
    deletingMap.value[menu.id] = false;
  }
}

onMounted(async () => {
  await loadPlatforms();
  await loadData();
  await loadParentMenus();
});

onBeforeUnmount(() => {
  window.clearTimeout(successTimer);
});
</script>

<style scoped>
.menu-page {
  min-height: 100%;
  padding: 16px;
  background:
    radial-gradient(circle at 0% 0%, rgba(14, 165, 233, 0.1) 0, rgba(14, 165, 233, 0) 34%),
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

.content-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
}

.platform-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.35);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.platform-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.platform-head h3 {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
}

.secondary-btn.mini {
  height: 30px;
  padding: 0 10px;
  font-size: 12px;
}

.platform-alert {
  margin: 0;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
}

.platform-empty {
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  color: #64748b;
  font-size: 12px;
  text-align: center;
  padding: 16px 10px;
}

.platform-item {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  color: #0f172a;
  min-height: 40px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
}

.platform-item.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}

.platform-item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.platform-name {
  font-size: 13px;
  font-weight: 600;
  text-align: left;
}

.default-tag {
  display: inline-flex;
  align-items: center;
  height: 20px;
  border-radius: 999px;
  padding: 0 8px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 700;
}

.menu-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
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
  border-color: #cbd5e1;
  background: #fff;
  color: #0f172a;
}

.primary-btn:disabled,
.secondary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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
  flex-wrap: wrap;
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

.menu-table {
  width: 100%;
  min-width: 1240px;
  border-collapse: collapse;
}

.menu-table th,
.menu-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
  color: #0f172a;
  text-align: left;
  white-space: nowrap;
}

.menu-table th {
  background: #f8fafc;
  font-weight: 700;
  color: #334155;
}

.menu-title-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.expand-btn {
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: #0f172a;
  cursor: pointer;
  padding: 0;
}

.expand-placeholder {
  display: inline-block;
  width: 18px;
}

.type-chip,
.status-chip {
  display: inline-flex;
  align-items: center;
  height: 22px;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
}

.type-chip.dir {
  background: #e2e8f0;
  color: #334155;
}

.type-chip.menu {
  background: #dbeafe;
  color: #1d4ed8;
}

.type-chip.btn {
  background: #fee2e2;
  color: #991b1b;
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
  opacity: 0.55;
  cursor: not-allowed;
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
  width: min(760px, calc(100vw - 32px));
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
.dialog-field select {
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0 10px;
  font-size: 13px;
}

.dialog-field.inline-switch {
  flex-direction: row;
  align-items: center;
  align-self: end;
  gap: 8px;
}

.dialog-field.inline-switch input {
  width: 16px;
  height: 16px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 1100px) {
  .content-layout {
    grid-template-columns: 1fr;
  }

  .search-grid {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}

@media (max-width: 760px) {
  .search-grid {
    grid-template-columns: 1fr;
  }

  .dialog-grid {
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
