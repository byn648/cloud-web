<template>
  <div class="cluster-add-page">
    <div class="page-nav">
      <button type="button" class="back-btn" :disabled="submitLoading || testLoading" @click="emitBack">
        返回列表
      </button>
    </div>

    <section class="wizard-card">
      <header class="wizard-head">
        <h1>新增集群</h1>
        <p>按步骤配置基础信息与认证方式，完成后即可纳管到平台。</p>
      </header>

      <div class="stepper">
        <div
          v-for="(step, index) in steps"
          :key="step.key"
          class="step-item"
          :class="{ active: currentStep === index, done: currentStep > index }"
        >
          <span class="dot">{{ index + 1 }}</span>
          <div class="step-text">
            <strong>{{ step.label }}</strong>
            <small>{{ step.desc }}</small>
          </div>
        </div>
      </div>

      <p v-if="noticeMsg" class="notice success">{{ noticeMsg }}</p>
      <p v-if="errorMsg" class="notice error">{{ errorMsg }}</p>

      <section v-if="currentStep === 0" class="panel choose-panel">
        <article class="source-card" :class="{ active: clusterSource === 'existing' }" @click="selectSource('existing')">
          <h3>接入现有 Kubernetes 集群</h3>
          <p>推荐用于已运行集群，提交后平台会同步基础资源和节点信息。</p>
        </article>

        <article class="source-card disabled" :class="{ active: clusterSource === 'new' }" @click="selectSource('new')">
          <h3>新建集群</h3>
          <p>该能力暂未在当前版本开放，后续会支持一键创建。</p>
        </article>
      </section>

      <section v-else-if="currentStep === 1" class="panel">
        <div class="form-grid">
          <label class="field">
            <span>集群名称</span>
            <input v-model.trim="formData.name" placeholder="例如：华东生产集群" />
          </label>

          <label class="field">
            <span>环境类型</span>
            <select v-model="formData.environment">
              <option v-for="option in selectableEnvironmentOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>集群类型</span>
            <select v-model="formData.clusterType">
              <option v-for="option in selectableClusterTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>云服务商</span>
            <select v-model="formData.provider">
              <option v-for="option in providerOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>计费配置</span>
            <select v-model.number="formData.priceConfigId" :disabled="priceConfigLoading">
              <option v-if="priceConfigLoading" :value="0">加载中...</option>
              <option
                v-else-if="!hasNoBillingOption"
                :value="NO_BILLING_PRICE_CONFIG_ID"
              >
                不计费（默认）
              </option>
              <option v-for="item in priceConfigs" :key="item.id" :value="item.id">
                {{ formatPriceConfigOptionLabel(item) }}
              </option>
            </select>
          </label>

          <label class="field full">
            <span>描述信息</span>
            <textarea v-model.trim="formData.description" rows="3" placeholder="可选，补充集群用途与负责人信息"></textarea>
          </label>

          <label class="field">
            <span>地域 Region</span>
            <input v-model.trim="formData.region" placeholder="例如：cn-east-1" />
          </label>

          <label class="field">
            <span>可用区 Zone</span>
            <input v-model.trim="formData.zone" placeholder="例如：cn-east-1a" />
          </label>

          <label class="field">
            <span>数据中心</span>
            <input v-model.trim="formData.datacenter" placeholder="例如：dc-shanghai-a" />
          </label>

          <label class="field">
            <span>Node LB 地址</span>
            <input v-model.trim="formData.nodeLb" placeholder="多个地址用英文逗号分隔" />
          </label>

          <label class="field">
            <span>Master LB 地址</span>
            <input v-model.trim="formData.masterLb" placeholder="多个地址用英文逗号分隔" />
          </label>

          <label class="field">
            <span>Ingress 域名</span>
            <input v-model.trim="formData.ingressDomain" placeholder="多个域名用英文逗号分隔" />
          </label>

          <label class="field">
            <span>托管模式</span>
            <select v-model.number="formData.isManaged">
              <option :value="0">自管集群</option>
              <option :value="1">云厂商托管</option>
            </select>
          </label>
        </div>
      </section>

      <section v-else-if="currentStep === 2" class="panel">
        <div class="auth-type-list">
          <button
            v-for="option in authTypeOptions"
            :key="option.value"
            type="button"
            class="auth-type-item"
            :class="{ active: formData.authType === option.value }"
            @click="formData.authType = option.value"
          >
            <strong>{{ option.label }}</strong>
            <small>{{ option.description }}</small>
          </button>
        </div>

        <div class="form-grid auth-grid">
          <label
            class="field"
            v-if="
              formData.authType === 'token' ||
              formData.authType === 'certificate' ||
              formData.authType === 'incluster'
            "
          >
            <span>API Server 地址</span>
            <input
              v-model.trim="formData.apiServerHost"
              :placeholder="
                formData.authType === 'incluster'
                  ? '可留空，默认 https://kubernetes.default.svc'
                  : 'https://x.x.x.x:6443'
              "
            />
          </label>

          <label class="field full" v-if="formData.authType === 'kubeconfig'">
            <span>KubeConfig 内容</span>
            <textarea
              v-model.trim="formData.kubeFile"
              rows="8"
              placeholder="粘贴 kubeconfig 完整内容"
            ></textarea>
          </label>

          <label class="field full" v-if="formData.authType === 'token'">
            <span>Bearer Token</span>
            <textarea
              v-model.trim="formData.token"
              rows="4"
              placeholder="输入 ServiceAccount Token"
            ></textarea>
          </label>

          <template v-if="formData.authType === 'certificate'">
            <label class="field full">
              <span>CA 证书</span>
              <textarea v-model.trim="formData.caCert" rows="5" placeholder="-----BEGIN CERTIFICATE-----"></textarea>
            </label>
            <label class="field full">
              <span>客户端证书</span>
              <textarea v-model.trim="formData.clientCert" rows="5" placeholder="-----BEGIN CERTIFICATE-----"></textarea>
            </label>
            <label class="field full">
              <span>客户端密钥</span>
              <textarea v-model.trim="formData.clientKey" rows="5" placeholder="-----BEGIN PRIVATE KEY-----"></textarea>
            </label>
          </template>

          <label class="field">
            <span>TLS 校验</span>
            <select v-model.number="formData.insecureSkipVerify">
              <option :value="0">启用证书校验</option>
              <option :value="1">跳过证书校验</option>
            </select>
          </label>
        </div>
      </section>

      <section v-else class="panel summary-panel">
        <h3>配置确认</h3>
        <div class="summary-grid">
          <div class="kv"><span>集群名称</span><strong>{{ formData.name || "-" }}</strong></div>
          <div class="kv"><span>环境</span><strong>{{ resolveEnvironmentLabel(formData.environment) }}</strong></div>
          <div class="kv"><span>类型</span><strong>{{ resolveClusterTypeLabel(formData.clusterType) }}</strong></div>
          <div class="kv"><span>云服务商</span><strong>{{ resolveProviderLabel(formData.provider) }}</strong></div>
          <div class="kv"><span>计费配置</span><strong>{{ resolvePriceConfigLabel(formData.priceConfigId) }}</strong></div>
          <div class="kv"><span>认证方式</span><strong>{{ resolveAuthTypeLabel(formData.authType) }}</strong></div>
          <div class="kv"><span>TLS 校验</span><strong>{{ formData.insecureSkipVerify === 1 ? "已跳过" : "开启" }}</strong></div>
          <div class="kv full"><span>描述</span><strong>{{ formData.description || "-" }}</strong></div>
          <div class="kv full">
            <span>网络入口</span>
            <strong>{{ formatNetworkSummary(formData.nodeLb, formData.masterLb, formData.ingressDomain) }}</strong>
          </div>
        </div>
      </section>

      <footer class="wizard-actions">
        <button type="button" class="ghost" :disabled="submitLoading || testLoading" @click="previousStep">
          上一步
        </button>
        <button
          v-if="currentStep < steps.length - 1"
          type="button"
          class="primary"
          :disabled="submitLoading || testLoading"
          @click="nextStep"
        >
          下一步
        </button>
        <button
          v-else
          type="button"
          class="outline"
          :disabled="submitLoading || testLoading"
          @click="handleTestConnectivity"
        >
          {{ testLoading ? "测试中..." : "连通性测试" }}
        </button>
        <button
          v-if="currentStep === steps.length - 1"
          type="button"
          class="primary"
          :disabled="submitLoading || testLoading"
          @click="handleSubmit"
        >
          {{ submitLoading ? "创建中..." : "创建集群" }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  addClusterApi,
  testClusterConnectivityApi,
  type AddClusterRequest,
  type ClusterAuthType,
  type ClusterKind,
  type ClusterProvider,
  type TestClusterConnectivityRequest
} from "../../../../api/manager/cluster";
import { getBillingPriceConfigListApi, type BillingPriceConfig } from "../../../../api/manager/billing";
import { authTypeOptions, clusterTypeOptions, environmentOptions, providerOptions } from "../constants";

