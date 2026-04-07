<template>
  <section class="panel">
    <header>
      <h3>Total products</h3>
      <p>Service and platform inventory snapshot.</p>
    </header>
    <div class="cards">
      <article v-for="item in leftStats" :key="item.id" class="card">
        <span class="title">{{ item.title }}</span>
        <strong class="value">{{ item.value }}</strong>
        <small :class="item.up ? 'up' : 'down'">{{ item.trend }} · {{ item.caption }}</small>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DashboardStat } from "../../../../types/dashboard";

const props = defineProps<{
  stats: DashboardStat[];
}>();

// Keep first half in this module to match "total-products" card style.
const leftStats = computed(() => props.stats.slice(0, 2));
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

.cards {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.card {
  border: 1px solid #dfe3eb;
  border-radius: 14px;
  padding: 12px;
  background: linear-gradient(145deg, #fff 0%, #f8fbff 100%);
}

.title {
  color: #5f6368;
  font-size: 12px;
}

.value {
  display: block;
  margin-top: 6px;
  font-size: 28px;
}

small {
  display: block;
  margin-top: 6px;
  color: #80868b;
}

.up {
  color: #137333;
}

.down {
  color: #b3261e;
}
</style>
