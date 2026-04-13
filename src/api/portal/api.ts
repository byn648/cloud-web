import { buildQuery, parseNumber, parseString, requestJson, resolvePlatformId } from "../shared";

const API_BASE_PATH = "/portal/v1/api";

export interface ApiSysAPI {
  id: number;
  parentId: number;
  name: string;
  path: string;
  method: string;
  isPermission: number;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface ApiAddRequest {
  platformId?: number;
  parentId?: number;
  name: string;
  path?: string;
  method?: string;
  isPermission: number;
}

export interface ApiUpdateRequest {
  id: number;
  platformId?: number;
  parentId?: number;
  name: string;
  path?: string;
  method?: string;
  isPermission: number;
}

export interface ApiSearchRequest {
  platformId?: number;
  page?: number;
  pageSize?: number;
  orderStr?: string;
  isAsc?: boolean;
  parentId?: number;
  name?: string;
  path?: string;
  method?: string;
  isPermission?: number;
}

export interface ApiSearchResponse {
  items: ApiSysAPI[];
  total: number;
}

export interface ApiGroupTreeNode {
  id: number;
  name: string;
  pid: number;
  children: ApiGroupTreeNode[];
}

export interface ApiGroupsTreeRequest {
  platformId?: number;
  isPermission?: number;
}

export interface ApiSysAPITreeNode {
  id: number;
  name: string;
  path: string;
  method: string;
  isPermission: number;
  children: ApiSysAPITreeNode[];
}

function normalizeApi(payload: unknown): ApiSysAPI {
  const item = (payload ?? {}) as Record<string, unknown>;
  return {
    id: parseNumber(item.id),
    parentId: parseNumber(item.parentId),
    name: parseString(item.name),
    path: parseString(item.path),
    method: parseString(item.method),
    isPermission: parseNumber(item.isPermission),
    createdBy: parseString(item.createdBy),
    updatedBy: parseString(item.updatedBy),
    createdAt: parseNumber(item.createdAt),
    updatedAt: parseNumber(item.updatedAt)
  };
}

function normalizeApiGroupTree(payload: unknown): ApiGroupTreeNode {
  const item = (payload ?? {}) as Record<string, unknown>;
  const childrenRaw = item.children;
  return {
    id: parseNumber(item.id),
    name: parseString(item.name),
    pid: parseNumber(item.pid ?? item.parentId),
    children: Array.isArray(childrenRaw) ? childrenRaw.map((child) => normalizeApiGroupTree(child)) : []
  };
}

function normalizeApiTree(payload: unknown): ApiSysAPITreeNode {
  const item = (payload ?? {}) as Record<string, unknown>;
  const childrenRaw = item.children;
  return {
    id: parseNumber(item.id),
    name: parseString(item.name),
    path: parseString(item.path),
    method: parseString(item.method),
    isPermission: parseNumber(item.isPermission),
    children: Array.isArray(childrenRaw) ? childrenRaw.map((child) => normalizeApiTree(child)) : []
  };
}

export async function addApiApi(data: ApiAddRequest): Promise<string> {
  const platformId = resolvePlatformId(data.platformId);
  return requestJson<string>(API_BASE_PATH, {
    method: "POST",
    body: JSON.stringify({
      ...data,
      platformId
    })
  });
}

export async function updateApiApi(data: ApiUpdateRequest): Promise<string> {
  const { id, ...params } = data;
  const platformId = resolvePlatformId(data.platformId);
  return requestJson<string>(`${API_BASE_PATH}/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      ...params,
      platformId
    })
  });
}

export async function deleteApiApi(id: number): Promise<string> {
  const query = buildQuery({
    platformId: resolvePlatformId()
  });
  return requestJson<string>(`${API_BASE_PATH}/${id}${query}`, { method: "DELETE" });
}

export async function getApiByIdApi(id: number): Promise<ApiSysAPI> {
  const query = buildQuery({
    platformId: resolvePlatformId()
  });
  const response = await requestJson<unknown>(`${API_BASE_PATH}/${id}${query}`, { method: "GET" });
  return normalizeApi(response);
}

export async function searchApiApi(params: ApiSearchRequest = {}): Promise<ApiSearchResponse> {
  const query = buildQuery({
    platformId: resolvePlatformId(params.platformId),
    page: params.page,
    pageSize: params.pageSize,
    orderStr: params.orderStr?.trim() || undefined,
    isAsc: params.isAsc,
    parentId: params.parentId,
    name: params.name?.trim() || undefined,
    path: params.path?.trim() || undefined,
    method: params.method?.trim() || undefined,
    isPermission: params.isPermission
  });

  const response = await requestJson<{ items?: unknown[]; total?: unknown }>(`${API_BASE_PATH}${query}`, {
    method: "GET"
  });

  return {
    items: Array.isArray(response.items) ? response.items.map((item) => normalizeApi(item)) : [],
    total: parseNumber(response.total)
  };
}

export async function getApiGroupsTreeApi(params: ApiGroupsTreeRequest = {}): Promise<ApiGroupTreeNode[]> {
  const query = buildQuery({
    platformId: resolvePlatformId(params.platformId),
    isPermission: params.isPermission
  });
  const response = await requestJson<unknown>(`${API_BASE_PATH}/groups/tree${query}`, { method: "GET" });
  return Array.isArray(response) ? response.map((item) => normalizeApiGroupTree(item)) : [];
}

export async function getApiTreeApi(): Promise<ApiSysAPITreeNode[]> {
  const query = buildQuery({
    platformId: resolvePlatformId()
  });
  const response = await requestJson<unknown>(`${API_BASE_PATH}/tree${query}`, { method: "GET" });
  return Array.isArray(response) ? response.map((item) => normalizeApiTree(item)) : [];
}
