<template>
  <DashboardEcommerce @logout="handleLogout" />
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import DashboardEcommerce from "../dashboard/ecommerce/index.vue";
import { LOGIN_PATH } from "../../router/paths";
import { clearPermissionSnapshot } from "../../utils/permission";

const router = useRouter();

async function handleLogout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userInfo");
  clearPermissionSnapshot();
  await router.replace(LOGIN_PATH);
}
</script>
