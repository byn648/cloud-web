<template>
  <div class="green-table">
    <div class="green-table-header">
      <span>服务名称</span>
      <span>状态</span>
      <span>SLO 达标率</span>
      <span>时延 ms</span>
      <span>吞吐量</span>
      <span>错误率</span>
    </div>
    <div v-for="svc in services" :key="svc.id" class="green-table-row">
      <span class="green-table-name">{{ svc.name }}</span>
      <span class="green-table-status" :style="{ color: statusConfig[svc.status].color }">
        <span class="green-status-dot" :style="{ background: statusConfig[svc.status].color }"></span>
        {{ statusConfig[svc.status].label }}
      </span>
      <span class="green-table-metric" :style="{ color: svc.sloRate >= 99 ? '#166534' : '#b45309' }">
        {{ svc.sloRate }}%
      </span>
      <span class="green-table-metric" :style="{ color: svc.latency > 200 ? '#b45309' : 'inherit' }">
        {{ svc.latency }}
      </span>
      <span class="green-table-metric">{{ svc.throughput }}%</span>
      <span class="green-table-metric" :style="{ color: svc.errorRate > 0.1 ? '#b91c1c' : 'inherit' }">
        {{ svc.errorRate }}%
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SLOService } from '@/utils/mockData'

defineProps<{
  services: SLOService[]
}>()

const statusConfig = {
  healthy: { label: '健康', color: '#166534' },
  warning: { label: '预警', color: '#b45309' },
  critical: { label: '危险', color: '#b91c1c' },
}
</script>
