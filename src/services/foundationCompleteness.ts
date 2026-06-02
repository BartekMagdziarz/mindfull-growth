import { useValuesDiscoveryStore } from '@/stores/valuesDiscovery.store'
import { useValueMapStore } from '@/stores/valueMap.store'
import { useLifeAreaAssessmentStore } from '@/stores/lifeAreaAssessment.store'
import { useShadowBeliefsStore } from '@/stores/shadowBeliefs.store'
import { useTransformativePurposeStore } from '@/stores/transformativePurpose.store'
import { useThreePathwaysStore } from '@/stores/threePathways.store'
import { useMountainRangeStore } from '@/stores/mountainRange.store'
import { useIFSPartsMapStore } from '@/stores/ifsPartsMap.store'
import { useAssessmentStore } from '@/stores/assessment.store'
import type { AssessmentId } from '@/domain/assessments'

export const FOUNDATION_OUTDATED_DAYS = 180

/**
 * Active foundation groups, in display order. Each group is a distinct
 * "dimension" of self-knowledge fed into the profile. The build unlocks only
 * once EVERY group is satisfied (see `isFoundationBuildUnlocked`) — coverage,
 * not raw count, so a lopsided run (e.g. three personality tests, nothing
 * else) can no longer unlock a one-sided portrait.
 */
export type FoundationGroup =
  | 'values'
  | 'meaning'
  | 'personality'
  | 'emotions'
  | 'relationships'
  | 'lifeBalance'

export const FOUNDATION_GROUP_ORDER: readonly FoundationGroup[] = [
  'values',
  'meaning',
  'personality',
  'emotions',
  'relationships',
  'lifeBalance',
] as const

/**
 * Minimum completed (or outdated) items per group for that group to count as
 * "satisfied". A `Record` (not a single constant) so future groups — or a
 * decision to require, say, 2 personality items — can tune one dimension
 * without touching the others.
 */
export const FOUNDATION_GROUP_MIN_REQUIRED: Record<FoundationGroup, number> = {
  values: 1,
  meaning: 1,
  personality: 1,
  emotions: 1,
  relationships: 1,
  lifeBalance: 1,
}

/**
 * Roadmap dimensions we don't yet have instruments for. Rendered as locked
 * "coming soon" teasers so the structure (and the gaps) are visible, but they
 * never count toward completion or the unlock.
 *
 * The original gap (emotions, strengths, relationships) has now been filled:
 * emotions → ERQ (+ RRQ enrichment), relationships → ECR-RS, strengths →
 * IPIP-VIA folded into the `personality` group. The mechanism stays for any
 * future dimension; the order is currently empty.
 */
export type FoundationComingSoonGroup = 'emotions' | 'strengths' | 'relationships'

export const FOUNDATION_COMING_SOON_ORDER: readonly FoundationComingSoonGroup[] = [] as const

export type FoundationItemId =
  | 'valuesDiscovery'
  | 'valueMap'
  | 'transformativePurpose'
  | 'threePathways'
  | 'mountainRange'
  | 'wheelOfLife'
  | 'shadowBeliefs'
  | 'ifsPartsMap'
  | 'bigFive'
  | 'hexaco-60'
  | 'ipip-via'
  | 'pvq-40'
  | 'vlq'
  | 'erq'
  | 'ecr-rs'
  | 'rrq'

export type FoundationItemState = 'not-started' | 'in-progress' | 'completed' | 'outdated'

/**
 * One selectable depth/model behind a merged slot (currently only Big Five:
 * the quick IPIP-BFM-50 vs the deep IPIP-NEO-120). Completing EITHER satisfies
 * the slot; the tile offers the choice while the slot is still not-started.
 */
export interface FoundationVariant {
  assessmentId: AssessmentId
  routeName: string
  routeParams: Record<string, string>
}

