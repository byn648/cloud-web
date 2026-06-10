<template>
  <div v-if="modelValue" class="dialog-mask" @click.self="handleCancel">
    <div class="dialog">
      <header class="dialog-header">
        <div class="header-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path
              d="M7 3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H7zm0 2h10v14H7V5zm2 2v2h6V7H9zm0 4v2h6v-2H9zm0 4v2h4v-2H9z"
            />
          </svg>
        </div>
        <div class="header-main">
          <h3>API 权限配置</h3>
          <p>为角色 {{ role?.name || "-" }}（{{ role?.code || "-" }}）分配 API 权限</p>
        </div>
        <button class="close-btn" :disabled="saving" @click="handleCancel">关闭</button>
      </header>

      <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="alert success">{{ successMessage }}</p>

      <section class="breadcrumb">
        <button
          v-for="(item, index) in breadcrumbs"
          :key="`${item.name}-${index}`"
          class="breadcrumb-item"
          :class="{ current: index === breadcrumbs.length - 1 }"
          @click="navigateToBreadcrumb(index)"
        >
          <span>{{ item.icon }}</span>
          <span>{{ item.name }}</span>
        </button>
      </section>

      <section class="toolbar">
        <div class="toolbar-left">
          <span class="stat-chip">已选择 <strong>{{ selectedPermissionCount }}</strong> 个 API 权限</span>
          <span class="stat-chip success">分组总数 <strong>{{ totalGroups }}</strong></span>
          <span class="stat-chip" :class="api7VisibilityClass">API #7 {{ api7VisibilityText }}</span>
        </div>
        <div class="toolbar-right">
          <label id="quick-search-label" class="quick-search">
            <span>快速定位</span>
            <input
              id="api-quick-search"
              v-model.trim="quickKeyword"
              :disabled="loading || saving"
              placeholder="输入 ID/名称/路径，例如 7 或 /portal/v1/user"
            />
          </label>
          <button class="ghost-btn" :disabled="loading || saving || selectedApiIds.length === 0" @click="clearAllSelections">
            清空选择
          </button>
          <button class="ghost-btn" :disabled="loading || saving" @click="reloadAll">刷新</button>
        </div>
      </section>

      <section v-if="quickKeyword" class="quick-result-panel">
        <header>
          <strong>快速匹配结果</strong>
          <span>共 {{ quickMatches.length }} 项（显示前 80 项）</span>
        </header>
        <div class="quick-list">
          <p v-if="quickMatches.length === 0" class="empty">没有匹配到 API 节点</p>
          <div v-for="item in quickMatches" v-else :key="item.id" class="quick-item">
            <label class="quick-check">
              <input
                type="checkbox"
                :checked="isNodeChecked(item)"
                :indeterminate="isNodeIndeterminate(item)"
                :disabled="saving"
                @change="toggleNode(item, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ item.id }} · {{ item.name }}</span>
            </label>
            <span class="quick-path">{{ item.path || item.fullPath }}</span>
            <span class="method-chip" :class="methodClass(item.method)">{{ item.method || "-" }}</span>
            <button class="link-btn" :disabled="loading" @click="focusNode(item)">定位</button>
          </div>
        </div>
      </section>

      <section class="columns-wrapper">
        <div v-if="loading" class="loading-wrap">正在加载 API 树和角色权限...</div>
        <div v-else-if="displayColumns.length === 0" class="loading-wrap">暂无 API 数据</div>
        <div v-else class="columns-container">
          <div v-for="(column, columnIndex) in displayColumns" :key="columnIndex" class="column">
            <header class="column-header">
              <span>{{ column.title }}</span>
              <div class="column-tools">
                <span>{{ column.items.length }}</span>
                <button class="scroll-btn" title="上滑" @click.stop="scrollColumn(columnIndex, 'up')">↑</button>
                <button class="scroll-btn" title="下滑" @click.stop="scrollColumn(columnIndex, 'down')">↓</button>
              </div>
            </header>
            <div class="column-content" :ref="(el) => setColumnRef(el, columnIndex)">
              <p v-if="column.items.length === 0" class="empty">该层级暂无数据</p>
              <div
                v-for="item in column.items"
                v-else
                :key="item.id"
                class="column-item"
                :class="{ active: selectedPath[columnIndex]?.id === item.id }"
                @click="handleItemClick(item, columnIndex)"
              >
                <input
                  type="checkbox"
                  :checked="isNodeChecked(item)"
                  :indeterminate="isNodeIndeterminate(item)"
                  :disabled="saving"
                  @click.stop
                  @change="toggleNode(item, ($event.target as HTMLInputElement).checked)"
                />
                <span class="item-icon">{{ item.isPermission === 0 ? "📁" : "🔗" }}</span>
                <div class="item-main">
                  <p>{{ item.name || `节点-${item.id}` }}</p>
                  <p v-if="item.isPermission === 1" class="item-sub">
                    <span class="method-chip" :class="methodClass(item.method)">{{ item.method || "-" }}</span>
                    <span>{{ item.path || "-" }}</span>
                  </p>
                  <p v-else class="item-sub">包含 {{ item.childCount }} 个子项</p>
                </div>
                <span v-if="item.isPermission === 0 && item.children.length > 0" class="item-arrow">›</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="selected-area">
        <header class="selected-head">
          <strong>已选择的 API / 分组</strong>
          <div class="method-stats">
            <span>GET {{ methodStats.GET }}</span>
            <span>POST {{ methodStats.POST }}</span>
            <span>PUT {{ methodStats.PUT }}</span>
            <span>DELETE {{ methodStats.DELETE }}</span>
            <span>PATCH {{ methodStats.PATCH }}</span>
          </div>
        </header>
        <div class="selected-list">
          <p v-if="selectedItems.length === 0" class="empty">暂无选择</p>
          <div v-for="item in selectedItems" v-else :key="item.id" class="selected-tag">
            <span>{{ item.id }}</span>
            <span>{{ item.name }}</span>
            <span class="selected-path">{{ item.path || item.fullPath }}</span>
            <button class="tag-remove" :disabled="saving" @click="toggleNode(item, false)">移除</button>
          </div>
        </div>
      </section>

      <footer class="dialog-footer">
        <p>权限变更将在保存成功后立即生效。</p>
        <div class="footer-actions">
          <button class="secondary-btn" :disabled="saving" @click="handleCancel">取消</button>
          <button class="primary-btn" :disabled="saving || !role?.id" @click="handleSubmit">
            {{ saving ? "保存中..." : "保存权限" }}
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { getApiTreeApi, searchApiApi, type ApiSysAPI, type ApiSysAPITreeNode } from "../../../../api/portal/api";
import { bindRoleApiApi, getRoleApiApi, type RoleSysRole } from "../../../../api/portal/role";