interface ClusterAddForm {
  name: string;
  description: string;
  priceConfigId: number;
  clusterType: ClusterKind;
  environment: string;
  region: string;
  zone: string;
  datacenter: string;
  provider: ClusterProvider;
  isManaged: number;
  nodeLb: string;
  masterLb: string;
  ingressDomain: string;
  authType: ClusterAuthType;
  apiServerHost: string;
  kubeFile: string;
  token: string;
  caCert: string;
  clientCert: string;
  clientKey: string;
  insecureSkipVerify: number;
}

type ClusterSource = "existing" | "new" | "";

const emit = defineEmits<{
  back: [];
  created: [];
}>();

const steps = [
  { key: "source", label: "选择来源", desc: "接入已有集群" },
  { key: "basic", label: "基础信息", desc: "填写集群元数据" },
  { key: "auth", label: "认证配置", desc: "配置访问凭据" },
  { key: "confirm", label: "确认提交", desc: "测试并创建集群" }
] as const;

const currentStep = ref(0);
const clusterSource = ref<ClusterSource>("");
const testLoading = ref(false);
const submitLoading = ref(false);
const noticeMsg = ref("");
const errorMsg = ref("");
const INCLUSTER_DEFAULT_API_SERVER = "https://kubernetes.default.svc";
const NO_BILLING_PRICE_CONFIG_ID = 1;
const priceConfigLoading = ref(false);
const priceConfigs = ref<BillingPriceConfig[]>([]);
const preferredNoBillingPriceConfigId = ref(NO_BILLING_PRICE_CONFIG_ID);

