<template>
  <div class="green-overview">
    <!-- Cluster selector -->
    <div class="cluster-selector">
      <div class="cluster-selector-label">当前集群</div>
      <select v-model="selectedCluster" class="cluster-select">
        <option v-for="c in clusters" :key="c.uuid" :value="c.uuid">{{ c.name }}</option>
      </select>
      <span class="cluster-info">{{ clusterNodes.length }} 台服务器</span>
    </div>

    <!-- Error banner -->
    <div v-if="loadingError" class="green-error-banner">
      {{ loadingError }}
    </div>

    <!-- Server cards grid -->
    <div class="server-grid">
      <div
        v-for="node in clusterNodes"
        :key="node.uuid"
        class="server-card"
        @click="openServer(node)"
      >
        <!-- Card header -->
        <div class="server-card-header">
          <div class="server-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
          </div>
          <div class="server-info">
            <span class="server-name">{{ node.name }}</span>
            <span class="server-status" :class="node.status">
              <span class="status-dot"></span>
              {{ node.statusText }}
            </span>
          </div>
          <div class="server-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>

        <!-- Forecast summary -->
        <div class="card-section clickable" @click="openServer(node, 'forecast')">
          <div class="section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            预测分析
            <span class="section-arrow">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </span>
          </div>
          <div class="metric-row">
            <span class="metric-label">当前负荷</span>
            <span class="metric-value" :style="{ color: '#0b57d0' }">{{ node.forecast.cpu }}%</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">预测峰值</span>
            <span class="metric-value" :style="{ color: '#f59e0b' }">{{ node.forecast.peak }}%</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">预测能耗</span>
            <span class="metric-value" :style="{ color: '#a855f7' }">{{ node.forecast.energy }} kWh</span>
          </div>
          <div class="mini-chart">
            <div class="mini-chart-line" :style="{ background: `linear-gradient(to right, #0b57d0 ${node.forecast.linePercent}%, #f59e0b 0%)` }"></div>
          </div>
        </div>

        <!-- Performance summary -->
        <div class="card-section clickable" @click="openServer(node, 'performance')">
          <div class="section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            性能管控
            <span class="section-arrow">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </span>
          </div>
          <div class="metric-row">
            <span class="metric-label">SLO达标率</span>
            <span class="metric-value" :style="{ color: node.performance.sloRate >= 99 ? '#22c55e' : '#f59e0b' }">
              {{ node.performance.sloRate }}%
            </span>
          </div>
          <div class="metric-row">
            <span class="metric-label">错误预算</span>
            <span class="metric-value" :style="{ color: '#ef4444' }">{{ node.performance.errorBudget }}h</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">CPU使用</span>
            <span class="metric-value" :style="{ color: '#3b82f6' }">{{ node.performance.cpu }}%</span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${node.performance.cpu}%`, background: node.performance.cpu > 80 ? '#ef4444' : '#0b57d0' }"
            ></div>
          </div>
        </div>

        <!-- Click hint -->
        <div class="card-footer">
          <span>点击查看详情</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface ServerNode {
  uuid: string
  name: string
  status: 'online' | 'offline' | 'warning'
  statusText: string
  forecast: {
    cpu: string
    peak: string
    energy: string
    linePercent: number
  }
  performance: {
    sloRate: number
    errorBudget: string
    cpu: number
  }
}

const emit = defineEmits<{
  openDetail: [node: ServerNode, type: 'forecast' | 'performance']
}>()

const clusters = ref([
  { uuid: 'cluster-1', name: 'GPU训练集群' },
  { uuid: 'cluster-2', name: '推理服务集群' },
])

const selectedCluster = ref('cluster-1')
const loadingError = ref('')

// Mock data - replace with real API calls
const clusterNodes = ref<ServerNode[]>([
  {
    uuid: 'node-1',
    name: 'gpu-server-01',
    status: 'online',
    statusText: '运行中',
    forecast: { cpu: '67.3', peak: '82.1', energy: '128.5', linePercent: 67 },
    performance: { sloRate: 99.7, errorBudget: '24.3', cpu: 67 },
  },
  {
    uuid: 'node-2',
    name: 'gpu-server-02',
    status: 'online',
    statusText: '运行中',
    forecast: { cpu: '45.2', peak: '71.5', energy: '95.3', linePercent: 45 },
    performance: { sloRate: 99.9, errorBudget: '36.8', cpu: 45 },
  },
  {
    uuid: 'node-3',
    name: 'gpu-server-03',
    status: 'warning',
    statusText: '负载偏高',
    forecast: { cpu: '88.6', peak: '95.2', energy: '210.7', linePercent: 88 },
    performance: { sloRate: 98.2, errorBudget: '8.5', cpu: 88 },
  },
  {
    uuid: 'node-4',
    name: 'gpu-server-04',
    status: 'online',
    statusText: '运行中',
    forecast: { cpu: '52.1', peak: '68.9', energy: '108.2', linePercent: 52 },
    performance: { sloRate: 99.5, errorBudget: '18.2', cpu: 52 },
  },
  {
    uuid: 'node-5',
    name: 'gpu-server-05',
    status: 'offline',
    statusText: '已下线',
    forecast: { cpu: '0', peak: '0', energy: '0', linePercent: 0 },
    performance: { sloRate: 0, errorBudget: '0', cpu: 0 },
  },
  {
    uuid: 'node-6',
    name: 'gpu-server-06',
    status: 'online',
    statusText: '运行中',
    forecast: { cpu: '38.9', peak: '55.3', energy: '76.8', linePercent: 38 },
    performance: { sloRate: 99.8, errorBudget: '42.1', cpu: 38 },
  },
])

function openServer(node: ServerNode, type: 'forecast' | 'performance' = 'forecast') {
  if (node.status === 'offline') return
  emit('openDetail', node, type)
}
</script>

<style scoped>
.green-overview {
  padding: 20px 24px;
  height: 100%;
  overflow-y: auto;
}

.page-content::-webkit-scrollbar { width: 6px; }
.page-content::-webkit-scrollbar-track { background: transparent; }
.page-content::-webkit-scrollbar-thumb { background: var(--m3-border); border-radius: 3px; }

.cluster-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: var(--m3-surface);
  border: 1px solid var(--m3-border);
  border-radius: 10px;
}

.cluster-selector-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--m3-text-secondary);
}

.cluster-select {
  height: 36px;
  min-width: 200px;
  border: 1px solid var(--m3-border);
  border-radius: 8px;
  padding: 0 12px;
  background: var(--m3-surface);
  color: var(--m3-text-main);
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.cluster-select:focus {
  border-color: #0b57d0;
  box-shadow: 0 0 0 3px rgba(11, 87, 208, 0.12);
}

.cluster-info {
  font-size: 12px;
  color: var(--m3-text-hint);
  margin-left: auto;
}

.green-error-banner {
  padding: 10px 16px;
  color: #ef4444;
  font-size: 13px;
  margin-bottom: 16px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
}

.server-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.server-card {
  background: var(--m3-surface);
  border: 1px solid var(--m3-border);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.server-card:hover {
  border-color: rgba(11, 87, 208, 0.4);
  box-shadow: 0 4px 12px rgba(11, 87, 208, 0.1);
  transform: translateY(-2px);
}

.server-card:active {
  transform: translateY(0);
}

.server-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.server-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(11, 87, 208, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0b57d0;
  flex-shrink: 0;
}

.server-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.server-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--m3-text-main);
}

.server-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
}

.server-status.online { color: #22c55e; }
.server-status.offline { color: #6b7280; }
.server-status.warning { color: #f59e0b; }

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.server-arrow {
  color: var(--m3-text-hint);
  flex-shrink: 0;
}

.card-section {
  padding: 12px;
  background: rgba(11, 87, 208, 0.03);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-section.clickable {
  cursor: pointer;
  transition: all 0.15s;
}

.card-section.clickable:hover {
  background: rgba(11, 87, 208, 0.08);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--m3-text-secondary);
  margin-bottom: 2px;
}

.section-arrow {
  margin-left: auto;
  opacity: 0;
  transition: opacity 0.15s;
  color: var(--m3-text-hint);
}

.card-section.clickable:hover .section-arrow {
  opacity: 1;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  font-size: 12px;
  color: var(--m3-text-secondary);
}

.metric-value {
  font-size: 13px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}

.mini-chart {
  height: 4px;
  background: var(--m3-border);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
}

.mini-chart-line {
  height: 100%;
  border-radius: 2px;
}

.progress-bar {
  height: 6px;
  background: var(--m3-border);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 4px;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
  color: var(--m3-text-hint);
  padding-top: 8px;
  border-top: 1px solid var(--m3-divider);
}

@media (max-width: 768px) {
  .server-grid {
    grid-template-columns: 1fr;
  }
  .page-header { padding: 0 16px; }
  .page-content { padding: 16px; }
}
</style>
