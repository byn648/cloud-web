<template>
  <div class="green-recommendation-list">
    <div v-for="rec in recommendations" :key="rec.id" class="green-recommendation-item">
      <div class="green-recommendation-header">
        <span class="green-recommendation-icon" :style="{ color: priorityConfig[rec.priority].color }">
          <span v-html="typeIcons[rec.type]"></span>
        </span>
        <span class="green-recommendation-title">{{ rec.title }}</span>
        <span class="green-recommendation-badge" :class="rec.priority">
          {{ priorityConfig[rec.priority].label }}
        </span>
      </div>
      <p class="green-recommendation-desc">{{ rec.desc }}</p>
      <div class="green-recommendation-footer">
        <span class="green-recommendation-saving">{{ rec.saving }}</span>
        <button class="green-recommendation-btn">采纳建议</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Recommendation } from '@/utils/mockData'

defineProps<{
  recommendations: Recommendation[]
}>()

const priorityConfig = {
  high: { label: '高优先级', color: '#b91c1c' },
  medium: { label: '中优先级', color: '#b45309' },
  low: { label: '低优先级', color: '#166534' },
}

const typeIcons: Record<string, string> = {
  scale: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>`,
  schedule: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>`,
  cache: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>`,
}
</script>
