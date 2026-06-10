<script setup lang="ts">
import { RefreshCw } from "lucide-vue-next";

defineProps<{
  loading?: boolean;
}>();

defineEmits<{
  refresh: [];
}>();
</script>

<template>
  <div class="demo-table-toolbar">
    <div class="toolbar-left">
      <slot name="left" />
    </div>
    <div class="toolbar-right">
      <ElTooltip content="刷新" placement="top">
        <ElButton circle :loading="loading" @click="$emit('refresh')">
          <RefreshCw :size="16" />
        </ElButton>
      </ElTooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
.demo-table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px 12px;
  flex-wrap: wrap;

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }
}
</style>
