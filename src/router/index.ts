import { createRouter, createWebHistory } from 'vue-router'
import TodayView from '@/views/TodayView.vue'
import JournalView from '@/views/JournalView.vue'
import JournalEditorView from '@/views/JournalEditorView.vue'
import EmotionLogEditorView from '@/views/EmotionLogEditorView.vue'
import ExercisesView from '@/views/ExercisesView.vue'
import ProfileView from '@/views/ProfileView.vue'
import HistoryView from '@/views/HistoryView.vue'
import PlanningView from '@/views/PlanningView.vue'

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
    // New Planning Hub
    {
      path: '/planning',
      name: 'planning',
      component: PlanningView,
    },
    {
      path: '/planning/projects-trackers',
      name: 'projects-trackers',
      component: () => import('@/views/ProjectTrackerManagerView.vue'),
    },
    // Habits
    {
      path: '/planning/habits',
      name: 'habits',
      component: () => import('@/views/HabitsView.vue'),
    },
    {
      path: '/planning/habits/new',
      name: 'habits-new',
      component: () => import('@/views/HabitEditorView.vue'),
    },
    {
      path: '/planning/habits/:id',
      name: 'habits-detail',
      component: () => import('@/views/HabitDetailView.vue'),
    },
    {
      path: '/planning/habits/:id/edit',
      name: 'habits-edit',
      component: () => import('@/views/HabitEditorView.vue'),
    },
    // Yearly Planning Flow
    {
      path: '/planning/year/new',
      name: 'yearly-planning-new',
      component: () => import('@/views/YearlyPlanningView.vue'),
    },
    // Yearly Reflection
    {
      path: '/planning/year/:planId/reflect',
      name: 'yearly-reflection',
      component: () => import('@/views/YearlyReflectionView.vue'),
    },
    {
      path: '/planning/year/:planId',
      name: 'yearly-planning-edit',
      component: () => import('@/views/YearlyPlanningView.vue'),
    },
    // Monthly Planning Flow
    {
      path: '/planning/month/new',
      name: 'monthly-planning-new',
      component: () => import('@/views/MonthlyPlanningView.vue'),
    },
    {
      path: '/planning/month/:planId/reflect',
      name: 'monthly-reflection',
      component: () => import('@/views/MonthlyReflectionView.vue'),
    },
    {
      path: '/planning/month/:planId',
      name: 'monthly-planning-edit',
      component: () => import('@/views/MonthlyPlanningView.vue'),
    },
    // Weekly Planning Flow
    {
      path: '/planning/week/new',
      name: 'weekly-planning-new',
      component: () => import('@/views/WeeklyPlanningView.vue'),
    },
    {
      path: '/planning/week/:planId/reflect',
      name: 'weekly-reflection',
      component: () => import('@/views/WeeklyReflectionView.vue'),
    },
    {
      path: '/planning/week/:planId',
      name: 'weekly-planning-edit',
      component: () => import('@/views/WeeklyPlanningView.vue'),
    },
    // Legacy quarterly redirects for backward compatibility
    {
      path: '/planning/quarter/:id',
      redirect: (to) => `/planning/month/${to.params.id}`,
    },
    {
      path: '/planning/quarter/:id/reflect',
      redirect: (to) => `/planning/month/${to.params.id}/reflect`,
    },
    // Legacy periodic redirect - preserved for old deep links
    {
      path: '/periodic',
      redirect: '/planning',
    },
    {
      path: '/emotions',
      name: 'emotions',
      component: EmotionLogEditorView,
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
      path: '/exercises/assessments/:assessmentId',
      name: 'exercise-assessment',
      component: () => import('@/views/exercises/AssessmentView.vue'),
    },
    // Life Areas
    {
      path: '/areas',
      name: 'life-areas',
      component: () => import('@/views/LifeAreasView.vue'),
    },
    {
      path: '/areas/new',
      name: 'life-area-new',
      component: () => import('@/views/LifeAreaEditorView.vue'),
    },
    {
      path: '/areas/:id',
      name: 'life-area-detail',
      component: () => import('@/views/LifeAreaDetailView.vue'),
    },
    {
      path: '/areas/:id/edit',
      name: 'life-area-edit',
      component: () => import('@/views/LifeAreaEditorView.vue'),
    },
    {
      path: '/exercises/wheel-of-life',
      name: 'exercise-wheel-of-life',
      component: () => import('@/views/exercises/WheelOfLifeView.vue'),
    },
    {
      path: '/exercises/values',
      name: 'exercise-values',
      component: () => import('@/views/exercises/ValuesDiscoveryView.vue'),
    },
    {
      path: '/exercises/shadow-beliefs',
      name: 'exercise-shadow-beliefs',
      component: () => import('@/views/exercises/ShadowBeliefsView.vue'),
    },
    {
      path: '/exercises/purpose',
      name: 'exercise-purpose',
      component: () => import('@/views/exercises/TransformativePurposeView.vue'),
    },
    // CBT Exercises
    {
      path: '/exercises/worry-tree',
      name: 'exercise-worry-tree',
      component: () => import('@/views/exercises/WorryTreeView.vue'),
    },
    {
      path: '/exercises/cognitive-distortions',
      name: 'exercise-cognitive-distortions',
      component: () => import('@/views/exercises/CognitiveDistortionsView.vue'),
    },
    {
      path: '/exercises/thought-record',
      name: 'exercise-thought-record',
      component: () => import('@/views/exercises/ThoughtRecordView.vue'),
    },
    // CBT Exercises (Phase 2)
    {
      path: '/exercises/core-beliefs',
      name: 'exercise-core-beliefs',
      component: () => import('@/views/exercises/CoreBeliefsView.vue'),
    },
    {
      path: '/exercises/compassionate-letter',
      name: 'exercise-compassionate-letter',
      component: () => import('@/views/exercises/CompassionateLetterView.vue'),
    },
    {
      path: '/exercises/positive-data-log',
      name: 'exercise-positive-data-log',
      component: () => import('@/views/exercises/PositiveDataLogView.vue'),
    },
    // CBT Exercises (Phase 3)
    {
      path: '/exercises/behavioral-experiment',
      name: 'exercise-behavioral-experiment',
      component: () => import('@/views/exercises/BehavioralExperimentView.vue'),
    },
    {
      path: '/exercises/behavioral-activation',
      name: 'exercise-behavioral-activation',
      component: () => import('@/views/exercises/BehavioralActivationView.vue'),
    },
    {
      path: '/exercises/structured-problem-solving',
      name: 'exercise-structured-problem-solving',
      component: () => import('@/views/exercises/StructuredProblemSolvingView.vue'),
    },
    // CBT Exercises (Phase 4)
    {
      path: '/exercises/graded-exposure',
      name: 'exercise-graded-exposure',
      component: () => import('@/views/exercises/GradedExposureView.vue'),
    },
    // Logotherapy Exercises
    {
      path: '/exercises/three-pathways',
      name: 'exercise-three-pathways',
      component: () => import('@/views/exercises/ThreePathwaysView.vue'),
    },
    {
      path: '/exercises/socratic-dialogue',
      name: 'exercise-socratic-dialogue',
      component: () => import('@/views/exercises/SocraticDialogueView.vue'),
    },
    {
      path: '/exercises/mountain-range',
      name: 'exercise-mountain-range',
      component: () => import('@/views/exercises/MountainRangeView.vue'),
    },
    {
      path: '/exercises/paradoxical-intention',
      name: 'exercise-paradoxical-intention',
      component: () => import('@/views/exercises/ParadoxicalIntentionView.vue'),
    },
    {
      path: '/exercises/dereflection',
      name: 'exercise-dereflection',
      component: () => import('@/views/exercises/DereflectionView.vue'),
    },
    {
      path: '/exercises/tragic-optimism',
      name: 'exercise-tragic-optimism',
      component: () => import('@/views/exercises/TragicOptimismView.vue'),
    },
    {
      path: '/exercises/attitudinal-shift',
      name: 'exercise-attitudinal-shift',
      component: () => import('@/views/exercises/AttitudinalShiftView.vue'),
    },
    {
      path: '/exercises/legacy-letter',
      name: 'exercise-legacy-letter',
      component: () => import('@/views/exercises/LegacyLetterView.vue'),
    },
    // IFS Exercises (Epic 7)
    {
      path: '/exercises/parts-mapping',
      name: 'exercise-parts-mapping',
      component: () => import('@/views/exercises/PartsMappingView.vue'),
    },
    {
      path: '/exercises/unblending',
      name: 'exercise-unblending',
      component: () => import('@/views/exercises/UnblendingView.vue'),
    },
    {
      path: '/exercises/direct-access',
      name: 'exercise-direct-access',
      component: () => import('@/views/exercises/DirectAccessView.vue'),
    },
    {
      path: '/exercises/trailhead',
      name: 'exercise-trailhead',
      component: () => import('@/views/exercises/TrailheadView.vue'),
    },
    {
      path: '/exercises/protector-appreciation',
      name: 'exercise-protector-appreciation',
      component: () => import('@/views/exercises/ProtectorAppreciationView.vue'),
    },
    {
      path: '/exercises/exile-witnessing',
      name: 'exercise-exile-witnessing',
      component: () => import('@/views/exercises/ExileWitnessingView.vue'),
    },
    {
      path: '/exercises/self-energy',
      name: 'exercise-self-energy',
      component: () => import('@/views/exercises/SelfEnergyView.vue'),
    },
    {
      path: '/exercises/parts-dialogue',
      name: 'exercise-parts-dialogue',
      component: () => import('@/views/exercises/PartsDialogueView.vue'),
    },
    {
      path: '/exercises/daily-ifs-checkin',
      name: 'exercise-daily-ifs-checkin',
      component: () => import('@/views/exercises/DailyIFSCheckInView.vue'),
    },
    {
      path: '/exercises/constellation',
      name: 'exercise-constellation',
      component: () => import('@/views/exercises/ConstellationView.vue'),
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
