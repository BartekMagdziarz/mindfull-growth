import { computed, nextTick, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { Habit, KeyResult, MeasurementTarget, Priority, Tracker } from '@/domain/planning'
import type { DayRef, MonthRef, WeekRef, YearRef } from '@/domain/period'
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
import { isGoalOpen, isMeasurementSubjectOpen } from '@/services/planningVisibility'
import {
  activateMeasurementInMonth,
  assignMeasurementToWholeMonthView,
  clearMeasurementPlacementInMonthView,
  deactivateMeasurementFromMonthView,
  linkGoalToMonth,
  toggleMeasurementWeekAssignment,
  unlinkGoalFromMonth,
  updateMeasurementTargetOverride,
  updateMeasurementWeekTargetOverride,
} from '@/services/planningMutations'
import { distributeTargetEvenly } from '@/domain/weekTargetDistribution'
import {
  getChildPeriods,
  getPeriodBounds,
  getPeriodRefsForDate,
  getWeekOverlappingMonths,
} from '@/utils/periods'
import type {
  ActiveAssignment,
  CalendarAssignmentItem,
  EditableSubjectKind,
  GoalSection,
  PlannerPlacementMode,
  PlannerMeasurementRow,
  PlannerMonthWeekRow,
  PlannerWeekTargetSummary,
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
  const hasLoadedOnce = ref(false)

  const monthWeekRefs = computed(() => getChildPeriods(monthRef.value) as WeekRef[])
  const monthWeekRefSet = computed(() => new Set(monthWeekRefs.value))
  const bounds = computed(() => getPeriodBounds(monthRef.value))

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

  function formatWeekRange(weekRef: WeekRef): string {
    const { start, end } = getPeriodBounds(weekRef)
    const startDate = new Date(`${start}T00:00:00`)
    const endDate = new Date(`${end}T00:00:00`)
    const dayMonth = new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' })
    if (start.slice(0, 7) === end.slice(0, 7)) {
      const dayOnly = new Intl.DateTimeFormat(locale.value, { day: 'numeric' })
      return `${dayOnly.format(startDate)}–${dayMonth.format(endDate)}`
    }
    return `${dayMonth.format(startDate)} – ${dayMonth.format(endDate)}`
  }

  function qualifiesForWeekTargetSum(target: MeasurementTarget): boolean {
    return target.kind === 'count' || (target.kind === 'value' && target.aggregation === 'sum')
  }

  function explicitlyPlacedWeeks(row: PlannerMeasurementRow): WeekRef[] {
    return monthWeekRefs.value.filter(weekRef => {
      const scope = row.weekScopeByRef[weekRef]
      return scope === 'whole-week' || scope === 'specific-days'
    })
  }

  const weekRows = computed<PlannerMonthWeekRow[]>(() => {
    const row = assignmentRow.value
    const weekdayFormatter = new Intl.DateTimeFormat(locale.value, { weekday: 'short' })
    const rowViaWholeMonth = Boolean(
      row &&
        row.cadence === 'monthly' &&
        row.monthScheduleScope === 'whole-month' &&
        !hasExplicitPlacement(row)
    )

    return monthWeekRefs.value.map(weekRef => {
      const scope = row?.weekScopeByRef[weekRef]
      const isExplicit = scope === 'whole-week' || scope === 'specific-days'
      const scheduledInWeek = row
        ? row.scheduledDayRefs.filter(dayRef => getPeriodRefsForDate(dayRef).week === weekRef)
        : []
      const weekTargetOverride = row?.weekTargetOverrideByRef[weekRef]

      return {
        weekRef,
        label: weekRef.slice(6),
        rangeLabel: formatWeekRange(weekRef),
        isBoundary: getWeekOverlappingMonths(weekRef).length > 1,
        chips: row ? [] : activeRowsForWeek(weekRef),
        assignmentScope: scope,
        isAssignedInWeek: Boolean(
          row && (isExplicit || scheduledInWeek.length > 0 || rowViaWholeMonth)
        ),
        viaWholeMonth: rowViaWholeMonth,
        dayBadge:
          scheduledInWeek.length > 0
            ? {
                count: scheduledInWeek.length,
                days: scheduledInWeek
                  .map(dayRef => weekdayFormatter.format(new Date(`${dayRef}T00:00:00`)))
                  .join(', '),
              }
            : undefined,
        weekTargetOverride,
        effectiveTarget:
          row && row.subjectType !== 'tracker'
            ? weekTargetOverride ?? editableTarget(row)
            : undefined,
        canEditTarget: Boolean(row && row.subjectType !== 'tracker' && isExplicit),
      }
    })
  })

  const weekTargetSummary = computed<PlannerWeekTargetSummary | null>(() => {
    const row = assignmentRow.value
    if (!row || row.cadence !== 'monthly' || row.subjectType === 'tracker') return null
    const target = editableTarget(row)
    if (!target || !qualifiesForWeekTargetSum(target)) return null

    const overrides = monthWeekRefs.value.flatMap(weekRef => {
      const override = row.weekTargetOverrideByRef[weekRef]
      return override ? [override.value] : []
    })
    if (overrides.length === 0) return null

    const assigned = Math.round(overrides.reduce((sum, value) => sum + value, 0) * 100) / 100
    return { assigned, total: target.value }
  })

  const canDistributeWeekTargets = computed(() => {
    const row = assignmentRow.value
    if (!row || row.cadence !== 'monthly' || row.subjectType === 'tracker') return false
    const target = editableTarget(row)
    return Boolean(target && qualifiesForWeekTargetSum(target) && explicitlyPlacedWeeks(row).length > 0)
  })

  watch(
    () => monthRef.value,
    async () => {
      activeAssignment.value = null
      await loadPlannerData({ showLoading: true })
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
    const weekTargetOverrideByRef: PlannerMeasurementRow['weekTargetOverrideByRef'] = {}
    for (const state of relevantWeekStates) {
      weekScopeByRef[state.weekRef] = state.scheduleScope
      if (state.targetOverride) {
        weekTargetOverrideByRef[state.weekRef] = state.targetOverride
      }
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
      weekTargetOverrideByRef,
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

  function rowVisibleInWeek(row: PlannerMeasurementRow, weekRef: WeekRef): boolean {
    if (!row.isActive) return false

    const scope = row.weekScopeByRef[weekRef]
    if (scope === 'whole-week' || scope === 'specific-days') return true
    if (row.scheduledDayRefs.some(dayRef => getPeriodRefsForDate(dayRef).week === weekRef)) {
      return true
    }

    if (row.cadence === 'monthly' && !hasExplicitPlacement(row)) {
      return row.monthScheduleScope === 'whole-month'
    }

    return false
  }

  const typeOrder: Record<SubjectKind, number> = {
    keyResult: 0,
    habit: 1,
    tracker: 2,
  }

  function activeRowsForWeek(weekRef: WeekRef): CalendarAssignmentItem[] {
    return allRows.value
      .filter(row => rowVisibleInWeek(row, weekRef))
      .map(row => ({
        key: rowKey(row),
        title: row.title,
        icon: row.icon,
        subjectType: row.subjectType,
        isActiveAssignment: isAssignmentActive(row),
        groupKey: row.goalId ?? row.id,
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

  function startAssigning(item: PlannerMeasurementRow, mode: PlannerPlacementMode = 'weeks'): void {
    // Inactive items are intentionally allowed — toggleMeasurementWeekAssignment
    // and assignMeasurementToWholeMonthView activate the item atomically when the
    // user picks a week/whole-month.
    activeAssignment.value = {
      subjectType: item.subjectType,
      subjectId: item.id,
      cadence: item.cadence,
      mode,
    }
  }

  function toggleAssigning(item: PlannerMeasurementRow): void {
    if (isAssignmentActive(item)) {
      activeAssignment.value = null
      return
    }
    startAssigning(item)
  }

  async function ensureGoalLinked(item: PlannerMeasurementRow): Promise<void> {
    if (item.subjectType !== 'keyResult' || !item.goalId) return
    const section = goalSections.value.find(goal => goal.id === item.goalId)
    if (!section || section.isActive) return
    await linkGoalToMonth(item.goalId, monthRef.value)
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
      await loadPlannerData({ showLoading: false })
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

  async function loadPlannerData(options: { showLoading?: boolean } = {}): Promise<void> {
    const showLoading = options.showLoading ?? !hasLoadedOnce.value
    if (showLoading) {
      isLoading.value = true
    }
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
        priority =>
          priority.status === 'active' &&
          priority.years.includes(monthRef.value.slice(0, 4) as YearRef)
      ).sort(
        (left, right) =>
          (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) ||
          left.title.localeCompare(right.title)
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

      const openGoals = goals.filter(isGoalOpen)
      const openKeyResults = keyResults.filter(isMeasurementSubjectOpen)
      const openHabits = habits.filter(isMeasurementSubjectOpen)
      const openTrackers = trackers.filter(isMeasurementSubjectOpen)

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
      hasLoadedOnce.value = true
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
      await ensureGoalLinked(item)
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

  async function applyWholePeriod(item: PlannerMeasurementRow): Promise<void> {
    // Inactive items are intentionally allowed — assignMeasurementToWholeMonthView
    // activates and assigns the whole month atomically.
    activeAssignment.value = null

    await withSave(`${rowKey(item)}:whole-month`, async () => {
      await ensureGoalLinked(item)
      await assignMeasurementToWholeMonthView({
        monthRef: monthRef.value,
        cadence: item.cadence,
        subjectType: item.subjectType,
        subjectId: item.id,
      })
    })
  }

  async function handleWholeMonth(): Promise<void> {
    const row = assignmentRow.value
    if (!row) return
    await applyWholePeriod(row)
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

    await withSave(`${rowKey(row)}:${weekRef}`, async () => {
      await ensureGoalLinked(row)
      await toggleMeasurementWeekAssignment({
        weekRef,
        cadence: row.cadence,
        monthRef: row.cadence === 'monthly' ? monthRef.value : undefined,
        subjectType: row.subjectType,
        subjectId: row.id,
      })
    })
  }

  async function handleWeekTargetChange(weekRef: WeekRef, value: number): Promise<void> {
    const row = assignmentRow.value
    if (!row || row.subjectType === 'tracker') return
    const target = editableTarget(row)
    if (!target || !Number.isFinite(value)) return

    const normalizedValue = target.kind === 'count' ? Math.max(0, Math.round(value)) : value
    await withSave(`${rowKey(row)}:${weekRef}:target`, () =>
      updateMeasurementWeekTargetOverride({
        weekRef,
        subjectType: row.subjectType,
        subjectId: row.id,
        cadence: row.cadence,
        monthRef: row.cadence === 'monthly' ? monthRef.value : undefined,
        targetOverride: { ...target, value: normalizedValue } as MeasurementTarget,
      })
    )
  }

  async function handleWeekTargetClear(weekRef: WeekRef): Promise<void> {
    const row = assignmentRow.value
    if (!row || row.subjectType === 'tracker') return

    await withSave(`${rowKey(row)}:${weekRef}:target`, () =>
      updateMeasurementWeekTargetOverride({
        weekRef,
        subjectType: row.subjectType,
        subjectId: row.id,
        cadence: row.cadence,
        monthRef: row.cadence === 'monthly' ? monthRef.value : undefined,
        targetOverride: undefined,
      })
    )
  }

  async function handleDistributeEvenly(): Promise<void> {
    const row = assignmentRow.value
    if (!row || row.cadence !== 'monthly' || row.subjectType === 'tracker') return
    const target = editableTarget(row)
    if (!target || !qualifiesForWeekTargetSum(target)) return

    const weeks = explicitlyPlacedWeeks(row)
    if (weeks.length === 0) return

    const values = distributeTargetEvenly(target.value, weeks.length, target.kind === 'count')
    await withSave(`${rowKey(row)}:distribute`, async () => {
      for (const [index, weekRef] of weeks.entries()) {
        await updateMeasurementWeekTargetOverride({
          weekRef,
          subjectType: row.subjectType,
          subjectId: row.id,
          cadence: row.cadence,
          monthRef: monthRef.value,
          targetOverride: { ...target, value: values[index] ?? 0 } as MeasurementTarget,
        })
      }
    })
  }

  function canToggleWeek(): boolean {
    return Boolean(assignmentRow.value)
  }

  const keyResultRows = computed<PlannerMeasurementRow[]>(() =>
    goalSections.value.flatMap(goal => goal.keyResults)
  )

  return {
    isLoading,
    loadError,
    savingKey,
    priorityOptions,
    goalSections,
    keyResultRows,
    habitRows,
    trackerRows,
    activeAssignment,
    assignmentRow,
    weekRows,
    weekTargetSummary,
    canDistributeWeekTargets,
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
    toggleAssigning,
    findNextUnassignedKey,
    toggleGoal,
    toggleMeasurement,
    applyWholePeriod,
    handleTargetOperatorChange,
    handleTargetAggregationChange,
    handleTargetValueChange,
    handleClearOverride,
    handleWholeMonth,
    handleClearPlacement,
    handleWeekToggle,
    handleWeekTargetChange,
    handleWeekTargetClear,
    handleDistributeEvenly,
    canToggleWeek,
    rowVisibleInWeek,
  }
}
