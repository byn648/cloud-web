<template>
  <div class="panel-body">
    <div class="form-grid">
      <label class="field">
        <span>集群名称</span>
        <input :value="modelValue.name" type="text" @input="onInput('name', ($event.target as HTMLInputElement).value)" />
      </label>

      <label class="field">
        <span>集群 UUID</span>
        <input :value="modelValue.uuid" type="text" disabled />
      </label>

      <label class="field full">
        <span>描述信息</span>
        <textarea
          :value="modelValue.description"
          rows="4"
          placeholder="请输入集群描述"
          @input="onInput('description', ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
      </label>

      <label class="field">
        <span>集群类型</span>
        <select :value="modelValue.clusterType" @change="onInput('clusterType', ($event.target as HTMLSelectElement).value)">
          <option value="standard">标准集群</option>
          <option value="edge">边缘集群</option>
          <option value="serverless">Serverless</option>
        </select>
      </label>

      <label class="field">
        <span>环境类型</span>
        <select :value="modelValue.environment" @change="onInput('environment', ($event.target as HTMLSelectElement).value)">
          <option value="production">生产环境</option>
          <option value="staging">预发环境</option>
          <option value="testing">测试环境</option>
          <option value="development">开发环境</option>
        </select>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface BasicInfoForm {
  name: string;
  uuid: string;
  description: string;
  clusterType: string;
  environment: string;
}

const props = defineProps<{
  modelValue: BasicInfoForm;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: BasicInfoForm];
}>();

function onInput<K extends keyof BasicInfoForm>(key: K, value: BasicInfoForm[K]): void {
  emit("update:modelValue", {
    ...props.modelValue,
    [key]: value
  });
}
</script>

<style scoped>
.panel-body { padding: 18px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(260px, 1fr)); gap: 14px; }
.field { display: flex; flex-direction: column; gap: 8px; color: #64748b; font-size: 13px; }
.field.full { grid-column: 1 / -1; }
.field input,
.field textarea,
.field select {
  border: 1px solid #d5dfeb;
  border-radius: 10px;
  background: #ffffff;
  color: #1f2a3d;
  font-size: 14px;
  padding: 10px 12px;
  outline: none;
}
.field input:focus,
.field textarea:focus,
.field select:focus {
  border-color: #8ea0ff;
  box-shadow: 0 0 0 3px rgba(90, 111, 232, 0.12);
}
.field input:disabled { background: #f4f7fc; color: #607086; }
@media (max-width: 900px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
