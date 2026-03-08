import { computed, ref } from 'vue'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { useYearlyPlanStore } from '@/stores/yearlyPlan.store'
import { useMonthlyPlanStore } from '@/stores/monthlyPlan.store'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useProjectStore } from '@/stores/project.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { useHabitStore } from '@/stores/habit.store'
import { useWeeklyReflectionStore } from '@/stores/weeklyReflection.store'
import { useMonthlyReflectionStore } from '@/stores/monthlyReflection.store'
import { useYearlyReflectionStore } from '@/stores/yearlyReflection.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useIFSDailyCheckInStore } from '@/stores/ifsDailyCheckIn.store'
import {
  getTodayJournalEntries,
  getTodayEmotionLogs,
  getWeekSummary,
} from '@/utils/todayUtils'
import {
  getCurrentYear,
  getDefaultPeriodName,
  getMonthRange,
  getWeekRange,
  toLocalISODateString,
} from '@/utils/periodUtils'
import {
  generateTodayRecommendations,
  type TodayRecommendationContext,
} from '@/services/todayRecommendation.service'
import {
  resolveMonthlyTrackerProjects,
  resolveWeeklyTrackerProjects,
} from '@/services/projectTrackerScope.service'
import { resolvePeriodTrackerSelection } from '@/services/periodTrackerSelection.service'
import type { LifeArea } from '@/domain/lifeArea'
import type {
  Commitment,
  MonthlyPlan,
  Priority,
  Project,
  Tracker,
  WeeklyPlan,
} from '@/domain/planning'
import type { Habit } from '@/domain/habit'
import type {
  TodayDailyIntention,
  TodayFocusChain,
  TodayPriorityCompassItem,
  TodayProgressItem,
  TodayProgressLane,
  TodayReminder,
  TodaySupportState,
} from '@/types/today'

interface BuildTodayFocusChainsInput {
  currentMonthPlan?: MonthlyPlan
  currentWeekPlan?: WeeklyPlan
  priorities: Priority[]
  projects: Project[]
  commitments: Commitment[]
  lifeAreas: LifeArea[]
}

interface BuildTodayPriorityCompassInput {
  currentMonthPlan?: MonthlyPlan
  currentWeekPlan?: WeeklyPlan
  priorities: Priority[]
  projects: Project[]
  lifeAreas: LifeArea[]
  commitments: Commitment[]
}

interface BuildTodayProgressLanesInput {
  currentWeekPlan?: WeeklyPlan
  currentMonthPlan?: MonthlyPlan
  projects: Project[]
  trackers: Tracker[]
  commitments: Commitment[]
  habits: Habit[]
  now: Date
}

interface BuildTodaySupportStateInput {
  now: Date
  currentWeekPlan?: WeeklyPlan
  todayJournalCount: number
  hasTodayJournal: boolean
  todayEmotionCount: number
  emotionTarget: number
  reflectionBadges: TodaySupportState['reflectionBadges']
  recommendations: TodaySupportState['recommendations']
  ifsPartCount: number
  ifsDoneToday: boolean
  ifsWeeklyCheckInCount: number
}

function isProjectActive(project: Project): boolean {
  return project.status === 'active' || project.status === 'planned'
}

function isProjectVisibleInCompass(project: Project): boolean {
  return project.status !== 'abandoned'
}

function isProjectDone(project: Project): boolean {
  return project.status === 'completed'
}

function getProjectPriorityIds(project: Project): string[] {
  return project.priorityIds?.filter((id) => id.trim().length > 0) ?? []
}

function isWeeklyFocusedProject(
  project: Project,
  currentWeekPlan: WeeklyPlan | undefined,
  weeklyProjectIds: Set<string>,
): boolean {
  if (weeklyProjectIds.has(project.id)) return true
  if (!currentWeekPlan) return false
  return (project.focusWeekIds ?? []).includes(currentWeekPlan.id)
}

