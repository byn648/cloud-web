import { buildQuery, parseNumber, parseString, requestJson, resolvePlatformId } from "../shared";

const ROLE_BASE_PATH = "/portal/v1/role";

export interface RoleSysRole {
  id: number;
  name: string;
  code: string;
  remark: string;
  status: number;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface RoleAddRequest {
  platformId?: number;
  name: string;
  code: string;
  remark?: string;
}

export interface RoleUpdateRequest {
  id: number;
  platformId?: number;
  name: string;
  code?: string;
  remark?: string;
}

export interface RoleSearchRequest {
  platformId?: number;
  page?: number;
  pageSize?: number;
  orderStr?: string;
  isAsc?: boolean;
  name?: string;
  code?: string;
}

export interface RoleSearchResponse {
  items: RoleSysRole[];
  total: number;
}

export interface RoleBindMenuRequest {
  platformId?: number;
  roleId: number;
  menuIds: number[];
}

export interface RoleBindApiRequest {
  platformId?: number;
  roleId: number;
  apiIds: number[];
}

function normalizeRole(payload: unknown): RoleSysRole {
  const item = (payload ?? {}) as Record<string, unknown>;

  return {
    id: parseNumber(item.id),
    name: parseString(item.name),
    code: parseString(item.code),
    remark: parseString(item.remark),
    status: parseNumber(item.status, 1),
    createdBy: parseString(item.createdBy),
    updatedBy: parseString(item.updatedBy),
    createdAt: parseNumber(item.createdAt),
    updatedAt: parseNumber(item.updatedAt)
  };
}

function normalizeNumberList(payload: unknown, fieldName: string): number[] {
  if (Array.isArray(payload)) {
    return payload.map((item) => parseNumber(item)).filter((item) => item > 0);
  }

  if (payload && typeof payload === "object") {
    const item = payload as Record<string, unknown>;
    const list = item[fieldName];
    if (Array.isArray(list)) {
      return list.map((entry) => parseNumber(entry)).filter((entry) => entry > 0);
    }
  }

  return [];
}

export async function addRoleApi(data: RoleAddRequest): Promise<string> {
  const platformId = resolvePlatformId(data.platformId);
  return requestJson<string>(ROLE_BASE_PATH, {
    method: "POST",
    body: JSON.stringify({
      ...data,
      platformId
    })
  });
}

export async function updateRoleApi(data: RoleUpdateRequest): Promise<string> {
  const { id, ...params } = data;
  const platformId = resolvePlatformId(data.platformId);
  return requestJson<string>(`${ROLE_BASE_PATH}/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      ...params,
      platformId
    })
  });
}

export async function deleteRoleApi(id: number): Promise<string> {
  const query = buildQuery({
    platformId: resolvePlatformId()
  });
  return requestJson<string>(`${ROLE_BASE_PATH}/${id}${query}`, {
    method: "DELETE"
  });
}

export async function getRoleByIdApi(id: number): Promise<RoleSysRole> {
  const query = buildQuery({
    platformId: resolvePlatformId()
  });
  const response = await requestJson<unknown>(`${ROLE_BASE_PATH}/${id}${query}`, {
    method: "GET"
  });
  return normalizeRole(response);
}

export async function searchRoleApi(params: RoleSearchRequest = {}): Promise<RoleSearchResponse> {
  const query = buildQuery({
    platformId: resolvePlatformId(params.platformId),
    page: params.page,
    pageSize: params.pageSize,
    orderStr: params.orderStr?.trim() || undefined,
    isAsc: params.isAsc,
    name: params.name?.trim() || undefined,
    code: params.code?.trim() || undefined
  });

  const response = await requestJson<{ items?: unknown[]; total?: unknown }>(`${ROLE_BASE_PATH}${query}`, {
    method: "GET"
  });

  return {
    items: Array.isArray(response.items) ? response.items.map((item) => normalizeRole(item)) : [],
    total: parseNumber(response.total)
  };
}

export async function bindRoleMenuApi(data: RoleBindMenuRequest): Promise<string> {
  const platformId = resolvePlatformId(data.platformId);
  const menuIds = data.menuIds.filter((id) => Number.isFinite(id) && id > 0);
  return requestJson<string>(`${ROLE_BASE_PATH}/${data.roleId}/menus`, {
    method: "POST",
    body: JSON.stringify({ menuIds, platformId })
  });
}

export async function getRoleMenuApi(roleId: number): Promise<number[]> {
  const query = buildQuery({
    platformId: resolvePlatformId()
  });
  const response = await requestJson<unknown>(`${ROLE_BASE_PATH}/${roleId}/menus${query}`, {
    method: "GET"
  });
  return normalizeNumberList(response, "menuIds");
}

export async function bindRoleApiApi(data: RoleBindApiRequest): Promise<string> {
  const platformId = resolvePlatformId(data.platformId);
  const apiIds = data.apiIds.filter((id) => Number.isFinite(id) && id > 0);
  return requestJson<string>(`${ROLE_BASE_PATH}/${data.roleId}/apis`, {
    method: "POST",
    body: JSON.stringify({ apiIds, platformId })
  });
}

export async function getRoleApiApi(roleId: number): Promise<number[]> {
  const query = buildQuery({
    platformId: resolvePlatformId()
  });
  const response = await requestJson<unknown>(`${ROLE_BASE_PATH}/${roleId}/apis${query}`, {
    method: "GET"
  });
  return normalizeNumberList(response, "apiIds");
}
