// src/store/modules/applicationManagement.ts（与 kube-nova-web 同名模块对齐）
import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { useProjectStore } from "./project";
import type { ProjectCluster, ProjectWorkspace, OnecProjectApplication } from "@/api";

interface ApplicationManagementState {
  clusterId: number | null;
  workspaceId: number | null;
  applicationId: number | null;
  resourceType: string;
  showServiceTree: boolean;
  sidebarWidth: number;
  activeTab: string;
}

const STORAGE_KEY_PREFIX = "art-app-management";

export const useApplicationManagementStore = defineStore("applicationManagement", () => {
  const projectStore = useProjectStore();

  const selectedClusterId = ref<number | null>(null);
  const selectedCluster = ref<ProjectCluster | null>(null);

  const selectedWorkspaceId = ref<number | null>(null);
  const selectedWorkspace = ref<ProjectWorkspace | null>(null);

  const selectedApplicationId = ref<number | null>(null);
  const selectedApplication = ref<OnecProjectApplication | null>(null);

  const selectedResourceType = ref<string>("all");
  const showServiceTree = ref<boolean>(false);
  const sidebarWidth = ref<number>(320);
  const activeTab = ref<string>("basic");

  const initialized = ref(false);

  const getStorageKey = () => {
    const projectId = projectStore.selectedProjectId;
    return projectId ? `${STORAGE_KEY_PREFIX}-${projectId}` : null;
  };

  const saveState = () => {
    const storageKey = getStorageKey();
    if (!storageKey) return;

    const state: ApplicationManagementState = {
      clusterId: selectedClusterId.value,
      workspaceId: selectedWorkspaceId.value,
      applicationId: selectedApplicationId.value,
      resourceType: selectedResourceType.value,
      showServiceTree: showServiceTree.value,
      sidebarWidth: sidebarWidth.value,
      activeTab: activeTab.value
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.error("[应用管理Store] 保存状态失败:", error);
    }
  };

  const loadState = (): ApplicationManagementState | null => {
    const storageKey = getStorageKey();
    if (!storageKey) return null;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved) as ApplicationManagementState;
      }
    } catch (error) {
      console.error("[应用管理Store] 加载状态失败:", error);
      localStorage.removeItem(storageKey);
    }
    return null;
  };

  const restoreState = () => {
    const state = loadState();
    if (state) {
      selectedClusterId.value = state.clusterId;
      selectedWorkspaceId.value = state.workspaceId;
      selectedApplicationId.value = state.applicationId;
      selectedResourceType.value = state.resourceType || "all";
      showServiceTree.value = state.showServiceTree || false;
      sidebarWidth.value = state.sidebarWidth || 320;
      activeTab.value = state.activeTab || "basic";
      return true;
    }
    return false;
  };

  const clearState = () => {
    const storageKey = getStorageKey();

    selectedClusterId.value = null;
    selectedCluster.value = null;
    selectedWorkspaceId.value = null;
    selectedWorkspace.value = null;
    selectedApplicationId.value = null;
    selectedApplication.value = null;
    selectedResourceType.value = "all";
    showServiceTree.value = false;
    sidebarWidth.value = 320;
    activeTab.value = "basic";

    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  };

  const clearAllStoredData = () => {
    try {
      const keys = Object.keys(localStorage);
      keys.filter((key) => key.startsWith(STORAGE_KEY_PREFIX)).forEach((key) => localStorage.removeItem(key));
      clearState();
    } catch (error) {
      console.error("[应用管理Store] 清空存储数据失败:", error);
    }
  };

  const setCluster = (cluster: ProjectCluster | null, silent = false) => {
    const clusterChanged = selectedClusterId.value !== cluster?.id;

    selectedCluster.value = cluster;
    selectedClusterId.value = cluster?.id || null;

    if (clusterChanged && !silent) {
      selectedWorkspaceId.value = null;
      selectedWorkspace.value = null;
      selectedApplicationId.value = null;
      selectedApplication.value = null;
    }

    saveState();
  };

  const setWorkspace = (workspace: ProjectWorkspace | null, silent = false) => {
    const workspaceChanged = selectedWorkspaceId.value !== workspace?.id;

    selectedWorkspace.value = workspace;
    selectedWorkspaceId.value = workspace?.id || null;

    if (workspaceChanged && !silent) {
      selectedApplicationId.value = null;
      selectedApplication.value = null;
    }

    saveState();
  };

  const setApplication = (application: OnecProjectApplication | null) => {
    selectedApplication.value = application;
    selectedApplicationId.value = application?.id || null;
    saveState();
  };

  const setResourceType = (type: string) => {
    selectedResourceType.value = type;
    saveState();
  };

  const setShowServiceTree = (show: boolean) => {
    showServiceTree.value = show;
    saveState();
  };

  const setSidebarWidth = (width: number) => {
    sidebarWidth.value = width;
    saveState();
  };

  const setActiveTab = (tab: string) => {
    activeTab.value = tab;
    saveState();
  };

  const initializeStore = async () => {
    if (initialized.value) return;

    await projectStore.ensureInitialized();

    if (projectStore.selectedProject) {
      restoreState();
    }

    initialized.value = true;
  };

  const ensureInitialized = async () => {
    if (!initialized.value) {
      await initializeStore();
    }
  };

  watch(
    () => projectStore.selectedProjectId,
    (newProjectId, oldProjectId) => {
      if (oldProjectId && newProjectId !== oldProjectId) {
        clearState();
        if (newProjectId) {
          restoreState();
        }
      }
    }
  );

  return {
    selectedClusterId,
    selectedCluster,
    selectedWorkspaceId,
    selectedWorkspace,
    selectedApplicationId,
    selectedApplication,
    selectedResourceType,
    showServiceTree,
    sidebarWidth,
    activeTab,
    initialized,
    setCluster,
    setWorkspace,
    setApplication,
    setResourceType,
    setShowServiceTree,
    setSidebarWidth,
    setActiveTab,
    clearState,
    clearAllStoredData,
    saveState,
    loadState,
    restoreState,
    initializeStore,
    ensureInitialized
  };
});
