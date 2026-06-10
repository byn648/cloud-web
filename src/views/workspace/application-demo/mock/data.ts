/** 应用中心演示 — 本地 Mock，后续可替换为 API */

export type ResourceType =
  | "pod"
  | "deployment"
  | "statefulset"
  | "daemonset"
  | "cronjob"
  | "job";

export type VersionRole = "stable" | "primary" | "canary" | "blue" | "green";

export interface DemoProject {
  id: number;
  name: string;
  description?: string;
}

export interface DemoCluster {
  id: number;
  uuid: string;
  clusterName: string;
  cpuCapacity: number;
  memCapacity: number;
}

export interface DemoWorkspace {
  id: number;
  projectId: number;
  clusterId: number;
  name: string;
  namespace: string;
}

export interface DemoApplication {
  id: number;
  workspaceId: number;
  nameCn: string;
  nameEn: string;
  resourceType: ResourceType;
  description: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DemoAppSummary {
  podCount: number;
  abnormalPodCount: number;
  serviceCount: number;
  ingressCount: number;
  replicaDesired: number;
  replicaReady: number;
  service?: {
    internalAccessList: string[];
    nodePortList: string[];
    externalAccessList: string[];
  };
  ingressDomains?: string[];
}

export interface DemoVersionRecord {
  id: number;
  applicationId: number;
  version: string;
  resourceName: string;
  versionRole: VersionRole;
  status: 0 | 1;
  label?: Record<string, string>;
  image?: string;
  replicas?: number;
}

export interface DemoServiceRecord {
  name: string;
  version: number;
  versionName: string;
  type: string;
  clusterIP: string;
  externalIP: string;
  ports: string;
  age: string;
}

export interface DemoIngressRecord {
  name: string;
  ingressClass: string;
  hosts: string[];
  address: string;
  ports: string;
  age: string;
}

export interface DemoCanaryRecord {
  name: string;
  targetRef: { kind: string; name: string };
  status: string;
  phase: string;
  canaryWeight: number;
  failedChecks: number;
  age: string;
}

export interface DemoAuditRecord {
  id: number;
  applicationId: number;
  title: string;
  operatorName: string;
  applicationName: string;
  workspaceName: string;
  clusterName: string;
  actionDetail: string;
  status: 0 | 1;
  createdAt: number;
}

export interface DemoPodRecord {
  name: string;
  status: string;
  cluster?: string;
  node: string;
  restarts: number;
  age: string;
  cpu: string;
  memory: string;
}

export const MOCK_PROJECTS: DemoProject[] = [
  { id: 1, name: "ai-platform", description: "AI 平台项目" },
  { id: 2, name: "ecommerce", description: "电商业务项目" }
];

export const MOCK_CLUSTERS: DemoCluster[] = [
  { id: 1, uuid: "cluster-beijing-uuid", clusterName: "cluster-beijing", cpuCapacity: 64, memCapacity: 256 },
  { id: 2, uuid: "cluster-shanghai-uuid", clusterName: "cluster-shanghai", cpuCapacity: 48, memCapacity: 192 },
  { id: 3, uuid: "cluster-guangzhou-uuid", clusterName: "cluster-guangzhou", cpuCapacity: 32, memCapacity: 128 }
];

export const MOCK_WORKSPACES: DemoWorkspace[] = [
  { id: 1, projectId: 1, clusterId: 1, name: "test", namespace: "test" },
  { id: 2, projectId: 1, clusterId: 1, name: "prod", namespace: "prod" },
  { id: 3, projectId: 2, clusterId: 2, name: "demo", namespace: "demo" }
];

export const MOCK_APPLICATIONS: DemoApplication[] = [
  {
    id: 1,
    workspaceId: 1,
    nameCn: "人脸识别服务",
    nameEn: "face-recognition",
    resourceType: "deployment",
    description: "在线 AI 人脸识别推理 Deployment（演示数据）",
    createdBy: "super_admin",
    updatedBy: "ai-team",
    createdAt: "2026-05-18 10:20:00",
    updatedAt: "2026-05-20 09:12:03"
  },
  {
    id: 2,
    workspaceId: 1,
    nameCn: "数据库服务",
    nameEn: "test",
    resourceType: "deployment",
    description: "从集群同步的 deployment 资源（演示）",
    createdBy: "super_admin",
    updatedBy: "super_admin",
    createdAt: "2026-05-15 08:00:00",
    updatedAt: "2026-05-19 14:30:00"
  },
  {
    id: 3,
    workspaceId: 1,
    nameCn: "商城服务",
    nameEn: "app",
    description: "示例应用",
    createdBy: "dev-user",
    updatedBy: "dev-user",
    createdAt: "2026-05-10 12:00:00",
    updatedAt: "2026-05-10 12:00:00"
  },
  {
    id: 4,
    workspaceId: 2,
    nameCn: "订单服务",
    nameEn: "order-api",
    resourceType: "deployment",
    description: "生产环境订单 API",
    createdBy: "super_admin",
    updatedBy: "ops-team",
    createdAt: "2026-05-01 09:00:00",
    updatedAt: "2026-05-18 16:00:00"
  },
  {
    id: 5,
    workspaceId: 3,
    nameCn: "批处理任务",
    nameEn: "batch-job",
    resourceType: "deployment",
    description: "在线服务示例（Deployment）",
    createdBy: "batch-admin",
    updatedBy: "batch-admin",
    createdAt: "2026-05-12 11:00:00",
    updatedAt: "2026-05-12 11:30:00"
  }
];

export const MOCK_SUMMARY_BY_APP: Record<number, DemoAppSummary> = {
  1: {
    podCount: 3,
    abnormalPodCount: 0,
    serviceCount: 1,
    ingressCount: 1,
    replicaDesired: 3,
    replicaReady: 3,
    service: {
      internalAccessList: ["http://face-recognition-svc.test.svc.cluster.local:80"],
      nodePortList: [],
      externalAccessList: []
    },
    ingressDomains: ["face.demo.kube-nova.local"]
  },
  2: {
    podCount: 2,
    abnormalPodCount: 1,
    serviceCount: 1,
    ingressCount: 0,
    replicaDesired: 2,
    replicaReady: 1,
    service: {
      internalAccessList: ["http://test-svc.test.svc.cluster.local:8080"],
      nodePortList: ["192.168.1.10:30080"],
      externalAccessList: []
    },
    ingressDomains: []
  },
  3: {
    podCount: 1,
    abnormalPodCount: 0,
    serviceCount: 1,
    ingressCount: 0,
    replicaDesired: 1,
    replicaReady: 1,
    service: { internalAccessList: ["http://app-svc.test.svc.cluster.local:80"], nodePortList: [], externalAccessList: [] },
    ingressDomains: []
  },
  4: {
    podCount: 4,
    abnormalPodCount: 0,
    serviceCount: 2,
    ingressCount: 1,
    replicaDesired: 4,
    replicaReady: 4,
    service: {
      internalAccessList: ["http://order-api-svc.prod.svc.cluster.local:80"],
      nodePortList: [],
      externalAccessList: ["49.232.10.88"]
    },
    ingressDomains: ["order.example.com"]
  },
  5: {
    podCount: 1,
    abnormalPodCount: 0,
    serviceCount: 0,
    ingressCount: 0,
    replicaDesired: 1,
    replicaReady: 1,
    service: { internalAccessList: [], nodePortList: [], externalAccessList: [] },
    ingressDomains: []
  }
};

export const MOCK_VERSIONS_BY_APP: Record<number, DemoVersionRecord[]> = {
  1: [
    {
      id: 101,
      applicationId: 1,
      version: "v3",
      resourceName: "face-recognition-v3",
      versionRole: "stable",
      status: 1,
      label: { app: "face-recognition", version: "v3" },
      image: "registry.example.com/ai/face-recognition:v3",
      replicas: 3
    },
    {
      id: 102,
      applicationId: 1,
      version: "v2",
      resourceName: "face-recognition-v2",
      versionRole: "canary",
      status: 1,
      label: { app: "face-recognition", version: "v2" },
      image: "registry.example.com/ai/face-recognition:v2",
      replicas: 0
    }
  ],
  2: [
    {
      id: 201,
      applicationId: 2,
      version: "v1",
      resourceName: "test-v1",
      versionRole: "stable",
      status: 1,
      label: { app: "test" },
      image: "nginx:1.25",
      replicas: 2
    }
  ],
  3: [
    {
      id: 301,
      applicationId: 3,
      version: "v1",
      resourceName: "app-v1",
      versionRole: "stable",
      status: 1,
      image: "nginx:latest",
      replicas: 1
    }
  ],
  4: [
    {
      id: 401,
      applicationId: 4,
      version: "v2",
      resourceName: "order-api-v2",
      versionRole: "stable",
      status: 1,
      image: "registry.example.com/order/api:v2",
      replicas: 4
    }
  ],
  5: [
    {
      id: 501,
      applicationId: 5,
      version: "v1",
      resourceName: "batch-job-v1",
      versionRole: "stable",
      status: 1,
      image: "registry.example.com/batch/runner:v1",
      replicas: 1
    }
  ]
};

export const MOCK_SERVICES_BY_APP: Record<number, DemoServiceRecord[]> = {
  1: [
    {
      name: "face-recognition-svc",
      version: 101,
      versionName: "v3",
      type: "ClusterIP",
      clusterIP: "10.96.12.88",
      externalIP: "-",
      ports: "80/TCP → 8080",
      age: "2d5h"
    }
  ],
  2: [
    {
      name: "test-svc",
      version: 0,
      versionName: "全部版本",
      type: "NodePort",
      clusterIP: "10.96.21.44",
      externalIP: "-",
      ports: "8080/TCP → 8080, 30080",
      age: "5d12h"
    }
  ],
  3: [
    {
      name: "app-svc",
      version: 301,
      versionName: "v1",
      type: "ClusterIP",
      clusterIP: "10.96.33.11",
      externalIP: "-",
      ports: "80/TCP → 80",
      age: "10d"
    }
  ],
  4: [
    {
      name: "order-api-svc",
      version: 401,
      versionName: "v2",
      type: "LoadBalancer",
      clusterIP: "10.96.44.55",
      externalIP: "49.232.10.88",
      ports: "80/TCP → 8080",
      age: "18d"
    },
    {
      name: "order-api-internal",
      version: 0,
      versionName: "全部版本",
      type: "ClusterIP",
      clusterIP: "10.96.44.56",
      externalIP: "-",
      ports: "9090/TCP → 9090",
      age: "18d"
    }
  ],
  5: []
};

export const MOCK_INGRESSES_BY_APP: Record<number, DemoIngressRecord[]> = {
  1: [
    {
      name: "face-recognition-ing",
      ingressClass: "nginx",
      hosts: ["face.demo.kube-nova.local"],
      address: "192.168.1.100",
      ports: "80, 443",
      age: "2d5h"
    }
  ],
  2: [],
  3: [],
  4: [
    {
      name: "order-api-ing",
      ingressClass: "nginx",
      hosts: ["order.example.com", "api.order.example.com"],
      address: "49.232.10.88",
      ports: "80, 443",
      age: "18d"
    }
  ],
  5: []
};

export const MOCK_CANARIES_BY_APP: Record<number, DemoCanaryRecord[]> = {
  1: [
    {
      name: "face-recognition-canary",
      targetRef: { kind: "Deployment", name: "face-recognition-v3" },
      status: "Progressing",
      phase: "Progressing",
      canaryWeight: 20,
      failedChecks: 0,
      age: "1d3h"
    }
  ],
  2: [],
  3: [],
  4: [],
  5: []
};

export const MOCK_AUDITS_BY_APP: Record<number, DemoAuditRecord[]> = {
  1: [
    {
      id: 1001,
      applicationId: 1,
      title: "更新副本数",
      operatorName: "super_admin",
      applicationName: "人脸识别服务",
      workspaceName: "test",
      clusterName: "cluster-beijing",
      actionDetail: '{"replicas": {"from": 2, "to": 3}}',
      status: 1,
      createdAt: 1747710723
    },
    {
      id: 1002,
      applicationId: 1,
      title: "滚动发布",
      operatorName: "ai-team",
      applicationName: "人脸识别服务",
      workspaceName: "test",
      clusterName: "cluster-beijing",
      actionDetail: '{"image": {"from": "v2", "to": "v3"}}',
      status: 1,
      createdAt: 1747634411
    },
    {
      id: 1003,
      applicationId: 1,
      title: "创建服务",
      operatorName: "super_admin",
      applicationName: "人脸识别服务",
      workspaceName: "test",
      clusterName: "cluster-beijing",
      actionDetail: '{"resourceType": "deployment", "name": "face-recognition"}',
      status: 1,
      createdAt: 1747540800
    }
  ],
  2: [],
  3: [],
  4: [],
  5: []
};

export const MOCK_PODS_BY_VERSION: Record<number, DemoPodRecord[]> = {
  101: [
    { name: "face-recognition-v3-7d8f9-abc12", status: "Running", node: "node-beijing-01", restarts: 0, age: "2d5h", cpu: "120m", memory: "256Mi" },
    { name: "face-recognition-v3-7d8f9-def34", status: "Running", node: "node-beijing-02", restarts: 0, age: "2d5h", cpu: "115m", memory: "248Mi" },
    { name: "face-recognition-v3-7d8f9-ghi56", status: "Running", node: "node-beijing-03", restarts: 0, age: "2d5h", cpu: "118m", memory: "252Mi" }
  ],
  102: [],
  201: [
    { name: "test-v1-6c7d8-jkl78", status: "Running", node: "node-beijing-01", restarts: 0, age: "5d12h", cpu: "10m", memory: "64Mi" },
    { name: "test-v1-6c7d8-mno90", status: "CrashLoopBackOff", node: "node-beijing-02", restarts: 12, age: "5d12h", cpu: "0m", memory: "0Mi" }
  ],
  301: [
    { name: "app-v1-5b6c7-pqr12", status: "Running", node: "node-beijing-01", restarts: 0, age: "10d", cpu: "5m", memory: "32Mi" }
  ],
  401: [
    { name: "order-api-v2-abc-001", status: "Running", node: "node-prod-01", restarts: 0, age: "18d", cpu: "200m", memory: "512Mi" },
    { name: "order-api-v2-abc-002", status: "Running", node: "node-prod-02", restarts: 0, age: "18d", cpu: "195m", memory: "508Mi" },
    { name: "order-api-v2-abc-003", status: "Running", node: "node-prod-03", restarts: 0, age: "18d", cpu: "210m", memory: "520Mi" },
    { name: "order-api-v2-abc-004", status: "Running", node: "node-prod-04", restarts: 0, age: "18d", cpu: "198m", memory: "505Mi" }
  ],
  501: [
    { name: "batch-job-v1-complete", status: "Succeeded", node: "node-demo-01", restarts: 0, age: "8d", cpu: "0m", memory: "0Mi" }
  ]
};
