<template>
  <section class="panel">
    <header>
      <h3>Transaction list</h3>
      <p>Recent activity stream from platform services.</p>
    </header>
    <ul class="timeline">
      <li v-for="item in activities" :key="item.id">
        <span class="dot"></span>
        <div class="body">
          <p class="title">{{ item.title }}</p>
          <p class="detail">{{ item.detail }}</p>
          <p class="time">{{ formatTime(item.timestamp) }}</p>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { DashboardActivity } from "../../../../types/dashboard";

defineProps<{
  activities: DashboardActivity[];
}>();

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}
</script>

<style scoped>
.panel {
  border: 1px solid #dfe3eb;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(45, 62, 80, 0.06);
  padding: 18px;
}

h3 {
  margin: 0;
  font-size: 18px;
}

p {
  margin: 8px 0 0;
  color: #5f6368;
  font-size: 13px;
}

.timeline {
  list-style: none;
  padding: 0;
  margin: 14px 0 0;
}

li {
  display: flex;
  gap: 10px;
  padding: 10px 0;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #1a73e8;
  margin-top: 7px;
}

.title {
  margin: 0;
  color: #202124;
  font-size: 14px;
  font-weight: 600;
}

.detail {
  margin: 4px 0;
  font-size: 13px;
}

.time {
  margin: 0;
  color: #80868b;
  font-size: 12px;
}
</style>
