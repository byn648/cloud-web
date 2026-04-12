<template>
  <article class="cluster-card" @click="emit('open', cluster.id)">
    <header class="card-head">
      <div>
        <h3>{{ cluster.name }}</h3>
        <p>{{ cluster.clusterType || "standard" }} · v{{ cluster.version || "-" }}</p>
      </div>
      <span class="env-chip" :class="environmentClassName">{{ environmentLabel }}</span>
    </header>

    <div class="status-row">
      <span class="status-chip" :class="health.className">健康: {{ health.label }}</span>
      <span class="status-chip" :class="sync.className">同步: {{ sync.label }}</span>
    </div>

    <div class="metric-grid">
      <div v-for="item in metrics" :key="item.name" class="metric-item">
        <div class="label-row">
          <span>{{ item.name }}</span>
          <strong>{{ item.value }}</strong>
        </div>
        <div class="progress-bg">
          <i :style="{ width: item.value }" :class="item.level"></i>
        </div>
      </div>
    </div>

    <footer class="card-foot">
      <span>创建于 {{ formatDate(cluster.createdAt) }}</span>
      <div class="actions">
        <button class="btn ghost" :disabled="syncLoading || deleteLoading" @click.stop="emit('sync', cluster)">
          {{ syncLoading ? "同步中" : "同步" }}
        </button>
        <button class="btn danger" :disabled="syncLoading || deleteLoading" @click.stop="emit('delete', cluster)">
          {{ deleteLoading ? "删除中" : "删除" }}
        </button>
      </div>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Cluster } from "../../../../api/manager/cluster";
import { environmentOptions, healthStatusConfig, syncStatusConfig } from "../constants";

const props = defineProps<{
  cluster: Cluster;
  syncLoading?: boolean;
  deleteLoading?: boolean;
}>();

const emit = defineEmits<{
  open: [id: number];
  sync: [cluster: Cluster];
  delete: [cluster: Cluster];
}>();

function percent(value: number): string {
  if (!Number.isFinite(value)) {
    return "0.0%";
  }

  const safeValue = Math.max(0, Math.min(100, value));
  return `${safeValue.toFixed(1)}%`;
}

function level(value: number): "low" | "mid" | "high" {
  if (value >= 70) {
    return "high";
  }
  if (value >= 40) {
    return "mid";
  }
  return "low";
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

const metrics = computed(() => {
  return [
    {
      name: "CPU",
      value: percent(props.cluster.cpuUsage),
      level: level(props.cluster.cpuUsage)
    },
    {
      name: "内存",
      value: percent(props.cluster.memoryUsage),
      level: level(props.cluster.memoryUsage)
    },
    {
      name: "Pod",
      value: percent(props.cluster.podUsage),
      level: level(props.cluster.podUsage)
    },
    {
      name: "存储",
      value: percent(props.cluster.storageUsage),
      level: level(props.cluster.storageUsage)
    }
  ];
});

const health = computed(() => healthStatusConfig[props.cluster.healthStatus] || { label: "未知", className: "warn" });
const sync = computed(() => syncStatusConfig[props.cluster.status] || { label: "未知", className: "warn" });
const environmentLabel = computed(() => {
  const current = environmentOptions.find((item) => item.value === props.cluster.environment);
  return current?.shortLabel || props.cluster.environment || "-";
});
const environmentClassName = computed(() => {
  const current = environmentOptions.find((item) => item.value === props.cluster.environment);
  return current?.className || "";
});
</script>

<style scoped>
.cluster-card {
  border: 1px solid #d9e2ee;
  border-radius: 16px;
  background: #fff;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.cluster-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.card-head h3 {
  margin: 0;
  color: #1f2a3d;
  font-size: 18px;
}

.card-head p {
  margin: 4px 0 0;
  color: #6b7b92;
  font-size: 12px;
}

.env-chip {
  height: 24px;
  border-radius: 999px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  color: #44536b;
  background: #edf2f8;
  font-size: 12px;
  font-weight: 600;
}

.env-chip.production {
  background: #e9f7ef;
  color: #116a43;
}

.env-chip.staging {
  background: #fff4df;
  color: #ad5c00;
}

.env-chip.testing {
  background: #eaf4ff;
  color: #0f529b;
}

.env-chip.development {
  background: #efeafe;
  color: #5b3ac0;
}

.status-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.status-chip {
  height: 22px;
  border-radius: 999px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
}

.status-chip.ok {
  color: #0f8e4f;
  background: #e8f9ef;
}

.status-chip.warn {
  color: #be6a00;
  background: #fff4e6;
}

.status-chip.danger {
  color: #bf1d1d;
  background: #feecec;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #516279;
}

.label-row strong {
  color: #1e293b;
}

.progress-bg {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #e8edf5;
  overflow: hidden;
}

.progress-bg i {
  display: block;
  height: 100%;
  border-radius: 999px;
}

.progress-bg i.low {
  background: #21a366;
}

.progress-bg i.mid {
  background: #f59f00;
}

.progress-bg i.high {
  background: #e03131;
}

.card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding-top: 2px;
}

.card-foot > span {
  color: #6b7b92;
  font-size: 12px;
}

.actions {
  display: inline-flex;
  gap: 8px;
}

.btn {
  border: 1px solid #d3dceb;
  border-radius: 8px;
  height: 28px;
  padding: 0 10px;
  background: #fff;
  color: #334155;
  font-size: 12px;
  cursor: pointer;
}

.btn.danger {
  border-color: #f2c9c9;
  color: #c53030;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
