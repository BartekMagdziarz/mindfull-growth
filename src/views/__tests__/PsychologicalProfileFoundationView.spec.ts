import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/vue'
import PsychologicalProfileFoundationView from '../PsychologicalProfileFoundationView.vue'
import type {
  FoundationItemStatus,
  FoundationVariant,
} from '@/services/foundationCompleteness'

const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const foundationMock = vi.hoisted(() => ({
  statuses: [] as FoundationItemStatus[],
  loadFoundationSourceData: vi.fn(),
}))

vi.mock('@/services/foundationCompleteness', () => {
  const GROUP_ORDER = ['values', 'meaning', 'personality', 'emotions', 'relationships', 'lifeBalance'] as const
  const groupProgress = (statuses: FoundationItemStatus[]) =>
    GROUP_ORDER.map((group) => {
      const inGroup = statuses.filter((status) => status.group === group)
      const completed = inGroup.filter(
        (status) => status.state === 'completed' || status.state === 'outdated',
      ).length
      return { group, total: inGroup.length, completed, minRequired: 1, satisfied: completed >= 1 }
    })
  return {
    FOUNDATION_GROUP_ORDER: GROUP_ORDER,
    FOUNDATION_COMING_SOON_ORDER: [] as const,
    FOUNDATION_GROUP_MIN_REQUIRED: { values: 1, meaning: 1, personality: 1, emotions: 1, relationships: 1, lifeBalance: 1 },
    computeFoundationStatuses: () => foundationMock.statuses,
    computeFoundationGroupProgress: groupProgress,
    isFoundationBuildUnlocked: (statuses: FoundationItemStatus[]) =>
      groupProgress(statuses).every((g) => g.satisfied),
    loadFoundationSourceData: foundationMock.loadFoundationSourceData,
  }
})

const BIG_FIVE_VARIANTS: FoundationVariant[] = [
  { assessmentId: 'ipip-bfm-50', routeName: 'exercise-assessment', routeParams: { assessmentId: 'ipip-bfm-50' } },
  { assessmentId: 'ipip-neo-120', routeName: 'exercise-assessment', routeParams: { assessmentId: 'ipip-neo-120' } },
]

interface ItemSpec {
  id: FoundationItemStatus['id']
  group: FoundationItemStatus['group']
  routeName: string
  routeParams?: Record<string, string>
  variants?: FoundationVariant[]
}

const ITEMS: ItemSpec[] = [
  { id: 'valuesDiscovery', group: 'values', routeName: 'exercise-values' },
  { id: 'valueMap', group: 'values', routeName: 'exercise-value-map' },
  { id: 'pvq-40', group: 'values', routeName: 'exercise-assessment', routeParams: { assessmentId: 'pvq-40' } },
  { id: 'transformativePurpose', group: 'meaning', routeName: 'exercise-purpose' },
  { id: 'threePathways', group: 'meaning', routeName: 'exercise-three-pathways' },
  { id: 'mountainRange', group: 'meaning', routeName: 'exercise-mountain-range' },
  { id: 'bigFive', group: 'personality', routeName: 'exercise-assessment', routeParams: { assessmentId: 'ipip-bfm-50' }, variants: BIG_FIVE_VARIANTS },
  { id: 'hexaco-60', group: 'personality', routeName: 'exercise-assessment', routeParams: { assessmentId: 'hexaco-60' } },
  { id: 'shadowBeliefs', group: 'personality', routeName: 'exercise-shadow-beliefs' },
  { id: 'ifsPartsMap', group: 'personality', routeName: 'exercise-parts-mapping' },
  { id: 'ipip-via', group: 'personality', routeName: 'exercise-assessment', routeParams: { assessmentId: 'ipip-via' } },
  { id: 'erq', group: 'emotions', routeName: 'exercise-assessment', routeParams: { assessmentId: 'erq' } },
  { id: 'rrq', group: 'emotions', routeName: 'exercise-assessment', routeParams: { assessmentId: 'rrq' } },
  { id: 'ecr-rs', group: 'relationships', routeName: 'exercise-assessment', routeParams: { assessmentId: 'ecr-rs' } },
  { id: 'wheelOfLife', group: 'lifeBalance', routeName: 'exercise-wheel-of-life' },
  { id: 'vlq', group: 'lifeBalance', routeName: 'exercise-assessment', routeParams: { assessmentId: 'vlq' } },
]

