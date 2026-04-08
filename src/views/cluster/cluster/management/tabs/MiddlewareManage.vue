<template>
  <div class="middleware-panel">
    <div v-if="noticeMsg" class="inline-notice success">{{ noticeMsg }}</div>
    <div v-if="errorMsg" class="inline-notice error">{{ errorMsg }}</div>

    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">MW</div>
        <div class="header-text">
          <h2>中间件管理</h2>
          <p>监控、日志、链路追踪和告警系统配置</p>
        </div>
      </div>
      <button type="button" class="refresh-btn" :disabled="appListLoading" @click="refreshAppStatus">
        {{ appListLoading ? "刷新中..." : "刷新" }}
      </button>
    </div>

    <div v-if="appListLoading" class="loading-state">正在读取中间件配置...</div>

    <div v-else class="apps-container">
      <section v-for="category in applications" :key="category.category" class="category-section">
        <div class="category-header">
          <div class="category-info">
            <div class="category-icon" :style="{ background: category.gradient }">{{ category.categoryBadge }}</div>
            <span class="category-name">{{ category.category }}</span>
            <span class="category-count">{{ category.items.length }} 个组件</span>
          </div>
          <div class="category-stats">
            <span class="stat healthy">{{ category.items.filter((item) => item.isHealthy).length }} 运行中</span>
          </div>
        </div>

        <div class="apps-grid">
          <article
            v-for="app in category.items"
            :key="app.code"
            class="app-card"
            :class="{ healthy: app.isHealthy, error: app.isConfigured && !app.isHealthy }"
            @click="openConfigDialog(app)"
          >
            <div class="status-bar" :class="statusClass(app)"></div>

            <div class="card-content">
              <div class="card-top">
                <div class="app-icon" :style="{ background: `${category.color}1f` }">
                  <img v-if="app.iconSrc" :src="app.iconSrc" :alt="app.name" />
                  <span v-else>{{ app.name.slice(0, 1) }}</span>
                </div>
                <div class="app-info">
                  <h4>{{ app.name }}</h4>
                  <p>{{ app.description }}</p>
                  <div class="feature-line">{{ app.features.slice(0, 2).join(" · ") }}</div>
                </div>
              </div>

              <div class="card-footer">
                <div class="meta">
                  <button
                    type="button"
                    class="port-btn"
                    :class="{ clickable: app.isConfigured && Boolean(getConfiguredAppInfo(app).appUrl) }"
                    @click="openAppUrl(app, $event)"
                  >
                    <span>🌐</span>
                    {{ app.isConfigured ? getConfiguredAppInfo(app).port : app.defaultPort }}
                  </button>
                  <span class="status-chip" :class="statusClass(app)">{{ statusLabel(app) }}</span>
                </div>
                <div class="actions">
                  <button
                    v-if="app.isConfigured"
                    type="button"
                    class="test-btn"
                    :disabled="Boolean(cardTestLoading[app.code])"
                    @click="testCardConnection(app, $event)"
                  >
                    {{ cardTestLoading[app.code] ? "测试中..." : "测试连接" }}
                  </button>
                  <span class="config-btn">{{ app.isConfigured ? "修改" : "配置" }} ›</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <div v-if="configDialogVisible" class="dialog-mask" @click.self="closeDialog">
      <div class="dialog-panel">
        <header class="dialog-header">
          <h3>配置 {{ currentApp }}</h3>
          <button type="button" class="close-btn" :disabled="saveLoading || testLoading" @click="closeDialog">×</button>
        </header>

        <div v-if="dialogMsg" class="dialog-notice success">{{ dialogMsg }}</div>
        <div v-if="dialogError" class="dialog-notice error">{{ dialogError }}</div>

        <div v-if="configLoading" class="dialog-loading">正在加载配置...</div>

        <form v-else class="config-form" @submit.prevent="saveConfig">
          <section class="form-section">
            <h4>基本信息</h4>
            <div class="form-row two-col">
              <label class="field">
                <span>应用名称</span>
                <input v-model="configForm.appName" type="text" disabled />
              </label>
              <label class="field">
                <span>应用标识</span>
                <input v-model="configForm.appCode" type="text" disabled />
              </label>
            </div>
            <div class="form-row">
              <label class="field">
                <span>应用类型</span>
                <input :value="getAppTypeLabel(configForm.appType)" type="text" disabled />
              </label>
            </div>
          </section>

          <section class="form-section">
            <h4>连接信息</h4>
            <div class="form-row">
              <label class="field">
                <span>访问地址</span>
                <div class="url-input-group">
                  <select v-model="configForm.protocol" class="protocol-select">
                    <option v-for="option in protocolOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                  <input v-model.trim="configForm.appUrl" type="text" placeholder="如: 192.168.1.100 或 prometheus.example.com" @input="clearFieldError('appUrl')" />
                </div>
                <small class="tip">不需要填写协议前缀，通过左侧选择协议</small>
                <small v-if="formErrors.appUrl" class="field-error">{{ formErrors.appUrl }}</small>
              </label>
            </div>

            <div class="form-row two-col">
              <label class="field">
                <span>服务端口</span>
                <input v-model.number="configForm.port" type="number" placeholder="如: 9090" @input="clearFieldError('port')" />
                <small v-if="formErrors.port" class="field-error">{{ formErrors.port }}</small>
              </label>
            </div>
          </section>

          <section class="form-section">
            <h4>认证配置</h4>
            <label class="switch-row">
              <span>启用认证</span>
              <input type="checkbox" :checked="configForm.authEnabled === 1" @change="onAuthEnabledToggle" />
              <b>{{ configForm.authEnabled === 1 ? "已启用" : "已禁用" }}</b>
            </label>

            <template v-if="configForm.authEnabled === 1">
              <div class="form-row">
                <label class="field">
                  <span>认证类型</span>
                  <select v-model="configForm.authType" @change="onAuthTypeChange">
                    <option v-for="option in authTypeOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
              </div>

              <div v-if="showBasicAuth" class="form-row two-col">
                <label class="field">
                  <span>用户名</span>
                  <input v-model.trim="configForm.username" type="text" @input="clearFieldError('username')" />
                  <small v-if="formErrors.username" class="field-error">{{ formErrors.username }}</small>
                </label>
                <label class="field">
                  <span>密码</span>
                  <input v-model="configForm.password" type="password" @input="clearFieldError('password')" />
                  <small v-if="formErrors.password" class="field-error">{{ formErrors.password }}</small>
                </label>
              </div>

              <div v-if="showTokenAuth" class="form-row">
                <label class="field">
                  <span>Token</span>
                  <textarea v-model="configForm.token" rows="3" placeholder="请输入 Bearer Token" @input="clearFieldError('token')"></textarea>
                  <small v-if="formErrors.token" class="field-error">{{ formErrors.token }}</small>
                </label>
              </div>

              <div v-if="showApiKeyAuth" class="form-row two-col">
                <label class="field">
                  <span>Access Key</span>
                  <input v-model.trim="configForm.accessKey" type="text" @input="clearFieldError('accessKey')" />
                  <small v-if="formErrors.accessKey" class="field-error">{{ formErrors.accessKey }}</small>
                </label>
                <label class="field">
                  <span>Access Secret</span>
                  <input v-model="configForm.accessSecret" type="password" @input="clearFieldError('accessSecret')" />
                  <small v-if="formErrors.accessSecret" class="field-error">{{ formErrors.accessSecret }}</small>
                </label>
              </div>

              <template v-if="showCertAuth">
                <div class="form-row">
                  <label class="field">
                    <span>CA 证书</span>
                    <textarea v-model="configForm.caCert" rows="3" placeholder="CA证书（PEM格式）" @input="clearFieldError('caCert')"></textarea>
                    <small v-if="formErrors.caCert" class="field-error">{{ formErrors.caCert }}</small>
                  </label>
                </div>
                <div class="form-row">
                  <label class="field">
                    <span>客户端证书</span>
                    <textarea v-model="configForm.clientCert" rows="3" placeholder="客户端证书（PEM格式）" @input="clearFieldError('clientCert')"></textarea>
                    <small v-if="formErrors.clientCert" class="field-error">{{ formErrors.clientCert }}</small>
                  </label>
                </div>
                <div class="form-row">
                  <label class="field">
                    <span>客户端密钥</span>
                    <textarea v-model="configForm.clientKey" rows="3" placeholder="客户端密钥（PEM格式）" @input="clearFieldError('clientKey')"></textarea>
                    <small v-if="formErrors.clientKey" class="field-error">{{ formErrors.clientKey }}</small>
                  </label>
                </div>
              </template>

              <template v-if="showTlsConfig">
                <label class="switch-row">
                  <span>TLS</span>
                  <input type="checkbox" :checked="configForm.tlsEnabled === 1" @change="onTlsEnabledToggle" />
                  <b>{{ configForm.tlsEnabled === 1 ? "已启用" : "已禁用" }}</b>
                </label>

                <template v-if="configForm.tlsEnabled === 1">
                  <div class="form-row">
                    <label class="field">
                      <span>CA 证书</span>
                      <textarea v-model="configForm.caFile" rows="3" placeholder="CA证书（PEM格式）" @input="clearFieldError('caFile')"></textarea>
                      <small v-if="formErrors.caFile" class="field-error">{{ formErrors.caFile }}</small>
                    </label>
                  </div>
                  <div class="form-row">
                    <label class="field">
                      <span>CA Key</span>
                      <textarea v-model="configForm.caKey" rows="3" placeholder="CA Key（PEM格式）" @input="clearFieldError('caKey')"></textarea>
                      <small v-if="formErrors.caKey" class="field-error">{{ formErrors.caKey }}</small>
                    </label>
                  </div>
                </template>
              </template>

              <label v-if="showInsecureOption" class="switch-row">
                <span>跳过证书验证</span>
                <input type="checkbox" :checked="configForm.insecureSkipVerify === 1" @change="onInsecureToggle" />
                <b>{{ configForm.insecureSkipVerify === 1 ? "是" : "否" }}</b>
              </label>
            </template>
          </section>

          <footer class="dialog-footer">
            <button type="button" class="ghost-btn" :disabled="saveLoading || testLoading" @click="closeDialog">取消</button>
            <button type="button" class="test-action-btn" :disabled="saveLoading || testLoading" @click="testConnection">
              {{ testLoading ? "测试中..." : "测试连接" }}
            </button>
            <button type="submit" class="save-btn" :disabled="saveLoading || testLoading">
              {{ saveLoading ? "保存中..." : "保存配置" }}
            </button>
          </footer>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type { Cluster } from "../../../../../api/manager/cluster";
