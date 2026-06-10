<template>
  <header class="green-topbar">
    <div class="green-topbar-left">
      <h1 class="green-topbar-title">{{ title }}</h1>
      <span v-if="subtitle" class="green-topbar-subtitle">{{ subtitle }}</span>
    </div>
    <div class="green-topbar-right">
      <span class="green-topbar-date">{{ currentDate }}</span>
      <span class="green-topbar-clock">{{ currentTime }}</span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'

defineProps<{
  title: string
  subtitle?: string
}>()

const currentDate = ref(dayjs().format('YYYY-MM-DD'))
const currentTime = ref(dayjs().format('HH:mm:ss'))
let timer: ReturnType<typeof setInterval>

onMounted(() => {
  timer = setInterval(() => {
    currentDate.value = dayjs().format('YYYY-MM-DD')
    currentTime.value = dayjs().format('HH:mm:ss')
  }, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<style scoped>
.green-topbar {
  height: var(--m3-topbar-height);
  background: var(--m3-surface);
  border-bottom: 1px solid var(--m3-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
  gap: 16px;
}

.green-topbar-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.green-topbar-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--m3-text-main);
  line-height: 1.2;
}

.green-topbar-subtitle {
  font-size: 11.5px;
  color: var(--m3-text-secondary);
}

.green-topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.green-topbar-date {
  font-size: 12px;
  color: var(--m3-text-secondary);
  font-family: 'JetBrains Mono', monospace;
}

.green-topbar-clock {
  font-size: 12px;
  color: var(--m3-text-main);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  background: var(--m3-surface-variant);
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid var(--m3-border);
}
</style>
