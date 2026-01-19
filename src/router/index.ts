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

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/today',
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
    {
      path: '/emotions',
      name: 'emotions',
      component: EmotionsView,
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

export default router

