<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import ApplicationDemoCenter from "../index.vue";
import ApplicationDemoCreateRedirect from "../create/index.vue";
import CreateDeployment from "../../workload/create/deployment/index.vue";
import { installDemoHttpMock, uninstallDemoHttpMock } from "../mock/demoHttpMock";

const route = useRoute();

const isCreateDeployment = computed(
  () => route.path === "/workspace/application-demo/create/deployment"
);
const isCreateRedirect = computed(() => route.path === "/workspace/application-demo/create");
const isList = computed(() => route.path === "/workspace/application-demo");

onMounted(() => installDemoHttpMock());
onUnmounted(() => uninstallDemoHttpMock());
</script>

<template>
  <CreateDeployment v-if="isCreateDeployment" />
  <ApplicationDemoCreateRedirect v-else-if="isCreateRedirect" />
  <ApplicationDemoCenter v-else-if="isList" />
</template>
