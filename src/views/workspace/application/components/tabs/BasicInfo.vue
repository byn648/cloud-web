<script setup lang="ts">
import type { OnecProjectApplication } from "@/api";
import type { ProjectCluster, ProjectWorkspace } from "@/api";

defineProps<{
  application: OnecProjectApplication | null;
  workspace: ProjectWorkspace | null;
  cluster: ProjectCluster | null;
  refreshTrigger: number;
}>();

defineEmits<{
  refresh: [];
}>();
</script>

<template>
  <div class="basic-info-modern">
    <ElEmpty v-if="!application" description="暂无服务" />
    <template v-else>
      <p class="basic-info-hint">
        创建 Deployment 成功时，会写入数据库<strong>并</strong>对下方「K8s 命名空间」做下发；用
        <code>kubectl get deploy -n &lt;命名空间&gt;</code> 时须与此一致。本页为应用元数据，不含实时副本状态可另接接口。
      </p>
      <ElDescriptions :column="1" border title="基础信息">
        <ElDescriptionsItem label="中文名">{{ application.nameCn }}</ElDescriptionsItem>
        <ElDescriptionsItem label="英文名">{{ application.nameEn }}</ElDescriptionsItem>
        <ElDescriptionsItem label="类型">{{ application.resourceType }}</ElDescriptionsItem>
        <ElDescriptionsItem label="描述">{{ application.description || "-" }}</ElDescriptionsItem>
        <ElDescriptionsItem v-if="cluster" label="项目集群/资源池">{{ cluster.clusterName }}</ElDescriptionsItem>
        <ElDescriptionsItem v-if="workspace" label="工作空间名">{{ workspace.name }}</ElDescriptionsItem>
        <ElDescriptionsItem v-if="workspace" label="K8s 命名空间（工作负载落在此）">
          <code class="ns-code">{{ workspace.namespace }}</code>
        </ElDescriptionsItem>
      </ElDescriptions>
    </template>
  </div>
</template>

<style scoped>
.basic-info-modern {
  padding: 8px 0;
}
.basic-info-hint {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--el-text-color-secondary, #606266);
  code {
    font-size: 12px;
    padding: 0 4px;
  }
}
.ns-code {
  font-size: 13px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--el-fill-color-light, #f4f4f5);
  color: var(--el-color-primary, #409eff);
  font-weight: 600;
}
</style>
