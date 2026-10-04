import { computed, reactive, ref, watch, type Ref } from 'vue'
import type { DayRef, MonthRef } from '@/domain/period'
import type { GoalFollowUpKind, GoalOutcome, GoalSuccessMet } from '@/domain/planning'
import { goalHasStartMirror, suggestGoalOutcome } from '@/domain/goalClosing'
import {
  buildGoalClosingSnapshot,
  closeGoal,
  type GoalClosingDraft,
  type GoalClosingResult,
  type GoalClosingSnapshot,
} from '@/services/goalClosingService'
import { moveGoalTargetDate } from '@/services/planningMutations'
import { addDaysToDayRef, getPeriodRefsForDate } from '@/utils/periods'
import type { QuietRitualStep } from '@/features/quiet-ritual/QuietRitualShell.vue'

export type GoalClosingStepId = 'verdict' | 'mirror' | 'lessons' | 'next'

export interface GoalClosingDraftState {
  successMet: GoalSuccessMet | null
  successNote: string
  confidenceInHindsight: number | null
  confidenceNote: string
  obstaclesHit: string
  workedWell: string
  wasDifficult: string
  learned: string
  followUpKind: GoalFollowUpKind | null
  followUpNote: string
  habitKeyResultIds: string[]
}

export const GOAL_OUTCOME_ORDER: GoalOutcome[] = ['partial', 'achieved', 'missed', 'abandoned']

function emptyDraft(): GoalClosingDraftState {
  return {
    successMet: null,
    successNote: '',
    confidenceInHindsight: null,
    confidenceNote: '',
    obstaclesHit: '',
    workedWell: '',
    wasDifficult: '',
    learned: '',
    followUpKind: null,
    followUpNote: '',
    habitKeyResultIds: [],
  }
}

function text(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

export function daysAfterDeadline(targetDate: string | undefined, today: DayRef): number | null {
  if (!targetDate) return null
  const ms = Date.UTC(
    Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)),
  ) - Date.UTC(
    Number(targetDate.slice(0, 4)), Number(targetDate.slice(5, 7)) - 1, Number(targetDate.slice(8, 10)),
  )
  return Math.round(ms / 86_400_000)
}

/**
 * State of the goal closing ritual: a draft collected over four steps and written
 * once on „Zamknij cel” (one transaction with the key-result statuses). A goal
 * closed earlier opens in edit mode with its reflection pre-filled.
 */
