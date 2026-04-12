<template>
  <div class="saas-node-layout">
    
    <header class="saas-topbar">
      <div class="bar-left">
        <div class="cluster-select-box">
          <select v-model="selectedClusterUuid" @change="handleClusterChange">
            <option value="" disabled>请选择集群</option>
            <option v-for="cluster in clusters" :key="cluster.id" :value="cluster.uuid">
              {{ cluster.name }} ({{ cluster.environment }})
            </option>
          </select>
          <span class="dropdown-arrow">⌄</span>
        </div>

        <div class="view-switcher-group">
          <button 
            class="switch-btn" 
            :class="{ active: viewMode === 'card' }" 
            @click="viewMode = 'card'"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
            卡片视图
          </button>
          <button 
            class="switch-btn" 
            :class="{ active: viewMode === 'table' }" 
            @click="viewMode = 'table'"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            列表视图
          </button>
        </div>

        <button class="outline-refresh-btn" @click="refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>
          刷新
        </button>
      </div>

      <div class="bar-right">
        <div class="icon-tools-container">
          
          <div class="expandable-search" :class="{ 'is-expanded': searchActive || keyword }">
            <input 
              v-model.trim="keyword" 
              type="text" 
              placeholder="输入节点名称或 IP..." 
              ref="searchInputRef"
            />
            <button class="tool-btn search-trigger" @click="toggleSearch" title="检索节点">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </div>

          <button class="tool-btn" @click="refresh" title="同步">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>
          </button>
          <button class="tool-btn" title="排序">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
          </button>
          <button class="tool-btn" title="全屏">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          </button>
          <button class="tool-btn" title="显示列">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <button class="tool-btn" title="设置">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>
      </div>
    </header>

    <div v-if="errorMsg" class="global-alert error">{{ errorMsg }}</div>
    <div v-else-if="loadingNodes" class="global-loading">
      <div class="loader-ring"></div>
      <span>节点数据加载中...</span>
    </div>

    <main v-else class="main-content-area">
      
      <section v-if="viewMode === 'card'" class="horizontal-card-list">
        <article v-for="node in filteredNodes" :key="node.id" class="horizontal-node-card" :class="statusClass(node.nodeStatus)">
          
          <div class="card-content-layout">
            
            <div class="hc-section info-section">
              <div class="hc-icon-wrapper" :class="statusClass(node.nodeStatus)">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              </div>
              <div class="hc-text-content">
                <div class="hc-title-row">
                  <h3 :title="node.nodeName">{{ node.nodeName }}</h3>
                </div>
                <p class="hc-ip">{{ node.nodeIp }}</p>
                <div class="hc-meta-info">
                  <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/></svg> {{ node.architecture || 'amd64' }}</span>
                  <span class="divider"></span>
                  <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> {{ node.createdAt ? formatDate(node.createdAt) : '2025/9/21' }}</span>
                </div>
              </div>
            </div>

            <div class="hc-section tags-section">
               <span class="hc-tag role">{{ node.nodeRole || 'Worker' }}</span>
               <span class="hc-tag status" :class="statusClass(node.nodeStatus)">
                 <i class="dot"></i> {{ node.nodeStatus === 'Ready' ? '运行中' : '未就绪' }}
               </span>
               <span class="hc-tag schedule" :class="node.unschedulable === 2 ? 'danger' : 'ok'">
                 {{ node.unschedulable === 2 ? '不可调度' : '可调度' }}
               </span>
            </div>

            <div class="hc-section metrics-section">
              <div class="hc-metric-item">
                <div class="m-label-row">
                  <span class="m-lbl">CPU</span>
                  <span class="m-val" :class="valColor(node.cpuUsge)">{{ formatPercent(node.cpuUsge) }}</span>
                </div>
                <div class="m-bar-track"><i :style="{ width: formatPercent(node.cpuUsge) }" :class="valColor(node.cpuUsge)"></i></div>
              </div>
              <div class="hc-metric-item">
                <div class="m-label-row">
                  <span class="m-lbl">内存</span>
                  <span class="m-val" :class="valColor(node.memoryUsge)">{{ formatPercent(node.memoryUsge) }}</span>
                </div>
                <div class="m-bar-track"><i :style="{ width: formatPercent(node.memoryUsge) }" :class="valColor(node.memoryUsge)"></i></div>
              </div>
               <div class="hc-metric-item">
                <div class="m-label-row">
                  <span class="m-lbl">Pod</span>
                  <span class="m-val pod-count"><strong>{{ node.podUsge }}</strong>/{{ node.podTotal }}</span>
                </div>
                <div class="m-bar-track"><i :style="{ width: percentCalc(node.podUsge, node.podTotal) }" class="blue"></i></div>
              </div>
            </div>

            <div class="hc-section actions-section">
               <div class="action-btn-group">
                 <button class="a-btn outline" title="管理"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> 管理</button>
                 <button class="a-btn outline" title="监控"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> 监控</button>
                 <button class="a-btn primary" @click="openDetail(node.id)" title="详情"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> 详情</button>
               </div>
            </div>

          </div>
        </article>
      </section>

      <section v-else class="saas-table-wrap">
        <table class="saas-table">
          <thead>
            <tr>
              <th>节点名称 / IP</th>
              <th>状态</th>
              <th>角色 / 架构</th>
              <th>资源使用率 (CPU / Mem)</th>
              <th>Pod 分配</th>
              <th>调度状态</th>
              <th class="align-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="node in filteredNodes" :key="`table-${node.id}`">
              <td>
                <div class="cell-stack">
                  <span class="t-main">{{ node.nodeName }}</span>
                  <span class="t-sub">{{ node.nodeIp }}</span>
                </div>
              </td>
              <td>
                <div class="t-status-pill" :class="statusClass(node.nodeStatus)">
                  <i class="dot"></i> {{ node.nodeStatus === 'Ready' ? '运行中' : '未就绪' }}
                </div>
              </td>
              <td>
                <div class="cell-stack">
                  <span>{{ node.nodeRole || "Worker" }}</span>
                  <span class="t-sub">{{ node.architecture || "amd64" }}</span>
                </div>
              </td>
              <td>
                <span class="t-mono">CPU: {{ formatPercent(node.cpuUsge) }} | Mem: {{ formatPercent(node.memoryUsge) }}</span>
              </td>
              <td><span class="t-mono">{{ node.podUsge }} / {{ node.podTotal }}</span></td>
              <td>
                <span class="t-schedule-pill" :class="node.unschedulable === 2 ? 'danger' : 'ok'">
                  {{ node.unschedulable === 2 ? "不可调度" : "可调度" }}
                </span>
              </td>
              <td class="align-right">
                <button class="t-action-btn" @click.stop="openDetail(node.id)">详情</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <div v-if="filteredNodes.length === 0" class="empty-block">
        <span class="empty-icon">📭</span>
        <p>当前筛选条件下没有匹配的节点</p>
      </div>

    </main>

    <transition name="drawer-anim">
      <div v-if="nodeDetail" class="drawer-backdrop" @click.self="closeDetail">
        <div class="drawer-container">
          <header class="drawer-head">
            <h3>节点详细信息</h3>
            <button class="drawer-close" @click="closeDetail">✕</button>
          </header>
          <div class="drawer-scroll-body">
            <NodeManagementDetail :detail="nodeDetail" :loading="detailLoading" />
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from "vue";
import { listNodesMetricsApi, type NodeMetricItem } from "../../../api/console/monitor";
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

