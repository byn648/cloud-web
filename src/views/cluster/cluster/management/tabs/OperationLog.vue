<template>
  <div class="panel-body">
    <div class="log-table-wrap">
      <table class="log-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>动作</th>
            <th>结果</th>
            <th>详情</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id">
            <td>{{ log.time }}</td>
            <td>{{ log.action }}</td>
            <td>
              <span class="chip" :class="log.result === '成功' ? 'ok' : 'warn'">{{ log.result }}</span>
            </td>
            <td>{{ log.detail }}</td>
          </tr>
          <tr v-if="logs.length === 0">
            <td colspan="4" class="empty-row">暂无操作日志</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface OperationLogItem {
  id: number;
  time: string;
  action: string;
  result: "成功" | "失败";
  detail: string;
}

defineProps<{
  logs: OperationLogItem[];
}>();
</script>

<style scoped>
.panel-body { padding: 18px; }
.log-table-wrap { overflow-x: auto; }
.log-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 640px;
}
.log-table th,
.log-table td {
  border-bottom: 1px solid #e5ebf3;
  text-align: left;
  padding: 10px 8px;
  font-size: 13px;
}
.log-table th { color: #607086; font-weight: 600; }
.log-table td { color: #1f2a3d; }
.chip {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  background: #edf2f8;
  color: #4b5f7a;
}
.chip.ok { background: #eafaf0; color: #138a4f; }
.chip.warn { background: #fff5e8; color: #c66800; }
.empty-row { text-align: center; color: #64748b; }
</style>
