import { getAuthCodesApi, getRolesRouteTreeApi, type AppRouteRecordPayload } from "../api/portal/permission";
import { resolvePlatformId } from "../api/shared";
import { getUserInfoApi } from "../api/portal/user";

const PERMISSION_CACHE_KEY = "permissionSnapshot";
const PERMISSION_CACHE_VERSION = 2;
const SUPER_ADMIN_ROLE_CODE = "super_admin";

export type PermissionSnapshot = {
  codes: string[];
  paths: string[];
  platformId: number;
  version: number;
  fetchedAt: number;
};

function normalizeCode(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePath(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return "";
  }
  const noQuery = trimmed.split("?")[0]?.split("#")[0] ?? "";
  if (!noQuery) {
    return "";
  }
  const normalized = noQuery.startsWith("/") ? noQuery : `/${noQuery}`;
  return normalized.length > 1 && normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function appendUnique(set: Set<string>, rawValue: string): void {
  const value = rawValue.trim();
  if (!value) {
    return;
  }
  set.add(value);
}

function joinParentAndChildPath(parentPath: unknown, childPath: unknown): string {
  const parent = normalizePath(parentPath);
  if (typeof childPath !== "string") {
    return parent;
  }
  const child = childPath.trim();
  if (!child) {
    return parent;
  }
  if (child.startsWith("/")) {
    return normalizePath(child);
  }
  if (!parent) {
    return normalizePath(child);
  }
  const base = parent === "/" ? "" : parent;
  return normalizePath(`${base}/${child}`);
}

function collectPermissionFromRoutes(
  routes: AppRouteRecordPayload[],
  codeSet: Set<string>,
  pathSet: Set<string>,
  inheritedParentPath = ""
): void {
  routes.forEach((route) => {
    const parentPath = normalizePath(route.meta?.parentPath) || inheritedParentPath;
    const routePath = normalizePath(route.path);
    const fullPath = joinParentAndChildPath(parentPath, route.path);
    const componentPath = normalizePath(route.component);
    const redirectPath = normalizePath(route.redirect);

    appendUnique(pathSet, routePath);
    appendUnique(pathSet, fullPath);
    appendUnique(pathSet, componentPath);
    appendUnique(pathSet, redirectPath);
    appendUnique(codeSet, normalizeCode(route.meta?.authMark));

    route.meta?.authList?.forEach((authItem) => {
      appendUnique(codeSet, normalizeCode(authItem?.authMark));
    });

    if (Array.isArray(route.children) && route.children.length > 0) {
      collectPermissionFromRoutes(
        route.children,
        codeSet,
        pathSet,
        fullPath || routePath || parentPath || componentPath
      );
    }
  });
}

function sanitizeSnapshot(input: Partial<PermissionSnapshot> | null | undefined): PermissionSnapshot {
  const codeSet = new Set<string>();
  const pathSet = new Set<string>();
  const codes = Array.isArray(input?.codes) ? input.codes : [];
  const paths = Array.isArray(input?.paths) ? input.paths : [];

  codes.forEach((item) => appendUnique(codeSet, normalizeCode(item)));
  paths.forEach((item) => appendUnique(pathSet, normalizePath(item)));

  return {
    codes: Array.from(codeSet),
    paths: Array.from(pathSet),
    platformId: Number.isFinite(input?.platformId) && Number(input?.platformId) > 0 ? Number(input?.platformId) : 1,
    version:
      Number.isFinite(input?.version) && Number(input?.version) > 0
        ? Number(input?.version)
        : PERMISSION_CACHE_VERSION,
    fetchedAt: Number.isFinite(input?.fetchedAt) ? Number(input?.fetchedAt) : Date.now()
  };
}

function parseUserRoleNames(roleNames: unknown): string[] {
  if (typeof roleNames !== "string") {
    return [];
  }
  return roleNames
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function savePermissionSnapshot(snapshot: PermissionSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(PERMISSION_CACHE_KEY, JSON.stringify(snapshot));
}

export function clearPermissionSnapshot(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(PERMISSION_CACHE_KEY);
}

export function isSuperAdminUser(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const raw = window.localStorage.getItem("userInfo");
  if (!raw) {
    return false;
  }
  try {
    const parsed = JSON.parse(raw) as {
      roles?: unknown;
    };
    const roles = Array.isArray(parsed.roles) ? parsed.roles : [];
    return roles.some((role) => normalizeCode(role) === SUPER_ADMIN_ROLE_CODE);
  } catch {
    return false;
  }
}

export function getCachedPermissionSnapshot(): PermissionSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(PERMISSION_CACHE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PermissionSnapshot>;
    return sanitizeSnapshot(parsed);
  } catch {
    return null;
  }
}

export async function refreshPermissionSnapshot(): Promise<PermissionSnapshot> {
  const platformId = resolvePlatformId();
  const [userInfoResult, codesResult, routesResult] = await Promise.allSettled([
    getUserInfoApi(),
    getAuthCodesApi(),
    getRolesRouteTreeApi(platformId)
  ]);

  if (userInfoResult.status === "fulfilled") {
    const explicitRoleNames = parseUserRoleNames(userInfoResult.value.roleNames);
    if (explicitRoleNames.length === 0 && !isSuperAdminUser()) {
      const snapshot = sanitizeSnapshot({
        codes: [],
        paths: [],
        platformId,
        version: PERMISSION_CACHE_VERSION,
        fetchedAt: Date.now()
      });
      savePermissionSnapshot(snapshot);
      return snapshot;
    }
  }
  const codeSet = new Set<string>();
  const pathSet = new Set<string>();

  if (codesResult.status === "fulfilled") {
    codesResult.value.forEach((item) => appendUnique(codeSet, normalizeCode(item)));
  }

  if (routesResult.status === "fulfilled") {
    collectPermissionFromRoutes(routesResult.value, codeSet, pathSet);
  }

  if (codesResult.status === "rejected" && routesResult.status === "rejected") {
    throw codesResult.reason instanceof Error ? codesResult.reason : new Error("加载权限信息失败");
  }

  const snapshot = sanitizeSnapshot({
    codes: Array.from(codeSet),
    paths: Array.from(pathSet),
    platformId,
    version: PERMISSION_CACHE_VERSION,
    fetchedAt: Date.now()
  });
  savePermissionSnapshot(snapshot);
  return snapshot;
}

export async function ensurePermissionSnapshot(forceRefresh = false): Promise<PermissionSnapshot> {
  const platformId = resolvePlatformId();
  if (!forceRefresh) {
    const cached = getCachedPermissionSnapshot();
    if (cached && cached.platformId === platformId && cached.version === PERMISSION_CACHE_VERSION) {
      return cached;
    }
  }
  return refreshPermissionSnapshot();
}

function pathPatternToRegExp(pathPattern: string): RegExp | null {
  if (!pathPattern.includes(":")) {
    return null;
  }
  const escaped = pathPattern
    .split("/")
    .map((segment) => {
      if (!segment) {
        return "";
      }
      if (segment.startsWith(":")) {
        return "[^/]+";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return new RegExp(`^${escaped}$`);
}

function shouldApplyPrefixMatch(allowedPath: string): boolean {
  const segments = allowedPath.split("/").filter((segment) => segment.length > 0);
  return segments.length >= 2;
}

export function hasPathPermission(targetPath: string, allowedPaths: string[]): boolean {
  const normalizedTargetPath = normalizePath(targetPath);
  if (!normalizedTargetPath) {
    return false;
  }

  const normalizedAllowedPaths = allowedPaths
    .map((item) => normalizePath(item))
    .filter((item) => item.length > 0);

  if (normalizedAllowedPaths.includes(normalizedTargetPath)) {
    return true;
  }

  return normalizedAllowedPaths.some((allowedPath) => {
    if (shouldApplyPrefixMatch(allowedPath) && normalizedTargetPath.startsWith(`${allowedPath}/`)) {
      return true;
    }
    const dynamicPathRegExp = pathPatternToRegExp(allowedPath);
    return dynamicPathRegExp ? dynamicPathRegExp.test(normalizedTargetPath) : false;
  });
}