function isMonthlyFocusedProject(project: Project, currentMonthPlan: MonthlyPlan | undefined): boolean {
  if (!currentMonthPlan) return false

  return (
    (project.focusMonthIds ?? []).includes(currentMonthPlan.id) ||
    (project.monthIds ?? []).includes(currentMonthPlan.id)
  )
}

function resolveLifeArea(
  priority: Priority,
  projects: Project[],
  commitments: Commitment[],
  lifeAreas: LifeArea[],
): LifeArea | undefined {
  const candidateIds = [
    ...priority.lifeAreaIds,
    ...projects.flatMap((project) => project.lifeAreaIds ?? []),
    ...commitments.flatMap((commitment) => commitment.lifeAreaIds ?? []),
  ]

  const uniqueIds = Array.from(new Set(candidateIds))
  return uniqueIds
    .map((id) => lifeAreas.find((lifeArea) => lifeArea.id === id))
    .find((lifeArea): lifeArea is LifeArea => lifeArea !== undefined)
}

function resolveCompassLifeAreas(
  priority: Priority,
  linkedProjects: Project[],
  lifeAreas: LifeArea[],
): LifeArea[] {
  const ids = [
    ...priority.lifeAreaIds,
    ...linkedProjects.flatMap((project) => project.lifeAreaIds ?? []),
  ]

  const seen = new Set<string>()
  const resolved: LifeArea[] = []
  for (const id of ids) {
    if (!id || seen.has(id)) continue
    const match = lifeAreas.find((lifeArea) => lifeArea.id === id)
    if (match) {
      resolved.push(match)
      seen.add(id)
    }
  }
  return resolved
}

function resolveIntentionTone(now: Date): TodayDailyIntention['tone'] {
  const hour = now.getHours()
  if (hour >= 16) return 'evening'
  if (hour >= 11) return 'midday'
  return 'morning'
}

export function buildTodayFocusChains({
  currentMonthPlan,
  currentWeekPlan,
  priorities,
  projects,
  commitments,
  lifeAreas,
}: BuildTodayFocusChainsInput): TodayFocusChain[] {
  const activeProjects = projects.filter(isProjectActive)
  const weeklyProjectIds = new Set(
    commitments
      .map((commitment) => commitment.projectId)
      .filter((projectId): projectId is string => Boolean(projectId)),
  )

  const projectMap = new Map(activeProjects.map((project) => [project.id, project]))
  const chains: TodayFocusChain[] = []
  const seenPriorityIds = new Set<string>()

  const sortedPriorities = [...priorities].sort((a, b) => a.sortOrder - b.sortOrder)

  for (const priority of sortedPriorities) {
    const linkedProjects = activeProjects
      .filter((project) => getProjectPriorityIds(project).includes(priority.id))
      .sort((a, b) => {
        const aScore = isWeeklyFocusedProject(a, currentWeekPlan, weeklyProjectIds)
          ? 2
          : isMonthlyFocusedProject(a, currentMonthPlan)
            ? 1
            : 0
        const bScore = isWeeklyFocusedProject(b, currentWeekPlan, weeklyProjectIds)
          ? 2
          : isMonthlyFocusedProject(b, currentMonthPlan)
            ? 1
            : 0
        if (aScore !== bScore) return bScore - aScore
        return b.createdAt.localeCompare(a.createdAt)
      })

    const relevantProjects = linkedProjects.filter(
      (project) =>
        isWeeklyFocusedProject(project, currentWeekPlan, weeklyProjectIds) ||
        isMonthlyFocusedProject(project, currentMonthPlan),
    )

    const relevantCommitments = commitments.filter((commitment) => {
      if (commitment.priorityIds.includes(priority.id)) return true

      const linkedProject = commitment.projectId ? projectMap.get(commitment.projectId) : undefined
      if (linkedProject && getProjectPriorityIds(linkedProject).includes(priority.id)) {
        return true
      }

      return Boolean(commitment.projectId && relevantProjects.some((project) => project.id === commitment.projectId))
    })

    const projectsForChain = relevantProjects.length > 0 ? relevantProjects : linkedProjects.slice(0, 2)
    const hasWeeklyProject = projectsForChain.some((project) =>
      isWeeklyFocusedProject(project, currentWeekPlan, weeklyProjectIds),
    )
    const hasMonthlyProject =
      !hasWeeklyProject &&
      projectsForChain.some((project) => isMonthlyFocusedProject(project, currentMonthPlan))

    const source = hasWeeklyProject
      ? 'weekly-project'
      : hasMonthlyProject
        ? 'monthly-project'
        : 'priority-only'

    const relevanceScore =
      source === 'weekly-project' ? 300 : source === 'monthly-project' ? 200 : 100

    if (projectsForChain.length === 0 && relevantCommitments.length === 0 && seenPriorityIds.size >= 3) {
      continue
    }

    seenPriorityIds.add(priority.id)
    chains.push({
      id: priority.id,
      lifeArea: resolveLifeArea(priority, projectsForChain, relevantCommitments, lifeAreas),
      priority,
      projects: projectsForChain,
      commitmentDone: relevantCommitments.filter((commitment) => commitment.status === 'done').length,
      commitmentTotal: relevantCommitments.length,
      source,
      relevanceScore: relevanceScore + Math.min(relevantCommitments.length, 5),
    })
  }

  return chains.sort((a, b) => {
    if (a.relevanceScore !== b.relevanceScore) {
      return b.relevanceScore - a.relevanceScore
    }
    return a.priority.sortOrder - b.priority.sortOrder
  })
}

