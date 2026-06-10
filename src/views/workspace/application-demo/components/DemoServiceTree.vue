<script setup lang="ts">
import { computed, ref } from "vue";
import { Search, RefreshCw, Box, Layers, Database, Server, Clock, Briefcase, Package } from "lucide-vue-next";
import type { DemoApplication, ResourceType } from "../mock/data";

const props = defineProps<{
  applications: DemoApplication[];
}>();

const emit = defineEmits<{
  nodeClick: [application: DemoApplication];
}>();

const searchKeyword = ref("");

const filteredApps = computed(() => {
  let list = props.applications;
  const kw = searchKeyword.value.trim().toLowerCase();
  if (kw) {
    list = list.filter(
      (a) =>
        a.nameCn.toLowerCase().includes(kw) ||
        a.nameEn.toLowerCase().includes(kw)
    );
  }
  return list;
});

const treeData = computed(() =>
  filteredApps.value.map((app) => ({
    id: app.id,
    label: app.nameCn || app.nameEn,
    resourceType: app.resourceType,
    raw: app
  }))
);

function getResourceIcon(type: ResourceType) {
  const map: Record<string, typeof Box> = {
    pod: Box,
    deployment: Layers,
    statefulset: Database,
    daemonset: Server,
    cronjob: Clock,
    job: Briefcase
  };
  return map[type] ?? Package;
}

function getResourceTypeTag(type: ResourceType) {
  const map: Record<string, string> = {
    pod: "info",
    deployment: "success",
    statefulset: "warning",
    daemonset: "primary",
    cronjob: "danger",
    job: ""
  };
  return map[type] ?? "info";
}

function handleNodeClick(data: { raw: DemoApplication }) {
  emit("nodeClick", data.raw);
}

function handleRefresh() {
  searchKeyword.value = "";
}
</script>

<template>
  <div class="demo-service-tree">
    <div class="tree-toolbar">
      <ElInput v-model="searchKeyword" placeholder="搜索服务..." clearable size="small">
        <template #prefix>
          <Search :size="14" />
        </template>
      </ElInput>
      <ElButton circle size="small" @click="handleRefresh">
        <RefreshCw :size="14" />
      </ElButton>
    </div>
    <div v-if="treeData.length === 0" class="tree-empty">暂无服务</div>
    <ElTree
      v-else
      :data="treeData"
      node-key="id"
      highlight-current
      :props="{ label: 'label' }"
      class="tree-body"
      @node-click="handleNodeClick"
    >
      <template #default="{ data }">
        <div class="tree-node">
          <component :is="getResourceIcon(data.resourceType)" :size="14" class="tree-icon" />
          <span class="tree-label">{{ data.label }}</span>
          <ElTag :type="getResourceTypeTag(data.resourceType)" size="small" effect="plain">
            {{ data.resourceType }}
          </ElTag>
        </div>
      </template>
    </ElTree>
  </div>
</template>

<style scoped lang="scss">
.demo-service-tree {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px;
  box-sizing: border-box;

  .tree-toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .tree-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #909399;
    font-size: 13px;
  }

  .tree-body {
    flex: 1;
    overflow: auto;
    background: transparent;
  }

  .tree-node {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-right: 8px;
    min-width: 0;

    .tree-icon {
      flex-shrink: 0;
      color: #606266;
    }

    .tree-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
    }
  }
}
</style>
