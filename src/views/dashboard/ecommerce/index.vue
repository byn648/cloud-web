<template>
  <main class="google-m3-layout">
    <aside class="sidebar">
      <div class="logo">
        <span class="logo-mark">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span class="logo-text">cloud system</span>
      </div>

      <div class="menu-scroll">
        <ul class="menu">
          <li
            v-for="item in menuItems"
            :key="item.label"
            class="menu-group"
          >
            <div 
              class="menu-row" 
              :class="{ active: item.label === activeMenu }"
              @click="toggleMenu(item.label)"
            >
              <div class="menu-row-left">
                <div class="icon-circle" :style="{ backgroundColor: item.iconBg }">
                  <span class="icon-svg" v-html="item.svgIcon"></span>
                  </div>
                <span class="menu-label">{{ item.label }}</span>
              </div>
              <span v-if="item.children.length > 0" class="menu-arrow" :class="{ expanded: isExpanded(item.label) }">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </span>
            </div>

            <ul v-if="isExpanded(item.label)" class="sub-menu">
              <li
                v-for="sub in item.children"
                :key="`${item.label}-${sub}`"
                class="sub-menu-item"
                :class="{ active: item.label === activeMenu && sub === activeSubMenu }"
                @click.stop="selectSubMenu(item.label, sub)"
              >
                {{ sub }}
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </aside>

    <section class="main-content">
      <header class="topbar">
        <div class="breadcrumb">
          <span>导航</span>
          <span class="separator">/</span>
          <span class="active-crumb">{{ activeMenu }}</span>
        </div>

        <div class="topbar-actions">
          <div class="cluster-selector-pill">
            <span class="search-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </span>
            <select v-model="selectedClusterId" @change="handleClusterChange" class="transparent-select">
              <option :value="ALL_CLUSTERS_VALUE">全部集群资源</option>
              <option v-for="cluster in clusters" :key="cluster.id" :value="String(cluster.id)">
                {{ cluster.name }} ({{ cluster.environment }})
              </option>
            </select>
          </div>
          
          <button class="icon-btn" title="通知"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></button>
          
          <div class="avatar-dropdown">
            <div class="user-avatar">管</div>
            <div class="dropdown-menu">
              <button @click="emit('logout')">退出登录</button>
            </div>
          </div>
        </div>
      </header>

      <nav class="md3-tabs" v-if="tabs.length > 0">
        <div
          v-for="tab in tabs"
          :key="tab"
          class="tab-item"
          :class="{ active: tab === activeTab }"
          @click="activeTab = tab"
        >
          {{ tab }}
        </div>
      </nav>

      <div class="content-scroll-area">
        <ClusterListPage v-if="showClusterListPage" />
        <NodeListPage v-else-if="showNodeListPage" />
        <DeviceCenterPage v-else-if="showDeviceCenterPage" />
        
        <template v-else>
          <section class="hero-center-stage">
            <div class="hero-avatar">管</div>
            <h1 class="welcome-title">欢迎回来，{{ dashboard?.welcomeName ?? '超级管理员' }}</h1>
            
            <div class="mega-search-bar">
              <svg class="mega-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input type="text" placeholder="搜索集群、Pod、设备或用户..." />
            </div>

            <div class="quick-chips">
              <button class="chip">我的集群</button>
              <button class="chip">节点状态</button>
              <button class="chip">安全审计</button>
            </div>
          </section>

          <div class="dashboard-grids">
            <section class="summary-grid">
              <TotalProducts class="md3-card" :stats="dashboard?.stats ?? []" />
              <TotalOrderVolume class="md3-card" :stats="dashboard?.stats ?? []" />
            </section>
            <section class="kpi-grid">
              <SalesTrend class="md3-card" :stats="dashboard?.stats ?? []" />
              <SalesGrowth class="md3-card" :stats="dashboard?.stats ?? []" />
              <AnnualSales class="md3-card" :stats="dashboard?.stats ?? []" />
              <CartConversionRate class="md3-card" :stats="dashboard?.stats ?? []" />
            </section>
            <section class="content-grid">
              <HotProductsList class="md3-card" :actions="dashboard?.actions ?? []" />
              <TransactionList class="md3-card" :activities="dashboard?.activities ?? []" />
            </section>
          </div>
        </template>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
// 组件引入保持不变
import Banner from "./modules/banner.vue";
import AnnualSales from "./modules/annual-sales.vue";
import CartConversionRate from "./modules/cart-conversion-rate.vue";
import HotCommodity from "./modules/hot-commodity.vue";
import HotProductsList from "./modules/hot-products-list.vue";
import ProductSales from "./modules/product-sales.vue";
import RecentTransaction from "./modules/recent-transaction.vue";
import SalesClassification from "./modules/sales-classification.vue";
import SalesGrowth from "./modules/sales-growth.vue";
import SalesTrend from "./modules/sales-trend.vue";
import TotalOrderVolume from "./modules/total-order-volume.vue";
import TotalProducts from "./modules/total-products.vue";
import TransactionList from "./modules/transaction-list.vue";
import ClusterListPage from "../../cluster/cluster/index.vue";
import NodeListPage from "../../cluster/node/index.vue";
import DeviceCenterPage from "../../device/center/index.vue";
import { getDashboardOverviewApi } from "../../../api/portal/dashboard";
import { getClusterDetailApi, searchClusterApi } from "../../../api/manager/cluster";
import type { DashboardOverviewResponse } from "../../../types/dashboard";
import type { Cluster } from "../../../api/manager/cluster";

