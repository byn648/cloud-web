<template>
  <div class="energy-page">
    <header class="page-head">
      <div>
        <h2>{{ pageTitle }}</h2>
        <p>
          {{ pageDescription }}
        </p>
      </div>
      <div class="head-tags">
        <span class="tag">账号：{{ currentUserName }}</span>
        <span class="tag">可见集群：{{ visibleClusterCount }}</span>
        <span class="tag accent">{{ mode === "overview" ? "实时数据" : "实时异常检测" }}</span>
      </div>
    </header>

    <section v-if="mode === 'overview'" class="summary-grid">
      <article class="summary-card">
        <span class="label">可见集群数</span>
        <strong>{{ overviewSummary.clusterCount }}</strong>
        <small>当前账号权限范围</small>
      </article>
      <article class="summary-card">
        <span class="label">Pod 当前总功率</span>
        <strong>{{ overviewSummary.podCurrentPowerWatts }} W</strong>
        <small>所有可见集群 Pod 聚合</small>
      </article>
      <article class="summary-card">
        <span class="label">Pod 总能耗</span>
        <strong>{{ overviewSummary.podEnergyKwh }} kWh</strong>
        <small>默认近 24 小时</small>
      </article>
      <article class="summary-card">
        <span class="label">Node 总能耗</span>
        <strong>{{ overviewSummary.nodeEnergyKwh }} kWh</strong>
        <small>默认近 24 小时</small>
      </article>
    </section>

    <section v-else class="summary-grid">
      <article class="summary-card">
        <span class="label">异常事件数</span>
        <strong>{{ anomalySummary.totalEvents }}</strong>
        <small>近 24 小时</small>
      </article>
      <article class="summary-card">
        <span class="label">高风险服务</span>
        <strong>{{ anomalySummary.highRiskServices }}</strong>
        <small>严重等级告警</small>
      </article>
      <article class="summary-card">
        <span class="label">涉及集群</span>
        <strong>{{ anomalySummary.relatedClusters }}</strong>
        <small>账号可见范围</small>
      </article>
      <article class="summary-card">
        <span class="label">估算额外能耗</span>
        <strong>{{ anomalySummary.extraPowerKwh }} kWh</strong>
        <small>近 24 小时</small>
      </article>
    </section>

    <section v-if="mode === 'overview'" class="overview-wrap">
      <div class="panel">
        <div class="panel-head">
          <h3>集群算电概览</h3>
          <span>当前账号可见范围（Pod + Node）</span>
        </div>
        <div v-if="overviewLoading" class="overview-placeholder">正在加载能耗数据...</div>
        <div v-else-if="overviewError" class="overview-placeholder error">{{ overviewError }}</div>
        <div v-else-if="clusterOverviewRows.length === 0" class="overview-placeholder">当前账号暂无可展示集群能耗数据</div>
        <div v-else class="cluster-grid">
          <article v-for="item in clusterOverviewRows" :key="item.clusterUuid" class="cluster-card">
            <h4>{{ item.cluster }}</h4>
            <p>环境：{{ item.environment || "-" }}</p>
            <p class="cluster-hint">层级关系：Cluster -> Node -> Pod</p>
            <p>节点规模：{{ displayCount(item.nodeTotal) }}（Ready {{ displayCount(item.nodeReady) }}）</p>
            <p>Pod 规模：运行 {{ displayCount(item.podRunning) }} / 容量 {{ displayCount(item.podCapacity) }}</p>
            <p>集群内 Pod 当前总功率：{{ item.podCurrentPowerW }} W</p>
            <p>集群内 Pod 总能耗：{{ item.podEnergyKwh }} kWh</p>
            <p>集群内 Node 当前总功率：{{ item.nodeCurrentPowerW }} W</p>
            <p class="warn">集群内 Node 总能耗：{{ item.nodeEnergyKwh }} kWh</p>
            <button type="button" class="toggle-detail-btn" @click="toggleClusterDetail(item.clusterUuid)">
              {{ isClusterExpanded(item.clusterUuid) ? "收起 Node/Pod 明细" : "展开 Node/Pod 明细" }}
            </button>
            <section v-if="isClusterExpanded(item.clusterUuid)" class="node-pod-detail">
              <div v-if="getClusterDetail(item.clusterUuid)?.loading" class="detail-placeholder">
                正在加载 Node/Pod 明细...
              </div>
              <div v-else-if="getClusterDetail(item.clusterUuid)?.error" class="detail-placeholder error">
                {{ getClusterDetail(item.clusterUuid)?.error }}
              </div>
              <div
                v-else-if="(getClusterDetail(item.clusterUuid)?.nodes.length ?? 0) === 0"
                class="detail-placeholder"
              >
                暂无 Node/Pod 明细（可能该集群未采集到 node-monitor 指标）
              </div>
              <div v-else class="node-detail-list">
                <article
                  v-for="node in getClusterDetail(item.clusterUuid)?.nodes ?? []"
                  :key="`${item.clusterUuid}-${node.nodeName}`"
                  class="node-detail-card"
                >
                  <div class="node-detail-head">
                    <strong>{{ node.nodeName }}</strong>
                    <span class="node-state" :class="node.ready ? 'ready' : 'not-ready'">
                      {{ node.ready ? "Ready" : "NotReady" }}
                    </span>
                  </div>
                  <p>角色：{{ node.nodeRole || "-" }}，地址：{{ node.nodeIp || "-" }}</p>
                  <p>
                    Pod：运行 {{ node.runningPods }} / 总数 {{ node.totalPods }}，Pending {{ node.pendingPods }}，Failed
                    {{ node.failedPods }}
                  </p>
                  <button
                    type="button"
                    class="node-pod-toggle-btn"
                    :disabled="node.pods.length === 0"
                    @click="toggleNodePods(item.clusterUuid, node.nodeName)"
                  >
                    {{
                      node.pods.length === 0
                        ? "当前无可展示 Pod"
                        : isNodeExpanded(item.clusterUuid, node.nodeName)
                          ? `收起 Pod 列表（${node.pods.length}）`
                          : `展开 Pod 列表（${node.pods.length}）`
                    }}
                  </button>
                  <div
                    v-if="node.pods.length > 0 && isNodeExpanded(item.clusterUuid, node.nodeName)"
                    class="pod-list"
                  >
                    <div
                      v-for="pod in node.pods"
                      :key="`${node.nodeName}-${pod.namespace}-${pod.podName}`"
                      class="pod-row"
                    >
                      <div class="pod-row-head">
                        <span class="pod-row-name">{{ pod.namespace }}/{{ pod.podName }}</span>
                        <span class="pod-row-phase">{{ pod.phase || "Unknown" }}</span>
                      </div>
                      <div class="pod-row-energy">
                        功率 {{ pod.podCurrentPowerWatts.toFixed(2) }} W · 24h能耗
                        {{ joulesToKwh(pod.podEnergyDeltaJoules) }} kWh
                      </div>
                    </div>
                  </div>
                  <p v-if="node.error" class="error-text">提示：{{ node.error }}</p>
                </article>
              </div>
            </section>
            <p v-if="item.structureError" class="error-text">提示：{{ item.structureError }}</p>
            <p v-if="item.error" class="error-text">提示：{{ item.error }}</p>
          </article>
        </div>
      </div>
    </section>

    <section v-else class="anomaly-wrap">
      <div class="panel">
        <div class="panel-head">
          <h3>微服务算电异常清单</h3>
          <span>实时接口：/console/v1/node-monitor/microservice-anomaly</span>
        </div>
        <div class="filter-row">
          <label>
            集群
            <select v-model="filters.clusterUuid" @change="handleAnomalyClusterChange">
              <option value="">全部</option>
              <option v-for="cluster in anomalyClusterOptions" :key="cluster.clusterUuid" :value="cluster.clusterUuid">
                {{ cluster.clusterName }}
              </option>
            </select>
          </label>
          <label>
            Node
            <select v-model="filters.nodeName" :disabled="!filters.clusterUuid" @change="loadAnomalyRows">
              <option value="">全部</option>
              <option v-for="nodeName in anomalyNodeOptions" :key="nodeName" :value="nodeName">
                {{ nodeName }}
              </option>
            </select>
          </label>
          <label>
            风险等级
            <select v-model="filters.severity">
              <option value="">全部</option>
              <option value="critical">严重</option>
              <option value="warning">告警</option>
              <option value="info">提示</option>
            </select>
          </label>
          <label class="keyword">
            服务关键词
            <input v-model.trim="filters.keyword" placeholder="如：api-gateway / worker" />
          </label>
        </div>
        <div v-if="anomalyLoading" class="overview-placeholder">正在加载微服务异常数据...</div>
        <div v-else-if="anomalyError" class="overview-placeholder error">{{ anomalyError }}</div>
        <div v-else-if="anomalyWarnings.length > 0" class="warning-list">
          <p v-for="warning in anomalyWarnings" :key="warning">{{ warning }}</p>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>集群</th>
                <th>Node</th>
                <th>命名空间 / 服务</th>
                <th>异常类型</th>
                <th>风险等级</th>
                <th>当前功耗</th>
                <th>基线功耗</th>
                <th>额外能耗(24h)</th>
                <th>最近检测</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredRows.length === 0">
                <td colspan="9" class="empty">当前筛选条件下暂无数据</td>
              </tr>
              <tr v-for="row in filteredRows" v-else :key="row.id">
                <td>{{ row.cluster }}</td>
                <td>{{ row.nodeName }}</td>
                <td>
                  <div>{{ row.namespace }} / {{ row.service }}</div>
                  <small class="workload-text">归属：{{ row.workload || "-" }}</small>
                </td>
                <td>
                  <div>{{ row.anomalyType }}</div>
                  <small class="anomaly-reason">{{ row.reason }}</small>
                </td>
                <td>
                  <span class="severity" :class="row.severity">
                    {{ severityLabel(row.severity) }}
                  </span>
                </td>
                <td>{{ row.currentPowerW.toFixed(2) }} W</td>
                <td>{{ row.baselinePowerW.toFixed(2) }} W</td>
                <td>{{ row.extraPowerKwh }} kWh</td>
                <td>{{ row.detectedAt }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel ranking-panel">
        <div class="panel-head">
          <h3>异常服务排行</h3>
          <span>按额外能耗排序</span>
        </div>
        <ul class="ranking-list">
          <li v-for="item in topExtraPowerServices" :key="item.name">
            <div>
              <strong>{{ item.name }}</strong>
              <p>{{ item.cluster }}</p>
            </div>
            <span>{{ item.extraPowerKwh }} kWh</span>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  getClusterOverviewApi,
  getNodeMicroserviceAnomalyApi,
  getNodePodsApi,
  listNodesMetricsApi,
  getScopedClusterEnergyOverviewApi,
  type ScopedClusterEnergyOverview
} from "../../../api/console/monitor";
import {
  getClusterResourceInfoApi,
  searchClusterApi,
  type SearchClusterResponse
} from "../../../api/manager/cluster";
import { getNodeListApi } from "../../../api/manager/node";

