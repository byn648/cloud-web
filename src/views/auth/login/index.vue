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
          <input v-model.trim="form.password" type="password" autocomplete="current-password" placeholder="••••••••" required />
        </label>

        <button class="submit" :disabled="loading">
          <span v-if="loading">Signing in...</span>
          <span v-else>Sign in</span>
        </button>

        <section v-if="resetPasswordFlow.visible" class="reset-panel">
          <h3>首次登录重置密码</h3>
          <p>账号 {{ resetPasswordFlow.username }} 需要先设置新密码后才能继续登录。</p>

          <label class="field">
            <span>New password</span>
            <input
              v-model.trim="resetPasswordFlow.newPassword"
              type="password"
              autocomplete="new-password"
              placeholder="至少7位，含大小写字母/数字/特殊字符"
            />
          </label>

          <label class="field">
            <span>Confirm password</span>
            <input
              v-model.trim="resetPasswordFlow.confirmPassword"
              type="password"
              autocomplete="new-password"
              placeholder="再次输入新密码"
            />
          </label>

          <button
            type="button"
            class="submit reset-submit"
            :disabled="resetPasswordFlow.submitting || loading"
            @click="handleResetPasswordAndLogin"
          >
            <span v-if="resetPasswordFlow.submitting">Resetting...</span>
            <span v-else>Reset Password & Sign in</span>
          </button>
        </section>

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
import { updateUserPasswordApi } from "../../../api/portal/user";
import { HOME_PATH, LOGIN_PATH } from "../../../router/paths";
import type { AuthLoginResponse } from "../../../types/auth";
import { clearPermissionSnapshot, refreshPermissionSnapshot } from "../../../utils/permission";

const emit = defineEmits<{
  "login-success": [];
}>();
const router = useRouter();
const route = useRoute();

const form = reactive({
  username: "",
  password: ""
});

const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const resetPasswordFlow = reactive({
  visible: false,
  submitting: false,
  username: "",
  oldPassword: "",
  newPassword: "",
  confirmPassword: ""
});

const PASSWORD_COMPLEXITY_REGEXP = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/;

function isResetPasswordTip(message: string): boolean {
  return message.includes("重置密码") || message.includes("101112");
}

function validateResetPassword(newPassword: string, confirmPassword: string, oldPassword: string): string {
  if (!newPassword) {
    return "请输入新密码";
  }
  if (newPassword.length <= 6) {
    return "新密码长度必须大于6位";
  }
  if (!PASSWORD_COMPLEXITY_REGEXP.test(newPassword)) {
    return "新密码必须包含大写字母、小写字母、数字和特殊字符";
  }
  if (newPassword !== confirmPassword) {
    return "两次输入的新密码不一致";
  }
  if (newPassword === oldPassword) {
    return "新密码不能与旧密码一致";
  }
  return "";
}

function saveLoginSession(data: AuthLoginResponse) {
  clearPermissionSnapshot();
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
}

async function finishLogin(data: AuthLoginResponse) {
  if (!data?.token?.accessToken || !data?.token?.refreshToken) {
    throw new Error("Login succeeded but token is missing in response");
  }

  saveLoginSession(data);
  try {
    await refreshPermissionSnapshot();
  } catch (error) {
    console.error("Prefetch permission snapshot failed", error);
  }
  resetPasswordFlow.visible = false;
  emit("login-success");
  successMessage.value = `Welcome back, ${data.nickName}!`;
  const redirect =
    typeof route.query.redirect === "string" && route.query.redirect.trim()
      ? route.query.redirect
      : HOME_PATH;
  await router.replace(redirect === LOGIN_PATH ? HOME_PATH : redirect);
}

async function handleSubmit() {
  errorMessage.value = "";
  successMessage.value = "";
  loading.value = true;

  try {
    const data = await loginApi({
      username: form.username,
      password: form.password
    });
    await finishLogin(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    if (isResetPasswordTip(message) && form.username.trim() && form.password) {
      resetPasswordFlow.visible = true;
      resetPasswordFlow.username = form.username.trim();
      resetPasswordFlow.oldPassword = form.password;
      resetPasswordFlow.newPassword = "";
      resetPasswordFlow.confirmPassword = "";
      errorMessage.value = "";
      successMessage.value = "账号需要重置密码，请先设置新密码。";
    } else {
      resetPasswordFlow.visible = false;
      errorMessage.value = message;
    }
  } finally {
    loading.value = false;
  }
}

async function handleResetPasswordAndLogin() {
  errorMessage.value = "";
  successMessage.value = "";

  if (!resetPasswordFlow.username || !resetPasswordFlow.oldPassword) {
    errorMessage.value = "请先使用初始密码尝试登录，再进行重置密码";
    return;
  }

  const passwordValidationMessage = validateResetPassword(
    resetPasswordFlow.newPassword,
    resetPasswordFlow.confirmPassword,
    resetPasswordFlow.oldPassword
  );
  if (passwordValidationMessage) {
    errorMessage.value = passwordValidationMessage;
    return;
  }

  resetPasswordFlow.submitting = true;

  try {
    await updateUserPasswordApi(
      {
        username: resetPasswordFlow.username,
        oldPassword: resetPasswordFlow.oldPassword,
        newPassword: resetPasswordFlow.newPassword,
        confirmPassword: resetPasswordFlow.confirmPassword
      },
      { auth: false }
    );

    const data = await loginApi({
      username: resetPasswordFlow.username,
      password: resetPasswordFlow.newPassword
    });
    await finishLogin(data);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "重置密码失败";
  } finally {
    resetPasswordFlow.submitting = false;
  }
}
</script>

<style scoped>
@import "./style.css";
</style>