interface Props {
  modelValue: boolean;
  role: RoleSysRole | null;
}

interface ExtendedApiNode {
  id: number;
  parentId: number;
  name: string;
  path: string;
  method: string;
  isPermission: number;
  checked: boolean;
  childCount: number;
  fullPath: string;
  children: ExtendedApiNode[];
}

interface ColumnData {
  title: string;
  items: ExtendedApiNode[];
}

interface CrumbData {
  name: string;
  icon: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
  (event: "success", message: string): void;
}>();

const loading = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const quickKeyword = ref("");

const treeData = ref<ExtendedApiNode[]>([]);
const allNodes = ref<ExtendedApiNode[]>([]);
const nodeMap = ref<Map<number, ExtendedApiNode>>(new Map());
const selectedPath = ref<ExtendedApiNode[]>([]);
const selectedApiIds = ref<number[]>([]);
const columnContentRefs = ref<(HTMLElement | null)[]>([]);

let successTimer = 0;

const breadcrumbs = computed<CrumbData[]>(() => {
  const items: CrumbData[] = [{ name: "根目录", icon: "🏠" }];
  selectedPath.value.forEach((node) => {
    items.push({
      name: node.name || `节点-${node.id}`,
      icon: node.isPermission === 0 ? "📁" : "🔗"
    });
  });
  return items;
});

const displayColumns = computed<ColumnData[]>(() => {
  const columns: ColumnData[] = [
    {
      title: "根目录",
      items: treeData.value
    }
  ];
  selectedPath.value.forEach((item) => {
    if (item.children.length > 0) {
      columns.push({
        title: item.name || `节点-${item.id}`,
        items: item.children
      });
    }
  });
  return columns;
});

