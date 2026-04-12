export const environmentOptions = [
  { value: "", label: "全部环境", shortLabel: "ALL", className: "" },
  { value: "production", label: "生产环境", shortLabel: "PROD", className: "production" },
  { value: "staging", label: "预发环境", shortLabel: "STG", className: "staging" },
  { value: "testing", label: "测试环境", shortLabel: "TEST", className: "testing" },
  { value: "development", label: "开发环境", shortLabel: "DEV", className: "development" }
] as const;

export const clusterTypeOptions = [
  { value: "", label: "全部类型" },
  { value: "standard", label: "标准集群" },
  { value: "edge", label: "边缘集群" },
  { value: "serverless", label: "Serverless" }
] as const;

export const providerOptions = [
  { value: "aws", label: "AWS" },
  { value: "azure", label: "Azure" },
  { value: "gcp", label: "Google Cloud" },
  { value: "alibaba", label: "阿里云" },
  { value: "tencent", label: "腾讯云" },
  { value: "huawei", label: "华为云" },
  { value: "self-hosted", label: "自建集群" }
] as const;

export const authTypeOptions = [
  { value: "kubeconfig", label: "KubeConfig", description: "使用 kubeconfig 内容连接集群" },
  { value: "token", label: "Token", description: "通过 API Server + Bearer Token 认证" },
  { value: "certificate", label: "证书", description: "通过 CA/客户端证书和密钥认证" },
  { value: "incluster", label: "集群内部", description: "使用集群内部 ServiceAccount 认证" }
] as const;

export const healthStatusConfig: Record<number, { label: string; className: string }> = {
  1: { label: "健康", className: "ok" },
  2: { label: "异常", className: "danger" },
  3: { label: "降级", className: "warn" },
  4: { label: "未知", className: "warn" }
};

export const syncStatusConfig: Record<number, { label: string; className: string }> = {
  1: { label: "同步中", className: "warn" },
  2: { label: "同步失败", className: "danger" },
  3: { label: "同步成功", className: "ok" }
};
