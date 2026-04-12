import { encodePasswordLikeKubeNova } from "../../utils/encoding";
import { buildQuery, parseNumber, parseString, requestJson } from "../shared";

const USER_BASE_PATH = "/portal/v1/user";

export interface UserSysUser {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  email: string;
  phone: string;
  workNumber: string;
  deptId: number;
  status: number;
  isNeedResetPwd: number;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
  dingtalkId: string;
  wechatId: string;
  feishuId: string;
}

export interface UserSysUserInfo extends UserSysUser {
  deptNames: string;
  roleNames: string;
}

export interface UserAddRequest {
  username: string;
  nickname: string;
  email: string;
  phone: string;
  workNumber: string;
  deptId?: number;
}

export interface UserUpdateRequest {
  id: number;
  nickname: string;
  email: string;
  phone: string;
  workNumber: string;
  deptId: number;
  status?: number;
  isNeedResetPwd?: number;
}

export interface UserUpdateInfoRequest {
  nickname: string;
  email: string;
  phone: string;
}

export interface UserSearchRequest {
  page?: number;
  pageSize?: number;
  orderStr?: string;
  isAsc?: boolean;
  username?: string;
  nickname?: string;
  phone?: string;
  email?: string;
  workNumber?: string;
  status?: number;
  createBy?: string;
  updateBy?: string;
  loginIp?: string;
}

export interface UserSearchResponse {
  items: UserSysUser[];
  total: number;
}

export interface UserUpdateAvatarRequest {
  avatar: string;
}

export interface UserUpdatePasswordRequest {
  username: string;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserUpdateStatusRequest {
  id: number;
  status: 0 | 1;
}

export interface UserBindRoleRequest {
  id: number;
  roleIds: number[];
}

export interface UserRolesResponse {
  roleIds: number[];
  roleNames: string[];
}

function normalizeUser(payload: unknown): UserSysUser {
  const item = (payload ?? {}) as Record<string, unknown>;

  return {
    id: parseNumber(item.id),
    username: parseString(item.username),
    nickname: parseString(item.nickname),
    avatar: parseString(item.avatar),
    email: parseString(item.email),
    phone: parseString(item.phone),
    workNumber: parseString(item.workNumber),
    deptId: parseNumber(item.deptId),
    status: parseNumber(item.status),
    isNeedResetPwd: parseNumber(item.isNeedResetPwd),
    createdBy: parseString(item.createdBy),
    updatedBy: parseString(item.updatedBy),
    createdAt: parseNumber(item.createdAt),
    updatedAt: parseNumber(item.updatedAt),
    dingtalkId: parseString(item.dingtalkId),
    wechatId: parseString(item.wechatId),
    feishuId: parseString(item.feishuId)
  };
}

function normalizeUserInfo(payload: unknown): UserSysUserInfo {
  const base = normalizeUser(payload);
  const item = (payload ?? {}) as Record<string, unknown>;

  return {
    ...base,
    deptNames: parseString(item.deptNames),
    roleNames: parseString(item.roleNames)
  };
}

export async function addUserApi(data: UserAddRequest): Promise<string> {
  return requestJson<string>(USER_BASE_PATH, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updateUserApi(data: UserUpdateRequest): Promise<string> {
  const { id, ...params } = data;
  return requestJson<string>(`${USER_BASE_PATH}/${id}`, {
    method: "PUT",
    body: JSON.stringify(params)
  });
}

export async function deleteUserApi(id: number): Promise<string> {
  return requestJson<string>(`${USER_BASE_PATH}/${id}`, { method: "DELETE" });
}

export async function getUserByIdApi(id: number): Promise<UserSysUser> {
  const response = await requestJson<unknown>(`${USER_BASE_PATH}/${id}`, { method: "GET" });
  return normalizeUser(response);
}

export async function searchUserApi(params: UserSearchRequest = {}): Promise<UserSearchResponse> {
  const query = buildQuery({
    page: params.page,
    pageSize: params.pageSize,
    orderStr: params.orderStr?.trim() || undefined,
    isAsc: params.isAsc,
    username: params.username?.trim() || undefined,
    nickname: params.nickname?.trim() || undefined,
    phone: params.phone?.trim() || undefined,
    email: params.email?.trim() || undefined,
    workNumber: params.workNumber?.trim() || undefined,
    status: params.status,
    createBy: params.createBy?.trim() || undefined,
    updateBy: params.updateBy?.trim() || undefined,
    loginIp: params.loginIp?.trim() || undefined
  });

  const response = await requestJson<{
    items?: unknown[];
    total?: unknown;
  }>(`${USER_BASE_PATH}${query}`, { method: "GET" });

  return {
    items: Array.isArray(response?.items) ? response.items.map((item) => normalizeUser(item)) : [],
    total: parseNumber(response?.total)
  };
}

export async function getUserInfoApi(): Promise<UserSysUserInfo> {
  const response = await requestJson<unknown>(`${USER_BASE_PATH}/info`, { method: "GET" });
  return normalizeUserInfo(response);
}

export async function updateUserInfoApi(data: UserUpdateInfoRequest): Promise<string> {
  return requestJson<string>(`${USER_BASE_PATH}/info`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export async function updateUserAvatarApi(data: UserUpdateAvatarRequest): Promise<string> {
  return requestJson<string>(`${USER_BASE_PATH}/avatar`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export async function updateUserPasswordApi(data: UserUpdatePasswordRequest): Promise<string> {
  return requestJson<string>(`${USER_BASE_PATH}/password`, {
    method: "PUT",
    body: JSON.stringify({
      username: data.username,
      oldPassword: encodePasswordLikeKubeNova(data.oldPassword),
      newPassword: encodePasswordLikeKubeNova(data.newPassword),
      confirmPassword: encodePasswordLikeKubeNova(data.confirmPassword)
    })
  });
}

export async function updateUserStatusApi(data: UserUpdateStatusRequest): Promise<string> {
  return requestJson<string>(`${USER_BASE_PATH}/status`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export async function updateUserBindRoleApi(data: UserBindRoleRequest): Promise<string> {
  return requestJson<string>(`${USER_BASE_PATH}/${data.id}/roles`, {
    method: "PUT",
    body: JSON.stringify({ roleIds: data.roleIds })
  });
}

export async function getUserRolesApi(id: number): Promise<UserRolesResponse> {
  const response = await requestJson<{
    roleIds?: unknown[];
    roleNames?: unknown[];
  }>(`${USER_BASE_PATH}/${id}/roles`, { method: "GET" });

  return {
    roleIds: Array.isArray(response.roleIds) ? response.roleIds.map((item) => parseNumber(item)) : [],
    roleNames: Array.isArray(response.roleNames) ? response.roleNames.map((item) => parseString(item)) : []
  };
}

export async function resetUserPasswordApi(id: number): Promise<string> {
  return requestJson<string>(`${USER_BASE_PATH}/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

// Backward-compatible aliases used by existing cloud-web pages.
export type PortalUser = UserSysUser;
export type SearchPortalUserRequest = UserSearchRequest;
export type SearchPortalUserResponse = UserSearchResponse;

export async function searchPortalUserApi(params: SearchPortalUserRequest): Promise<SearchPortalUserResponse> {
  return searchUserApi(params);
}

export async function updatePortalUserStatusApi(id: number, status: 0 | 1): Promise<string> {
  return updateUserStatusApi({ id, status });
}