// 搜索控制
const keyword = ref("");
const searchActive = ref(false);
const searchInputRef = ref<HTMLInputElement | null>(null);

const loadingNodes = ref(false);
const detailLoading = ref(false);
const errorMsg = ref("");
const viewMode = ref<"card" | "table">("card");

const nodeDetail = ref<ClusterNodeDetail | null>(null);

// 切换搜索框展开/收起
function toggleSearch() {
  if (searchActive.value) {
    if (!keyword.value) {
      searchActive.value = false; // 只有在内容为空时才收起
    }
  } else {
    searchActive.value = true;
    nextTick(() => {
      searchInputRef.value?.focus();
    });
  }
}

const filteredNodes = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  if (!q) return nodes.value;
  return nodes.value.filter((item) => {
    return item.nodeName.toLowerCase().includes(q) || item.nodeIp.toLowerCase().includes(q);
  });
});

function statusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "ready") return "ready";
  return "not-ready";
}

function valColor(v: number): string {
  if (v > 80) return "red";
  if (v > 50) return "orange";
  return "blue";
}

function formatPercent(v: number): string {
  if (!Number.isFinite(v)) return "0.0%";
  const safe = Math.max(0, Math.min(100, v));
  return `${safe.toFixed(1)}%`;
}

function percentCalc(usage: number, total: number): string {
  if (!total || total === 0) return "0%";
  const p = (usage / total) * 100;
  return `${p.toFixed(1)}%`;
}

