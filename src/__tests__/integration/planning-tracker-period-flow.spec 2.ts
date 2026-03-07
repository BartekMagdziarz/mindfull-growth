import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import type { Commitment, Project } from '@/domain/planning'
import ProjectTrackersPeriodSection from '@/components/planning/ProjectTrackersPeriodSection.vue'
import ProjectCard from '@/components/planning/ProjectCard.vue'
import {
  projectDexieRepository,
  trackerDexieRepository,
  trackerPeriodDexieRepository,
} from '@/repositories/planningDexieRepository'
import { connectTestDatabase } from '@/test/testDatabase'
import { useTrackerStore } from '@/stores/tracker.store'
import { computeTrackerProgressById } from '@/services/trackerRollup.service'
import { clearAllData, seedProjectsScenario } from '@/utils/seedScenarios'

const timestamp = '2026-02-01T00:00:00.000Z'

function buildProject(params: {
  id: string
  name?: string
  focusWeekIds?: string[]
  focusMonthIds?: string[]
}): Project {
  return {
    id: params.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    lifeAreaIds: [],
    priorityIds: [],
    monthIds: ['month-1'],
    name: params.name ?? `Project ${params.id}`,
    status: 'active',
    focusWeekIds: params.focusWeekIds ?? [],
    focusMonthIds: params.focusMonthIds ?? [],
  }
}

function buildCommitment(params: {
  id: string
  periodType: 'weekly' | 'monthly'
  startDate: string
  endDate: string
  projectId?: string
  weeklyPlanId?: string
  monthlyPlanId?: string
}): Commitment {
  return {
    id: params.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    startDate: params.startDate,
    endDate: params.endDate,
    periodType: params.periodType,
    projectId: params.projectId,
    weeklyPlanId: params.weeklyPlanId,
    monthlyPlanId: params.monthlyPlanId,
    lifeAreaIds: [],
    priorityIds: [],
    name: `Commitment ${params.id}`,
    status: 'planned',
  }
}