export function buildTodayPriorityCompass({
  currentMonthPlan,
  currentWeekPlan,
  priorities,
  projects,
  lifeAreas,
  commitments,
}: BuildTodayPriorityCompassInput): TodayPriorityCompassItem[] {
  const weeklyProjectIds = new Set(
    commitments
      .map((commitment) => commitment.projectId)
      .filter((projectId): projectId is string => Boolean(projectId)),
  )

  return [...priorities]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((priority) => {
      const linkedProjects = projects
        .filter((project) => isProjectVisibleInCompass(project) && getProjectPriorityIds(project).includes(priority.id))
        .sort((a, b) => {
          const aScore =
            (isProjectDone(a) ? 0 : 100) +
            (isWeeklyFocusedProject(a, currentWeekPlan, weeklyProjectIds) ? 20 : 0) +
            (isMonthlyFocusedProject(a, currentMonthPlan) ? 10 : 0)
          const bScore =
            (isProjectDone(b) ? 0 : 100) +
            (isWeeklyFocusedProject(b, currentWeekPlan, weeklyProjectIds) ? 20 : 0) +
            (isMonthlyFocusedProject(b, currentMonthPlan) ? 10 : 0)

          if (aScore !== bScore) return bScore - aScore
          return b.createdAt.localeCompare(a.createdAt)
        })

      return {
        id: priority.id,
        priority,
        lifeAreas: resolveCompassLifeAreas(priority, linkedProjects, lifeAreas),
        projectSignals: linkedProjects.map((project) => ({
          id: project.id,
          name: project.name,
          icon: project.icon,
          isDone: isProjectDone(project),
        })),
      }
    })
}