function formatDate(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return "2025/9/21";
  const date = new Date(unixSeconds * 1000);
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  return `${yyyy}/${mm}/${dd}`;
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
    const [res, metricsRes] = await Promise.all([
      getNodeListApi({
        clusterUuid: selectedClusterUuid.value,
        page: 1,
        pageSize: 50,
        orderField: "id",
        isAsc: false
      }),
      listNodesMetricsApi({ clusterUuid: selectedClusterUuid.value }).catch(() => null)
    ]);

    const baseNodes = res.items ?? [];
    total.value = res.total ?? baseNodes.length;

    if (!metricsRes || !Array.isArray(metricsRes.items) || metricsRes.items.length === 0) {
      nodes.value = baseNodes;
      return;
    }

    nodes.value = mergeRealtimeMetrics(baseNodes, metricsRes.items);
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "加载节点失败";
  } finally {
    loadingNodes.value = false;
  }
}

function mergeRealtimeMetrics(baseNodes: ClusterNodeInfo[], metricItems: NodeMetricItem[]): ClusterNodeInfo[] {
  const byNodeName = new Map<string, NodeMetricItem>();
  const byIP = new Map<string, NodeMetricItem>();
  const byInstanceHost = new Map<string, NodeMetricItem>();

  for (const item of metricItems) {
    const nodeName = item.nodeName?.trim().toLowerCase();
    if (nodeName) byNodeName.set(nodeName, item);

    const ip = item.internalIp?.trim();
    if (ip) byIP.set(ip, item);

    const instanceHost = extractHost(item.instance);
    if (instanceHost) byInstanceHost.set(instanceHost, item);
  }

  return baseNodes.map((node) => {
    const nodeNameKey = node.nodeName?.trim().toLowerCase();
    const ipKey = node.nodeIp?.trim();
    const metric =
      (nodeNameKey ? byNodeName.get(nodeNameKey) : undefined) ||
      (ipKey ? byIP.get(ipKey) : undefined) ||
      (ipKey ? byInstanceHost.get(ipKey) : undefined);

    if (!metric) return node;

    return {
      ...node,
      cpuUsge: normalizePercent(metric.cpuUsage, node.cpuUsge),
      memoryUsge: normalizePercent(metric.memoryUsage, node.memoryUsge),
      nodeStatus: metric.ready ? "Ready" : "NotReady",
      nodeIp: node.nodeIp || metric.internalIp || node.nodeIp
    };
  });
}

function extractHost(instance: string): string {
  const raw = instance?.trim();
  if (!raw) return "";
  const [host] = raw.split(":");
  return host?.trim() || "";
}

function normalizePercent(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, value));
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

function closeDetail() {
  nodeDetail.value = null;
}

