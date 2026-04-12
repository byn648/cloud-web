import type { DashboardOverviewResponse } from "../../types/dashboard";
import { getResourceDashboardSummaryApi } from "../manager/dashboard";

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function nowTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export async function getDashboardOverviewApi(
  username?: string,
  clusterUuid?: string
): Promise<DashboardOverviewResponse> {
  const summary = await getResourceDashboardSummaryApi({
    clusterUuid: clusterUuid?.trim() || undefined
  });

  const clusterLabel = summary.currentFilter.clusterName || summary.currentFilter.clusterUuid || "全部集群";
  const currentTime = nowTimestamp();

  return {
    welcomeName: username || "超级管理员",
    stats: [
      {
        id: "cluster-total",
        title: "纳管集群",
        value: String(summary.summaryCards.clusterTotalCount),
        trend: `${summary.currentFilter.filteredClusterCount} 个匹配`,
        up: true,
        icon: "cluster",
        caption: clusterLabel
      },
      {
        id: "project-total",
        title: "项目总数",
        value: String(summary.summaryCards.projectTotalCount),
        trend: `${summary.currentFilter.filteredProjectCount} 个筛选结果`,
        up: true,
        icon: "project",
        caption: "资源池与项目分配"
      },
      {
        id: "workspace-total",
        title: "工作空间",
        value: String(summary.summaryCards.workspaceTotalCount),
        trend: `${summary.currentFilter.filteredWorkspaceCount} 个当前可见`,
        up: true,
        icon: "workspace",
        caption: "命名空间级隔离"
      },
      {
        id: "cpu-rate",
        title: "CPU 物理分配率",
        value: formatPercent(summary.summaryCards.cpuPhysicalRate),
        trend: `内存 ${formatPercent(summary.summaryCards.memPhysicalRate)}`,
        up: summary.summaryCards.cpuPhysicalRate <= 80,
        icon: "cpu",
        caption: `GPU ${formatPercent(summary.summaryCards.gpuPhysicalRate)}`
      }
    ],
    actions: [
      {
        id: "cluster-console",
        title: "集群管理",
        description: "查看集群详情、节点状态和同步结果。",
        route: "/index"
      },
      {
        id: "project-management",
        title: "项目管理",
        description: "维护项目基础信息与成员关系。",
        route: "/project/management"
      },
      {
        id: "project-resource",
        title: "资源池",
        description: "按集群分配 CPU、内存、GPU 与 Pod 配额。",
        route: "/project/resource"
      },
      {
        id: "project-workspace",
        title: "工作空间",
        description: "按资源池创建命名空间并设置资源限制。",
        route: "/project/workspace"
      }
    ],
    activities: [
      {
        id: "activity-filter",
        title: "当前资源筛选",
        detail: `${clusterLabel}，项目 ${summary.currentFilter.filteredProjectCount} 个，工作空间 ${summary.currentFilter.filteredWorkspaceCount} 个。`,
        timestamp: currentTime
      },
      {
        id: "activity-cpu",
        title: "CPU 资源概览",
        detail: `物理 ${summary.allocationOverview.cpu.physical}${summary.allocationOverview.cpu.unit}，已分配 ${summary.allocationOverview.cpu.limit}${summary.allocationOverview.cpu.unit}，超分后容量 ${summary.allocationOverview.cpu.capacity}${summary.allocationOverview.cpu.unit}。`,
        timestamp: currentTime - 60
      },
      {
        id: "activity-memory",
        title: "内存资源概览",
        detail: `物理 ${summary.allocationOverview.mem.physical}${summary.allocationOverview.mem.unit}，已分配 ${summary.allocationOverview.mem.limit}${summary.allocationOverview.mem.unit}。`,
        timestamp: currentTime - 120
      },
      {
        id: "activity-storage",
        title: "存储与 Pod 配额",
        detail: `存储 ${summary.allocationOverview.storage.limit}${summary.allocationOverview.storage.unit}，Pod ${summary.allocationOverview.pod.limit}${summary.allocationOverview.pod.unit}。`,
        timestamp: currentTime - 180
      }
    ]
  };
}