describe('Planning tracker period flows', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    const db = await connectTestDatabase()
    await Promise.all([
      db.trackers.clear(),
      db.trackerPeriods.clear(),
      db.projects.clear(),
      db.commitments.clear(),
    ])
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('logs in a selected past week and preserves prior week values after moving to next week', async () => {
    const project = buildProject({ id: 'project-1', focusWeekIds: ['week-1', 'week-2'] })

    const tracker = await trackerDexieRepository.create({
      parentType: 'project',
      parentId: project.id,
      lifeAreaIds: [],
      priorityIds: [],
      name: 'Weekly distance',
      type: 'value',
      cadence: 'weekly',
      unit: 'km',
      targetValue: 25,
      rollup: 'sum',
      sortOrder: 0,
      isActive: true,
    })

    await trackerPeriodDexieRepository.create({
      trackerId: tracker.id,
      startDate: '2026-01-26',
      endDate: '2026-02-01',
      entries: [{ value: 5, date: '2026-01-26' }],
      sourceType: 'manual',
    })

    const renderResult = render(ProjectTrackersPeriodSection, {
      props: {
        periodType: 'weekly',
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        selectedPlanId: 'week-1',
        projects: [project],
        trackers: [tracker],
        commitments: [
          buildCommitment({
            id: 'c-1',
            periodType: 'weekly',
            startDate: '2026-02-02',
            endDate: '2026-02-08',
            weeklyPlanId: 'week-1',
            projectId: project.id,
          }),
        ],
      },
    })

    await fireEvent.update(screen.getByPlaceholderText('Value (km)'), '9')
    await fireEvent.click(screen.getByRole('button', { name: 'Log value' }))

    await waitFor(async () => {
      const selectedPeriod = await trackerPeriodDexieRepository.getByTrackerIdAndPeriod(
        tracker.id,
        '2026-02-02'
      )
      expect(selectedPeriod?.entries).toHaveLength(1)
      expect(selectedPeriod?.entries?.[0].value).toBe(9)
      expect(selectedPeriod?.entries?.[0].date).toBeDefined()
    })

    renderResult.rerender({
      periodType: 'weekly',
      startDate: '2026-02-09',
      endDate: '2026-02-15',
      selectedPlanId: 'week-2',
      projects: [project],
      trackers: [tracker],
      commitments: [
        buildCommitment({
          id: 'c-2',
          periodType: 'weekly',
          startDate: '2026-02-09',
          endDate: '2026-02-15',
          weeklyPlanId: 'week-2',
          projectId: project.id,
        }),
      ],
    })

    await waitFor(() => {
      expect(screen.getAllByText(/Tracking period:/).length).toBeGreaterThan(0)
    })

    const priorWeek = await trackerPeriodDexieRepository.getByTrackerIdAndPeriod(
      tracker.id,
      '2026-02-02'
    )
    expect(priorWeek?.entries).toHaveLength(1)
    expect(priorWeek?.entries?.[0].value).toBe(9)

    const weekBefore = await trackerPeriodDexieRepository.getByTrackerIdAndPeriod(
      tracker.id,
      '2026-01-26'
    )
    expect(weekBefore?.entries).toHaveLength(1)
    expect(weekBefore?.entries?.[0].value).toBe(5)
  })

  it('stores monthly tracker logs only in the selected month period', async () => {
    const project = buildProject({ id: 'project-2', focusMonthIds: ['month-1'] })

    const tracker = await trackerDexieRepository.create({
      parentType: 'project',
      parentId: project.id,
      lifeAreaIds: [],
      priorityIds: [],
      name: 'Training runs completed',
      type: 'value',
      cadence: 'monthly',
      targetValue: 36,
      rollup: 'sum',
      sortOrder: 0,
      isActive: true,
    })

    render(ProjectTrackersPeriodSection, {
      props: {
        periodType: 'monthly',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        selectedPlanId: 'month-1',
        projects: [project],
        trackers: [tracker],
        commitments: [
          buildCommitment({
            id: 'c-1',
            periodType: 'monthly',
            startDate: '2026-02-01',
            endDate: '2026-02-28',
            monthlyPlanId: 'month-1',
            projectId: project.id,
          }),
        ],
      },
    })

    await fireEvent.update(screen.getByPlaceholderText('Value'), '4')
    await fireEvent.click(screen.getByRole('button', { name: 'Log value' }))

    await waitFor(async () => {
      const february = await trackerPeriodDexieRepository.getByTrackerIdAndPeriod(
        tracker.id,
        '2026-02-01'
      )
      expect(february?.entries).toHaveLength(1)
      expect(february?.entries?.[0].value).toBe(4)
    })

    const march = await trackerPeriodDexieRepository.getByTrackerIdAndPeriod(
      tracker.id,
      '2026-03-01'
    )
    expect(march).toBeUndefined()
  })

  it('shows project card roll-ups and no inline log form', async () => {
    const project = buildProject({ id: 'project-3', name: '5K Base Build' })

    await trackerDexieRepository.create({
      parentType: 'project',
      parentId: project.id,
      lifeAreaIds: [],
      priorityIds: [],
      name: 'Weekly running distance',
      type: 'value',
      cadence: 'weekly',
      targetValue: 25,
      unit: 'km',
      rollup: 'sum',
      sortOrder: 0,
      isActive: true,
    })

    const trackerStore = useTrackerStore()
    await trackerStore.loadTrackers()

    render(ProjectCard, {
      props: {
        project,
        availableLifeAreas: [],
        availablePriorities: [],
      },
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          InlineEditableText: {
            props: ['modelValue'],
            template: '<span>{{ modelValue }}</span>',
          },
          AnimatedStatusPicker: {
            props: ['currentStatus'],
            template: '<div>{{ currentStatus }}</div>',
          },
          LinkedObjectsSection: { template: '<div />' },
          KeyResultsEditor: { template: '<div />' },
          TrackerProgressRow: {
            props: ['title', 'type', 'currentProgress', 'trendData', 'tracker', 'startDate', 'endDate'],
            emits: ['logged'],
            template: '<div>{{ title }} {{ currentProgress?.summary }}</div>',
          },
        },
      },
    })

    await waitFor(() => {
      expect(screen.getByText(/Weekly running distance/)).toBeInTheDocument()
    })

    expect(screen.queryByText('Log Progress')).not.toBeInTheDocument()
  })

  it('supports weekly subset targets with overflow and includes overflow in monthly rollups', async () => {
    const project = buildProject({ id: 'project-4', focusWeekIds: ['week-1'], focusMonthIds: ['month-1'] })

    const tracker = await trackerDexieRepository.create({
      parentType: 'project',
      parentId: project.id,
      lifeAreaIds: [],
      priorityIds: [],
      name: 'Training runs completed',
      type: 'count',
      cadence: 'monthly',
      targetCount: 12,
      sortOrder: 0,
      isActive: true,
    })

    await trackerPeriodDexieRepository.create({
      trackerId: tracker.id,
      startDate: '2026-02-02',
      endDate: '2026-02-08',
      periodTarget: 3,
      ticks: [],
      sourceType: 'manual',
    })

    render(ProjectTrackersPeriodSection, {
      props: {
        periodType: 'weekly',
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        selectedPlanId: 'week-1',
        selectedTrackerIds: [tracker.id],
        projects: [project],
        trackers: [tracker],
        commitments: [
          buildCommitment({
            id: 'c-1',
            periodType: 'weekly',
            startDate: '2026-02-02',
            endDate: '2026-02-08',
            weeklyPlanId: 'week-1',
            projectId: project.id,
          }),
        ],
      },
    })

    await waitFor(async () => {
      const savedPeriod = await trackerPeriodDexieRepository.getByTrackerIdAndPeriod(
        tracker.id,
        '2026-02-02'
      )
      const matchingPeriods = (await trackerPeriodDexieRepository.getByTrackerId(tracker.id)).filter(
        (period) => period.startDate === '2026-02-02'
      )
      expect(matchingPeriods).toHaveLength(1)
      expect(savedPeriod?.periodTarget).toBe(3)
    })

    for (let expectedCount = 1; expectedCount <= 5; expectedCount++) {
      await fireEvent.click(screen.getByRole('button', { name: 'Add count item' }))
      await waitFor(async () => {
        const weeklyPeriod = await trackerPeriodDexieRepository.getByTrackerIdAndPeriod(
          tracker.id,
          '2026-02-02'
        )
        const completed = (weeklyPeriod?.ticks ?? []).filter((tick) => tick.completed).length
        expect(completed).toBe(expectedCount)
      })
    }

    await waitFor(async () => {
      const weeklyPeriod = await trackerPeriodDexieRepository.getByTrackerIdAndPeriod(
        tracker.id,
        '2026-02-02'
      )
      const matchingPeriods = (await trackerPeriodDexieRepository.getByTrackerId(tracker.id)).filter(
        (period) => period.startDate === '2026-02-02'
      )
      const completed = (weeklyPeriod?.ticks ?? []).filter((tick) => tick.completed).length
      expect(matchingPeriods).toHaveLength(1)
      expect(weeklyPeriod?.periodTarget).toBe(3)
      expect(completed).toBe(5)
    })

    expect(screen.getAllByRole('button', { name: /Remove count item/i })).toHaveLength(5)

    const weeklyProgress = await computeTrackerProgressById(tracker.id, {
      startDate: '2026-02-02',
      endDate: '2026-02-08',
    })
    expect(weeklyProgress?.numerator).toBe(5)
    expect(weeklyProgress?.denominator).toBe(3)
    expect(weeklyProgress?.percent).toBe(100)

    const monthlyProgress = await computeTrackerProgressById(tracker.id, {
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    })
    expect(monthlyProgress?.numerator).toBe(5)
  })

  it('renders non-empty weekly trend summaries for seeded project KRs', async () => {
    vi.setSystemTime(new Date('2026-02-05T12:00:00.000Z'))
    await clearAllData()
    await seedProjectsScenario()

    const projects = await projectDexieRepository.getAll()
    const project = projects.find((item) => item.name === '5K Base Build')
    expect(project).toBeTruthy()

    const trackerStore = useTrackerStore()
    await trackerStore.loadTrackers()

    const { container } = render(ProjectCard, {
      props: {
        project: project!,
        availableLifeAreas: [],
        availablePriorities: [],
      },
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          InlineEditableText: {
            props: ['modelValue'],
            template: '<span>{{ modelValue }}</span>',
          },
          AnimatedStatusPicker: {
            props: ['currentStatus'],
            template: '<div>{{ currentStatus }}</div>',
          },
          LinkedObjectsSection: { template: '<div />' },
          KeyResultsEditor: { template: '<div />' },
          TrackerProgressRow: {
            props: ['title', 'type', 'currentProgress', 'trendData', 'tracker', 'startDate', 'endDate'],
            emits: ['logged'],
            template: '<div>{{ title }} {{ currentProgress?.summary }}</div>',
          },
        },
      },
    })

    await waitFor(() => {
      // Verify tracker summary text is rendered (trend data was loaded)
      expect(screen.getByText(/\/3/)).toBeInTheDocument()
    })
  })
})
