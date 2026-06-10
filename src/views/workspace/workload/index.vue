<template>
  <div class="workload-page">
    <div class="page-header">
      <div class="header-left">
        <h2>工作负载</h2>
        <p>管理 Kubernetes 工作负载资源</p>
      </div>
      <div class="header-right">
        <ElDropdown @command="handleCreateWorkload">
          <ElButton type="primary">
            <Plus :size="16" class="mr-1" />
            创建工作负载
            <ChevronDown :size="16" class="ml-1" />
          </ElButton>
          <template #dropdown>
            <ElDropdownMenu>
              <ElDropdownItem command="pod">
                <Box :size="14" class="mr-2" />
                Pod
              </ElDropdownItem>
              <ElDropdownItem command="deployment">
                <Layers :size="14" class="mr-2" />
                Deployment
              </ElDropdownItem>
              <ElDropdownItem command="statefulset">
                <Database :size="14" class="mr-2" />
                StatefulSet
              </ElDropdownItem>
              <ElDropdownItem command="daemonset">
                <Server :size="14" class="mr-2" />
                DaemonSet
              </ElDropdownItem>
              <ElDropdownItem command="job">
                <Play :size="14" class="mr-2" />
                Job
              </ElDropdownItem>
              <ElDropdownItem command="cronjob">
                <Clock :size="14" class="mr-2" />
                CronJob
              </ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>
        <ElButton @click="refreshData">
          <RefreshCw :size="16" />
        </ElButton>
      </div>
    </div>

    <div class="workload-content" />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import {
  Plus,
  ChevronDown,
  Box,
  Layers,
  Database,
  Server,
  Play,
  Clock,
  RefreshCw
} from "lucide-vue-next";

const router = useRouter();

function handleCreateWorkload(command: string) {
  void router.push(`/workspace/workload/create/${command}`);
}

function refreshData() {
  /* 与 kube-nova-web 一致：列表刷新占位 */
}
</script>

<style scoped>
.workload-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left h2 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 600;
}

.header-left p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.header-right {
  display: flex;
  gap: 12px;
}

.mr-1 {
  margin-right: 4px;
}

.mr-2 {
  margin-right: 8px;
}

.ml-1 {
  margin-left: 4px;
}
</style>
