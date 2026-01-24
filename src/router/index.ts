import { createRouter, createWebHistory } from 'vue-router'
import TodayView from '@/views/TodayView.vue'
import JournalView from '@/views/JournalView.vue'
import JournalEditorView from '@/views/JournalEditorView.vue'
import EmotionsView from '@/views/EmotionsView.vue'
import EmotionLogEditorView from '@/views/EmotionLogEditorView.vue'
import ExercisesView from '@/views/ExercisesView.vue'
import ProfileView from '@/views/ProfileView.vue'
import PeriodicView from '@/views/PeriodicView.vue'
import PeriodicEntryEditorView from '@/views/PeriodicEntryEditorView.vue'
import HistoryView from '@/views/HistoryView.vue'
import JourneyView from '@/views/JourneyView.vue'

const PUBLIC_ROUTES = ['login', 'signup']

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/today',
    },
    // Auth routes (public)
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('@/views/SignupView.vue'),
    },
    // Protected routes
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
      path: '/journal/edit',
      name: 'journal-edit',
      component: JournalEditorView,
    },
    {
      path: '/journal/:id/edit',
      name: 'journal-edit-id',
      component: JournalEditorView,
    },
    {
      path: '/journal/:id/chat',
      name: 'journal-chat',
      component: () => import('@/views/ChatView.vue'),
      meta: {
        title: 'Chat about entry',
      },
    },
    {
      path: '/periodic',
      name: 'periodic',
      component: PeriodicView,
    },
    {
      path: '/periodic/new/:type',
      name: 'periodic-new',
      component: PeriodicEntryEditorView,
    },
    {
      path: '/periodic/:id',
      name: 'periodic-view',
      component: PeriodicEntryEditorView,
    },
    // Journey - cascading periodic journals
    {
      path: '/journey',
      name: 'journey',
      component: JourneyView,
    },
    {
      path: '/journey/yearly/new',
      name: 'journey-yearly-new',
      component: () => import('@/views/YearlyEntryEditorView.vue'),
    },
    {
      path: '/journey/yearly/:id',
      name: 'journey-yearly',
      component: () => import('@/views/YearlyEntryEditorView.vue'),
    },
    {
      path: '/journey/quarterly/:id?',
      name: 'journey-quarterly',
      component: () => import('@/views/PeriodicEntryEditorView.vue'),
      meta: { periodType: 'quarterly' },
    },
    {
      path: '/journey/weekly/:id?',
      name: 'journey-weekly',
      component: () => import('@/views/PeriodicEntryEditorView.vue'),
      meta: { periodType: 'weekly' },
    },
    {
      path: '/journey/daily/:date?',
      name: 'journey-daily',
      component: () => import('@/views/DailyCheckInView.vue'),
    },
    {
      path: '/emotions',
      name: 'emotions',
      component: EmotionsView,
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryView,
    },
    {
      path: '/emotions/edit',
      name: 'emotions-edit',
      component: EmotionLogEditorView,
    },
    {
      path: '/emotions/:id/edit',
      name: 'emotions-edit-id',
      component: EmotionLogEditorView,
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

// Navigation guard for authentication
// Import is done dynamically to avoid issues with WASM loading at module init time
router.beforeEach(async (to, _from, next) => {
  const { useAuthStore } = await import('@/stores/auth.store')
  const authStore = useAuthStore()

  // Initialize auth state if not already done
  if (!authStore.isInitialized) {
    await authStore.initialize()
  }

  const isPublicRoute = PUBLIC_ROUTES.includes(to.name as string)
  const isAuthenticated = authStore.isAuthenticated

  if (!isAuthenticated && !isPublicRoute) {
    // Not authenticated and trying to access protected route
    // Redirect to login with return URL
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (isAuthenticated && isPublicRoute) {
    // Already authenticated and trying to access login/signup
    // Redirect to home
    next({ name: 'today' })
  } else {
    // Proceed normally
    next()
  }
})

export default router
