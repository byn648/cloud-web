<template>
  <main class="layout">
    <aside class="sidebar">
      <div class="logo">
        <span class="logo-mark">K</span>
        <span>Kube Nova</span>
      </div>

      <ul class="menu">
        <li
          v-for="item in menuItems"
          :key="item.label"
          class="menu-item"
          :class="{ active: item.label === activeMenu }"
        >
          <div class="menu-row" @click="toggleMenu(item.label)">
            <div class="menu-row-left">
              <span class="menu-icon">{{ item.icon }}</span>
              <span class="menu-label">{{ item.label }}</span>
            </div>
            <span class="menu-arrow" :class="{ expanded: isExpanded(item.label) }">⌄</span>
          </div>

          <ul v-if="isExpanded(item.label)" class="sub-menu">
            <li
              v-for="sub in item.children"
              :key="`${item.label}-${sub}`"
              :class="{ active: item.label === activeMenu && sub === activeSubMenu }"
              @click.stop="selectSubMenu(item.label, sub)"
            >
              {{ sub }}
            </li>
          </ul>
        </li>
      </ul>
    </aside>

    <section class="main">
      <header class="page-topbar">
        <div class="left">
          <span class="toolbar-icon material-btn">☰</span>
          <span class="toolbar-icon material-btn">↻</span>
          <div class="crumb">
            导航 / <span class="crumb-active">{{ activeMenu }} / {{ activeSubMenu }}</span>
          </div>
        </div>
        <div class="right">
          <div class="search-select">
            <span class="search-icon">🔍</span>
            <select v-model="selectedClusterId" @change="handleClusterChange">
              <option :value="ALL_CLUSTERS_VALUE">全部集群</option>
              <option v-for="cluster in clusters" :key="cluster.id" :value="String(cluster.id)">
                {{ cluster.name }} ({{ cluster.environment }})
              </option>
            </select>
          </div>
          <span class="toolbar-icon material-btn">⌗</span>
          <span class="toolbar-icon material-btn">⛶</span>
          <span class="toolbar-icon material-btn">🔔</span>
          <span class="avatar">A</span>
          <button type="button" class="logout material-btn" @click="emit('logout')">退出</button>
        </div>
      </header>

      <nav class="tabs">
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

      <section class="content-panel">
        <ClusterListPage v-if="showClusterListPage" />
        <NodeListPage v-else-if="showNodeListPage" />
        <DeviceCenterPage v-else-if="showDeviceCenterPage" />
        <template v-else>
          <section class="hero">
            <Banner :welcome-name="dashboard?.welcomeName ?? 'super_admin'" />
          </section>

          <div class="filters">
            <input type="text" placeholder="用户ID" />
            <input type="text" placeholder="用户名" />
            <input type="text" placeholder="IP地址" />
            <button class="btn tonal" type="button">重置</button>
            <button class="btn primary" type="button">查询</button>
          </div>

          <section class="summary-grid">
            <TotalProducts :stats="dashboard?.stats ?? []" />
            <TotalOrderVolume :stats="dashboard?.stats ?? []" />
          </section>

          <section class="kpi-grid">
            <SalesTrend :stats="dashboard?.stats ?? []" />
            <SalesGrowth :stats="dashboard?.stats ?? []" />
            <AnnualSales :stats="dashboard?.stats ?? []" />
            <CartConversionRate :stats="dashboard?.stats ?? []" />
          </section>

          <section class="content-grid">
            <HotProductsList :actions="dashboard?.actions ?? []" />
            <TransactionList :activities="dashboard?.activities ?? []" />
          </section>

          <section class="kpi-grid">
            <ProductSales :stats="dashboard?.stats ?? []" />
            <SalesClassification :actions="dashboard?.actions ?? []" />
            <HotCommodity :actions="dashboard?.actions ?? []" />
            <RecentTransaction :activities="dashboard?.activities ?? []" />
          </section>
        </template>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
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
  icon: string;
  children: string[];
}

const emit = defineEmits<{ logout: [] }>();

