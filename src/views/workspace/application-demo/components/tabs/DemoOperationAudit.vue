<script setup lang="ts">
import { ref, computed, reactive } from "vue";
import { ElMessage } from "element-plus";
import {
  History,
  RefreshCw,
  Eye,
  Trash2,
  User,
  Package,
  Plus,
  Edit,
  X,
  Zap,
  RotateCw,
  Terminal
} from "lucide-vue-next";
import type { DemoApplication, DemoAuditRecord, DemoCluster, DemoWorkspace } from "../../mock/data";
import { auditsForApp, demoAudits } from "../../mock/demoStore";

const props = defineProps<{
  application: DemoApplication;
  workspace: DemoWorkspace | null;
  cluster: DemoCluster | null;
}>();

const loading = ref(false);
const detailVisible = ref(false);
const currentAudit = ref<DemoAuditRecord | null>(null);
const deletingAudit = ref<number | null>(null);

const pagination = reactive({ current: 1, size: 10, total: 0 });

const allLogs = computed(() => auditsForApp(props.application.id));

const auditLogs = computed(() => {
  pagination.total = allLogs.value.length;
  const start = (pagination.current - 1) * pagination.size;
  return allLogs.value.slice(start, start + pagination.size);
});

function formatTime(ts: number) {
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getIconType(title: string) {
  if (title.includes("创建")) return "create";
  if (title.includes("更新") || title.includes("修改") || title.includes("发布")) return "update";
  if (title.includes("删除")) return "delete";
  if (title.includes("副本")) return "scale";
  return "default";
}

function getActionIcon(title: string) {
  const map: Record<string, typeof Plus> = {
    create: Plus,
    update: Edit,
    delete: X,
    scale: Zap,
    default: Terminal
  };
  return map[getIconType(title)] ?? Terminal;
}

function formatDetailPreview(detail: string) {
  if (!detail) return "无详细信息";
  return detail.length > 120 ? `${detail.substring(0, 120)}...` : detail;
}

function handleRefresh() {
  loading.value = true;
  pagination.current = 1;
  setTimeout(() => {
    loading.value = false;
    ElMessage.success("已刷新（Mock）");
  }, 300);
}

function handleView(log: DemoAuditRecord) {
  currentAudit.value = log;
  detailVisible.value = true;
}

function handleDelete(log: DemoAuditRecord) {
  deletingAudit.value = log.id;
  const list = allLogs.value.filter((a) => a.id !== log.id);
  demoAudits.value = { ...demoAudits.value, [props.application.id]: list };
  if (auditLogs.value.length === 0 && pagination.current > 1) {
    pagination.current--;
  }
  deletingAudit.value = null;
  ElMessage.success("已删除（Mock）");
}

function handleSizeChange(size: number) {
  pagination.size = size;
  pagination.current = 1;
}

function handleCurrentChange(current: number) {
  pagination.current = current;
}
</script>

<template>
  <div class="operation-audit-timeline">
    <div class="audit-header">
      <div class="header-left">
        <div class="icon-wrapper"><History :size="20" class="header-icon" /></div>
        <div class="title-group">
          <h2 class="header-title">操作审计</h2>
          <span class="header-subtitle">记录服务的变更历史与操作轨迹</span>
        </div>
        <ElTag v-if="pagination.total > 0" type="info" effect="plain" round class="count-tag">
          {{ pagination.total }} 条记录
        </ElTag>
      </div>
      <ElButton :icon="RefreshCw" circle :loading="loading" @click="handleRefresh" />
    </div>

    <div v-loading="loading" class="timeline-container">
      <ElEmpty v-if="!loading && allLogs.length === 0" description="暂无审计记录" :image-size="120" />

      <ElTimeline v-else>
        <ElTimelineItem
          v-for="log in auditLogs"
          :key="log.id"
          :timestamp="formatTime(log.createdAt)"
          placement="top"
          :type="log.status === 1 ? 'success' : 'danger'"
        >
          <ElCard class="timeline-card" shadow="hover">
            <div class="card-content">
              <div class="card-main">
                <div class="card-header">
                  <div class="title-row">
                    <div :class="['action-icon-wrapper', `action-${getIconType(log.title)}`]">
                      <component :is="getActionIcon(log.title)" :size="16" />
                    </div>
                    <h3 class="card-title">{{ log.title }}</h3>
                    <ElTag :type="log.status === 1 ? 'success' : 'danger'" size="small" effect="light">
                      {{ log.status === 1 ? "成功" : "失败" }}
                    </ElTag>
                  </div>
                  <div class="meta-row">
                    <div class="meta-item"><User :size="12" /><span>{{ log.operatorName }}</span></div>
                    <ElDivider direction="vertical" />
                    <div class="meta-item"><Package :size="12" /><span>{{ log.applicationName }}</span></div>
                  </div>
                </div>
                <div class="card-body">
                  <div class="action-detail-box">{{ formatDetailPreview(log.actionDetail) }}</div>
                </div>
              </div>
              <div class="card-actions">
                <ElTooltip content="查看详情" placement="top">
                  <ElButton type="primary" text bg circle @click="handleView(log)"><Eye :size="16" /></ElButton>
                </ElTooltip>
                <ElPopconfirm title="确定删除这条审计记录吗？" @confirm="handleDelete(log)">
                  <template #reference>
                    <ElButton type="danger" text bg circle :loading="deletingAudit === log.id"><Trash2 :size="16" /></ElButton>
                  </template>
                </ElPopconfirm>
              </div>
            </div>
          </ElCard>
        </ElTimelineItem>
      </ElTimeline>

      <div v-if="pagination.total > 0" class="pagination-wrapper">
        <ElPagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :page-sizes="[5, 10, 20]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          background
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <ElDialog v-model="detailVisible" title="审计详情" width="650px" align-center destroy-on-close>
      <div v-if="currentAudit" class="detail-content">
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="操作人">{{ currentAudit.operatorName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="操作状态">
            <ElTag :type="currentAudit.status === 1 ? 'success' : 'danger'">
              {{ currentAudit.status === 1 ? "成功" : "失败" }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="操作时间">{{ formatTime(currentAudit.createdAt) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="应用名称">{{ currentAudit.applicationName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="工作空间">{{ currentAudit.workspaceName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="集群">{{ currentAudit.clusterName }}</ElDescriptionsItem>
        </ElDescriptions>
        <div class="detail-json-wrapper">
          <div class="detail-json-header">操作详情数据</div>
          <div class="detail-json-content">{{ currentAudit.actionDetail }}</div>
        </div>
      </div>
      <template #footer>
        <ElButton @click="detailVisible = false">关闭</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped lang="scss">
.operation-audit-timeline {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: #f8fafc;

  .audit-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding: 16px 24px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;

      .icon-wrapper {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        background: #eff6ff;
        display: flex;
        align-items: center;
        justify-content: center;
        .header-icon { color: #3b82f6; }
      }

      .title-group {
        .header-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
        }
        .header-subtitle {
          font-size: 12px;
          color: #64748b;
        }
      }
    }
  }

  .timeline-container {
    flex: 1;
    overflow-y: auto;
    padding: 10px 24px 24px;

    .timeline-card {
      margin-top: 8px;
      border: none;
      border-radius: 12px;

      :deep(.el-card__body) {
        padding: 16px 20px;
      }

      .card-content {
        display: flex;
        justify-content: space-between;
        gap: 20px;

        .card-main {
          flex: 1;
          min-width: 0;

          .title-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;

            .action-icon-wrapper {
              width: 32px;
              height: 32px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              &.action-create { background: #d1fae5; color: #10b981; }
              &.action-update { background: #dbeafe; color: #3b82f6; }
              &.action-delete { background: #fee2e2; color: #ef4444; }
              &.action-scale { background: #ffedd5; color: #f97316; }
              &.action-default { background: #f1f5f9; color: #64748b; }
            }

            .card-title {
              margin: 0;
              font-size: 15px;
              font-weight: 600;
            }
          }

          .meta-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 10px;

            .meta-item {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 13px;
              color: #64748b;
            }
          }

          .action-detail-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 12px;
            font-family: monospace;
            font-size: 12px;
            color: #475569;
            word-break: break-all;
          }
        }

        .card-actions {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 8px;
          padding-left: 12px;
          border-left: 1px solid #f1f5f9;
        }
      }
    }

    .pagination-wrapper {
      margin-top: 24px;
      display: flex;
      justify-content: center;
    }
  }

  .detail-json-wrapper {
    margin-top: 20px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;

    .detail-json-header {
      padding: 8px 12px;
      background: #f1f5f9;
      font-size: 13px;
      font-weight: 600;
      border-bottom: 1px solid #e2e8f0;
    }

    .detail-json-content {
      padding: 16px;
      background: #0f172a;
      color: #e2e8f0;
      font-family: monospace;
      font-size: 13px;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 400px;
      overflow-y: auto;
    }
  }
}
</style>
