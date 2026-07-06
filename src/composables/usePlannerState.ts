import { computed, nextTick, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { Habit, KeyResult, MeasurementEntryDaysCondition, MeasurementTarget, Tracker } from '@/domain/planning'
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
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { isGoalOpen, isMeasurementSubjectOpen } from '@/services/planningVisibility'
import {
  assignMeasurementToWholeMonthView,
  deactivateMeasurementFromMonthView,
  linkGoalToMonth,
  materializeMeasurementDayAssignments,
  materializeMeasurementWeekPlacements,
  toggleMeasurementWeekAssignment,
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
  EditableSubjectKind,
  GoalSection,
  PlannerMeasurementRow,
  PlannerWeekTargetSummary,
  SubjectKind,
} from '@/components/calendar/plannerTypes'
import type { AssignmentMatrixCellState } from '@/components/calendar/assignmentMatrixTypes'

/** One column of the month matrix. */
export interface PlannerWeekColumn {
  weekRef: WeekRef
  /** Week number, e.g. "10". */
  label: string
  /** Localized date range, e.g. "9–15 mar". */
  rangeLabel: string
  /** Week overlaps the adjacent month. */
  isBoundary: boolean
}

export function usePlannerState(
  monthRef: Ref<MonthRef>,
  locale: Ref<string>,
  emit: (event: 'updated') => void
) {
  const isLoading = ref(true)
  const loadError = ref<string | null>(null)
  const savingKey = ref('')
  const goalSections = ref<GoalSection[]>([])
  const habitRows = ref<PlannerMeasurementRow[]>([])
  const trackerRows = ref<PlannerMeasurementRow[]>([])
  const hasLoadedOnce = ref(false)

  const monthWeekRefs = computed(() => getChildPeriods(monthRef.value) as WeekRef[])
  const monthWeekRefSet = computed(() => new Set(monthWeekRefs.value))
  const bounds = computed(() => getPeriodBounds(monthRef.value))

  const keyResultRows = computed<PlannerMeasurementRow[]>(() =>
    goalSections.value.flatMap(goal => goal.keyResults)
  )

  const allRows = computed(() => [
    ...keyResultRows.value,
    ...habitRows.value,
    ...trackerRows.value,
  ])

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

  const weekColumns = computed<PlannerWeekColumn[]>(() =>
    monthWeekRefs.value.map(weekRef => ({
      weekRef,
      label: weekRef.slice(6),
      rangeLabel: formatWeekRange(weekRef),
      isBoundary: getWeekOverlappingMonths(weekRef).length > 1,
    }))
  )

  watch(
    () => monthRef.value,
    async () => {
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
      entryMode: item.entryMode,
      target: 'target' in item ? item.target : undefined,
      targetOverride: monthState?.targetOverride,
      goalId: 'goalId' in item ? item.goalId : undefined,
      isActive:
        monthState?.activityState === 'active' ||
        Object.keys(weekScopeByRef).length > 0 ||
        scheduledDayRefs.length > 0,
      monthScheduleScope: monthState?.scheduleScope,
      monthStateRef: monthState?.monthRef,
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

  /**
   * Soft whole-month coverage: a monthly-cadence 'whole-month' scope, or a
   * grandfathered active-but-unassigned state (pre active ⇔ placed data) whose
   * downstream behavior is identical to whole-month. First cell edit
   * materializes it into explicit week placements.
   */
  function rowSoftKind(row: PlannerMeasurementRow): 'whole-month' | null {
    if (hasExplicitPlacement(row) || !row.isActive) return null
    // Active without explicit placement: an actual 'whole-month' scope, or a
    // residual active-but-unassigned state — downstream both behave the same.
    return 'whole-month'
  }

  function scheduledDaysInWeek(row: PlannerMeasurementRow, weekRef: WeekRef): DayRef[] {
    return row.scheduledDayRefs.filter(dayRef => getPeriodRefsForDate(dayRef).week === weekRef)
  }

  function weekCellState(row: PlannerMeasurementRow, weekRef: WeekRef): AssignmentMatrixCellState {
    const scope = row.weekScopeByRef[weekRef]
    if (
      scope === 'whole-week' ||
      scope === 'specific-days' ||
      scheduledDaysInWeek(row, weekRef).length > 0
    ) {
      return 'checked'
    }
    return rowSoftKind(row) ? 'soft' : 'empty'
  }

  /** Days scheduled in the weekly ritual — shown as a read-only cell badge. */
  function weekDayBadge(row: PlannerMeasurementRow, weekRef: WeekRef): number {
    return scheduledDaysInWeek(row, weekRef).length
  }

  function isAssigned(row: PlannerMeasurementRow): boolean {
    if (!row.isActive) return false
    if (row.cadence === 'monthly') {
      return row.monthScheduleScope === 'whole-month' || hasExplicitPlacement(row)
    }
    return hasExplicitPlacement(row)
  }

  /** Row participates in the month (enables clear + target editing). */
  function rowHasPlacement(row: PlannerMeasurementRow): boolean {
    return isAssigned(row) || rowSoftKind(row) !== null
  }

  /** Whole-month quick action renders pressed when the row covers every week. */
  function isWholePeriodApplied(row: PlannerMeasurementRow): boolean {
    if (rowSoftKind(row) === 'whole-month') return true
    if (row.cadence === 'weekly') {
      const wholeWeeks = monthWeekRefs.value.filter(
        weekRef => row.weekScopeByRef[weekRef] === 'whole-week'
      )
      return (
        wholeWeeks.length === monthWeekRefs.value.length &&
        monthWeekRefs.value.length > 0 &&
        row.scheduledDayRefs.length === 0
      )
    }
    return false
  }

  function editableTarget(item: PlannerMeasurementRow): MeasurementTarget | undefined {
    return item.targetOverride ?? item.target
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

  /** Sub-target rozpisanie applies to monthly-cadence rows with a summable target. */
  function canSplitTarget(row: PlannerMeasurementRow): boolean {
    if (row.cadence !== 'monthly' || row.subjectType === 'tracker') return false
    const target = editableTarget(row)
    return Boolean(target && qualifiesForWeekTargetSum(target))
  }

  function canDistribute(row: PlannerMeasurementRow): boolean {
    return canSplitTarget(row) && explicitlyPlacedWeeks(row).length > 0
  }

  /** Soft "rozpisane X z Y" for the row; null while no sub-targets exist. */
  function rowWeekTargetSummary(row: PlannerMeasurementRow): PlannerWeekTargetSummary | null {
    if (!canSplitTarget(row)) return null
    const target = editableTarget(row)
    if (!target) return null

    const overrides = monthWeekRefs.value.flatMap(weekRef => {
      const override = row.weekTargetOverrideByRef[weekRef]
      return override ? [override.value] : []
    })
    if (overrides.length === 0) return null

    const assigned = Math.round(overrides.reduce((sum, value) => sum + value, 0) * 100) / 100
    return { assigned, total: target.value }
  }

  async function ensureGoalLinked(item: PlannerMeasurementRow): Promise<void> {
    if (item.subjectType !== 'keyResult' || !item.goalId) return
    const section = goalSections.value.find(goal => goal.id === item.goalId)
    if (!section || section.isActive) return
    await linkGoalToMonth(item.goalId, monthRef.value)
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
        goals,
        keyResults,
        habits,
        trackers,
        goalStates,
        monthStates,
        weekStates,
        dayAssignments,
      ] = await Promise.all([
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

  async function saveTargetOverride(
    subjectType: EditableSubjectKind,
    payload: { subjectId: string; target: MeasurementTarget | undefined }
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

  async function handleTargetOperatorChange(
    item: PlannerMeasurementRow,
    value: string
  ): Promise<void> {
    const target = editableTarget(item)
    if (!target || item.subjectType === 'tracker') return

    await saveTargetOverride(editableSubjectType(item.subjectType), {
      subjectId: item.id,
      target: { ...target, operator: value as typeof target.operator } as MeasurementTarget,
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
    await saveTargetOverride(editableSubjectType(item.subjectType), {
      subjectId: item.id,
      target: undefined,
    })
  }

  /** Set, adjust or remove (condition = undefined) the entry-days condition on
   * the month-level override. The rest of the target is carried over. */
  async function handleEntryDaysChange(
    item: PlannerMeasurementRow,
    condition: MeasurementEntryDaysCondition | undefined
  ): Promise<void> {
    const target = editableTarget(item)
    if (!target || item.subjectType === 'tracker' || item.entryMode === 'completion') return

    const { entryDays: _dropped, ...rest } = target
    await saveTargetOverride(editableSubjectType(item.subjectType), {
      subjectId: item.id,
      target: (condition ? { ...rest, entryDays: condition } : rest) as MeasurementTarget,
    })
  }

  /** Toggle a week cell. Soft whole-month coverage materializes first (minus the
   * clicked week); weeks holding ritual-scheduled days clear those days with the
   * placement instead of silently flipping to whole-week. */
  async function handleMatrixCellToggle(
    row: PlannerMeasurementRow,
    weekRef: WeekRef
  ): Promise<void> {
    if (rowSoftKind(row)) {
      const weekRefs = monthWeekRefs.value.filter(week => week !== weekRef)
      await withSave(`${rowKey(row)}:${weekRef}`, async () => {
        await ensureGoalLinked(row)
        await materializeMeasurementWeekPlacements({
          monthRef: monthRef.value,
          cadence: row.cadence,
          subjectType: row.subjectType,
          subjectId: row.id,
          weekRefs,
        })
      })
      return
    }

    const scope = row.weekScopeByRef[weekRef]
    if (scope === 'specific-days' || scheduledDaysInWeek(row, weekRef).length > 0) {
      await withSave(`${rowKey(row)}:${weekRef}`, () =>
        materializeMeasurementDayAssignments({
          weekRef,
          cadence: row.cadence,
          subjectType: row.subjectType,
          subjectId: row.id,
          dayRefs: [],
        })
      )
      return
    }

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

  /** Whole-month quick action: applies whole-month coverage, or clears it when
   * already applied (active ⇔ placed: an empty row is an inactive row). */
  async function handleWholeMonthToggle(row: PlannerMeasurementRow): Promise<void> {
    if (isWholePeriodApplied(row)) {
      await handleRowClear(row)
      return
    }

    await withSave(`${rowKey(row)}:whole-month`, async () => {
      await ensureGoalLinked(row)
      await assignMeasurementToWholeMonthView({
        monthRef: monthRef.value,
        cadence: row.cadence,
        subjectType: row.subjectType,
        subjectId: row.id,
      })
    })
  }

  /** Remove the row from the month entirely — placements, states and overrides. */
  async function handleRowClear(row: PlannerMeasurementRow): Promise<void> {
    await withSave(`${rowKey(row)}:clear`, () =>
      deactivateMeasurementFromMonthView({
        monthRef: monthRef.value,
        cadence: row.cadence,
        subjectType: row.subjectType,
        subjectId: row.id,
      })
    )
  }

  async function handleWeekTargetChange(
    row: PlannerMeasurementRow,
    weekRef: WeekRef,
    value: number
  ): Promise<void> {
    if (row.subjectType === 'tracker') return
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

  async function handleWeekTargetClear(
    row: PlannerMeasurementRow,
    weekRef: WeekRef
  ): Promise<void> {
    if (row.subjectType === 'tracker') return

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

  /** Adjust the entry-days value on a single week's sub-target override. The
   * condition itself (operator, presence) is inherited from the effective target. */
  async function handleWeekEntryDaysValueChange(
    row: PlannerMeasurementRow,
    weekRef: WeekRef,
    days: number
  ): Promise<void> {
    if (row.subjectType === 'tracker') return
    const target = row.weekTargetOverrideByRef[weekRef] ?? editableTarget(row)
    const condition = target?.entryDays
    if (!target || !condition || !Number.isFinite(days)) return

    const value = Math.max(1, Math.round(days))
    await withSave(`${rowKey(row)}:${weekRef}:target`, () =>
      updateMeasurementWeekTargetOverride({
        weekRef,
        subjectType: row.subjectType,
        subjectId: row.id,
        cadence: row.cadence,
        monthRef: row.cadence === 'monthly' ? monthRef.value : undefined,
        targetOverride: { ...target, entryDays: { ...condition, value } } as MeasurementTarget,
      })
    )
  }

  async function handleDistributeEvenly(row: PlannerMeasurementRow): Promise<void> {
    if (!canDistribute(row)) return
    const target = editableTarget(row)
    if (!target) return

    const weeks = explicitlyPlacedWeeks(row)
    const values = distributeTargetEvenly(target.value, weeks.length, target.kind === 'count')
    // Entry days are summable across weeks too — split them alongside the value.
    // A week whose share falls to 0 gets no condition instead of an invalid "0 days".
    const daysShares = target.entryDays
      ? distributeTargetEvenly(target.entryDays.value, weeks.length, true)
      : undefined
    await withSave(`${rowKey(row)}:distribute`, async () => {
      for (const [index, weekRef] of weeks.entries()) {
        const daysShare = daysShares?.[index] ?? 0
        const entryDays =
          target.entryDays && daysShare >= 1
            ? { ...target.entryDays, value: daysShare }
            : undefined
        await updateMeasurementWeekTargetOverride({
          weekRef,
          subjectType: row.subjectType,
          subjectId: row.id,
          cadence: row.cadence,
          monthRef: monthRef.value,
          targetOverride: { ...target, value: values[index] ?? 0, entryDays } as MeasurementTarget,
        })
      }
    })
  }

  return {
    isLoading,
    loadError,
    savingKey,
    goalSections,
    keyResultRows,
    habitRows,
    trackerRows,
    allRows,
    weekColumns,
    monthWeekRefs,
    loadPlannerData,
    rowKey,
    editableTarget,
    hasExplicitPlacement,
    rowSoftKind,
    rowHasPlacement,
    isWholePeriodApplied,
    weekCellState,
    weekDayBadge,
    explicitlyPlacedWeeks,
    canSplitTarget,
    canDistribute,
    rowWeekTargetSummary,
    handleTargetOperatorChange,
    handleTargetAggregationChange,
    handleTargetValueChange,
    handleClearOverride,
    handleEntryDaysChange,
    handleMatrixCellToggle,
    handleWholeMonthToggle,
    handleRowClear,
    handleWeekTargetChange,
    handleWeekTargetClear,
    handleWeekEntryDaysValueChange,
    handleDistributeEvenly,
  }
}
