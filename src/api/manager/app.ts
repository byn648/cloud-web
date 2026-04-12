import { buildQuery, requestJson } from "../shared";

const APP_BASE_PATH = "/manager/v1/app";

export enum AppType {
  MONITORING = 1,
  LOGGING = 2,
  TRACING = 3,
  MESH = 4,
  ALERT = 5
}

export type ProtocolType = "http" | "https" | "grpc";
export type AuthType = "none" | "basic" | "token" | "apikey" | "certificate" | "bearer" | "apiKey";

export interface ClusterAppDetail {
  id: number;
  clusterUuid: string;
  appName: string;
  appCode: string;
  appType: number;
  isDefault: number;
  appUrl: string;
  port: number;
  protocol: string;
  authEnabled: number;
  authType: string;
  username: string;
  password: string;
  token: string;
  accessKey: string;
  accessSecret: string;
  tlsEnabled: number;
  caFile: string;
  caKey: string;
  caCert: string;
  clientCert: string;
  clientKey: string;
  insecureSkipVerify: number;
  status: number;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface AddClusterAppRequest {
  clusterUuid: string;
  appName: string;
  appCode: string;
  appType: number;
  isDefault?: number;
  appUrl: string;
  port?: number;
  protocol?: ProtocolType;
  authEnabled?: number;
  authType?: AuthType;
  username?: string;
  password?: string;
  token?: string;
  accessKey?: string;
  accessSecret?: string;
  tlsEnabled?: number;
  caFile?: string;
  caKey?: string;
  caCert?: string;
  clientCert?: string;
  clientKey?: string;
  insecureSkipVerify?: number;
  updatedBy?: string;
}

export async function addClusterAppApi(data: AddClusterAppRequest): Promise<string> {
  return requestJson<string>(APP_BASE_PATH, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function getClusterAppDetailApi(id: number): Promise<ClusterAppDetail> {
  return requestJson<ClusterAppDetail>(`${APP_BASE_PATH}/${id}`, {
    method: "GET"
  });
}

export async function validateClusterAppApi(id: number): Promise<string> {
  return requestJson<string>(`${APP_BASE_PATH}/${id}/validate`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function getClusterAppListApi(clusterUuid: string): Promise<ClusterAppDetail[]> {
  const query = buildQuery({ clusterUuid });
  return requestJson<ClusterAppDetail[]>(`${APP_BASE_PATH}/list${query}`, {
    method: "GET"
  });
}
