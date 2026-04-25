import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/docs'
  },
  {
    path: '/docs',
    name: 'Docs',
    component: () => import('@/views/DocView.vue')
  },
  {
    path: '/tags',
    name: 'Tags',
    component: () => import('@/views/TagView.vue')
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/views/SearchView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
