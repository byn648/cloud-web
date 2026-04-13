import { buildQuery, parseNumber, parseString, requestJson, resolvePlatformId } from "../shared";

const MENU_BASE_PATH = "/portal/v1/menu";

export interface MenuSysMenu {
  id: number;
  parentId: number;
  menuType: number;
  name: string;
  path: string;
  component: string;
  redirect: string;
  label: string;
  title: string;
  icon: string;
  sort: number;
  link: string;
  isEnable: number;
  isMenu: number;
  keepAlive: number;
  isHide: number;
  isIframe: number;
  isHideTab: number;
  showBadge: number;
  showTextBadge: string;
  isFirstLevel: number;
  fixedTab: number;
  isFullPage: number;
  activePath: string;
  roles: string;
  authName: string;
  authLabel: string;
  authIcon: string;
  authSort: number;
  status: number;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface MenuSysMenuTree extends MenuSysMenu {
  children: MenuSysMenuTree[];
}

export interface MenuSysMenuSimpleTreeNode {
  id: number;
  title: string;
  children: MenuSysMenuSimpleTreeNode[];
}

export interface MenuAddRequest {
  platformId?: number;
  parentId?: number;
  menuType: number;
  name: string;
  path?: string;
  component?: string;
  redirect?: string;
  label?: string;
  title: string;
  icon?: string;
  sort?: number;
  link?: string;
  isEnable?: number;
  isMenu?: number;
  keepAlive?: number;
  isHide?: number;
  isIframe?: number;
  isHideTab?: number;
  showBadge?: number;
  showTextBadge?: string;
  isFirstLevel?: number;
  fixedTab?: number;
  isFullPage?: number;
  activePath?: string;
  roles?: string;
  authName?: string;
  authLabel?: string;
  authIcon?: string;
  authSort?: number;
  status?: number;
}

export interface MenuUpdateRequest extends Partial<MenuAddRequest> {
  id: number;
}

export interface MenuSearchRequest {
  platformId?: number;
  parentId?: number;
  menuType?: number;
  name?: string;
  title?: string;
  label?: string;
  status?: number;
  isMenu?: number;
}

export interface MenuSearchResponse {
  items: MenuSysMenuTree[];
  total: number;
}

export interface MenuListRequest {
  platformId?: number;
  page?: number;
  pageSize?: number;
  orderStr?: string;
  isAsc?: boolean;
  parentId?: number;
  menuType?: number;
  name?: string;
  title?: string;
  label?: string;
  status?: number;
  isMenu?: number;
}

export interface MenuListResponse {
  items: MenuSysMenu[];
  total: number;
}

export interface MenuRolesTreeRequest {
  platformId?: number;
  roleCodes: string[];
}

export interface MenuAllTreeRequest {
  platformId?: number;
  status?: number;
}

export interface MenuSimpleTreeRequest {
  platformId?: number;
  status?: number;
}

function normalizeMenu(payload: unknown): MenuSysMenu {
  const item = (payload ?? {}) as Record<string, unknown>;

  return {
    id: parseNumber(item.id),
    parentId: parseNumber(item.parentId),
    menuType: parseNumber(item.menuType),
    name: parseString(item.name),
    path: parseString(item.path),
    component: parseString(item.component),
    redirect: parseString(item.redirect),
    label: parseString(item.label),
    title: parseString(item.title),
    icon: parseString(item.icon),
    sort: parseNumber(item.sort),
    link: parseString(item.link),
    isEnable: parseNumber(item.isEnable),
    isMenu: parseNumber(item.isMenu),
    keepAlive: parseNumber(item.keepAlive),
    isHide: parseNumber(item.isHide),
    isIframe: parseNumber(item.isIframe),
    isHideTab: parseNumber(item.isHideTab),
    showBadge: parseNumber(item.showBadge),
    showTextBadge: parseString(item.showTextBadge),
    isFirstLevel: parseNumber(item.isFirstLevel),
    fixedTab: parseNumber(item.fixedTab),
    isFullPage: parseNumber(item.isFullPage),
    activePath: parseString(item.activePath),
    roles: parseString(item.roles),
    authName: parseString(item.authName),
    authLabel: parseString(item.authLabel),
    authIcon: parseString(item.authIcon),
    authSort: parseNumber(item.authSort),
    status: parseNumber(item.status, 1),
    createdBy: parseString(item.createdBy),
    updatedBy: parseString(item.updatedBy),
    createdAt: parseNumber(item.createdAt),
    updatedAt: parseNumber(item.updatedAt)
  };
}

function normalizeMenuTree(payload: unknown): MenuSysMenuTree {
  const item = (payload ?? {}) as Record<string, unknown>;
  const childrenRaw = item.children;
  return {
    ...normalizeMenu(item),
    children: Array.isArray(childrenRaw) ? childrenRaw.map((child) => normalizeMenuTree(child)) : []
  };
}

function normalizeSimpleTree(payload: unknown): MenuSysMenuSimpleTreeNode {
  const item = (payload ?? {}) as Record<string, unknown>;
  const childrenRaw = item.children;
  return {
    id: parseNumber(item.id),
    title: parseString(item.title),
    children: Array.isArray(childrenRaw) ? childrenRaw.map((child) => normalizeSimpleTree(child)) : []
  };
}

function normalizeTreeResponse(payload: unknown): MenuSearchResponse {
  if (Array.isArray(payload)) {
    return {
      items: payload.map((item) => normalizeMenuTree(item)),
      total: payload.length
    };
  }

  if (payload && typeof payload === "object") {
    const item = payload as Record<string, unknown>;
    const list = item.items;
    if (Array.isArray(list)) {
      return {
        items: list.map((entry) => normalizeMenuTree(entry)),
        total: parseNumber(item.total, list.length)
      };
    }
  }

  return {
    items: [],
    total: 0
  };
}

export async function addMenuApi(data: MenuAddRequest): Promise<string> {
  const platformId = resolvePlatformId(data.platformId);
  return requestJson<string>(MENU_BASE_PATH, {
    method: "POST",
    body: JSON.stringify({
      ...data,
      platformId
    })
  });
}

export async function updateMenuApi(data: MenuUpdateRequest): Promise<string> {
  const { id, ...params } = data;
  const platformId = resolvePlatformId(data.platformId);
  return requestJson<string>(`${MENU_BASE_PATH}/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      ...params,
      platformId
    })
  });
}

export async function deleteMenuApi(id: number, platformId?: number): Promise<string> {
  const query = buildQuery({
    platformId: resolvePlatformId(platformId)
  });
  return requestJson<string>(`${MENU_BASE_PATH}/${id}${query}`, {
    method: "DELETE"
  });
}

export async function getMenuByIdApi(id: number): Promise<MenuSysMenu> {
  const query = buildQuery({
    platformId: resolvePlatformId()
  });
  const response = await requestJson<unknown>(`${MENU_BASE_PATH}/${id}${query}`, {
    method: "GET"
  });
  return normalizeMenu(response);
}

export async function searchMenuTreeApi(params: MenuSearchRequest = {}): Promise<MenuSearchResponse> {
  const query = buildQuery({
    platformId: resolvePlatformId(params.platformId),
    parentId: params.parentId,
    menuType: params.menuType,
    name: params.name?.trim() || undefined,
    title: params.title?.trim() || undefined,
    label: params.label?.trim() || undefined,
    status: params.status,
    isMenu: params.isMenu
  });

  const response = await requestJson<unknown>(`${MENU_BASE_PATH}/tree${query}`, {
    method: "GET"
  });
  return normalizeTreeResponse(response);
}

export async function getMenuListApi(params: MenuListRequest = {}): Promise<MenuListResponse> {
  const query = buildQuery({
    platformId: resolvePlatformId(params.platformId),
    page: params.page,
    pageSize: params.pageSize,
    orderStr: params.orderStr?.trim() || undefined,
    isAsc: params.isAsc,
    parentId: params.parentId,
    menuType: params.menuType,
    name: params.name?.trim() || undefined,
    title: params.title?.trim() || undefined,
    label: params.label?.trim() || undefined,
    status: params.status,
    isMenu: params.isMenu
  });

  const response = await requestJson<{ items?: unknown[]; total?: unknown }>(`${MENU_BASE_PATH}/list${query}`, {
    method: "GET"
  });

  return {
    items: Array.isArray(response.items) ? response.items.map((item) => normalizeMenu(item)) : [],
    total: parseNumber(response.total)
  };
}

export async function getRolesMenuTreeApi(data: MenuRolesTreeRequest): Promise<MenuSysMenuTree[]> {
  const platformId = resolvePlatformId(data.platformId);
  const response = await requestJson<unknown>(`${MENU_BASE_PATH}/roles/tree`, {
    method: "POST",
    body: JSON.stringify({
      ...data,
      platformId
    })
  });

  return Array.isArray(response) ? response.map((item) => normalizeMenuTree(item)) : [];
}

export async function getAllMenuTreeApi(params: MenuAllTreeRequest = {}): Promise<MenuSysMenuTree[]> {
  const query = buildQuery({
    platformId: resolvePlatformId(params.platformId),
    status: params.status
  });
  const response = await requestJson<unknown>(`${MENU_BASE_PATH}/all/tree${query}`, {
    method: "GET"
  });
  return Array.isArray(response) ? response.map((item) => normalizeMenuTree(item)) : [];
}

export async function getSysMenuSimpleTreeApi(
  params: MenuSimpleTreeRequest = {}
): Promise<MenuSysMenuSimpleTreeNode[]> {
  const query = buildQuery({
    platformId: resolvePlatformId(params.platformId),
    status: params.status
  });

  const response = await requestJson<unknown>(`${MENU_BASE_PATH}/simple/tree${query}`, {
    method: "GET"
  });

  return Array.isArray(response) ? response.map((item) => normalizeSimpleTree(item)) : [];
}
