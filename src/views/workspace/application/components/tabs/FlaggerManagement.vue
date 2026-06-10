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
  <div class="flagger-management-placeholder">
    <ElEmpty description="Flagger 发布（占位）" />
  </div>
</template>

<style scoped>
.flagger-management-placeholder {
  padding: 24px 0;
}
</style>
