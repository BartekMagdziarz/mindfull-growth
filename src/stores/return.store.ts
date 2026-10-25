import { defineStore } from 'pinia'
import { computed, markRaw, ref, shallowRef } from 'vue'
import type {
  ReturnBreak,
  ReturnInventory,
  ReturnPlan,
  ReturnPlanSummary,
} from '@/domain/returnRitual'
import { summarizeReturnPlan } from '@/domain/returnRitual'
import { runProgramScheduler } from '@/services/programSchedulerService'
import { buildReturnInventory, getPendingReturnBreak } from '@/services/returnQueries'
import {
  applyReturnPlan,
  dismissReturnBreak,
  undoReturnSteps,
  type ReturnUndoStep,
} from '@/services/returnRitualService'
import { ensureRhythmPlacements } from '@/services/rhythmSchedulerService'
import { createStoreSessionScope } from '@/services/userSessionScope'
import { reportError } from '@/utils/reportError'

/**
 * Return ritual — the pending break (detected once per session on the first
 * Today load), the inventory the ritual edits, and the single-level undo of
 * the last „Start” (in memory until the page reloads).
 */
export const useReturnStore = defineStore('return', () => {
  const sessionScope = createStoreSessionScope()
  const pending = ref<ReturnBreak | null>(null)
  const checked = ref(false)
  const inventory = ref<ReturnInventory | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  // Raw rows for the undo: never proxied, never deep-watched.
  const undoSteps = shallowRef<ReturnUndoStep[] | null>(null)
  const lastSummary = ref<ReturnPlanSummary | null>(null)

  const canUndo = computed(() => (undoSteps.value?.length ?? 0) > 0)

  function reset(): void {
    sessionScope.reset()
    pending.value = null
    checked.value = false
    inventory.value = null
    loading.value = false
    error.value = null
    undoSteps.value = null
    lastSummary.value = null
  }

  async function detect(force = false): Promise<ReturnBreak | null> {
    if (checked.value && !force) return pending.value
    const session = sessionScope.capture()
    try {
      const brk = await session.wait(getPendingReturnBreak())
      pending.value = brk ?? null
      checked.value = true
    } catch (err) {
      if (!session.isCurrent()) return null
      reportError('returnStore.detect', err)
      pending.value = null
      checked.value = true
    }
    return pending.value
  }

  /** „Później” — the invitation comes back tomorrow. */
  async function dismiss(): Promise<void> {
    const brk = pending.value
    if (!brk) return
    const session = sessionScope.capture()
    await session.wait(dismissReturnBreak(brk))
    if (session.isCurrent()) pending.value = null
  }

  async function loadInventory(): Promise<ReturnInventory | null> {
    const session = sessionScope.capture()
    loading.value = true
    error.value = null
    try {
      const brk = await detect(true)
      if (!brk) {
        inventory.value = null
        return null
      }
      inventory.value = await session.wait(buildReturnInventory(brk))
      return inventory.value
    } catch (err) {
      if (!session.isCurrent()) return null
      error.value = err instanceof Error ? err.message : String(err)
      inventory.value = null
      return null
    } finally {
      if (session.isCurrent()) loading.value = false
    }
  }

  /** „Start”: one transaction, then let the schedulers fill today. */
  async function apply(plan: ReturnPlan): Promise<ReturnPlanSummary> {
    const current = inventory.value
    if (!current) throw new Error('Rytuał powrotu nie ma wczytanego inwentarza')
    const session = sessionScope.capture()
    const result = await session.wait(applyReturnPlan(plan, current))
    const summary = summarizeReturnPlan(plan, current)
    undoSteps.value = markRaw(result.undoSteps)
    lastSummary.value = summary
    pending.value = null
    try {
      await session.wait(runProgramScheduler())
      await session.wait(ensureRhythmPlacements())
    } catch (err) {
      if (session.isCurrent()) reportError('returnStore.apply.schedulers', err)
    }
    return summary
  }

  /** „Cofnij porządki”: restore the touched rows; the break is pending again. */
  async function undo(): Promise<void> {
    const steps = undoSteps.value
    if (!steps?.length) return
    const session = sessionScope.capture()
    await session.wait(undoReturnSteps(steps))
    if (!session.isCurrent()) return
    undoSteps.value = null
    lastSummary.value = null
    inventory.value = null
    await detect(true)
  }

  return {
    pending,
    checked,
    inventory,
    loading,
    error,
    canUndo,
    lastSummary,
    reset,
    detect,
    dismiss,
    loadInventory,
    apply,
    undo,
  }
})
