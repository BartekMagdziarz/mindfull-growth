import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import ProjectTrackerManagerView from '@/views/ProjectTrackerManagerView.vue'
import { useProjectStore } from '@/stores/project.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { useMonthlyPlanStore } from '@/stores/monthlyPlan.store'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'

const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe('ProjectTrackerManagerView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())

    const projectStore = useProjectStore()
    const trackerStore = useTrackerStore()
    const monthlyPlanStore = useMonthlyPlanStore()
    const weeklyPlanStore = useWeeklyPlanStore()
    const lifeAreaStore = useLifeAreaStore()
    const priorityStore = usePriorityStore()

    vi.spyOn(projectStore, 'loadProjects').mockResolvedValue()
    vi.spyOn(trackerStore, 'loadTrackers').mockResolvedValue()
    vi.spyOn(monthlyPlanStore, 'loadMonthlyPlans').mockResolvedValue()
    vi.spyOn(weeklyPlanStore, 'loadWeeklyPlans').mockResolvedValue()
    vi.spyOn(lifeAreaStore, 'loadLifeAreas').mockResolvedValue()
    vi.spyOn(priorityStore, 'loadPriorities').mockResolvedValue()

    vi.spyOn(projectStore, 'updateProject').mockImplementation(async (id, data) => {
      const index = projectStore.projects.findIndex((project) => project.id === id)
      if (index === -1) throw new Error('Project not found')
      const updated = {
        ...projectStore.projects[index],
        ...data,
        updatedAt: '2026-02-01T00:00:00.000Z',
      }
      projectStore.projects[index] = updated as any
      return updated as any
    })

    vi.spyOn(monthlyPlanStore, 'updateMonthlyPlan').mockImplementation(async (id, data) => {
      const index = monthlyPlanStore.monthlyPlans.findIndex((plan) => plan.id === id)
      if (index === -1) throw new Error('Plan not found')
      const updated = {
        ...monthlyPlanStore.monthlyPlans[index],
        ...data,
        updatedAt: '2026-02-01T00:00:00.000Z',
      }
      monthlyPlanStore.monthlyPlans[index] = updated as any
      return updated as any
    })
  })

  it('links tracker to monthly plan and auto-links parent project to month/focus tags', async () => {
    const projectStore = useProjectStore()
    const trackerStore = useTrackerStore()
    const monthlyPlanStore = useMonthlyPlanStore()
    const weeklyPlanStore = useWeeklyPlanStore()

    projectStore.projects = [
      {
        id: 'project-1',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        lifeAreaIds: [],
        priorityIds: [],
        monthIds: [],
        name: '5K Base Build',
        objective: 'Objective',
        status: 'active',
        focusWeekIds: [],
        focusMonthIds: [],
      },
    ]

    trackerStore.trackers = [
      {
        id: 'tracker-1',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        parentType: 'project',
        parentId: 'project-1',
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Training runs completed',
        type: 'count',
        cadence: 'monthly',
        targetCount: 12,
        sortOrder: 0,
        isActive: true,
      },
    ]

    monthlyPlanStore.monthlyPlans = [
      {
        id: 'month-1',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        year: 2026,
        projectIds: ['project-1'],
        secondaryFocusLifeAreaIds: [],
        selectedTrackerIds: [],
      },
    ]

    weeklyPlanStore.weeklyPlans = [
      {
        id: 'week-1',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        startDate: '2026-02-03',
        endDate: '2026-02-09',
      },
    ]

    const AppSnackbarStub = defineComponent({
      name: 'AppSnackbarStub',
      methods: {
        show: vi.fn(),
      },
      template: '<div />',
    })

    render(ProjectTrackerManagerView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button v-bind="$attrs"><slot /></button>' },
          AppSnackbar: AppSnackbarStub,
          KeyResultsEditor: { template: '<div />' },
        },
      },
    })

    await screen.findByText('5K Base Build')
    await screen.findAllByText('Training runs completed')

    const monthlyPeriodSelect = screen.getByRole('combobox', {
      name: 'Select monthly period for Training runs completed',
    })
    await fireEvent.update(monthlyPeriodSelect, 'month-1')
    await fireEvent.click(
      screen.getByRole('button', {
        name: 'Add monthly period for Training runs completed',
      })
    )

    await waitFor(() => {
      expect(monthlyPlanStore.updateMonthlyPlan).toHaveBeenCalledWith('month-1', {
        selectedTrackerIds: ['tracker-1'],
      })
    })

    await waitFor(() => {
      expect(projectStore.updateProject).toHaveBeenCalledWith('project-1', {
        monthIds: ['month-1'],
        focusMonthIds: ['month-1'],
      })
    })
  })
})