import {
  addClusterAppApi,
  getClusterAppDetailApi,
  getClusterAppListApi,
  validateClusterAppApi,
  type AddClusterAppRequest,
  type ClusterAppDetail
} from "../../../../../api/manager";
import {
  appTypeMap,
  authTypeOptions,
  createMiddlewareApplications,
  getAppTypeLabel,
  protocolOptions,
  type AppCategory,
  type AppItem
} from "./middleware-config";

interface Props {
  clusterDetail?: Cluster | null;
  clusterId?: number | null;
  clusterUuid?: string;
  isActive?: boolean;
}

interface ConfigForm {
  id?: number;
  clusterUuid: string;
  appName: string;
  appCode: string;
  appType: number;
  isDefault: number;
  appUrl: string;
  port?: number;
  protocol: "http" | "https" | "grpc";
  authEnabled: number;
  authType: "none" | "basic" | "token" | "apikey" | "certificate";
  username: string;
  password: string;
  token: string;
  accessKey: string;
  accessSecret: string;
  tlsEnabled: number;
  caFile: string;
  caKey: string;
  caCert: string;
  clientCert: string;
  clientKey: string;
  insecureSkipVerify: number;
  updatedBy: string;
}

const props = defineProps<Props>();

const configDialogVisible = ref(false);
const currentApp = ref("");
const currentAppItem = ref<AppItem | null>(null);
const configLoading = ref(false);
const saveLoading = ref(false);
const testLoading = ref(false);
const cardTestLoading = reactive<Record<string, boolean>>({});
const appListLoading = ref(false);
const configuredApps = ref<ClusterAppDetail[]>([]);
const applications = ref<AppCategory[]>(createMiddlewareApplications());

