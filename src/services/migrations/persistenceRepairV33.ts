import type { Transaction } from 'dexie'
import type { ExercisePlanItem } from '@/domain/exercisePlan'
import type { AssessmentResponse } from '@/domain/assessments'
import type { ProgramEnrollment } from '@/domain/program'

// Keep this key definition frozen with the migration, independently of later
// changes to the runtime scheduling model.
function pendingProgramPlanKey(item: ExercisePlanItem): string | undefined {
  if (item.source !== 'program' || !item.sourceRef || item.status !== 'pending') return undefined
  return item.programRole === 'practice'
    ? JSON.stringify([item.sourceRef, 'practice', item.exerciseSlug])
    : JSON.stringify([item.sourceRef, 'step'])
}

/** Frozen v33 repair. Removed duplicates remain recoverable in the archive. */
export async function repairPersistenceV33(transaction: Transaction): Promise<void> {
  const archive = async (collection: string, row: { id: string }) => {
    await transaction.table('dataRepairArchives').put({
      id: `v33:${collection}:${row.id}`,
      collection,
      record: row,
      archivedAt: new Date().toISOString(),
    })
    await transaction.table(collection).delete(row.id)
  }
  const answers = await transaction.table<AssessmentResponse>('assessmentResponses').toArray()
  answers.sort(
    (a, b) =>
      String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')) ||
      String(b.answeredAt ?? '').localeCompare(String(a.answeredAt ?? '')) ||
      a.id.localeCompare(b.id)
  )
  const seenAnswers = new Set<string>()
  for (const answer of answers) {
    const key = JSON.stringify([answer.attemptId, answer.itemId])
    if (seenAnswers.has(key)) await archive('assessmentResponses', answer)
    else seenAnswers.add(key)
  }
  for (const attempt of await transaction.table('assessmentAttempts').toArray()) {
    await transaction.table('assessmentAttempts').update(attempt.id, {
      responseCount: await transaction
        .table('assessmentResponses')
        .where('attemptId')
        .equals(attempt.id)
        .count(),
    })
  }
  const enrollments = new Map(
    (await transaction.table<ProgramEnrollment>('programEnrollments').toArray()).map(row => [
      row.id,
      row,
    ])
  )
  const plans = await transaction.table<ExercisePlanItem>('exercisePlanItems').toArray()
  plans.sort(
    (a, b) =>
      String(a.dayRef ?? '').localeCompare(String(b.dayRef ?? '')) ||
      String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')) ||
      a.id.localeCompare(b.id)
  )
  const seenPlans = new Set<string>()
  for (const plan of plans) {
    const key = pendingProgramPlanKey(plan)
    if (key && seenPlans.has(key)) {
      await archive('exercisePlanItems', plan)
      continue
    }
    if (key) seenPlans.add(key)
    plan.pendingProgramKey = key
    if (key && plan.programRole !== 'practice') {
      plan.programStepIndex ??= enrollments.get(plan.sourceRef!)?.currentStepIndex
    }
    await transaction.table('exercisePlanItems').put(plan)
  }
}
