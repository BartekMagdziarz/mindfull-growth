import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/vue'
import ProjectTrackerPeriodCard from '../ProjectTrackerPeriodCard.vue'
import type { Tracker, TrackerPeriod } from '@/domain/planning'

const periodStore = vi.hoisted(() => {
  const byKey = new Map<string, TrackerPeriod>()
  const byId = new Map<string, TrackerPeriod>()
  return {
    byKey,
    byId,
    nextId: 1,
    clear() {
      byKey.clear()
      byId.clear()
      this.nextId = 1
    },
  }
})

const {
  mockGetByTrackerIdAndPeriod,
  mockCreatePeriod,
  mockUpdatePeriod,
  mockComputeTrackerProgressById,
} = vi.hoisted(() => ({
  mockGetByTrackerIdAndPeriod: vi.fn(async (trackerId: string, startDate: string) => {
    return periodStore.byKey.get(`${trackerId}:${startDate}`)
  }),
  mockCreatePeriod: vi.fn(async (payload: Omit<TrackerPeriod, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = '2026-02-10T00:00:00.000Z'
    const created: TrackerPeriod = {
      id: `period-${periodStore.nextId++}`,
      createdAt: now,
      updatedAt: now,
      ...payload,
    }
    periodStore.byId.set(created.id, created)
    periodStore.byKey.set(`${created.trackerId}:${created.startDate}`, created)
    return created
  }),
  mockUpdatePeriod: vi.fn(async (id: string, update: Partial<TrackerPeriod>) => {
    const existing = periodStore.byId.get(id)
    if (!existing) {
      throw new Error(`Missing period ${id}`)
    }
    const updated: TrackerPeriod = {
      ...existing,
      ...update,
      updatedAt: '2026-02-10T00:00:00.000Z',
    }
    periodStore.byId.set(updated.id, updated)
    periodStore.byKey.set(`${updated.trackerId}:${updated.startDate}`, updated)
    return updated
  }),
  mockComputeTrackerProgressById: vi.fn(),
}))

vi.mock('@/repositories/planningDexieRepository', () => ({
  trackerPeriodDexieRepository: {
    getByTrackerIdAndPeriod: mockGetByTrackerIdAndPeriod,
    create: mockCreatePeriod,
    update: mockUpdatePeriod,
  },
}))

vi.mock('@/services/trackerRollup.service', () => ({
  computeTrackerProgressById: mockComputeTrackerProgressById,
}))

const stubs = {
  AppCard: { template: '<div><slot /></div>' },
  TrackerDisplay: {
    template: '<div data-testid="tracker-display" />',
  },
}

function buildTracker(overrides: Partial<Tracker> = {}): Tracker {
  return {
    id: overrides.id ?? 'tracker-1',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    parentType: 'project',
    parentId: 'project-1',
    lifeAreaIds: [],
    priorityIds: [],
    name: overrides.name ?? 'Session quality',
    type: overrides.type ?? 'rating',
    cadence: overrides.cadence ?? 'weekly',
    ratingScaleMin: overrides.ratingScaleMin,
    ratingScaleMax: overrides.ratingScaleMax,
    targetCount: overrides.targetCount,
    tickLabels: overrides.tickLabels,
    sortOrder: overrides.sortOrder ?? 0,
    isActive: true,
  }
}

describe('ProjectTrackerPeriodCard', () => {
  beforeEach(() => {
    periodStore.clear()
    mockGetByTrackerIdAndPeriod.mockClear()
    mockCreatePeriod.mockClear()
    mockUpdatePeriod.mockClear()
    mockComputeTrackerProgressById.mockReset()
    mockComputeTrackerProgressById.mockResolvedValue({
      trackerId: 'tracker-1',
      type: 'rating',
      cadence: 'weekly',
      percent: 60,
      summary: '6/10',
    })
  })

  it('keeps rating quick log to a single visible interaction surface', () => {
    const tracker = buildTracker({
      id: 'rating-1',
      type: 'rating',
      ratingScaleMin: 1,
      ratingScaleMax: 10,
    })

    render(ProjectTrackerPeriodCard, {
      props: {
        tracker,
        periodType: 'weekly',
        startDate: '2026-02-09',
        endDate: '2026-02-15',
      },
      global: { stubs },
    })

    expect(screen.getAllByRole('slider')).toHaveLength(1)
    expect(screen.queryByText('6/10')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tracker-display')).not.toBeInTheDocument()
  })

  it('emits logged on successful quick log action', async () => {
    const tracker = buildTracker({
      id: 'rating-emit',
      type: 'rating',
      ratingScaleMin: 1,
      ratingScaleMax: 10,
    })
    const onLogged = vi.fn()

    render(ProjectTrackerPeriodCard, {
      props: {
        tracker,
        periodType: 'weekly',
        startDate: '2026-02-09',
        endDate: '2026-02-15',
        onLogged,
      },
      global: { stubs },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Log rating' }))

    await waitFor(() => {
      expect(onLogged).toHaveBeenCalledWith(tracker.id)
    })
  })
})
