<template>
  <div class="panel-body">
    <div class="info-grid">
      <article class="info-card">
        <h3>网络概览</h3>
        <div class="kv"><span>API Server</span><strong>{{ apiServer }}</strong></div>
        <div class="kv"><span>DNS 域</span><strong>cluster.local</strong></div>
        <div class="kv"><span>网络插件</span><strong>Calico</strong></div>
      </article>

      <article class="info-card">
        <h3>网段配置</h3>
        <div class="kv"><span>Service CIDR</span><strong>10.96.0.0/12</strong></div>
        <div class="kv"><span>Pod CIDR</span><strong>10.244.0.0/16</strong></div>
        <div class="kv"><span>节点数</span><strong>{{ nodes.length }}</strong></div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ClusterNodeInfo } from "../../../../../api/manager/node";

const props = defineProps<{
  nodes: ClusterNodeInfo[];
}>();

const apiServer = computed(() => {
  const first = props.nodes[0];
  if (!first?.nodeIp) return "https://127.0.0.1:6443";
  return `https://${first.nodeIp}:6443`;
});
</script>

<style scoped>
.panel-body { padding: 18px; }
.info-grid { display: grid; grid-template-columns: repeat(2, minmax(260px, 1fr)); gap: 14px; }
.info-card {
  border: 1px solid #dde5f0;
  border-radius: 14px;
  background: #fbfcff;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.info-card h3 { margin: 0; font-size: 18px; color: #24334d; }
.kv { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
.kv span { color: #607086; }
.kv strong { color: #1f2a3d; text-align: right; overflow-wrap: anywhere; }
@media (max-width: 900px) {
  .info-grid { grid-template-columns: 1fr; }
}
</style>