type Severity = "critical" | "warning" | "info";
type ViewMode = "overview" | "anomaly";

interface EnergyAnomalyRow {
  id: string;
  clusterUuid: string;
  cluster: string;
  nodeName: string;
  namespace: string;
  service: string;
  workload: string;
  anomalyType: string;
  reason: string;
  severity: Severity;
  currentPowerW: number;
  baselinePowerW: number;
  extraPowerKwh: number;
  deltaPercent: number;
  detectedAt: string;
}

interface ClusterStructureSummary {
  nodeTotal: number | null;
  nodeReady: number | null;
  podRunning: number | null;
  podCapacity: number | null;
  error: string;
}

interface NodePodBriefItem {
  namespace: string;
  podName: string;
  phase: string;
  podCurrentPowerWatts: number;
  podEnergyDeltaJoules: number;
}

interface NodeDetailItem {
  nodeName: string;
  nodeIp: string;
  nodeRole: string;
  ready: boolean;
  totalPods: number;
  runningPods: number;
  pendingPods: number;
  failedPods: number;
  pods: NodePodBriefItem[];
  error: string;
}

interface ClusterNodeDetailState {
  loading: boolean;
  loaded: boolean;
  error: string;
  nodes: NodeDetailItem[];
}

interface ClusterOption {
  clusterUuid: string;
  clusterName: string;
}

