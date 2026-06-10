import type { ExtendedAxiosRequestConfig } from "@/utils/http";
import { registerDemoHttpResolver } from "@/utils/http";
import { demoVersions, getVersionMetaById, podsForVersion, findVersionById, findApplicationById, findApplicationByVersionId, getDemoWorkspace } from "./demoStore";
import { toPodResourceList, toApiApplication, toApiVersion } from "./demoAdapters";

let installed = false;

export function installDemoHttpMock(): void {
  if (installed) return;
  registerDemoHttpResolver(resolveDemoHttp);
  installed = true;
}

export function uninstallDemoHttpMock(): void {
  if (!installed) return;
  registerDemoHttpResolver(null);
  installed = false;
}

function resolveDemoHttp(config: ExtendedAxiosRequestConfig): unknown | undefined {
  const method = (config.method ?? "GET").toUpperCase();
  const url = String(config.url ?? "");
  const path = url.split("?")[0];

  const versionId = extractVersionId(path);
  const meta = versionId != null ? getVersionMetaById(versionId) : null;

  const appDetailMatch = path.match(/\/workload\/v1\/application\/detail\/(\d+)$/);
  if (method === "GET" && appDetailMatch) {
    const appId = Number(appDetailMatch[1]);
    const app = findApplicationById(appId);
    if (!app) return undefined;
    return toApiApplication(app);
  }

  const versionDetailMatch = path.match(/\/workload\/v1\/application\/version\/detail\/(\d+)$/);
  if (method === "GET" && versionDetailMatch) {
    const id = Number(versionDetailMatch[1]);
    const version = findVersionById(id);
    if (!version) return undefined;
    return toApiVersion(version);
  }

  if (method === "GET" && path.match(/\/workload\/v1\/resource\/\d+\/pods$/)) {
    return toPodResourceList(versionId!);
  }

  if (method === "GET" && path.match(/\/workload\/v1\/resource\/\d+\/images$/)) {
    const image = meta?.image ?? "registry.example.com/demo/app:latest";
    return {
      initContainers: [],
      containers: [{ name: meta?.containerName ?? "main", image }]
    };
  }

  if (method === "GET" && path.match(/\/workload\/v1\/resource\/\d+\/replicas$/)) {
    return meta?.replicas ?? 1;
  }

  if (method === "GET" && path.match(/\/workload\/v1\/resource\/\d+\/update-strategy$/)) {
    return {
      type: "RollingUpdate",
      rollingUpdate: { maxUnavailable: "25%", maxSurge: "25%" }
    };
  }

  if (method === "GET" && path.match(/\/workload\/v1\/resource\/\d+\/history$/)) {
    const image = meta?.image ?? "registry.example.com/demo/app:v1";
    return [
      {
        revision: 3,
        creationTimestamp: Math.floor(Date.now() / 1000) - 3600,
        images: [image],
        replicas: meta?.replicas ?? 1,
        reason: "演示 Mock 历史版本"
      },
      {
        revision: 2,
        creationTimestamp: Math.floor(Date.now() / 1000) - 86400,
        images: [image.replace(/:v\d+$/, ":v2")],
        replicas: meta?.replicas ?? 1,
        reason: "滚动更新"
      }
    ];
  }

  if (method === "GET" && path.includes("/workload/v1/resource/events/") && path.endsWith("/query")) {
    return {
      items: [
        {
          type: "Normal",
          reason: "Scheduled",
          message: "Successfully assigned pod to node",
          count: 1,
          firstTimestamp: Math.floor(Date.now() / 1000) - 7200,
          lastTimestamp: Math.floor(Date.now() / 1000) - 7200,
          source: "kube-scheduler",
          involvedObjectKind: "Pod",
          involvedObjectName: podsForVersion(versionId ?? 0)[0]?.name ?? "demo-pod",
          involvedObjectUid: "demo-uid",
          reportingComponent: "kube-scheduler",
          reportingInstance: "",
          action: "Binding",
          eventTime: Math.floor(Date.now() / 1000) - 7200
        }
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1
    };
  }

  if (method === "GET" && path.includes("/registry-clusters/by-cluster")) {
    return {
      data: [
        {
          id: 1,
          registryId: 1,
          clusterUuid: "cluster-beijing-uuid",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          registry: {
            id: 1,
            uuid: "harbor-demo-uuid",
            name: "Harbor Demo",
            type: "Harbor",
            env: "demo",
            url: "https://harbor.demo.local"
          }
        }
      ]
    };
  }

  if (method === "GET" && path.includes("/projects/by-app")) {
    return {
      items: [{ projectId: 1, name: "ai", ownerName: "admin", isPublic: false, repoCount: 12 }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1
    };
  }

  if (method === "GET" && path.includes("/repositories")) {
    return {
      items: [{ name: "face-recognition", artifactCount: 5, pullCount: 100, updateTime: Date.now() }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1
    };
  }

  if (method === "GET" && path.includes("/artifacts")) {
    return {
      items: [{ digest: "sha256:demo", tags: [{ name: "v3" }, { name: "latest" }], pushTime: Date.now(), pullTime: Date.now() }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1
    };
  }

  if (method === "GET" && path.includes("/images/search/global-by-project")) {
    return {
      items: [{ repository: "face-recognition", projectName: "ai", registryName: "Harbor Demo" }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1
    };
  }

  if (method === "GET" && path.match(/\/workload\/v1\/resource\/\d+\/env$/)) {
    return { envVars: [{ name: "MODEL_PATH", value: "/models/face", type: "plain" }] };
  }

  if (method === "GET" && path.match(/\/workload\/v1\/resource\/\d+\/scheduling$/)) {
    return buildSchedulingMock();
  }

  if (method === "GET" && path.match(/\/workload\/v1\/resource\/\d+\/storage$/)) {
    return { volumes: [], volumeMounts: [], volumeClaimTemplates: [] };
  }

  if (method === "GET" && path.match(/\/workload\/v1\/resource\/\d+\/labels$/)) {
    return { labels: getVersionLabels(versionId ?? 0) };
  }

  if (method === "GET" && path.match(/\/workload\/v1\/resource\/\d+\/probes$/)) {
    return buildProbesMock(meta?.containerName ?? "main");
  }

  if (method === "GET" && path.match(/\/workload\/v1\/resource\/\d+\/resources$/)) {
    return buildResourcesMock(meta?.containerName ?? "main");
  }

  if (method === "GET" && path === "/manager/v1/node") {
    const clusterUuid = String(config.params?.clusterUuid ?? "");
    return buildNodeListMock(clusterUuid);
  }

  if (method === "GET" && path === "/workload/v1/autoscaling/hpa") {
    return null;
  }

  if (method === "GET" && path === "/workload/v1/autoscaling/hpa/yaml") {
    return "apiVersion: autoscaling/v2\nkind: HorizontalPodAutoscaler\nmetadata:\n  name: demo-hpa\n";
  }

  if (method === "GET" && path === "/workload/v1/autoscaling/vpa") {
    return null;
  }

  if (method === "GET" && path === "/workload/v1/autoscaling/vpa/yaml") {
    return "apiVersion: autoscaling.k8s.io/v1\nkind: VerticalPodAutoscaler\nmetadata:\n  name: demo-vpa\n";
  }

  if (method === "GET" && path.match(/\/workload\/v1\/resource\/\d+\/yaml$/)) {
    return buildDeploymentYamlMock(versionId ?? 0);
  }

  if (method === "GET" && path.match(/\/workload\/v1\/resource\/\d+\/detail-yaml$/)) {
    return buildDeploymentYamlMock(versionId ?? 0);
  }

  if (method === "POST" || method === "PUT" || method === "DELETE") {
    if (path.includes("/workload/v1/resource/") || path.includes("/workload/v1/autoscaling/")) {
      return "ok";
    }
    if (path.includes("/registry/")) {
      return "ok";
    }
  }

  return undefined;
}

function extractVersionId(path: string): number | null {
  const match = path.match(/\/workload\/v1\/resource\/(\d+)/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

function getVersionLabels(versionId: number): Record<string, string> {
  for (const list of Object.values(demoVersions.value)) {
    const found = list.find((v) => v.id === versionId);
    if (found?.label) return found.label;
  }
  return { app: "demo-app", version: "v1" };
}

function buildSchedulingMock() {
  return {
    nodeSelector: {},
    tolerations: [],
    topologySpreadConstraints: []
  };
}

function buildProbesMock(containerName: string) {
  return {
    containers: [{ containerName }]
  };
}

function buildResourcesMock(containerName: string) {
  return {
    containers: [
      {
        containerName,
        containerType: "main",
        resources: {
          requests: { cpu: "500m", memory: "512Mi" },
          limits: { cpu: "2", memory: "2Gi" }
        }
      }
    ]
  };
}

function buildDeploymentYamlMock(versionId: number): string {
  const version = findVersionById(versionId);
  const app = findApplicationByVersionId(versionId);
  if (!version || !app) {
    return "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: demo\n";
  }

  const workspace = getDemoWorkspace(app.workspaceId);
  const namespace = workspace?.namespace ?? "default";
  const labels = version.label ?? { app: app.nameEn, version: version.version };
  const appLabel = labels.app ?? app.nameEn;
  const versionLabel = labels.version ?? version.version;
  const image = version.image ?? "registry.example.com/demo/app:latest";
  const replicas = version.replicas ?? 1;

  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${version.resourceName}
  namespace: ${namespace}
  labels:
    app: ${appLabel}
    version: ${versionLabel}
  annotations:
    ikubeops.com/project-name: ${app.nameCn}
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
      app: ${appLabel}
      version: ${versionLabel}
  template:
    metadata:
      labels:
        app: ${appLabel}
        version: ${versionLabel}
    spec:
      containers:
        - name: main
          image: ${image}
          ports:
            - containerPort: 8080
              protocol: TCP
`;
}

function buildNodeListMock(clusterUuid?: string) {
  const now = Date.now();
  const nodePresets: Record<
    string,
    Array<{ id: number; nodeName: string; nodeIp: string; cpuUsge: number; memoryUsge: number; podUsge: number }>
  > = {
    "cluster-beijing-uuid": [
      { id: 1, nodeName: "demo-node-1", nodeIp: "10.0.0.11", cpuUsge: 42, memoryUsge: 58, podUsge: 24 },
      { id: 2, nodeName: "demo-node-2", nodeIp: "10.0.0.12", cpuUsge: 35, memoryUsge: 49, podUsge: 18 }
    ],
    "cluster-shanghai-uuid": [
      { id: 3, nodeName: "demo-node-sh-1", nodeIp: "10.1.0.11", cpuUsge: 38, memoryUsge: 52, podUsge: 20 },
      { id: 4, nodeName: "demo-node-sh-2", nodeIp: "10.1.0.12", cpuUsge: 31, memoryUsge: 44, podUsge: 16 }
    ],
    "cluster-guangzhou-uuid": [
      { id: 5, nodeName: "demo-node-gz-1", nodeIp: "10.2.0.11", cpuUsge: 29, memoryUsge: 41, podUsge: 14 },
      { id: 6, nodeName: "demo-node-gz-2", nodeIp: "10.2.0.12", cpuUsge: 33, memoryUsge: 47, podUsge: 17 }
    ]
  };

  const resolvedUuid =
    clusterUuid && nodePresets[clusterUuid] ? clusterUuid : "cluster-beijing-uuid";

  return {
    items: nodePresets[resolvedUuid].map((node) => ({
      id: node.id,
      clusterUuid: resolvedUuid,
      nodeName: node.nodeName,
      nodeIp: node.nodeIp,
      nodeStatus: "Ready",
      cpuUsge: node.cpuUsge,
      memoryUsge: node.memoryUsge,
      podTotal: 110,
      podUsge: node.podUsge,
      createdAt: now,
      updatedAt: now,
      nodeRole: "worker",
      architecture: "amd64",
      unschedulable: 0
    })),
    total: nodePresets[resolvedUuid].length
  };
}
