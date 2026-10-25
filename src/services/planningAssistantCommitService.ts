import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import {
  plannerDays,
  plannerGoalPayload,
  plannerMeasurementPayload,
  plannerSelectionErrors,
  plannerTarget,
  type PlannerObject,
  type PlannerReceipt,
} from '@/domain/planningAssistant'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { priorityLinkDexieRepository } from '@/repositories/priorityLinkDexieRepository'
import {
  PLANNING_ASSISTANT_DRAFT_KEY,
  PlanningDraftConflict,
} from '@/repositories/planningAssistantDraftRepository'
import { parsePlanningDraft } from './ai/planning/contracts'
import { createWeeklyIntention } from './weeklyIntentionService'
import {
  linkGoalToMonth,
  linkMeasurementPeriod,
  materializeMeasurementDayAssignments,
} from './planningMutations'
import { getUserDatabase } from './userDatabaseService'
import { captureUserSession } from './userSessionScope'
import { getPeriodRefsForDate } from '@/utils/periods'
import { periodsInDateRange } from '@/utils/periodSchedule'
import { invalidatePlanningQueryCache } from './planningQueryCache'

async function scheduleObject(item: PlannerObject, id: string) {
  if (item.kind === 'goal') {
    for (const month of periodsInDateRange(item.startDate, item.endDate, 'monthly'))
      await linkGoalToMonth(id, month as MonthRef)
    return
  }
  for (const periodRef of periodsInDateRange(item.startDate, item.endDate, item.cadence)) {
    await linkMeasurementPeriod({
      subjectType: item.kind,
      subjectId: id,
      cadence: item.cadence,
      periodRef: periodRef as MonthRef | WeekRef,
    })
  }
  if (!item.days.length) return
  const weeks = new Map<WeekRef, DayRef[]>()
  for (const day of plannerDays(item)) {
    const weekday = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7
    if (!item.days.includes(weekday)) continue
    const week = getPeriodRefsForDate(day).week
    weeks.set(week, [...(weeks.get(week) ?? []), day])
  }
  for (const [weekRef, dayRefs] of weeks)
    await materializeMeasurementDayAssignments({
      subjectType: item.kind,
      subjectId: id,
      cadence: item.cadence,
      weekRef,
      dayRefs,
      daysMode: 'custom',
    })
}
/**
 * Commit the exact persisted draft, never model arguments. The receipt shares the
 * same transaction as every object, relation and placement, so retry is harmless.
 */
export async function commitPlanningAssistantDraft(
  batchId: string,
  expectedRevision: number
): Promise<PlannerReceipt> {
  const session = captureUserSession()
  const db = getUserDatabase()
  const receipt = await session.wait(
    db.transaction('rw', db.tables, async () => {
      session.assertCurrent()
      const row = await db.drafts.get(PLANNING_ASSISTANT_DRAFT_KEY)
      if (!row) throw new PlanningDraftConflict()
      const draft = parsePlanningDraft(row.data)
      if (draft.id !== batchId) throw new PlanningDraftConflict()
      if (draft.receipt) return draft.receipt
      if (draft.revision !== expectedRevision) throw new PlanningDraftConflict()
      const errors = plannerSelectionErrors(draft.objects)
      if (errors.length) throw new Error(errors[0])
      const selected = draft.objects.filter(item => item.selected)
      // Re-check links inside the write transaction: a second tab may have retired them.
      for (const item of selected) {
        for (const id of item.priorityIds)
          if ((await db.priorities.get(id))?.status !== 'active')
            throw new Error('Powiązany priorytet nie jest już aktywny. Popraw powiązania.')
        for (const id of item.lifeAreaIds)
          if (!(await db.lifeAreas.get(id))?.isActive)
            throw new Error('Powiązany obszar życia nie jest już aktywny. Popraw powiązania.')
      }
      const result: PlannerReceipt = { batchId, objects: [] }
      const ids = new Map<string, string>()
      for (const item of [
        ...selected.filter(item => item.kind === 'goal'),
        ...selected.filter(item => item.kind !== 'goal'),
      ]) {
        let id: string
        const measure = plannerMeasurementPayload(item)
        if (item.kind === 'goal')
          id = (await goalDexieRepository.create(plannerGoalPayload(item))).id
        else if (item.kind === 'keyResult') {
          const goalId = ids.get(item.parentId)
          if (!goalId) throw new Error('Brak celu dla rezultatu.')
          id = (
            await keyResultDexieRepository.create({
              ...measure,
              periodAssignmentMode: 'custom',
              goalId,
              target: plannerTarget(item),
            })
          ).id
        } else if (item.kind === 'habit')
          id = (
            await habitDexieRepository.create({
              ...measure,
              priorityIds: item.priorityIds,
              lifeAreaIds: item.lifeAreaIds,
              target: plannerTarget(item),
              isPermanent: item.isPermanent,
            })
          ).id
        else if (item.kind === 'tracker')
          id = (
            await trackerDexieRepository.create({
              ...measure,
              priorityIds: item.priorityIds,
              lifeAreaIds: item.lifeAreaIds,
            })
          ).id
        else
          id = (
            await createWeeklyIntention({
              ...measure,
              weekRef: getPeriodRefsForDate(item.startDate).week,
              target: plannerTarget(item),
              priorityIds: item.priorityIds,
            })
          ).id
        ids.set(item.id, id)
        await scheduleObject(item, id)
        if (item.kind !== 'keyResult')
          for (const priorityId of item.priorityIds)
            await priorityLinkDexieRepository.create({
              priorityId,
              status: 'active',
              subjectRef: { subjectType: item.kind, subjectId: id },
              contribution: item.whyMatters.trim(),
              expectedSignal: item.successDefinition.trim(),
              validFrom: new Date().toISOString(),
            })
        result.objects.push({ draftId: item.id, id, kind: item.kind, title: item.title.trim() })
      }
      session.assertCurrent()
      draft.receipt = result
      draft.revision++
      await db.drafts.put({
        key: PLANNING_ASSISTANT_DRAFT_KEY,
        data: JSON.stringify(draft),
        updatedAt: new Date().toISOString(),
      })
      return result
    })
  )
  invalidatePlanningQueryCache()
  return receipt
}
