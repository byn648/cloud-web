<template>
  <div class="rule-settings">
    <div class="rule-grid">
      <div class="rule-block">
        <div class="rule-block-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
          预测模型参数
        </div>
        <div class="rule-row">
          <div class="rule-item">
            <label>置信度</label>
            <select class="rule-select" :value="confidenceLevel" @change="(e) => emit('confidenceLevel', Number((e.target as HTMLSelectElement).value))">
              <option v-for="c in CONFIDENCE_LEVELS" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
          </div>
        </div>
        <div class="rule-row">
          <div class="rule-item">
            <label>预测步长</label>
            <select class="rule-select" :value="forecastHorizon" @change="(e) => emit('forecastHorizon', Number((e.target as HTMLSelectElement).value))">
              <option v-for="h in FORECAST_HORIZONS" :key="h.value" :value="h.value">{{ h.label }}</option>
            </select>
          </div>
          <div class="rule-item rule-item--wide">
            <label>平滑系数 α</label>
            <div class="rule-range-row">
              <input type="range" min="0.05" max="0.9" step="0.05" :value="smoothingFactor" @input="(e) => emit('smoothingFactor', Number((e.target as HTMLInputElement).value))" />
              <span class="rule-val">{{ smoothingFactor }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="rule-block">
        <div class="rule-block-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          数据配置
        </div>
        <div class="rule-row">
          <div class="rule-item">
            <label>数据来源</label>
            <select class="rule-select" :value="dataSource" @change="(e) => emit('dataSource', (e.target as HTMLSelectElement).value)">
              <option v-for="s in DATA_SOURCES" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </div>
          <div class="rule-item">
            <label>刷新间隔</label>
            <select class="rule-select" :value="refreshInterval" @change="(e) => emit('refreshInterval', Number((e.target as HTMLSelectElement).value))">
              <option v-for="r in REFRESH_INTERVALS" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CONFIDENCE_LEVELS, FORECAST_HORIZONS,
  DATA_SOURCES, REFRESH_INTERVALS,
} from '../../utils/chartConfig'

defineProps<{
  confidenceLevel: number
  forecastHorizon: number
  smoothingFactor: number
  dataSource: string
  refreshInterval: number
}>()

const emit = defineEmits<{
  confidenceLevel: [v: number]
  forecastHorizon: [v: number]
  smoothingFactor: [v: number]
  dataSource: [v: string]
  refreshInterval: [v: number]
}>()
</script>

<style scoped>
.rule-settings {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  font-size: 12.5px;
  color: var(--m3-text-main);
}

.rule-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
  width: 100%;
}

@media (max-width: 640px) {
  .rule-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.rule-block {
  background: var(--m3-surface-variant);
  border: 1px solid var(--m3-border);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.rule-block-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: var(--m3-primary);
  padding-bottom: 5px;
  border-bottom: 1px solid var(--m3-border);
  margin-bottom: 2px;
}

.rule-block-title svg {
  flex-shrink: 0;
}

.rule-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.rule-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.rule-item--wide {
  flex: 1.5;
}

.rule-item--full {
  width: 100%;
}

.rule-item label {
  font-size: 11px;
  color: var(--m3-text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.rule-range-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.rule-range-row input[type="range"] {
  flex: 1;
  height: 4px;
  appearance: none;
  background: var(--m3-border);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  min-width: 60px;
}

.rule-range-row input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--m3-primary);
  cursor: pointer;
}

.rule-val {
  min-width: 28px;
  text-align: right;
  font-size: 11.5px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  color: var(--m3-primary);
}

.rule-select {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid var(--m3-border);
  border-radius: 5px;
  background: var(--m3-surface);
  font-size: 12px;
  color: var(--m3-text-main);
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rule-select:focus {
  border-color: var(--m3-primary);
}
</style>
