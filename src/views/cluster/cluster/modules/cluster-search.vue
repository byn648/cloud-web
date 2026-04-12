<template>
  <form class="search-form" @submit.prevent="emitSearch">
    <label class="field">
      <span>集群名称</span>
      <input v-model.trim="localModel.name" placeholder="请输入集群名称" />
    </label>

    <label class="field">
      <span>环境类型</span>
      <select v-model="localModel.environment">
        <option
          v-for="option in environmentOptions"
          :key="option.value || 'all-env'"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </label>

    <label class="field">
      <span>集群类型</span>
      <select v-model="localModel.clusterType">
        <option
          v-for="option in clusterTypeOptions"
          :key="option.value || 'all-type'"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </label>

    <div class="actions">
      <button type="submit" class="btn primary">搜索</button>
      <button type="button" class="btn ghost" @click="reset">重置</button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue";
import { clusterTypeOptions, environmentOptions } from "../constants";

export interface ClusterSearchForm {
  name: string;
  environment: string;
  clusterType: string;
}

const props = defineProps<{
  modelValue: ClusterSearchForm;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: ClusterSearchForm];
  search: [value: ClusterSearchForm];
  reset: [];
}>();

const localModel = reactive<ClusterSearchForm>({
  name: "",
  environment: "",
  clusterType: ""
});

watch(
  () => props.modelValue,
  (value) => {
    localModel.name = value.name || "";
    localModel.environment = value.environment || "";
    localModel.clusterType = value.clusterType || "";
  },
  { immediate: true, deep: true }
);

function emitSearch(): void {
  const payload: ClusterSearchForm = {
    name: localModel.name.trim(),
    environment: localModel.environment,
    clusterType: localModel.clusterType
  };
  emit("update:modelValue", payload);
  emit("search", payload);
}

function reset(): void {
  const payload: ClusterSearchForm = {
    name: "",
    environment: "",
    clusterType: ""
  };
  localModel.name = "";
  localModel.environment = "";
  localModel.clusterType = "";
  emit("update:modelValue", payload);
  emit("reset");
}
</script>

<style scoped>
.search-form {
  display: grid;
  grid-template-columns: repeat(4, minmax(200px, 1fr));
  gap: 12px;
  align-items: end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field span {
  color: #4b5f7a;
  font-size: 12px;
  font-weight: 600;
}

.field input,
.field select {
  height: 36px;
  border: 1px solid #d2dcea;
  border-radius: 10px;
  padding: 0 10px;
  background: #fff;
  color: #1f2a3d;
  outline: none;
}

.field input:focus,
.field select:focus {
  border-color: #6e7df3;
  box-shadow: 0 0 0 3px rgba(110, 125, 243, 0.14);
}

.actions {
  display: inline-flex;
  gap: 8px;
}

.btn {
  height: 36px;
  border-radius: 10px;
  border: 1px solid #d2dcea;
  padding: 0 14px;
  font-size: 13px;
  cursor: pointer;
}

.btn.primary {
  background: #1a73e8;
  border-color: #1a73e8;
  color: #fff;
}

.btn.ghost {
  background: #fff;
  color: #334155;
}

@media (max-width: 1200px) {
  .search-form {
    grid-template-columns: repeat(2, minmax(200px, 1fr));
  }
}

@media (max-width: 760px) {
  .search-form {
    grid-template-columns: 1fr;
  }
}
</style>
