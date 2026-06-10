import { ref } from "vue";
import {
  MOCK_APPLICATIONS,
  MOCK_CLUSTERS,
  MOCK_PROJECTS,
  MOCK_WORKSPACES,
  MOCK_SUMMARY_BY_APP,
  MOCK_VERSIONS_BY_APP,
  MOCK_SERVICES_BY_APP,
  MOCK_INGRESSES_BY_APP,
  MOCK_CANARIES_BY_APP,
  MOCK_AUDITS_BY_APP,
  MOCK_PODS_BY_VERSION,
  type DemoAppSummary,
  type DemoApplication,
  type DemoCluster,
  type DemoProject,
  type DemoWorkspace,
  type DemoVersionRecord,
  type DemoServiceRecord,
  type DemoIngressRecord,
  type DemoCanaryRecord,
  type DemoAuditRecord,
  type DemoPodRecord,
  type ResourceType
} from "./data";

export const demoApplications = ref<DemoApplication[]>([...MOCK_APPLICATIONS]);
export const demoSummaries = ref<Record<number, DemoAppSummary>>({ ...MOCK_SUMMARY_BY_APP });
export const demoVersions = ref<Record<number, DemoVersionRecord[]>>(deepClone(MOCK_VERSIONS_BY_APP));
export const demoServices = ref<Record<number, DemoServiceRecord[]>>(deepClone(MOCK_SERVICES_BY_APP));
export const demoIngresses = ref<Record<number, DemoIngressRecord[]>>(deepClone(MOCK_INGRESSES_BY_APP));
export const demoCanaries = ref<Record<number, DemoCanaryRecord[]>>(deepClone(MOCK_CANARIES_BY_APP));
export const demoAudits = ref<Record<number, DemoAuditRecord[]>>(deepClone(MOCK_AUDITS_BY_APP));

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function getDemoProject(id: number | null): DemoProject | null {
  if (id == null) return null;
  return MOCK_PROJECTS.find((p) => p.id === id) ?? null;
}

export function getDemoCluster(id: number | null): DemoCluster | null {
  if (id == null) return null;
  return MOCK_CLUSTERS.find((c) => c.id === id) ?? null;
}

export function getDemoWorkspace(id: number | null): DemoWorkspace | null {
  if (id == null) return null;
  return MOCK_WORKSPACES.find((w) => w.id === id) ?? null;
}

export function workspacesForProject(projectId: number | null): DemoWorkspace[] {
  if (projectId == null) return [];
  return MOCK_WORKSPACES.filter((w) => w.projectId === projectId);
}

export function appsForWorkspace(workspaceId: number | null): DemoApplication[] {
  if (workspaceId == null) return [];
  return demoApplications.value.filter((a) => a.workspaceId === workspaceId);
}

let nextAppId = Math.max(...MOCK_APPLICATIONS.map((a) => a.id), 0) + 1;
let nextVersionId = Math.max(...Object.values(MOCK_VERSIONS_BY_APP).flat().map((v) => v.id), 0) + 1;
let nextAuditId = Math.max(...Object.values(MOCK_AUDITS_BY_APP).flat().map((a) => a.id), 0) + 1;

export function clusterUuidById(clusterId: number): string {
  return MOCK_CLUSTERS.find((c) => c.id === clusterId)?.uuid ?? `demo-cluster-${clusterId}`;
}

export function versionsForApp(applicationId: number): DemoVersionRecord[] {
  return demoVersions.value[applicationId] ?? [];
}

export function servicesForApp(applicationId: number): DemoServiceRecord[] {
  return demoServices.value[applicationId] ?? [];
}

export function ingressesForApp(applicationId: number): DemoIngressRecord[] {
  return demoIngresses.value[applicationId] ?? [];
}

export function canariesForApp(applicationId: number): DemoCanaryRecord[] {
  return demoCanaries.value[applicationId] ?? [];
}

export function auditsForApp(applicationId: number): DemoAuditRecord[] {
  return demoAudits.value[applicationId] ?? [];
}

