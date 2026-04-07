<template>
  <div class="m3-layout-v3">
    <header class="content-header-bar">
      <div class="header-left">
        <h2>集群资源大盘</h2>
        <span class="count-badge">共 {{ clusters.length }} 个</span>
      </div>
      
      <div class="header-right">
        <div class="m3-segmented-horizontal">
          <button
            type="button"
            class="seg-btn"
            :class="{ active: viewMode === 'card' }"
            @click="viewMode = 'card'"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
            卡片
          </button>
          <button
            type="button"
            class="seg-btn"
            :class="{ active: viewMode === 'table' }"
            @click="viewMode = 'table'"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            列表
          </button>
        </div>
        
        <div class="header-divider"></div>

        <div class="icon-btn-group">
          <button 
            class="square-icon-btn" 
            :class="{ active: showFilters }" 
            @click="showFilters = !showFilters"
            title="检索/过滤"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          
          <button class="square-icon-btn" @click="refresh" title="刷新数据">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>
          </button>

          <button class="square-icon-btn" title="排序">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
          </button>
          <button class="square-icon-btn" title="设置">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>
      </div>
    </header>

    <transition name="slide-fade">
      <div v-if="showFilters" class="filter-dropdown-panel">
        <form class="filter-form-horizontal" @submit.prevent="loadClusters">
          <div class="input-box">
            <span class="prefix-icon">🔍</span>
            <input v-model.trim="keyword" type="text" class="m3-input" placeholder="输入集群名称进行搜索..." />
          </div>
          
          <div class="input-box">
            <select v-model="environment" class="m3-select">
              <option value="">🌎 全部运行环境</option>
              <option value="prod">🚀 生产环境</option>
              <option value="staging">🧪 测试环境</option>
              <option value="edge">📡 边缘节点</option>
            </select>
          </div>
          
          <button type="submit" class="m3-btn primary">执行查询</button>
          <button type="button" class="m3-btn text" @click="resetFilters">重置</button>
        </form>
      </div>
    </transition>

    <div v-if="errorMsg" class="m3-alert error">{{ errorMsg }}</div>
    <div v-if="loading" class="m3-loading">
      <div class="spinner"></div>
      <span>正在读取集群架构...</span>
    </div>

    <template v-else>
      <section v-if="viewMode === 'card'" class="panoramic-card-list">
        <article v-for="cluster in clusters" :key="cluster.id" class="pano-card">
          
          <div class="pano-section info-sec">
            <div class="icon-badge">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <div class="info-text">
              <div class="title-row">
                <h3>{{ cluster.name }}</h3>
                <span class="m3-chip" :class="cluster.environment">{{ formatEnvironment(cluster.environment) }}</span>
              </div>
              <p class="sub-info">{{ cluster.clusterType }} • 版本 {{ cluster.version }}</p>
              <p class="date-info">创建于 {{ formatDate(cluster.createdAt) }}</p>
            </div>
          </div>

          <div class="pano-section metrics-sec">
            <div class="metric-mini" v-for="metric in metrics(cluster)" :key="metric.name">
              <div class="m-head">
                <span class="m-name">{{ metric.name }}</span>
                <span class="m-val">{{ metric.value }}</span>
              </div>
              <div class="m-bar"><i :style="{ width: metric.value }" :class="metric.level"></i></div>
            </div>
          </div>

          <div class="pano-section action-sec">
            <div class="status-group">
              <div class="s-badge" :class="healthClass(cluster.healthStatus)">
                <span class="dot"></span> {{ healthText(cluster.healthStatus) }}
              </div>
              <div class="s-badge ok">
                <span class="dot"></span> 已同步
              </div>
            </div>
            
            <div class="btn-group">
              <button class="m3-btn primary fill">进入控制台</button>
              <div class="sub-actions">
                <button class="m3-btn text small">同步</button>
                <button class="m3-btn text small">定价</button>
                <button class="m3-btn text danger small">删除</button>
              </div>
            </div>
          </div>

        </article>
      </section>

      <section v-else class="spaced-table-wrap">
        <div class="table-header-row">
          <div class="th">集群名称</div>
          <div class="th">环境/类型</div>
          <div class="th">版本/状态</div>
          <div class="th">资源使用率 (CPU/Mem/Pod/Storage)</div>
          <div class="th">创建时间</div>
        </div>
        
        <div class="spaced-rows">
          <div class="spaced-row" v-for="cluster in clusters" :key="`table-${cluster.id}`">
            <div class="td main-td">
              <strong>{{ cluster.name }}</strong>
            </div>
            
            <div class="td env-td">
              <span class="m3-chip small" :class="cluster.environment">{{ formatEnvironment(cluster.environment) }}</span>
              <span class="type-text">{{ cluster.clusterType }}</span>
            </div>
            
            <div class="td ver-td">
              <span class="mono-ver">v{{ cluster.version }}</span>
              <span class="s-badge inline" :class="healthClass(cluster.healthStatus)">
                {{ healthText(cluster.healthStatus) }}
              </span>
            </div>

            <div class="td micro-metrics-td">
              <div class="micro-bar-group" v-for="metric in metrics(cluster)" :key="metric.name" :title="metric.name + ': ' + metric.value">
                <div class="micro-bg">
                  <div class="micro-fill" :style="{ width: metric.value }" :class="metric.level"></div>
                </div>
                <span class="micro-label">{{ metric.value }}</span>
              </div>
            </div>
            
            <div class="td date-td">{{ formatDate(cluster.createdAt) }}</div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { searchClusterApi, type Cluster } from "../../../api/manager/cluster";

