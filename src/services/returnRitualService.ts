/**
 * Return ritual — writes.
 *
 * `applyReturnPlan` lands the whole plan in ONE Dexie transaction over the
 * existing planning mutations (every repository call joins the open
 * transaction), remembers the break as handled in the same transaction and
 * returns a diff-based undo: only rows the apply touched are restored, so
 * what the user does in Today afterwards is left alone. The undo lives in
 * memory (the store) until the page reloads.
 *
 * Plan: ideas/html-plans/2026-10-25-return-ritual.html, docs/return-ritual.md.
 */

import type { DayRef } from '@/domain/period'
import {
  describeWeekPlacement,
  gentleTarget,
  RETURN_RITUAL_SETTINGS_KEY,
  serializeReturnRitualSettings,
  shiftedTargetDate,
  subjectKey,
  type ReturnBreak,
  type ReturnInventory,
  type ReturnPlan,
  type ReturnRitualState,
  type ReturnWeekDraft,
  type ReturnWeekPlacement,
} from '@/domain/returnRitual'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { journalDexieRepository } from '@/repositories/journalDexieRepository'
import { exercisePlanDexieRepository } from '@/repositories/exercisePlanDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import { weeklyIntentionDexieRepository } from '@/repositories/weeklyIntentionDexieRepository'
import { skipPlan } from '@/services/exercisePlanService'
import {
  assignMeasurementToWholeMonth,
  clearMeasurementWeekSkip,
  deactivateMeasurementInMonth,
  linkMeasurementPeriod,
  materializeMeasurementDayAssignments,
  moveGoalTargetDate,
  skipMeasurementWeek,
  updateMeasurementWeekTargetOverride,
} from '@/services/planningMutations'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import { abandonEnrollment, pauseEnrollment } from '@/services/programSchedulerService'
import { getUserDatabase } from '@/services/userDatabaseService'
import { captureUserSession } from '@/services/userSessionScope'
import { getWeekOverlappingMonths } from '@/utils/periods'

async function rememberReturnBreak(
  brk: ReturnBreak,
  state: ReturnRitualState,
  at: string
): Promise<void> {
  await userSettingsDexieRepository.set(
    RETURN_RITUAL_SETTINGS_KEY,
    serializeReturnRitualSettings({ breakStart: brk.breakStart, state, at })
  )
}

/** „Później”: hide the invitation for the rest of today. */
export async function dismissReturnBreak(
  brk: ReturnBreak,
  at: string = new Date().toISOString()
): Promise<void> {
  await rememberReturnBreak(brk, 'dismissed', at)
}

/** The ritual finished: never offer it again for this break. */
export async function markReturnBreakDone(
  brk: ReturnBreak,
  at: string = new Date().toISOString()
): Promise<void> {
  await rememberReturnBreak(brk, 'done', at)
}

// ---------------------------------------------------------------------------
// Diff-based undo
// ---------------------------------------------------------------------------

/** Tables the plan can touch; the undo diff is computed over exactly these. */
export const RETURN_TOUCHED_TABLES = [
  'measurementWeekStates',
  'measurementMonthStates',
  'measurementDayAssignments',
  'dailyMeasurementEntries',
  'weeklyIntentions',
  'exercisePlanItems',
  'programEnrollments',
  'goals',
  'goalMonthStates',
  'monthPlans',
  'weekPlans',
  'journalEntries',
  'priorityLinks',
  'userSettings',
] as const

type Row = Record<string, unknown>
type TableSnapshot = Map<string, Map<string, Row>>

function rowKey(row: Row, keyPath: string | string[] | undefined): string {
  if (Array.isArray(keyPath)) return JSON.stringify(keyPath.map(path => row[path]))
  return String(row[keyPath ?? 'id'])
}

async function captureTables(): Promise<TableSnapshot> {
  const db = getUserDatabase()
  const snapshot: TableSnapshot = new Map()
  for (const name of RETURN_TOUCHED_TABLES) {
    const table = db.table(name)
    const rows = (await table.toArray()) as Row[]
    const keyPath = table.schema.primKey.keyPath
    snapshot.set(name, new Map(rows.map(row => [rowKey(row, keyPath), row])))
  }
  return snapshot
}

export interface ReturnUndoStep {
  table: string
  key: string
  /** The row as it was before the apply; absent when the apply created it. */
  before?: Row
}

function diffSnapshots(before: TableSnapshot, after: TableSnapshot): ReturnUndoStep[] {
  const steps: ReturnUndoStep[] = []
  for (const name of RETURN_TOUCHED_TABLES) {
    const was = before.get(name) ?? new Map<string, Row>()
    const is = after.get(name) ?? new Map<string, Row>()
    for (const [key, row] of is) {
      const previous = was.get(key)
      if (!previous) steps.push({ table: name, key })
      else if (JSON.stringify(previous) !== JSON.stringify(row))
        steps.push({ table: name, key, before: previous })
    }
    for (const [key, row] of was) {
      if (!is.has(key)) steps.push({ table: name, key, before: row })
    }
  }
  return steps
}