const props = withDefaults(
  defineProps<{
    mode?: ViewMode;
  }>(),
  {
    mode: "anomaly"
  }
);

const filters = reactive({
  clusterUuid: "",
  nodeName: "",
  severity: "",
  keyword: ""
});

const overviewLoading = ref(false);
const overviewError = ref("");
const scopedEnergyOverview = ref<ScopedClusterEnergyOverview | null>(null);
const clusterStructureMap = ref<Record<string, ClusterStructureSummary>>({});
const clusterDetailMap = ref<Record<string, ClusterNodeDetailState>>({});
const expandedClusterMap = ref<Record<string, boolean>>({});
const expandedNodeMap = ref<Record<string, boolean>>({});
const anomalyLoading = ref(false);
const anomalyError = ref("");
const anomalyWarnings = ref<string[]>([]);
const anomalyRows = ref<EnergyAnomalyRow[]>([]);
const anomalyClusterOptions = ref<ClusterOption[]>([]);
const anomalyNodeOptions = ref<string[]>([]);
const MANAGER_MAX_PAGE_SIZE = 200;
const POD_ENERGY_WINDOW_HOURS = 24;
const ANOMALY_MAX_ITEMS = 500;
const ANOMALY_MIN_POWER_WATTS = 0.05;
const ANOMALY_CLUSTER_MAX_PAGES = 20;
const CLUSTER_OPTION_PAGE_CONCURRENCY = 4;
const CLUSTER_STRUCTURE_CONCURRENCY = 4;
const CLUSTER_STRUCTURE_CACHE_TTL_MS = 60_000;
const ANOMALY_NODE_CACHE_TTL_MS = 60_000;

const overviewRequestSeq = ref(0);
const anomalyRowsRequestSeq = ref(0);
const clusterStructureCache = new Map<string, { expiresAt: number; value: ClusterStructureSummary }>();
const anomalyNodeOptionCache = new Map<string, { expiresAt: number; value: string[] }>();

const currentUserName = computed(() => {
  try {
    const raw = localStorage.getItem("userInfo");
    if (!raw) return "unknown";
    const parsed = JSON.parse(raw) as { username?: string };
    return parsed.username?.trim() || "unknown";
  } catch (error) {
    console.error("parse userInfo failed", error);
    return "unknown";
  }
});

const visibleClusterCount = computed(() => {
  if (props.mode === "overview") {
    return scopedEnergyOverview.value?.summary.clusterCount ?? 0;
  }
  return anomalyClusterOptions.value.length;
});

const filteredRows = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();
  return anomalyRows.value.filter((item) => {
    if (filters.clusterUuid && item.clusterUuid !== filters.clusterUuid) {
      return false;
    }
    if (filters.nodeName && item.nodeName !== filters.nodeName) {
      return false;
    }
    if (filters.severity && item.severity !== filters.severity) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    const searchable = `${item.cluster} ${item.nodeName} ${item.namespace} ${item.service} ${item.workload} ${item.anomalyType} ${item.reason}`.toLowerCase();
    return searchable.includes(keyword);
  });
});

const anomalySummary = computed(() => {
  const rows = filteredRows.value;
  const clusterSet = new Set(rows.map((item) => item.cluster));
  const serviceSet = new Set(
    rows
      .filter((item) => item.severity === "critical")
      .map((item) => `${item.namespace}/${item.workload || item.service}`)
  );
  const totalExtraPower = rows.reduce((acc, item) => acc + item.extraPowerKwh, 0);

  return {
    totalEvents: rows.length,
    highRiskServices: serviceSet.size,
    relatedClusters: clusterSet.size,
    extraPowerKwh: totalExtraPower.toFixed(1)
  };
});

const overviewSummary = computed(() => {
  const summary = scopedEnergyOverview.value?.summary;
  if (!summary) {
    return {
      clusterCount: 0,
      podCurrentPowerWatts: "0.00",
      podEnergyKwh: "0.000",
      nodeEnergyKwh: "0.000"
    };
  }

  return {
    clusterCount: summary.clusterCount,
    podCurrentPowerWatts: summary.podCurrentPowerWatts.toFixed(2),
    podEnergyKwh: joulesToKwh(summary.podEnergyDeltaJoules),
    nodeEnergyKwh: joulesToKwh(summary.nodeEnergyDeltaJoules)
  };
});

const clusterOverviewRows = computed(() => {
  return (scopedEnergyOverview.value?.items ?? []).map((item) => ({
    clusterUuid: item.clusterUuid,
    cluster: item.clusterName || item.clusterUuid,
    environment: item.environment,
    podCurrentPowerW: item.podCurrentPowerWatts.toFixed(2),
    podEnergyKwh: joulesToKwh(item.podEnergyDeltaJoules),
    nodeCurrentPowerW: item.nodeCurrentPowerWatts.toFixed(2),
    nodeEnergyKwh: joulesToKwh(item.nodeEnergyDeltaJoules),
    nodeTotal: clusterStructureMap.value[item.clusterUuid]?.nodeTotal ?? null,
    nodeReady: clusterStructureMap.value[item.clusterUuid]?.nodeReady ?? null,
    podRunning: clusterStructureMap.value[item.clusterUuid]?.podRunning ?? null,
    podCapacity: clusterStructureMap.value[item.clusterUuid]?.podCapacity ?? null,
    structureError: clusterStructureMap.value[item.clusterUuid]?.error ?? "",
    error: item.error || ""
  }));
});

