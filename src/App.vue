<template>
  <DashboardEcommerce v-if="isAuthenticated" @logout="onLogout" />
  <LoginPage v-else @login-success="onLoginSuccess" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import LoginPage from "./views/auth/login/index.vue";
import DashboardEcommerce from "./views/dashboard/ecommerce/index.vue";

const isAuthenticated = ref(Boolean(localStorage.getItem("accessToken")));

function onLoginSuccess() {
  isAuthenticated.value = true;
}

function onLogout() {
  isAuthenticated.value = false;
}
</script>