export function useGoalClosingRitual(
  goalId: Ref<string>,
  options: { presetOutcome?: Ref<GoalOutcome | null>; masculine?: Ref<boolean>; openDeadline?: Ref<boolean> } = {},
) {
  const snapshot = ref<GoalClosingSnapshot | null>(null)
  const loading = ref(false)
  const loadError = ref<string | null>(null)
  const draft = reactive<GoalClosingDraftState>(emptyDraft())
  const outcome = ref<GoalOutcome | null>(null)
  const current = ref(0)
  const isSaving = ref(false)
  const saved = ref(false)
  const saveError = ref<string | null>(null)
  const deadlineOpen = ref(false)
  const deadlineDate = ref<string>('')
  const todayRef = getPeriodRefsForDate(new Date()).day

  const goal = computed(() => snapshot.value?.goal ?? null)
  const editing = computed(() => Boolean(goal.value?.closingReflection))
  const suggestion = computed<GoalOutcome | null>(() =>
    snapshot.value ? suggestGoalOutcome(snapshot.value.keyResultSnapshots) : null,
  )
  const mirrorAvailable = computed(() => (goal.value ? goalHasStartMirror(goal.value) : false))
  const masculine = computed(() => options.masculine?.value ?? true)

  const steps = computed<(QuietRitualStep & { id: GoalClosingStepId })[]>(() => {
    const list: (QuietRitualStep & { id: GoalClosingStepId })[] = [
      { id: 'verdict', label: 'Werdykt', question: 'Jak skończył się ten cel?' },
    ]
    if (mirrorAvailable.value) {
      list.push({
        id: 'mirror',
        label: 'Lustro',
        question: masculine.value ? 'Co powiedziałeś sobie na starcie?' : 'Co powiedziałaś sobie na starcie?',
      })
    }
    list.push(
      { id: 'lessons', label: 'Wnioski', question: 'Co z tego zostaje?' },
      { id: 'next', label: 'Dalej', question: 'Co dalej z tym tematem?' },
    )
    return list
  })
  const currentStepId = computed<GoalClosingStepId>(() => steps.value[current.value]?.id ?? 'verdict')

  const months = computed<MonthRef[]>(() => snapshot.value?.months ?? [])
  const overdueDays = computed(() => daysAfterDeadline(goal.value?.targetDate, todayRef))

  function prefillFromReflection(): void {
    const reflection = goal.value?.closingReflection
    if (!reflection) return
    outcome.value = reflection.outcome
    draft.successMet = reflection.successMet ?? null
    draft.successNote = reflection.successNote ?? ''
    draft.confidenceInHindsight = reflection.confidenceInHindsight ?? null
    draft.confidenceNote = reflection.confidenceNote ?? ''
    draft.obstaclesHit = reflection.obstaclesHit ?? ''
    draft.workedWell = reflection.workedWell ?? ''
    draft.wasDifficult = reflection.wasDifficult ?? ''
    draft.learned = reflection.learned ?? ''
    draft.followUpKind = reflection.followUp?.kind ?? null
    draft.followUpNote = reflection.followUp?.note ?? ''
  }

  async function load(): Promise<void> {
    loading.value = true
    loadError.value = null
    try {
      snapshot.value = await buildGoalClosingSnapshot(goalId.value)
      Object.assign(draft, emptyDraft())
      current.value = 0
      saved.value = false
      if (editing.value) {
        prefillFromReflection()
        if (options.presetOutcome?.value) outcome.value = options.presetOutcome.value
      } else {
        outcome.value = options.presetOutcome?.value ?? suggestion.value
      }
      deadlineOpen.value = Boolean(options.openDeadline?.value) && !editing.value
      const target = snapshot.value.goal.targetDate
      deadlineDate.value = addDaysToDayRef(target && target > todayRef ? (target as DayRef) : todayRef, 28)
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : String(error)
      snapshot.value = null
    } finally {
      loading.value = false
    }
  }

  function go(index: number): void {
    current.value = Math.max(0, Math.min(steps.value.length - 1, index))
  }

  function toggleHabitKeyResult(keyResultId: string): void {
    draft.habitKeyResultIds = draft.habitKeyResultIds.includes(keyResultId)
      ? draft.habitKeyResultIds.filter((id) => id !== keyResultId)
      : [...draft.habitKeyResultIds, keyResultId]
  }

  function buildDraft(full: boolean): GoalClosingDraft | null {
    if (!outcome.value) return null
    if (!full) return { outcome: outcome.value }
    return {
      outcome: outcome.value,
      successMet: draft.successMet ?? undefined,
      successNote: text(draft.successNote),
      confidenceInHindsight: draft.confidenceInHindsight ?? undefined,
      confidenceNote: text(draft.confidenceNote),
      obstaclesHit: text(draft.obstaclesHit),
      workedWell: text(draft.workedWell),
      wasDifficult: text(draft.wasDifficult),
      learned: text(draft.learned),
      followUp: draft.followUpKind ? { kind: draft.followUpKind, note: text(draft.followUpNote) } : undefined,
      habitFromKeyResultIds: draft.followUpKind === 'habit' ? [...draft.habitKeyResultIds] : [],
    }
  }

  async function save(full: boolean): Promise<GoalClosingResult | null> {
    const payload = buildDraft(full)
    if (!payload || !snapshot.value || isSaving.value) return null
    isSaving.value = true
    saveError.value = null
    try {
      const result = await closeGoal(goalId.value, payload, snapshot.value)
      saved.value = true
      return result
    } catch (error) {
      saveError.value = error instanceof Error ? error.message : String(error)
      return null
    } finally {
      isSaving.value = false
    }
  }

  /** „Zamknij cel” — the whole draft. */
  const finish = () => save(true)
  /** „Zamknij bez wniosków” — outcome, date and snapshot only. */
  const finishQuick = () => save(false)

  /** Side exit: the goal is not over yet — move its deadline and leave without a reflection. */
  async function moveDeadline(): Promise<DayRef | null> {
    const next = deadlineDate.value
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next) || isSaving.value) return null
    isSaving.value = true
    saveError.value = null
    try {
      await moveGoalTargetDate(goalId.value, next as DayRef)
      return next as DayRef
    } catch (error) {
      saveError.value = error instanceof Error ? error.message : String(error)
      return null
    } finally {
      isSaving.value = false
    }
  }

  watch(goalId, () => void load(), { immediate: true })

  return {
    snapshot,
    goal,
    loading,
    loadError,
    editing,
    draft,
    outcome,
    suggestion,
    steps,
    current,
    currentStepId,
    mirrorAvailable,
    months,
    overdueDays,
    todayRef,
    isSaving,
    saved,
    saveError,
    deadlineOpen,
    deadlineDate,
    load,
    go,
    toggleHabitKeyResult,
    finish,
    finishQuick,
    moveDeadline,
  }
}
