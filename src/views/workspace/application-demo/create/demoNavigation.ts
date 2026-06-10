import type { RouteLocationNormalizedLoaded, Router } from "vue-router";

export const DEMO_APP_PROJECT_ID = 1;

export const DEMO_DEPLOYMENT_CREATE_PATH = "/workspace/application-demo/create/deployment";

export function isDemoWorkloadCreate(route: RouteLocationNormalizedLoaded): boolean {
  return route.query.demo === "1" || route.path.startsWith("/workspace/application-demo/create/");
}

export function isDemoApplicationContext(route: RouteLocationNormalizedLoaded): boolean {
  return route.path === "/workspace/application-demo" || route.path.startsWith("/workspace/application-demo/");
}

export function demoBaseQueryFromRoute(route: RouteLocationNormalizedLoaded): Record<string, string> {
  return {
    resourceClusterId: String(route.query.resourceClusterId || ""),
    clusterUuid: String(route.query.clusterUuid || ""),
    workspaceId: String(route.query.workspaceId || ""),
    appProjectId: String(route.query.appProjectId || DEMO_APP_PROJECT_ID),
    namespace: String(route.query.namespace || "default"),
    demo: "1"
  };
}

export function demoNavigateToApplicationList(
  router: Router,
  params: { projectId: number; workspaceId: number; applicationId?: number }
): void {
  router.push({
    path: "/workspace/application-demo",
    query: {
      projectId: String(params.projectId),
      workspaceId: String(params.workspaceId),
      ...(params.applicationId ? { appId: String(params.applicationId) } : {})
    }
  });
}

export function demoNavigateToCreateDeployment(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  extra: Record<string, string> = {}
): void {
  router.push({
    path: DEMO_DEPLOYMENT_CREATE_PATH,
    query: {
      ...demoBaseQueryFromRoute(route),
      mode: "createApp",
      ...extra
    }
  });
}

/** @deprecated 演示环境仅支持 Deployment，请使用 demoNavigateToCreateDeployment */
export const DEMO_WORKLOAD_PATH_BY_TYPE: Record<string, string> = {
  deployment: DEMO_DEPLOYMENT_CREATE_PATH
};
