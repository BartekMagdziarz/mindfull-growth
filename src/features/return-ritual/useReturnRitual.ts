import { computed, reactive, ref, watch, type Ref } from 'vue'
import type { DayRef, WeekRef } from '@/domain/period'
import type { MeasurementEntryMode, MeasurementTarget } from '@/domain/planning'
import {
  defaultReturnPlan,
  shiftedTargetDate,
  subjectKey,
  summarizeReturnPlan,
  weekDraftKey,
  type ReturnEnrollmentChoice,
  type ReturnEntryValue,
  type ReturnGoalChoice,
  type ReturnInventory,
  type ReturnPlan,
  type ReturnPlanSummary,
  type ReturnSubjectSummary,
  type ReturnWeekDraft,
  type ReturnWeekPlacement,
} from '@/domain/returnRitual'
import type { QuietRitualStep } from '@/features/quiet-ritual/QuietRitualShell.vue'
import { SUBJECT_ICON, plural } from '@/features/quiet-ritual/quietRitualModel'
import { useReturnStore } from '@/stores/return.store'
import { formatDayShort } from '@/utils/periodLabels'
import { getPeriodBounds } from '@/utils/periods'

export type ReturnStepId = 'gone' | 'tidy' | 'anew' | 'start'

export const RETURN_STEPS: (QuietRitualStep & { id: ReturnStepId })[] = [
  { id: 'gone', label: 'Co minęło', question: 'Co się działo przez ten czas?' },
  { id: 'tidy', label: 'Porządki', question: 'Co zostaje w planie, a co znika?' },
  { id: 'anew', label: 'Na nowo', question: 'Co wraca od tego tygodnia?' },
  { id: 'start', label: 'Start', question: 'Zaczynamy?' },
]

/** „3 tygodnie”, „miesiąc i tydzień” — never a bare number. */
export function breakLengthLabel(days: number, weeks: number): string {
  if (weeks >= 4) {
    const months = Math.floor(weeks / 4)
    const rest = weeks % 4
    const monthPart = `${months === 1 ? 'miesiąc' : `${months} ${plural(months, 'miesiąc', 'miesiące', 'miesięcy')}`}`
    return rest
      ? `${monthPart} i ${rest} ${plural(rest, 'tydzień', 'tygodnie', 'tygodni')}`
      : monthPart
  }
  if (weeks >= 2) return `${weeks} ${plural(weeks, 'tydzień', 'tygodnie', 'tygodni')}`
  return `${days} ${plural(days, 'dzień', 'dni', 'dni')}`
}

/** „5–11 paź” for a matrix column. */
export function weekRangeShort(weekRef: WeekRef): string {
  const { start, end } = getPeriodBounds(weekRef)
  const startLabel = formatDayShort(start, 'pl-PL')
  const endLabel = formatDayShort(end, 'pl-PL')
  const [startDay, startMonth] = startLabel.split(' ')
  const [, endMonth] = endLabel.split(' ')
  return startMonth === endMonth ? `${startDay}–${endLabel}` : `${startLabel} – ${endLabel}`
}

/** Icon of a subject row: its own glyph when it has one, else the type's. */
export function subjectIcon(subject: ReturnSubjectSummary): string {
  const own = 'icon' in subject.subject ? subject.subject.icon : undefined
  return own || SUBJECT_ICON[subject.subjectType]
}

