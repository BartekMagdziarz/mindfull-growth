import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import WeeklyReflectionView from '../WeeklyReflectionView.vue'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import { useWeeklyReflectionStore } from '@/stores/weeklyReflection.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useProjectStore } from '@/stores/project.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useIFSDailyCheckInStore } from '@/stores/ifsDailyCheckIn.store'
import { useIFSSelfEnergyStore } from '@/stores/ifsSelfEnergy.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'

const mockPush = vi.fn()
const mockRoute = {
  params: { planId: 'plan-1' } as Record<string, string>,
}

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => mockRoute,
}))

describe('WeeklyReflectionView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockReset()

    const weeklyPlanStore = useWeeklyPlanStore()
    const weeklyReflectionStore = useWeeklyReflectionStore()
    const commitmentStore = useCommitmentStore()
    const projectStore = useProjectStore()
    const lifeAreaStore = useLifeAreaStore()
    const priorityStore = usePriorityStore()
    const journalStore = useJournalStore()
    const emotionLogStore = useEmotionLogStore()
    const emotionStore = useEmotionStore()
    const ifsDailyCheckInStore = useIFSDailyCheckInStore()
    const ifsSelfEnergyStore = useIFSSelfEnergyStore()
    const ifsPartStore = useIFSPartStore()

    vi.spyOn(weeklyPlanStore, 'loadWeeklyPlans').mockResolvedValue()
    vi.spyOn(weeklyReflectionStore, 'loadReflectionByPlanId').mockResolvedValue(undefined)
    vi.spyOn(weeklyReflectionStore, 'createReflection').mockResolvedValue({
      id: 'reflection-1',
      createdAt: '2026-02-08T12:00:00.000Z',
      updatedAt: '2026-02-08T12:00:00.000Z',
      weeklyPlanId: 'plan-1',
      completedAt: '2026-02-08T12:00:00.000Z',
    } as any)
    vi.spyOn(commitmentStore, 'loadCommitments').mockResolvedValue()
    vi.spyOn(projectStore, 'loadProjects').mockResolvedValue()
    vi.spyOn(lifeAreaStore, 'loadLifeAreas').mockResolvedValue()
    vi.spyOn(priorityStore, 'loadPriorities').mockResolvedValue()
    vi.spyOn(journalStore, 'loadEntries').mockResolvedValue()
    vi.spyOn(emotionLogStore, 'loadLogs').mockResolvedValue()
    vi.spyOn(emotionStore, 'loadEmotions').mockResolvedValue()
    vi.spyOn(ifsDailyCheckInStore, 'loadCheckIns').mockResolvedValue()
    vi.spyOn(ifsSelfEnergyStore, 'loadCheckIns').mockResolvedValue()
    vi.spyOn(ifsPartStore, 'loadParts').mockResolvedValue()

    weeklyPlanStore.weeklyPlans = []
  })

  it('renders the empty state when no weekly plan exists', async () => {
    render(WeeklyReflectionView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          SelfEnergyWheel: { template: '<div />' },
          PartRoleBadge: { template: '<div />' },
        },
      },
    })

    await waitFor(() => {
      expect(screen.getByText('No Weekly Plan Yet')).toBeInTheDocument()
    })
  })

  it('blocks completion when battery ratings are missing', async () => {
    const weeklyPlanStore = useWeeklyPlanStore()
    const weeklyReflectionStore = useWeeklyReflectionStore()

    weeklyPlanStore.weeklyPlans = [
      {
        id: 'plan-1',
        createdAt: '2026-02-02T00:00:00.000Z',
        updatedAt: '2026-02-02T00:00:00.000Z',
        startDate: '2026-02-02',
        endDate: '2026-02-08',
      } as any,
    ]

    render(WeeklyReflectionView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          SelfEnergyWheel: { template: '<div />' },
          PartRoleBadge: { template: '<div />' },
        },
      },
    })

    await waitFor(() => {
      expect(screen.getByText('Battery Check-In')).toBeInTheDocument()
    })

    const completeButton = screen.getByText('Complete Reflection').closest('button')
    expect(completeButton).toBeDisabled()

    expect(weeklyReflectionStore.createReflection).not.toHaveBeenCalled()
    expect(screen.getByText('8 rating still missing before completion.')).toBeInTheDocument()
  })

  it('includes battery snapshot and battery prompts in completion payload', async () => {
    const weeklyPlanStore = useWeeklyPlanStore()
    const weeklyReflectionStore = useWeeklyReflectionStore()

    weeklyPlanStore.weeklyPlans = [
      {
        id: 'plan-1',
        createdAt: '2026-02-02T00:00:00.000Z',
        updatedAt: '2026-02-02T00:00:00.000Z',
        startDate: '2026-02-02',
        endDate: '2026-02-08',
      } as any,
    ]

    render(WeeklyReflectionView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          SelfEnergyWheel: { template: '<div />' },
          PartRoleBadge: { template: '<div />' },
        },
      },
    })

    await waitFor(() => {
      expect(screen.getByText('Battery Check-In')).toBeInTheDocument()
    })

    const batteries = ['body', 'mind', 'emotion', 'social'] as const
    for (const battery of batteries) {
      for (let i = 0; i < 3; i += 1) {
        await fireEvent.click(screen.getByTestId(`battery-${battery}-demand-plus`))
      }
      for (let i = 0; i < 4; i += 1) {
        await fireEvent.click(screen.getByTestId(`battery-${battery}-state-plus`))
      }
    }

    await fireEvent.update(screen.getByTestId('battery-note-body'), 'Low sleep quality')
    await fireEvent.update(screen.getByTestId('battery-note-mind'), 'Context switching')
    await fireEvent.update(screen.getByTestId('battery-note-emotion'), 'Family conflict')
    await fireEvent.update(screen.getByTestId('battery-note-social'), 'Helpful conversations')

    await fireEvent.update(
      screen.getByPlaceholderText('Patterns, people, tasks, or contexts that consumed energy...'),
      'Overloaded calendar'
    )
    await fireEvent.update(
      screen.getByPlaceholderText('Practices, support, environments, or actions that restored you...'),
      'Walks and sleep'
    )
    await fireEvent.update(
      screen.getByPlaceholderText('A boundary, request, schedule guard, or support you will use...'),
      'No meetings after 5 PM'
    )

    await fireEvent.click(screen.getByText('Complete Reflection'))

    await waitFor(() => {
      expect(weeklyReflectionStore.createReflection).toHaveBeenCalledTimes(1)
    })

    expect(weeklyReflectionStore.createReflection).toHaveBeenCalledWith(
      expect.objectContaining({
        weeklyPlanId: 'plan-1',
        batterySnapshot: {
          body: { demand: 3, state: 4, note: 'Low sleep quality' },
          mind: { demand: 3, state: 4, note: 'Context switching' },
          emotion: { demand: 3, state: 4, note: 'Family conflict' },
          social: { demand: 3, state: 4, note: 'Helpful conversations' },
        },
        batteryDrainers: 'Overloaded calendar',
        batteryRechargers: 'Walks and sleep',
        batteryBoundaryNextWeek: 'No meetings after 5 PM',
      })
    )
  })
})