const selectedItems = computed<ExtendedApiNode[]>(() => {
  const result: ExtendedApiNode[] = [];
  selectedApiIds.value.forEach((id) => {
    const node = nodeMap.value.get(id);
    if (node) {
      result.push(node);
    }
  });
  return result.sort((a, b) => a.id - b.id);
});

const selectedPermissionCount = computed(() => {
  return selectedItems.value.filter((item) => item.isPermission === 1).length;
});

const totalGroups = computed(() => {
  return allNodes.value.filter((item) => item.isPermission === 0).length;
});

const methodStats = computed(() => {
  const stats = {
    GET: 0,
    POST: 0,
    PUT: 0,
    DELETE: 0,
    PATCH: 0
  };

  selectedItems.value.forEach((item) => {
    if (item.isPermission !== 1) {
      return;
    }
    const method = item.method.toUpperCase();
    if (method in stats) {
      stats[method as keyof typeof stats] += 1;
    }
  });

  return stats;
});

const quickMatches = computed<ExtendedApiNode[]>(() => {
  const keyword = quickKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return [];
  }
  return allNodes.value
    .filter((item) => matchNode(item, keyword))
    .sort((a, b) => a.id - b.id)
    .slice(0, 80);
});

const hasApi7 = computed(() => {
  return allNodes.value.some((item) => item.id === 7 && item.isPermission === 1);
});

const api7Checked = computed(() => {
  return selectedApiIds.value.includes(7);
});

const api7VisibilityText = computed(() => {
  if (!hasApi7.value) {
    return "未出现在当前树中";
  }
  return api7Checked.value ? "已勾选" : "可见，可勾选";
});

