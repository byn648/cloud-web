<template>
  <div class="panel-body">
    <div class="auth-type-list">
      <button
        v-for="option in authTypeOptions"
        :key="option.value"
        type="button"
        class="auth-type-item"
        :class="{ active: modelValue.authType === option.value }"
        @click="onInput('authType', option.value)"
      >
        <strong>{{ option.label }}</strong>
        <small>{{ option.description }}</small>
      </button>
    </div>

    <div class="form-grid">
      <label
        class="field"
        v-if="
          modelValue.authType === 'token' ||
          modelValue.authType === 'certificate' ||
          modelValue.authType === 'incluster'
        "
      >
        <span>API Server 地址</span>
        <input
          :value="modelValue.apiServerHost"
          :placeholder="
            modelValue.authType === 'incluster'
              ? '可留空，默认 https://kubernetes.default.svc'
              : 'https://x.x.x.x:6443'
          "
          @input="onInput('apiServerHost', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <label class="field full" v-if="modelValue.authType === 'kubeconfig'">
        <span>KubeConfig 内容</span>
        <textarea
          :value="modelValue.kubeFile"
          rows="8"
          placeholder="粘贴 kubeconfig 内容"
          @input="onInput('kubeFile', ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
      </label>

      <label class="field full" v-if="modelValue.authType === 'token'">
        <span>Token</span>
        <textarea
          :value="modelValue.token"
          rows="4"
          placeholder="输入 Bearer Token"
          @input="onInput('token', ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
      </label>

      <template v-if="modelValue.authType === 'certificate'">
        <label class="field full">
          <span>CA 证书</span>
          <textarea
            :value="modelValue.caCert"
            rows="5"
            placeholder="-----BEGIN CERTIFICATE-----"
            @input="onInput('caCert', ($event.target as HTMLTextAreaElement).value)"
          ></textarea>
        </label>

        <label class="field full">
          <span>客户端证书</span>
          <textarea
            :value="modelValue.clientCert"
            rows="5"
            placeholder="-----BEGIN CERTIFICATE-----"
            @input="onInput('clientCert', ($event.target as HTMLTextAreaElement).value)"
          ></textarea>
        </label>

        <label class="field full">
          <span>客户端密钥</span>
          <textarea
            :value="modelValue.clientKey"
            rows="5"
            placeholder="-----BEGIN PRIVATE KEY-----"
            @input="onInput('clientKey', ($event.target as HTMLTextAreaElement).value)"
          ></textarea>
        </label>
      </template>

      <label class="field">
        <span>TLS 校验</span>
        <select
          :value="modelValue.insecureSkipVerify"
          @change="onInput('insecureSkipVerify', Number(($event.target as HTMLSelectElement).value))"
        >
          <option :value="0">启用证书校验</option>
          <option :value="1">跳过证书校验</option>
        </select>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { authTypeOptions } from "../../constants";

export interface AuthConfigForm {
  authType: string;
  apiServerHost: string;
  kubeFile: string;
  token: string;
  caCert: string;
  clientCert: string;
  clientKey: string;
  insecureSkipVerify: number;
}

const props = defineProps<{
  modelValue: AuthConfigForm;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: AuthConfigForm];
}>();

function onInput<K extends keyof AuthConfigForm>(key: K, value: AuthConfigForm[K]): void {
  emit("update:modelValue", {
    ...props.modelValue,
    [key]: value
  });
}
</script>

<style scoped>
.panel-body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-type-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 10px;
}

.auth-type-item {
  border: 1px solid #dce5f1;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  padding: 10px;
  cursor: pointer;
}

.auth-type-item.active {
  border-color: #5a6fe8;
  background: #eef2ff;
}

.auth-type-item strong {
  display: block;
  color: #1f2a3d;
  font-size: 13px;
}

.auth-type-item small {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field.full {
  grid-column: 1 / -1;
}

.field span {
  color: #4b5f7a;
  font-size: 12px;
  font-weight: 600;
}

.field input,
.field textarea,
.field select {
  border: 1px solid #d2dcea;
  border-radius: 10px;
  background: #fff;
  color: #1f2a3d;
  font-size: 13px;
  padding: 9px 10px;
  outline: none;
}

.field input:focus,
.field textarea:focus,
.field select:focus {
  border-color: #6e7df3;
  box-shadow: 0 0 0 3px rgba(110, 125, 243, 0.14);
}

@media (max-width: 1100px) {
  .auth-type-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
