<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  Server,
  RefreshCw,
  Search,
  Loader,
  Box,
  Database,
  Layers,
  Clock,
  Briefcase,
  Package
} from "lucide-vue-next";
import { searchApplicationApi, type ProjectWorkspace, type OnecProjectApplication } from "@/api";

interface Props {
  workspace: ProjectWorkspace | null;
  resourceType: string;
  searchKeyword?: string;
  applications?: OnecProjectApplication[];
}

const props = withDefaults(defineProps<Props>(), {
  searchKeyword: "",
  applications: () => []
});

const emit = defineEmits<{
  nodeClick: [application: OnecProjectApplication];
  refresh: [];
}>();

const treeRef = ref();
const localApplications = ref<OnecProjectApplication[]>([]);
const loading = ref(false);
const localSearchKeyword = ref("");
const lastWorkspaceId = ref<number | null>(null);
const isLoading = ref(false);

const treeProps = {
  label: "label",
  children: "children"
};

const applications = computed(() => {
  if (props.applications && props.applications.length > 0) {
    return props.applications;
  }
  return localApplications.value;
});

const filteredApplications = computed(() => {
  let filtered = applications.value;

  if (props.resourceType && props.resourceType !== "all") {
    filtered = filtered.filter((app) => app.resourceType === props.resourceType);
  }

  if (localSearchKeyword.value) {
    const keyword = localSearchKeyword.value.toLowerCase();
    filtered = filtered.filter(
      (app) =>
        app.nameCn.toLowerCase().includes(keyword) ||
        app.nameEn.toLowerCase().includes(keyword) ||
        app.resourceType.toLowerCase().includes(keyword)
    );
  }

  return filtered;
});

const treeData = computed(() => {
  return filteredApplications.value.map((app) => ({
    id: app.id,
    label: app.nameCn || app.nameEn,
    resourceType: app.resourceType,
    raw: app
  }));
});

const getResourceIcon = (type: string) => {
  const iconMap: Record<string, typeof Box> = {
    pod: Box,
    deployment: Layers,
    statefulset: Database,
    daemonset: Server,
    cronjob: Clock,
    job: Briefcase
  };
  return iconMap[type] || Package;
};

const getResourceTypeTag = (type: string) => {
  const tagMap: Record<string, string> = {
    pod: "info",
    deployment: "success",
    statefulset: "warning",
    daemonset: "primary",
    cronjob: "danger",
    job: ""
  };
  return tagMap[type] || "info";
};

const loadApplications = async (force = false) => {
  if (!props.workspace) {
    localApplications.value = [];
    lastWorkspaceId.value = null;
    return;
  }

  if (props.applications && props.applications.length > 0 && !force) {
    return;
  }

  if (lastWorkspaceId.value === props.workspace.id && !force) {
    return;
  }

  if (isLoading.value) {
    return;
  }

  isLoading.value = true;
  loading.value = true;

  try {
    const response = await searchApplicationApi({
      workspaceId: props.workspace.id
    });
    localApplications.value = response || [];
    lastWorkspaceId.value = props.workspace.id;
  } catch (error) {
    console.error("[ServiceTree] 加载服务列表失败:", error);
    localApplications.value = [];
  } finally {
    loading.value = false;
    isLoading.value = false;
  }
};

const handleNodeClick = (data: { raw?: OnecProjectApplication }) => {
  if (data.raw) {
    emit("nodeClick", data.raw);
  }
};

const handleRefresh = () => {
  void loadApplications(true);
  emit("refresh");
};

const handleSearch = () => {
  /* 过滤由 computed 完成 */
};

watch(
  () => props.workspace?.id,
  (newId, oldId) => {
    if (newId !== oldId) {
      if (!props.applications || props.applications.length === 0) {
        void loadApplications();
      }
    }
  }
);

defineExpose({
  refresh: () => loadApplications(true)
});
</script>

<template>
  <div class="service-tree">
    <div class="tree-toolbar">
      <div class="toolbar-title">
        <Server :size="18" />
        <span>服务列表</span>
        <ElTag v-if="workspace" size="small" type="info">
          {{ workspace.namespace }}
        </ElTag>
        <ElTag v-if="filteredApplications.length > 0" size="small">
          {{ filteredApplications.length }}
        </ElTag>
      </div>
      <div class="toolbar-actions">
        <ElTooltip content="刷新">
          <ElButton :icon="RefreshCw" size="small" text @click="handleRefresh" />
        </ElTooltip>
      </div>
    </div>

    <div v-if="workspace" class="search-box">
      <ElInput v-model="localSearchKeyword" placeholder="搜索服务..." clearable @input="handleSearch">
        <template #prefix>
          <Search :size="16" />
        </template>
      </ElInput>
    </div>

    <ElScrollbar class="tree-container">
      <div v-if="!workspace" class="empty-prompt">
        <ElEmpty :image-size="80" description="请先选择工作空间" />
      </div>

      <div v-else-if="loading" class="loading-state">
        <ElIcon class="is-loading">
          <Loader :size="32" />
        </ElIcon>
        <p>加载中...</p>
      </div>

      <div v-else-if="filteredApplications.length === 0" class="empty-prompt">
        <ElEmpty :image-size="80" description="暂无服务数据" />
      </div>

      <ElTree
        v-else
        ref="treeRef"
        :data="treeData"
        :props="treeProps"
        :highlight-current="true"
        node-key="id"
        default-expand-all
        @node-click="handleNodeClick"
      >
        <template #default="{ data }">
          <div class="tree-node">
            <component :is="getResourceIcon(data.resourceType)" :size="16" class="node-icon" />
            <ElTooltip :content="data.label" placement="top" :show-after="500">
              <span class="node-label">{{ data.label }}</span>
            </ElTooltip>
            <ElTag :type="getResourceTypeTag(data.resourceType)" size="small" class="node-tag">
              {{ data.resourceType }}
            </ElTag>
          </div>
        </template>
      </ElTree>
    </ElScrollbar>
  </div>
</template>

<style lang="scss" scoped>
.service-tree {
  height: 100%;
  display: flex;
  flex-direction: column;

  .tree-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #ebeef5;

    .toolbar-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      font-size: 14px;
    }

    .toolbar-actions {
      display: flex;
      gap: 4px;
    }
  }

  .search-box {
    padding: 12px 16px;
    border-bottom: 1px solid #ebeef5;
  }

  .tree-container {
    flex: 1;

    .empty-prompt,
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 40px;
      color: #909399;

      p {
        margin-top: 12px;
        font-size: 14px;
      }
    }

    :deep(.el-tree) {
      .tree-node {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        overflow: hidden;

        .node-icon {
          flex-shrink: 0;
        }

        .node-label {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 500;
          font-size: 13px;
        }

        .node-tag {
          flex-shrink: 0;
        }
      }

      .el-tree-node__content {
        height: 40px;
        padding-right: 8px;

        &:hover {
          background: #f5f7fa;
        }
      }

      .is-current > .el-tree-node__content {
        background: #ecf5ff;

        .tree-node .node-label {
          color: #409eff;
        }
      }
    }
  }
}
</style>
