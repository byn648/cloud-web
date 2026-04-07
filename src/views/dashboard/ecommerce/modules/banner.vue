<template>
  <section class="banner">
    <div>
      <h1>Welcome back, {{ welcomeName }}</h1>
      <p>Cloud workbench aligned with kube-nova-web naming for easy side-by-side mapping.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  welcomeName: string;
}>();
</script>

<style scoped>
.banner {
  border: 1px solid #dfe3eb;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(45, 62, 80, 0.06);
  padding: 18px 20px;
}

h1 {
  margin: 0;
  font-size: 30px;
  letter-spacing: -0.4px;
}

p {
  margin: 8px 0 0;
  color: #5f6368;
  font-size: 14px;
}

</style>
