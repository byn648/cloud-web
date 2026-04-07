<template>
  <section class="panel">
    <h3>Sales trend</h3>
    <div class="bars">
      <span v-for="(v, i) in values" :key="i" :style="{ height: `${v}%` }"></span>
    </div>
    <p>7-day service activity trend.</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DashboardStat } from "../../../../types/dashboard";

const props = defineProps<{ stats: DashboardStat[] }>();
const values = computed(() => {
  const base = props.stats.length ? [34, 48, 40, 62, 58, 74, 66] : [18, 30, 22, 40, 36, 50, 44];
  return base;
});
</script>

<style scoped>
.panel { border: 1px solid #dfe3eb; border-radius: 16px; background: #fff; padding: 14px; }
h3 { margin: 0; font-size: 16px; }
.bars { margin: 10px 0; height: 90px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; align-items: end; }
.bars span { display: block; border-radius: 999px; background: linear-gradient(180deg, #1a73e8, #8ab4f8); }
p { margin: 0; font-size: 12px; color: #5f6368; }
</style>
