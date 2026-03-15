import { computed, nextTick, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { Habit, KeyResult, MeasurementTarget, Priority, Tracker } from '@/domain/planning'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type {
  GoalMonthState,
  MeasurementMonthState,
  MeasurementSubjectType,
  MeasurementWeekState,
} from '@/domain/planningState'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import {
  activateMeasurementInMonth,
  assignMeasurementToWholeMonthView,
  clearMeasurementPlacementInMonthView,
  deactivateMeasurementFromMonthView,
  linkGoalToMonth,
  toggleMeasurementDayAssignment,
  toggleMeasurementWeekAssignment,
  unlinkGoalFromMonth,
  updateMeasurementTargetOverride,
} from '@/services/planningMutations'
import { getChildPeriods, getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'
import type {
  ActiveAssignment,
  CalendarAssignmentItem,
  EditableSubjectKind,
  GoalSection,
  PlannerMeasurementRow,
  PlannerWeek,
  SubjectKind,
} from '@/components/calendar/plannerTypes'

export function usePlannerState(
  monthRef: Ref<MonthRef>,
  locale: Ref<string>,
  emit: (event: 'updated') => void
) {
  const isLoading = ref(true)
  const loadError = ref<string | null>(null)
  const savingKey = ref('')
  const priorityOptions = ref<Priority[]>([])
  const goalSections = ref<GoalSection[]>([])
  const habitRows = ref<PlannerMeasurementRow[]>([])
  const trackerRows = ref<PlannerMeasurementRow[]>([])
  const activeAssignment = ref<ActiveAssignment | null>(null)

  const monthWeekRefs = computed(() => getChildPeriods(monthRef.value) as WeekRef[])
  const monthWeekRefSet = computed(() => new Set(monthWeekRefs.value))
  const bounds = computed(() => getPeriodBounds(monthRef.value))

  const weekdayHeaders = computed(() => {
    const formatter = new Intl.DateTimeFormat(locale.value, { weekday: 'short' })
    const firstWeek = getChildPeriods(monthRef.value)[0] as WeekRef | undefined
    if (!firstWeek) return []
    return (getChildPeriods(firstWeek) as DayRef[]).map(dayRef =>
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

  const calendarWeeks = computed<PlannerWeek[]>(() =>
    monthWeekRefs.value.map(weekRef => ({
      weekRef,
      label: weekRef.slice(5),
      days: (getChildPeriods(weekRef) as DayRef[]).map(dayRef => ({
        dayRef,
        label: dayRef.slice(-2),
        inMonth: getPeriodRefsForDate(dayRef).month === monthRef.value,
        monthLabel: monthBadgeFormatter.value
          .format(new Date(`${dayRef}T00:00:00`))
          .replace('.', '')
          .toUpperCase(),
        items: activeRowsForDay(dayRef, getPeriodRefsForDate(dayRef).month === monthRef.value),
      })),
    }))
  )

  watch(
    () => monthRef.value,
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
    const monthState = monthStates.get(key)
    const relevantWeekStates = weekStates.filter(state => {
      if (state.subjectType !== subjectType || state.subjectId !== item.id) return false
      if (item.cadence === 'monthly') return state.sourceMonthRef === monthRef.value
      return monthWeekRefSet.value.has(state.weekRef)
    })

    const weekScopeByRef: PlannerMeasurementRow['weekScopeByRef'] = {}
    for (const state of relevantWeekStates) {
      weekScopeByRef[state.weekRef] = state.scheduleScope
    }

    const scheduledDayRefs = dayAssignments
      .filter(
        assignment => assignment.subjectType === subjectType && assignment.subjectId === item.id
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

    const weekScope = row.weekScopeByRef[getPeriodRefsForDate(dayRef).week]
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

  function activeRowsForDay(dayRef: DayRef, inMonth: boolean): CalendarAssignmentItem[] {
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

  function findNextUnassignedKey(currentTab: 'goals' | 'habits' | 'trackers'): string | null {
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
      const [
        priorities,
        goals,
        keyResults,
        habits,
        trackers,
        goalStates,
        monthStates,
        weekStates,
        dayAssignments,
      ] = await Promise.all([
        priorityDexieRepository.listAll(),
        goalDexieRepository.listAll(),
        keyResultDexieRepository.listAll(),
        habitDexieRepository.listAll(),
        trackerDexieRepository.listAll(),
        planningStateDexieRepository.listGoalMonthStatesForMonths([monthRef.value]),
        planningStateDexieRepository.listMeasurementMonthStatesForMonths([monthRef.value]),
        planningStateDexieRepository.listMeasurementWeekStatesForWeeks(monthWeekRefs.value),
        planningStateDexieRepository.listMeasurementDayAssignmentsForDayRange(
          bounds.value.start,
          bounds.value.end
        ),
      ])

      priorityOptions.value = priorities.filter(
        priority => priority.isActive && priority.year === monthRef.value.slice(0, 4)
      )

      const activeGoalIds = new Set(
        goalStates
          .filter((state: GoalMonthState) => state.activityState === 'active')
          .map(state => state.goalId)
      )

      const monthStateMap = new Map<string, MeasurementMonthState>()
      for (const state of monthStates) {
        if (state.activityState === 'active') {
          monthStateMap.set(`${state.subjectType}:${state.subjectId}`, state)
        }
      }

      const openGoals = goals.filter(goal => goal.isActive && goal.status === 'open')
      const openKeyResults = keyResults.filter(item => item.isActive && item.status === 'open')
      const openHabits = habits.filter(item => item.isActive && item.status === 'open')
      const openTrackers = trackers.filter(item => item.isActive && item.status === 'open')

      const goalIconMap = new Map<string, string>()
      for (const goal of openGoals) {
        if (goal.icon) goalIconMap.set(goal.id, goal.icon)
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
          ),
      }))

      habitRows.value = openHabits.map(item =>
        buildMeasurementRow(item, 'habit', monthStateMap, weekStates, dayAssignments)
      )

      trackerRows.value = openTrackers.map(item =>
        buildMeasurementRow(item, 'tracker', monthStateMap, weekStates, dayAssignments)
      )

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

  async function toggleGoal(goalId: string): Promise<void> {
    const section = goalSections.value.find(item => item.id === goalId)
    if (!section) return

    await withSave(`goal:${goalId}`, async () => {
      if (section.isActive) {
        if (
          activeAssignment.value?.subjectType === 'keyResult' &&
          section.keyResults.some(item => item.id === activeAssignment.value?.subjectId)
        ) {
          activeAssignment.value = null
        }
        await unlinkGoalFromMonth(goalId, monthRef.value)
        return
      }
      await linkGoalToMonth(goalId, monthRef.value)
    })
  }

  async function toggleMeasurement(item: PlannerMeasurementRow): Promise<void> {
    await withSave(rowKey(item), async () => {
      if (item.isActive) {
        if (isAssignmentActive(item)) activeAssignment.value = null
        await deactivateMeasurementFromMonthView({
          monthRef: monthRef.value,
          cadence: item.cadence,
          subjectType: item.subjectType,
          subjectId: item.id,
        })
        return
      }
      await activateMeasurementInMonth({
        monthRef: monthRef.value,
        subjectType: item.subjectType,
        subjectId: item.id,
      })
    })
  }

  async function saveTargetOverride(
    subjectType: EditableSubjectKind,
    payload: { subjectId: string; target: MeasurementTarget }
  ): Promise<void> {
    await withSave(`${subjectType}:${payload.subjectId}:target`, () =>
      updateMeasurementTargetOverride({
        monthRef: monthRef.value,
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
    await withSave(`${subjectType}:${subjectId}:target`, () =>
      updateMeasurementTargetOverride({
        monthRef: monthRef.value,
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

  async function handleWholeMonth(): Promise<void> {
    const row = assignmentRow.value
    if (!row) return

    await withSave(`${rowKey(row)}:whole-month`, () =>
      assignMeasurementToWholeMonthView({
        monthRef: monthRef.value,
        cadence: row.cadence,
        subjectType: row.subjectType,
        subjectId: row.id,
      })
    )
  }

  async function handleClearPlacement(): Promise<void> {
    const row = assignmentRow.value
    if (!row) return

    await withSave(`${rowKey(row)}:clear`, () =>
      clearMeasurementPlacementInMonthView({
        monthRef: monthRef.value,
        cadence: row.cadence,
        subjectType: row.subjectType,
        subjectId: row.id,
      })
    )
  }

  async function handleWeekToggle(weekRef: WeekRef): Promise<void> {
    const row = assignmentRow.value
    if (!row) return

    await withSave(`${rowKey(row)}:${weekRef}`, () =>
      toggleMeasurementWeekAssignment({
        weekRef,
        cadence: row.cadence,
        monthRef: row.cadence === 'monthly' ? monthRef.value : undefined,
        subjectType: row.subjectType,
        subjectId: row.id,
      })
    )
  }

  async function handleDayToggle(dayRef: DayRef): Promise<void> {
    const row = assignmentRow.value
    if (!row) return

    if (row.cadence === 'monthly' && getPeriodRefsForDate(dayRef).month !== monthRef.value) return

    await withSave(`${rowKey(row)}:${dayRef}`, () =>
      toggleMeasurementDayAssignment({
        dayRef,
        cadence: row.cadence,
        monthRef: row.cadence === 'monthly' ? monthRef.value : undefined,
        subjectType: row.subjectType,
        subjectId: row.id,
      })
    )
  }

  function canToggleDay(day: { inMonth: boolean }): boolean {
    if (!assignmentRow.value) return false
    if (assignmentRow.value.cadence === 'monthly') return day.inMonth
    return true
  }

  return {
    isLoading,
    loadError,
    savingKey,
    priorityOptions,
    goalSections,
    habitRows,
    trackerRows,
    activeAssignment,
    assignmentRow,
    calendarWeeks,
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
    toggleGoal,
    toggleMeasurement,
    handleTargetOperatorChange,
    handleTargetAggregationChange,
    handleTargetValueChange,
    handleClearOverride,
    handleWholeMonth,
    handleClearPlacement,
    handleWeekToggle,
    handleDayToggle,
    canToggleDay,
    rowVisibleOnDay,
  }
}
