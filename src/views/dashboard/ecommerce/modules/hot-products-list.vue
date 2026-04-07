<template>
  <section class="panel">
    <header>
      <h3>Hot products list</h3>
      <p>Quick actions mapped to common cloud operations.</p>
    </header>
    <div class="actions">
      <button v-for="item in actions" :key="item.id" type="button" class="action">
        <span class="name">{{ item.title }}</span>
        <span class="desc">{{ item.description }}</span>
        <span class="route">{{ item.route }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { DashboardAction } from "../../../../types/dashboard";

defineProps<{
  actions: DashboardAction[];
}>();
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

.actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.action {
  border: 1px solid #dfe3eb;
  border-radius: 14px;
  background: #fff;
  text-align: left;
  padding: 12px;
  cursor: pointer;
}

.action:hover {
  border-color: #a8c7fa;
}

.name {
  display: block;
  color: #1a73e8;
  font-weight: 600;
}

.desc {
  display: block;
  color: #5f6368;
  font-size: 12px;
  margin-top: 6px;
  min-height: 30px;
}

.route {
  display: block;
  color: #80868b;
  font-size: 11px;
  margin-top: 8px;
}

@media (max-width: 700px) {
  .actions {
    grid-template-columns: 1fr;
  }
}
</style>
