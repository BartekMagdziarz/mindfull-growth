import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue'
import PsychologicalProfileFoundationView from '../PsychologicalProfileFoundationView.vue'
import type { FoundationItemStatus } from '@/services/foundationCompleteness'

const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const foundationMock = vi.hoisted(() => ({
  statuses: [] as FoundationItemStatus[],
  loadFoundationSourceData: vi.fn(),
}))

vi.mock('@/services/foundationCompleteness', () => ({
  FOUNDATION_BUILD_FLOOR: 3,
  computeFoundationStatuses: () => foundationMock.statuses,
  foundationCompletionCount: (statuses: FoundationItemStatus[]) =>
    statuses.filter((status) => status.state === 'completed' || status.state === 'outdated')
      .length,
  loadFoundationSourceData: foundationMock.loadFoundationSourceData,
}))

function makeStatus(
  id: FoundationItemStatus['id'],
  group: FoundationItemStatus['group'],
  state: FoundationItemStatus['state'] = 'not-started',
  routeParams?: Record<string, string>,
): FoundationItemStatus {
  return {
    id,
    group,
    state,
    lastCompletedAt:
      state === 'completed' || state === 'outdated'
        ? '2026-04-10T00:00:00.000Z'
        : undefined,
    routeName: routeParams ? 'exercise-assessment' : `exercise-${id}`,
    routeParams,
  }
}

function makeStatuses(completedCount = 0): FoundationItemStatus[] {
  const items: Array<{
    id: FoundationItemStatus['id']
    group: FoundationItemStatus['group']
    routeParams?: Record<string, string>
  }> = [
    { id: 'valuesDiscovery', group: 'values' },
    { id: 'valueMap', group: 'values' },
    { id: 'transformativePurpose', group: 'values' },
    { id: 'vlq', group: 'values', routeParams: { assessmentId: 'vlq' } },
    { id: 'ipip-bfm-50', group: 'personality', routeParams: { assessmentId: 'ipip-bfm-50' } },
    { id: 'ipip-neo-120', group: 'personality', routeParams: { assessmentId: 'ipip-neo-120' } },
    { id: 'hexaco-60', group: 'personality', routeParams: { assessmentId: 'hexaco-60' } },
    { id: 'shadowBeliefs', group: 'personality' },
    { id: 'wheelOfLife', group: 'lifeBalance' },
    { id: 'pvq-40', group: 'lifeBalance', routeParams: { assessmentId: 'pvq-40' } },
  ]

  return items.map((item, index) =>
    makeStatus(
      item.id,
      item.group,
      index < completedCount ? 'completed' : 'not-started',
      item.routeParams,
    ),
  )
}

describe('PsychologicalProfileFoundationView', () => {
  beforeEach(() => {
    mockPush.mockClear()
    foundationMock.loadFoundationSourceData.mockClear()
    foundationMock.loadFoundationSourceData.mockResolvedValue(undefined)
    foundationMock.statuses = makeStatuses()
  })

  it('loads foundation source data by default on mount', async () => {
    render(PsychologicalProfileFoundationView)

    await waitFor(() => {
      expect(foundationMock.loadFoundationSourceData).toHaveBeenCalledTimes(1)
    })
  })

  it('does not load foundation source data when loadOnMount is false', async () => {
    render(PsychologicalProfileFoundationView, {
      props: {
        loadOnMount: false,
      },
    })

    await Promise.resolve()

    expect(foundationMock.loadFoundationSourceData).not.toHaveBeenCalled()
  })

  it('renders without the full-page spacing wrapper when embedded', () => {
    const { container } = render(PsychologicalProfileFoundationView, {
      props: {
        embedded: true,
        loadOnMount: false,
      },
    })

    expect(container.firstElementChild).toHaveClass('w-full')
    expect(container.firstElementChild).not.toHaveClass('px-4')
    expect(container.firstElementChild).not.toHaveClass('py-6')
    expect(container.firstElementChild).not.toHaveClass('pb-28')
  })

  it('renders the three foundation groups', () => {
    render(PsychologicalProfileFoundationView)

    expect(screen.getByText('Values & meaning')).toBeInTheDocument()
    expect(screen.getByText('Personality & lenses')).toBeInTheDocument()
    expect(screen.getByText('Life balance')).toBeInTheDocument()
  })

  it('renders tiles in the documented 4 / 4 / 2 distribution', () => {
    render(PsychologicalProfileFoundationView)

    const values = document.querySelector('[data-test-foundation-group="values"]')
    const personality = document.querySelector(
      '[data-test-foundation-group="personality"]',
    )
    const lifeBalance = document.querySelector(
      '[data-test-foundation-group="lifeBalance"]',
    )

    expect(values).toBeTruthy()
    expect(personality).toBeTruthy()
    expect(lifeBalance).toBeTruthy()
    expect(within(values as HTMLElement).getAllByRole('button')).toHaveLength(4)
    expect(within(personality as HTMLElement).getAllByRole('button')).toHaveLength(4)
    expect(within(lifeBalance as HTMLElement).getAllByRole('button')).toHaveLength(2)
  })

  it('keeps the build CTA disabled below the completion floor', () => {
    foundationMock.statuses = makeStatuses(2)

    render(PsychologicalProfileFoundationView)

    expect(
      screen.getByRole('button', {
        name: 'Complete at least 3 foundation items first',
      }),
    ).toBeDisabled()
  })

  it('navigates to the build route when the enabled build CTA is clicked', async () => {
    foundationMock.statuses = makeStatuses(3)

    render(PsychologicalProfileFoundationView)

    await fireEvent.click(
      screen.getByRole('button', { name: 'Build my first profile' }),
    )

    expect(mockPush).toHaveBeenCalledWith({ name: 'profile-psychological-build' })
  })

  it('routes to a tile target when a tile is clicked', async () => {
    render(PsychologicalProfileFoundationView)

    await fireEvent.click(screen.getByRole('button', { name: 'Valued living (VLQ)' }))

    expect(mockPush).toHaveBeenCalledWith({
      name: 'exercise-assessment',
      params: { assessmentId: 'vlq' },
    })
  })
})