const formData = reactive<ClusterAddForm>({
  name: "",
  description: "",
  priceConfigId: NO_BILLING_PRICE_CONFIG_ID,
  clusterType: "standard",
  environment: "development",
  region: "",
  zone: "",
  datacenter: "",
  provider: "self-hosted",
  isManaged: 0,
  nodeLb: "",
  masterLb: "",
  ingressDomain: "",
  authType: "kubeconfig",
  apiServerHost: "",
  kubeFile: "",
  token: "",
  caCert: "",
  clientCert: "",
  clientKey: "",
  insecureSkipVerify: 0
});

const selectableEnvironmentOptions = computed(() => {
  return environmentOptions.filter((option) => option.value);
});

const selectableClusterTypeOptions = computed(() => {
  return clusterTypeOptions.filter((option) => option.value);
});

const hasNoBillingOption = computed(() => {
  return priceConfigs.value.some((item) => item.id === NO_BILLING_PRICE_CONFIG_ID);
});

function clearMessages(): void {
  noticeMsg.value = "";
  errorMsg.value = "";
}

function emitBack(): void {
  emit("back");
}

function selectSource(source: ClusterSource): void {
  clusterSource.value = source;
  if (source === "new") {
    errorMsg.value = "当前版本暂不支持一键新建集群，请选择“接入现有集群”。";
    return;
  }
  clearMessages();
}

