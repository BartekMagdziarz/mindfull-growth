import { createRouter, createWebHistory } from 'vue-router'
import TodayView from '@/views/TodayView.vue'
import JournalView from '@/views/JournalView.vue'
import EmotionsView from '@/views/EmotionsView.vue'
import ExercisesView from '@/views/ExercisesView.vue'
import ProfileView from '@/views/ProfileView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/journal',
    },
    {
      path: '/today',
      name: 'today',
      component: TodayView,
    },
    {
      path: '/journal',
      name: 'journal',
      component: JournalView,
    },
    {
      path: '/emotions',
      name: 'emotions',
      component: EmotionsView,
    },
    {
      path: '/exercises',
      name: 'exercises',
      component: ExercisesView,
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
    },
  ],
})

export default router

