<template>
  <section class="panel">
    <h3>Hot commodity</h3>
    <ol>
      <li v-for="item in actions" :key="item.id">{{ item.title }}</li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import type { DashboardAction } from "../../../../types/dashboard";

defineProps<{ actions: DashboardAction[] }>();
</script>

<style scoped>
.panel { border: 1px solid #dfe3eb; border-radius: 16px; background: #fff; padding: 14px; }
h3 { margin: 0 0 10px; font-size: 16px; }
ol { margin: 0; padding-left: 18px; display: grid; gap: 6px; font-size: 13px; color: #3c4043; }
</style>