const topExtraPowerServices = computed(() => {
  const aggregated = new Map<string, { name: string; cluster: string; extraPowerKwh: number }>();

  filteredRows.value.forEach((item) => {
    const workloadName = item.workload || item.service;
    const name = `${item.namespace}/${workloadName}`;
    const key = `${item.cluster}::${name}`;
    const existed = aggregated.get(key);
    if (existed) {
      existed.extraPowerKwh += item.extraPowerKwh;
      return;
    }
    aggregated.set(key, {
      name,
      cluster: item.cluster,
      extraPowerKwh: item.extraPowerKwh
    });
  });

  return Array.from(aggregated.values())
    .sort((a, b) => b.extraPowerKwh - a.extraPowerKwh)
    .slice(0, 6)
    .map((item) => ({
      name: item.name,
      cluster: item.cluster,
      extraPowerKwh: item.extraPowerKwh.toFixed(3)
    }));
});

const pageTitle = computed(() => {
  if (props.mode === "overview") {
    return "算电概览";
  }
  return "算力异常检测";
});

const pageDescription = computed(() => {
  if (props.mode === "overview") {
    return "展示当前账号可见集群范围内，所有 Pod 能耗与整机 Node 能耗汇总。";
  }
  return "展示当前账号可见集群范围内的微服务算电异常，支持按集群和 Node 筛选。";
});

function joulesToKwh(joules: number): string {
  return (joules / 3_600_000).toFixed(3);
}

function displayCount(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }
  return String(value);
}

function isClusterExpanded(clusterUuid: string): boolean {
  return Boolean(expandedClusterMap.value[clusterUuid]);
}

function getClusterDetail(clusterUuid: string): ClusterNodeDetailState | undefined {
  return clusterDetailMap.value[clusterUuid];
}

function nodeExpandKey(clusterUuid: string, nodeName: string): string {
  return `${clusterUuid}::${nodeName}`;
}

function isNodeExpanded(clusterUuid: string, nodeName: string): boolean {
  return Boolean(expandedNodeMap.value[nodeExpandKey(clusterUuid, nodeName)]);
}

function toggleNodePods(clusterUuid: string, nodeName: string): void {
  const key = nodeExpandKey(clusterUuid, nodeName);
  expandedNodeMap.value = {
    ...expandedNodeMap.value,
    [key]: !expandedNodeMap.value[key]
  };
}

function readClusterStructureCache(clusterUuid: string): ClusterStructureSummary | undefined {
  const cached = clusterStructureCache.get(clusterUuid);
  if (!cached) {
    return undefined;
  }
  if (Date.now() > cached.expiresAt) {
    clusterStructureCache.delete(clusterUuid);
    return undefined;
  }
  return cached.value;
}

function writeClusterStructureCache(clusterUuid: string, value: ClusterStructureSummary): void {
  clusterStructureCache.set(clusterUuid, {
    value,
    expiresAt: Date.now() + CLUSTER_STRUCTURE_CACHE_TTL_MS
  });
}

function readAnomalyNodeOptionCache(clusterUuid: string): string[] | undefined {
  const cached = anomalyNodeOptionCache.get(clusterUuid);
  if (!cached) {
    return undefined;
  }
  if (Date.now() > cached.expiresAt) {
    anomalyNodeOptionCache.delete(clusterUuid);
    return undefined;
  }
  return [...cached.value];
}

