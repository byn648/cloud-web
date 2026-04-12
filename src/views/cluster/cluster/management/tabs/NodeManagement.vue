<template>
  <div class="panel-body">
    <div class="summary-grid">
      <article class="summary-card">
        <h4>节点总数</h4>
        <strong>{{ nodes.length }}</strong>
      </article>
      <article class="summary-card">
        <h4>就绪节点</h4>
        <strong class="ok">{{ readyCount }}</strong>
      </article>
      <article class="summary-card">
        <h4>不可调度</h4>
        <strong class="warn">{{ unschedulableCount }}</strong>
      </article>
      <article class="summary-card">
        <h4>平均 CPU 使用率</h4>
        <strong>{{ averageCpuUsage }}</strong>
      </article>
    </div>

    <div class="table-wrap">
      <table class="node-table">
        <thead>
          <tr>
            <th>节点名称</th>
            <th>IP</th>
            <th>角色</th>
            <th>状态</th>
            <th>CPU</th>
            <th>内存</th>
            <th>Pod</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="node in previewNodes" :key="node.id">
            <td>{{ node.nodeName }}</td>
            <td>{{ node.nodeIp || "-" }}</td>
            <td>{{ node.nodeRole || "-" }}</td>
            <td>
              <span class="chip" :class="node.nodeStatus === 'Ready' ? 'ok' : 'warn'">
                {{ node.nodeStatus === "Ready" ? "就绪" : node.nodeStatus || "未知" }}
              </span>
            </td>
            <td>{{ formatPercent(node.cpuUsge) }}</td>
            <td>{{ formatPercent(node.memoryUsge) }}</td>
            <td>{{ node.podUsge }} / {{ node.podTotal }}</td>
          </tr>
          <tr v-if="previewNodes.length === 0">
            <td colspan="7" class="empty">暂无节点数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ClusterNodeInfo } from "../../../../../api/manager/node";

const props = defineProps<{
  nodes: ClusterNodeInfo[];
}>();

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return "0.0%";
  }

  const safeValue = Math.max(0, Math.min(100, value));
  return `${safeValue.toFixed(1)}%`;
}

const readyCount = computed(() => props.nodes.filter((node) => node.nodeStatus === "Ready").length);
const unschedulableCount = computed(() => props.nodes.filter((node) => node.unschedulable === 2).length);
const previewNodes = computed(() => props.nodes.slice(0, 12));
const averageCpuUsage = computed(() => {
  if (props.nodes.length === 0) {
    return "0.0%";
  }

  const total = props.nodes.reduce((sum, item) => sum + (Number.isFinite(item.cpuUsge) ? item.cpuUsge : 0), 0);
  return formatPercent(total / props.nodes.length);
});
</script>

<style scoped>
.panel-body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 10px;
}

.summary-card {
  border: 1px solid #dce5f1;
  background: #fbfcff;
  border-radius: 12px;
  padding: 12px;
}

.summary-card h4 {
  margin: 0;
  color: #5a6c84;
  font-size: 13px;
  font-weight: 600;
}

.summary-card strong {
  display: inline-block;
  margin-top: 8px;
  color: #1f2a3d;
  font-size: 24px;
}

.summary-card strong.ok {
  color: #0f8e4f;
}

.summary-card strong.warn {
  color: #be6a00;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid #dce5f1;
  border-radius: 12px;
  background: #fff;
}

.node-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;
}

.node-table th,
.node-table td {
  border-bottom: 1px solid #edf2f7;
  text-align: left;
  padding: 10px;
  color: #1f2a3d;
  font-size: 13px;
}

.node-table th {
  background: #f8fafd;
  color: #516279;
  font-weight: 700;
}

.chip {
  height: 22px;
  border-radius: 999px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
}

.chip.ok {
  color: #0f8e4f;
  background: #e8f9ef;
}

.chip.warn {
  color: #be6a00;
  background: #fff4e6;
}

.empty {
  text-align: center !important;
  color: #607086 !important;
}

@media (max-width: 1000px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(140px, 1fr));
  }
}
</style>
