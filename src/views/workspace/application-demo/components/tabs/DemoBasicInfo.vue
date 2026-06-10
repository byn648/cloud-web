<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { ElMessage } from "element-plus";
import {
  Box,
  Activity,
  AlertTriangle,
  Globe,
  Network,
  RefreshCw,
  Copy,
  Server,
  ExternalLink,
  Link,
  Info,
  Database,
  Cloud,
  Globe2,
  Hash,
  Type,
  FileText,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Layers,
  Package,
  Briefcase,
  Edit
} from "lucide-vue-next";
import type { DemoApplication, DemoCluster, DemoWorkspace } from "../../mock/data";
import { demoSummaries, updateDemoApplicationMeta } from "../../mock/demoStore";

const props = defineProps<{
  application: DemoApplication;
  workspace: DemoWorkspace | null;
  cluster: DemoCluster | null;
}>();

const isEditing = ref(false);
const saving = ref(false);
const copyingAddress = ref("");
const formData = reactive({ ...props.application });

const summary = computed(() => demoSummaries.value[props.application.id] ?? null);
const normalPodCount = computed(() => {
  if (!summary.value) return 0;
  return summary.value.podCount - summary.value.abnormalPodCount;
});
const normalPodPercentage = computed(() => {
  if (!summary.value?.podCount) return 0;
  return Math.round((normalPodCount.value / summary.value.podCount) * 100);
});
const abnormalPodPercentage = computed(() => {
  if (!summary.value?.podCount) return 0;
  return Math.round((summary.value.abnormalPodCount / summary.value.podCount) * 100);
});

function getResourceIcon(type: string) {
  const map: Record<string, typeof Box> = {
    pod: Box,
    deployment: Layers,
    statefulset: Database,
    daemonset: Server,
    cronjob: Clock,
    job: Briefcase
  };
  return map[type?.toLowerCase()] ?? Package;
}

function handleEdit() {
  Object.assign(formData, props.application);
  isEditing.value = true;
}

function handleCancel() {
  Object.assign(formData, props.application);
  isEditing.value = false;
}

async function handleSave() {
  saving.value = true;
  await new Promise((r) => setTimeout(r, 300));
  updateDemoApplicationMeta(props.application.id, {
    nameCn: formData.nameCn,
    description: formData.description
  });
  Object.assign(formData, props.application);
  isEditing.value = false;
  saving.value = false;
  ElMessage.success("已保存（Mock）");
}

async function copyToClipboard(text: string) {
  copyingAddress.value = text;
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制到剪贴板");
  } catch {
    ElMessage.error("复制失败");
  } finally {
    copyingAddress.value = "";
  }
}

function openInNewTab(url: string) {
  const target = url.startsWith("http") ? url : `http://${url}`;
  window.open(target, "_blank");
}

function handleRefresh() {
  ElMessage.success("已刷新（Mock）");
}

watch(
  () => props.application,
  (app) => Object.assign(formData, app),
  { deep: true }
);
</script>

