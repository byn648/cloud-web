<script setup lang="ts">
import { ref, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, MoreVertical, Eye, Edit, Trash2, Download } from "lucide-vue-next";
import type { DemoApplication, DemoServiceRecord } from "../../mock/data";
import { demoServices, servicesForApp } from "../../mock/demoStore";
import DemoTableToolbar from "../DemoTableToolbar.vue";

const props = defineProps<{
  application: DemoApplication;
}>();

const loading = ref(false);
const dialogVisible = ref(false);
const formName = ref("");

const services = computed(() => servicesForApp(props.application.id));

function getServiceTypeTag(type: string) {
  const map: Record<string, string> = {
    ClusterIP: "info",
    NodePort: "success",
    LoadBalancer: "warning",
    ExternalName: "danger"
  };
  return map[type] || "info";
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
  if (!formName.value.trim()) {
    ElMessage.warning("请输入服务名称");
    return;
  }
  const row: DemoServiceRecord = {
    name: formName.value.trim(),
    version: 0,
    versionName: "全部版本",
    type: "ClusterIP",
    clusterIP: "10.96.0.0",
    externalIP: "-",
    ports: "80/TCP → 8080",
    age: "刚刚"
  };
  const list = [...services.value, row];
  demoServices.value = { ...demoServices.value, [props.application.id]: list };
  dialogVisible.value = false;
  ElMessage.success("创建成功（Mock）");
}

async function handleDelete(row: DemoServiceRecord) {
  try {
    await ElMessageBox.confirm(`确定删除 Service "${row.name}" 吗？`, "删除确认", { type: "warning" });
    const list = services.value.filter((s) => s.name !== row.name);
    demoServices.value = { ...demoServices.value, [props.application.id]: list };
    ElMessage.success("已删除（Mock）");
  } catch {
    /* cancel */
  }
}

function handleAction(cmd: string, row: DemoServiceRecord) {
  if (cmd === "delete") {
    void handleDelete(row);
    return;
  }
  ElMessage.info(`演示：${cmd} — ${row.name}`);
}
</script>

<template>
  <div class="service-management-modern">
    <DemoTableToolbar :loading="loading" @refresh="handleRefresh">
      <template #left>
        <ElButton type="primary" @click="handleCreate"><Plus :size="16" style="margin-right: 4px" /> 创建服务</ElButton>
      </template>
    </DemoTableToolbar>

    <div class="table-wrap">
      <ElTable v-loading="loading" :data="services" stripe border size="default" empty-text="暂无 Service">
        <ElTableColumn prop="name" label="服务名称" min-width="180" fixed="left">
          <template #default="{ row }"><span style="font-weight: 500">{{ row.name }}</span></template>
        </ElTableColumn>
        <ElTableColumn label="关联版本" width="120" align="center">
          <template #default="{ row }">
            <ElTag :type="row.version ? 'success' : 'info'" size="small">{{ row.versionName }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="服务类型" width="130" align="center">
          <template #default="{ row }">
            <ElTag :type="getServiceTypeTag(row.type) as any" size="small">{{ row.type }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="clusterIP" label="服务IP" width="140" align="center" />
        <ElTableColumn prop="externalIP" label="外部" width="140" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.externalIP !== '-' ? '#409eff' : '#909399' }">{{ row.externalIP }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="ports" label="端口" min-width="180" />
        <ElTableColumn prop="age" label="创建时长" width="120" align="center" />
        <ElTableColumn label="操作" width="80" align="center" fixed="right">
          <template #default="{ row }">
            <ElDropdown trigger="click" @command="(cmd: string) => handleAction(cmd, row)">
              <ElButton type="primary" link><MoreVertical :size="16" /></ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem command="view"><Eye :size="14" /> 查看详情</ElDropdownItem>
                  <ElDropdownItem command="edit"><Edit :size="14" /> 编辑</ElDropdownItem>
                  <ElDropdownItem command="yaml"><Download :size="14" /> 下载 YAML</ElDropdownItem>
                  <ElDropdownItem command="delete" divided><Trash2 :size="14" /> 删除</ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </template>
        </ElTableColumn>
      </ElTable>
    </div>

    <ElDialog v-model="dialogVisible" title="创建服务" width="480px">
      <ElForm label-width="100px">
        <ElFormItem label="名称" required>
          <ElInput v-model="formName" placeholder="例如 face-recognition-svc" />
        </ElFormItem>
        <ElAlert type="info" :closable="false" show-icon title="演示模式" description="完整表单/YAML 模式与 kube-nova 一致，此处简化为名称创建。" />
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">创建</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped lang="scss">
.service-management-modern {
  padding-top: 10px;
  padding-bottom: 15px;

  .table-wrap {
    padding: 0 16px;
  }

  :deep(.el-table__empty-block) {
    min-height: 320px;
  }
}
</style>
