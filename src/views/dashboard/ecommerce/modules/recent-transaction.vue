<template>
  <section class="panel">
    <h3>Recent transaction</h3>
    <ul>
      <li v-for="item in topActivities" :key="item.id">
        <span>{{ item.title }}</span>
        <small>{{ formatTime(item.timestamp) }}</small>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DashboardActivity } from "../../../../types/dashboard";

const props = defineProps<{ activities: DashboardActivity[] }>();
const topActivities = computed(() => props.activities.slice(0, 3));

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString();
}
</script>

<style scoped>
.panel { border: 1px solid #dfe3eb; border-radius: 16px; background: #fff; padding: 14px; }
h3 { margin: 0 0 10px; font-size: 16px; }
ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
li { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; color: #3c4043; border-bottom: 1px dashed #e8eaed; padding-bottom: 6px; }
small { color: #80868b; flex: 0 0 auto; }
</style>
