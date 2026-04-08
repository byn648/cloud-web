const APP_BASE_PATH = "/manager/v1/app";

type ApiEnvelope<T> = {
  code?: number;
  message?: string;
  data?: T;
};

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

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function unwrapPayload<T>(payload: unknown): T {
  if (payload && typeof payload === "object") {
    const wrapped = payload as ApiEnvelope<T>;
    if (wrapped.code !== undefined && wrapped.code !== 0 && wrapped.code !== 200) {
      throw new Error(wrapped.message || `Request failed with code ${wrapped.code}`);
    }
    if (wrapped.data !== undefined) {
      return wrapped.data;
    }
  }
  return payload as T;
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  let payload: unknown = text;
  try {
    payload = JSON.parse(text);
  } catch {
    return text as T;
  }

  return unwrapPayload<T>(payload);
}

export async function addClusterAppApi(data: AddClusterAppRequest): Promise<string> {
  return requestJson<string>(APP_BASE_PATH, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
}

export async function getClusterAppDetailApi(id: number): Promise<ClusterAppDetail> {
  return requestJson<ClusterAppDetail>(`${APP_BASE_PATH}/${id}`, {
    method: "GET",
    headers: getAuthHeaders()
  });
}

export async function validateClusterAppApi(id: number): Promise<string> {
  return requestJson<string>(`${APP_BASE_PATH}/${id}/validate`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({})
  });
}

export async function getClusterAppListApi(clusterUuid: string): Promise<ClusterAppDetail[]> {
  const query = new URLSearchParams({ clusterUuid }).toString();
  return requestJson<ClusterAppDetail[]>(`${APP_BASE_PATH}/list?${query}`, {
    method: "GET",
    headers: getAuthHeaders()
  });
}
