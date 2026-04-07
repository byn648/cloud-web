<template>
  <aside class="detail-wrap">
    <header>
      <h3>节点详情</h3>
      <p v-if="loading">加载详情中...</p>
    </header>

    <div v-if="detail" class="detail-items">
      <div class="detail-item">
        <span>名称</span>
        <strong>{{ detail.name }}</strong>
      </div>
      <div class="detail-item">
        <span>主机名</span>
        <strong>{{ detail.hostname }}</strong>
      </div>
      <div class="detail-item">
        <span>节点 IP</span>
        <strong>{{ detail.nodeIp }}</strong>
      </div>
      <div class="detail-item">
        <span>Kubelet</span>
        <strong>{{ detail.kubeletVersion }}</strong>
      </div>
      <div class="detail-item">
        <span>运行时</span>
        <strong>{{ detail.runtime }}</strong>
      </div>
      <div class="detail-item">
        <span>系统镜像</span>
        <strong>{{ detail.osImage }}</strong>
      </div>
      <div class="detail-item">
        <span>操作系统</span>
        <strong>{{ detail.operatingSystem }}</strong>
      </div>
      <div class="detail-item">
        <span>内核版本</span>
        <strong>{{ detail.kernelVersion }}</strong>
      </div>
      <div class="detail-item">
        <span>CPU/内存</span>
        <strong>{{ detail.cpu }} Core / {{ detail.memory }} GiB</strong>
      </div>
      <div class="detail-item">
        <span>Pod 上限</span>
        <strong>{{ detail.pods }}</strong>
      </div>
      <div class="detail-item">
        <span>加入时间</span>
        <strong>{{ formatDate(detail.joinAt) }}</strong>
      </div>
    </div>

    <p v-else class="empty-tip">点击左侧“详情”查看节点信息</p>
  </aside>
</template>

<script setup lang="ts">
import type { ClusterNodeDetail } from "../../../../api/manager/node";

defineProps<{
  detail: ClusterNodeDetail | null;
  loading: boolean;
}>();

function formatDate(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return "-";
  const date = new Date(unixSeconds * 1000);
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mi = `${date.getMinutes()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}
</script>

<style scoped>
.detail-wrap {
  border: 1px solid #dce4ee;
  background: #ffffff;
  border-radius: 14px;
  overflow: hidden;
}

.detail-wrap header {
  padding: 12px;
  border-bottom: 1px solid #edf2f7;
}

.detail-wrap h3 {
  margin: 0;
  color: #1f2937;
}

.detail-wrap p {
  margin: 6px 0 0;
  font-size: 12px;
  color: #64748b;
}

.detail-items {
  display: grid;
  gap: 8px;
  padding: 12px;
}

.detail-item {
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  display: grid;
  gap: 4px;
}

.detail-item span {
  font-size: 12px;
  color: #64748b;
}

.detail-item strong {
  font-size: 13px;
  color: #1f2937;
}

.empty-tip {
  padding: 12px;
  color: #64748b;
  font-size: 13px;
}
</style>
