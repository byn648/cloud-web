import type { RouteLocationNormalizedLoaded, Router } from "vue-router";
import type { SubmitResult } from "../../workload/create/common/utils/submitHandler";
import {
  demoNavigateToApplicationList,
  isDemoWorkloadCreate
} from "./demoNavigation";

export function isDemoCreateRoute(route: RouteLocationNormalizedLoaded): boolean {
  return isDemoWorkloadCreate(route);
}

export function finishCreateAndNavigate(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  result: SubmitResult,
  clearAllData: () => void,
  productionNavigate: () => void,
  ctx: { resourceClusterId: number; workspaceId: number }
): void {
  if (!result.success) return;
  clearAllData();
  if (isDemoWorkloadCreate(route)) {
    demoNavigateToApplicationList(router, {
      projectId: Number(route.query.appProjectId) || DEMO_APP_PROJECT_ID,
      workspaceId: Number(route.query.workspaceId) || 0,
      applicationId: result.applicationId
    });
    return;
  }
  productionNavigate();
}

export function leaveWorkloadWizard(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  productionBack: () => void
): void {
  if (isDemoWorkloadCreate(route)) {
    demoNavigateToApplicationList(router, {
      projectId: Number(route.query.appProjectId) || DEMO_APP_PROJECT_ID,
      workspaceId: Number(route.query.workspaceId) || 0
    });
    return;
  }
  productionBack();
}
