<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import {
  DEMO_APP_PROJECT_ID,
  DEMO_DEPLOYMENT_CREATE_PATH,
  demoNavigateToApplicationList
} from "./demoNavigation";
import { getDemoWorkspace } from "../mock/demoStore";

const router = useRouter();
const route = useRoute();

onMounted(() => {
  const clusterId = Number(route.query.resourceClusterId) || 0;
  const uuid = String(route.query.clusterUuid || "");
  const spaceId = Number(route.query.workspaceId) || 0;
  const ns = String(route.query.namespace || "");

  if (!clusterId || !uuid || !spaceId || !ns) {
    ElMessage.warning("缺少项目或工作空间参数");
    const ws = getDemoWorkspace(spaceId);
    setTimeout(() => {
      demoNavigateToApplicationList(router, {
        projectId: ws?.projectId ?? DEMO_APP_PROJECT_ID,
        workspaceId: spaceId
      });
    }, 800);
    return;
  }

  router.replace({
    path: DEMO_DEPLOYMENT_CREATE_PATH,
    query: {
      ...Object.fromEntries(
        Object.entries(route.query).map(([k, v]) => [k, String(v ?? "")])
      ),
      demo: "1",
      mode: String(route.query.mode || "createApp")
    }
  });
});
</script>

<template>
  <div v-loading="true" class="create-redirect" />
</template>

<style scoped>
.create-redirect {
  min-height: 240px;
}
</style>
