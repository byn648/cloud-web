<template>
  <section class="device-page">
    <header class="device-header">
      <h2>设备中心</h2>
      <p>统一查看设备状态、资源分布与告警信息。</p>
    </header>

    <div class="device-grid">
      <article class="device-card">
        <h3>设备总数</h3>
        <p class="value">128</p>
        <small>在线 119 / 离线 9</small>
      </article>

      <article class="device-card">
        <h3>边缘节点</h3>
        <p class="value">36</p>
        <small>覆盖 12 个站点</small>
      </article>

      <article class="device-card">
        <h3>GPU 设备</h3>
        <p class="value">52</p>
        <small>平均利用率 63%</small>
      </article>
    </div>

    <section class="table-wrap">
      <header>
        <h3>设备清单</h3>
        <p>先放占位数据，后续可接 `/device/v1/*` 或 `manager-api` 的真实接口。</p>
      </header>
      <table>
        <thead>
          <tr>
            <th>设备名称</th>
            <th>IP</th>
            <th>类型</th>
            <th>状态</th>
            <th>归属集群</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>edge-gz-01</td>
            <td>10.2.20.11</td>
            <td>边缘网关</td>
            <td><span class="ok">在线</span></td>
            <td>edge-gz</td>
          </tr>
          <tr>
            <td>gpu-hz-02</td>
            <td>10.0.30.22</td>
            <td>GPU 计算节点</td>
            <td><span class="warn">告警</span></td>
            <td>prod-hz</td>
          </tr>
          <tr>
            <td>storage-sh-03</td>
            <td>10.1.40.33</td>
            <td>存储节点</td>
            <td><span class="ok">在线</span></td>
            <td>staging-sh</td>
          </tr>
        </tbody>
      </table>
    </section>
  </section>
</template>

<script setup lang="ts"></script>

<style scoped>
.device-page {
  display: grid;
  gap: 14px;
}

.device-header {
  background: #ffffff;
  border: 1px solid #dce4ee;
  border-radius: 14px;
  padding: 14px;
}

.device-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 20px;
}

.device-header p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.device-card {
  background: #ffffff;
  border: 1px solid #dce4ee;
  border-radius: 14px;
  padding: 14px;
}

.device-card h3 {
  margin: 0;
  color: #475569;
  font-size: 14px;
  font-weight: 600;
}

.device-card .value {
  margin: 10px 0 4px;
  color: #111827;
  font-size: 28px;
  font-weight: 700;
}

.device-card small {
  color: #64748b;
}

.table-wrap {
  background: #ffffff;
  border: 1px solid #dce4ee;
  border-radius: 14px;
  overflow: hidden;
}

.table-wrap header {
  padding: 12px;
  border-bottom: 1px solid #edf2f7;
}

.table-wrap h3 {
  margin: 0;
  color: #1f2937;
  font-size: 16px;
}

.table-wrap p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 12px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 10px 12px;
  border-bottom: 1px solid #edf2f7;
  text-align: left;
  font-size: 13px;
  color: #334155;
}

thead th {
  background: #f8fafc;
  color: #475569;
}

.ok {
  color: #166534;
}

.warn {
  color: #c2410c;
}

@media (max-width: 1200px) {
  .device-grid {
    grid-template-columns: 1fr;
  }
}
</style>
