import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/vue'
import ProjectTrackersPeriodSection from '@/components/planning/ProjectTrackersPeriodSection.vue'
import type { Commitment, Project, Tracker } from '@/domain/planning'
import {
  trackerDexieRepository,
  trackerPeriodDexieRepository,
} from '@/repositories/planningDexieRepository'
import { connectTestDatabase } from '@/test/testDatabase'

const timestamp = '2026-02-01T00:00:00.000Z'

function buildProject(params: {
  id: string
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
    name: `Project ${params.id}`,
    status: 'active',
    focusWeekIds: params.focusWeekIds ?? [],
    focusMonthIds: params.focusMonthIds ?? [],
  }
}

function buildTracker(params: {
  id: string
  parentId: string
  cadence: Tracker['cadence']
  type?: Tracker['type']
}): Tracker {
  return {
    id: params.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    parentType: 'project',
    parentId: params.parentId,
    lifeAreaIds: [],
    priorityIds: [],
    name: `Tracker ${params.id}`,
    type: params.type ?? 'count',
    cadence: params.cadence,
    targetCount: 3,
    sortOrder: 0,
    isActive: true,
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

describe('ProjectTrackersPeriodSection', () => {
  beforeEach(async () => {
    const db = await connectTestDatabase()
    await db.trackers.clear()
    await db.trackerPeriods.clear()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('includes weekly and monthly trackers in weekly mode', () => {
    const project = buildProject({ id: 'p-1', focusWeekIds: ['week-1'] })
    const trackers = [
      buildTracker({ id: 't-week', parentId: 'p-1', cadence: 'weekly' }),
      buildTracker({ id: 't-month', parentId: 'p-1', cadence: 'monthly' }),
    ]

    render(ProjectTrackersPeriodSection, {
      props: {
        periodType: 'weekly',
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        selectedPlanId: 'week-1',
        projects: [project],
        trackers,
        commitments: [],
      },
      global: {
        stubs: {
          ProjectTrackerPeriodCard: {
            props: ['tracker'],
            template: '<div data-testid="period-card">{{ tracker.cadence }}</div>',
          },
        },
      },
    })

    const cards = screen.getAllByTestId('period-card')
    expect(cards).toHaveLength(2)
    expect(screen.getByText('weekly')).toBeInTheDocument()
    expect(screen.getByText('monthly')).toBeInTheDocument()
  })

  it('uses explicit selected tracker ids when provided', () => {
    const project = buildProject({ id: 'p-1', focusWeekIds: ['week-1'] })
    const trackers = [
      buildTracker({ id: 't-week', parentId: 'p-1', cadence: 'weekly' }),
      buildTracker({ id: 't-month', parentId: 'p-1', cadence: 'monthly' }),
    ]

    render(ProjectTrackersPeriodSection, {
      props: {
        periodType: 'weekly',
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        selectedPlanId: 'week-1',
        selectedTrackerIds: ['t-month'],
        projects: [project],
        trackers,
        commitments: [],
      },
      global: {
        stubs: {
          ProjectTrackerPeriodCard: {
            props: ['tracker'],
            template: '<div data-testid="period-card">{{ tracker.id }}</div>',
          },
        },
      },
    })

    const cards = screen.getAllByTestId('period-card')
    expect(cards).toHaveLength(1)
    expect(screen.getByText('t-month')).toBeInTheDocument()
    expect(screen.queryByText('t-week')).not.toBeInTheDocument()
  })

  it('emits selection repair fallback when explicit ids become empty after reconciliation', () => {
    const project = buildProject({ id: 'p-1', focusWeekIds: ['week-1'] })
    const trackers = [buildTracker({ id: 't-week', parentId: 'p-1', cadence: 'weekly' })]
    const onSelectionRepaired = vi.fn()

    render(ProjectTrackersPeriodSection, {
      props: {
        periodType: 'weekly',
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        selectedPlanId: 'week-1',
        selectedTrackerIds: ['missing-tracker'],
        projects: [project],
        trackers,
        commitments: [],
        onSelectionRepaired,
      },
      global: {
        stubs: {
          ProjectTrackerPeriodCard: {
            props: ['tracker'],
            template: '<div data-testid=\"period-card\">{{ tracker.id }}</div>',
          },
        },
      },
    })

    expect(onSelectionRepaired).toHaveBeenCalledTimes(1)
    expect(onSelectionRepaired).toHaveBeenCalledWith({
      trackerIds: ['t-week'],
      mode: 'fallback',
    })
  })

  it('does not emit repair while eligible trackers are empty', () => {
    const project = buildProject({ id: 'p-1', focusWeekIds: ['week-1'] })
    const onSelectionRepaired = vi.fn()

    render(ProjectTrackersPeriodSection, {
      props: {
        periodType: 'weekly',
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        selectedPlanId: 'week-1',
        selectedTrackerIds: ['missing-tracker'],
        projects: [project],
        trackers: [],
        commitments: [],
        onSelectionRepaired,
      },
      global: {
        stubs: {
          ProjectTrackerPeriodCard: {
            props: ['tracker'],
            template: '<div data-testid=\"period-card\">{{ tracker.id }}</div>',
          },
        },
      },
    })

    expect(onSelectionRepaired).not.toHaveBeenCalled()
  })

  it('emits selection repair prune when explicit ids include stale trackers', () => {
    const project = buildProject({ id: 'p-1', focusWeekIds: ['week-1'] })
    const trackers = [buildTracker({ id: 't-week', parentId: 'p-1', cadence: 'weekly' })]
    const onSelectionRepaired = vi.fn()

    render(ProjectTrackersPeriodSection, {
      props: {
        periodType: 'weekly',
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        selectedPlanId: 'week-1',
        selectedTrackerIds: ['t-week', 'missing-tracker'],
        projects: [project],
        trackers,
        commitments: [],
        onSelectionRepaired,
      },
      global: {
        stubs: {
          ProjectTrackerPeriodCard: {
            props: ['tracker'],
            template: '<div data-testid=\"period-card\">{{ tracker.id }}</div>',
          },
        },
      },
    })

    expect(onSelectionRepaired).toHaveBeenCalledTimes(1)
    expect(onSelectionRepaired).toHaveBeenCalledWith({
      trackerIds: ['t-week'],
      mode: 'pruned',
    })
  })

  it('filters to monthly trackers in monthly mode', () => {
    const project = buildProject({ id: 'p-1', focusMonthIds: ['month-1'] })
    const trackers = [
      buildTracker({ id: 't-week', parentId: 'p-1', cadence: 'weekly' }),
      buildTracker({ id: 't-month', parentId: 'p-1', cadence: 'monthly' }),
    ]

    render(ProjectTrackersPeriodSection, {
      props: {
        periodType: 'monthly',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        selectedPlanId: 'month-1',
        projects: [project],
        trackers,
        commitments: [],
      },
      global: {
        stubs: {
          ProjectTrackerPeriodCard: {
            props: ['tracker'],
            template: '<div data-testid="period-card">{{ tracker.cadence }}</div>',
          },
        },
      },
    })

    const cards = screen.getAllByTestId('period-card')
    expect(cards).toHaveLength(1)
    expect(screen.getByText('monthly')).toBeInTheDocument()
    expect(screen.queryByText('weekly')).not.toBeInTheDocument()
  })

  it('shows explicit period label', () => {
    render(ProjectTrackersPeriodSection, {
      props: {
        periodType: 'weekly',
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        selectedPlanId: undefined,
        projects: [],
        trackers: [],
        commitments: [],
      },
    })

    expect(screen.getByText(/Tracking period:/)).toBeInTheDocument()
  })

  it('applies compact responsive grid classes by default', () => {
    const project = buildProject({ id: 'p-1', focusWeekIds: ['week-1'] })
    const trackers = [buildTracker({ id: 't-week', parentId: 'p-1', cadence: 'weekly' })]

    render(ProjectTrackersPeriodSection, {
      props: {
        periodType: 'weekly',
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        selectedPlanId: 'week-1',
        projects: [project],
        trackers,
        commitments: [],
      },
      global: {
        stubs: {
          ProjectTrackerPeriodCard: {
            props: ['tracker'],
            template: '<div data-testid="period-card">{{ tracker.id }}</div>',
          },
        },
      },
    })

    const grid = screen.getByTestId('period-card').closest('.grid')
    expect(grid).not.toBeNull()
    expect(grid?.className).toContain('md:grid-cols-2')
    expect(grid?.className).toContain('xl:grid-cols-3')
  })

  it('logs updates only to the selected period record', async () => {
    const project = buildProject({ id: 'p-1', focusWeekIds: ['week-1'] })

    const tracker = await trackerDexieRepository.create({
      parentType: 'project',
      parentId: project.id,
      lifeAreaIds: [],
      priorityIds: [],
      name: 'Distance',
      type: 'value',
      cadence: 'weekly',
      unit: 'km',
      rollup: 'sum',
      targetValue: 25,
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

    render(ProjectTrackersPeriodSection, {
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
      const selected = await trackerPeriodDexieRepository.getByTrackerIdAndPeriod(
        tracker.id,
        '2026-02-02'
      )
      expect(selected?.entries).toHaveLength(1)
      expect(selected?.entries?.[0].value).toBe(9)
      expect(selected?.entries?.[0].date).toBeDefined()
    })

    const previous = await trackerPeriodDexieRepository.getByTrackerIdAndPeriod(
      tracker.id,
      '2026-01-26'
    )
    expect(previous?.entries).toHaveLength(1)
    expect(previous?.entries?.[0].value).toBe(5)
  })
})
