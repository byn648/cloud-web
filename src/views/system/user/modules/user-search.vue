<template>
  <section class="search-card">
    <form class="search-grid" @submit.prevent="emit('search')">
      <label class="field">
        <span>用户名</span>
        <input v-model.trim="form.username" :disabled="loading" placeholder="例如 super_admin" />
      </label>
      <label class="field">
        <span>昵称</span>
        <input v-model.trim="form.nickname" :disabled="loading" placeholder="请输入昵称" />
      </label>
      <label class="field">
        <span>手机号</span>
        <input v-model.trim="form.phone" :disabled="loading" placeholder="请输入手机号" />
      </label>
      <label class="field">
        <span>邮箱</span>
        <input v-model.trim="form.email" :disabled="loading" placeholder="请输入邮箱" />
      </label>
      <label class="field">
        <span>工号</span>
        <input v-model.trim="form.workNumber" :disabled="loading" placeholder="请输入工号" />
      </label>
      <label class="field">
        <span>状态</span>
        <select v-model="form.status" :disabled="loading">
          <option value="">全部</option>
          <option value="1">启用</option>
          <option value="0">禁用</option>
        </select>
      </label>

      <div class="actions">
        <button type="submit" :disabled="loading">搜索</button>
        <button type="button" class="secondary" :disabled="loading" @click="emit('reset')">重置</button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import type { UserSearchFormModel } from "./table-config";

const form = defineModel<UserSearchFormModel>({ required: true });

defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits<{
  search: [];
  reset: [];
}>();
</script>

<style scoped>
.search-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.35);
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

.field input,
.field select {
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0 10px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: #fff;
}

.field input:focus,
.field select:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
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
  color: #1e293b;
}

.actions button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@media (max-width: 1080px) {
  .search-grid {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}

@media (max-width: 680px) {
  .search-grid {
    grid-template-columns: 1fr;
  }
}
</style>