const noticeMsg = ref("");
const errorMsg = ref("");
const dialogMsg = ref("");
const dialogError = ref("");

const formErrors = reactive<Record<string, string>>({});

const resolvedClusterUuid = computed(() => {
  return (props.clusterUuid || props.clusterDetail?.uuid || "").trim();
});

const configForm = reactive<ConfigForm>({
  id: undefined,
  clusterUuid: resolvedClusterUuid.value,
  appName: "",
  appCode: "",
  appType: 1,
  appUrl: "",
  port: undefined,
  protocol: "http",
  authEnabled: 0,
  authType: "none",
  username: "",
  password: "",
  token: "",
  accessKey: "",
  accessSecret: "",
  tlsEnabled: 0,
  caFile: "",
  caKey: "",
  caCert: "",
  clientCert: "",
  clientKey: "",
  insecureSkipVerify: 0,
  isDefault: 0,
  updatedBy: ""
});

const showBasicAuth = computed(() => configForm.authEnabled === 1 && configForm.authType === "basic");
const showTokenAuth = computed(() => configForm.authEnabled === 1 && configForm.authType === "token");
const showApiKeyAuth = computed(() => configForm.authEnabled === 1 && configForm.authType === "apikey");
const showCertAuth = computed(() => configForm.authEnabled === 1 && configForm.authType === "certificate");
const showTlsConfig = computed(() => configForm.authEnabled === 1 && configForm.authType === "apikey");
const showInsecureOption = computed(() => configForm.authEnabled === 1 && configForm.authType !== "none");