<template>
  <div class="basic-info-modern">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon-wrapper" style="background: linear-gradient(135deg, #667eea, #764ba2)">
          <Box :size="20" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ summary?.podCount || 0 }}</div>
          <div class="stat-label">实例总数</div>
          <div v-if="summary?.abnormalPodCount" class="stat-detail error">
            <AlertCircle :size="14" /> {{ summary.abnormalPodCount }} 异常
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper" style="background: linear-gradient(135deg, #f093fb, #f5576c)">
          <Activity :size="20" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ normalPodCount }}</div>
          <div class="stat-label">正常实例</div>
          <div v-if="summary?.podCount" class="stat-detail success">
            <CheckCircle :size="14" /> {{ normalPodPercentage }}%
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper" style="background: linear-gradient(135deg, #4facfe, #00f2fe)">
          <AlertTriangle :size="20" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ summary?.abnormalPodCount || 0 }}</div>
          <div class="stat-label">异常实例</div>
          <div v-if="summary?.podCount" class="stat-detail warning">
            <AlertTriangle :size="14" /> {{ abnormalPodPercentage }}%
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper" style="background: linear-gradient(135deg, #43e97b, #38f9d7)">
          <Globe :size="20" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ summary?.serviceCount || 0 }}</div>
          <div class="stat-label">服务数量</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper" style="background: linear-gradient(135deg, #fa709a, #fee140)">
          <Network :size="20" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ summary?.ingressCount || 0 }}</div>
          <div class="stat-label">网关数量</div>
        </div>
      </div>
    </div>

    <section class="info-section access-section">
      <div class="section-header">
        <h3 class="section-title"><Link :size="18" /> 服务访问地址</h3>
        <ElButton size="small" text :icon="RefreshCw" @click="handleRefresh">刷新</ElButton>
      </div>
      <div class="section-content access-content">
        <div class="access-grid">
          <div class="connection-group">
            <div class="group-header">
              <div class="group-title">
                <div class="title-icon bg-blue"><Server :size="16" /></div>
                <span class="title-text">集群内部地址</span>
                <ElTag size="small" type="info">ClusterIP</ElTag>
              </div>
            </div>
            <div v-if="summary?.service?.internalAccessList?.length" class="address-list">
              <div
                v-for="(addr, idx) in summary.service.internalAccessList"
                :key="idx"
                class="address-item clickable"
                @click="openInNewTab(addr)"
              >
                <ExternalLink :size="14" class="link-icon" />
                <code class="address-text">{{ addr }}</code>
                <ElButton
                  :icon="Copy"
                  size="small"
                  circle
                  text
                  :loading="copyingAddress === addr"
                  @click.stop="copyToClipboard(addr)"
                />
              </div>
            </div>
            <div v-else class="empty-state"><span>暂无集群内部访问地址</span></div>
          </div>

          <div class="connection-group">
            <div class="group-header">
              <div class="group-title">
                <div class="title-icon bg-amber"><Database :size="16" /></div>
                <span class="title-text">节点端口地址</span>
                <ElTag size="small" type="warning">NodePort</ElTag>
              </div>
            </div>
            <div v-if="summary?.service?.nodePortList?.length" class="address-list">
              <div
                v-for="(addr, idx) in summary.service.nodePortList"
                :key="idx"
                class="address-item clickable"
                @click="openInNewTab(`http://${addr}`)"
              >
                <ExternalLink :size="14" />
                <code class="address-text">{{ addr }}</code>
              </div>
            </div>
            <div v-else class="empty-state"><span>暂无节点端口访问地址</span></div>
          </div>

          <div class="connection-group">
            <div class="group-header">
              <div class="group-title">
                <div class="title-icon bg-purple"><Cloud :size="16" /></div>
                <span class="title-text">LoadBalancer 访问地址</span>
                <ElTag size="small" type="success">LoadBalancer</ElTag>
              </div>
            </div>
            <div v-if="summary?.service?.externalAccessList?.length" class="address-list">
              <div
                v-for="(addr, idx) in summary.service.externalAccessList"
                :key="idx"
                class="address-item clickable"
                @click="openInNewTab(addr)"
              >
                <ExternalLink :size="14" />
                <code class="address-text">{{ addr }}</code>
              </div>
            </div>
            <div v-else class="empty-state"><span>暂无 LoadBalancer 访问地址</span></div>
          </div>

          <div class="connection-group">
            <div class="group-header">
              <div class="group-title">
                <div class="title-icon bg-green"><Globe2 :size="16" /></div>
                <span class="title-text">网关访问地址</span>
                <ElTag size="small" type="primary">HTTP/HTTPS</ElTag>
              </div>
            </div>
            <div v-if="summary?.ingressDomains?.length" class="address-list">
              <div
                v-for="(domain, idx) in summary.ingressDomains"
                :key="idx"
                class="address-item clickable ingress-item"
                @click="openInNewTab(`https://${domain}`)"
              >
                <ExternalLink :size="14" />
                <code class="address-text">{{ domain }}</code>
              </div>
            </div>
            <div v-else class="empty-state"><span>暂无网关访问地址</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="info-section">
      <div class="section-header">
        <h3 class="section-title"><Info :size="18" /> 基本信息</h3>
        <div class="header-actions">
          <ElButton v-if="!isEditing" type="primary" size="small" text @click="handleEdit">
            <Edit :size="16" /> 编辑
          </ElButton>
          <template v-else>
            <ElButton size="small" @click="handleCancel">取消</ElButton>
            <ElButton type="primary" size="small" :loading="saving" @click="handleSave">保存</ElButton>
          </template>
        </div>
      </div>
      <div class="section-content">
        <ElForm :model="formData" label-width="120px" :disabled="!isEditing">
          <ElRow :gutter="24">
            <ElCol :span="12">
              <ElFormItem label="服务 ID">
                <ElInput :model-value="String(formData.id)" disabled><template #prepend><Hash :size="14" /></template></ElInput>
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="资源类型">
                <ElInput v-model="formData.resourceType" disabled>
                  <template #prepend><component :is="getResourceIcon(formData.resourceType)" :size="14" /></template>
                </ElInput>
              </ElFormItem>
            </ElCol>
          </ElRow>
          <ElRow :gutter="24">
            <ElCol :span="12">
              <ElFormItem label="中文名称">
                <ElInput v-model="formData.nameCn" :disabled="!isEditing"><template #prepend><Type :size="14" /></template></ElInput>
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="英文名称">
                <ElInput v-model="formData.nameEn" disabled><template #prepend><FileText :size="14" /></template></ElInput>
              </ElFormItem>
            </ElCol>
          </ElRow>
          <ElFormItem label="描述信息">
            <ElInput v-model="formData.description" type="textarea" :rows="3" :disabled="!isEditing" maxlength="500" show-word-limit />
          </ElFormItem>
          <ElDivider />
          <ElRow :gutter="24">
            <ElCol :span="12">
              <ElFormItem label="创建人">
                <ElInput :model-value="application.createdBy || '-'" disabled><template #prepend><User :size="14" /></template></ElInput>
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="K8s 命名空间">
                <ElInput :model-value="workspace?.namespace || '-'" disabled><template #prepend><Server :size="14" /></template></ElInput>
              </ElFormItem>
            </ElCol>
          </ElRow>
          <ElRow :gutter="24">
            <ElCol :span="12">
              <ElFormItem label="创建时间">
                <ElInput :model-value="application.createdAt || '-'" disabled><template #prepend><Clock :size="14" /></template></ElInput>
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="更新时间">
                <ElInput :model-value="application.updatedAt || '-'" disabled><template #prepend><Clock :size="14" /></template></ElInput>
              </ElFormItem>
            </ElCol>
          </ElRow>
          <ElRow v-if="cluster" :gutter="24">
            <ElCol :span="12">
              <ElFormItem label="项目集群">
                <ElInput :model-value="cluster.clusterName" disabled />
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="副本状态">
                <ElInput :model-value="`${summary?.replicaReady ?? 0} / ${summary?.replicaDesired ?? 0}`" disabled />
              </ElFormItem>
            </ElCol>
          </ElRow>
        </ElForm>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.basic-info-modern {
  padding: 16px 20px;

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }

  .stat-card {
    display: flex;
    gap: 12px;
    padding: 14px;
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 8px;
  }

  .stat-icon-wrapper {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
  }

  .stat-value {
    font-size: 22px;
    font-weight: 600;
    line-height: 1.2;
  }

  .stat-label {
    font-size: 12px;
    color: #909399;
    margin-top: 2px;
  }

  .stat-detail {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    margin-top: 4px;
    &.success { color: #67c23a; }
    &.warning { color: #e6a23c; }
    &.error { color: #f56c6c; }
  }

  .info-section {
    background: white;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f0f2f5;

      .section-title {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
    }

    &.access-section .access-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      @media (max-width: 1200px) {
        grid-template-columns: 1fr;
      }
    }
  }

  .connection-group {
    .group-header .group-title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;

      .title-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        &.bg-blue { background: linear-gradient(135deg, #4facfe, #00f2fe); }
        &.bg-amber { background: linear-gradient(135deg, #fa8b0c, #ffcb05); }
        &.bg-purple { background: linear-gradient(135deg, #a18cd1, #fbc2eb); }
        &.bg-green { background: linear-gradient(135deg, #0ba360, #3cba92); }
      }

      .title-text {
        font-size: 15px;
        font-weight: 600;
      }
    }

    .address-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .address-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      background: #fff;
      border: 1px solid #e4e7ed;
      border-radius: 10px;

      &.clickable {
        cursor: pointer;
        &:hover {
          background: #ecf5ff;
          border-color: #b3d8ff;
        }
      }

      &.ingress-item {
        background: linear-gradient(135deg, #f5f7fa, #ecf0f5);
      }

      .address-text {
        flex: 1;
        font-size: 13px;
        color: #409eff;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .empty-state {
      padding: 16px;
      color: #909399;
      font-size: 13px;
      background: #fafafa;
      border-radius: 8px;
      text-align: center;
    }
  }
}
</style>