const api7VisibilityClass = computed(() => {
  if (!hasApi7.value) {
    return "error";
  }
  return api7Checked.value ? "success" : "warning";
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function extractPermissionIds(ids: number[]): number[] {
  return sanitizeIds(
    ids.filter((id) => {
      const node = nodeMap.value.get(id);
      if (!node) {
        return true;
      }
      return node.isPermission === 1;
    })
  );
}

async function fetchLatestRoleApiIdsWithRetry(roleId: number): Promise<number[]> {
  let latest: number[] = [];
  for (let i = 0; i < 3; i += 1) {
    latest = sanitizeIds(await getRoleApiApi(roleId));
    if (latest.length > 0 || i === 2) {
      return latest;
    }
    await wait(180);
  }
  return latest;
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
  if (value === "PATCH") return "patch";
  return "default";
}

function isNodeChecked(node: ExtendedApiNode): boolean {
  if (selectedApiIds.value.includes(node.id)) {
    return true;
  }
  if (node.children.length === 0) {
    return false;
  }
  return node.children.every((child) => isNodeChecked(child));
}

function isNodeIndeterminate(node: ExtendedApiNode): boolean {
  if (node.children.length === 0) {
    return false;
  }
  const hasAnySelectedChild = node.children.some((child) => isNodeChecked(child) || isNodeIndeterminate(child));
  return hasAnySelectedChild && !isNodeChecked(node);
}

function handleCancel(): void {
  if (saving.value) {
    return;
  }
  emit("update:modelValue", false);
}

function navigateToBreadcrumb(index: number): void {
  if (index <= 0) {
    selectedPath.value = [];
    return;
  }
  selectedPath.value = selectedPath.value.slice(0, index);
}

function clearAllSelections(): void {
  selectedApiIds.value = [];
  syncCheckedState();
}

function setColumnRef(el: Element | null, index: number): void {
  columnContentRefs.value[index] = el instanceof HTMLElement ? el : null;
}

function scrollColumn(index: number, direction: "up" | "down"): void {
  const target = columnContentRefs.value[index];
  if (!target) {
    return;
  }
  const offset = Math.max(180, Math.floor(target.clientHeight * 0.72));
  const top = direction === "down" ? target.scrollTop + offset : target.scrollTop - offset;
  target.scrollTo({
    top,
    behavior: "smooth"
  });
}

function handleItemClick(item: ExtendedApiNode, columnIndex: number): void {
  if (item.isPermission !== 0 || item.children.length === 0) {
    return;
  }
  selectedPath.value = selectedPath.value.slice(0, columnIndex);
  selectedPath.value.push(item);
}

function walkChildren(node: ExtendedApiNode, fn: (child: ExtendedApiNode) => void): void {
  node.children.forEach((child) => {
    fn(child);
    if (child.children.length > 0) {
      walkChildren(child, fn);
    }
  });
}

function toggleNode(node: ExtendedApiNode, checked: boolean): void {
  const nextSet = new Set<number>(selectedApiIds.value);
  if (checked) {
    nextSet.add(node.id);
  } else {
    nextSet.delete(node.id);
  }

  if (node.isPermission === 0) {
    walkChildren(node, (child) => {
      if (checked) {
        nextSet.add(child.id);
      } else {
        nextSet.delete(child.id);
      }
    });
  }

  selectedApiIds.value = sanitizeIds(Array.from(nextSet));
  syncCheckedState();
}

function focusNode(node: ExtendedApiNode): void {
  const path: ExtendedApiNode[] = [];
  let parentId = node.parentId;
  while (parentId > 0) {
    const parent = nodeMap.value.get(parentId);
    if (!parent) {
      break;
    }
    path.unshift(parent);
    parentId = parent.parentId;
  }
  selectedPath.value = path;
}

function syncCheckedState(): void {
  const selectedSet = new Set(selectedApiIds.value);
  allNodes.value.forEach((node) => {
    node.checked = selectedSet.has(node.id);
  });
}

function matchNode(node: ExtendedApiNode, keyword: string): boolean {
  return (
    String(node.id).includes(keyword) ||
    node.name.toLowerCase().includes(keyword) ||
    node.path.toLowerCase().includes(keyword) ||
    node.fullPath.toLowerCase().includes(keyword) ||
    node.method.toLowerCase().includes(keyword)
  );
}

function buildTree(source: ApiSysAPITreeNode[]): ExtendedApiNode[] {
  const nextMap = new Map<number, ExtendedApiNode>();
  const flatNodes: ExtendedApiNode[] = [];

  const convert = (nodes: ApiSysAPITreeNode[], parentId: number, parentPath: string): ExtendedApiNode[] => {
    return nodes.map((item) => {
      const nodeName = item.name || `节点-${item.id}`;
      const fullPath = parentPath ? `${parentPath} / ${nodeName}` : nodeName;
      const node: ExtendedApiNode = {
        id: item.id,
        parentId,
        name: nodeName,
        path: item.path || "",
        method: item.method || "",
        isPermission: item.isPermission,
        checked: false,
        childCount: 0,
        fullPath,
        children: []
      };

      nextMap.set(node.id, node);
      flatNodes.push(node);
      node.children = convert(item.children || [], node.id, fullPath);
      node.childCount = node.children.length;
      return node;
    });
  };

  const nextTree = convert(source, 0, "");
  nodeMap.value = nextMap;
  allNodes.value = flatNodes;
  return nextTree;
}

function appendRootPermission(api: ApiSysAPI): void {
  if (!Number.isFinite(api.id) || api.id <= 0 || nodeMap.value.has(api.id)) {
    return;
  }

  const node: ExtendedApiNode = {
    id: api.id,
    parentId: 0,
    name: api.name || `API-${api.id}`,
    path: api.path || "",
    method: api.method || "",
    isPermission: api.isPermission,
    checked: false,
    childCount: 0,
    fullPath: api.name || `API-${api.id}`,
    children: []
  };

  treeData.value = [...treeData.value, node].sort((a, b) => a.id - b.id);
  allNodes.value = [...allNodes.value, node];
  nodeMap.value.set(node.id, node);
}

async function ensureApi7Visible(): Promise<void> {
  if (nodeMap.value.has(7)) {
    return;
  }

  try {
    const response = await searchApiApi({
      page: 1,
      pageSize: 120,
      isPermission: 1,
      path: "/portal/v1/user",
      method: "POST"
    });
    const api7 = response.items.find((item) => item.id === 7);
    if (api7) {
      appendRootPermission(api7);
    }
  } catch {
    // 兜底查询失败时不阻断主流程
  }
}

async function loadData(): Promise<void> {
  const roleId = props.role?.id ?? 0;
  if (!roleId) {
    treeData.value = [];
    allNodes.value = [];
    nodeMap.value = new Map<number, ExtendedApiNode>();
    selectedApiIds.value = [];
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const [apiTree, roleApiIds] = await Promise.all([getApiTreeApi(), getRoleApiApi(roleId)]);
    treeData.value = buildTree(apiTree || []);
    await ensureApi7Visible();
    selectedApiIds.value = sanitizeIds(roleApiIds);
    syncCheckedState();
  } catch (error) {
    treeData.value = [];
    allNodes.value = [];
    nodeMap.value = new Map<number, ExtendedApiNode>();
    selectedApiIds.value = [];
    errorMessage.value = error instanceof Error ? error.message : "加载 API 权限失败";
  } finally {
    loading.value = false;
  }
}

async function reloadAll(): Promise<void> {
  clearTransientMessage();
  await loadData();
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

    const latestApiIds = await fetchLatestRoleApiIdsWithRetry(roleId);
    if (latestApiIds.length > 0) {
      const expectedPermissionIds = extractPermissionIds(expectedApiIds);
      const latestPermissionIds = extractPermissionIds(latestApiIds);
      if (!sameNumberSet(expectedPermissionIds, latestPermissionIds)) {
        selectedApiIds.value = latestApiIds;
        syncCheckedState();
        const normalizedMessage = "API 权限保存成功（后端已规范化权限集）";
        showSuccess(normalizedMessage);
        emit("success", normalizedMessage);
        errorMessage.value = "";
        return;
      }
      selectedApiIds.value = latestApiIds;
    } else {
      selectedApiIds.value = expectedApiIds;
    }

    syncCheckedState();
    const message = "API 权限保存成功（已校验）";
    showSuccess(message);
    emit("success", message);
    errorMessage.value = "";
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
      quickKeyword.value = "";
      selectedPath.value = [];
      columnContentRefs.value = [];
      void loadData();
      return;
    }
    quickKeyword.value = "";
    selectedPath.value = [];
    columnContentRefs.value = [];
    clearTransientMessage();
  }
);

