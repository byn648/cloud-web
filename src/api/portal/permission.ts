import { buildQuery, requestJson, resolvePlatformId } from "../shared";

const AUTH_BASE_PATH = "/portal/v1/auth";
const MENU_BASE_PATH = "/portal/v1/menu";

type RouteMetaPayload = {
  authMark?: string;
  parentPath?: string;
  authList?: Array<{
    authMark?: string;
  }>;
};

export type AppRouteRecordPayload = {
  name?: string;
  path?: string;
  component?: string;
  redirect?: string;
  meta?: RouteMetaPayload;
  children?: AppRouteRecordPayload[];
};

function toStringArray(payload: unknown): string[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

export async function getAuthCodesApi(): Promise<string[]> {
  const response = await requestJson<unknown>(`${AUTH_BASE_PATH}/codes`, {
    method: "GET"
  });
  return toStringArray(response);
}

export async function getRolesRouteTreeApi(platformId?: number): Promise<AppRouteRecordPayload[]> {
  const query = buildQuery({
    platformId: resolvePlatformId(platformId)
  });
  const response = await requestJson<unknown>(`${MENU_BASE_PATH}/roles/tree${query}`, {
    method: "GET"
  });
  return Array.isArray(response) ? (response as AppRouteRecordPayload[]) : [];
}
