import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
    {
      path: '/',
      component: () => import('@/layout/AppLayout.vue'),
      redirect: '/dashboard',
      children: [
        { path: 'dashboard', component: () => import('@/views/DashboardView.vue') },
        { path: 'ingestion', component: () => import('@/views/IngestionView.vue') },
        { path: 'profiles', component: () => import('@/views/ProfilesView.vue') },
        { path: 'profiles/:personId', component: () => import('@/views/ProfileDetailView.vue') },
        { path: 'search', component: () => import('@/views/SearchView.vue') },
        { path: 'graph', component: () => import('@/views/GraphView.vue') },
        { path: 'analysis', component: () => import('@/views/AnalysisView.vue') },
        { path: 'identification', component: () => import('@/views/IdentificationView.vue') },
        { path: 'metrics', component: () => import('@/views/MetricsView.vue') },
        { path: 'system/agents', component: () => import('@/views/system/AgentsView.vue') },
        { path: 'system/users', component: () => import('@/views/system/UsersView.vue') },
        { path: 'system/dedup', component: () => import('@/views/system/DedupView.vue') },
        { path: 'system/jobs', component: () => import('@/views/system/JobsView.vue') },
        { path: 'system/kafka', component: () => import('@/views/system/KafkaView.vue') }
      ]
    }
  ]
})

// 路由守卫：未登录跳转到登录页
router.beforeEach(to => {
  const token = localStorage.getItem('token')
  if (!to.meta.public && !token) return '/login'
})

export default router
