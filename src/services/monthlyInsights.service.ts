import type { JournalEntry } from '@/domain/journal'
import type { EmotionLog } from '@/domain/emotionLog'
import type {
  Commitment,
  MonthlyPlan,
  Project,
  Tracker,
  TrackerPeriod,
} from '@/domain/planning'
import type { MonthlyReflection, WeeklyReflection } from '@/domain/reflection'
import type { WeeklyPlan } from '@/domain/planning'
import { formatPeriodDateRangeNoYear, toLocalISODateString } from '@/utils/periodUtils'

interface MonthlyInsightsInput {
  monthlyPlan: Pick<MonthlyPlan, 'id' | 'startDate' | 'endDate'>
  weeklyPlans: WeeklyPlan[]
  weeklyReflections: WeeklyReflection[]
  commitments: Commitment[]
  projects: Project[]
  trackers: Tracker[]
  trackerPeriods: TrackerPeriod[]
  journalEntries: JournalEntry[]
  emotionLogs: EmotionLog[]
}

interface BatteryAverage {
  demand: number
  state: number
}

export interface MonthlyWeekInsight {
  weeklyPlanId: string
  startDate: string
  endDate: string
  label: string
  hasReflection: boolean
  commitmentCompletion: {
    done: number
    skipped: number
    planned: number
  }
  whatHelped?: string
  whatGotInTheWay?: string
  whatILearned?: string
  battery?: {
    body: BatteryAverage
    mind: BatteryAverage
    emotion: BatteryAverage
    social: BatteryAverage
  }
}

export interface MonthlyProjectSignal {
  projectId: string
  projectName: string
  status: Project['status']
  trackerCompletionPercent: number | null
  trackerSummary: string
}

export interface MonthlyInsights {
  weeklyPlanIdsInMonth: string[]
  reflectedWeeks: number
  weekCards: MonthlyWeekInsight[]
  batteryAverages?: NonNullable<MonthlyReflection['weeklyDigest']>['batteryAverages']
  commitmentCompletion: {
    done: number
    skipped: number
    planned: number
  }
  projectSignals: MonthlyProjectSignal[]
  journalCount: number
  emotionLogCount: number
  topEmotionIds: string[]
  topPeopleTagIds: string[]
  topContextTagIds: string[]
  deterioratingLifeAreaIds: string[]
  summarySuggestions: {
    wins: string[]
    challenges: string[]
    learnings: string[]
    adjustments?: string
    monthIntention?: string
    focusSuccessSignal?: string
    balanceGuardrail?: string
  }
}

interface CountResult {
  done: number
  skipped: number
  planned: number
}

const TOP_COUNT = 3

function overlapsRange(
  startDate: string,
  endDate: string,
  targetStart: string,
  targetEnd: string
): boolean {
  return startDate <= targetEnd && endDate >= targetStart
}

function takeUnique(strings: string[], max: number): string[] {
  const seen = new Set<string>()
  const values: string[] = []

  for (const raw of strings) {
    const value = raw.trim()
    if (!value) continue
    if (seen.has(value)) continue
    seen.add(value)
    values.push(value)
    if (values.length >= max) break
  }

  return values
}

function countById(items: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const id of items) {
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

function topKeys(counts: Map<string, number>, max: number): string[] {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([key]) => key)
}

