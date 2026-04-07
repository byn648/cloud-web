<template>
  <div class="cluster-list-page">
    <div class="toolbar-card">
      <div class="toolbar-left">
        <button
          type="button"
          class="mode-btn"
          :class="{ active: viewMode === 'card' }"
          @click="viewMode = 'card'"
        >
          卡片视图
        </button>
        <button
          type="button"
          class="mode-btn"
          :class="{ active: viewMode === 'table' }"
          @click="viewMode = 'table'"
        >
          列表视图
        </button>
        <button type="button" class="action-btn primary" @click="refresh">数据同步</button>
        <button type="button" class="action-btn" @click="refresh">刷新</button>
      </div>

      <form class="toolbar-right" @submit.prevent="loadClusters">
        <input v-model.trim="keyword" type="text" placeholder="搜索集群名称" />
        <select v-model="environment">
          <option value="">全部环境</option>
          <option value="prod">生产</option>
          <option value="staging">测试</option>
          <option value="edge">边缘</option>
        </select>
        <button type="submit" class="action-btn primary">查询</button>
      </form>
    </div>

    <div v-if="errorMsg" class="error-box">{{ errorMsg }}</div>

    <div v-if="loading" class="loading-box">加载中...</div>

    <template v-else>
      <section v-if="viewMode === 'card'" class="card-grid">
        <article v-for="cluster in clusters" :key="cluster.id" class="cluster-card">
          <div class="card-head">
            <div class="title-wrap">
              <h3>{{ cluster.name }}</h3>
              <p>{{ cluster.clusterType }} | {{ cluster.version }}</p>
            </div>
            <span class="env-ribbon">{{ formatEnvironment(cluster.environment) }}</span>
          </div>

          <div class="state-row">
            <div class="state-box">
              <span class="label">健康状态</span>
              <strong :class="healthClass(cluster.healthStatus)">{{ healthText(cluster.healthStatus) }}</strong>
            </div>
            <div class="state-box">
              <span class="label">同步状态</span>
              <strong class="ok">已同步</strong>
            </div>
          </div>

          <div class="metric-block">
            <p class="metric-title">资源分配率</p>
            <div class="metric-item" v-for="metric in metrics(cluster)" :key="metric.name">
              <div class="metric-text">
                <span>{{ metric.name }}</span>
                <span>{{ metric.value }}</span>
              </div>
              <div class="metric-bar">
                <i :style="{ width: metric.value }" :class="metric.level"></i>
              </div>
            </div>
          </div>

          <p class="created">创建于 {{ formatDate(cluster.createdAt) }}</p>

          <div class="card-actions">
            <button type="button">同步</button>
            <button type="button">定价</button>
            <button type="button" class="danger">删除</button>
          </div>

          <button type="button" class="console-btn">进入控制台</button>
        </article>
      </section>

      <section v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>集群名称</th>
              <th>环境</th>
              <th>类型</th>
              <th>版本</th>
              <th>健康状态</th>
              <th>CPU</th>
              <th>内存</th>
              <th>Pod</th>
              <th>存储</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cluster in clusters" :key="`table-${cluster.id}`">
              <td>{{ cluster.name }}</td>
              <td>{{ formatEnvironment(cluster.environment) }}</td>
              <td>{{ cluster.clusterType }}</td>
              <td>{{ cluster.version }}</td>
              <td>{{ healthText(cluster.healthStatus) }}</td>
              <td>{{ percent(cluster.cpuUsage) }}</td>
              <td>{{ percent(cluster.memoryUsage) }}</td>
              <td>{{ percent(cluster.podUsage) }}</td>
              <td>{{ percent(cluster.storageUsage) }}</td>
              <td>{{ formatDate(cluster.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div class="footer">共 {{ clusters.length }} 条</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { searchClusterApi, type Cluster } from "../../../api/manager/cluster";

const clusters = ref<Cluster[]>([]);
const loading = ref(false);
const errorMsg = ref("");
const viewMode = ref<"card" | "table">("card");
const keyword = ref("");
const environment = ref("");

function percent(value: number): string {
  if (!Number.isFinite(value)) return "0.0%";
  const val = Math.max(0, Math.min(100, value));
  return `${val.toFixed(1)}%`;
}

function healthText(status: number): string {
  if (status === 1) return "健康";
  if (status === 2) return "异常";
  if (status === 3) return "降级";
  return "未知";
}

function healthClass(status: number): string {
  if (status === 1) return "ok";
  if (status === 2) return "danger";
  return "warn";
}

function formatEnvironment(env: string): string {
  if (env === "prod") return "生产";
  if (env === "staging") return "测试";
  if (env === "edge") return "边缘";
  return env || "-";
}

function formatDate(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) {
    return "-";
  }
  const date = new Date(unixSeconds * 1000);
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mi = `${date.getMinutes()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function level(value: number): "low" | "mid" | "high" {
  if (value >= 70) return "high";
  if (value >= 40) return "mid";
  return "low";
}

function metrics(cluster: Cluster) {
  return [
    { name: "CPU", value: percent(cluster.cpuUsage), level: level(cluster.cpuUsage) },
    { name: "内存", value: percent(cluster.memoryUsage), level: level(cluster.memoryUsage) },
    { name: "Pod", value: percent(cluster.podUsage), level: level(cluster.podUsage) },
    { name: "存储", value: percent(cluster.storageUsage), level: level(cluster.storageUsage) }
  ];
}

async function loadClusters(): Promise<void> {
  loading.value = true;
  errorMsg.value = "";
  try {
    const res = await searchClusterApi(keyword.value || undefined, environment.value || undefined);
    clusters.value = res.items ?? [];
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "获取集群失败";
  } finally {
    loading.value = false;
  }
}

async function refresh(): Promise<void> {
  await loadClusters();
}

onMounted(async () => {
  await loadClusters();
});
</script>

<style scoped>
.cluster-list-page {
  display: grid;
  gap: 14px;
}

.toolbar-card {
  background: #ffffff;
  border: 1px solid #e5e9f2;
  border-radius: 14px;
  padding: 12px;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.mode-btn,
.action-btn,
.toolbar-right input,
.toolbar-right select {
  height: 36px;
  border-radius: 10px;
  border: 1px solid #d9e0ea;
  background: #ffffff;
  padding: 0 12px;
  color: #334155;
}

.mode-btn.active {
  background: #2f6bff;
  border-color: #2f6bff;
  color: #ffffff;
}

.action-btn.primary {
  background: #f59e0b;
  border-color: #f59e0b;
  color: #ffffff;
}

.error-box {
  padding: 10px 12px;
  border: 1px solid #fecaca;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 10px;
}

.loading-box {
  padding: 26px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  color: #64748b;
  text-align: center;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 14px;
}

.cluster-card {
  background: #ffffff;
  border: 1px solid #e8edf6;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 12px 30px rgba(30, 41, 59, 0.05);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.title-wrap h3 {
  margin: 0;
  font-size: 30px;
  color: #0f172a;
  font-family: "Google Sans", "Noto Sans SC", "PingFang SC", sans-serif;
}

.title-wrap p {
  margin: 6px 0 0;
  color: #64748b;
}

.env-ribbon {
  padding: 4px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, #5b7dff, #7f56d9);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
}

.state-row {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.state-box {
  background: #eef7f3;
  border-radius: 10px;
  padding: 10px;
}

.label {
  display: block;
  color: #64748b;
  font-size: 12px;
}

.ok {
  color: #059669;
}

.danger {
  color: #dc2626;
}

.warn {
  color: #d97706;
}

.metric-block {
  margin-top: 12px;
}

.metric-title {
  margin: 0 0 8px;
  color: #334155;
  font-weight: 600;
}

.metric-item {
  margin-top: 8px;
}

.metric-text {
  display: flex;
  justify-content: space-between;
  color: #334155;
  font-size: 13px;
}

.metric-bar {
  margin-top: 4px;
  height: 6px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.metric-bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
}

.metric-bar i.low {
  background: #10b981;
}

.metric-bar i.mid {
  background: #22c55e;
}

.metric-bar i.high {
  background: #f59e0b;
}

.created {
  margin: 12px 0 0;
  color: #94a3b8;
  font-size: 12px;
}

.card-actions {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.card-actions button,
.console-btn {
  height: 34px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #f8fafc;
  color: #334155;
}

.console-btn {
  margin-top: 10px;
  width: 100%;
  height: 40px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  border-color: transparent;
  color: #ffffff;
}

.table-wrap {
  background: #ffffff;
  border: 1px solid #e5e9f2;
  border-radius: 14px;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 920px;
}

th,
td {
  padding: 12px;
  border-bottom: 1px solid #edf2f7;
  text-align: left;
  font-size: 13px;
}

th {
  background: #f8fafc;
  color: #475569;
}

.footer {
  color: #64748b;
  font-size: 13px;
}
</style>
