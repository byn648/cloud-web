<template>
  <div class="panel-body">
    <div class="resource-metrics">
      <div v-for="metric in metrics" :key="metric.label" class="metric-row">
        <div class="metric-header">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
        </div>
        <div class="track">
          <i :style="{ width: metric.value }" :class="metric.level"></i>
        </div>
      </div>
    </div>

    <div class="resource-summary">
      <div class="summary-item">
        <span>节点总数</span>
        <strong>{{ nodes.length }}</strong>
      </div>
      <div class="summary-item">
        <span>Ready 节点</span>
        <strong>{{ readyNodeCount }}</strong>
      </div>
      <div class="summary-item">
        <span>NotReady 节点</span>
        <strong>{{ notReadyNodeCount }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Cluster } from "../../../../../api/manager/cluster";
import type { ClusterNodeInfo } from "../../../../../api/manager/node";

const props = defineProps<{
  clusterDetail: Cluster | null;
  nodes: ClusterNodeInfo[];
}>();

const readyNodeCount = computed(() => {
  return props.nodes.filter((item) => item.nodeStatus.toLowerCase() === "ready").length;
});

const notReadyNodeCount = computed(() => {
  return Math.max(0, props.nodes.length - readyNodeCount.value);
});

const metrics = computed(() => {
  const detail = props.clusterDetail;
  if (!detail) return [];
  return [
    metric("CPU 使用率", detail.cpuUsage),
    metric("内存使用率", detail.memoryUsage),
    metric("Pod 使用率", detail.podUsage),
    metric("存储使用率", detail.storageUsage)
  ];
});

function metric(label: string, value: number): { label: string; value: string; level: string } {
  const v = percent(value);
  const level = value >= 70 ? "high" : value >= 40 ? "mid" : "low";
  return { label, value: v, level };
}

function percent(value: number): string {
  if (!Number.isFinite(value)) return "0.0%";
  const safe = Math.max(0, Math.min(100, value));
  return `${safe.toFixed(1)}%`;
}
</script>

<style scoped>
.panel-body { padding: 18px; }
.resource-metrics { display: grid; gap: 12px; }
.metric-row { display: flex; flex-direction: column; gap: 8px; }
.metric-header { display: flex; justify-content: space-between; font-size: 14px; }
.metric-header span { color: #607086; }
.metric-header strong { color: #1f2a3d; }
.track { height: 8px; border-radius: 999px; background: #edf2f8; overflow: hidden; }
.track i { display: block; height: 100%; border-radius: 999px; }
.track i.low { background: #4f83ff; }
.track i.mid { background: #f2a54b; }
.track i.high { background: #ed6b65; }
.resource-summary { margin-top: 14px; display: grid; grid-template-columns: repeat(3, minmax(120px, 1fr)); gap: 10px; }
.summary-item {
  background: #f7f9fc;
  border: 1px solid #dde5f0;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.summary-item span { font-size: 12px; color: #607086; }
.summary-item strong { font-size: 20px; color: #23354d; }
@media (max-width: 900px) {
  .resource-summary { grid-template-columns: 1fr; }
}
</style>