function buildProgressItemsForLane(
  cadence: 'weekly' | 'monthly',
  plan: WeeklyPlan | MonthlyPlan | undefined,
  startDate: string,
  endDate: string,
  projects: Project[],
  trackers: Tracker[],
  commitments: Commitment[],
  habits: Habit[],
): TodayProgressItem[] {
  if (!plan) return []

  const baseProjectTrackers = trackers.filter(
    (tracker) =>
      tracker.parentType === 'project' &&
      tracker.parentId &&
      tracker.isActive &&
      tracker.cadence === cadence,
  )

  const activeHabitById = new Map(
    habits
      .filter((habit) => habit.isActive && !habit.isPaused)
      .map((habit) => [habit.id, habit]),
  )

  const baseHabitTrackers = trackers.filter(
    (tracker) =>
      tracker.parentType === 'habit' &&
      tracker.parentId &&
      tracker.isActive &&
      tracker.cadence === cadence &&
      activeHabitById.has(tracker.parentId),
  )

  const eligibleTrackerIds = [
    ...baseProjectTrackers.map((tracker) => tracker.id),
    ...baseHabitTrackers.map((tracker) => tracker.id),
  ]

  const resolvedSelection = resolvePeriodTrackerSelection({
    selectedTrackerIds: plan.selectedTrackerIds,
    eligibleTrackerIds,
  })

  const selectedTrackerIdSet = new Set(resolvedSelection.effectiveSelectedTrackerIds)
  const hasExplicitSelection = resolvedSelection.hasExplicitSelection

  const filteredProjectTrackers = hasExplicitSelection
    ? baseProjectTrackers.filter((tracker) => selectedTrackerIdSet.has(tracker.id))
    : baseProjectTrackers
  const filteredHabitTrackers = hasExplicitSelection
    ? baseHabitTrackers.filter((tracker) => selectedTrackerIdSet.has(tracker.id))
    : baseHabitTrackers

  const scopedProjects =
    cadence === 'weekly'
      ? resolveWeeklyTrackerProjects({
          projects,
          commitments,
          weeklyPlanId: plan.id,
          startDate,
          endDate,
        })
      : resolveMonthlyTrackerProjects({
          projects,
          commitments,
          monthlyPlanId: plan.id,
          startDate,
          endDate,
        })

  const scopedProjectIdSet = new Set(scopedProjects.map((project) => project.id))
  const projectById = new Map(projects.map((project) => [project.id, project]))

  const items: TodayProgressItem[] = []

  for (const tracker of filteredProjectTrackers) {
    if (!tracker.parentId || !scopedProjectIdSet.has(tracker.parentId)) continue
    const parentProject = projectById.get(tracker.parentId)
    if (!parentProject) continue

    items.push({
      id: tracker.id,
      cadence,
      tracker,
      parentKind: 'project',
      parentProject,
      parentName: parentProject.name,
      parentIcon: parentProject.icon,
      projectIsDone: isProjectDone(parentProject),
      startDate,
      endDate,
    })
  }

  for (const tracker of filteredHabitTrackers) {
    if (!tracker.parentId) continue
    const parentHabit = activeHabitById.get(tracker.parentId)
    if (!parentHabit) continue

    items.push({
      id: tracker.id,
      cadence,
      tracker,
      parentKind: 'habit',
      parentHabit,
      parentName: parentHabit.name,
      parentIcon: undefined,
      projectIsDone: false,
      startDate,
      endDate,
    })
  }

  return items.sort((a, b) => {
    if (a.parentKind !== b.parentKind) return a.parentKind === 'project' ? -1 : 1
    if (a.projectIsDone !== b.projectIsDone) return a.projectIsDone ? 1 : -1
    return a.parentName.localeCompare(b.parentName)
  })
}

