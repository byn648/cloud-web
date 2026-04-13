<template>
  <div v-if="modelValue" class="dialog-mask" @click.self="handleCancel">
    <div class="dialog">
      <header class="dialog-head">
        <div>
          <h3>菜单权限授权</h3>
          <p>角色：{{ role?.name || "-" }}（{{ role?.code || "-" }}）</p>
        </div>
        <button class="icon-btn" :disabled="saving" @click="handleCancel">关闭</button>
      </header>

      <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="alert success">{{ successMessage }}</p>

      <section class="toolbar">
        <span>已选 {{ selectedMenuIds.length }} 项</span>
        <div class="toolbar-actions">
          <button class="secondary-btn" :disabled="loading || flatNodes.length === 0" @click="selectAllMenus">全选</button>
          <button class="secondary-btn" :disabled="loading || selectedMenuIds.length === 0" @click="clearMenus">清空</button>
          <button class="secondary-btn" :disabled="loading || saving" @click="loadData">刷新</button>
        </div>
      </section>

      <section class="tree-wrap">
        <p v-if="loading" class="empty">正在加载菜单与授权数据...</p>
        <p v-else-if="flatNodes.length === 0" class="empty">暂无菜单数据</p>
        <label
          v-for="node in flatNodes"
          v-else
          :key="node.id"
          class="menu-row"
          :style="{ paddingLeft: `${node.depth * 18 + 10}px` }"
        >
          <input
            type="checkbox"
            :checked="selectedMenuIds.includes(node.id)"
            :disabled="saving"
            @change="toggleMenu(node.id, ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ node.title || `菜单-${node.id}` }}</span>
        </label>
      </section>

      <footer class="dialog-actions">
        <button class="secondary-btn" :disabled="saving" @click="handleCancel">取消</button>
        <button class="primary-btn" :disabled="saving || !role?.id" @click="handleSubmit">
          {{ saving ? "保存中..." : "保存菜单权限" }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { getSysMenuSimpleTreeApi, type MenuSysMenuSimpleTreeNode } from "../../../../api/portal/menu";
import { bindRoleMenuApi, getRoleMenuApi, type RoleSysRole } from "../../../../api/portal/role";

interface Props {
  modelValue: boolean;
  role: RoleSysRole | null;
}

interface FlatMenuNode {
  id: number;
  title: string;
  depth: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
  (event: "success", message: string): void;
}>();

const loading = ref(false);
const saving = ref(false);
const tree = ref<MenuSysMenuSimpleTreeNode[]>([]);
const selectedMenuIds = ref<number[]>([]);
const errorMessage = ref("");
const successMessage = ref("");
let successTimer = 0;

const flatNodes = computed<FlatMenuNode[]>(() => {
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
  walk(tree.value, 0);
  return rows;
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

function handleCancel(): void {
  if (saving.value) {
    return;
  }
  emit("update:modelValue", false);
}

function toggleMenu(menuId: number, checked: boolean): void {
  if (checked) {
    selectedMenuIds.value = sanitizeIds([...selectedMenuIds.value, menuId]);
    return;
  }
  selectedMenuIds.value = selectedMenuIds.value.filter((item) => item !== menuId);
}

function selectAllMenus(): void {
  selectedMenuIds.value = flatNodes.value.map((item) => item.id);
}

function clearMenus(): void {
  selectedMenuIds.value = [];
}

async function loadData(): Promise<void> {
  const roleId = props.role?.id ?? 0;
  if (!roleId) {
    tree.value = [];
    selectedMenuIds.value = [];
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const [menuTree, roleMenuIds] = await Promise.all([getSysMenuSimpleTreeApi(), getRoleMenuApi(roleId)]);
    tree.value = menuTree;
    selectedMenuIds.value = sanitizeIds(roleMenuIds);
  } catch (error) {
    tree.value = [];
    selectedMenuIds.value = [];
    errorMessage.value = error instanceof Error ? error.message : "加载菜单权限失败";
  } finally {
    loading.value = false;
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
    const expectedMenuIds = sanitizeIds(selectedMenuIds.value);
    await bindRoleMenuApi({
      roleId,
      menuIds: expectedMenuIds
    });

    const latestMenuIds = sanitizeIds(await getRoleMenuApi(roleId));
    if (!sameNumberSet(expectedMenuIds, latestMenuIds)) {
      throw new Error("菜单权限保存后校验失败，请重试");
    }

    selectedMenuIds.value = latestMenuIds;
    const message = "菜单权限保存成功（已校验）";
    showSuccess(message);
    emit("success", message);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "保存菜单权限失败";
  } finally {
    saving.value = false;
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      clearTransientMessage();
      void loadData();
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
  width: min(760px, calc(100vw - 32px));
  max-height: calc(100vh - 40px);
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 30px 80px -45px rgba(15, 23, 42, 0.8);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.toolbar {
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

.toolbar-actions {
  display: inline-flex;
  gap: 8px;
}

.tree-wrap {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  min-height: 360px;
  max-height: calc(100vh - 260px);
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
}

.menu-row {
  min-height: 34px;
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

.dialog-actions {
  display: flex;
  justify-content: flex-end;
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

.primary-btn:disabled,
.secondary-btn:disabled,
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
</style>
