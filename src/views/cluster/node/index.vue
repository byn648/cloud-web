<template>
  <div class="node-page">
    <div class="toolbar">
      <div class="toolbar-left">
        <label>
          <span>集群</span>
          <select v-model="selectedClusterUuid" @change="handleClusterChange">
            <option value="" disabled>请选择集群</option>
            <option v-for="cluster in clusters" :key="cluster.id" :value="cluster.uuid">
              {{ cluster.name }} ({{ cluster.environment }})
            </option>
          </select>
        </label>

        <label>
          <span>节点检索</span>
          <input v-model.trim="keyword" type="text" placeholder="节点名称 / IP" />
        </label>
      </div>

      <div class="toolbar-right">
        <button type="button" class="btn primary" @click="refresh">刷新</button>
      </div>
    </div>

    <div v-if="errorMsg" class="error-box">{{ errorMsg }}</div>
    <div v-else-if="loadingNodes" class="loading-box">节点加载中...</div>

    <div v-else class="content-grid">
      <section class="table-wrap">
        <header class="table-head">
          <h3>节点管理</h3>
          <p>
            当前集群:
            <strong>{{ activeClusterName }}</strong>
            · 后端总数 {{ total }}
            · 前端过滤后 {{ filteredNodes.length }}
          </p>
        </header>

        <table>
          <thead>
            <tr>
              <th>节点名称</th>
              <th>IP</th>
              <th>状态</th>
              <th>角色</th>
              <th>架构</th>
              <th>CPU使用率</th>
              <th>内存使用率</th>
              <th>Pod使用</th>
              <th>调度状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="node in filteredNodes" :key="node.id">
              <td>{{ node.nodeName }}</td>
              <td>{{ node.nodeIp }}</td>
              <td>
                <span class="status-tag" :class="statusClass(node.nodeStatus)">
                  {{ node.nodeStatus }}
                </span>
              </td>
              <td>{{ node.nodeRole || "-" }}</td>
              <td>{{ node.architecture || "-" }}</td>
              <td>{{ formatPercent(node.cpuUsge) }}</td>
              <td>{{ formatPercent(node.memoryUsge) }}</td>
              <td>{{ node.podUsge }}/{{ node.podTotal }}</td>
              <td>{{ node.unschedulable === 2 ? "不可调度" : "可调度" }}</td>
              <td>
                <button type="button" class="btn ghost" @click="openDetail(node.id)">详情</button>
              </td>
            </tr>
          </tbody>
        </table>

        <p v-if="filteredNodes.length === 0" class="empty-tip">当前筛选条件没有节点数据</p>
      </section>

      <NodeManagementDetail :detail="nodeDetail" :loading="detailLoading" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { searchClusterApi, type Cluster } from "../../../api/manager/cluster";
import {
  getNodeDetailApi,
  getNodeListApi,
  type ClusterNodeDetail,
  type ClusterNodeInfo
} from "../../../api/manager/node";
import NodeManagementDetail from "./management/index.vue";

const clusters = ref<Cluster[]>([]);
const selectedClusterUuid = ref("");
const nodes = ref<ClusterNodeInfo[]>([]);
const total = ref(0);
const keyword = ref("");

const loadingNodes = ref(false);
const detailLoading = ref(false);
const errorMsg = ref("");

const nodeDetail = ref<ClusterNodeDetail | null>(null);

const filteredNodes = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  if (!q) return nodes.value;
  return nodes.value.filter((item) => {
    return item.nodeName.toLowerCase().includes(q) || item.nodeIp.toLowerCase().includes(q);
  });
});

const activeClusterName = computed(() => {
  const hit = clusters.value.find((cluster) => cluster.uuid === selectedClusterUuid.value);
  return hit?.name ?? "-";
});

function statusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "ready") return "ready";
  if (s === "notready") return "not-ready";
  return "unknown";
}

function formatPercent(v: number): string {
  if (!Number.isFinite(v)) return "0.0%";
  const safe = Math.max(0, Math.min(100, v));
  return `${safe.toFixed(1)}%`;
}

async function loadClusters(): Promise<void> {
  const res = await searchClusterApi();
  clusters.value = res.items ?? [];
  if (!selectedClusterUuid.value && clusters.value.length > 0) {
    selectedClusterUuid.value = clusters.value[0].uuid;
  }
}

async function loadNodes(): Promise<void> {
  if (!selectedClusterUuid.value) {
    nodes.value = [];
    total.value = 0;
    return;
  }
  loadingNodes.value = true;
  errorMsg.value = "";
  try {
    const res = await getNodeListApi({
      clusterUuid: selectedClusterUuid.value,
      page: 1,
      pageSize: 50,
      orderField: "id",
      isAsc: false
    });
    nodes.value = res.items ?? [];
    total.value = res.total ?? nodes.value.length;
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "加载节点失败";
  } finally {
    loadingNodes.value = false;
  }
}

async function openDetail(nodeID: number): Promise<void> {
  detailLoading.value = true;
  errorMsg.value = "";
  try {
    nodeDetail.value = await getNodeDetailApi(nodeID);
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "加载节点详情失败";
  } finally {
    detailLoading.value = false;
  }
}

async function handleClusterChange(): Promise<void> {
  nodeDetail.value = null;
  await loadNodes();
}

async function refresh(): Promise<void> {
  await loadNodes();
}

onMounted(async () => {
  try {
    await loadClusters();
    await loadNodes();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "初始化节点页面失败";
  }
});
</script>

<style scoped>
.node-page {
  display: grid;
  gap: 14px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid #dce4ee;
  background: #ffffff;
}

.toolbar-left {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar label {
  display: grid;
  gap: 6px;
  color: #4a5565;
  font-size: 12px;
}

.toolbar select,
.toolbar input {
  min-width: 220px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #cdd7e3;
  background: #f8fafc;
  padding: 0 10px;
}

.btn {
  height: 34px;
  border-radius: 10px;
  border: 1px solid #d0d7e1;
  background: #ffffff;
  color: #334155;
  padding: 0 12px;
}

.btn.primary {
  background: #f59e0b;
  border-color: #f59e0b;
  color: #ffffff;
}

.btn.ghost {
  background: #ffffff;
  border-color: #2f6bff;
  color: #2f6bff;
}

.error-box,
.loading-box {
  border-radius: 12px;
  padding: 12px;
  border: 1px solid #f3d0d0;
  background: #fff5f5;
  color: #b54747;
}

.loading-box {
  border-color: #dbe4ff;
  background: #f5f8ff;
  color: #3155a7;
}

.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 14px;
}

.table-wrap {
  border: 1px solid #dce4ee;
  background: #ffffff;
  border-radius: 14px;
  overflow: hidden;
}

.table-head {
  padding: 12px;
  border-bottom: 1px solid #edf2f7;
}

.table-head h3 {
  margin: 0;
  font-size: 16px;
  color: #1f2937;
}

.table-head p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 10px;
  border-bottom: 1px solid #edf2f7;
  text-align: left;
  font-size: 13px;
  color: #334155;
}

thead th {
  background: #f8fafc;
  color: #475569;
}

.status-tag {
  display: inline-block;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
}

.status-tag.ready {
  background: #e8f7ee;
  color: #136f3a;
}

.status-tag.not-ready {
  background: #fff1f2;
  color: #be123c;
}

.status-tag.unknown {
  background: #f1f5f9;
  color: #475569;
}

.empty-tip {
  padding: 12px;
  color: #64748b;
  font-size: 13px;
}

@media (max-width: 1280px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
