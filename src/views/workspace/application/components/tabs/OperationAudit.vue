<script setup lang="ts">
import type { OnecProjectApplication } from "@/api";
import type { ProjectWorkspace } from "@/api";

defineProps<{
  application: OnecProjectApplication | null;
  workspace: ProjectWorkspace | null;
  refreshTrigger: number;
}>();
</script>

<template>
  <div class="operation-audit-placeholder">
    <ElEmpty description="操作审计（占位）" />
  </div>
</template>

<style scoped>
.operation-audit-placeholder {
  padding: 24px 0;
}
</style>