function summarizeCommitmentStatuses(commitments: Commitment[]): CountResult {
  return commitments.reduce<CountResult>(
    (acc, commitment) => {
      if (commitment.status === 'done') acc.done += 1
      else if (commitment.status === 'skipped') acc.skipped += 1
      else acc.planned += 1
      return acc
    },
    { done: 0, skipped: 0, planned: 0 }
  )
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function computeTrackerCompletionPercent(
  tracker: Tracker,
  periods: TrackerPeriod[]
): number | null {
  if (periods.length === 0) return null

  if (tracker.type === 'count' || tracker.type === 'adherence') {
    let completed = 0
    let target = 0

    for (const period of periods) {
      const ticks = period.ticks ?? []
      completed += ticks.filter((tick) => tick.completed).length
      target += period.periodTarget ?? tracker.targetCount ?? 0
    }

    if (target <= 0) return null
    return Math.max(0, Math.min((completed / target) * 100, 100))
  }

  if (tracker.type === 'rating') {
    const ratings = periods
      .map((period) => period.rating)
      .filter((rating): rating is number => rating !== undefined)

    if (ratings.length === 0) return null

    const scaleMax = tracker.ratingScaleMax ?? 10
    if (scaleMax <= 0) return null

    return Math.max(0, Math.min((mean(ratings) / scaleMax) * 100, 100))
  }

  if (tracker.type === 'value') {
    const values = periods.flatMap((period) => (period.entries ?? []).map((entry) => entry.value))
    if (values.length === 0) return null

    const last = values[values.length - 1]
    if (tracker.targetValue && tracker.targetValue > 0) {
      if (tracker.direction === 'decrease') {
        return Math.max(0, Math.min((tracker.targetValue / Math.max(last, 1)) * 100, 100))
      }
      return Math.max(0, Math.min((last / tracker.targetValue) * 100, 100))
    }

    return null
  }

  // checkin
  const withNotes = periods.filter((period) => (period.note ?? '').trim().length > 0).length
  return Math.max(0, Math.min((withNotes / periods.length) * 100, 100))
}

function isMonthlyTypeCommitment(commitment: Commitment): boolean {
  return commitment.periodType === 'monthly' || commitment.periodType === 'weekly'
}

export function buildMonthlyInsights(input: MonthlyInsightsInput): MonthlyInsights {
  const { monthlyPlan } = input

  const weeklyPlansInMonth = [...input.weeklyPlans]
    .filter((plan) =>
      overlapsRange(plan.startDate, plan.endDate, monthlyPlan.startDate, monthlyPlan.endDate)
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  const weeklyReflectionByPlanId = new Map(
    input.weeklyReflections.map((reflection) => [reflection.weeklyPlanId, reflection])
  )

  const monthCommitments = input.commitments.filter(
    (commitment) =>
      isMonthlyTypeCommitment(commitment) &&
      overlapsRange(
        commitment.startDate,
        commitment.endDate,
        monthlyPlan.startDate,
        monthlyPlan.endDate
      )
  )

  const monthCommitmentByWeekId = new Map<string, Commitment[]>()
  for (const commitment of monthCommitments) {
    if (!commitment.weeklyPlanId) continue
    const bucket = monthCommitmentByWeekId.get(commitment.weeklyPlanId)
    if (bucket) {
      bucket.push(commitment)
    } else {
      monthCommitmentByWeekId.set(commitment.weeklyPlanId, [commitment])
    }
  }

  const weekCards: MonthlyWeekInsight[] = weeklyPlansInMonth.map((plan) => {
    const reflection = weeklyReflectionByPlanId.get(plan.id)
    const weekCommitments = monthCommitmentByWeekId.get(plan.id) ?? monthCommitments.filter((item) => {
      if (item.weeklyPlanId) return false
      return item.startDate === plan.startDate && item.endDate === plan.endDate
    })

    const completion = summarizeCommitmentStatuses(weekCommitments)

    return {
      weeklyPlanId: plan.id,
      startDate: plan.startDate,
      endDate: plan.endDate,
      label: formatPeriodDateRangeNoYear(plan.startDate, plan.endDate),
      hasReflection: Boolean(reflection?.completedAt),
      commitmentCompletion: completion,
      whatHelped: reflection?.whatHelped,
      whatGotInTheWay: reflection?.whatGotInTheWay,
      whatILearned: reflection?.whatILearned,
      battery: reflection?.batterySnapshot
        ? {
            body: reflection.batterySnapshot.body,
            mind: reflection.batterySnapshot.mind,
            emotion: reflection.batterySnapshot.emotion,
            social: reflection.batterySnapshot.social,
          }
        : undefined,
    }
  })

  const reflectedWeekCards = weekCards.filter((card) => card.hasReflection && card.battery)

  const batteryAverages = reflectedWeekCards.length
    ? {
        body: {
          demand: round1(mean(reflectedWeekCards.map((card) => card.battery!.body.demand))),
          state: round1(mean(reflectedWeekCards.map((card) => card.battery!.body.state))),
        },
        mind: {
          demand: round1(mean(reflectedWeekCards.map((card) => card.battery!.mind.demand))),
          state: round1(mean(reflectedWeekCards.map((card) => card.battery!.mind.state))),
        },
        emotion: {
          demand: round1(mean(reflectedWeekCards.map((card) => card.battery!.emotion.demand))),
          state: round1(mean(reflectedWeekCards.map((card) => card.battery!.emotion.state))),
        },
        social: {
          demand: round1(mean(reflectedWeekCards.map((card) => card.battery!.social.demand))),
          state: round1(mean(reflectedWeekCards.map((card) => card.battery!.social.state))),
        },
      }
    : undefined

  const commitmentCompletion = summarizeCommitmentStatuses(monthCommitments)

  const monthProjects = input.projects
    .filter(
      (project) =>
        (project.monthIds ?? []).includes(monthlyPlan.id) ||
        (project.focusMonthIds ?? []).includes(monthlyPlan.id)
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const projectSignals: MonthlyProjectSignal[] = monthProjects.map((project) => {
    const projectTrackers = input.trackers.filter(
      (tracker) => tracker.parentType === 'project' && tracker.parentId === project.id && tracker.isActive
    )

    const trackerPercents = projectTrackers
      .map((tracker) => {
        const periods = input.trackerPeriods.filter(
          (period) =>
            period.trackerId === tracker.id &&
            overlapsRange(
              period.startDate,
              period.endDate,
              monthlyPlan.startDate,
              monthlyPlan.endDate
            )
        )
        return computeTrackerCompletionPercent(tracker, periods)
      })
      .filter((value): value is number => value !== null)

    const trackerCompletionPercent =
      trackerPercents.length > 0 ? round1(mean(trackerPercents)) : null

    let trackerSummary = 'No tracker data'
    if (trackerCompletionPercent !== null) {
      trackerSummary = `${trackerCompletionPercent}% tracker completion`
    } else if (projectTrackers.length === 0) {
      trackerSummary = 'No trackers linked'
    }

    return {
      projectId: project.id,
      projectName: project.name,
      status: project.status,
      trackerCompletionPercent,
      trackerSummary,
    }
  })

  const monthlyJournalEntries = input.journalEntries.filter((entry) => {
    const localDate = toLocalISODateString(new Date(entry.createdAt))
    return localDate >= monthlyPlan.startDate && localDate <= monthlyPlan.endDate
  })

  const monthlyEmotionLogs = input.emotionLogs.filter((log) => {
    const localDate = toLocalISODateString(new Date(log.createdAt))
    return localDate >= monthlyPlan.startDate && localDate <= monthlyPlan.endDate
  })

  const emotionIds = [
    ...monthlyJournalEntries.flatMap((entry) => entry.emotionIds ?? []),
    ...monthlyEmotionLogs.flatMap((log) => log.emotionIds ?? []),
  ]
  const peopleTagIds = [
    ...monthlyJournalEntries.flatMap((entry) => entry.peopleTagIds ?? []),
    ...monthlyEmotionLogs.flatMap((log) => log.peopleTagIds ?? []),
  ]
  const contextTagIds = [
    ...monthlyJournalEntries.flatMap((entry) => entry.contextTagIds ?? []),
    ...monthlyEmotionLogs.flatMap((log) => log.contextTagIds ?? []),
  ]

  const topEmotionIds = topKeys(countById(emotionIds), TOP_COUNT)
  const topPeopleTagIds = topKeys(countById(peopleTagIds), TOP_COUNT)
  const topContextTagIds = topKeys(countById(contextTagIds), TOP_COUNT)

  const commitmentCountByLifeArea = new Map<string, { total: number; done: number }>()
  for (const commitment of monthCommitments) {
    for (const lifeAreaId of commitment.lifeAreaIds ?? []) {
      const existing = commitmentCountByLifeArea.get(lifeAreaId) ?? { total: 0, done: 0 }
      existing.total += 1
      if (commitment.status === 'done') {
        existing.done += 1
      }
      commitmentCountByLifeArea.set(lifeAreaId, existing)
    }
  }

  const deterioratingLifeAreaIds = Array.from(commitmentCountByLifeArea.entries())
    .filter(([, stat]) => stat.total >= 2 && stat.done / stat.total < 0.4)
    .map(([lifeAreaId]) => lifeAreaId)

  const weeklyHelped = takeUnique(
    weekCards.map((card) => card.whatHelped ?? ''),
    TOP_COUNT
  )
  const weeklyBlockers = takeUnique(
    weekCards.map((card) => card.whatGotInTheWay ?? ''),
    TOP_COUNT
  )
  const weeklyLearned = takeUnique(
    weekCards.map((card) => card.whatILearned ?? ''),
    TOP_COUNT
  )

  const wins: string[] = []
  if (commitmentCompletion.done > commitmentCompletion.skipped + commitmentCompletion.planned) {
    wins.push('You followed through on most commitments this month.')
  }
  if (projectSignals.some((signal) => signal.status === 'completed')) {
    wins.push('At least one project reached completion this month.')
  }
  wins.push(...weeklyHelped)

  const challenges: string[] = []
  if (commitmentCompletion.skipped > 0) {
    challenges.push('Some commitments were skipped, suggesting load or scope friction.')
  }
  if ((batteryAverages?.emotion.state ?? 5) < 3.5 || (batteryAverages?.mind.state ?? 5) < 3.5) {
    challenges.push('Mind/emotion batteries ended the month below a healthy baseline.')
  }
  challenges.push(...weeklyBlockers)

  const learnings: string[] = []
  learnings.push(...weeklyLearned)
  if (learnings.length === 0 && weekCards.length > 0) {
    learnings.push('Small weekly adjustments seem to matter more than big resets.')
  }

  const monthIntention =
    commitmentCompletion.done >= commitmentCompletion.skipped
      ? 'Consolidate what worked and remove avoidable friction.'
      : 'Simplify scope and protect energy while restoring execution consistency.'

  const focusSuccessSignal = projectSignals.some((signal) => signal.trackerCompletionPercent !== null)
    ? 'Focused project trackers trend upward by month end.'
    : 'At least one focused project moves from planned to active with clear momentum.'

  const balanceGuardrail =
    (batteryAverages?.body.demand ?? 3) - (batteryAverages?.body.state ?? 3) >= 1
      ? 'Protect recovery blocks and avoid adding parallel projects until energy stabilizes.'
      : 'Do not add new projects unless one current project is paused or completed.'

  const adjustments =
    commitmentCompletion.skipped > commitmentCompletion.done
      ? 'Reduce active scope and define one concrete if-then recovery plan for low-energy days.'
      : 'Keep current direction and tighten one bottleneck that repeated across weeks.'

  return {
    weeklyPlanIdsInMonth: weeklyPlansInMonth.map((plan) => plan.id),
    reflectedWeeks: reflectedWeekCards.length,
    weekCards,
    batteryAverages,
    commitmentCompletion,
    projectSignals,
    journalCount: monthlyJournalEntries.length,
    emotionLogCount: monthlyEmotionLogs.length,
    topEmotionIds,
    topPeopleTagIds,
    topContextTagIds,
    deterioratingLifeAreaIds,
    summarySuggestions: {
      wins: takeUnique(wins, TOP_COUNT),
      challenges: takeUnique(challenges, TOP_COUNT),
      learnings: takeUnique(learnings, TOP_COUNT),
      adjustments,
      monthIntention,
      focusSuccessSignal,
      balanceGuardrail,
    },
  }
}

export type { MonthlyInsightsInput }
