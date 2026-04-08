<template>
  <div class="management-page">
    <div class="page-nav">
      <button type="button" class="back-btn" :disabled="loading" @click="emit('back')">返回列表</button>
    </div>

    <section class="cluster-header" v-if="clusterDetail">
      <div class="header-content">
        <div class="cluster-avatar">
          <img v-if="clusterDetail.avatar" :src="clusterDetail.avatar" alt="cluster-avatar" />
          <div v-else class="avatar-placeholder">K8S</div>
        </div>

        <div class="cluster-info">
          <h1 class="cluster-name">{{ clusterDetail.name }}</h1>
          <div class="cluster-meta">
            <div class="meta-item">
              <span class="meta-label">环境</span>
              <span class="meta-value env">{{ formatEnvironment(clusterDetail.environment) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">类型</span>
              <span class="meta-value">{{ clusterDetail.clusterType || "standard" }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">版本</span>
              <span class="meta-value">{{ clusterDetail.version || "-" }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">状态</span>
              <span class="meta-value" :class="healthClass(clusterDetail.healthStatus)">
                {{ healthText(clusterDetail.healthStatus) }}
              </span>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <button type="button" class="sync-btn" :disabled="syncLoading" @click="syncCurrentCluster">
            {{ syncLoading ? "同步中..." : "同步集群" }}
          </button>
        </div>
      </div>
    </section>

    <section class="main-content" v-if="clusterDetail">
      <div class="custom-tabs">
        <div class="tab-nav">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="tab-item"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            <span class="tab-icon">{{ tab.icon }}</span>
            <span class="tab-label">{{ tab.label }}</span>
          </button>
        </div>

        <div class="tab-panels" v-if="!loading">
          <header class="panel-head">
            <h2>{{ currentTabMeta.panelTitle }}</h2>
            <div class="panel-actions">
              <button type="button" class="ghost-btn" :disabled="saving" @click="cancelCurrentTab">取消</button>
              <button type="button" class="primary-btn" :disabled="saving" @click="saveCurrentTab">
                {{ saving ? "保存中..." : "保存" }}
              </button>
            </div>
          </header>

          <div v-if="noticeMsg" class="notice">{{ noticeMsg }}</div>
          <div v-if="errorMsg" class="notice error">{{ errorMsg }}</div>

          <BasicInfo
            v-if="activeTab === 'basic'"
            v-model="basicForm"
          />

          <NetworkInfo
            v-else-if="activeTab === 'network'"
            :nodes="nodes"
          />

          <AuthConfig
            v-else-if="activeTab === 'auth'"
          />

          <MiddlewareManage
            v-else-if="activeTab === 'middleware'"
            :cluster-detail="clusterDetail"
            :cluster-id="clusterDetail.id"
            :cluster-uuid="clusterDetail.uuid"
            :is-active="activeTab === 'middleware'"
          />

          <ResourceInfo
            v-else-if="activeTab === 'resources'"
            :cluster-detail="clusterDetail"
            :nodes="nodes"
          />

          <OperationLog
            v-else
            :logs="operationLogs"
          />
        </div>

        <div v-else class="loading">正在加载集群详情...</div>
      </div>
    </section>

    <div v-else-if="loading" class="state-block">正在加载集群详情...</div>
    <div v-else class="state-block">请选择有效集群进入控制台。</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { getClusterDetailApi, syncClusterApi, type Cluster } from "../../../../api/manager/cluster";
import { getNodeListApi, type ClusterNodeInfo } from "../../../../api/manager/node";
import BasicInfo, { type BasicInfoForm } from "./tabs/BasicInfo.vue";
import NetworkInfo from "./tabs/NetworkInfo.vue";
import AuthConfig from "./tabs/AuthConfig.vue";
import MiddlewareManage from "./tabs/MiddlewareManage.vue";
import ResourceInfo from "./tabs/ResourceInfo.vue";
import OperationLog, { type OperationLogItem } from "./tabs/OperationLog.vue";

type TabKey = "basic" | "network" | "auth" | "middleware" | "resources" | "logs";

const props = defineProps<{
  clusterId: number | null;
}>();

const emit = defineEmits<{
  back: [];
}>();

const tabs: Array<{ key: TabKey; label: string; icon: string; panelTitle: string }> = [
  { key: "basic", label: "基本信息", icon: "BI", panelTitle: "集群基本信息" },
  { key: "network", label: "网络信息", icon: "NW", panelTitle: "集群网络信息" },
  { key: "auth", label: "认证配置", icon: "AU", panelTitle: "集群认证配置" },
  { key: "middleware", label: "中间件管理", icon: "MW", panelTitle: "集群中间件管理" },
  { key: "resources", label: "资源信息", icon: "RS", panelTitle: "集群资源信息" },
  { key: "logs", label: "操作日志", icon: "LG", panelTitle: "集群操作日志" }
];

const activeTab = ref<TabKey>("basic");
const loading = ref(false);
const syncLoading = ref(false);
const saving = ref(false);
const noticeMsg = ref("");
const errorMsg = ref("");

const clusterDetail = ref<Cluster | null>(null);
const nodes = ref<ClusterNodeInfo[]>([]);
const operationLogs = ref<OperationLogItem[]>([]);

const basicForm = ref<BasicInfoForm>({
  name: "",
  uuid: "",
  description: "",
  clusterType: "standard",
  environment: "prod"
});

const basicSnapshot = ref<BasicInfoForm>({
  name: "",
  uuid: "",
  description: "",
  clusterType: "standard",
  environment: "prod"
});

const currentTabMeta = computed(() => {
  return tabs.find((tab) => tab.key === activeTab.value) ?? tabs[0];
});

function formatEnvironment(environment: string): string {
  if (environment === "prod") return "生产环境";
  if (environment === "staging") return "测试环境";
  if (environment === "edge") return "边缘环境";
  return environment || "未知";
}

function healthText(status: number): string {
  if (status === 1) return "健康";
  if (status === 2) return "异常";
  if (status === 3) return "降级";
  return "未知";
}

function healthClass(status: number): string {
  if (status === 1) return "healthy";
  if (status === 2) return "unhealthy";
  return "degraded";
}

function nowText(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = `${now.getMonth() + 1}`.padStart(2, "0");
  const dd = `${now.getDate()}`.padStart(2, "0");
  const hh = `${now.getHours()}`.padStart(2, "0");
  const mi = `${now.getMinutes()}`.padStart(2, "0");
  const ss = `${now.getSeconds()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function appendLog(action: string, result: "成功" | "失败", detail: string): void {
  operationLogs.value.unshift({
    id: Date.now() + operationLogs.value.length,
    time: nowText(),
    action,
    result,
    detail
  });
}

function resetBasicForm(detail: Cluster): void {
  const draft: BasicInfoForm = {
    name: detail.name || "",
    uuid: detail.uuid || "",
    description: "",
    clusterType: detail.clusterType || "standard",
    environment: detail.environment || "prod"
  };
  basicForm.value = draft;
  basicSnapshot.value = { ...draft };
}

async function fetchClusterDetail(): Promise<void> {
  if (!props.clusterId) return;
  loading.value = true;
  errorMsg.value = "";
  noticeMsg.value = "";
  try {
    const detail = await getClusterDetailApi(props.clusterId);
    clusterDetail.value = detail;
    resetBasicForm(detail);

    if (!detail.uuid) {
      nodes.value = [];
      appendLog("读取集群详情", "成功", "缺少 UUID，未读取节点信息");
      return;
    }

    const nodeRes = await getNodeListApi({
      clusterUuid: detail.uuid,
      page: 1,
      pageSize: 100,
      orderField: "id",
      isAsc: false
    });
    nodes.value = nodeRes.items ?? [];
    appendLog("读取集群详情", "成功", `节点数量=${nodes.value.length}`);
  } catch (error) {
    clusterDetail.value = null;
    nodes.value = [];
    errorMsg.value = error instanceof Error ? error.message : "加载集群详情失败";
    appendLog("读取集群详情", "失败", errorMsg.value);
  } finally {
    loading.value = false;
  }
}

async function syncCurrentCluster(): Promise<void> {
  if (!clusterDetail.value) return;
  syncLoading.value = true;
  noticeMsg.value = "";
  errorMsg.value = "";
  try {
    const res = await syncClusterApi(clusterDetail.value.id);
    appendLog("同步集群", "成功", `source=${res.source}, nodes=${res.nodeCount}`);
    await fetchClusterDetail();
    noticeMsg.value = "同步成功，已刷新集群信息";
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "同步失败";
    appendLog("同步集群", "失败", errorMsg.value);
  } finally {
    syncLoading.value = false;
  }
}

async function saveCurrentTab(): Promise<void> {
  saving.value = true;
  noticeMsg.value = "";
  try {
    await new Promise((resolve) => setTimeout(resolve, 220));
    if (activeTab.value === "basic") {
      if (clusterDetail.value) {
        clusterDetail.value = {
          ...clusterDetail.value,
          name: basicForm.value.name,
          clusterType: basicForm.value.clusterType,
          environment: basicForm.value.environment
        };
      }
      basicSnapshot.value = { ...basicForm.value };
      noticeMsg.value = "当前版本暂未接入保存 API，已本地暂存变更";
      appendLog("保存基本信息", "成功", "本地暂存");
      return;
    }

    noticeMsg.value = "当前标签页为只读展示";
    appendLog(`保存${currentTabMeta.value.label}`, "成功", "只读模式");
  } finally {
    saving.value = false;
  }
}

function cancelCurrentTab(): void {
  if (activeTab.value === "basic") {
    basicForm.value = { ...basicSnapshot.value };
    noticeMsg.value = "已回滚基本信息草稿";
    appendLog("取消修改", "成功", "基本信息已回滚");
    return;
  }
  noticeMsg.value = "当前标签页没有可回滚的编辑项";
}

watch(
  () => props.clusterId,
  async (id) => {
    activeTab.value = "basic";
    operationLogs.value = [];
    if (!id || id <= 0) {
      clusterDetail.value = null;
      nodes.value = [];
      return;
    }
    await fetchClusterDetail();
  },
  { immediate: true }
);
</script>

<style scoped>
.management-page {
  min-height: 100%;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  border-radius: 16px;
  padding-bottom: 12px;
}

.page-nav { padding: 16px 18px; }
.back-btn {
  border: 1px solid #d7dfea;
  background: #fff;
  color: #4d5f78;
  height: 34px;
  border-radius: 10px;
  padding: 0 12px;
  cursor: pointer;
}
.back-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.cluster-header {
  margin: 0 18px 18px;
  background: #fff;
  border: 1px solid #dbe3ef;
  border-radius: 18px;
}

.header-content {
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.cluster-avatar {
  width: 90px;
  height: 90px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e1e8f3;
  background: #f5f8ff;
  display: grid;
  place-items: center;
}
.cluster-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { font-size: 24px; font-weight: 700; color: #3355cc; }

.cluster-info { flex: 1; min-width: 0; }
.cluster-name {
  margin: 0;
  font-size: 50px;
  line-height: 1.05;
  color: #1e2a44;
}

.cluster-meta {
  margin-top: 8px;
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.meta-item { display: inline-flex; align-items: center; gap: 6px; }
.meta-label { color: #71829b; font-size: 14px; }
.meta-value {
  padding: 3px 10px;
  border-radius: 999px;
  background: #eef2f8;
  color: #3d4e68;
  font-size: 14px;
}
.meta-value.env { background: #ede9fe; color: #5c3fb0; }
.meta-value.healthy { background: #eafaf0; color: #148b51; }
.meta-value.unhealthy { background: #ffecec; color: #cb2b2b; }
.meta-value.degraded { background: #fff6e8; color: #c97714; }

.header-actions { display: flex; align-items: center; }
.sync-btn {
  border: 1px solid #5a6fe8;
  background: #5a6fe8;
  color: #fff;
  height: 40px;
  border-radius: 10px;
  padding: 0 16px;
  font-size: 14px;
  cursor: pointer;
}
.sync-btn:disabled { opacity: 0.65; cursor: not-allowed; }

.main-content {
  margin: 0 18px;
  background: #fff;
  border: 1px solid #dbe3ef;
  border-radius: 18px;
  overflow: hidden;
}

.tab-nav {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding: 10px;
  border-bottom: 1px solid #e2e8f2;
}
.tab-item {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: #4e617a;
  padding: 10px 14px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.tab-item.active { background: #eef2ff; color: #2f49d1; font-weight: 600; }
.tab-icon {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: #e9edf5;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
}

.panel-head {
  padding: 14px 18px;
  border-bottom: 1px solid #e2e8f2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.panel-head h2 { margin: 0; font-size: 30px; color: #1f2a3d; }
.panel-actions { display: flex; gap: 8px; }
.ghost-btn,
.primary-btn {
  height: 34px;
  border-radius: 10px;
  padding: 0 12px;
  cursor: pointer;
}
.ghost-btn { border: 1px solid #d5deea; background: #fff; color: #51647f; }
.primary-btn { border: 1px solid #5a6fe8; background: #5a6fe8; color: #fff; }
.ghost-btn:disabled,
.primary-btn:disabled { opacity: 0.65; cursor: not-allowed; }

.notice {
  margin: 12px 18px 0;
  padding: 10px 12px;
  border: 1px solid #d4deec;
  border-radius: 10px;
  background: #f6f9ff;
  color: #3c5475;
  font-size: 13px;
}
.notice.error {
  border-color: #efc7c7;
  background: #fff3f3;
  color: #c32f2f;
}

.loading,
.state-block {
  padding: 18px;
  color: #5f718a;
}

@media (max-width: 1100px) {
  .cluster-name { font-size: 34px; }
}

@media (max-width: 900px) {
  .header-content { flex-direction: column; align-items: flex-start; }
  .panel-head { flex-direction: column; align-items: flex-start; }
}
</style>