function writeAnomalyNodeOptionCache(clusterUuid: string, value: string[]): void {
  anomalyNodeOptionCache.set(clusterUuid, {
    value: [...value],
    expiresAt: Date.now() + ANOMALY_NODE_CACHE_TTL_MS
  });
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  if (tasks.length === 0) {
    return [];
  }
  const results: T[] = new Array(tasks.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= tasks.length) {
        return;
      }
      results[index] = await tasks[index]();
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchClusterPage(page: number): Promise<SearchClusterResponse> {
  return searchClusterApi({
    page,
    pageSize: MANAGER_MAX_PAGE_SIZE,
    orderStr: "id",
    isAsc: false
  });
}

async function loadClusterStructureSummary(
  items: ScopedClusterEnergyOverview["items"],
  reqSeq: number
): Promise<void> {
  const nextMap: Record<string, ClusterStructureSummary> = {};
  const pendingItems: ScopedClusterEnergyOverview["items"] = [];

  items.forEach((item) => {
    const cached = readClusterStructureCache(item.clusterUuid);
    if (cached) {
      nextMap[item.clusterUuid] = cached;
      return;
    }
    pendingItems.push(item);
  });

  if (pendingItems.length === 0) {
    if (reqSeq === overviewRequestSeq.value) {
      clusterStructureMap.value = nextMap;
    }
    return;
  }

  const clusterIdMap = new Map<string, number>();

  try {
    const firstPage = await fetchClusterPage(1);
    firstPage.items.forEach((item) => {
      if (item.uuid && item.id > 0) {
        clusterIdMap.set(item.uuid, item.id);
      }
    });

    const totalPages = Math.min(
      ANOMALY_CLUSTER_MAX_PAGES,
      Math.ceil((firstPage.total || firstPage.items.length) / MANAGER_MAX_PAGE_SIZE)
    );
    if (totalPages > 1) {
      const tasks: Array<() => Promise<SearchClusterResponse>> = [];
      for (let page = 2; page <= totalPages; page += 1) {
        tasks.push(() => fetchClusterPage(page));
      }
      const pages = await runWithConcurrency(tasks, CLUSTER_OPTION_PAGE_CONCURRENCY);
      pages.forEach((pageData) => {
        pageData.items.forEach((item) => {
          if (item.uuid && item.id > 0) {
            clusterIdMap.set(item.uuid, item.id);
          }
        });
      });
    }
  } catch (error) {
    console.error("load cluster id map failed", error);
  }

  const tasks: Array<() => Promise<ClusterStructureSummary>> = pendingItems.map((item) => {
    return async () => {
      let nodeTotal: number | null = null;
      let nodeReady: number | null = null;
      let podRunning: number | null = null;
      let podCapacity: number | null = null;
      const errors: string[] = [];

      try {
        const overview = await getClusterOverviewApi({ clusterUuid: item.clusterUuid });
        nodeTotal = overview.nodeTotal;
        nodeReady = overview.nodeReady;
        podRunning = overview.podRunning;
        podCapacity = overview.podCapacity;
      } catch (error) {
        console.error("load cluster structure summary failed", item.clusterUuid, error);
        errors.push(error instanceof Error ? error.message : "加载集群 Node/Pod 规模失败");
      }

      if ((nodeTotal ?? 0) <= 0) {
        try {
          const nodes = await getNodeListApi({
            page: 1,
            pageSize: MANAGER_MAX_PAGE_SIZE,
            orderField: "id",
            isAsc: false,
            clusterUuid: item.clusterUuid
          });
          if (nodes.items.length > 0) {
            nodeTotal = nodes.total || nodes.items.length;
            nodeReady = nodes.items.filter((node) => node.nodeStatus.toLowerCase() === "ready").length;
          }
        } catch (error) {
          console.error("fallback load manager node list failed", item.clusterUuid, error);
          errors.push(error instanceof Error ? error.message : "回退加载节点列表失败");
        }
      }

      if ((podCapacity ?? 0) <= 0) {
        const clusterId = clusterIdMap.get(item.clusterUuid);
        if (clusterId) {
          try {
            const resource = await getClusterResourceInfoApi(clusterId);
            if ((podCapacity ?? 0) <= 0) {
              podCapacity = resource.podsPhysicalCapacity;
            }
            if ((podRunning ?? 0) <= 0) {
              podRunning = resource.podsAllocatedTotal;
            }
          } catch (error) {
            console.error("fallback load cluster resource failed", item.clusterUuid, error);
            errors.push(error instanceof Error ? error.message : "回退加载集群资源失败");
          }
        }
      }

      return {
        nodeTotal,
        nodeReady,
        podRunning,
        podCapacity,
        error: errors.length > 0 ? errors[0] : ""
      };
    };
  });

  const summaries = await runWithConcurrency(tasks, CLUSTER_STRUCTURE_CONCURRENCY);
  pendingItems.forEach((item, index) => {
    const summary = summaries[index];
    nextMap[item.clusterUuid] = summary;
    writeClusterStructureCache(item.clusterUuid, summary);
  });

  if (reqSeq !== overviewRequestSeq.value) {
    return;
  }
  clusterStructureMap.value = nextMap;
}

async function ensureClusterDetail(clusterUuid: string): Promise<void> {
  const existed = clusterDetailMap.value[clusterUuid];
  if (existed?.loading || existed?.loaded) {
    return;
  }

  clusterDetailMap.value = {
    ...clusterDetailMap.value,
    [clusterUuid]: {
      loading: true,
      loaded: false,
      error: "",
      nodes: []
    }
  };

  try {
    const end = new Date();
    const start = new Date(end.getTime() - POD_ENERGY_WINDOW_HOURS * 60 * 60 * 1000);
    const podEnergyQueryRange = {
      start: start.toISOString(),
      end: end.toISOString()
    };

    let monitorNodes: Awaited<ReturnType<typeof listNodesMetricsApi>>["items"] = [];
    let monitorErr = "";

    try {
      const nodeList = await listNodesMetricsApi({ clusterUuid });
      monitorNodes = nodeList.items;
    } catch (error) {
      monitorErr = error instanceof Error ? error.message : "加载监控节点列表失败";
      console.error("load monitor node list failed", clusterUuid, error);
    }

    if (monitorNodes.length > 0) {
      const nodes = await Promise.all(
        monitorNodes.map(async (node): Promise<NodeDetailItem> => {
          try {
            const pods = await getNodePodsApi({
              clusterUuid,
              nodeName: node.nodeName,
              start: podEnergyQueryRange.start,
              end: podEnergyQueryRange.end
            });
            return {
              nodeName: node.nodeName,
              nodeIp: node.internalIp || node.instance || "",
              nodeRole: "",
              ready: node.ready,
              totalPods: pods.totalPods,
              runningPods: pods.runningPods,
              pendingPods: pods.pendingPods,
              failedPods: pods.failedPods,
              pods: pods.podList.map((item) => ({
                namespace: item.namespace,
                podName: item.podName,
                phase: item.phase,
                podCurrentPowerWatts: item.podCurrentPowerWatts,
                podEnergyDeltaJoules: item.podEnergyDeltaJoules
              })),
              error: ""
            };
          } catch (error) {
            console.error("load node pods failed", clusterUuid, node.nodeName, error);
            return {
              nodeName: node.nodeName,
              nodeIp: node.internalIp || node.instance || "",
              nodeRole: "",
              ready: node.ready,
              totalPods: 0,
              runningPods: 0,
              pendingPods: 0,
              failedPods: 0,
              pods: [],
              error: error instanceof Error ? error.message : "加载节点 Pod 失败"
            };
          }
        })
      );

      clusterDetailMap.value = {
        ...clusterDetailMap.value,
        [clusterUuid]: {
          loading: false,
          loaded: true,
          error: "",
          nodes
        }
      };
      return;
    }

    const managerNodeList = await getNodeListApi({
      page: 1,
      pageSize: MANAGER_MAX_PAGE_SIZE,
      orderField: "id",
      isAsc: false,
      clusterUuid
    });

    const nodes: NodeDetailItem[] = await Promise.all(
      managerNodeList.items.map(async (node): Promise<NodeDetailItem> => {
        const baseItem: NodeDetailItem = {
          nodeName: node.nodeName,
          nodeIp: node.nodeIp,
          nodeRole: node.nodeRole,
          ready: node.nodeStatus.toLowerCase() === "ready",
          totalPods: node.podTotal,
          runningPods: node.podUsge,
          pendingPods: 0,
          failedPods: 0,
          pods: [],
          error: monitorErr ? "监控侧未返回 Node 指标，已回退展示管理侧节点数据" : ""
        };

        try {
          const pods = await getNodePodsApi({
            clusterUuid,
            nodeName: node.nodeName,
            start: podEnergyQueryRange.start,
            end: podEnergyQueryRange.end
          });

          if (pods.totalPods > 0 || pods.podList.length > 0) {
            return {
              ...baseItem,
              totalPods: pods.totalPods,
              runningPods: pods.runningPods,
              pendingPods: pods.pendingPods,
              failedPods: pods.failedPods,
              pods: pods.podList.map((item) => ({
                namespace: item.namespace,
                podName: item.podName,
                phase: item.phase,
                podCurrentPowerWatts: item.podCurrentPowerWatts,
                podEnergyDeltaJoules: item.podEnergyDeltaJoules
              })),
              error: monitorErr
                ? "监控侧 Node 指标不可用，Pod 明细已回退查询"
                : ""
            };
          }

          return baseItem;
        } catch (error) {
          console.error("fallback load node pods failed", clusterUuid, node.nodeName, error);
          return {
            ...baseItem,
            error: error instanceof Error ? error.message : "加载节点 Pod 失败"
          };
        }
      })
    );

    clusterDetailMap.value = {
      ...clusterDetailMap.value,
      [clusterUuid]: {
        loading: false,
        loaded: true,
        error: "",
        nodes
      }
    };
  } catch (error) {
    console.error("load cluster node list fallback failed", clusterUuid, error);
    clusterDetailMap.value = {
      ...clusterDetailMap.value,
      [clusterUuid]: {
        loading: false,
        loaded: true,
        error: error instanceof Error ? error.message : "加载 Node/Pod 明细失败",
        nodes: []
      }
    };
  }
}

async function toggleClusterDetail(clusterUuid: string): Promise<void> {
  const expanded = isClusterExpanded(clusterUuid);
  expandedClusterMap.value = {
    ...expandedClusterMap.value,
    [clusterUuid]: !expanded
  };

  if (!expanded) {
    await ensureClusterDetail(clusterUuid);
  }
}

async function loadScopedEnergyOverview(): Promise<void> {
  if (props.mode !== "overview") {
    return;
  }

  const reqSeq = overviewRequestSeq.value + 1;
  overviewRequestSeq.value = reqSeq;
  overviewLoading.value = true;
  overviewError.value = "";
  try {
    const overview = await getScopedClusterEnergyOverviewApi();
    if (reqSeq !== overviewRequestSeq.value) {
      return;
    }
    scopedEnergyOverview.value = overview;
    clusterDetailMap.value = {};
    expandedClusterMap.value = {};
    expandedNodeMap.value = {};
    const items = scopedEnergyOverview.value?.items ?? [];
    const cachedStructureMap: Record<string, ClusterStructureSummary> = {};
    items.forEach((item) => {
      const cached = readClusterStructureCache(item.clusterUuid);
      if (cached) {
        cachedStructureMap[item.clusterUuid] = cached;
      }
    });
    clusterStructureMap.value = cachedStructureMap;
    void loadClusterStructureSummary(items, reqSeq);
  } catch (error) {
    if (reqSeq !== overviewRequestSeq.value) {
      return;
    }
    console.error("load scoped energy overview failed", error);
    overviewError.value = error instanceof Error ? error.message : "加载算电概览失败";
    scopedEnergyOverview.value = null;
    clusterStructureMap.value = {};
    clusterDetailMap.value = {};
    expandedClusterMap.value = {};
    expandedNodeMap.value = {};
  } finally {
    if (reqSeq === overviewRequestSeq.value) {
      overviewLoading.value = false;
    }
  }
}

function normalizeSeverity(value: string): Severity {
  if (value === "critical" || value === "warning" || value === "info") {
    return value;
  }
  return "info";
}

function formatDetectedAt(unixSeconds: number): string {
  if (!unixSeconds || Number.isNaN(unixSeconds)) {
    return "-";
  }
  const date = new Date(unixSeconds * 1000);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  const second = `${date.getSeconds()}`.padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

async function loadAnomalyClusterOptions(): Promise<void> {
  if (props.mode !== "anomaly") {
    return;
  }

  anomalyError.value = "";
  try {
    const optionMap = new Map<string, ClusterOption>();
    const firstPage = await fetchClusterPage(1);
    firstPage.items.forEach((item) => {
      if (!item.uuid) {
        return;
      }
      optionMap.set(item.uuid, {
        clusterUuid: item.uuid,
        clusterName: item.name || item.uuid
      });
    });

    const totalPages = Math.min(
      ANOMALY_CLUSTER_MAX_PAGES,
      Math.ceil((firstPage.total || firstPage.items.length) / MANAGER_MAX_PAGE_SIZE)
    );
    if (totalPages > 1) {
      const tasks: Array<() => Promise<SearchClusterResponse>> = [];
      for (let page = 2; page <= totalPages; page += 1) {
        tasks.push(() => fetchClusterPage(page));
      }
      const pages = await runWithConcurrency(tasks, CLUSTER_OPTION_PAGE_CONCURRENCY);
      pages.forEach((pageData) => {
        pageData.items.forEach((item) => {
          if (!item.uuid) {
            return;
          }
          optionMap.set(item.uuid, {
            clusterUuid: item.uuid,
            clusterName: item.name || item.uuid
          });
        });
      });
    }

    anomalyClusterOptions.value = Array.from(optionMap.values()).sort((a, b) =>
      a.clusterName.localeCompare(b.clusterName)
    );
    if (!anomalyClusterOptions.value.some((item) => item.clusterUuid === filters.clusterUuid)) {
      filters.clusterUuid = "";
      filters.nodeName = "";
    }

    await loadAnomalyNodeOptions();
    await loadAnomalyRows();
  } catch (error) {
    console.error("load anomaly cluster options failed", error);
    anomalyError.value = error instanceof Error ? error.message : "加载异常检测可见集群失败";
    anomalyClusterOptions.value = [];
    anomalyNodeOptions.value = [];
    anomalyRows.value = [];
    anomalyWarnings.value = [];
  }
}

async function loadAnomalyNodeOptions(): Promise<void> {
  if (props.mode !== "anomaly") {
    return;
  }
  if (!filters.clusterUuid) {
    anomalyNodeOptions.value = [];
    filters.nodeName = "";
    return;
  }

  const cached = readAnomalyNodeOptionCache(filters.clusterUuid);
  if (cached) {
    anomalyNodeOptions.value = cached;
    if (filters.nodeName && !anomalyNodeOptions.value.includes(filters.nodeName)) {
      filters.nodeName = "";
    }
    return;
  }

  try {
    const nodes = await getNodeListApi({
      page: 1,
      pageSize: MANAGER_MAX_PAGE_SIZE,
      orderField: "id",
      isAsc: false,
      clusterUuid: filters.clusterUuid
    });
    const names = Array.from(
      new Set(
        nodes.items
          .map((item) => item.nodeName.trim())
          .filter((item) => item.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b));

    anomalyNodeOptions.value = names;
    writeAnomalyNodeOptionCache(filters.clusterUuid, names);
    if (filters.nodeName && !anomalyNodeOptions.value.includes(filters.nodeName)) {
      filters.nodeName = "";
    }
  } catch (error) {
    console.error("load anomaly node list failed", error);
    anomalyNodeOptions.value = [];
    filters.nodeName = "";
    const msg = error instanceof Error ? error.message : "加载 Node 列表失败";
    anomalyWarnings.value = Array.from(new Set([msg, ...anomalyWarnings.value]));
  }
}

async function loadAnomalyRows(): Promise<void> {
  if (props.mode !== "anomaly") {
    return;
  }

  const reqSeq = anomalyRowsRequestSeq.value + 1;
  anomalyRowsRequestSeq.value = reqSeq;
  anomalyLoading.value = true;
  anomalyError.value = "";
  try {
    const end = new Date();
    const start = new Date(end.getTime() - POD_ENERGY_WINDOW_HOURS * 60 * 60 * 1000);
    const response = await getNodeMicroserviceAnomalyApi({
      clusterUuid: filters.clusterUuid || undefined,
      nodeName: filters.nodeName || undefined,
      start: start.toISOString(),
      end: end.toISOString(),
      limit: ANOMALY_MAX_ITEMS,
      minPowerWatts: ANOMALY_MIN_POWER_WATTS
    });

    if (reqSeq !== anomalyRowsRequestSeq.value) {
      return;
    }
    anomalyWarnings.value = response.warnings;
    anomalyRows.value = response.items.map((item) => ({
      id: item.id || `${item.clusterUuid}-${item.nodeName}-${item.namespace}-${item.service}`,
      clusterUuid: item.clusterUuid,
      cluster: item.clusterName || item.clusterUuid,
      nodeName: item.nodeName,
      namespace: item.namespace,
      service: item.service,
      workload: item.workload,
      anomalyType: item.anomalyType,
      reason: item.reason,
      severity: normalizeSeverity(item.severity),
      currentPowerW: item.currentPowerWatts,
      baselinePowerW: item.baselinePowerWatts,
      extraPowerKwh: item.extraPowerKwh,
      deltaPercent: item.deltaPercent,
      detectedAt: formatDetectedAt(item.detectedAt)
    }));
  } catch (error) {
    if (reqSeq !== anomalyRowsRequestSeq.value) {
      return;
    }
    console.error("load anomaly rows failed", error);
    anomalyError.value = error instanceof Error ? error.message : "加载微服务异常数据失败";
    anomalyRows.value = [];
    anomalyWarnings.value = [];
  } finally {
    if (reqSeq === anomalyRowsRequestSeq.value) {
      anomalyLoading.value = false;
    }
  }
}

async function handleAnomalyClusterChange(): Promise<void> {
  filters.nodeName = "";
  await loadAnomalyNodeOptions();
  await loadAnomalyRows();
}

onMounted(() => {
  if (props.mode === "overview") {
    void loadScopedEnergyOverview();
    return;
  }
  void loadAnomalyClusterOptions();
});

function severityLabel(severity: string): string {
  if (severity === "critical") return "严重";
  if (severity === "warning") return "告警";
  return "提示";
}
</script>

<style scoped>
.energy-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f4f8ff 0%, #eef9f2 52%, #fff7ec 100%);
  border: 1px solid #dbe5ff;
}

.page-head h2 {
  margin: 0 0 8px;
  font-size: 24px;
  color: #142033;
}

.page-head p {
  margin: 0;
  color: #4a5a76;
  font-size: 13px;
}

.head-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: #31415f;
  background: #ffffffcc;
  border: 1px solid #d6e1ff;
}

.tag.accent {
  color: #7a4400;
  border-color: #ffd4a5;
  background: #fff4e5;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid #e4e9f3;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-card .label {
  font-size: 12px;
  color: #667594;
}

.summary-card strong {
  font-size: 22px;
  line-height: 1.1;
  color: #172541;
}

.summary-card small {
  font-size: 12px;
  color: #8a97b0;
}

.overview-wrap,
.anomaly-wrap {
  display: grid;
  gap: 14px;
}

.anomaly-wrap {
  grid-template-columns: minmax(0, 1fr) 320px;
}

.panel {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e4e9f3;
  background: #fff;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.panel-head h3 {
  margin: 0;
  font-size: 16px;
  color: #172541;
}

.panel-head span {
  font-size: 12px;
  color: #7f8aa1;
}

.cluster-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.cluster-card {
  border-radius: 10px;
  border: 1px solid #e6ecf8;
  padding: 12px;
  background: #fbfdff;
}

.cluster-card h4 {
  margin: 0 0 10px;
  font-size: 15px;
  color: #1a2a4d;
}

.cluster-card p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #51607d;
}