function setNotice(message: string): void {
  noticeMsg.value = message;
  errorMsg.value = "";
}

function setError(message: string): void {
  noticeMsg.value = "";
  errorMsg.value = message;
}

function setDialogNotice(message: string): void {
  dialogMsg.value = message;
  dialogError.value = "";
}

function setDialogError(message: string): void {
  dialogMsg.value = "";
  dialogError.value = message;
}

function statusLabel(item: AppItem): string {
  if (!item.isConfigured) return "未配置";
  if (item.isHealthy) return "正常";
  return "异常";
}

function statusClass(item: AppItem): string {
  if (!item.isConfigured) return "pending";
  if (item.isHealthy) return "healthy";
  return "error";
}

function getConfiguredAppInfo(appItem: AppItem): {
  port: number;
  protocol: string;
  appUrl: string;
  fullUrl: string;
} {
  const configuredApp = configuredApps.value.find((app) => app.appCode === appItem.code);
  if (configuredApp) {
    const protocol = configuredApp.protocol || "http";
    const appUrl = configuredApp.appUrl || "";
    const port = configuredApp.port || appItem.defaultPort;
    return {
      port,
      protocol,
      appUrl,
      fullUrl: appUrl ? `${protocol}://${appUrl}:${port}` : ""
    };
  }

  return {
    port: appItem.defaultPort,
    protocol: "http",
    appUrl: "",
    fullUrl: ""
  };
}

function openAppUrl(appItem: AppItem, event: Event): void {
  event.stopPropagation();
  const info = getConfiguredAppInfo(appItem);
  if (!info.fullUrl || !info.appUrl) {
    setError("应用地址未配置，无法访问");
    return;
  }
  window.open(info.fullUrl, "_blank");
}

function isValidProtocol(value: string): value is ConfigForm["protocol"] {
  return value === "http" || value === "https" || value === "grpc";
}

function toUiAuthType(value: string): ConfigForm["authType"] {
  if (value === "apiKey" || value === "apikey") return "apikey";
  if (value === "bearer" || value === "token") return "token";
  if (value === "basic") return "basic";
  if (value === "certificate") return "certificate";
  return "none";
}

function toRequestAuthType(value: ConfigForm["authType"]): AddClusterAppRequest["authType"] {
  if (value === "apikey") return "apiKey";
  return value;
}

function clearFormErrors(): void {
  Object.keys(formErrors).forEach((key) => {
    delete formErrors[key];
  });
}

function clearFieldError(field: string): void {
  delete formErrors[field];
}

function resetAuthFields(): void {
  configForm.username = "";
  configForm.password = "";
  configForm.token = "";
  configForm.accessKey = "";
  configForm.accessSecret = "";
  configForm.caFile = "";
  configForm.caKey = "";
  configForm.caCert = "";
  configForm.clientCert = "";
  configForm.clientKey = "";
  configForm.tlsEnabled = 0;
  configForm.insecureSkipVerify = 0;
}

function resetForm(appItem: AppItem): void {
  Object.assign(configForm, {
    id: undefined,
    clusterUuid: resolvedClusterUuid.value,
    appName: `${appItem.name}-${props.clusterDetail?.name || "默认"}`,
    appCode: appItem.code,
    appType: appTypeMap[appItem.type] || 1,
    appUrl: "",
    port: appItem.defaultPort,
    protocol: "http",
    authEnabled: 0,
    authType: "none",
    username: "",
    password: "",
    token: "",
    accessKey: "",
    accessSecret: "",
    tlsEnabled: 0,
    caFile: "",
    caKey: "",
    caCert: "",
    clientCert: "",
    clientKey: "",
    insecureSkipVerify: 0,
    isDefault: 0,
    updatedBy: ""
  } satisfies ConfigForm);
}

