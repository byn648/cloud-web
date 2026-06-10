<script setup lang="ts">
import { ref, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, MoreVertical, Eye, Edit, Trash2, Download } from "lucide-vue-next";
import type { DemoApplication, DemoIngressRecord } from "../../mock/data";
import { demoIngresses, ingressesForApp } from "../../mock/demoStore";
import DemoTableToolbar from "../DemoTableToolbar.vue";

const props = defineProps<{
  application: DemoApplication;
}>();

const loading = ref(false);
const dialogVisible = ref(false);
const formName = ref("");
const formHost = ref("");

const ingresses = computed(() => ingressesForApp(props.application.id));

function handleRefresh() {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
    ElMessage.success("已刷新（Mock）");
  }, 300);
}

function handleCreate() {
  formName.value = "";
  formHost.value = "";
  dialogVisible.value = true;
}

function handleSubmit() {
  if (!formName.value.trim() || !formHost.value.trim()) {
    ElMessage.warning("请填写名称和域名");
    return;
  }
  const row: DemoIngressRecord = {
    name: formName.value.trim(),
    ingressClass: "nginx",
    hosts: [formHost.value.trim()],
    address: "待分配",
    ports: "80",
    age: "刚刚"
  };
  demoIngresses.value = {
    ...demoIngresses.value,
    [props.application.id]: [...ingresses.value, row]
  };
  dialogVisible.value = false;
  ElMessage.success("创建成功（Mock）");
}

function formatIngressClass(value?: string) {
  if (!value || value === "default") return "默认";
  return value;
}

async function handleDelete(row: DemoIngressRecord) {
  try {
    await ElMessageBox.confirm(`确定删除网关 "${row.name}" 吗？`, "删除确认", { type: "warning" });
    demoIngresses.value = {
      ...demoIngresses.value,
      [props.application.id]: ingresses.value.filter((i) => i.name !== row.name)
    };
    ElMessage.success("已删除（Mock）");
  } catch {
    /* cancel */
  }
}

function handleAction(cmd: string, row: DemoIngressRecord) {
  if (cmd === "delete") {
    void handleDelete(row);
    return;
  }
  ElMessage.info(`演示：${cmd} — ${row.name}`);
}
</script>

<template>
  <div class="ingress-management-tab">
    <DemoTableToolbar :loading="loading" @refresh="handleRefresh">
      <template #left>
        <ElButton type="primary" @click="handleCreate"><Plus :size="16" style="margin-right: 4px" /> 创建网关</ElButton>
      </template>
    </DemoTableToolbar>

    <div class="table-wrap">
      <ElTable v-loading="loading" :data="ingresses" stripe border size="default" empty-text="暂无网关">
        <ElTableColumn prop="name" label="网关名称" min-width="180" fixed="left">
          <template #default="{ row }"><span style="font-weight: 500">{{ row.name }}</span></template>
        </ElTableColumn>
        <ElTableColumn label="网关类型" width="130" align="center">
          <template #default="{ row }">
            <ElTag type="info" size="small">{{ formatIngressClass(row.ingressClass) }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="主机/规则" min-width="220">
          <template #default="{ row }">
            <div class="hosts-tags">
              <ElTag v-for="h in row.hosts.slice(0, 2)" :key="h" type="success" size="small">{{ h }}</ElTag>
              <ElTag v-if="row.hosts.length > 2" type="info" size="small">+{{ row.hosts.length - 2 }}</ElTag>
              <span v-if="!row.hosts.length" style="color: #909399">* (所有域名)</span>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="负载均衡地址" width="160" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.address === '待分配' ? '#e6a23c' : '#67c23a' }">{{ row.address }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="ports" label="端口" width="100" align="center" />
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

    <ElDialog v-model="dialogVisible" title="创建网关" width="480px">
      <ElForm label-width="80px">
        <ElFormItem label="名称" required><ElInput v-model="formName" /></ElFormItem>
        <ElFormItem label="域名" required><ElInput v-model="formHost" placeholder="example.com" /></ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">创建</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped lang="scss">
.ingress-management-tab {
  padding-top: 10px;
  padding-bottom: 15px;

  .table-wrap {
    padding: 0 16px;
  }

  .hosts-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
}
</style>
