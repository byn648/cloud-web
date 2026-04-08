<template>
  <main class="page">
    <section class="shell">
      <header class="brand">
        <div class="dot-row" aria-hidden="true">
          <span class="dot b"></span>
          <span class="dot r"></span>
          <span class="dot y"></span>
          <span class="dot g"></span>
        </div>
        <h1>Sign in</h1>
        <p>to continue to Cloud Console</p>
      </header>

      <form class="card" @submit.prevent="handleSubmit">
        <label class="field">
          <span>Username</span>
          <input v-model.trim="form.username" type="text" autocomplete="username" placeholder="super_admin" required />
        </label>

        <label class="field">
          <span>Password</span>
          <input v-model="form.password" type="password" autocomplete="current-password" placeholder="••••••••" required />
        </label>

        <button class="submit" :disabled="loading">
          <span v-if="loading">Signing in...</span>
          <span v-else>Sign in</span>
        </button>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        <p v-if="successMessage" class="success">{{ successMessage }}</p>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { loginApi } from "../../../api/portal/auth";
import { HOME_PATH, LOGIN_PATH } from "../../../router/paths";

const emit = defineEmits<{
  "login-success": [];
}>();
const router = useRouter();
const route = useRoute();

const form = reactive({
  username: "super_admin",
  password: "admin123"
});

const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

async function handleSubmit() {
  errorMessage.value = "";
  successMessage.value = "";
  loading.value = true;

  try {
    const data = await loginApi({
      username: form.username,
      password: form.password
    });

    if (!data?.token?.accessToken || !data?.token?.refreshToken) {
      throw new Error("Login succeeded but token is missing in response");
    }

    localStorage.setItem("accessToken", data.token.accessToken);
    localStorage.setItem("refreshToken", data.token.refreshToken);
    localStorage.setItem(
      "userInfo",
      JSON.stringify({
        userId: data.userId,
        username: data.username,
        nickName: data.nickName,
        uuid: data.uuid,
        roles: data.roles
      })
    );

    emit("login-success");
    successMessage.value = `Welcome back, ${data.nickName}!`;
    const redirect =
      typeof route.query.redirect === "string" && route.query.redirect.trim()
        ? route.query.redirect
        : HOME_PATH;
    await router.replace(redirect === LOGIN_PATH ? HOME_PATH : redirect);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Login failed";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
@import "./style.css";
</style>
