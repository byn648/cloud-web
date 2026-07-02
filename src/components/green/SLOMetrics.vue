<template>
  <div class="green-slo-grid">
    <div v-for="m in data" :key="m.key" class="green-slo-card">
      <div class="green-slo-ring">
        <svg :width="64" :height="64" style="transform: rotate(-90deg);">
          <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(11,87,208,0.08)" stroke-width="5" />
          <circle
            cx="32" cy="32" r="29"
            fill="none"
            :stroke="m.color"
            stroke-width="5"
            :stroke-dasharray="`${getProgressDash(m)} 182`"
            stroke-linecap="round"
          />
          <text x="32" y="36" text-anchor="middle" :fill="m.color" font-size="12" font-weight="700" font-family="'JetBrains Mono', monospace" style="transform: rotate(90deg); transform-origin: 32px 32px;">
            {{ m.value.toFixed(1) }}
          </text>
        </svg>
      </div>
      <div class="green-slo-info">
        <div class="green-slo-label">{{ m.label }}</div>
        <div class="green-slo-sub">目标 <span :style="{ color: m.color }">{{ m.target }}{{ m.unit }}</span></div>
        <div class="green-slo-status" :class="m.status">
          {{ m.status === 'normal' ? '● 正常' : m.status === 'warning' ? '◐ 预警' : '◑ 危险' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface SLOMetric {
  key: string
  label: string
  value: number
  unit: string
  color: string
  target: number
  status: 'normal' | 'warning' | 'danger'
  max?: number
}

defineProps<{
  data: SLOMetric[]
}>()

function getProgressDash(m: SLOMetric) {
  const max = m.max || 100
  const pct = Math.min((m.value / max) * 100, 100)
  return (pct / 100) * 2 * Math.PI * 29
}
</script>