.cluster-card .cluster-hint {
  color: #2b4b8a;
  font-size: 12px;
}

.cluster-card .warn {
  color: #a75500;
}

.cluster-card .error-text {
  color: #b42318;
}

.toggle-detail-btn {
  margin-top: 10px;
  border: 1px solid #cddaf2;
  background: #f6f9ff;
  color: #1e3a70;
  border-radius: 8px;
  font-size: 12px;
  height: 30px;
  padding: 0 10px;
  cursor: pointer;
}

.toggle-detail-btn:hover {
  background: #edf4ff;
}

.node-pod-detail {
  margin-top: 10px;
  padding: 10px;
  border-radius: 10px;
  border: 1px dashed #d7e1f4;
  background: #ffffff;
}

.detail-placeholder {
  color: #67758f;
  font-size: 12px;
}

.detail-placeholder.error {
  color: #b42318;
}

.node-detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-detail-card {
  border: 1px solid #e8eef8;
  border-radius: 8px;
  padding: 8px 10px;
  background: #fcfdff;
}

.node-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.node-detail-head strong {
  font-size: 13px;
  color: #1f3154;
}

.node-pod-toggle-btn {
  margin-top: 6px;
  border: 1px solid #c7d8f7;
  background: #f4f8ff;
  color: #1f3d72;
  border-radius: 8px;
  font-size: 12px;
  height: 30px;
  padding: 0 10px;
  cursor: pointer;
}

