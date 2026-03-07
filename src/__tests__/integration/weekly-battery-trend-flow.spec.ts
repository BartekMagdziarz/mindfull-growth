import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import WeeklyPlanningView from '@/views/WeeklyPlanningView.vue'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import { useWeeklyReflectionStore } from '@/stores/weeklyReflection.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useProjectStore } from '@/stores/project.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useHabitStore } from '@/stores/habit.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useIFSDailyCheckInStore } from '@/stores/ifsDailyCheckIn.store'

const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockRoute = {
  params: { planId: 'new' } as Record<string, string>,
  path: '/planning/week/new',
}

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useRoute: () => mockRoute,
}))

function getCurrentWeekStartDate(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const start = new Date(now)
  start.setDate(now.getDate() + diff)

  const year = start.getFullYear()
  const month = String(start.getMonth() + 1).padStart(2, '0')
  const dayOfMonth = String(start.getDate()).padStart(2, '0')
  return `${year}-${month}-${dayOfMonth}`
}

function shiftIsoDateByDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00`)
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const dayOfMonth = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${dayOfMonth}`
}

describe('weekly battery trend flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockReset()
    mockReplace.mockReset()

    vi.spyOn(useWeeklyPlanStore(), 'loadWeeklyPlans').mockResolvedValue()
    vi.spyOn(useWeeklyReflectionStore(), 'loadWeeklyReflections').mockResolvedValue()
    vi.spyOn(useCommitmentStore(), 'loadCommitments').mockResolvedValue()
    vi.spyOn(useProjectStore(), 'loadProjects').mockResolvedValue()
    vi.spyOn(useLifeAreaStore(), 'loadLifeAreas').mockResolvedValue()
    vi.spyOn(usePriorityStore(), 'loadPriorities').mockResolvedValue()
    vi.spyOn(useHabitStore(), 'loadHabits').mockResolvedValue()
    vi.spyOn(useTrackerStore(), 'loadTrackers').mockResolvedValue()
    vi.spyOn(useIFSPartStore(), 'loadParts').mockResolvedValue()
    vi.spyOn(useIFSDailyCheckInStore(), 'loadCheckIns').mockResolvedValue()
  })

  it('shows battery trend cards with demand/state values from previous reflected weeks', async () => {
    const weeklyPlanStore = useWeeklyPlanStore()
    const weeklyReflectionStore = useWeeklyReflectionStore()
    const currentWeekStart = getCurrentWeekStartDate()
    const previousWeekStart = shiftIsoDateByDays(currentWeekStart, -7)

    weeklyPlanStore.weeklyPlans = [
      {
        id: 'week-prev',
        createdAt: `${previousWeekStart}T00:00:00.000Z`,
        updatedAt: `${previousWeekStart}T00:00:00.000Z`,
        startDate: previousWeekStart,
        endDate: shiftIsoDateByDays(previousWeekStart, 6),
      } as any,
    ]

    weeklyReflectionStore.weeklyReflections = [
      {
        id: 'reflection-prev',
        createdAt: `${shiftIsoDateByDays(previousWeekStart, 6)}T10:00:00.000Z`,
        updatedAt: `${shiftIsoDateByDays(previousWeekStart, 6)}T10:00:00.000Z`,
        weeklyPlanId: 'week-prev',
        batterySnapshot: {
          body: { demand: 1, state: 5 },
          mind: { demand: 2, state: 4 },
          emotion: { demand: 3, state: 3 },
          social: { demand: 4, state: 2 },
        },
      } as any,
    ]

    render(WeeklyPlanningView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          DraftCommitmentForm: { template: '<div />' },
          DraftCommitmentCard: { template: '<div />' },
          WeeklyReviewSummary: { template: '<div />' },
        },
      },
    })

    await waitFor(() => {
      expect(screen.getByText('Battery trends')).toBeInTheDocument()
    })

    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByText('Mind')).toBeInTheDocument()
    expect(screen.getByText('Emotion')).toBeInTheDocument()
    expect(screen.getByText('Social')).toBeInTheDocument()

    expect(screen.getByText('D1')).toBeInTheDocument()
    expect(screen.getByText('S5')).toBeInTheDocument()
    expect(screen.getByText('D2')).toBeInTheDocument()
    expect(screen.getByText('S4')).toBeInTheDocument()
    expect(screen.getByText('D4')).toBeInTheDocument()
    expect(screen.getByText('S2')).toBeInTheDocument()
  })
})
