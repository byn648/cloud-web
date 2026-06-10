import type {
  OnecProjectApplication,
  OnecProjectVersion,
  ProjectCluster,
  ProjectWorkspace
} from "@/api";
import type { DemoApplication, DemoCluster, DemoVersionRecord, DemoWorkspace } from "./data";
import { podsForVersion, getDemoCluster, getDemoWorkspace } from "./demoStore";
import { MOCK_APPLICATIONS, MOCK_VERSIONS_BY_APP } from "./data";
import type { PodResourceList } from "@/api/workload/wiekload";

export type ApiVersion = OnecProjectVersion & {
  status?: number;
  label?: Record<string, string>;
};

export function toApiApplication(app: DemoApplication): OnecProjectApplication {
  const ts = parseDemoTime(app.createdAt);
  return {
    id: app.id,
    workspaceId: app.workspaceId,
    nameCn: app.nameCn,
    nameEn: app.nameEn,
    resourceType: app.resourceType,
    description: app.description,
    createdBy: app.createdBy ?? "demo",
    updatedBy: app.updatedBy ?? "demo",
    createdAt: ts,
    updatedAt: parseDemoTime(app.updatedAt) || ts
  };
}

export function toApiCluster(cluster: DemoCluster | null): ProjectCluster | null {
  if (!cluster) return null;
  return {
    id: cluster.id,
    clusterUuid: cluster.uuid,
    uuid: cluster.uuid,
    clusterName: cluster.clusterName,
    cpuCapacity: cluster.cpuCapacity,
    memCapacity: cluster.memCapacity,
    projectId: 1
  } as ProjectCluster;
}

export function toApiWorkspace(workspace: DemoWorkspace | null): ProjectWorkspace | null {
  if (!workspace) return null;
  return {
    id: workspace.id,
    name: workspace.name,
    namespace: workspace.namespace
  } as ProjectWorkspace;
}

export function toApiVersion(version: DemoVersionRecord): ApiVersion {
  return {
    id: version.id,
    applicationId: version.applicationId,
    version: version.version,
    resourceName: version.resourceName,
    versionRole: version.versionRole,
    parentAppName: "",
    createdBy: "demo",
    updatedBy: "demo",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: version.status,
    label: version.label
  };
}

export function toApiVersions(list: DemoVersionRecord[]): ApiVersion[] {
  return list.map(toApiVersion);
}

function clusterNameForVersion(versionId: number): string {
  for (const [appId, versions] of Object.entries(MOCK_VERSIONS_BY_APP)) {
    if (!versions.some((v) => v.id === versionId)) continue;
    const app = MOCK_APPLICATIONS.find((a) => a.id === Number(appId));
    if (!app) return "-";
    const workspace = getDemoWorkspace(app.workspaceId);
    return getDemoCluster(workspace?.clusterId ?? null)?.clusterName ?? "-";
  }
  return "-";
}

export function toPodResourceList(versionId: number): PodResourceList[] {
  const clusterName = clusterNameForVersion(versionId);
  return podsForVersion(versionId).map((p) => ({
    name: p.name,
    namespace: "test",
    status: p.status,
    ready: p.status === "Running" ? "1/1" : "0/1",
    restarts: p.restarts,
    age: p.age,
    cluster: p.cluster ?? clusterName,
    node: p.node,
    podIP: "10.244.0.1",
    labels: {},
    creationTime: Math.floor(Date.now() / 1000),
    containers: {
      initContainers: [],
      containers: [{ name: "main", image: "registry.example.com/demo:latest" }]
    }
  }));
}

function parseDemoTime(value?: string): number {
  if (!value) return Date.now();
  const ms = Date.parse(value.replace(" ", "T"));
  return Number.isNaN(ms) ? Date.now() : ms;
}