export interface FoundationItemStatus {
  id: FoundationItemId
  group: FoundationGroup
  state: FoundationItemState
  lastCompletedAt?: string
  daysSince?: number
  routeName: string
  routeParams?: Record<string, string>
  /** Present only for merged slots (Big Five): the depth options to choose from. */
  variants?: FoundationVariant[]
  /** Which variant was completed/active, for label + navigation on merged slots. */
  completedVariantId?: AssessmentId
}

export interface FoundationItemDescriptor {
  id: FoundationItemId
  group: FoundationGroup
  routeName: string
  routeParams?: Record<string, string>
  variants?: readonly FoundationVariant[]
}

/**
 * The two interchangeable depths of the Big Five slot, quick → deep. Both feed
 * the profile snapshot if completed; for the foundation tile, completing one
 * is enough to satisfy the slot.
 */
export const FOUNDATION_BIG_FIVE_VARIANTS: readonly FoundationVariant[] = [
  {
    assessmentId: 'ipip-bfm-50',
    routeName: 'exercise-assessment',
    routeParams: { assessmentId: 'ipip-bfm-50' },
  },
  {
    assessmentId: 'ipip-neo-120',
    routeName: 'exercise-assessment',
    routeParams: { assessmentId: 'ipip-neo-120' },
  },
] as const

export const FOUNDATION_ITEMS: readonly FoundationItemDescriptor[] = [
  // Values — what matters to you
  { id: 'valuesDiscovery',       group: 'values',      routeName: 'exercise-values' },
  { id: 'valueMap',              group: 'values',      routeName: 'exercise-value-map' },
  { id: 'pvq-40',                group: 'values',      routeName: 'exercise-assessment', routeParams: { assessmentId: 'pvq-40' } },
  // Meaning & direction — where you're heading and the story so far
  { id: 'transformativePurpose', group: 'meaning',     routeName: 'exercise-purpose' },
  { id: 'threePathways',         group: 'meaning',     routeName: 'exercise-three-pathways' },
  { id: 'mountainRange',         group: 'meaning',     routeName: 'exercise-mountain-range' },
  // Personality & lenses — your traits, patterns, and inner system
  { id: 'bigFive',               group: 'personality', routeName: 'exercise-assessment', routeParams: { assessmentId: 'ipip-bfm-50' }, variants: FOUNDATION_BIG_FIVE_VARIANTS },
  { id: 'hexaco-60',             group: 'personality', routeName: 'exercise-assessment', routeParams: { assessmentId: 'hexaco-60' } },
  { id: 'shadowBeliefs',         group: 'personality', routeName: 'exercise-shadow-beliefs' },
  { id: 'ifsPartsMap',           group: 'personality', routeName: 'exercise-parts-mapping' },
  { id: 'ipip-via',              group: 'personality', routeName: 'exercise-assessment', routeParams: { assessmentId: 'ipip-via' } },
  // Emotions & regulation — how you work with feelings
  { id: 'erq',                   group: 'emotions',    routeName: 'exercise-assessment', routeParams: { assessmentId: 'erq' } },
  { id: 'rrq',                   group: 'emotions',    routeName: 'exercise-assessment', routeParams: { assessmentId: 'rrq' } },
  // Relationships & bonds — how you connect and attach
  { id: 'ecr-rs',                group: 'relationships', routeName: 'exercise-assessment', routeParams: { assessmentId: 'ecr-rs' } },
  // Life balance — how your areas of life feel right now
  { id: 'wheelOfLife',           group: 'lifeBalance', routeName: 'exercise-wheel-of-life' },
  { id: 'vlq',                   group: 'lifeBalance', routeName: 'exercise-assessment', routeParams: { assessmentId: 'vlq' } },
] as const

/** Self-discovery (non-assessment) foundation items, resolved from store getters below. */
type SelfDiscoveryId =
  | 'valuesDiscovery'
  | 'valueMap'
  | 'transformativePurpose'
  | 'threePathways'
  | 'mountainRange'
  | 'wheelOfLife'
  | 'shadowBeliefs'
  | 'ifsPartsMap'

