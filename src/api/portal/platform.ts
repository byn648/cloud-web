import { buildQuery, parseNumber, parseString, requestJson } from "../shared";

const PLATFORM_BASE_PATH = "/portal/v1/platform";

export interface PlatformSysPlatform {
  id: number;
  platformCode: string;
  platformName: string;
  platformDesc: string;
  platformIcon: string;
  sort: number;
  isEnable: number;
  isDefault: number;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface PlatformSearchRequest {
  page?: number;
  pageSize?: number;
  orderStr?: string;
  isAsc?: boolean;
  platformCode?: string;
  platformName?: string;
  isEnable?: number;
  isDefault?: number;
}

export interface PlatformSearchResponse {
  items: PlatformSysPlatform[];
  total: number;
}

export interface PlatformBindUserRequest {
  userId: number;
  platformIds: number[];
}

export interface PlatformGetUsersRequest {
  platformId: number;
  page?: number;
  pageSize?: number;
}

export interface PlatformGetUsersResponse {
  userIds: number[];
  total: number;
}

function normalizePlatform(payload: unknown): PlatformSysPlatform {
  const item = (payload ?? {}) as Record<string, unknown>;
  return {
    id: parseNumber(item.id),
    platformCode: parseString(item.platformCode),
    platformName: parseString(item.platformName),
    platformDesc: parseString(item.platformDesc),
    platformIcon: parseString(item.platformIcon),
    sort: parseNumber(item.sort),
    isEnable: parseNumber(item.isEnable, 1),
    isDefault: parseNumber(item.isDefault, 0),
    createdBy: parseString(item.createdBy),
    updatedBy: parseString(item.updatedBy),
    createdAt: parseNumber(item.createdAt),
    updatedAt: parseNumber(item.updatedAt)
  };
}

export async function searchPlatformApi(params: PlatformSearchRequest = {}): Promise<PlatformSearchResponse> {
  const query = buildQuery({
    page: params.page,
    pageSize: params.pageSize,
    orderStr: params.orderStr?.trim() || undefined,
    isAsc: params.isAsc,
    platformCode: params.platformCode?.trim() || undefined,
    platformName: params.platformName?.trim() || undefined,
    isEnable: params.isEnable,
    isDefault: params.isDefault
  });

  const response = await requestJson<{ items?: unknown[]; total?: unknown }>(`${PLATFORM_BASE_PATH}/list${query}`, {
    method: "GET"
  });

  return {
    items: Array.isArray(response.items) ? response.items.map((item) => normalizePlatform(item)) : [],
    total: parseNumber(response.total)
  };
}

export async function getUserPlatformsApi(): Promise<PlatformSysPlatform[]> {
  const response = await requestJson<unknown>(`${PLATFORM_BASE_PATH}/user/platforms`, {
    method: "GET"
  });

  return Array.isArray(response) ? response.map((item) => normalizePlatform(item)) : [];
}

export async function bindUserPlatformApi(data: PlatformBindUserRequest): Promise<string> {
  return requestJson<string>(`${PLATFORM_BASE_PATH}/user/bind`, {
    method: "POST",
    body: JSON.stringify({
      userId: data.userId,
      platformIds: data.platformIds
    })
  });
}

export async function unbindUserPlatformApi(data: PlatformBindUserRequest): Promise<string> {
  return requestJson<string>(`${PLATFORM_BASE_PATH}/user/unbind`, {
    method: "POST",
    body: JSON.stringify({
      userId: data.userId,
      platformIds: data.platformIds
    })
  });
}

export async function getPlatformUsersApi(params: PlatformGetUsersRequest): Promise<PlatformGetUsersResponse> {
  const query = buildQuery({
    platformId: params.platformId,
    page: params.page,
    pageSize: params.pageSize
  });
  const response = await requestJson<{
    userIds?: unknown[];
    total?: unknown;
  }>(`${PLATFORM_BASE_PATH}/users${query}`, {
    method: "GET"
  });
  return {
    userIds: Array.isArray(response.userIds)
      ? response.userIds.map((item) => parseNumber(item)).filter((item) => item > 0)
      : [],
    total: parseNumber(response.total)
  };
}