export function buildTodayProgressLanes({
  currentWeekPlan,
  currentMonthPlan,
  projects,
  trackers,
  commitments,
  habits,
  now,
}: BuildTodayProgressLanesInput): TodayProgressLane[] {
  const currentWeekRange = getWeekRange(now)
  const currentMonthRange = getMonthRange(now)

  const weeklyStartDate = currentWeekPlan?.startDate ?? toLocalISODateString(currentWeekRange.start)
  const weeklyEndDate = currentWeekPlan?.endDate ?? toLocalISODateString(currentWeekRange.end)
  const monthlyStartDate = currentMonthPlan?.startDate ?? toLocalISODateString(currentMonthRange.start)
  const monthlyEndDate = currentMonthPlan?.endDate ?? toLocalISODateString(currentMonthRange.end)

  return [
    {
      cadence: 'weekly',
      periodLabel: getDefaultPeriodName(weeklyStartDate, weeklyEndDate, 'weekly'),
      hasPlan: Boolean(currentWeekPlan),
      items: buildProgressItemsForLane(
        'weekly',
        currentWeekPlan,
        weeklyStartDate,
        weeklyEndDate,
        projects,
        trackers,
        commitments,
        habits,
      ),
    },
    {
      cadence: 'monthly',
      periodLabel: getDefaultPeriodName(monthlyStartDate, monthlyEndDate, 'monthly'),
      hasPlan: Boolean(currentMonthPlan),
      items: buildProgressItemsForLane(
        'monthly',
        currentMonthPlan,
        monthlyStartDate,
        monthlyEndDate,
        projects,
        trackers,
        commitments,
        habits,
      ),
    },
  ]
}

export function buildTodaySupportState({
  now,
  currentWeekPlan,
  todayJournalCount,
  hasTodayJournal,
  todayEmotionCount,
  emotionTarget,
  reflectionBadges,
  recommendations,
  ifsPartCount,
  ifsDoneToday,
  ifsWeeklyCheckInCount,
}: BuildTodaySupportStateInput): TodaySupportState {
  const tone = resolveIntentionTone(now)
  const focusSentence = currentWeekPlan?.focusSentence?.trim()
  const adaptiveIntention = currentWeekPlan?.adaptiveIntention?.trim()

  const dailyIntention: TodayDailyIntention = {
    tone,
    description:
      focusSentence ||
      (tone === 'evening'
        ? 'Close the day by naming what mattered and what you want to carry forward.'
        : tone === 'midday'
          ? 'Use this moment to re-ground and reconnect your next action to what matters.'
          : 'Start from what matters before the day starts choosing for you.'),
  }

  let primaryReminder: TodayReminder | undefined

  if (adaptiveIntention) {
    primaryReminder = {
      kind: 'adaptive',
      description: adaptiveIntention,
      route: currentWeekPlan ? `/planning/week/${currentWeekPlan.id}` : '/planning/week/new',
    }
  } else {
    const dueReflectionKeys = reflectionBadges.filter((badge) => badge.isDue).map((badge) => badge.key)
    if (dueReflectionKeys.length > 0) {
      primaryReminder = {
        kind: 'reflection',
        description: `${dueReflectionKeys.length} reflection items need closing.`,
        route: '/planning',
        reflectionKeys: dueReflectionKeys,
      }
    } else if (recommendations[0]) {
      primaryReminder = {
        kind: 'recommendation',
        title: recommendations[0].title,
        description: recommendations[0].whyNow,
        route: recommendations[0].route,
        recommendationId: recommendations[0].id,
      }
    }
  }

  const visibleRecommendations =
    primaryReminder?.kind === 'recommendation' && primaryReminder.recommendationId
      ? recommendations.filter((recommendation) => recommendation.id !== primaryReminder?.recommendationId)
      : recommendations

  return {
    dailyIntention,
    primaryReminder,
    reflectionBadges,
    capture: {
      hasJournalToday: hasTodayJournal,
      journalCount: todayJournalCount,
      emotionCount: todayEmotionCount,
      emotionTarget,
    },
    ifs: {
      hasParts: ifsPartCount > 0,
      doneToday: ifsDoneToday,
      weeklyCheckInCount: ifsWeeklyCheckInCount,
    },
    recommendations: visibleRecommendations,
  }
}

