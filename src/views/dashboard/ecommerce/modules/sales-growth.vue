<template>
  <section class="panel">
    <h3>Sales growth</h3>
    <p class="value">{{ growth }}</p>
    <p class="desc">Month-over-month growth from platform usage.</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DashboardStat } from "../../../../types/dashboard";

const props = defineProps<{ stats: DashboardStat[] }>();
const growth = computed(() => props.stats[1]?.trend || "+12%");
</script>

<style scoped>
.panel { border: 1px solid #dfe3eb; border-radius: 16px; background: #fff; padding: 14px; }
h3 { margin: 0; font-size: 16px; }
.value { margin: 12px 0 6px; font-size: 32px; color: #137333; font-weight: 700; }
.desc { margin: 0; color: #5f6368; font-size: 12px; }
</style>