export function podsForVersion(versionId: number): DemoPodRecord[] {
  return MOCK_PODS_BY_VERSION[versionId] ?? [];
}

export function findVersionById(versionId: number): DemoVersionRecord | null {
  for (const list of Object.values(demoVersions.value)) {
    const found = list.find((v) => v.id === versionId);
    if (found) return found;
  }
  return null;
}

export function findApplicationById(applicationId: number): DemoApplication | null {
  return demoApplications.value.find((a) => a.id === applicationId) ?? null;
}

export function findApplicationByVersionId(versionId: number): DemoApplication | null {
  const version = findVersionById(versionId);
  if (!version) return null;
  return findApplicationById(version.applicationId);
}

export function getVersionMetaById(versionId: number) {
  for (const list of Object.values(demoVersions.value)) {
    const found = list.find((v) => v.id === versionId);
    if (found) {
      return {
        image: found.image,
        replicas: found.replicas,
        containerName: "main",
        resourceName: found.resourceName
      };
    }
  }
  return null;
}

export function updateDemoApplicationMeta(
  applicationId: number,
  patch: Partial<Pick<DemoApplication, "nameCn" | "description">>
): void {
  demoApplications.value = demoApplications.value.map((app) =>
    app.id === applicationId
      ? {
          ...app,
          ...patch,
          updatedAt: formatNow(),
          updatedBy: "demo-user"
        }
      : app
  );
}

export function addDemoApplicationFromSubmit(params: {
  workspaceId: number;
  nameCn: string;
  nameEn: string;
  description?: string;
  resourceType: ResourceType;
  replicaCount?: number;
}): DemoApplication {
  const app: DemoApplication = {
    id: nextAppId++,
    workspaceId: params.workspaceId,
    nameCn: params.nameCn.trim() || params.nameEn.trim(),
    nameEn: params.nameEn.trim(),
    resourceType: params.resourceType,
    description: params.description?.trim() || "通过创建工作负载向导创建（演示）",
    createdBy: "demo-user",
    updatedBy: "demo-user",
    createdAt: formatNow(),
    updatedAt: formatNow()
  };
  const replicas = params.replicaCount ?? 1;
  demoApplications.value = [...demoApplications.value, app];
  demoSummaries.value = {
    ...demoSummaries.value,
    [app.id]: {
      podCount: replicas,
      abnormalPodCount: 0,
      serviceCount: 0,
      ingressCount: 0,
      replicaDesired: replicas,
      replicaReady: 0,
      service: { internalAccessList: [], nodePortList: [], externalAccessList: [] },
      ingressDomains: []
    }
  };
  const versionId = nextVersionId++;
  demoVersions.value = {
    ...demoVersions.value,
    [app.id]: [
      {
        id: versionId,
        applicationId: app.id,
        version: "v1",
        resourceName: `${params.nameEn.trim()}-v1`,
        versionRole: "stable",
        status: 1,
        label: { app: params.nameEn.trim() },
        replicas
      }
    ]
  };
  demoServices.value = { ...demoServices.value, [app.id]: [] };
  demoIngresses.value = { ...demoIngresses.value, [app.id]: [] };
  demoCanaries.value = { ...demoCanaries.value, [app.id]: [] };
  demoAudits.value = {
    ...demoAudits.value,
    [app.id]: [
      {
        id: nextAuditId++,
        applicationId: app.id,
        title: "创建服务",
        operatorName: "demo-user",
        applicationName: app.nameCn,
        workspaceName: getDemoWorkspace(params.workspaceId)?.name ?? "-",
        clusterName: getDemoCluster(getDemoWorkspace(params.workspaceId)?.clusterId ?? null)?.clusterName ?? "-",
        actionDetail: JSON.stringify({ resourceType: params.resourceType, name: app.nameEn }),
        status: 1,
        createdAt: Math.floor(Date.now() / 1000)
      }
    ]
  };
  return app;
}

function formatNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