export function useReturnRitual(options: { manual?: Ref<boolean> } = {}) {
  const store = useReturnStore()
  const manual = computed(() => options.manual?.value ?? false)
  const plan = reactive<ReturnPlan>({
    breakStart: '' as DayRef,
    note: '',
    weeks: [],
    retireIntentionIds: [],
    skipPlanItemIds: [],
    enrollments: {},
    goals: {},
    resume: {},
    gentleWeek: false,
  })
  const current = ref(0)
  const isSaving = ref(false)
  const saved = ref(false)
  const saveError = ref<string | null>(null)
  const summary = ref<ReturnPlanSummary | null>(null)

  const inventory = computed<ReturnInventory | null>(() => store.inventory)
  const loading = computed(() => store.loading)
  const loadError = computed(() => store.error)
  const brk = computed(() => inventory.value?.break ?? null)
  const steps = RETURN_STEPS
  const currentStepId = computed<ReturnStepId>(() => steps[current.value]?.id ?? 'gone')

  const subjectsByKey = computed(() => {
    const map = new Map<string, ReturnSubjectSummary>()
    for (const subject of inventory.value?.subjects ?? []) {
      map.set(
        subjectKey({ subjectType: subject.subjectType, subjectId: subject.subject.id }),
        subject
      )
    }
    return map
  })
  const placementsByKey = computed(() => {
    const map = new Map<string, ReturnWeekPlacement>()
    for (const placement of inventory.value?.weekPlacements ?? []) {
      map.set(weekDraftKey(placement), placement)
    }
    return map
  })
  const weekDraftsByKey = computed(() => {
    const map = new Map<string, ReturnWeekDraft>()
    for (const week of plan.weeks) map.set(weekDraftKey(week), week)
    return map
  })
  const keptWeeks = computed(() => {
    const columns = inventory.value?.columns ?? []
    return columns
      .map(weekRef => ({
        weekRef,
        drafts: plan.weeks.filter(week => week.keep && week.weekRef === weekRef),
      }))
      .filter(entry => entry.drafts.length > 0)
  })

  async function load(): Promise<void> {
    saved.value = false
    saveError.value = null
    summary.value = null
    current.value = 0
    const loaded = await store.loadInventory(manual.value)
    if (loaded) Object.assign(plan, defaultReturnPlan(loaded))
  }

  watch(
    () => store.inventory,
    loaded => {
      if (loaded && plan.breakStart !== loaded.break.breakStart) {
        Object.assign(plan, defaultReturnPlan(loaded))
      }
    }
  )

  function go(index: number): void {
    current.value = Math.max(0, Math.min(steps.length - 1, index))
  }

  // ── Phase A: keep matrix ────────────────────────────────────────────────
  function weekDraft(key: string): ReturnWeekDraft | undefined {
    return weekDraftsByKey.value.get(key)
  }
  function toggleKeep(key: string): void {
    const week = weekDraft(key)
    if (week) week.keep = !week.keep
  }
  function setRowKeep(subject: string, keep: boolean): void {
    for (const week of plan.weeks) {
      if (subjectKey(week) === subject) week.keep = keep
    }
  }

  // ── Phase B: week editor ────────────────────────────────────────────────
  function togglePlannedDay(key: string, dayRef: DayRef): void {
    const week = weekDraft(key)
    if (!week) return
    week.dayRefs = week.dayRefs.includes(dayRef)
      ? week.dayRefs.filter(day => day !== dayRef)
      : [...week.dayRefs, dayRef].sort()
  }
  function setEntry(key: string, dayRef: DayRef, value: ReturnEntryValue | undefined): void {
    const week = weekDraft(key)
    if (!week) return
    if (!value) {
      const next = { ...week.entries }
      delete next[dayRef]
      week.entries = next
    } else {
      week.entries = { ...week.entries, [dayRef]: value }
    }
  }
  function markPlannedDone(key: string): void {
    const week = weekDraft(key)
    if (!week) return
    const subject = subjectsByKey.value.get(subjectKey(week))
    if (subject?.subject.entryMode !== 'completion') return
    const next = { ...week.entries }
    for (const dayRef of week.dayRefs) next[dayRef] = { value: null }
    week.entries = next
  }
  function setTargetValue(key: string, value: number | null): void {
    const week = weekDraft(key)
    const subject = week ? subjectsByKey.value.get(subjectKey(week)) : undefined
    if (!week || !subject || !('target' in subject.subject)) return
    if (value === null || Number.isNaN(value)) {
      week.targetOverride = undefined
      return
    }
    const base: MeasurementTarget = week.targetOverride ?? subject.subject.target
    week.targetOverride = { ...base, value }
  }
  function baseTargetValue(key: string): number | null {
    const week = weekDraft(key)
    const subject = week ? subjectsByKey.value.get(subjectKey(week)) : undefined
    if (!week || !subject || !('target' in subject.subject)) return null
    return (week.targetOverride ?? subject.subject.target).value
  }
  function entryModeOf(key: string): MeasurementEntryMode | undefined {
    const week = weekDraft(key)
    return week ? subjectsByKey.value.get(subjectKey(week))?.subject.entryMode : undefined
  }

  // ── Other rows ──────────────────────────────────────────────────────────
  const retireAll = computed({
    get: () =>
      (inventory.value?.staleIntentions.length ?? 0) > 0 &&
      plan.retireIntentionIds.length === inventory.value?.staleIntentions.length,
    set: value => {
      plan.retireIntentionIds = value
        ? (inventory.value?.staleIntentions ?? []).map(intention => intention.id)
        : []
    },
  })
  const skipAll = computed({
    get: () =>
      (inventory.value?.overduePlanItems.length ?? 0) > 0 &&
      plan.skipPlanItemIds.length === inventory.value?.overduePlanItems.length,
    set: value => {
      plan.skipPlanItemIds = value
        ? (inventory.value?.overduePlanItems ?? []).map(item => item.id)
        : []
    },
  })
  function setEnrollment(id: string, choice: ReturnEnrollmentChoice): void {
    plan.enrollments = { ...plan.enrollments, [id]: choice }
  }
  function setGoal(id: string, choice: ReturnGoalChoice): void {
    plan.goals = { ...plan.goals, [id]: choice }
  }
  function shiftedDateLabel(targetDate: string | undefined): string {
    if (!targetDate || !brk.value) return ''
    return formatDayShort(shiftedTargetDate(targetDate, brk.value), 'pl-PL')
  }

  // ── Step 3 ──────────────────────────────────────────────────────────────
  function toggleResume(key: string): void {
    plan.resume = { ...plan.resume, [key]: !plan.resume[key] }
  }

  const previewSummary = computed(() =>
    inventory.value ? summarizeReturnPlan(plan, inventory.value) : null
  )

  async function finish(): Promise<ReturnPlanSummary | null> {
    if (isSaving.value || saved.value || !inventory.value) return null
    isSaving.value = true
    saveError.value = null
    try {
      summary.value = await store.apply(JSON.parse(JSON.stringify(plan)) as ReturnPlan)
      saved.value = true
      return summary.value
    } catch (error) {
      saveError.value = error instanceof Error ? error.message : String(error)
      return null
    } finally {
      isSaving.value = false
    }
  }

  async function undo(): Promise<void> {
    await store.undo()
    saved.value = false
    summary.value = null
    await load()
  }

  return {
    store,
    manual,
    plan,
    inventory,
    loading,
    loadError,
    brk,
    steps,
    current,
    currentStepId,
    subjectsByKey,
    placementsByKey,
    keptWeeks,
    isSaving,
    saved,
    saveError,
    summary,
    previewSummary,
    retireAll,
    skipAll,
    load,
    go,
    weekDraft,
    toggleKeep,
    setRowKeep,
    togglePlannedDay,
    setEntry,
    markPlannedDone,
    setTargetValue,
    baseTargetValue,
    entryModeOf,
    setEnrollment,
    setGoal,
    shiftedDateLabel,
    toggleResume,
    finish,
    undo,
  }
}
