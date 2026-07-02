import { createRouter, createWebHashHistory } from "vue-router";
import { HOME_PATH, LOGIN_PATH } from "./paths";
import {
  clearPermissionSnapshot,
  ensurePermissionSnapshot,
  hasPathPermission,
  isSuperAdminUser
} from "../utils/permission";

const PERMISSION_GUARD_PATHS = new Set<string>([
  "/project/management",
  "/project/resource",
  "/project/workspace",
  "/system/user",
  "/system/role",
  "/system/api",
  "/system/permission",
  "/system/menu",
  "/workspace/application",
  "/workspace/application/create",
  "/workspace/workload/pod",
  "/workspace/pod-manager",
  "/green",
  "/green/forecast",
  "/green/performance"
]);

function isWorkspaceApplicationRoute(path: string): boolean {
  return path.startsWith("/workspace/workload/create/");
}

function resolvePermissionCheckPath(path: string): string {
  if (path === "/workspace/application/create" || isWorkspaceApplicationRoute(path)) {
    return "/workspace/application";
  }
  if (path === "/workspace/workload/pod" || path === "/workspace/pod-manager") {
    return "/workspace/pod-manager";
  }
  return path;
}

const PERMISSION_ROUTE_ALIASES: Record<string, string[]> = {
  "/system/permission": ["/system/permission", "/system/api"],
  "/system/api": ["/system/api", "/system/permission"],
  "/green": ["/green", "/green/forecast", "/green/performance"],
  "/green/forecast": ["/green/forecast", "/green/performance", "/green"],
  "/green/performance": ["/green/performance", "/green/forecast", "/green"]
};

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      redirect: HOME_PATH
    },
    {
      path: LOGIN_PATH,
      name: "Login",
      component: () => import("../views/auth/login/index.vue")
    },
    {
      path: HOME_PATH,
      name: "Home",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/project/management",
      name: "ProjectManagement",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/project/resource",
      name: "ProjectResource",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/project/workspace",
      name: "ProjectWorkspace",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/system/user",
      name: "SystemUserManagement",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/system/role",
      name: "SystemRoleManagement",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/system/permission",
      name: "SystemPermissionManagement",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/system/api",
      name: "SystemApiManagement",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/system/menu",
      name: "SystemMenuManagement",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/workspace/application",
      name: "ApplicationManagement",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/workspace/application-demo",
      name: "ApplicationDemoCenter",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/workspace/application-demo/create",
      name: "ApplicationDemoCreate",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/workspace/application-demo/create/deployment",
      name: "ApplicationDemoCreateDeployment",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/workspace/application/create",
      name: "AppCreateManager",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/workspace/workload/create/deployment",
      name: "CreateDeployment",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/workspace/workload/create/statefulset",
      name: "CreateStatefulSet",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/workspace/workload/create/daemonset",
      name: "CreateDaemonSet",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/workspace/workload/create/cronjob",
      name: "CreateCronJob",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/workspace/workload/create/job",
      name: "CreateJob",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/workspace/workload/create/pod",
      name: "CreatePod",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/workspace/pod-manager",
      name: "PodManager",
      component: () => import("../views/index/index.vue")
    },
    {
      path: "/workspace/workload/pod",
      redirect: "/workspace/pod-manager"
    },
    {
      path: "/cluster/plugin-management",
      redirect: HOME_PATH
    },
    {
      path: "/green",
      name: "GreenIndex",
      component: () => import("../views/green/index.vue")
    },
    {
      path: "/green/forecast",
      name: "GreenForecast",
      component: () => import("../views/forecast/index.vue")
    },
    {
      path: "/green/performance",
      name: "GreenPerformance",
      component: () => import("../views/performance/index.vue")
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: HOME_PATH
    }
  ]
});

router.beforeEach(async (to) => {
  const hasToken = Boolean(localStorage.getItem("accessToken"));
  if (!hasToken) {
    clearPermissionSnapshot();
  }

  if (!hasToken && to.path !== LOGIN_PATH) {
    return {
      path: LOGIN_PATH,
      query: { redirect: to.fullPath }
    };
  }

  if (hasToken && to.path === LOGIN_PATH) {
    const redirect =
      typeof to.query.redirect === "string" && to.query.redirect.trim()
        ? to.query.redirect
        : HOME_PATH;

    return redirect === LOGIN_PATH ? HOME_PATH : redirect;
  }

  if (hasToken && isSuperAdminUser()) {
    return true;
  }

  const permissionPath = resolvePermissionCheckPath(to.path);
  const needsPermissionGuard =
    PERMISSION_GUARD_PATHS.has(to.path) || isWorkspaceApplicationRoute(to.path);

  if (hasToken && needsPermissionGuard) {
    try {
      const snapshot = await ensurePermissionSnapshot();
      const candidatePaths = PERMISSION_ROUTE_ALIASES[permissionPath] ?? [permissionPath];
      const hasRoutePermission = candidatePaths.some((path) => hasPathPermission(path, snapshot.paths));
      if (!hasRoutePermission) {
        return HOME_PATH;
      }
    } catch (error) {
      console.error("Load route permissions failed", error);
      return HOME_PATH;
    }
  }

  return true;
});

export default router;