interface MenuGroup {
  label: string;
  iconBg: string; // 圆形背景颜色
  svgIcon: string; // 图标 SVG 字符串 (或替换为图片路径)
  children: string[];
}

const emit = defineEmits<{ logout: [] }>();

const dashboard = ref<DashboardOverviewResponse | null>(null);
const clusters = ref<Cluster[]>([]);
const selectedClusterId = ref<string>("all");
const selectedClusterUuid = ref<string>("");
const ALL_CLUSTERS_VALUE = "all";

// --- 完美复现截图中各种莫兰迪彩色底色的 SVG 图标配置 ---
const menuItems = ref<MenuGroup[]>([
  { 
    label: "仪表盘", 
    iconBg: "#a8c7fa", // 截图中的浅蓝色
    svgIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="#041e49" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    children: ["平台介绍", "分析页", "集群监控", "告警仪表", "资源仪表"] 
  },
  { 
    label: "集群管理", 
    iconBg: "#9bd6b6", // 截图中的浅绿色
    svgIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="#003820" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>`,
    children: ["集群管理", "节点管理", "集群资源","站点监控"] 
  },
  { 
    label: "镜像仓库", 
    iconBg: "#7fcfff", // 明蓝色
    svgIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="#003554" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
    children: ["仓库管理"] 
  },
  { 
    label: "设备中心", 
    iconBg: "#e0c6f8", // 截图中的浅紫色
    svgIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="#311155" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
    children: ["设备管理", "设备监控"] 
  },
  { 
    label: "项目中心", 
    iconBg: "#f3b7d6", // 截图中的粉色
    svgIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="#5c0029" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    children: ["项目管理", "资源池", "工作空间", "审计中心"] 
  },
  { 
    label: "业务中心", 
    iconBg: "#fdbfd7", // 玫瑰色
    svgIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="#5c0029" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
    children: ["应用中心", "Pod 管理", "Job 管理", "配置管理"] 
  },
  { 
    label: "审计报表", 
    iconBg: "#f8cba6", // 截图中的浅橙色
    svgIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="#522a00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
    children: ["登录日志", "日志审计", "账单中心"] 
  },
  { 
    label: "智能运维", 
    iconBg: "#f6c489", // 桃色
    svgIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="#522a00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    children: ["算电概览", "算力异常检测"] 
  },
  { 
    label: "系统管理", 
    iconBg: "#d3e3fd", // 浅灰蓝
    svgIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="#041e49" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    children: ["用户管理", "角色管理", "权限管理", "菜单管理"] 
  }
]);

const activeMenu = ref(menuItems.value[0].label);
const activeSubMenu = ref(menuItems.value[0].children[0]);
const expandedMenus = ref<Record<string, boolean>>({
  [menuItems.value[0].label]: true
});

const tabs = computed(() => {
  const current = menuItems.value.find((item) => item.label === activeMenu.value);
  return current?.children ?? [];
});

const showClusterListPage = computed(() => activeMenu.value === "集群管理" && activeSubMenu.value === "集群管理");
const showNodeListPage = computed(() => activeMenu.value === "集群管理" && activeSubMenu.value === "节点管理");
const showDeviceCenterPage = computed(() => activeMenu.value === "设备中心");

const activeTab = computed({
  get() { return activeSubMenu.value; },
  set(value: string) { activeSubMenu.value = value; }
});

function isExpanded(menuLabel: string): boolean {
  return Boolean(expandedMenus.value[menuLabel]);
}

function toggleMenu(menuLabel: string): void {
  const willExpand = !isExpanded(menuLabel);
  expandedMenus.value = {}; // 收起其他
  if (willExpand) {
    expandedMenus.value[menuLabel] = true;
  }
  if (activeMenu.value !== menuLabel) {
    activeMenu.value = menuLabel;
    const firstSubMenu = menuItems.value.find((item) => item.label === menuLabel)?.children[0];
    activeSubMenu.value = firstSubMenu ?? "";
    expandedMenus.value[menuLabel] = true;
  }
}

function selectSubMenu(menuLabel: string, subMenuLabel: string): void {
  activeMenu.value = menuLabel;
  activeSubMenu.value = subMenuLabel;
  expandedMenus.value = { [menuLabel]: true };
}

onMounted(async () => {
  const userInfoRaw = localStorage.getItem("userInfo");
  const username = userInfoRaw ? (JSON.parse(userInfoRaw).username as string | undefined) : undefined;
  try {
    await loadClusters();
    dashboard.value = await getDashboardOverviewApi(username);
  } catch (error) {
    console.error("Failed to load dashboard overview", error);
  }
});

async function loadClusters(): Promise<void> {
  const response = await searchClusterApi();
  clusters.value = response.items ?? [];
}

async function handleClusterChange(): Promise<void> {
  const userInfoRaw = localStorage.getItem("userInfo");
  const username = userInfoRaw ? (JSON.parse(userInfoRaw).username as string | undefined) : undefined;
  if (selectedClusterId.value === ALL_CLUSTERS_VALUE) {
    selectedClusterUuid.value = "";
    dashboard.value = await getDashboardOverviewApi(username);
    return;
  }
  const id = Number(selectedClusterId.value);
  if (!Number.isFinite(id) || id <= 0) return;
  const detail = await getClusterDetailApi(id);
  selectedClusterUuid.value = detail.uuid;
  dashboard.value = await getDashboardOverviewApi(username, selectedClusterUuid.value);
}
</script>

<style scoped>
@import "./style.css";
</style>