import { createRouter, createWebHistory } from 'vue-router'
import DiscreteView from '../views/DiscreteView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/discrete',
      name: 'discrete',
      component: DiscreteView,
      alias: '/',
    },
    {
      path: '/continuous',
      name: 'continuous',
      component: () => import('../views/ContinuousView.vue'),
    },
  ],
})

export default router