/** Restore every touched row to what it was; rows created by the apply go away. */
export async function undoReturnSteps(steps: readonly ReturnUndoStep[]): Promise<void> {
  const session = captureUserSession()
  const db = getUserDatabase()
  await session.wait(
    db.transaction('rw', db.tables, async () => {
      session.assertCurrent()
      for (const step of steps) {
        const table = db.table(step.table)
        // Rows may have travelled through a reactive store: structured clone
        // refuses proxies, so put back a plain copy.
        if (step.before) await table.put(JSON.parse(JSON.stringify(step.before)))
        else {
          const keyPath = table.schema.primKey.keyPath
          await table.delete(Array.isArray(keyPath) ? JSON.parse(step.key) : step.key)
        }
      }
    })
  )
  invalidatePlanningQueryCache()
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

export const RETURN_JOURNAL_TITLE = 'Powrót po przerwie'

export interface ReturnApplyResult {
  undoSteps: ReturnUndoStep[]
  journalEntryId?: string
}

function sameEntry(
  a: { value: number | null; checkedItemIds?: string[] } | undefined,
  b: { value: number | null; checkedItemIds?: string[] } | undefined
): boolean {
  if (!a || !b) return !a && !b
  if (a.value !== b.value) return false
  const ia = [...(a.checkedItemIds ?? [])].sort().join(',')
  const ib = [...(b.checkedItemIds ?? [])].sort().join(',')
  return ia === ib
}

/**
 * What is stored right now for the subject in the week — read inside the
 * transaction, never from the (possibly stale) inventory, so a rerun of the
 * same plan finds nothing left to change.
 */
async function storedPlacement(
  week: ReturnWeekDraft,
  inventory: ReturnInventory
): Promise<ReturnWeekPlacement | undefined> {
  const subject = inventory.subjects.find(
    s => s.subjectType === week.subjectType && s.subject.id === week.subjectId
  )
  if (!subject) return undefined
  const [weekStates, monthStates, dayAssignments, entries, goal] = await Promise.all([
    planningStateDexieRepository.listMeasurementWeekStatesForSubject(
      week.subjectType,
      week.subjectId
    ),
    planningStateDexieRepository.listMeasurementMonthStatesForSubject(
      week.subjectType,
      week.subjectId
    ),
    planningStateDexieRepository.listMeasurementDayAssignments(),
    planningStateDexieRepository.listDailyMeasurementEntries(),
    week.subjectType === 'keyResult'
      ? goalDexieRepository.getById((subject.subject as { goalId: string }).goalId)
      : Promise.resolve(undefined),
  ])
  return describeWeekPlacement(subject, week.weekRef, {
    weekStates,
    monthStates,
    dayAssignments,
    entries,
    goal: goal ?? undefined,
  })
}

async function applyWeekDraft(week: ReturnWeekDraft, inventory: ReturnInventory): Promise<void> {
  const placement = await storedPlacement(week, inventory)
  const ref = {
    subjectType: week.subjectType,
    subjectId: week.subjectId,
    cadence: week.cadence,
    weekRef: week.weekRef,
    monthRef: week.monthRef,
  }
  if (!week.keep) {
    // Disappears from the plan: a tombstone where it was placed, nothing otherwise.
    if (placement?.placed) await skipMeasurementWeek(ref)
    return
  }
  // Stays in the plan as if it had been planned: lift a tombstone, make sure a
  // period holds the week, then write exactly the chosen days, target and entries.
  if (placement?.skipped) await clearMeasurementWeekSkip(ref)
  if (week.cadence === 'monthly') {
    const monthRef = week.monthRef ?? getWeekOverlappingMonths(week.weekRef)[0]!
    const monthState = await planningStateDexieRepository.getMeasurementMonthState(
      monthRef,
      week.subjectType,
      week.subjectId
    )
    if (monthState?.activityState !== 'active') {
      await assignMeasurementToWholeMonth({
        monthRef,
        subjectType: week.subjectType,
        subjectId: week.subjectId,
      })
    }
  } else if (!placement?.placed) {
    await linkMeasurementPeriod({
      subjectType: week.subjectType,
      subjectId: week.subjectId,
      cadence: 'weekly',
      periodRef: week.weekRef,
    })
  }
  const assignedNow = placement?.assignedDayRefs ?? []
  if ([...week.dayRefs].sort().join(',') !== [...assignedNow].sort().join(',')) {
    await materializeMeasurementDayAssignments({ ...ref, dayRefs: [...week.dayRefs].sort() })
  }
  if (!sameTarget(week.targetOverride, placement?.targetOverride)) {
    await updateMeasurementWeekTargetOverride({ ...ref, targetOverride: week.targetOverride })
  }
  const days = new Set([...Object.keys(week.entries), ...Object.keys(placement?.entries ?? {})])
  for (const dayRef of days) {
    const wanted = week.entries[dayRef]
    const stored = placement?.entries[dayRef]
    if (sameEntry(wanted, stored)) continue
    if (!wanted) {
      await planningStateDexieRepository.deleteDailyMeasurementEntry(
        week.subjectType,
        week.subjectId,
        dayRef as DayRef
      )
      continue
    }
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: week.subjectType,
      subjectId: week.subjectId,
      dayRef: dayRef as DayRef,
      value: wanted.value,
      ...(wanted.checkedItemIds ? { checkedItemIds: wanted.checkedItemIds } : {}),
    })
  }
}