export function useTodayGrounding() {
  const journalStore = useJournalStore()
  const emotionLogStore = useEmotionLogStore()
  const emotionStore = useEmotionStore()
  const userPreferencesStore = useUserPreferencesStore()
  const yearlyPlanStore = useYearlyPlanStore()
  const monthlyPlanStore = useMonthlyPlanStore()
  const weeklyPlanStore = useWeeklyPlanStore()
  const commitmentStore = useCommitmentStore()
  const lifeAreaStore = useLifeAreaStore()
  const priorityStore = usePriorityStore()
  const projectStore = useProjectStore()
  const trackerStore = useTrackerStore()
  const habitStore = useHabitStore()
  const weeklyReflectionStore = useWeeklyReflectionStore()
  const monthlyReflectionStore = useMonthlyReflectionStore()
  const yearlyReflectionStore = useYearlyReflectionStore()
  const ifsPartStore = useIFSPartStore()
  const ifsDailyCheckInStore = useIFSDailyCheckInStore()

  const isLoading = ref(true)
  const loadError = ref<string | null>(null)

  const todayDate = computed(() => new Date())
  const todayIsoDate = computed(() => toLocalISODateString(todayDate.value))

  const todayJournalEntries = computed(() => getTodayJournalEntries(journalStore.entries))
  const todayEmotionLogs = computed(() => getTodayEmotionLogs(emotionLogStore.logs))

  const todayJournalCount = computed(() => todayJournalEntries.value.length)
  const todayEmotionCount = computed(() => todayEmotionLogs.value.length)
  const hasTodayJournal = computed(() => todayJournalCount.value > 0)

  const weekSummary = computed(() => getWeekSummary(journalStore.entries, emotionLogStore.logs))
  const hasMeaningfulWeekSummary = computed(() => {
    const summary = weekSummary.value
    return (
      summary.journalCount > 0 ||
      summary.emotionLogCount > 0 ||
      summary.streak > 0 ||
      summary.topEmotionIds.length > 0
    )
  })

  const currentYearPlan = computed(() => yearlyPlanStore.getCurrentYearPlan)
  const currentMonthPlan = computed(() => monthlyPlanStore.getCurrentMonthPlan)
  const currentWeekPlan = computed(() => weeklyPlanStore.getCurrentWeekPlan)

  const activePriorities = computed(() =>
    priorityStore.getActivePriorities(currentYearPlan.value?.year ?? getCurrentYear()),
  )

  const currentWeekCommitments = computed(() => {
    if (!currentWeekPlan.value) return []
    return commitmentStore.getCommitmentsByWeeklyPlanId(currentWeekPlan.value.id)
  })

  const commitmentProgress = computed(() => ({
    done: currentWeekCommitments.value.filter((item) => item.status === 'done').length,
    total: currentWeekCommitments.value.length,
  }))

  const topActivePriorities = computed(() => activePriorities.value.slice(0, 4))

  const focusChains = computed(() =>
    buildTodayFocusChains({
      currentMonthPlan: currentMonthPlan.value,
      currentWeekPlan: currentWeekPlan.value,
      priorities: activePriorities.value,
      projects: projectStore.projects,
      commitments: currentWeekCommitments.value,
      lifeAreas: lifeAreaStore.lifeAreas,
    }),
  )

  const priorityCompassItems = computed(() =>
    buildTodayPriorityCompass({
      currentMonthPlan: currentMonthPlan.value,
      currentWeekPlan: currentWeekPlan.value,
      priorities: activePriorities.value,
      projects: projectStore.projects,
      lifeAreas: lifeAreaStore.lifeAreas,
      commitments: currentWeekCommitments.value,
    }),
  )

  const progressLanes = computed(() =>
    buildTodayProgressLanes({
      currentWeekPlan: currentWeekPlan.value,
      currentMonthPlan: currentMonthPlan.value,
      projects: projectStore.projects,
      trackers: trackerStore.trackers,
      commitments: commitmentStore.commitments,
      habits: habitStore.habits,
      now: todayDate.value,
    }),
  )

  const monthLabel = computed(() => {
    if (!currentMonthPlan.value) return ''
    return getDefaultPeriodName(
      currentMonthPlan.value.startDate,
      currentMonthPlan.value.endDate,
      'monthly',
    )
  })

  const weekLabel = computed(() => {
    if (!currentWeekPlan.value) return ''
    return getDefaultPeriodName(
      currentWeekPlan.value.startDate,
      currentWeekPlan.value.endDate,
      'weekly',
    )
  })

  const yearLabel = computed(() => {
    if (!currentYearPlan.value) return ''
    return currentYearPlan.value.name || String(currentYearPlan.value.year)
  })

  const recentActivatedEmotionName = computed(() => {
    const oneDayAgo = new Date(todayDate.value.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const recentLogs = emotionLogStore.logs.filter((log) => log.createdAt >= oneDayAgo)

    for (const log of recentLogs) {
      for (const emotionId of log.emotionIds) {
        const emotion = emotionStore.getEmotionById(emotionId)
        if (emotion && emotion.energy > 6 && emotion.pleasantness <= 6) {
          return emotion.name
        }
      }
    }

    return null
  })

  const recommendations = computed(() => {
    const context: TodayRecommendationContext = {
      now: todayDate.value,
      todayEmotionCount: todayEmotionCount.value,
      emotionTarget: userPreferencesStore.dailyEmotionTarget,
      hasJournalToday: hasTodayJournal.value,
      unfinishedCommitmentCount: currentWeekCommitments.value.filter((item) => item.status !== 'done').length,
      recentActivatedEmotionName: recentActivatedEmotionName.value,
      ifsPartCount: ifsPartStore.parts.length,
      feedbackMap: userPreferencesStore.todayExerciseFeedback,
    }

    return generateTodayRecommendations(context)
  })

  const weeklyReflectionDue = computed(() => {
    if (!currentWeekPlan.value) return false
    if (currentWeekPlan.value.endDate > todayIsoDate.value) return false
    return !weeklyReflectionStore.getReflectionByPlanId(currentWeekPlan.value.id)
  })

  const monthlyReflectionDue = computed(() => {
    if (!currentMonthPlan.value) return false
    if (currentMonthPlan.value.endDate > todayIsoDate.value) return false
    return !monthlyReflectionStore.getReflectionByPlanId(currentMonthPlan.value.id)
  })

  const yearlyReflectionDue = computed(() => {
    if (!currentYearPlan.value) return false
    if (currentYearPlan.value.endDate > todayIsoDate.value) return false
    return !yearlyReflectionStore.getReflectionByPlanId(currentYearPlan.value.id)
  })

  const dueReflectionCount = computed(() => {
    return [weeklyReflectionDue.value, monthlyReflectionDue.value, yearlyReflectionDue.value].filter(Boolean).length
  })

  const hasAnyReflectionDue = computed(() => dueReflectionCount.value > 0)

  const reflectionItems = computed(() => [
    {
      key: 'weekly' as const,
      label: 'weekly',
      isDue: weeklyReflectionDue.value,
    },
    {
      key: 'monthly' as const,
      label: 'monthly',
      isDue: monthlyReflectionDue.value,
    },
    {
      key: 'yearly' as const,
      label: 'yearly',
      isDue: yearlyReflectionDue.value,
    },
  ])

  const ifsDoneToday = computed(() =>
    ifsDailyCheckInStore.checkIns.some((checkIn) => checkIn.createdAt.slice(0, 10) === todayIsoDate.value),
  )

  const morningPromptSeed = computed(() => {
    const focus = currentWeekPlan.value?.focusSentence?.trim()
    const intention = currentMonthPlan.value?.monthIntention?.trim()

    if (focus) {
      return `Morning intention\n\nToday I want to remember: ${focus}\n\nThe one thing I want to prioritize is...`
    }

    if (intention) {
      return `Morning intention\n\nThis month I am orienting toward: ${intention}\n\nToday that means...`
    }

    return 'Morning intention\n\nWhat matters most today, and how do I want to show up?'
  })

  const eveningPromptSeed = computed(() => {
    if (recentActivatedEmotionName.value) {
      return `Evening reflection\n\nToday I felt ${recentActivatedEmotionName.value} at times.\n\nWhat happened, what did I need, and what did I learn?`
    }

    return 'Evening reflection\n\nWhat mattered today? What did I learn about myself? What do I want to carry into tomorrow?'
  })

  const journalEntryContext = computed<'morning' | 'evening'>(() =>
    todayDate.value.getHours() >= 16 ? 'evening' : 'morning',
  )

  const supportState = computed(() =>
    buildTodaySupportState({
      now: todayDate.value,
      currentWeekPlan: currentWeekPlan.value,
      todayJournalCount: todayJournalCount.value,
      hasTodayJournal: hasTodayJournal.value,
      todayEmotionCount: todayEmotionCount.value,
      emotionTarget: userPreferencesStore.dailyEmotionTarget,
      reflectionBadges: reflectionItems.value.map((item) => ({
        key: item.key,
        isDue: item.isDue,
      })),
      recommendations: recommendations.value,
      ifsPartCount: ifsPartStore.parts.length,
      ifsDoneToday: ifsDoneToday.value,
      ifsWeeklyCheckInCount: ifsDailyCheckInStore.weeklyCheckInCount,
    }),
  )

  async function loadData() {
    isLoading.value = true
    loadError.value = null

    try {
      const currentYear = getCurrentYear()

      await Promise.all([
        userPreferencesStore.loadPreferences(),
        journalStore.loadEntries(),
        emotionLogStore.loadLogs(),
        emotionStore.loadEmotions(),
        yearlyPlanStore.loadYearlyPlans({ year: currentYear }),
        monthlyPlanStore.loadMonthlyPlans(),
        weeklyPlanStore.loadWeeklyPlans(),
        commitmentStore.loadCommitments(),
        lifeAreaStore.loadLifeAreas(),
        priorityStore.loadPriorities(currentYear),
        projectStore.loadProjects(),
        trackerStore.loadTrackers(),
        trackerStore.loadTrackerPeriods(),
        habitStore.loadHabits(),
        weeklyReflectionStore.loadWeeklyReflections(),
        monthlyReflectionStore.loadMonthlyReflections(),
        yearlyReflectionStore.loadYearlyReflections(),
        ifsPartStore.loadParts(),
        ifsDailyCheckInStore.loadCheckIns(),
      ])
    } catch (error) {
      console.error('Failed to load grounding data for Today view:', error)
      loadError.value =
        error instanceof Error ? error.message : 'Failed to load Today grounding data.'
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    loadError,
    loadData,
    todayDate,
    todayIsoDate,
    todayJournalEntries,
    todayEmotionLogs,
    todayJournalCount,
    todayEmotionCount,
    hasTodayJournal,
    weekSummary,
    hasMeaningfulWeekSummary,
    focusChains,
    priorityCompassItems,
    progressLanes,
    supportState,
    currentYearPlan,
    currentMonthPlan,
    currentWeekPlan,
    currentWeekCommitments,
    commitmentProgress,
    activePriorities,
    topActivePriorities,
    monthLabel,
    weekLabel,
    yearLabel,
    recommendations,
    weeklyReflectionDue,
    monthlyReflectionDue,
    yearlyReflectionDue,
    dueReflectionCount,
    hasAnyReflectionDue,
    reflectionItems,
    morningPromptSeed,
    eveningPromptSeed,
    journalEntryContext,
    stores: {
      userPreferencesStore,
      lifeAreaStore,
      priorityStore,
      projectStore,
      trackerStore,
      habitStore,
      commitmentStore,
      monthlyReflectionStore,
      weeklyReflectionStore,
      yearlyReflectionStore,
      ifsDailyCheckInStore,
    },
  }
}
