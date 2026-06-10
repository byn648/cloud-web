<script setup lang="ts">
import { ref, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Plus,
  MoreVertical,
  Eye,
  Activity,
  Pause,
  Play,
  RotateCcw,
  Download,
  Trash2,
  Edit
} from "lucide-vue-next";
import type { DemoApplication, DemoCanaryRecord } from "../../mock/data";
import { demoCanaries, canariesForApp } from "../../mock/demoStore";
import DemoTableToolbar from "../DemoTableToolbar.vue";

const props = defineProps<{
  application: DemoApplication;
}>();

const loading = ref(false);
const dialogVisible = ref(false);
const formName = ref("");

const canaries = computed(() => canariesForApp(props.application.id));

function getStatusTypeTag(status: string) {
  const map: Record<string, string> = {
    Initialized: "info",
    Progressing: "warning",
    Promoting: "primary",
    Succeeded: "success",
    Failed: "danger"
  };
  return map[status] || "info";
}

function handleRefresh() {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
    ElMessage.success("已刷新（Mock）");
  }, 300);
}

function handleCreate() {
  formName.value = "";
  dialogVisible.value = true;
}

function handleSubmit() {
  if (!formName.value.trim()) return;
  const row: DemoCanaryRecord = {
    name: formName.value.trim(),
    targetRef: { kind: "Deployment", name: props.application.nameEn },
    status: "Initialized",
    phase: "Initializing",
    canaryWeight: 0,
    failedChecks: 0,
    age: "刚刚"
  };
  demoCanaries.value = {
    ...demoCanaries.value,
    [props.application.id]: [...canaries.value, row]
  };
  dialogVisible.value = false;
  ElMessage.success("创建成功（Mock）");
}

async function handleDelete(row: DemoCanaryRecord) {
  try {
    await ElMessageBox.confirm(`确定删除金丝雀 "${row.name}" 吗？`, "删除确认", { type: "warning" });
    demoCanaries.value = {
      ...demoCanaries.value,
      [props.application.id]: canaries.value.filter((c) => c.name !== row.name)
    };
    ElMessage.success("已删除（Mock）");
  } catch {
    /* cancel */
  }
}

function handleAction(cmd: string, row: DemoCanaryRecord) {
  if (cmd === "delete") {
    void handleDelete(row);
    return;
  }
  ElMessage.info(`演示：${cmd} — ${row.name}`);
}
</script>

<template>
  <div class="flagger-management-modern">
    <DemoTableToolbar :loading="loading" @refresh="handleRefresh">
      <template #left>
        <ElButton type="primary" @click="handleCreate"><Plus :size="16" style="margin-right: 4px" /> 创建金丝雀发布</ElButton>
      </template>
    </DemoTableToolbar>

    <div class="table-wrap">
      <ElTable v-loading="loading" :data="canaries" stripe border size="default" empty-text="暂无金丝雀发布">
        <ElTableColumn prop="name" label="金丝雀名称" min-width="180" fixed="left">
          <template #default="{ row }"><span style="font-weight: 500">{{ row.name }}</span></template>
        </ElTableColumn>
        <ElTableColumn label="目标资源" width="200">
          <template #default="{ row }">
            <ElTag type="primary" size="small">{{ row.targetRef.kind }}</ElTag>
            <span style="margin-left: 8px; color: #606266">{{ row.targetRef.name }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="130" align="center">
          <template #default="{ row }">
            <ElTag :type="getStatusTypeTag(row.status) as any" size="small">{{ row.status }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="阶段" width="130" align="center">
          <template #default="{ row }">
            <ElTag :type="getStatusTypeTag(row.phase) as any" size="small">{{ row.phase }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="金丝雀权重" width="120" align="center">
          <template #default="{ row }">
            <span style="font-weight: 500; color: #67c23a">{{ row.canaryWeight }}%</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="failedChecks" label="失败次数" width="100" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.failedChecks > 0 ? '#f56c6c' : '#909399' }">{{ row.failedChecks }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="age" label="创建时长" width="120" align="center" />
        <ElTableColumn label="操作" width="80" align="center" fixed="right">
          <template #default="{ row }">
            <ElDropdown trigger="click" @command="(cmd: string) => handleAction(cmd, row)">
              <ElButton type="primary" link><MoreVertical :size="16" /></ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem command="view"><Eye :size="14" /> 查看详情</ElDropdownItem>
                  <ElDropdownItem command="status"><Activity :size="14" /> 查看状态</ElDropdownItem>
                  <ElDropdownItem command="edit"><Edit :size="14" /> 编辑</ElDropdownItem>
                  <ElDropdownItem command="pause" divided><Pause :size="14" /> 暂停发布</ElDropdownItem>
                  <ElDropdownItem command="resume"><Play :size="14" /> 恢复发布</ElDropdownItem>
                  <ElDropdownItem command="reset"><RotateCcw :size="14" /> 重置状态</ElDropdownItem>
                  <ElDropdownItem command="yaml"><Download :size="14" /> 下载 YAML</ElDropdownItem>
                  <ElDropdownItem command="delete" divided><Trash2 :size="14" /> 删除</ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </template>
        </ElTableColumn>
      </ElTable>
    </div>

    <ElDialog v-model="dialogVisible" title="创建金丝雀发布" width="480px">
      <ElForm label-width="100px">
        <ElFormItem label="金丝雀名称" required>
          <ElInput v-model="formName" placeholder="例如 face-recognition-canary" />
        </ElFormItem>
        <ElAlert type="info" :closable="false" show-icon title="演示模式" description="完整灰度配置向导与 kube-nova 一致，此处简化为名称创建。" />
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">创建</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped lang="scss">
.flagger-management-modern {
  padding-top: 10px;
  padding-bottom: 15px;

  .table-wrap {
    padding: 0 16px;
  }
}
</style>