const dashboard = ref<DashboardOverviewResponse | null>(null);
const clusters = ref<Cluster[]>([]);
const selectedClusterId = ref<string>("all");
const selectedClusterUuid = ref<string>("");
const ALL_CLUSTERS_VALUE = "all";

// 与 kube-nova 初始化菜单保持同名，方便逐项对照迁移。
const menuItems: MenuGroup[] = [
  {
    label: "仪表盘",
    icon: "◫",
    children: ["平台介绍", "分析页", "集群监控", "告警仪表", "资源仪表", "账单仪表"]
  },
  {
    label: "集群管理",
    icon: "⚙",
    children: ["集群管理", "节点管理", "集群资源","站点监控"]
  },
  {
    label: "镜像仓库",
    icon: "▦",
    children: ["仓库管理"]
  },
  {
    label: "设备中心",
    icon: "🖥",
    children: ["设备管理", "设备监控"]
  },
  {
    label: "项目中心",
    icon: "☷",
    children: ["项目管理", "资源池", "工作空间", "审计中心", "镜像仓库"]
  },
  {
    label: "业务中心",
    icon: "◩",
    children: [
      "应用中心",
      "Pod 管理",
      "Job 管理",
      "配置管理",
      "网格管理"
    ]
  },
  {
    label: "审计报表",
    icon: "▣",
    children: ["登录日志", "日志审计", "账单中心"]
  },
  {
    label: "智能运维", 
    icon: "⚡", // 或使用 💡, 🧠
    children: [
      "算电概览",       // 算力使用率与整体能耗(PUE)的全局大盘
      "算力异常检测",   // 僵尸Pod、资源热点、GPU利用率异常
    ]
  },
  {
    label: "系统管理",
    icon: "⌘",
    children: ["用户管理", "角色管理", "权限管理", "菜单管理", "TOKEN管理", "密钥管理", "费用配置"]
  }
];

const activeMenu = ref(menuItems[0].label);
const activeSubMenu = ref(menuItems[0].children[0]);
const expandedMenus = ref<Record<string, boolean>>({
  [menuItems[0].label]: true
});

const tabs = computed(() => {
  const current = menuItems.find((item) => item.label === activeMenu.value);
  return current?.children ?? [];
});

const showClusterListPage = computed(() => {
  return activeMenu.value === "集群管理" && activeSubMenu.value === "集群管理";
});

const showNodeListPage = computed(() => {
  return activeMenu.value === "集群管理" && activeSubMenu.value === "节点管理";
});

const showDeviceCenterPage = computed(() => {
  return activeMenu.value === "设备中心";
});

const activeTab = computed({
  get() {
    return activeSubMenu.value;
  },
  set(value: string) {
    activeSubMenu.value = value;
  }
});

function isExpanded(menuLabel: string): boolean {
  return Boolean(expandedMenus.value[menuLabel]);
}

function toggleMenu(menuLabel: string): void {
  const willExpand = !isExpanded(menuLabel);

  // 手风琴模式：先收起全部一级菜单。
  expandedMenus.value = {};

  // 当前点击项决定是否展开。
  if (willExpand) {
    expandedMenus.value[menuLabel] = true;
  }

  if (activeMenu.value !== menuLabel) {
    activeMenu.value = menuLabel;
    const firstSubMenu = menuItems.find((item) => item.label === menuLabel)?.children[0];
    activeSubMenu.value = firstSubMenu ?? "";
    expandedMenus.value[menuLabel] = true;
  }
}

function selectSubMenu(menuLabel: string, subMenuLabel: string): void {
  activeMenu.value = menuLabel;
  activeSubMenu.value = subMenuLabel;
  // 选中二级时也保持单一级展开。
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
  if (!Number.isFinite(id) || id <= 0) {
    return;
  }

  const detail = await getClusterDetailApi(id);
  selectedClusterUuid.value = detail.uuid;
  dashboard.value = await getDashboardOverviewApi(username, selectedClusterUuid.value);
}
</script>

<style scoped>
@import "./style.css";
</style>