export async function loadFoundationSourceData(): Promise<void> {
  const valuesDiscovery = useValuesDiscoveryStore()
  const valueMap = useValueMapStore()
  const wheel = useLifeAreaAssessmentStore()
  const shadow = useShadowBeliefsStore()
  const purpose = useTransformativePurposeStore()
  const threePathways = useThreePathwaysStore()
  const mountainRange = useMountainRangeStore()
  const partsMap = useIFSPartsMapStore()
  const assessments = useAssessmentStore()

  await Promise.all([
    valuesDiscovery.loadDiscoveries(),
    valueMap.loadMaps(),
    wheel.loadAssessments(),
    shadow.loadBeliefs(),
    purpose.loadPurposes(),
    threePathways.loadExplorations(),
    mountainRange.loadExplorations(),
    partsMap.loadMaps(),
    ...FOUNDATION_BIG_FIVE_VARIANTS.map((v) => assessments.loadAttempts(v.assessmentId)),
    assessments.loadAttempts('hexaco-60'),
    assessments.loadAttempts('pvq-40'),
    assessments.loadAttempts('vlq'),
    assessments.loadAttempts('erq'),
    assessments.loadAttempts('ecr-rs'),
    assessments.loadAttempts('rrq'),
    assessments.loadAttempts('ipip-via'),
  ])
}

function daysSince(iso: string, now: Date): number {
  const then = new Date(iso).getTime()
  return Math.floor((now.getTime() - then) / 86_400_000)
}

function deriveState(
  lastCompletedAt: string | undefined,
  hasInProgress: boolean,
  now: Date,
): FoundationItemState {
  if (!lastCompletedAt) return hasInProgress ? 'in-progress' : 'not-started'
  return daysSince(lastCompletedAt, now) > FOUNDATION_OUTDATED_DAYS ? 'outdated' : 'completed'
}

function assessmentStatus(
  descriptor: FoundationItemDescriptor,
  now: Date,
): FoundationItemStatus {
  const assessments = useAssessmentStore()
  const assessmentId = descriptor.routeParams!.assessmentId as AssessmentId
  const completed = assessments.getLatestCompletedAttemptFromState(assessmentId)?.completedAt
  const inProgress = !completed && Boolean(assessments.getActiveAttempt(assessmentId))
  return {
    id: descriptor.id,
    group: descriptor.group,
    state: deriveState(completed, inProgress, now),
    lastCompletedAt: completed,
    daysSince: completed ? daysSince(completed, now) : undefined,
    routeName: descriptor.routeName,
    routeParams: descriptor.routeParams,
  }
}

/**
 * Merged Big Five slot: satisfied by either depth. Reports the most recent
 * completion across variants, and points navigation at the completed (or
 * active) depth so re-opening lands on the test the user actually took.
 */
function bigFiveStatus(
  descriptor: FoundationItemDescriptor,
  now: Date,
): FoundationItemStatus {
  const assessments = useAssessmentStore()
  const variants = descriptor.variants ?? FOUNDATION_BIG_FIVE_VARIANTS

  let bestCompletedAt: string | undefined
  let bestVariant: AssessmentId | undefined
  for (const variant of variants) {
    const completed = assessments.getLatestCompletedAttemptFromState(variant.assessmentId)?.completedAt
    if (completed && (!bestCompletedAt || completed > bestCompletedAt)) {
      bestCompletedAt = completed
      bestVariant = variant.assessmentId
    }
  }

  const activeVariant = variants.find((v) => Boolean(assessments.getActiveAttempt(v.assessmentId)))
  const inProgress = !bestCompletedAt && Boolean(activeVariant)
  const target =
    (bestVariant && variants.find((v) => v.assessmentId === bestVariant)) ||
    activeVariant ||
    variants[0]

  return {
    id: descriptor.id,
    group: descriptor.group,
    state: deriveState(bestCompletedAt, inProgress, now),
    lastCompletedAt: bestCompletedAt,
    daysSince: bestCompletedAt ? daysSince(bestCompletedAt, now) : undefined,
    routeName: target.routeName,
    routeParams: target.routeParams,
    variants: [...variants],
    completedVariantId: bestVariant ?? activeVariant?.assessmentId,
  }
}