async function handleClusterChange(): Promise<void> {
  closeDetail();
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
@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono&display=swap');

/* ================= 全局 & 变量 ================= */
.saas-node-layout {
  --c-text-main: #111827;
  --c-text-sub: #6b7280;
  --c-border: #e5e7eb;
  --c-bg-main: #f9fafb;
  --c-bg-card: #ffffff;
  
  /* 截图状态色系 */
  --c-blue: #3b82f6;
  --c-blue-light: #eff6ff;
  --c-green: #10b981;
  --c-green-light: #ecfdf5;
  --c-red: #ef4444;
  --c-red-light: #fef2f2;
  --c-orange: #f59e0b;

  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--c-text-main);
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

/* ================= 顶部栏 (复刻图片一) ================= */
.saas-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--c-border);
  flex-wrap: wrap;
  gap: 16px;
}

.bar-left { display: flex; align-items: center; gap: 16px; }

/* 下拉框 */
.cluster-select-box {
  position: relative;
  display: flex;
  align-items: center;
}
.cluster-select-box select {
  appearance: none; background: transparent; border: none; outline: none;
  font-size: 16px; font-weight: 500; color: var(--c-text-main);
  padding-right: 20px; cursor: pointer;
}
.dropdown-arrow { position: absolute; right: 0; color: var(--c-text-sub); pointer-events: none; font-size: 12px;}

/* 视图切换按钮组合 */
.view-switcher-group {
  display: flex;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  overflow: hidden;
}
.switch-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; border: none; background: #ffffff;
  font-size: 13px; font-weight: 500; color: var(--c-text-sub); cursor: pointer; transition: all 0.2s;
}
.switch-btn:first-child { border-right: 1px solid var(--c-border); }
.switch-btn.active { background: var(--c-blue); color: #ffffff; }

.outline-refresh-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; border: 1px solid var(--c-border); border-radius: 6px;
  background: #ffffff; font-size: 13px; color: var(--c-text-sub); cursor: pointer; transition: all 0.2s;
}
.outline-refresh-btn:hover { background: var(--c-bg-main); color: var(--c-text-main);}