.node-pod-toggle-btn:disabled {
  cursor: not-allowed;
  color: #7f8da6;
  border-color: #dce3f2;
  background: #f8fafd;
}

.pod-list {
  margin-top: 8px;
  max-height: 180px;
  overflow: auto;
  border: 1px solid #e2e9f8;
  border-radius: 8px;
  background: #fff;
}

.pod-row {
  padding: 6px 10px;
  font-size: 12px;
  color: #1f3256;
  border-bottom: 1px solid #eef2fa;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pod-row:last-child {
  border-bottom: none;
}

.pod-row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pod-row-name {
  color: #1f3256;
}

.pod-row-phase {
  color: #5b6b88;
  font-size: 11px;
  border: 1px solid #d6e0f2;
  border-radius: 999px;
  padding: 0 8px;
  line-height: 18px;
}

.pod-row-energy {
  color: #496286;
  font-size: 11px;
}

.node-state {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 62px;
  border-radius: 999px;
  font-size: 11px;
  padding: 2px 8px;
  border: 1px solid transparent;
}

.node-state.ready {
  color: #09633a;
  background: #eaf9ef;
  border-color: #bee6ca;
}

.node-state.not-ready {
  color: #9f1d20;
  background: #ffe8ea;
  border-color: #ffc6ca;
}