function sameTarget(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

async function applyResume(plan: ReturnPlan, inventory: ReturnInventory): Promise<void> {
  for (const subject of inventory.subjects) {
    const key = subjectKey({ subjectType: subject.subjectType, subjectId: subject.subject.id })
    const back = plan.resume[key]
    if (back === undefined) continue
    const ref = { subjectType: subject.subjectType, subjectId: subject.subject.id }
    const monthState = await planningStateDexieRepository.getMeasurementMonthState(
      inventory.currentMonthRef,
      ref.subjectType,
      ref.subjectId
    )
    if (!back) {
      if (monthState)
        await deactivateMeasurementInMonth({ ...ref, monthRef: inventory.currentMonthRef })
      continue
    }
    if (monthState?.activityState !== 'active') {
      await assignMeasurementToWholeMonth({ ...ref, monthRef: inventory.currentMonthRef })
    }
    if (plan.gentleWeek && subject.subject.cadence === 'weekly' && 'target' in subject.subject) {
      const gentle = gentleTarget(subject.subject.target, subject.subject.entryMode)
      if (gentle) {
        await updateMeasurementWeekTargetOverride({
          ...ref,
          cadence: 'weekly',
          weekRef: inventory.currentWeekRef,
          targetOverride: gentle,
        })
      }
    }
  }
}

/**
 * Apply the whole plan atomically and remember the break as done. Rerunning
 * the same plan is harmless: every step compares with what is stored first.
 */
export async function applyReturnPlan(
  plan: ReturnPlan,
  inventory: ReturnInventory,
  now: string = new Date().toISOString()
): Promise<ReturnApplyResult> {
  const session = captureUserSession()
  const db = getUserDatabase()
  const result = await session.wait(
    db.transaction('rw', db.tables, async () => {
      session.assertCurrent()
      const before = await captureTables()
      let journalEntryId: string | undefined

      for (const week of plan.weeks) await applyWeekDraft(week, inventory)

      // Each step checks the stored row first, so a rerun finds nothing to do.
      for (const id of plan.retireIntentionIds) {
        if (!inventory.staleIntentions.some(candidate => candidate.id === id)) continue
        const stored = await weeklyIntentionDexieRepository.getById(id)
        if (stored?.status === 'open') {
          await weeklyIntentionDexieRepository.update(id, { status: 'retired' })
        }
      }
      for (const id of plan.skipPlanItemIds) {
        if (!inventory.overduePlanItems.some(candidate => candidate.id === id)) continue
        const stored = await exercisePlanDexieRepository.getById(id)
        if (stored?.status === 'pending') await skipPlan(id)
      }
      for (const enrollment of inventory.activeEnrollments) {
        const choice = plan.enrollments[enrollment.id]
        const stored = await programEnrollmentDexieRepository.getById(enrollment.id)
        if (choice === 'pause' && stored?.status === 'active') await pauseEnrollment(enrollment.id)
        else if (
          choice === 'abandon' &&
          (stored?.status === 'active' || stored?.status === 'paused')
        )
          await abandonEnrollment(enrollment.id)
      }
      for (const goal of inventory.overdueGoals) {
        if (plan.goals[goal.id] !== 'shift' || !goal.targetDate) continue
        const target = shiftedTargetDate(goal.targetDate, inventory.break)
        const stored = await goalDexieRepository.getById(goal.id)
        if (stored?.status === 'open' && stored.targetDate !== target) {
          await moveGoalTargetDate(goal.id, target)
        }
      }
      await applyResume(plan, inventory)

      const note = plan.note.trim()
      if (note) {
        // A rerun must not write the note twice.
        const existing = (await journalDexieRepository.getAll()).find(
          entry => entry.title === RETURN_JOURNAL_TITLE && entry.body === note
        )
        journalEntryId =
          existing?.id ??
          (
            await journalDexieRepository.create({
              title: RETURN_JOURNAL_TITLE,
              body: note,
              createdAt: now,
            })
          ).id
      }
      await markReturnBreakDone(inventory.break, now)

      const after = await captureTables()
      return { undoSteps: diffSnapshots(before, after), journalEntryId }
    })
  )
  invalidatePlanningQueryCache()
  return result
}
