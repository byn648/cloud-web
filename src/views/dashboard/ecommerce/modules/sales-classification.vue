<template>
  <section class="panel">
    <h3>Sales classification</h3>
    <div class="chips">
      <span v-for="item in actions" :key="item.id">{{ item.title }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { DashboardAction } from "../../../../types/dashboard";

defineProps<{ actions: DashboardAction[] }>();
</script>

<style scoped>
.panel { border: 1px solid #dfe3eb; border-radius: 16px; background: #fff; padding: 14px; }
h3 { margin: 0 0 10px; font-size: 16px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chips span { border: 1px solid #dfe3eb; background: #f8fbff; color: #1a73e8; border-radius: 999px; padding: 6px 10px; font-size: 12px; }
</style>
