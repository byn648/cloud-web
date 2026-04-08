<template>
  <div class="panel-body">
    <div class="info-grid">
      <article class="info-card">
        <h3>认证模式</h3>
        <div class="kv"><span>身份认证</span><strong>ServiceAccount + X509</strong></div>
        <div class="kv"><span>鉴权模型</span><strong>RBAC</strong></div>
        <div class="kv"><span>匿名访问</span><strong>禁用</strong></div>
      </article>

      <article class="info-card">
        <h3>外部身份源</h3>
        <div class="kv"><span>OIDC</span><strong>未配置</strong></div>
        <div class="kv"><span>LDAP</span><strong>未配置</strong></div>
        <div class="kv"><span>Webhook Auth</span><strong>未配置</strong></div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.panel-body { padding: 18px; }
.info-grid { display: grid; grid-template-columns: repeat(2, minmax(260px, 1fr)); gap: 14px; }
.info-card {
  border: 1px solid #dde5f0;
  border-radius: 14px;
  background: #fbfcff;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.info-card h3 { margin: 0; font-size: 18px; color: #24334d; }
.kv { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
.kv span { color: #607086; }
.kv strong { color: #1f2a3d; text-align: right; overflow-wrap: anywhere; }
@media (max-width: 900px) {
  .info-grid { grid-template-columns: 1fr; }
}
</style>
