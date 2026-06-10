<script setup lang="ts">
import type { OnecProjectApplication } from "@/api";
import type { ProjectCluster, ProjectWorkspace } from "@/api";

defineProps<{
  application: OnecProjectApplication | null;
  cluster: ProjectCluster | null;
  workspace: ProjectWorkspace | null;
  refreshTrigger: number;
}>();
</script>

<template>
  <div class="ingress-management-placeholder">
    <ElEmpty description="Ingress 管理（占位）" />
  </div>
</template>

<style scoped>
.ingress-management-placeholder {
  padding: 24px 0;
}
</style>