const FIRST_OF_GROUP = new Set(['valuesDiscovery', 'transformativePurpose', 'bigFive', 'erq', 'ecr-rs', 'wheelOfLife'])

function makeStatuses(coverEveryGroup = false): FoundationItemStatus[] {
  return ITEMS.map((item) => {
    const completed = coverEveryGroup && FIRST_OF_GROUP.has(item.id)
    return {
      id: item.id,
      group: item.group,
      state: completed ? 'completed' : 'not-started',
      lastCompletedAt: completed ? '2026-04-10T00:00:00.000Z' : undefined,
      routeName: item.routeName,
      routeParams: item.routeParams,
      variants: item.variants,
    }
  })
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
    render(PsychologicalProfileFoundationView, { props: { loadOnMount: false } })

    await Promise.resolve()

    expect(foundationMock.loadFoundationSourceData).not.toHaveBeenCalled()
  })

  it('renders without the full-page spacing wrapper when embedded', () => {
    const { container } = render(PsychologicalProfileFoundationView, {
      props: { embedded: true, loadOnMount: false },
    })

    expect(container.firstElementChild).toHaveClass('w-full')
    expect(container.firstElementChild).not.toHaveClass('px-4')
  })

  it('renders the six foundation group headers', () => {
    render(PsychologicalProfileFoundationView)

    const header = (group: string) =>
      document
        .querySelector(`[data-test-foundation-group="${group}"] h2`)
        ?.textContent?.trim()

    expect(header('values')).toBe('Values')
    expect(header('meaning')).toBe('Meaning & direction')
    expect(header('personality')).toBe('Personality & lenses')
    expect(header('emotions')).toBe('Emotions & regulation')
    expect(header('relationships')).toBe('Relationships & bonds')
    expect(header('lifeBalance')).toBe('Life balance')
  })

  it('renders tiles in the documented 3 / 3 / 5 / 2 / 1 / 2 distribution', () => {
    render(PsychologicalProfileFoundationView)

    const tilesIn = (group: string) =>
      document
        .querySelector(`[data-test-foundation-group="${group}"]`)!
        .querySelectorAll('[data-test-foundation-item]').length

    expect(tilesIn('values')).toBe(3)
    expect(tilesIn('meaning')).toBe(3)
    expect(tilesIn('personality')).toBe(5)
    expect(tilesIn('emotions')).toBe(2)
    expect(tilesIn('relationships')).toBe(1)
    expect(tilesIn('lifeBalance')).toBe(2)
  })

  it('hides the coming-soon roadmap section when no roadmap groups remain', () => {
    render(PsychologicalProfileFoundationView)

    expect(document.querySelector('[data-test-foundation-coming-soon]')).toBeNull()
  })

  it('keeps the build CTA disabled until every group is covered', () => {
    render(PsychologicalProfileFoundationView)

    expect(
      screen.getByRole('button', {
        name: 'Complete one exercise in each group to unlock',
      }),
    ).toBeDisabled()
  })

  it('navigates to the build route when the unlocked build CTA is clicked', async () => {
    foundationMock.statuses = makeStatuses(true)

    render(PsychologicalProfileFoundationView)

    await fireEvent.click(
      screen.getByRole('button', { name: 'Build my first profile' }),
    )

    expect(mockPush).toHaveBeenCalledWith({ name: 'profile-psychological-build' })
  })

  it('routes to a tile target when a standard tile is clicked', async () => {
    render(PsychologicalProfileFoundationView)

    await fireEvent.click(screen.getByRole('button', { name: 'Valued living (VLQ)' }))

    expect(mockPush).toHaveBeenCalledWith({
      name: 'exercise-assessment',
      params: { assessmentId: 'vlq' },
    })
  })

  it('routes to the chosen depth when a Big Five variant is clicked', async () => {
    render(PsychologicalProfileFoundationView)

    await fireEvent.click(
      screen.getByRole('button', { name: 'Big Five (personality): Full test' }),
    )

    expect(mockPush).toHaveBeenCalledWith({
      name: 'exercise-assessment',
      params: { assessmentId: 'ipip-neo-120' },
    })
  })
})
