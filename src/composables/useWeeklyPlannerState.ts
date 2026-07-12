import { computed, nextTick, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { Habit, KeyResult, MeasurementTarget, Tracker } from '@/domain/planning'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
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
import { isGoalOpen, isInitiativeActive, isMeasurementSubjectOpen } from '@/services/planningVisibility'
import {
  materializeMeasurementDayAssignments,
  materializeMeasurementWeekPlacements,
  toggleMeasurementDayAssignment,
  toggleMeasurementWeekAssignment,
  updateMeasurementWeekTargetOverride,
} from '@/services/planningMutations'
import {
  getChildPeriods,
  getParentPeriod,
  getPeriodBounds,
  getPeriodRefsForDate,
  getWeekOverlappingMonths,
} from '@/utils/periods'
import type {
  GoalSection,
  PlannerInitiativeRow,
  PlannerMeasurementRow,
  PlannerWeekDay,
  SubjectKind,
} from '@/components/calendar/plannerTypes'
import type { AssignmentMatrixCellState } from '@/components/calendar/assignmentMatrixTypes'

/** Soft (inherited) coverage of a row in this week, shown as soft-filled cells. */
export type WeekRowSoftKind = 'whole-week' | 'whole-month' | null

export function useWeeklyPlannerState(
  weekRef: Ref<WeekRef>,
  locale: Ref<string>,
  emit: (event: 'updated') => void
) {
  const isLoading = ref(true)
  const loadError = ref<string | null>(null)
  const savingKey = ref('')
  const mutationError = ref<string | null>(null)
  const goalSections = ref<GoalSection[]>([])
  const habitRows = ref<PlannerMeasurementRow[]>([])
  const trackerRows = ref<PlannerMeasurementRow[]>([])
  const initiativeRows = ref<PlannerInitiativeRow[]>([])
  const hasLoadedOnce = ref(false)

  const overlappingMonthRefs = computed(() => getWeekOverlappingMonths(weekRef.value))
  const parentMonthRef = computed(() => getParentPeriod(weekRef.value) as MonthRef)
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

  const keyResultRows = computed<PlannerMeasurementRow[]>(() =>
    goalSections.value.flatMap(goal => goal.keyResults)
  )

  const allRows = computed(() => [
    ...keyResultRows.value,
    ...habitRows.value,
    ...trackerRows.value,
  ])

  const calendarDays = computed<PlannerWeekDay[]>(() =>
    weekDayRefs.value.map(dayRef => {
      const dayMonth = getPeriodRefsForDate(dayRef).month
      return {
        dayRef,
        label: dayRef.slice(-2),
        inMonth: dayMonth === parentMonthRef.value,
        monthLabel: monthBadgeFormatter.value
          .format(new Date(`${dayRef}T00:00:00`))
          .replace('.', '')
          .toUpperCase(),
        items: [],
      }
    })
  )

  // Progressive disclosure: rows engaged this week (placed here, or in the month
  // portfolio of an overlapping month) form the main sections; open weekly-cadence
  // objects with no involvement land in a collapsed "rest" bucket.
  const engagedKeyResultRows = computed(() => keyResultRows.value.filter(isEngaged))
  const engagedHabitRows = computed(() => habitRows.value.filter(isEngaged))
  const engagedTrackerRows = computed(() => trackerRows.value.filter(isEngaged))

  const typeOrder: Record<SubjectKind, number> = {
    keyResult: 0,
    habit: 1,
    tracker: 2,
  }

  const dormantRows = computed(() =>
    allRows.value
      .filter(row => !isEngaged(row))
      .sort(
        (left, right) =>
          typeOrder[left.subjectType] - typeOrder[right.subjectType] ||
          left.title.localeCompare(right.title)
      )
  )

  watch(
    () => weekRef.value,
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

    // Filter week states to just this week
    const relevantWeekStates = weekStates.filter(state => {
      if (state.subjectType !== subjectType || state.subjectId !== item.id) return false
      return state.weekRef === weekRef.value
    })

    const weekScopeByRef: PlannerMeasurementRow['weekScopeByRef'] = {}
    const weekTargetOverrideByRef: PlannerMeasurementRow['weekTargetOverrideByRef'] = {}
    for (const state of relevantWeekStates) {
      weekScopeByRef[state.weekRef] = state.scheduleScope
      if (state.targetOverride) {
        weekTargetOverrideByRef[state.weekRef] = state.targetOverride
      }
    }

    // The state whose targetOverride governs this week: monthly-cadence rows are
    // attributed to the week's parent month (consistent with buildMonthlyContextFooter),
    // weekly-cadence rows use the month-agnostic state.
    const governingWeekState =
      item.cadence === 'monthly'
        ? relevantWeekStates.find(
            state => state.sourceMonthRef === parentMonthRef.value
          ) ?? relevantWeekStates[0]
        : relevantWeekStates.find(state => !state.sourceMonthRef)

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
      entryMode: item.entryMode,
      target: 'target' in item ? item.target : undefined,
      // Week-effective: week override → month override → (base target via editableTarget).
      targetOverride: governingWeekState?.targetOverride ?? monthState?.targetOverride,
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

  function isVisible(row: PlannerMeasurementRow): boolean {
    // Weekly cadence: always show all open items (dormant ones go to the rest bucket)
    if (row.cadence === 'weekly') return true
    // Monthly cadence: only if in the month portfolio (placed) or grandfathered whole-month
    if (row.isActive) return true
    if (row.monthScheduleScope === 'whole-month') return true
    return false
  }

  function isEngaged(row: PlannerMeasurementRow): boolean {
    if (row.cadence === 'monthly') return true
    return row.isActive
  }

  /** Explicit placement in THIS week (week scope or scheduled days). */
  function hasExplicitPlacement(row: PlannerMeasurementRow): boolean {
    return (
      Object.values(row.weekScopeByRef).some(
        scope => scope === 'whole-week' || scope === 'specific-days'
      ) || row.scheduledDayRefs.length > 0
    )
  }

  function rowSoftKind(row: PlannerMeasurementRow): WeekRowSoftKind {
    if (row.weekScopeByRef[weekRef.value] === 'whole-week') return 'whole-week'
    if (
      row.cadence === 'monthly' &&
      !hasExplicitPlacement(row) &&
      row.monthScheduleScope === 'whole-month'
    ) {
      return 'whole-month'
    }
    return null
  }

  /** Days softly covered by a whole-month scope: this week's days inside that month. */
  function wholeMonthCoveredDays(row: PlannerMeasurementRow): DayRef[] {
    if (!row.monthStateRef) return []
    return weekDayRefs.value.filter(
      dayRef => getPeriodRefsForDate(dayRef).month === row.monthStateRef
    )
  }

  function dayCellState(row: PlannerMeasurementRow, dayRef: DayRef): AssignmentMatrixCellState {
    if (row.scheduledDayRefs.includes(dayRef)) return 'checked'
    const softKind = rowSoftKind(row)
    if (softKind === 'whole-week') return 'soft'
    if (softKind === 'whole-month' && wholeMonthCoveredDays(row).includes(dayRef)) {
      return 'soft'
    }
    return 'empty'
  }

  /** Row can be cleared / has anything placed or inherited in this week. */
  function rowHasWeekPlacement(row: PlannerMeasurementRow): boolean {
    return hasExplicitPlacement(row) || rowSoftKind(row) !== null
  }

  function editableTarget(item: PlannerMeasurementRow): MeasurementTarget | undefined {
    return item.targetOverride ?? item.target
  }

  function hasWeekOverride(row: PlannerMeasurementRow): boolean {
    return Boolean(row.weekTargetOverrideByRef[weekRef.value])
  }

  /** Week target pill is editable only on rows placed in this week (active ⇔ placed:
   * writing an override on an unplaced row would resurrect an unassigned state). */
  function weekTargetEditable(row: PlannerMeasurementRow): boolean {
    return (
      row.subjectType !== 'tracker' &&
      Boolean(editableTarget(row)) &&
      rowHasWeekPlacement(row)
    )
  }

  async function withSave<T>(key: string, action: () => Promise<T>): Promise<void> {
    if (savingKey.value !== '') return
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    savingKey.value = key
    mutationError.value = null
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
    } catch (error) {
      mutationError.value = error instanceof Error ? error.message : String(error)
      await loadPlannerData({ showLoading: false })
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

      // Build month state map keyed by subjectType:subjectId. On boundary weeks
      // both months may carry a state — prefer the week's parent month (same
      // attribution rule as week target overrides, §13).
      const monthStateMap = new Map<string, MeasurementMonthState>()
      for (const state of monthStates) {
        if (state.activityState !== 'active') continue
        const key = `${state.subjectType}:${state.subjectId}`
        if (state.monthRef === parentMonthRef.value || !monthStateMap.has(key)) {
          monthStateMap.set(key, state)
        }
      }

      const openGoals = goals.filter(isGoalOpen)
      const openKeyResults = keyResults.filter(isMeasurementSubjectOpen)
      const openHabits = habits.filter(isMeasurementSubjectOpen)
      const openTrackers = trackers.filter(isMeasurementSubjectOpen)
      const openInitiatives = initiatives.filter(isInitiativeActive)

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

      hasLoadedOnce.value = true
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : String(error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Target edits made in the weekly flow are scoped to THIS week (week-state
   * targetOverride) — not the month. The old behavior wrote the month override
   * via overlappingMonthRefs[0], silently changing every week of (possibly the
   * wrong) month on a boundary week.
   */
  async function saveTargetOverride(
    item: PlannerMeasurementRow,
    target: MeasurementTarget | undefined
  ): Promise<void> {
    await withSave(`${item.subjectType}:${item.id}:target`, () =>
      updateMeasurementWeekTargetOverride({
        weekRef: weekRef.value,
        subjectType: item.subjectType,
        subjectId: item.id,
        cadence: item.cadence,
        monthRef: item.cadence === 'monthly' ? parentMonthRef.value : undefined,
        targetOverride: target,
      })
    )
  }

  async function handleTargetValueChange(
    item: PlannerMeasurementRow,
    value: number
  ): Promise<void> {
    const target = editableTarget(item)
    if (!target || item.subjectType === 'tracker') return

    await saveTargetOverride(item, { ...target, value })
  }

  async function handleClearOverride(item: PlannerMeasurementRow): Promise<void> {
    if (item.subjectType === 'tracker') return
    await saveTargetOverride(item, undefined)
  }

  /** Adjust the entry-days value on this week's override; the condition itself
   * (operator, presence) is inherited from the effective target. */
  async function handleEntryDaysValueChange(
    item: PlannerMeasurementRow,
    days: number
  ): Promise<void> {
    const target = editableTarget(item)
    const condition = target?.entryDays
    if (!target || !condition || item.subjectType === 'tracker' || !Number.isFinite(days)) return

    const value = Math.min(7, Math.max(1, Math.round(days)))
    await saveTargetOverride(item, { ...target, entryDays: { ...condition, value } })
  }

  /** Toggle a single day cell, materializing soft coverage first so the rest of
   * the whole-week / whole-month coverage never silently collapses. */
  async function handleMatrixCellToggle(
    row: PlannerMeasurementRow,
    dayRef: DayRef
  ): Promise<void> {
    const softKind = rowSoftKind(row)

    if (softKind === 'whole-week') {
      const dayRefs = weekDayRefs.value.filter(day => day !== dayRef)
      await withSave(`${rowKey(row)}:${dayRef}`, () =>
        materializeMeasurementDayAssignments({
          weekRef: weekRef.value,
          cadence: row.cadence,
          subjectType: row.subjectType,
          subjectId: row.id,
          dayRefs,
        })
      )
      return
    }

    if (softKind === 'whole-month' && row.monthStateRef) {
      const monthRef = row.monthStateRef
      const covered = wholeMonthCoveredDays(row)
      const dayRefs = covered.includes(dayRef)
        ? covered.filter(day => day !== dayRef)
        : [...covered, dayRef]
      const otherWeeks = (getChildPeriods(monthRef) as WeekRef[]).filter(
        week => week !== weekRef.value
      )

      await withSave(`${rowKey(row)}:${dayRef}`, async () => {
        await materializeMeasurementWeekPlacements({
          monthRef,
          cadence: row.cadence,
          subjectType: row.subjectType,
          subjectId: row.id,
          weekRefs: otherWeeks,
        })
        await materializeMeasurementDayAssignments({
          weekRef: weekRef.value,
          cadence: row.cadence,
          subjectType: row.subjectType,
          subjectId: row.id,
          dayRefs,
        })
      })
      return
    }

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

  /** Whole-week quick action. On whole-month rows it materializes the month into
   * explicit whole-week placements (coverage unchanged, state normalized);
   * otherwise it toggles this week's whole-week placement. */
  async function handleWholeWeekToggle(row: PlannerMeasurementRow): Promise<void> {
    if (rowSoftKind(row) === 'whole-month' && row.monthStateRef) {
      const monthRef = row.monthStateRef
      await withSave(`${rowKey(row)}:whole-week`, () =>
        materializeMeasurementWeekPlacements({
          monthRef,
          cadence: row.cadence,
          subjectType: row.subjectType,
          subjectId: row.id,
          weekRefs: getChildPeriods(monthRef) as WeekRef[],
        })
      )
      return
    }

    await withSave(`${rowKey(row)}:whole-week`, () =>
      toggleMeasurementWeekAssignment({
        weekRef: weekRef.value,
        cadence: row.cadence,
        monthRef: row.cadence === 'monthly' ? parentMonthRef.value : undefined,
        subjectType: row.subjectType,
        subjectId: row.id,
      })
    )
  }

  /** Clear the row's placement in this week. Whole-month rows keep their other
   * weeks (materialized minus this one); explicit placements are removed and —
   * per active ⇔ placed — the object may drop out of the week entirely. */
  async function handleRowClear(row: PlannerMeasurementRow): Promise<void> {
    if (rowSoftKind(row) === 'whole-month' && row.monthStateRef) {
      const monthRef = row.monthStateRef
      const otherWeeks = (getChildPeriods(monthRef) as WeekRef[]).filter(
        week => week !== weekRef.value
      )
      await withSave(`${rowKey(row)}:clear`, () =>
        materializeMeasurementWeekPlacements({
          monthRef,
          cadence: row.cadence,
          subjectType: row.subjectType,
          subjectId: row.id,
          weekRefs: otherWeeks,
        })
      )
      return
    }

    await withSave(`${rowKey(row)}:clear`, () =>
      materializeMeasurementDayAssignments({
        weekRef: weekRef.value,
        cadence: row.cadence,
        subjectType: row.subjectType,
        subjectId: row.id,
        dayRefs: [],
      })
    )
  }

  return {
    isLoading,
    loadError,
    savingKey,
    mutationError,
    goalSections,
    keyResultRows,
    habitRows,
    trackerRows,
    initiativeRows,
    allRows,
    calendarDays,
    weekdayHeaders,
    parentMonthRef,
    engagedKeyResultRows,
    engagedHabitRows,
    engagedTrackerRows,
    dormantRows,
    loadPlannerData,
    rowKey,
    editableTarget,
    hasWeekOverride,
    weekTargetEditable,
    rowSoftKind,
    rowHasWeekPlacement,
    dayCellState,
    handleTargetValueChange,
    handleClearOverride,
    handleEntryDaysValueChange,
    handleMatrixCellToggle,
    handleWholeWeekToggle,
    handleRowClear,
  }
}
