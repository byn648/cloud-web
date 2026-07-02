<template>
  <aside class="green-sidebar">
    <div class="green-logo">
      <span class="green-logo-mark">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill="var(--m3-primary)" opacity="0.9" />
          <path d="M2 17l10 5 10-5" stroke="var(--m3-primary)" stroke-width="1.5" stroke-linecap="round" />
          <path d="M2 12l10 5 10-5" stroke="var(--m3-primary)" stroke-width="1.5" stroke-linecap="round" opacity="0.6" />
        </svg>
      </span>
      <span class="green-logo-text">GreenCC</span>
    </div>

    <div class="green-menu-scroll">
      <ul class="menu" style="list-style: none; padding: 0; margin: 0;">
        <li v-for="item in navItems" :key="item.path" style="margin-bottom: 4px;">
          <div
            class="green-nav-row"
            :class="{ active: currentPath === item.path }"
            @click="navigateTo(item.path)"
          >
            <div class="green-nav-row-left">
              <div class="green-icon-circle" :style="{ backgroundColor: item.iconBg }">
                <span class="green-icon-svg" v-html="item.icon"></span>
              </div>
              <span>{{ item.label }}</span>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <div class="green-sidebar-footer">
      <div class="green-status-row">
        <span class="green-status-dot"></span>
        <span>系统运行中</span>
      </div>
      <div class="green-version">v1.0.0</div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  currentPath: string
}>()

const emit = defineEmits<{
  navigate: [path: string]
}>()

const router = useRouter()

const navItems = [
  {
    path: '/green',
    label: '集群概览',
    iconBg: '#bbf7d0',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="#052e16" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>`,
  },
  {
    path: '/green/forecast',
    label: '预测分析',
    iconBg: '#d3e3fd',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="#041e49" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>`,
  },
  {
    path: '/green/performance',
    label: '性能管控',
    iconBg: '#a8c7fa',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="#041e49" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>`,
  },
]

function navigateTo(path: string) {
  emit('navigate', path)
  router.push(path)
}
</script>

<style scoped>
.green-sidebar {
  width: var(--m3-sidebar-width);
  height: 100vh;
  background: var(--m3-sidebar-bg);
  border-right: 1px solid var(--m3-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  overflow: hidden;
}

.green-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px 16px;
  border-bottom: 1px solid var(--m3-border);
}

.green-logo-mark {
  display: flex;
  align-items: center;
  justify-content: center;
}

.green-logo-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--m3-primary);
}

.green-menu-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 12px 8px;
}

.green-menu-scroll::-webkit-scrollbar {
  width: 4px;
}

.green-menu-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.green-menu-scroll::-webkit-scrollbar-thumb {
  background: var(--m3-border);
  border-radius: 2px;
}

.green-nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--m3-sidebar-text);
}

.green-nav-row:hover {
  background: var(--m3-sidebar-hover-bg);
  color: var(--m3-sidebar-hover-text);
}

.green-nav-row.active {
  background: var(--m3-sidebar-active-bg);
  color: var(--m3-sidebar-active-text);
}

.green-nav-row-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.green-icon-circle {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.green-icon-svg {
  display: flex;
  align-items: center;
  justify-content: center;
}

.green-sidebar-footer {
  padding: 14px 16px;
  border-top: 1px solid var(--m3-border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.green-status-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--m3-text-secondary);
}

.green-status-dot {
  width: 6px;
  height: 6px;
  background: #166534;
  border-radius: 50%;
  flex-shrink: 0;
}

.green-version {
  font-size: 10px;
  color: var(--m3-text-secondary);
  font-family: 'JetBrains Mono', monospace;
}
</style>