function normalizeText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function inferApiServerFromKubeconfig(kubeFile: string): string | undefined {
  const matched = kubeFile.match(/^\s*server:\s*("?)(https?:\/\/[^\s"']+)\1\s*$/m);
  if (!matched?.[2]) {
    return undefined;
  }
  return matched[2].trim();
}

function resolveApiServerHost(authType: ClusterAuthType, apiServerHost: string): string | undefined {
  const trimmed = apiServerHost.trim();
  if (trimmed) {
    return trimmed;
  }
  if (authType === "kubeconfig") {
    return inferApiServerFromKubeconfig(formData.kubeFile);
  }
  if (authType === "incluster") {
    return INCLUSTER_DEFAULT_API_SERVER;
  }
  return undefined;
}

function resolveEnvironmentLabel(value: string): string {
  return environmentOptions.find((item) => item.value === value)?.label || value || "-";
}

function resolveClusterTypeLabel(value: string): string {
  return clusterTypeOptions.find((item) => item.value === value)?.label || value || "-";
}

function resolveProviderLabel(value: string): string {
  return providerOptions.find((item) => item.value === value)?.label || value || "-";
}

function resolvePriceConfigLabel(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }
  const target = priceConfigs.value.find((item) => item.id === value);
  if (!target && value === NO_BILLING_PRICE_CONFIG_ID) {
    return "不计费（默认）";
  }
  if (!target) {
    return `计费配置-${value}`;
  }
  if (target.id === preferredNoBillingPriceConfigId.value) {
    return `${target.configName || `计费配置-${target.id}`}（默认不计费）`;
  }
  return target.configName || `计费配置-${value}`;
}

function resolveAuthTypeLabel(value: string): string {
  return authTypeOptions.find((item) => item.value === value)?.label || value || "-";
}

function formatPriceConfigOptionLabel(item: BillingPriceConfig): string {
  const baseLabel = item.configName || `计费配置-${item.id}`;
  if (item.id === preferredNoBillingPriceConfigId.value) {
    return `${baseLabel}（默认不计费）`;
  }
  return baseLabel;
}

function formatNetworkSummary(nodeLb: string, masterLb: string, ingressDomain: string): string {
  const parts = [normalizeText(nodeLb), normalizeText(masterLb), normalizeText(ingressDomain)].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "-";
}

function validateBasicInfo(): boolean {
  if (!formData.name.trim()) {
    errorMsg.value = "请输入集群名称";
    return false;
  }
  if (formData.name.trim().length < 2) {
    errorMsg.value = "集群名称长度至少 2 个字符";
    return false;
  }
  if (!formData.environment) {
    errorMsg.value = "请选择环境类型";
    return false;
  }
  if (!formData.clusterType) {
    errorMsg.value = "请选择集群类型";
    return false;
  }
  if (!formData.provider) {
    errorMsg.value = "请选择云服务商";
    return false;
  }
  if (!Number.isFinite(formData.priceConfigId) || formData.priceConfigId <= 0) {
    errorMsg.value = "请选择计费配置";
    return false;
  }
  return true;
}

function validateAuthInfo(): boolean {
  const authType = formData.authType;
  if (!authType) {
    errorMsg.value = "请选择认证类型";
    return false;
  }

  if (authType === "kubeconfig" && !formData.kubeFile.trim()) {
    errorMsg.value = "KubeConfig 认证方式需要填写 kubeconfig 内容";
    return false;
  }
  if (authType === "kubeconfig") {
    const inferredServer = resolveApiServerHost(authType, formData.apiServerHost);
    if (!inferredServer) {
      errorMsg.value = "KubeConfig 中未识别到 API Server(server:)；请补充正确 kubeconfig 或手动填写 API Server 地址";
      return false;
    }
  }

  if (authType === "token") {
    if (!formData.apiServerHost.trim()) {
      errorMsg.value = "Token 认证方式需要填写 API Server 地址";
      return false;
    }
    if (!formData.token.trim()) {
      errorMsg.value = "Token 认证方式需要填写 Bearer Token";
      return false;
    }
  }

  if (authType === "certificate") {
    if (!formData.apiServerHost.trim()) {
      errorMsg.value = "证书认证方式需要填写 API Server 地址";
      return false;
    }
    if (!formData.caCert.trim() || !formData.clientCert.trim() || !formData.clientKey.trim()) {
      errorMsg.value = "证书认证需要填写 CA 证书、客户端证书和客户端密钥";
      return false;
    }
  }

  return true;
}

function nextStep(): void {
  clearMessages();

  if (currentStep.value === 0) {
    if (!clusterSource.value) {
      errorMsg.value = "请选择接入方式";
      return;
    }
    if (clusterSource.value === "new") {
      errorMsg.value = "当前版本暂不支持一键新建集群";
      return;
    }
    currentStep.value = 1;
    return;
  }

  if (currentStep.value === 1 && !validateBasicInfo()) {
    return;
  }

  if (currentStep.value === 2 && !validateAuthInfo()) {
    return;
  }

  if (currentStep.value < steps.length - 1) {
    currentStep.value += 1;
  }
}

function previousStep(): void {
  clearMessages();
  if (currentStep.value === 0) {
    emitBack();
    return;
  }
  currentStep.value -= 1;
}

function buildAuthPayload(): TestClusterConnectivityRequest {
  return {
    authType: formData.authType,
    apiServerHost: resolveApiServerHost(formData.authType, formData.apiServerHost),
    kubeFile: normalizeText(formData.kubeFile),
    token: normalizeText(formData.token),
    caCert: normalizeText(formData.caCert),
    clientCert: normalizeText(formData.clientCert),
    clientKey: normalizeText(formData.clientKey),
    insecureSkipVerify: formData.insecureSkipVerify
  };
}

function buildAddPayload(): AddClusterRequest {
  return {
    name: formData.name.trim(),
    description: normalizeText(formData.description),
    priceConfigId: formData.priceConfigId,
    clusterType: formData.clusterType,
    environment: formData.environment,
    region: normalizeText(formData.region),
    zone: normalizeText(formData.zone),
    datacenter: normalizeText(formData.datacenter),
    provider: formData.provider,
    isManaged: formData.isManaged,
    nodeLb: normalizeText(formData.nodeLb),
    masterLb: normalizeText(formData.masterLb),
    ingressDomain: normalizeText(formData.ingressDomain),
    authType: formData.authType,
    apiServerHost: resolveApiServerHost(formData.authType, formData.apiServerHost),
    kubeFile: normalizeText(formData.kubeFile),
    token: normalizeText(formData.token),
    caCert: normalizeText(formData.caCert),
    clientCert: normalizeText(formData.clientCert),
    clientKey: normalizeText(formData.clientKey),
    insecureSkipVerify: formData.insecureSkipVerify
  };
}

async function handleTestConnectivity(): Promise<void> {
  clearMessages();
  if (!validateAuthInfo()) {
    return;
  }

  testLoading.value = true;
  try {
    const message = await testClusterConnectivityApi(buildAuthPayload());
    noticeMsg.value = message || "连通性测试成功";
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "连通性测试失败";
  } finally {
    testLoading.value = false;
  }
}

async function handleSubmit(): Promise<void> {
  clearMessages();
  if (!validateBasicInfo() || !validateAuthInfo()) {
    return;
  }

  submitLoading.value = true;
  try {
    const message = await addClusterApi(buildAddPayload());
    noticeMsg.value = message || "集群创建成功";
    emit("created");
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "创建集群失败";
  } finally {
    submitLoading.value = false;
  }
}

async function loadPriceConfigs(): Promise<void> {
  priceConfigLoading.value = true;
  try {
    const list = await getBillingPriceConfigListApi();
    const nameKeywords = [/不计费/, /免费/, /免计费/, /free/i, /no\s*billing/i];
    const isNoBillingByName = (item: BillingPriceConfig): boolean => {
      const name = `${item.configName || ""} ${item.description || ""}`;
      return nameKeywords.some((regexp) => regexp.test(name));
    };
    const isNoBillingByPrice = (item: BillingPriceConfig): boolean => {
      return (
        item.cpuPrice <= 0 &&
        item.memoryPrice <= 0 &&
        item.storagePrice <= 0 &&
        item.gpuPrice <= 0 &&
        item.podPrice <= 0 &&
        item.managementFee <= 0
      );
    };

    const preferred =
      list.find((item) => item.id === NO_BILLING_PRICE_CONFIG_ID) ??
      list.find((item) => isNoBillingByName(item)) ??
      list.find((item) => isNoBillingByPrice(item)) ??
      list.find((item) => item.isSystem === 1) ??
      list[0];

    preferredNoBillingPriceConfigId.value = preferred?.id ?? NO_BILLING_PRICE_CONFIG_ID;
    priceConfigs.value = [...list].sort((a, b) => {
      if (a.id === preferredNoBillingPriceConfigId.value) return -1;
      if (b.id === preferredNoBillingPriceConfigId.value) return 1;
      return a.id - b.id;
    });

    const selectedExists = priceConfigs.value.some((item) => item.id === formData.priceConfigId);
    if (!selectedExists || formData.priceConfigId <= 0) {
      formData.priceConfigId = preferredNoBillingPriceConfigId.value;
    }
  } catch (error) {
    priceConfigs.value = [];
    preferredNoBillingPriceConfigId.value = NO_BILLING_PRICE_CONFIG_ID;
    if (formData.priceConfigId <= 0) {
      formData.priceConfigId = NO_BILLING_PRICE_CONFIG_ID;
    }
    noticeMsg.value = "计费配置列表加载失败，已自动使用“不计费（默认）”";
  } finally {
    priceConfigLoading.value = false;
  }
}

onMounted(() => {
  void loadPriceConfigs();
});
</script>

<style scoped>
.cluster-add-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.page-nav {
  display: flex;
  align-items: center;
}

.back-btn {
  height: 34px;
  border: 1px solid #d7dfea;
  background: #fff;
  color: #4d5f78;
  border-radius: 10px;
  padding: 0 12px;
  cursor: pointer;
}

.back-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.wizard-card {
  border: 1px solid #dbe5f1;
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.wizard-head h1 {
  margin: 0;
  color: #1f2a3d;
  font-size: 30px;
}

.wizard-head p {
  margin: 6px 0 0;
  color: #607086;
  font-size: 13px;
}

.stepper {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.step-item {
  border: 1px solid #dbe5f1;
  border-radius: 12px;
  background: #f9fbff;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-item.active {
  border-color: #8ea0ff;
  background: #eef2ff;
}

.step-item.done {
  border-color: #95d5b2;
  background: #effcf3;
}

.dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #dbe5f1;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.step-item.active .dot {
  background: #5a6fe8;
  color: #fff;
}

.step-item.done .dot {
  background: #1e9f5b;
  color: #fff;
}

.step-text {
  min-width: 0;
}

.step-text strong {
  display: block;
  color: #1f2a3d;
  font-size: 13px;
}

.step-text small {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
}

.panel {
  border: 1px solid #e5ebf5;
  border-radius: 14px;
  padding: 14px;
  background: #fcfdff;
}

.choose-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 12px;
}

.source-card {
  border: 1px solid #dbe5f1;
  border-radius: 12px;
  background: #fff;
  padding: 14px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.source-card:hover {
  border-color: #9db0ff;
  box-shadow: 0 8px 24px rgba(22, 35, 70, 0.08);
}

.source-card.active {
  border-color: #5a6fe8;
  box-shadow: 0 0 0 3px rgba(90, 111, 232, 0.12);
}

.source-card.disabled {
  opacity: 0.7;
}

.source-card h3 {
  margin: 0;
  color: #1f2a3d;
  font-size: 18px;
}

.source-card p {
  margin: 8px 0 0;
  color: #607086;
  font-size: 13px;
  line-height: 1.5;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  gap: 12px;
}

.auth-grid {
  margin-top: 12px;
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

.auth-type-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 10px;
}

.auth-type-item {
  border: 1px solid #dbe5f1;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  padding: 10px;
  cursor: pointer;
  color: #1f2a3d;
}

.auth-type-item strong {
  display: block;
  font-size: 13px;
}

.auth-type-item small {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

.auth-type-item.active {
  border-color: #5a6fe8;
  background: #eef2ff;
}

.summary-panel h3 {
  margin: 0 0 12px;
  color: #1f2a3d;
  font-size: 20px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: 10px;
}

.kv {
  border: 1px solid #dce5f2;
  border-radius: 10px;
  background: #fff;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kv.full {
  grid-column: 1 / -1;
}

.kv span {
  color: #64748b;
  font-size: 12px;
}

.kv strong {
  color: #1f2a3d;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.wizard-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.wizard-actions button {
  height: 34px;
  border-radius: 10px;
  border: 1px solid #d2dcea;
  padding: 0 12px;
  background: #fff;
  color: #334155;
  font-size: 13px;
  cursor: pointer;
}

.wizard-actions button.primary {
  background: #1a73e8;
  border-color: #1a73e8;
  color: #fff;
}

.wizard-actions button.outline {
  border-color: #f5bf57;
  background: #fff8e6;
  color: #9a5b00;
}

.wizard-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.notice {
  margin: 0;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
}

.notice.success {
  background: #effcf3;
  border: 1px solid #bbf7d0;
  color: #0f8e4f;
}

.notice.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

@media (max-width: 1100px) {
  .stepper {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .auth-type-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .choose-panel {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