onBeforeUnmount(() => {
  window.clearTimeout(successTimer);
});
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
  width: min(1200px, calc(100vw - 28px));
  height: min(900px, calc(100vh - 30px));
  background: #fff;
  border: 1px solid #dbe3ee;
  border-radius: 14px;
  box-shadow: 0 30px 80px -45px rgba(15, 23, 42, 0.75);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.dialog-header {
  padding: 16px 18px;
  background: linear-gradient(135deg, #2563eb 0%, #0284c7 100%);
  color: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.18);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.header-main {
  flex: 1;
  min-width: 0;
}

.header-main h3 {
  margin: 0;
  font-size: 18px;
}

.header-main p {
  margin: 4px 0 0;
  font-size: 13px;
  opacity: 0.9;
}

.close-btn {
  height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 8px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.breadcrumb {
  padding: 10px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #edf2f7;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.breadcrumb-item {
  border: none;
  border-radius: 7px;
  padding: 3px 8px;
  background: transparent;
  color: #0f3d8a;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.breadcrumb-item:hover {
  background: #eaf2ff;
}

.breadcrumb-item.current {
  color: #0f172a;
  font-weight: 700;
  cursor: default;
}

.breadcrumb-item.current:hover {
  background: transparent;
}

.toolbar {
  border-bottom: 1px solid #edf2f7;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-chip {
  height: 30px;
  border: 1px solid #dbe4ef;
  border-radius: 999px;
  background: #f8fafc;
  padding: 0 12px;
  font-size: 12px;
  color: #334155;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.stat-chip.success {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #166534;
}

.stat-chip.warning {
  border-color: #fde68a;
  background: #fefce8;
  color: #854d0e;
}

.stat-chip.error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.quick-search {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.quick-search span {
  color: #64748b;
  font-size: 12px;
}

.quick-search input {
  width: min(440px, calc(100vw - 100px));
  max-width: 440px;
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0 10px;
  font-size: 13px;
}

.ghost-btn {
  height: 32px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #334155;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.quick-result-panel {
  border-bottom: 1px solid #edf2f7;
  background: #f8fbff;
}

.quick-result-panel > header {
  height: 36px;
  border-bottom: 1px solid #e5edf7;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #475569;
  font-size: 12px;
}

.quick-list {
  max-height: 180px;
  overflow: auto;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quick-item {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  padding: 6px 8px;
  display: grid;
  grid-template-columns: minmax(180px, 320px) 1fr auto auto;
  align-items: center;
  gap: 8px;
}

.quick-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #0f172a;
  font-size: 12px;
}

.quick-path {
  color: #64748b;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-btn {
  border: none;
  background: transparent;
  color: #2563eb;
  font-size: 12px;
  cursor: pointer;
}

.columns-wrapper {
  flex: 1;
  min-height: 300px;
  background: #f8fafc;
  overflow: hidden;
  min-height: 0;
}

.loading-wrap {
  height: 100%;
  min-height: 300px;
  display: grid;
  place-items: center;
  color: #64748b;
  font-size: 13px;
}

.columns-container {
  height: 100%;
  display: flex;
  overflow-x: auto;
  min-height: 0;
}

.column {
  min-width: 320px;
  max-width: 360px;
  width: 320px;
  background: #fff;
  border-right: 1px solid #e5edf7;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.column:last-child {
  border-right: none;
}

.column-header {
  height: 40px;
  border-bottom: 1px solid #edf2f7;
  background: #f8fafc;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
}

.column-tools {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.scroll-btn {
  width: 22px;
  height: 22px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #334155;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}

.scroll-btn:hover {
  border-color: #93c5fd;
  color: #1d4ed8;
}

.column-content {
  flex: 1;
  overflow-y: scroll;
  overflow-x: hidden;
  scrollbar-gutter: stable both-edges;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
}

.column-content::-webkit-scrollbar {
  width: 8px;
}

.column-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}

.column-content::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.column-item {
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.column-item:hover {
  background: #f8fbff;
}

.column-item.active {
  background: #ecf5ff;
  border-color: #bfdbfe;
}

.item-icon {
  font-size: 14px;
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-main p {
  margin: 0;
}

.item-main > p:first-child {
  color: #1e293b;
  font-size: 13px;
  font-weight: 600;
}

.item-sub {
  margin-top: 4px !important;
  font-size: 11px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.item-sub span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-arrow {
  color: #94a3b8;
  font-size: 18px;
  margin-left: auto;
}

.method-chip {
  height: 18px;
  border-radius: 999px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
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

.method-chip.patch {
  background: #e0e7ff;
  color: #3730a3;
}

.method-chip.default {
  background: #e2e8f0;
  color: #334155;
}

.selected-area {
  border-top: 1px solid #edf2f7;
  background: #fafcff;
}

.selected-head {
  height: 40px;
  padding: 0 16px;
  border-bottom: 1px solid #edf2f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.selected-head strong {
  color: #334155;
  font-size: 12px;
}

.method-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #64748b;
  font-size: 12px;
}

.selected-list {
  max-height: 150px;
  overflow: auto;
  padding: 8px 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-content: flex-start;
}

.selected-tag {
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 8px;
  padding: 6px 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 160px;
  max-width: 480px;
  font-size: 12px;
  color: #334155;
}

.selected-path {
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-remove {
  margin-left: auto;
  border: none;
  background: transparent;
  color: #dc2626;
  cursor: pointer;
  font-size: 12px;
}

.dialog-footer {
  border-top: 1px solid #edf2f7;
  padding: 12px 16px;
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.dialog-footer p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
}

.footer-actions {
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

.alert {
  margin: 10px 16px 0;
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
  font-size: 12px;
}

.primary-btn:disabled,
.secondary-btn:disabled,
.ghost-btn:disabled,
.close-btn:disabled,
.link-btn:disabled,
.tag-remove:disabled,
.scroll-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@media (max-width: 1024px) {
  .dialog {
    width: calc(100vw - 16px);
    height: calc(100vh - 16px);
  }

  .quick-item {
    grid-template-columns: 1fr auto;
    gap: 6px 8px;
  }

  .quick-check {
    grid-column: 1 / -1;
  }

  .quick-path {
    grid-column: 1 / -1;
  }

  .column {
    min-width: 280px;
    width: 280px;
  }

  .selected-head {
    height: auto;
    padding: 8px 16px;
  }
}

@media (max-width: 768px) {
  .toolbar-right {
    width: 100%;
  }

  .quick-search {
    width: 100%;
  }

  .quick-search input {
    width: 100%;
    max-width: none;
  }

  .dialog-footer {
    justify-content: flex-end;
  }

  .dialog-footer p {
    width: 100%;
  }
}
</style>
