import { createRouter, createWebHistory } from 'vue-router';
import { routePages } from './pages';

// 获取base路径，用于GitHub Pages部署
const base = import.meta.env.VITE_BASE_URL || '/';

const router = createRouter({
  history: createWebHistory(base),
  routes: routePages.map(({ path, name, title }) => ({
    path,
    name,
    component: () => import(`../views/${name}.vue`),
    meta: { title },
  })),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

// 路由守卫：更新页面标题
router.beforeEach((to, from, next) => {
  if (to.meta?.title) {
    document.title = to.meta.title as string;
  }
  next();
});

export default router;
