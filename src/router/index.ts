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
  "/system/menu"
]);

const PERMISSION_ROUTE_ALIASES: Record<string, string[]> = {
  "/system/permission": ["/system/permission", "/system/api"],
  "/system/api": ["/system/api", "/system/permission"]
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

  if (hasToken && PERMISSION_GUARD_PATHS.has(to.path)) {
    try {
      const snapshot = await ensurePermissionSnapshot();
      const candidatePaths = PERMISSION_ROUTE_ALIASES[to.path] ?? [to.path];
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