const clusters = ref<Cluster[]>([]);
const loading = ref(false);
const errorMsg = ref("");
const viewMode = ref<"card" | "table">("card");
const keyword = ref("");
const environment = ref("");
const showFilters = ref(false); // 控制过滤面板展开/收起的变量

function percent(value: number): string {
  if (!Number.isFinite(value)) return "0.0%";
  const val = Math.max(0, Math.min(100, value));
  return `${val.toFixed(1)}%`;
}

function healthText(status: number): string {
  if (status === 1) return "健康";
  if (status === 2) return "异常";
  if (status === 3) return "降级";
  return "未知";
}

function healthClass(status: number): string {
  if (status === 1) return "ok";
  if (status === 2) return "danger";
  return "warn";
}

function formatEnvironment(env: string): string {
  if (env === "prod") return "生产";
  if (env === "staging") return "测试";
  if (env === "edge") return "边缘";
  return env || "-";
}

function formatDate(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) {
    return "-";
  }
  const date = new Date(unixSeconds * 1000);
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mi = `${date.getMinutes()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function level(value: number): "low" | "mid" | "high" {
  if (value >= 70) return "high";
  if (value >= 40) return "mid";
  return "low";
}

function metrics(cluster: Cluster) {
  return [
    { name: "CPU", value: percent(cluster.cpuUsage), level: level(cluster.cpuUsage) },
    { name: "内存", value: percent(cluster.memoryUsage), level: level(cluster.memoryUsage) },
    { name: "Pod", value: percent(cluster.podUsage), level: level(cluster.podUsage) },
    { name: "存储", value: percent(cluster.storageUsage), level: level(cluster.storageUsage) }
  ];
}

async function loadClusters(): Promise<void> {
  loading.value = true;
  errorMsg.value = "";
  try {
    const res = await searchClusterApi(keyword.value || undefined, environment.value || undefined);
    clusters.value = res.items ?? [];
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "获取集群失败";
  } finally {
    loading.value = false;
  }
}

async function refresh(): Promise<void> {
  await loadClusters();
}

function resetFilters() {
  keyword.value = "";
  environment.value = "";
  loadClusters();
}

onMounted(async () => {
  await loadClusters();
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Roboto+Mono&family=Roboto:wght@400;500&display=swap');

/* ================= 核心变量 ================= */
.m3-layout-v3 {
  --m3-bg: transparent;
  --m3-surface: #ffffff;
  --m3-surface-variant: #f4f7fc; /* 截图中的浅灰底色 */
  --m3-primary: #0b57d0;
  --m3-primary-hover: #0842a0;
  --m3-tonal: #d3e3fd;
  --m3-on-tonal: #041e49;
  --m3-text-main: #1f1f1f;
  --m3-text-secondary: #444746;
  --m3-border: #dadce0;
  
  --c-ok: #0f9d58; --c-ok-bg: #e6f4ea;
  --c-warn: #e37400; --c-warn-bg: #fef7e0;
  --c-danger: #d93025; --c-danger-bg: #fce8e6;

  font-family: "Google Sans", "Roboto", sans-serif;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

/* ================= 顶部 Header 与 操作组 ================= */
.content-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background: var(--m3-surface);
  padding: 16px 24px;
  border-radius: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.header-left { display: flex; align-items: center; gap: 16px; }
.header-left h2 { margin: 0; font-size: 24px; font-weight: 500; color: var(--m3-text-main); }
.count-badge { background: var(--m3-surface-variant); color: var(--m3-text-secondary); padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 500;}

.header-right { display: flex; align-items: center; gap: 16px; }
.header-divider { width: 1px; height: 24px; background: var(--m3-border); margin: 0 4px; }

/* 水平分段视图按钮 */
.m3-segmented-horizontal {
  display: flex;
  background: var(--m3-surface-variant);
  border-radius: 12px;
  padding: 4px;
}
.seg-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 16px; border: none; background: transparent;
  border-radius: 8px; color: var(--m3-text-secondary);
  font-weight: 500; font-size: 14px; cursor: pointer; transition: all 0.2s;
}
.seg-btn:hover { background: rgba(0,0,0,0.04); color: var(--m3-text-main); }
.seg-btn.active { background: var(--m3-surface); color: var(--m3-primary); box-shadow: 0 1px 2px rgba(0,0,0,0.1); }

/* --- 复刻截图风格的方块图标按钮 --- */
.icon-btn-group {
  display: flex;
  gap: 8px;
}
.square-icon-btn {
  width: 40px; height: 40px;
  border-radius: 10px; /* 截图中的圆角方块 */
  background: var(--m3-surface-variant);
  border: none;
  display: flex; align-items: center; justify-content: center;
  color: #5f6368;
  cursor: pointer;
  transition: all 0.2s ease;
}
.square-icon-btn:hover {
  background: #e8eaed;
  color: var(--m3-text-main);
}
.square-icon-btn.active {
  background: var(--m3-tonal);
  color: var(--m3-primary);
}


/* ================= 展开式检索过滤面板 ================= */
.filter-dropdown-panel {
  background: var(--m3-surface);
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border: 1px solid var(--m3-border);
  transform-origin: top;
}

/* 动画过渡 */
.slide-fade-enter-active, .slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-fade-enter-from, .slide-fade-leave-to {
  opacity: 0; transform: translateY(-10px);
}

.filter-form-horizontal {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
}
.input-box {
  position: relative; display: flex; align-items: center; flex: 1; min-width: 200px;
}
.prefix-icon {
  position: absolute; left: 16px; color: var(--m3-text-secondary); font-size: 14px;
}
.m3-input, .m3-select {
  height: 44px; border-radius: 12px; border: 1px solid var(--m3-border);
  background: var(--m3-surface-variant); color: var(--m3-text-main); font-size: 14px;
  padding: 0 16px; outline: none; transition: border-color 0.2s, background 0.2s; width: 100%;
}
.m3-input { padding-left: 40px; }
.m3-input:focus, .m3-select:focus { 
  border: 2px solid var(--m3-primary); background: var(--m3-surface);
}
.m3-input:focus { padding-left: 39px; }

/* 按钮通用 */
.m3-btn {
  height: 44px; border-radius: 12px; padding: 0 24px; font-size: 14px; font-weight: 500;
  cursor: pointer; border: none; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center;
}
.m3-btn.primary { background: var(--m3-primary); color: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.m3-btn.primary:hover { background: var(--m3-primary-hover); box-shadow: 0 1px 4px rgba(0,0,0,0.2); transform: translateY(-1px); }
.m3-btn.text { background: transparent; color: var(--m3-text-secondary); }
.m3-btn.text:hover { background: var(--m3-surface-variant); color: var(--m3-text-main);}


/* ================= 提示与加载 ================= */
.m3-alert { padding: 16px 24px; border-radius: 12px; font-size: 15px; }
.m3-alert.error { background: var(--c-danger-bg); color: var(--c-danger); }
.m3-loading { padding: 100px 0; display: flex; flex-direction: column; align-items: center; gap: 16px; color: var(--m3-text-secondary); }
.spinner { width: 40px; height: 40px; border: 4px solid var(--m3-surface-variant); border-top-color: var(--m3-primary); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }


/* ================= 宽幅卡片视图 (Panoramic Cards) ================= */
.panoramic-card-list { display: flex; flex-direction: column; gap: 16px; }

.pano-card {
  background: var(--m3-surface);
  border: 1px solid transparent;
  border-radius: 20px;
  padding: 24px;
  display: flex;
  gap: 32px;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  transition: box-shadow 0.2s, transform 0.2s;
}
.pano-card:hover {
  box-shadow: 0 6px 16px rgba(0,0,0,0.06);
  transform: translateY(-2px);
}

.pano-section { display: flex; flex-direction: column; }

/* 左侧信息块 */
.info-sec { flex: 1.2; flex-direction: row; gap: 20px; align-items: center; min-width: 260px;}
.icon-badge { width: 56px; height: 56px; background: var(--m3-surface-variant); color: var(--m3-primary); border-radius: 16px; display: grid; place-items: center; flex-shrink: 0; }
.info-text { display: flex; flex-direction: column; gap: 6px; }
.title-row { display: flex; align-items: center; gap: 12px; }
.title-row h3 { margin: 0; font-size: 20px; color: var(--m3-text-main); font-weight: 500; }
.sub-info { margin: 0; color: var(--m3-text-main); font-size: 14px; }
.date-info { margin: 0; color: var(--m3-text-secondary); font-size: 13px; }

/* 中间指标块 */
.metrics-sec { flex: 1.5; display: grid; grid-template-columns: 1fr 1fr; gap: 16px 32px; border-left: 1px solid var(--m3-border); border-right: 1px solid var(--m3-border); padding: 0 32px; }
.metric-mini { display: flex; flex-direction: column; gap: 8px; }
.m-head { display: flex; justify-content: space-between; font-size: 13px; }
.m-name { color: var(--m3-text-secondary); }
.m-val { font-weight: 500; color: var(--m3-text-main); }
.m-bar { height: 6px; background: var(--m3-surface-variant); border-radius: 3px; overflow: hidden; }
.m-bar i { display: block; height: 100%; border-radius: 3px; }
.m-bar i.low { background: var(--m3-primary); } 
.m-bar i.mid { background: var(--c-warn); }
.m-bar i.high { background: var(--c-danger); }

/* 右侧状态与操作块 */
.action-sec { flex: 1; align-items: flex-end; justify-content: space-between; align-self: stretch; gap: 16px; min-width: 180px;}
.status-group { display: flex; gap: 12px; margin-bottom: auto; }
.s-badge { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 10px; font-size: 13px; font-weight: 500; background: var(--m3-surface-variant); color: var(--m3-text-secondary); }
.s-badge .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.s-badge.ok { background: var(--c-ok-bg); color: var(--c-ok); }
.s-badge.danger { background: var(--c-danger-bg); color: var(--c-danger); }
.s-badge.warn { background: var(--c-warn-bg); color: var(--c-warn); }

.btn-group { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; width: 100%; }
.btn-group .primary { width: 100%; height: 40px; }
.sub-actions { display: flex; gap: 4px; }


/* ================= 悬浮胶囊列表视图 ================= */
.spaced-table-wrap { display: flex; flex-direction: column; gap: 12px; width: 100%; overflow-x: auto;}

.table-header-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 2fr 1fr;
  padding: 0 24px;
  min-width: 900px;
}
.table-header-row .th { font-size: 13px; color: var(--m3-text-secondary); font-weight: 500; }

.spaced-rows { display: flex; flex-direction: column; gap: 12px; min-width: 900px; }
.spaced-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 2fr 1fr;
  background: var(--m3-surface);
  border-radius: 16px; 
  padding: 16px 24px;
  align-items: center;
  border: 1px solid transparent;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  transition: all 0.2s;
}
.spaced-row:hover {
  border-color: var(--m3-border); box-shadow: 0 4px 12px rgba(0,0,0,0.05); transform: translateY(-1px);
}

.td { font-size: 14px; display: flex; flex-direction: column; justify-content: center; gap: 6px; }
.main-td strong { font-size: 16px; color: var(--m3-text-main); font-weight: 500; }
.env-td, .ver-td { align-items: flex-start; }
.type-text { font-size: 13px; color: var(--m3-text-secondary); padding-left: 4px;}
.mono-ver { font-family: "Roboto Mono", monospace; color: var(--m3-text-main); background: var(--m3-surface-variant); padding: 4px 8px; border-radius: 8px; font-size: 13px;}
.s-badge.inline { padding: 4px 8px; font-size: 12px; border-radius: 8px; }

/* 列表微型图表 */
.micro-metrics-td { flex-direction: row; gap: 16px; align-items: center; }
.micro-bar-group { display: flex; flex-direction: column; gap: 4px; width: 40px; }
.micro-bg { height: 4px; background: var(--m3-surface-variant); border-radius: 2px; overflow: hidden;}
.micro-fill { height: 100%; border-radius: 2px; }
.micro-fill.low { background: var(--m3-primary); }
.micro-fill.mid { background: var(--c-warn); }
.micro-fill.high { background: var(--c-danger); }
.micro-label { font-size: 11px; color: var(--m3-text-secondary); text-align: center; font-family: "Roboto Mono", monospace;}

.date-td { color: var(--m3-text-secondary); font-size: 13px; }

/* 芯片通用 */
.m3-chip { padding: 4px 12px; border-radius: 10px; font-size: 12px; font-weight: 500; background: var(--m3-surface-variant); color: var(--m3-text-secondary); display: inline-block; width: fit-content; }
.m3-chip.prod { background: #e8f0fe; color: #1967d2; }
.m3-chip.staging { background: #fef7e0; color: #b06000; }
.m3-chip.small { padding: 2px 8px; font-size: 12px; border-radius: 6px; }

/* 响应式 */
@media (max-width: 1300px) {
  .pano-card { flex-direction: column; align-items: stretch; gap: 24px; }
  .metrics-sec { border: none; padding: 0; border-top: 1px solid var(--m3-border); padding-top: 24px; }
  .action-sec { flex-direction: row; align-items: center; }
  .btn-group { flex-direction: row; width: auto; align-items: center;}
  .btn-group .primary { width: auto; }
}

@media (max-width: 900px) {
  .content-header-bar { flex-direction: column; align-items: flex-start; }
  .header-right { width: 100%; justify-content: space-between; flex-wrap: wrap;}
  .header-divider { display: none; }
  .filter-form-horizontal { flex-direction: column; align-items: stretch; }
  .filter-form-horizontal .m3-btn { width: 100%; }
}
</style>