function applyAppStatus(configList: ClusterAppDetail[]): void {
  applications.value.forEach((category) => {
    category.items.forEach((item) => {
      const configuredApp = configList.find((app) => app.appCode === item.code);
      if (configuredApp) {
        item.isConfigured = true;
        item.isHealthy = configuredApp.status === 1;
        item.id = configuredApp.id;
      } else {
        item.isConfigured = false;
        item.isHealthy = false;
        item.id = undefined;
      }
    });
  });
}

async function loadAppList(): Promise<boolean> {
  if (!resolvedClusterUuid.value) {
    configuredApps.value = [];
    applyAppStatus([]);
    return false;
  }

  appListLoading.value = true;
  try {
    const response = await getClusterAppListApi(resolvedClusterUuid.value);
    configuredApps.value = Array.isArray(response) ? response : [];
    applyAppStatus(configuredApps.value);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取中间件配置失败";
    setError(message);
    return false;
  } finally {
    appListLoading.value = false;
  }
}

async function loadAppConfig(appId: number): Promise<void> {
  try {
    const appDetail = await getClusterAppDetailApi(appId);
    Object.assign(configForm, {
      id: appDetail.id,
      clusterUuid: appDetail.clusterUuid,
      appName: appDetail.appName,
      appCode: appDetail.appCode,
      appType: appDetail.appType,
      appUrl: appDetail.appUrl,
      port: appDetail.port,
      protocol: isValidProtocol(appDetail.protocol) ? appDetail.protocol : "http",
      authEnabled: appDetail.authEnabled,
      authType: toUiAuthType(appDetail.authType),
      username: appDetail.username,
      password: appDetail.password,
      token: appDetail.token,
      accessKey: appDetail.accessKey,
      accessSecret: appDetail.accessSecret,
      tlsEnabled: appDetail.tlsEnabled,
      caFile: appDetail.caFile,
      caKey: appDetail.caKey,
      caCert: appDetail.caCert,
      clientCert: appDetail.clientCert,
      clientKey: appDetail.clientKey,
      insecureSkipVerify: appDetail.insecureSkipVerify,
      isDefault: appDetail.isDefault
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取应用配置失败";
    setDialogError(message);
  }
}

async function openConfigDialog(appItem: AppItem): Promise<void> {
  currentApp.value = appItem.name;
  currentAppItem.value = appItem;
  dialogMsg.value = "";
  dialogError.value = "";
  clearFormErrors();

  resetForm(appItem);
  configDialogVisible.value = true;

  if (appItem.isConfigured && appItem.id) {
    configLoading.value = true;
    await loadAppConfig(appItem.id);
    configLoading.value = false;
  }
}

function closeDialog(): void {
  if (saveLoading.value || testLoading.value) return;
  configDialogVisible.value = false;
}

function getUpdatedBy(): string {
  const raw = localStorage.getItem("userInfo");
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const username = parsed.username;
    if (typeof username === "string") return username;
    const nickname = parsed.nickname;
    if (typeof nickname === "string") return nickname;
    const name = parsed.name;
    if (typeof name === "string") return name;
  } catch {
    return "";
  }
  return "";
}

function validateForm(): boolean {
  clearFormErrors();

  const url = configForm.appUrl.trim();
  if (!url) {
    formErrors.appUrl = "请输入访问地址";
  } else if (/^(https?|grpc):\/\//i.test(url)) {
    formErrors.appUrl = "访问地址不需要包含协议（如 http:// 或 https://）";
  }

  const port = Number(configForm.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    formErrors.port = "端口范围为 1-65535";
  }

  if (configForm.authEnabled === 1) {
    if (configForm.authType === "basic") {
      if (!configForm.username.trim()) formErrors.username = "请输入用户名";
      if (!configForm.password.trim()) formErrors.password = "请输入密码";
    }

    if (configForm.authType === "token") {
      if (!configForm.token.trim()) formErrors.token = "请输入 Bearer Token";
    }

    if (configForm.authType === "apikey") {
      if (!configForm.accessKey.trim()) formErrors.accessKey = "请输入 Access Key";
      if (!configForm.accessSecret.trim()) formErrors.accessSecret = "请输入 Access Secret";

      if (configForm.tlsEnabled === 1) {
        if (!configForm.caFile.trim()) formErrors.caFile = "请输入 CA 证书内容";
        if (!configForm.caKey.trim()) formErrors.caKey = "请输入 CA Key 内容";
      }
    }

    if (configForm.authType === "certificate") {
      if (!configForm.caCert.trim()) formErrors.caCert = "请输入 CA 证书";
      if (!configForm.clientCert.trim()) formErrors.clientCert = "请输入客户端证书";
      if (!configForm.clientKey.trim()) formErrors.clientKey = "请输入客户端密钥";
    }
  }

  return Object.keys(formErrors).length === 0;
}

function buildRequestData(): AddClusterAppRequest {
  const authType = configForm.authEnabled === 1 ? configForm.authType : "none";
  const payload: AddClusterAppRequest = {
    clusterUuid: resolvedClusterUuid.value,
    appName: configForm.appName.trim(),
    appCode: configForm.appCode,
    appType: configForm.appType,
    isDefault: configForm.isDefault,
    appUrl: configForm.appUrl.trim(),
    port: Number(configForm.port),
    protocol: configForm.protocol,
    authEnabled: configForm.authEnabled,
    authType: toRequestAuthType(authType),
    username: authType === "basic" ? configForm.username.trim() : "",
    password: authType === "basic" ? configForm.password : "",
    token: authType === "token" ? configForm.token.trim() : "",
    accessKey: authType === "apikey" ? configForm.accessKey.trim() : "",
    accessSecret: authType === "apikey" ? configForm.accessSecret : "",
    tlsEnabled: authType === "apikey" ? configForm.tlsEnabled : 0,
    caFile: authType === "apikey" && configForm.tlsEnabled === 1 ? configForm.caFile : "",
    caKey: authType === "apikey" && configForm.tlsEnabled === 1 ? configForm.caKey : "",
    caCert: authType === "certificate" ? configForm.caCert : "",
    clientCert: authType === "certificate" ? configForm.clientCert : "",
    clientKey: authType === "certificate" ? configForm.clientKey : "",
    insecureSkipVerify: configForm.authEnabled === 1 ? configForm.insecureSkipVerify : 0,
    updatedBy: getUpdatedBy()
  };

  return payload;
}

async function saveConfig(): Promise<void> {
  dialogMsg.value = "";
  dialogError.value = "";

  if (!resolvedClusterUuid.value) {
    setDialogError("集群 UUID 缺失，无法保存配置");
    return;
  }

  if (!validateForm()) {
    return;
  }

  saveLoading.value = true;
  try {
    await addClusterAppApi(buildRequestData());
    await loadAppList();
    setNotice(`${currentApp.value} 配置保存成功`);
    setDialogNotice("配置已保存");
    configDialogVisible.value = false;
  } catch (error) {
    const message = error instanceof Error ? error.message : "配置保存失败";
    setDialogError(message);
  } finally {
    saveLoading.value = false;
  }
}

async function testConnection(): Promise<void> {
  dialogMsg.value = "";
  dialogError.value = "";

  if (!resolvedClusterUuid.value) {
    setDialogError("集群 UUID 缺失，无法测试连接");
    return;
  }

  if (!validateForm()) {
    return;
  }

  testLoading.value = true;
  try {
    await addClusterAppApi(buildRequestData());
    await loadAppList();

    const savedApp = configuredApps.value.find((app) => app.appCode === configForm.appCode);
    if (!savedApp) {
      throw new Error("保存配置后未找到应用记录，请重试");
    }

    await validateClusterAppApi(savedApp.id);
    await loadAppList();

    if (currentAppItem.value) {
      currentAppItem.value.isHealthy = true;
    }

    setDialogNotice("连接测试成功");
    setNotice(`${currentApp.value} 连接测试成功`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "连接测试失败";
    setDialogError(message);
  } finally {
    testLoading.value = false;
  }
}

async function testCardConnection(appItem: AppItem, event: Event): Promise<void> {
  event.stopPropagation();

  if (!appItem.isConfigured || !appItem.id) return;

  cardTestLoading[appItem.code] = true;
  try {
    await validateClusterAppApi(appItem.id);
    await loadAppList();
    setNotice(`${appItem.name} 连接测试成功`);
  } catch (error) {
    const message = error instanceof Error ? error.message : `${appItem.name} 连接测试失败`;
    setError(message);
  } finally {
    cardTestLoading[appItem.code] = false;
  }
}

async function refreshAppStatus(): Promise<void> {
  const ok = await loadAppList();
  if (ok) {
    setNotice("中间件状态已刷新");
  }
}

function onAuthEnabledToggle(event: Event): void {
  const checked = (event.target as HTMLInputElement).checked;
  configForm.authEnabled = checked ? 1 : 0;
  if (!checked) {
    configForm.authType = "none";
    resetAuthFields();
  }
  clearFormErrors();
}

function onAuthTypeChange(): void {
  const authType = configForm.authType;

  configForm.username = "";
  configForm.password = "";
  configForm.token = "";
  configForm.accessKey = "";
  configForm.accessSecret = "";
  configForm.caCert = "";
  configForm.clientCert = "";
  configForm.clientKey = "";
  configForm.caFile = "";
  configForm.caKey = "";

  if (authType !== "apikey") {
    configForm.tlsEnabled = 0;
  }

  if (authType === "none") {
    configForm.insecureSkipVerify = 0;
  }

  clearFormErrors();
}

function onTlsEnabledToggle(event: Event): void {
  const checked = (event.target as HTMLInputElement).checked;
  configForm.tlsEnabled = checked ? 1 : 0;
  if (!checked) {
    configForm.caFile = "";
    configForm.caKey = "";
  }
  clearFormErrors();
}

function onInsecureToggle(event: Event): void {
  const checked = (event.target as HTMLInputElement).checked;
  configForm.insecureSkipVerify = checked ? 1 : 0;
}

watch(
  () => resolvedClusterUuid.value,
  (newVal) => {
    configForm.clusterUuid = newVal;
    applications.value = createMiddlewareApplications();
    configuredApps.value = [];

    if (newVal && props.isActive !== false) {
      loadAppList();
    }
  },
  { immediate: true }
);

watch(
  () => props.isActive,
  (newVal) => {
    if (newVal !== false && resolvedClusterUuid.value) {
      loadAppList();
    }
  }
);
</script>

<style scoped>
.middleware-panel {
  padding: 18px;
  background: linear-gradient(180deg, #f8fbff 0%, #f3f7fd 100%);
}

.inline-notice {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
}

.inline-notice.success {
  border: 1px solid #b5e7cf;
  background: #eefcf4;
  color: #1c7c4b;
}

.inline-notice.error {
  border: 1px solid #f0c2c2;
  background: #fff1f1;
  color: #bf2f2f;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  color: #3d4fd5;
  background: #e8edff;
  border: 1px solid #d5ddff;
}

.header-text h2 {
  margin: 0;
  font-size: 20px;
  color: #1f2a3d;
}

.header-text p {
  margin: 2px 0 0;
  color: #5d708b;
  font-size: 13px;
}

.refresh-btn {
  border: 1px solid #d4ddeb;
  border-radius: 10px;
  height: 34px;
  padding: 0 14px;
  background: #ffffff;
  color: #445873;
  cursor: pointer;
}

.refresh-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.loading-state {
  border: 1px dashed #c8d5e9;
  background: #f8fbff;
  border-radius: 12px;
  color: #5d708b;
  font-size: 13px;
  padding: 16px;
}

.apps-container {
  display: grid;
  gap: 14px;
}

.category-section {
  border: 1px solid #dbe4f1;
  border-radius: 14px;
  background: #ffffff;
  padding: 14px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-icon {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.category-name {
  color: #1f2a3d;
  font-weight: 700;
}

.category-count {
  color: #70829a;
  font-size: 12px;
}

.stat {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  background: #e8f9ef;
  color: #147c48;
}

.apps-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  gap: 10px;
}

.app-card {
  position: relative;
  border: 1px solid #dde6f2;
  border-radius: 12px;
  background: #fcfdff;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.app-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(30, 53, 105, 0.08);
}

.status-bar {
  height: 3px;
  width: 100%;
  background: #c8d3e2;
}

.status-bar.healthy {
  background: #12b981;
}

.status-bar.error {
  background: #ef4444;
}

.status-bar.pending {
  background: #94a3b8;
}

.card-content {
  padding: 12px;
}

.card-top {
  display: flex;
  gap: 10px;
}

.app-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  border: 1px solid #e2e8f4;
  overflow: hidden;
  flex-shrink: 0;
}

.app-icon img {
  width: 70%;
  height: 70%;
  object-fit: contain;
}

.app-info {
  min-width: 0;
}

.app-info h4 {
  margin: 0;
  font-size: 15px;
  color: #1f2a3d;
}

.app-info p {
  margin: 4px 0 0;
  color: #5b6f8a;
  font-size: 12px;
  line-height: 1.35;
}

.feature-line {
  margin-top: 4px;
  font-size: 12px;
  color: #8b9ab0;
}

.card-footer {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.port-btn {
  border: 1px solid #d7dfec;
  background: #f7faff;
  color: #50647e;
  border-radius: 8px;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.port-btn.clickable {
  cursor: pointer;
  color: #2945d5;
  border-color: #cad6ff;
  background: #edf2ff;
}

.status-chip {
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 12px;
  background: #f0f4f9;
  color: #5d708a;
}

.status-chip.healthy {
  background: #e8faef;
  color: #14864d;
}

.status-chip.error {
  background: #fff1f1;
  color: #bf2f2f;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.test-btn {
  border: 1px solid #d3dcef;
  background: #ffffff;
  color: #405575;
  border-radius: 8px;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  cursor: pointer;
}

.test-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.config-btn {
  font-size: 12px;
  color: #3a4fd7;
  font-weight: 600;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  z-index: 70;
  padding: 20px;
}

.dialog-panel {
  width: min(700px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #d9e2ef;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.28);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f2;
}

.dialog-header h3 {
  margin: 0;
  color: #1f2a3d;
}

.close-btn {
  border: none;
  background: transparent;
  font-size: 22px;
  color: #6a7f9c;
  cursor: pointer;
  line-height: 1;
}

.close-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dialog-notice {
  margin: 12px 16px 0;
  border-radius: 10px;
  padding: 9px 11px;
  font-size: 13px;
}

.dialog-notice.success {
  border: 1px solid #b5e7cf;
  background: #eefcf4;
  color: #1c7c4b;
}

.dialog-notice.error {
  border: 1px solid #f0c2c2;
  background: #fff1f1;
  color: #bf2f2f;
}

.dialog-loading {
  padding: 20px 16px;
  color: #5d708b;
  font-size: 13px;
}

.config-form {
  padding: 12px 16px 16px;
}

.form-section {
  border: 1px solid #e2e8f2;
  border-radius: 12px;
  padding: 12px;
  background: #fcfdff;
  margin-bottom: 12px;
}

.form-section h4 {
  margin: 0 0 10px;
  color: #25354d;
  font-size: 15px;
}

.form-row {
  display: grid;
  gap: 10px;
  margin-bottom: 10px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #60738d;
  font-size: 13px;
}

.field input,
.field select,
.field textarea {
  border: 1px solid #d7e0ed;
  border-radius: 10px;
  background: #ffffff;
  color: #1f2a3d;
  padding: 9px 10px;
  font-size: 14px;
  outline: none;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: #8ea0ff;
  box-shadow: 0 0 0 3px rgba(90, 111, 232, 0.12);
}

.field input:disabled {
  background: #f4f7fc;
  color: #6b7e99;
}

.url-input-group {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 8px;
}

.protocol-select {
  text-transform: uppercase;
}

.tip {
  color: #7c8da4;
  font-size: 12px;
}

.field-error {
  color: #be2f2f;
  font-size: 12px;
}

.switch-row {
  border: 1px solid #dbe4f1;
  border-radius: 10px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: #41566f;
}

.switch-row b {
  margin-left: auto;
  color: #3f4f67;
  font-size: 12px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

.ghost-btn,
.test-action-btn,
.save-btn {
  height: 34px;
  border-radius: 10px;
  padding: 0 12px;
  cursor: pointer;
}

.ghost-btn {
  border: 1px solid #d3ddec;
  background: #ffffff;
  color: #4c607a;
}

.test-action-btn {
  border: 1px solid #6c7ef0;
  background: #eef2ff;
  color: #2d42cd;
}

.save-btn {
  border: 1px solid #5a6fe8;
  background: #5a6fe8;
  color: #ffffff;
}

.ghost-btn:disabled,
.test-action-btn:disabled,
.save-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@media (max-width: 1100px) {
  .apps-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 800px) {
  .two-col {
    grid-template-columns: 1fr;
  }

  .panel-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .dialog-mask {
    padding: 10px;
  }
}
</style>
