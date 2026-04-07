<template>
  <section class="panel">
    <h3>Product sales</h3>
    <ul>
      <li v-for="item in stats" :key="item.id">
        <span>{{ item.title }}</span>
        <strong>{{ item.value }}</strong>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { DashboardStat } from "../../../../types/dashboard";

defineProps<{ stats: DashboardStat[] }>();
</script>

<style scoped>
.panel { border: 1px solid #dfe3eb; border-radius: 16px; background: #fff; padding: 14px; }
h3 { margin: 0 0 10px; font-size: 16px; }
ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
li { display: flex; justify-content: space-between; border-bottom: 1px dashed #e8eaed; padding-bottom: 6px; font-size: 13px; }
strong { color: #202124; }
</style>
