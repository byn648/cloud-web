<template>
  <div class="green-filter-bar">
    <div class="filter-tabs">
      <button
        class="filter-tab"
        :class="{ active: activeTab === 'filter' }"
        @click="activeTab = 'filter'"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        筛选条件
      </button>
      <button
        class="filter-tab"
        :class="{ active: activeTab === 'rules' }"
        @click="activeTab = 'rules'"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
        规则设置
      </button>
    </div>

    <div class="filter-content" v-if="activeTab === 'filter'">
      <SelectGroup
        label="预测分析类别"
        :options="FORECAST_CATEGORIES"
        :modelValue="forecastCategory"
        @update:modelValue="(v) => emit('forecastCategory', v)"
      />
      <SelectGroup
        label="时间范围"
        :options="TIME_RANGES"
        :modelValue="timeRange"
        @update:modelValue="(v) => emit('timeRange', v)"
      />
      <SelectGroup
        label="服务器"
        :options="FORECAST_SERVERS"
        :modelValue="filterServer"
        @update:modelValue="(v) => emit('filterServer', v)"
      />
      <SelectGroup
        label="服务"
        :options="FORECAST_SERVICES"
        :modelValue="filterService"
        @update:modelValue="(v) => emit('filterService', v)"
      />
      <SelectGroup
        label="实例"
        :options="FORECAST_INSTANCES"
        :modelValue="filterInstance"
        @update:modelValue="(v) => emit('filterInstance', v)"
      />
      <SelectGroup
        label="预测模型"
        :options="FORECAST_MODELS"
        :modelValue="forecastModel"
        @update:modelValue="(v) => emit('forecastModel', v)"
      />
    </div>

    <div class="filter-content filter-content--rules" v-if="activeTab === 'rules'">
      <RuleSettings
        :confidenceLevel="confidenceLevel"
        :forecastHorizon="forecastHorizon"
        :smoothingFactor="smoothingFactor"
        :dataSource="dataSource"
        :refreshInterval="refreshInterval"
        @confidenceLevel="(v) => emit('confidenceLevel', v)"
        @forecastHorizon="(v) => emit('forecastHorizon', v)"
        @smoothingFactor="(v) => emit('smoothingFactor', v)"
        @dataSource="(v) => emit('dataSource', v)"
        @refreshInterval="(v) => emit('refreshInterval', v)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SelectGroup from './SelectGroup.vue'
import RuleSettings from './RuleSettings.vue'
import {
  FORECAST_CATEGORIES,
  TIME_RANGES,
  FORECAST_SERVERS,
  FORECAST_SERVICES,
  FORECAST_INSTANCES,
  FORECAST_MODELS,
} from '../../utils/chartConfig'

defineProps<{
  forecastCategory: string
  timeRange: string
  filterServer: string
  filterService: string
  filterInstance: string
  forecastModel: string
  confidenceLevel: number
  forecastHorizon: number
  smoothingFactor: number
  dataSource: string
  refreshInterval: number
}>()

const emit = defineEmits<{
  forecastCategory: [value: string]
  timeRange: [value: string]
  filterServer: [value: string]
  filterService: [value: string]
  filterInstance: [value: string]
  forecastModel: [value: string]
  confidenceLevel: [value: number]
  forecastHorizon: [value: number]
  smoothingFactor: [value: number]
  dataSource: [value: string]
  refreshInterval: [value: number]
}>()

const activeTab = ref<'filter' | 'rules'>('filter')
</script>

<style scoped>
.green-filter-bar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  gap: 0;
  border-bottom: 1px solid var(--m3-border);
  background: var(--m3-surface);
}

.filter-tabs {
  display: flex;
  gap: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 0 16px;
  border-bottom: 1px solid var(--m3-border);
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--m3-text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  margin-bottom: -1px;
}

.filter-tab:hover {
  color: var(--m3-primary);
}

.filter-tab.active {
  color: var(--m3-primary);
  border-bottom-color: var(--m3-primary);
}

.filter-content {
  display: flex;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
  padding: 12px 16px;
  flex-wrap: wrap;
}

.filter-content--rules {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 8px 16px 16px;
}
</style>