.pod-chip-row {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pod-chip {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  color: #1d3f77;
  background: #eef4ff;
  border: 1px solid #d8e5ff;
}

.pod-chip-more {
  color: #5d4a00;
  background: #fff4de;
  border-color: #ffe0a6;
}

.overview-placeholder {
  padding: 22px 12px;
  border: 1px dashed #dbe3f2;
  border-radius: 10px;
  text-align: center;
  color: #6b7a96;
  font-size: 13px;
}

.overview-placeholder.error {
  border-color: #f5c2c7;
  color: #b42318;
  background: #fff6f7;
}

.filter-row {
  display: grid;
  grid-template-columns: 180px 220px 180px minmax(220px, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.filter-row label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #62708c;
}

.filter-row select,
.filter-row input {
  height: 34px;
  border-radius: 8px;
  border: 1px solid #d6deee;
  background: #fff;
  padding: 0 10px;
  color: #1c2b47;
}

.table-wrap {
  overflow: auto;
}

.warning-list {
  margin: 0 0 12px;
  border: 1px dashed #f0c27b;
  border-radius: 10px;
  background: #fff8ed;
  padding: 10px 12px;
}

.warning-list p {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #8a4d00;
}

.warning-list p + p {
  margin-top: 4px;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 920px;
}

th,
td {
  border-bottom: 1px solid #edf1f7;
  padding: 10px 8px;
  text-align: left;
  font-size: 13px;
  white-space: nowrap;
}

th {
  color: #60708d;
  font-weight: 600;
  background: #f7faff;
}

td {
  color: #1d2d49;
}

.anomaly-reason {
  display: block;
  margin-top: 4px;
  color: #68799a;
  font-size: 12px;
  line-height: 1.35;
  white-space: normal;
}

.workload-text {
  display: block;
  margin-top: 4px;
  color: #5c6c8c;
  font-size: 12px;
  line-height: 1.3;
}

.empty {
  text-align: center;
  color: #8c97ad;
}

.severity {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 46px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid transparent;
}

.severity.critical {
  color: #9f1d20;
  background: #ffe8ea;
  border-color: #ffc6ca;
}

.severity.warning {
  color: #9b5d00;
  background: #fff4df;
  border-color: #ffdca5;
}

.severity.info {
  color: #0c5f8e;
  background: #e9f6ff;
  border-color: #c7e9ff;
}

.ranking-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ranking-list li {
  border: 1px solid #e9edf6;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ranking-list strong {
  font-size: 13px;
  color: #1d2d49;
}

.ranking-list p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #7d8aa3;
}

.ranking-list span {
  font-size: 13px;
  color: #8a4d00;
  font-weight: 600;
}

@media (max-width: 1360px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .anomaly-wrap {
    grid-template-columns: minmax(0, 1fr);
  }

  .cluster-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .page-head {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-row {
    grid-template-columns: 1fr;
  }

  .cluster-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
