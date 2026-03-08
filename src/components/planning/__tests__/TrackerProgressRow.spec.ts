import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/vue'
import TrackerProgressRow from '../TrackerProgressRow.vue'
import type { Tracker, TrackerPeriod } from '@/domain/planning'

const { mockGetByTrackerIdAndPeriod } = vi.hoisted(() => ({
  mockGetByTrackerIdAndPeriod: vi.fn<(
    trackerId: string,
    startDate: string,
  ) => Promise<TrackerPeriod | undefined>>(),
}))

vi.mock('@/repositories/planningDexieRepository', () => ({
  trackerPeriodDexieRepository: {
    getByTrackerIdAndPeriod: mockGetByTrackerIdAndPeriod,
    create: vi.fn(),
    update: vi.fn(),
  },
}))

function buildTracker(overrides: Partial<Tracker> = {}): Tracker {
  return {
    id: overrides.id ?? 'tracker-1',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    parentType: 'project',
    parentId: 'project-1',
    lifeAreaIds: [],
    priorityIds: [],
    name: overrides.name ?? 'Strength sessions',
    type: overrides.type ?? 'adherence',
    cadence: overrides.cadence ?? 'weekly',
    targetCount: overrides.targetCount ?? 3,
    tickLabels: overrides.tickLabels,
    sortOrder: overrides.sortOrder ?? 0,
    isActive: true,
  }
}

describe('TrackerProgressRow', () => {
  beforeEach(() => {
    mockGetByTrackerIdAndPeriod.mockReset()
    mockGetByTrackerIdAndPeriod.mockResolvedValue(undefined)
  })

  it('renders the current progress bar with the neumorphic fill styling', async () => {
    const { container } = render(TrackerProgressRow, {
      props: {
        title: 'Strength sessions',
        type: 'adherence',
        currentProgress: {
          summary: '2/3',
          percent: 67,
          numerator: 2,
          denominator: 3,
        },
        tracker: buildTracker(),
        startDate: '2026-02-09',
        endDate: '2026-02-15',
      },
    })

    const fill = await vi.waitFor(() => container.querySelector('.neo-progress-fill'))
    expect(fill).not.toBeNull()
    expect(fill).toHaveStyle({
      width: '67%',
      minWidth: '2px',
    })
  })
})
