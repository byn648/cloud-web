import { createRouter, createWebHashHistory } from "vue-router";
import { HOME_PATH, LOGIN_PATH } from "./paths";

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
      path: "/:pathMatch(.*)*",
      redirect: HOME_PATH
    }
  ]
});

router.beforeEach((to) => {
  const hasToken = Boolean(localStorage.getItem("accessToken"));

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

  return true;
});

export default router;
