import { useValuesDiscoveryStore } from '@/stores/valuesDiscovery.store'
import { useValueMapStore } from '@/stores/valueMap.store'
import { useLifeAreaAssessmentStore } from '@/stores/lifeAreaAssessment.store'
import { useShadowBeliefsStore } from '@/stores/shadowBeliefs.store'
import { useTransformativePurposeStore } from '@/stores/transformativePurpose.store'
import { useAssessmentStore } from '@/stores/assessment.store'
import type { AssessmentId } from '@/domain/assessments'

export const FOUNDATION_OUTDATED_DAYS = 180

export const FOUNDATION_BUILD_FLOOR = 3

const FOUNDATION_ASSESSMENT_IDS: AssessmentId[] = [
  'vlq',
  'ipip-bfm-50',
  'ipip-neo-120',
  'hexaco-60',
  'pvq-40',
]

export type FoundationGroup = 'values' | 'personality' | 'lifeBalance'

export type FoundationItemId =
  | 'valuesDiscovery'
  | 'valueMap'
  | 'wheelOfLife'
  | 'shadowBeliefs'
  | 'transformativePurpose'
  | AssessmentId

export type FoundationItemState = 'not-started' | 'in-progress' | 'completed' | 'outdated'

export interface FoundationItemStatus {
  id: FoundationItemId
  group: FoundationGroup
  state: FoundationItemState
  lastCompletedAt?: string
  daysSince?: number
  routeName: string
  routeParams?: Record<string, string>
}

export interface FoundationItemDescriptor {
  id: FoundationItemId
  group: FoundationGroup
  routeName: string
  routeParams?: Record<string, string>
}

export const FOUNDATION_ITEMS: readonly FoundationItemDescriptor[] = [
  { id: 'valuesDiscovery',       group: 'values',      routeName: 'exercise-values' },
  { id: 'valueMap',              group: 'values',      routeName: 'exercise-value-map' },
  { id: 'transformativePurpose', group: 'values',      routeName: 'exercise-purpose' },
  { id: 'vlq',                   group: 'values',      routeName: 'exercise-assessment', routeParams: { assessmentId: 'vlq' } },
  { id: 'ipip-bfm-50',           group: 'personality', routeName: 'exercise-assessment', routeParams: { assessmentId: 'ipip-bfm-50' } },
  { id: 'ipip-neo-120',          group: 'personality', routeName: 'exercise-assessment', routeParams: { assessmentId: 'ipip-neo-120' } },
  { id: 'hexaco-60',             group: 'personality', routeName: 'exercise-assessment', routeParams: { assessmentId: 'hexaco-60' } },
  { id: 'shadowBeliefs',         group: 'personality', routeName: 'exercise-shadow-beliefs' },
  { id: 'wheelOfLife',           group: 'lifeBalance', routeName: 'exercise-wheel-of-life' },
  { id: 'pvq-40',                group: 'lifeBalance', routeName: 'exercise-assessment', routeParams: { assessmentId: 'pvq-40' } },
] as const

export async function loadFoundationSourceData(): Promise<void> {
  const valuesDiscovery = useValuesDiscoveryStore()
  const valueMap = useValueMapStore()
  const wheel = useLifeAreaAssessmentStore()
  const shadow = useShadowBeliefsStore()
  const purpose = useTransformativePurposeStore()
  const assessments = useAssessmentStore()

  await Promise.all([
    valuesDiscovery.loadDiscoveries(),
    valueMap.loadMaps(),
    wheel.loadAssessments(),
    shadow.loadBeliefs(),
    purpose.loadPurposes(),
    ...FOUNDATION_ASSESSMENT_IDS.map((assessmentId) =>
      assessments.loadAttempts(assessmentId),
    ),
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

export function computeFoundationStatuses(now: Date = new Date()): FoundationItemStatus[] {
  const valuesDiscovery = useValuesDiscoveryStore()
  const valueMap = useValueMapStore()
  const wheel = useLifeAreaAssessmentStore()
  const shadow = useShadowBeliefsStore()
  const purpose = useTransformativePurposeStore()
  const assessments = useAssessmentStore()

  const selfDiscoveryDates: Partial<Record<FoundationItemId, string>> = {
    valuesDiscovery:       valuesDiscovery.latestDiscovery?.createdAt ?? undefined,
    valueMap:              valueMap.latestMap?.createdAt ?? undefined,
    wheelOfLife:           wheel.latestAssessment?.createdAt ?? undefined,
    shadowBeliefs:         shadow.latestBeliefs?.createdAt ?? undefined,
    transformativePurpose: purpose.latestPurpose?.createdAt ?? undefined,
  }

  return FOUNDATION_ITEMS.map((descriptor) => {
    const isAssessment = descriptor.routeName === 'exercise-assessment'
    if (isAssessment) {
      const assessmentId = descriptor.routeParams!.assessmentId as AssessmentId
      const completed = assessments.getLatestCompletedAttemptFromState(assessmentId)?.completedAt
      const inProgress = !completed && Boolean(assessments.getActiveAttempt(assessmentId))
      const state = deriveState(completed, inProgress, now)
      return {
        id: descriptor.id,
        group: descriptor.group,
        state,
        lastCompletedAt: completed,
        daysSince: completed ? daysSince(completed, now) : undefined,
        routeName: descriptor.routeName,
        routeParams: descriptor.routeParams,
      }
    }

    const completed = selfDiscoveryDates[descriptor.id]
    const state = deriveState(completed, false, now)
    return {
      id: descriptor.id,
      group: descriptor.group,
      state,
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
