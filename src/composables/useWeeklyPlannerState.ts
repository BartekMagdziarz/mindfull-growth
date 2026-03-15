import { computed, nextTick, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { Habit, KeyResult, MeasurementTarget, Tracker } from '@/domain/planning'
import type { DayRef, WeekRef } from '@/domain/period'
import type {
  GoalMonthState,
  MeasurementMonthState,
  MeasurementSubjectType,
  MeasurementWeekState,
} from '@/domain/planningState'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import {
  clearMeasurementPlacementInWeek,
  linkMeasurementPeriod,
  toggleMeasurementDayAssignment,
  toggleMeasurementWeekAssignment,
  unlinkMeasurementPeriod,
  updateMeasurementTargetOverride,
} from '@/services/planningMutations'
import { getChildPeriods, getPeriodBounds, getPeriodRefsForDate, getWeekOverlappingMonths } from '@/utils/periods'
import type {
  ActiveAssignment,
  CalendarAssignmentItem,
  EditableSubjectKind,
  GoalSection,
  PlannerInitiativeRow,
  PlannerMeasurementRow,
  PlannerWeekDay,
  SubjectKind,
} from '@/components/calendar/plannerTypes'

export type WeeklyPlannerTab = 'goals' | 'habits' | 'trackers' | 'initiatives'

export function useWeeklyPlannerState(
  weekRef: Ref<WeekRef>,
  locale: Ref<string>,
  emit: (event: 'updated') => void
) {
  const isLoading = ref(true)
  const loadError = ref<string | null>(null)
  const savingKey = ref('')
  const goalSections = ref<GoalSection[]>([])
  const habitRows = ref<PlannerMeasurementRow[]>([])
  const trackerRows = ref<PlannerMeasurementRow[]>([])
  const initiativeRows = ref<PlannerInitiativeRow[]>([])
  const activeAssignment = ref<ActiveAssignment | null>(null)

  const overlappingMonthRefs = computed(() => getWeekOverlappingMonths(weekRef.value))
  const weekDayRefs = computed(() => getChildPeriods(weekRef.value) as DayRef[])
  const weekDayRefSet = computed(() => new Set(weekDayRefs.value))
  const bounds = computed(() => getPeriodBounds(weekRef.value))

  const weekdayHeaders = computed(() => {
    const formatter = new Intl.DateTimeFormat(locale.value, { weekday: 'short' })
    return weekDayRefs.value.map(dayRef =>
      formatter.format(new Date(`${dayRef}T00:00:00`))
    )
  })

  const monthBadgeFormatter = computed(
    () => new Intl.DateTimeFormat(locale.value, { month: 'short' })
  )

  const allRows = computed(() => [
    ...goalSections.value.flatMap(goal => goal.keyResults),
    ...habitRows.value,
    ...trackerRows.value,
  ])

  const rowMap = computed(() => {
    const map = new Map<string, PlannerMeasurementRow>()
    for (const row of allRows.value) {
      map.set(rowKey(row), row)
    }
    return map
  })

  const assignmentRow = computed(() =>
    activeAssignment.value
      ? rowMap.value.get(
          `${activeAssignment.value.subjectType}:${activeAssignment.value.subjectId}`
        )
      : undefined
  )

  const calendarDays = computed<PlannerWeekDay[]>(() =>
    weekDayRefs.value.map(dayRef => {
      const dayMonth = getPeriodRefsForDate(dayRef).month
      return {
        dayRef,
        label: dayRef.slice(-2),
        inMonth: overlappingMonthRefs.value.includes(dayMonth),
        monthLabel: monthBadgeFormatter.value
          .format(new Date(`${dayRef}T00:00:00`))
          .replace('.', '')
          .toUpperCase(),
        items: activeRowsForDay(dayRef),
      }
    })
  )

  watch(
    () => weekRef.value,
    async () => {
      activeAssignment.value = null
      await loadPlannerData()
    },
    { immediate: true }
  )

  function rowKey(row: Pick<PlannerMeasurementRow, 'subjectType' | 'id'>): string {
    return `${row.subjectType}:${row.id}`
  }

  function buildMeasurementRow(
    item: KeyResult | Habit | Tracker,
    subjectType: SubjectKind,
    monthStates: Map<string, MeasurementMonthState>,
    weekStates: MeasurementWeekState[],
    dayAssignments: Array<{
      subjectType: MeasurementSubjectType
      subjectId: string
      dayRef: DayRef
    }>,
    goalIconMap?: Map<string, string>
  ): PlannerMeasurementRow {
    const key = `${subjectType}:${item.id}`

    // For weekly planner, find month states from any overlapping month
    const monthState =
      monthStates.get(key) ??
      [...monthStates.values()].find(
        state => state.subjectType === subjectType && state.subjectId === item.id
      )

    // Filter week states to just this week
    const relevantWeekStates = weekStates.filter(state => {
      if (state.subjectType !== subjectType || state.subjectId !== item.id) return false
      return state.weekRef === weekRef.value
    })

    const weekScopeByRef: PlannerMeasurementRow['weekScopeByRef'] = {}
    for (const state of relevantWeekStates) {
      weekScopeByRef[state.weekRef] = state.scheduleScope
    }

    const scheduledDayRefs = dayAssignments
      .filter(
        assignment =>
          assignment.subjectType === subjectType &&
          assignment.subjectId === item.id &&
          weekDayRefSet.value.has(assignment.dayRef)
      )
      .map(assignment => assignment.dayRef)

    const itemIcon = 'icon' in item ? (item as { icon?: string }).icon : undefined
    const resolvedIcon =
      itemIcon ??
      ('goalId' in item && goalIconMap
        ? goalIconMap.get((item as KeyResult).goalId)
        : undefined)

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      icon: resolvedIcon,
      subjectType,
      cadence: item.cadence,
      target: 'target' in item ? item.target : undefined,
      targetOverride: monthState?.targetOverride,
      goalId: 'goalId' in item ? item.goalId : undefined,
      isActive:
        monthState?.activityState === 'active' ||
        Object.keys(weekScopeByRef).length > 0 ||
        scheduledDayRefs.length > 0,
      monthScheduleScope: monthState?.scheduleScope,
      weekScopeByRef,
      scheduledDayRefs,
    }
  }

  function isVisible(row: PlannerMeasurementRow): boolean {
    // Weekly cadence: always show all open items
    if (row.cadence === 'weekly') return true
    // Monthly cadence: only if has month state, week state, or day assignments
    if (row.isActive) return true
    if (row.monthScheduleScope === 'whole-month') return true
    return false
  }

  function hasExplicitPlacement(row: PlannerMeasurementRow): boolean {
    return (
      Object.values(row.weekScopeByRef).some(
        scope => scope === 'whole-week' || scope === 'specific-days'
      ) || row.scheduledDayRefs.length > 0
    )
  }

  function rowVisibleOnDay(row: PlannerMeasurementRow, dayRef: DayRef, inMonth: boolean): boolean {
    if (!row.isActive) return false
    if (row.scheduledDayRefs.includes(dayRef)) return true

    const weekScope = row.weekScopeByRef[weekRef.value]
    if (weekScope === 'whole-week') return true

    if (row.cadence === 'monthly') {
      if (hasExplicitPlacement(row)) return false
      return row.monthScheduleScope === 'whole-month' && inMonth
    }

    return false
  }

  const typeOrder: Record<SubjectKind, number> = {
    keyResult: 0,
    habit: 1,
    tracker: 2,
  }

  function activeRowsForDay(dayRef: DayRef): CalendarAssignmentItem[] {
    const dayMonth = getPeriodRefsForDate(dayRef).month
    const inMonth = overlappingMonthRefs.value.includes(dayMonth)

    return allRows.value
      .filter(row => rowVisibleOnDay(row, dayRef, inMonth))
      .map(row => ({
        key: rowKey(row),
        title: row.title,
        icon: row.icon,
        subjectType: row.subjectType,
        isActiveAssignment: isAssignmentActive(row),
      }))
      .sort((left, right) => {
        if (left.isActiveAssignment && !right.isActiveAssignment) return -1
        if (!left.isActiveAssignment && right.isActiveAssignment) return 1
        const typeA = typeOrder[left.subjectType]
        const typeB = typeOrder[right.subjectType]
        if (typeA !== typeB) return typeA - typeB
        return left.title.localeCompare(right.title)
      })
  }

  function editableTarget(item: PlannerMeasurementRow): MeasurementTarget | undefined {
    return item.targetOverride ?? item.target
  }

  function operatorOptions(target: MeasurementTarget): string[] {
    return target.kind === 'count' ? ['min', 'max'] : ['gte', 'lte']
  }

  function aggregationOptions(target: MeasurementTarget): string[] {
    if (target.kind === 'count') return []
    return target.kind === 'rating' ? ['average'] : ['sum', 'average', 'last']
  }

  function aggregationValue(target: MeasurementTarget): string {
    switch (target.kind) {
      case 'count':
        return ''
      case 'rating':
        return 'average'
      case 'value':
        return target.aggregation
    }
  }

  function isAssignmentActive(item: PlannerMeasurementRow): boolean {
    return (
      activeAssignment.value?.subjectType === item.subjectType &&
      activeAssignment.value?.subjectId === item.id
    )
  }

  function isAssigned(row: PlannerMeasurementRow): boolean {
    if (!row.isActive) return false
    if (row.cadence === 'monthly') {
      return row.monthScheduleScope === 'whole-month' || hasExplicitPlacement(row)
    }
    return hasExplicitPlacement(row)
  }

  function startAssigning(item: PlannerMeasurementRow): void {
    if (!item.isActive) return
    activeAssignment.value = {
      subjectType: item.subjectType,
      subjectId: item.id,
      cadence: item.cadence,
    }
  }

  function stopAssigning(): void {
    activeAssignment.value = null
  }

  function findNextUnassignedKey(currentTab: WeeklyPlannerTab): string | null {
    if (currentTab === 'initiatives') return null
    const items =
      currentTab === 'goals'
        ? goalSections.value.flatMap(g => g.keyResults)
        : currentTab === 'habits'
          ? habitRows.value
          : trackerRows.value
    const next = items.find(item => item.isActive && !isAssigned(item))
    return next ? rowKey(next) : null
  }

  async function withSave<T>(key: string, action: () => Promise<T>): Promise<void> {
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    savingKey.value = key
    try {
      await action()
      await loadPlannerData()
      await nextTick()
      if (!/jsdom/i.test(window.navigator.userAgent)) {
        requestAnimationFrame(() => {
          window.scrollTo(scrollX, scrollY)
        })
      }
      emit('updated')
    } finally {
      savingKey.value = ''
    }
  }

  async function loadPlannerData(): Promise<void> {
    isLoading.value = true
    loadError.value = null

    try {
      const monthRefs = overlappingMonthRefs.value

      const [
        goals,
        keyResults,
        habits,
        trackers,
        initiatives,
        goalStates,
        monthStates,
        weekStates,
        dayAssignments,
        initiativePlanStates,
      ] = await Promise.all([
        goalDexieRepository.listAll(),
        keyResultDexieRepository.listAll(),
        habitDexieRepository.listAll(),
        trackerDexieRepository.listAll(),
        initiativeDexieRepository.listAll(),
        planningStateDexieRepository.listGoalMonthStatesForMonths(monthRefs),
        planningStateDexieRepository.listMeasurementMonthStatesForMonths(monthRefs),
        planningStateDexieRepository.listMeasurementWeekStatesForWeeks([weekRef.value]),
        planningStateDexieRepository.listMeasurementDayAssignmentsForDayRange(
          bounds.value.start,
          bounds.value.end
        ),
        planningStateDexieRepository.listInitiativePlanStates(),
      ])

      const activeGoalIds = new Set(
        goalStates
          .filter((state: GoalMonthState) => state.activityState === 'active')
          .map(state => state.goalId)
      )

      // Build month state map keyed by subjectType:subjectId
      // For overlapping months, pick the first active state found
      const monthStateMap = new Map<string, MeasurementMonthState>()
      for (const state of monthStates) {
        if (state.activityState === 'active') {
          const key = `${state.subjectType}:${state.subjectId}`
          if (!monthStateMap.has(key)) {
            monthStateMap.set(key, state)
          }
        }
      }

      const openGoals = goals.filter(goal => goal.isActive && goal.status === 'open')
      const openKeyResults = keyResults.filter(item => item.isActive && item.status === 'open')
      const openHabits = habits.filter(item => item.isActive && item.status === 'open')
      const openTrackers = trackers.filter(item => item.isActive && item.status === 'open')
      const openInitiatives = initiatives.filter(item => item.isActive && item.status === 'open')

      const goalIconMap = new Map<string, string>()
      const goalTitleMap = new Map<string, string>()
      for (const goal of openGoals) {
        if (goal.icon) goalIconMap.set(goal.id, goal.icon)
        goalTitleMap.set(goal.id, goal.title)
      }

      goalSections.value = openGoals.map(goal => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        icon: goal.icon,
        isActive: activeGoalIds.has(goal.id),
        keyResults: openKeyResults
          .filter(item => item.goalId === goal.id)
          .map(item =>
            buildMeasurementRow(
              item,
              'keyResult',
              monthStateMap,
              weekStates,
              dayAssignments,
              goalIconMap
            )
          )
          .filter(isVisible),
      }))

      habitRows.value = openHabits
        .map(item =>
          buildMeasurementRow(item, 'habit', monthStateMap, weekStates, dayAssignments)
        )
        .filter(isVisible)

      trackerRows.value = openTrackers
        .map(item =>
          buildMeasurementRow(item, 'tracker', monthStateMap, weekStates, dayAssignments)
        )
        .filter(isVisible)

      // Build initiative rows — show if plan state has weekRef matching this week or dayRef in this week
      const weekDays = weekDayRefSet.value
      initiativeRows.value = openInitiatives
        .map(initiative => {
          const planState = initiativePlanStates.find(s => s.initiativeId === initiative.id)
          const isPlannedThisWeek = planState
            ? planState.weekRef === weekRef.value ||
              Boolean(planState.dayRef && weekDays.has(planState.dayRef))
            : false

          const assignedDayRefs: DayRef[] = planState?.dayRef && weekDays.has(planState.dayRef)
            ? [planState.dayRef]
            : []

          return {
            id: initiative.id,
            title: initiative.title,
            description: initiative.description,
            goalId: initiative.goalId,
            goalTitle: initiative.goalId ? goalTitleMap.get(initiative.goalId) : undefined,
            isPlannedThisWeek,
            assignedDayRefs,
          }
        })
        .filter(row => row.isPlannedThisWeek)

      if (activeAssignment.value) {
        const current = rowMap.value.get(
          `${activeAssignment.value.subjectType}:${activeAssignment.value.subjectId}`
        )
        if (!current?.isActive) {
          activeAssignment.value = null
        }
      }
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : String(error)
    } finally {
      isLoading.value = false
    }
  }

  function editableSubjectType(subjectType: SubjectKind): EditableSubjectKind {
    return subjectType === 'keyResult' ? 'keyResult' : 'habit'
  }

  async function toggleMeasurement(item: PlannerMeasurementRow): Promise<void> {
    await withSave(rowKey(item), async () => {
      if (item.isActive) {
        if (isAssignmentActive(item)) activeAssignment.value = null
        await unlinkMeasurementPeriod({
          periodRef: weekRef.value,
          cadence: item.cadence,
          subjectType: item.subjectType,
          subjectId: item.id,
        })
        return
      }
      await linkMeasurementPeriod({
        periodRef: weekRef.value,
        cadence: item.cadence,
        subjectType: item.subjectType,
        subjectId: item.id,
      })
    })
  }

  async function saveTargetOverride(
    subjectType: EditableSubjectKind,
    payload: { subjectId: string; target: MeasurementTarget }
  ): Promise<void> {
    // Use first overlapping month for target overrides
    const monthRef = overlappingMonthRefs.value[0]
    if (!monthRef) return

    await withSave(`${subjectType}:${payload.subjectId}:target`, () =>
      updateMeasurementTargetOverride({
        monthRef,
        subjectType,
        subjectId: payload.subjectId,
        targetOverride: payload.target,
      })
    )
  }

  async function clearTargetOverride(
    subjectType: EditableSubjectKind,
    subjectId: string
  ): Promise<void> {
    const monthRef = overlappingMonthRefs.value[0]
    if (!monthRef) return

    await withSave(`${subjectType}:${subjectId}:target`, () =>
      updateMeasurementTargetOverride({
        monthRef,
        subjectType,
        subjectId,
        targetOverride: undefined,
      })
    )
  }

  async function handleTargetOperatorChange(
    item: PlannerMeasurementRow,
    value: string
  ): Promise<void> {
    const target = editableTarget(item)
    if (!target || item.subjectType === 'tracker') return

    await saveTargetOverride(editableSubjectType(item.subjectType), {
      subjectId: item.id,
      target:
        target.kind === 'count'
          ? { ...target, operator: value as typeof target.operator }
          : { ...target, operator: value as typeof target.operator },
    })
  }

  async function handleTargetAggregationChange(
    item: PlannerMeasurementRow,
    value: string
  ): Promise<void> {
    const target = editableTarget(item)
    if (!target || target.kind === 'count' || item.subjectType === 'tracker') return

    await saveTargetOverride(editableSubjectType(item.subjectType), {
      subjectId: item.id,
      target:
        target.kind === 'rating'
          ? { ...target, aggregation: 'average' }
          : { ...target, aggregation: value as typeof target.aggregation },
    })
  }

  async function handleTargetValueChange(
    item: PlannerMeasurementRow,
    value: number
  ): Promise<void> {
    const target = editableTarget(item)
    if (!target || item.subjectType === 'tracker') return

    await saveTargetOverride(editableSubjectType(item.subjectType), {
      subjectId: item.id,
      target: { ...target, value },
    })
  }

  async function handleClearOverride(item: PlannerMeasurementRow): Promise<void> {
    if (item.subjectType === 'tracker') return
    await clearTargetOverride(editableSubjectType(item.subjectType), item.id)
  }

  async function handleWholeWeek(): Promise<void> {
    const row = assignmentRow.value
    if (!row) return

    const monthRef = row.cadence === 'monthly' ? overlappingMonthRefs.value[0] : undefined

    await withSave(`${rowKey(row)}:whole-week`, () =>
      toggleMeasurementWeekAssignment({
        weekRef: weekRef.value,
        cadence: row.cadence,
        monthRef,
        subjectType: row.subjectType,
        subjectId: row.id,
      })
    )
  }

  async function handleClearPlacement(): Promise<void> {
    const row = assignmentRow.value
    if (!row) return

    const monthRef = row.cadence === 'monthly' ? overlappingMonthRefs.value[0] : undefined

    await withSave(`${rowKey(row)}:clear`, () =>
      clearMeasurementPlacementInWeek({
        weekRef: weekRef.value,
        cadence: row.cadence,
        monthRef,
        subjectType: row.subjectType,
        subjectId: row.id,
      })
    )
  }

  async function handleDayToggle(dayRef: DayRef): Promise<void> {
    const row = assignmentRow.value
    if (!row) return

    const dayMonthRef = getPeriodRefsForDate(dayRef).month

    await withSave(`${rowKey(row)}:${dayRef}`, () =>
      toggleMeasurementDayAssignment({
        dayRef,
        cadence: row.cadence,
        monthRef: row.cadence === 'monthly' ? dayMonthRef : undefined,
        subjectType: row.subjectType,
        subjectId: row.id,
      })
    )
  }

  function canToggleDay(_day: { inMonth: boolean }): boolean {
    return Boolean(activeAssignment.value)
  }

  return {
    isLoading,
    loadError,
    savingKey,
    goalSections,
    habitRows,
    trackerRows,
    initiativeRows,
    activeAssignment,
    assignmentRow,
    calendarDays,
    weekdayHeaders,
    allRows,
    loadPlannerData,
    rowKey,
    editableTarget,
    operatorOptions,
    aggregationOptions,
    aggregationValue,
    isAssignmentActive,
    isAssigned,
    startAssigning,
    stopAssigning,
    findNextUnassignedKey,
    toggleMeasurement,
    handleTargetOperatorChange,
    handleTargetAggregationChange,
    handleTargetValueChange,
    handleClearOverride,
    handleWholeWeek,
    handleClearPlacement,
    handleDayToggle,
    canToggleDay,
    rowVisibleOnDay,
  }
}