/* 右侧图标组 */
.bar-right { display: flex; align-items: center; gap: 12px; }
.icon-tools-container { display: flex; gap: 8px; align-items: center; }
.tool-btn {
  width: 36px; height: 36px; border-radius: 8px; border: none;
  background: #f3f4f6; color: #4b5563; display: grid; place-items: center;
  cursor: pointer; transition: all 0.2s;
}
.tool-btn:hover { background: #e5e7eb; color: #111827; }

/* 伸缩搜索框 */
.expandable-search {
  display: flex; align-items: center;
  background: #f3f4f6; border-radius: 8px;
  overflow: hidden; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 36px; /* 初始只显示按钮宽度 */
}
.expandable-search.is-expanded {
  width: 260px; background: #ffffff; border: 1px solid var(--c-border);
}
.expandable-search input {
  flex: 1; border: none; background: transparent; outline: none;
  padding-left: 12px; font-size: 13px; width: 0; opacity: 0; transition: opacity 0.2s;
}
.expandable-search.is-expanded input { width: 100%; opacity: 1; }
.expandable-search .search-trigger {
  background: transparent; /* 展开后融入整体 */
}

/* ================= 提示加载 ================= */
.global-alert { padding: 12px 16px; border-radius: 8px; font-size: 14px; }
.global-alert.error { background: var(--c-red-light); color: var(--c-red); }
.global-loading { padding: 60px 0; text-align: center; color: var(--c-text-sub); font-size: 14px;}
.loader-ring { display: inline-block; width: 24px; height: 24px; border: 2px solid var(--c-border); border-top-color: var(--c-blue); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 12px;}
@keyframes spin { to { transform: rotate(360deg); } }


/* ================= 宽幅横向卡片视图 ================= */
.horizontal-card-list { display: flex; flex-direction: column; gap: 16px; }

.horizontal-node-card {
  background: var(--c-bg-card);
  border-radius: 10px;
  border: 1px solid var(--c-border);
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  position: relative;
  transition: box-shadow 0.2s, transform 0.2s;
}
.horizontal-node-card:hover { box-shadow: 0 6px 16px rgba(0,0,0,0.08); transform: translateY(-1px); }

/* 左侧状态边线 (代替顶部状态线) */
.horizontal-node-card::before {
  content: ''; position: absolute; left: -1px; top: -1px; bottom: -1px; width: 4px; border-radius: 10px 0 0 10px;
}
.horizontal-node-card.ready::before { background-color: var(--c-green); }
.horizontal-node-card.not-ready::before { background-color: var(--c-red); }

/* 卡片内部网格布局 */
.card-content-layout {
  display: flex;
  align-items: stretch;
  padding: 16px 24px;
  gap: 24px;
}

.hc-section { display: flex; flex-direction: column; justify-content: center; }

/* 1. 左侧基础信息 */
.info-section { flex: 1.5; flex-direction: row; gap: 16px; align-items: center; min-width: 240px; }
.hc-icon-wrapper {
  width: 48px; height: 48px; border-radius: 12px; display: grid; place-items: center; color: #fff; flex-shrink: 0;
}
.hc-icon-wrapper.ready { background: var(--c-blue); }
.hc-icon-wrapper.not-ready { background: var(--c-text-sub); }

.hc-text-content { display: flex; flex-direction: column; gap: 4px; }
.hc-title-row h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--c-text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
.hc-ip { margin: 0; font-size: 13px; color: var(--c-text-sub); font-family: "Roboto Mono", monospace;}
.hc-meta-info { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #9ca3af; margin-top: 4px;}
.hc-meta-info span { display: flex; align-items: center; gap: 4px;}
.hc-meta-info .divider { width: 1px; height: 10px; background: var(--c-border); }

/* 2. 中左标签区 */
.tags-section { flex: 0.8; gap: 8px; align-items: flex-start; min-width: 120px;}
.hc-tag { font-size: 12px; font-weight: 500; display: inline-flex; align-items: center; gap: 4px;}
.hc-tag.role { background: var(--c-blue); color: #fff; padding: 2px 10px; border-radius: 12px; }
.hc-tag.status .dot { width: 6px; height: 6px; border-radius: 50%; }
.hc-tag.status.ready { color: var(--c-green); }
.hc-tag.status.ready .dot { background: var(--c-green); }
.hc-tag.status.not-ready { color: var(--c-red); }
.hc-tag.status.not-ready .dot { background: var(--c-red); }
.hc-tag.schedule { padding: 2px 8px; border-radius: 4px;}
.hc-tag.schedule.ok { color: var(--c-green); border: 1px solid rgba(16, 185, 129, 0.3); background: var(--c-green-light); }
.hc-tag.schedule.danger { color: var(--c-red); border: 1px solid rgba(239, 68, 68, 0.3); background: var(--c-red-light); }

/* 3. 中右资源指标区 */
.metrics-section { flex: 2; gap: 10px; border-left: 1px solid var(--c-border); border-right: 1px solid var(--c-border); padding: 0 32px; min-width: 240px; justify-content: center;}
.hc-metric-item { display: flex; flex-direction: column; gap: 4px; }
.m-label-row { display: flex; justify-content: space-between; align-items: baseline; }
.m-lbl { font-size: 12px; color: var(--c-text-sub); }
.m-val { font-size: 12px; font-family: "Roboto Mono", monospace; font-weight: 600; }
.m-val.red { color: var(--c-red); }
.m-val.orange { color: var(--c-orange); }
.m-val.blue { color: var(--c-blue); }
.m-val.pod-count { color: var(--c-text-sub); font-weight: 400;}
.m-val.pod-count strong { color: var(--c-text-main); font-weight: 600;}
.m-bar-track { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; width: 100%;}
.m-bar-track i { display: block; height: 100%; border-radius: 3px; }
.m-bar-track i.red { background: var(--c-red); }
.m-bar-track i.orange { background: var(--c-orange); }
.m-bar-track i.blue { background: var(--c-blue); }

/* 4. 右侧操作区 */
.actions-section { flex: 0.6; min-width: 140px; align-items: flex-end;}
.action-btn-group { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.a-btn { 
  display: flex; align-items: center; justify-content: center; gap: 6px;
  height: 32px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; width: 100%;
}
.a-btn.outline { background: transparent; border: 1px solid var(--c-border); color: #4b5563; }
.a-btn.outline:hover { background: #f3f4f6; color: var(--c-text-main); }
.a-btn.primary { background: var(--c-blue); border: 1px solid var(--c-blue); color: #fff; }
.a-btn.primary:hover { background: #2563eb; }
.a-btn svg { opacity: 0.8; }


/* ================= 列表视图 ================= */
.saas-table-wrap {
  border: 1px solid var(--c-border); border-radius: 8px; overflow-x: auto; background: #fff;
}
.saas-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
.saas-table th, .saas-table td { padding: 14px 20px; border-bottom: 1px solid var(--c-border); text-align: left; font-size: 13px;}
.saas-table th { background: #f9fafb; color: var(--c-text-sub); font-weight: 500; }
.saas-table tr:hover td { background: #f9fafb; }
.align-right { text-align: right; }

.cell-stack { display: flex; flex-direction: column; gap: 4px; }
.t-main { font-weight: 500; color: var(--c-text-main); font-size: 14px;}
.t-sub { color: var(--c-text-sub); }
.t-mono { font-family: "Roboto Mono", monospace; }

.t-status-pill { display: inline-flex; align-items: center; gap: 6px; }
.t-status-pill .dot { width: 8px; height: 8px; border-radius: 50%; }
.t-status-pill.ready { color: var(--c-green); }
.t-status-pill.ready .dot { background: var(--c-green); }
.t-status-pill.not-ready { color: var(--c-red); }
.t-status-pill.not-ready .dot { background: var(--c-red); }

.t-schedule-pill { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
.t-schedule-pill.ok { color: var(--c-green); border: 1px solid rgba(16, 185, 129, 0.3); background: var(--c-green-light); }
.t-schedule-pill.danger { color: var(--c-red); border: 1px solid rgba(239, 68, 68, 0.3); background: var(--c-red-light); }

.t-action-btn { background: transparent; border: none; color: var(--c-blue); cursor: pointer; font-weight: 500; font-size: 13px;}
.t-action-btn:hover { text-decoration: underline; }

/* ================= 抽屉面板 ================= */
.drawer-backdrop {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4);
  z-index: 1000; display: flex; justify-content: flex-end; backdrop-filter: blur(2px);
}
.drawer-container {
  width: 640px; max-width: 90vw; background: var(--c-bg-main); height: 100%;
  box-shadow: -8px 0 32px rgba(0,0,0,0.1); display: flex; flex-direction: column;
}
.drawer-head {
  padding: 24px; background: #fff; border-bottom: 1px solid var(--c-border);
  display: flex; justify-content: space-between; align-items: center;
}
.drawer-head h3 { margin: 0; font-size: 18px; font-weight: 600; color: var(--c-text-main); }
.drawer-close { background: #f3f4f6; border: none; width: 32px; height: 32px; border-radius: 50%; color: var(--c-text-sub); cursor: pointer; display: grid; place-items: center;}
.drawer-close:hover { background: #e5e7eb; color: var(--c-text-main); }
.drawer-scroll-body { flex: 1; overflow-y: auto; padding: 24px; }

.drawer-anim-enter-active, .drawer-anim-leave-active { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s; }
.drawer-anim-enter-from, .drawer-anim-leave-to { transform: translateX(100%); opacity: 0; }

/* 响应式调整 */
@media (max-width: 1200px) {
  .card-content-layout { flex-wrap: wrap; }
  .metrics-section { border-left: none; border-right: none; padding: 16px 0 0; border-top: 1px solid var(--c-border); flex-basis: 100%; order: 3; }
  .actions-section { flex-direction: row; flex-basis: 100%; order: 4; justify-content: flex-start; margin-top: 16px;}
  .action-btn-group { flex-direction: row; width: auto; }
  .a-btn { padding: 0 16px; width: auto;}
}

@media (max-width: 768px) {
  .saas-topbar { flex-direction: column; align-items: flex-start; }
  .bar-right { width: 100%; justify-content: flex-end; }
  .info-section { flex-direction: column; align-items: flex-start; }
}
</style>