export function computeFoundationStatuses(now: Date = new Date()): FoundationItemStatus[] {
  const valuesDiscovery = useValuesDiscoveryStore()
  const valueMap = useValueMapStore()
  const wheel = useLifeAreaAssessmentStore()
  const shadow = useShadowBeliefsStore()
  const purpose = useTransformativePurposeStore()
  const threePathways = useThreePathwaysStore()
  const mountainRange = useMountainRangeStore()
  const partsMap = useIFSPartsMapStore()

  const selfDiscoveryDates: Record<SelfDiscoveryId, string | undefined> = {
    valuesDiscovery: valuesDiscovery.latestDiscovery?.createdAt ?? undefined,
    valueMap: valueMap.latestMap?.createdAt ?? undefined,
    transformativePurpose: purpose.latestPurpose?.createdAt ?? undefined,
    threePathways: threePathways.latestExploration?.createdAt ?? undefined,
    mountainRange: mountainRange.latestExploration?.createdAt ?? undefined,
    wheelOfLife: wheel.latestAssessment?.createdAt ?? undefined,
    shadowBeliefs: shadow.latestBeliefs?.createdAt ?? undefined,
    ifsPartsMap: partsMap.latestMap?.createdAt ?? undefined,
  }

  return FOUNDATION_ITEMS.map((descriptor) => {
    if (descriptor.id === 'bigFive') return bigFiveStatus(descriptor, now)
    if (descriptor.routeName === 'exercise-assessment') return assessmentStatus(descriptor, now)

    const completed = selfDiscoveryDates[descriptor.id as SelfDiscoveryId]
    return {
      id: descriptor.id,
      group: descriptor.group,
      state: deriveState(completed, false, now),
      lastCompletedAt: completed,
      daysSince: completed ? daysSince(completed, now) : undefined,
      routeName: descriptor.routeName,
      routeParams: descriptor.routeParams,
    }
  })
}

export function foundationCompletionCount(statuses: FoundationItemStatus[]): number {
  return statuses.filter((s) => s.state === 'completed' || s.state === 'outdated').length
}

export function isFoundationOutdated(statuses: FoundationItemStatus[]): boolean {
  return statuses.some((s) => s.state === 'outdated')
}

export interface FoundationGroupProgress {
  group: FoundationGroup
  /** Items in this group. */
  total: number
  /** Items in a completed or outdated state (i.e. they hold usable data). */
  completed: number
  /** Items needed for this group to be satisfied. */
  minRequired: number
  /** `completed >= minRequired`. */
  satisfied: boolean
}

/** Per-group fill + satisfaction, in display order. Drives the pillars gauge. */
export function computeFoundationGroupProgress(
  statuses: FoundationItemStatus[],
): FoundationGroupProgress[] {
  return FOUNDATION_GROUP_ORDER.map((group) => {
    const inGroup = statuses.filter((s) => s.group === group)
    const completed = inGroup.filter(
      (s) => s.state === 'completed' || s.state === 'outdated',
    ).length
    const minRequired = FOUNDATION_GROUP_MIN_REQUIRED[group]
    return {
      group,
      total: inGroup.length,
      completed,
      minRequired,
      satisfied: completed >= minRequired,
    }
  })
}

/**
 * The build unlocks only when EVERY active group is satisfied — at least
 * `minRequired` items each. Guarantees the profile is built from balanced
 * coverage rather than a single over-represented dimension.
 */
export function isFoundationBuildUnlocked(statuses: FoundationItemStatus[]): boolean {
  return computeFoundationGroupProgress(statuses).every((g) => g.satisfied)
}
