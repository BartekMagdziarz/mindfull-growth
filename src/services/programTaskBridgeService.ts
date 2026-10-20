import { captureUserSession } from '@/services/userSessionScope'
/**
 * Task ↔ exercise bridge (shame path v2 plan §5, decision D5/D7).
 *
 * A path's weekly task is a weekly intention with a "min N days" target
 * and a `programLink`. Each task names the exercise that anchors it
 * (`ProgramWeeklyTask.linkSlug`). When that exercise records a completion
 * — from the path panel, the exercise view, a practice row, anywhere —
 * the day gets an intention entry, exactly as the check in Plan Dnia
 * would create it. One day = one entry (upsert), so a second save on the
 * same day never double-counts. A task with a `countRule` counts only the
 * Moments whose answers say the task happened (`taskCountsEntry`). Deleting the exercise entry does not undo
 * the day; the user unticks it in Plan Dnia.
 *
 * Hooked into `recordCompletion`; never throws into the caller.
 */

import type { MicroExerciseEntry } from '@/domain/microExercises'
import { momentFamily, reactionOf, responsesOf } from '@/domain/momentFamilies'
import type { DayRef, WeekRef } from '@/domain/period'
import type { WeeklyIntention } from '@/domain/planning'
import type { ProgramDefinition, ProgramEnrollment, ProgramWeeklyTask } from '@/domain/program'
import { definitionSlugFor } from '@/data/exerciseCatalog'
import { getMicroExercise } from '@/data/microExercises'
import { getProgramDefinition } from '@/data/programCatalog'
import { microExerciseEntryDexieRepository } from '@/repositories/microExerciseEntryDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import { listWeeklyIntentions } from '@/services/weeklyIntentionService'
import { getPeriodRefsForDate } from '@/utils/periods'

export interface ProgramTaskMatch {
  enrollment: ProgramEnrollment
  program: ProgramDefinition
  task: ProgramWeeklyTask
  intention: WeeklyIntention
}

/**
 * Accepted tasks of `weekRef` whose anchor exercise is `slug`: active
 * enrollments only, the week's accepted log entry, an intention that still
 * exists. Pure over the given rows.
 */
export function matchProgramTasks(
  slug: string,
  weekRef: WeekRef,
  enrollments: readonly ProgramEnrollment[],
  intentions: readonly WeeklyIntention[],
  resolveProgram: (programSlug: string) => ProgramDefinition | undefined = getProgramDefinition
): ProgramTaskMatch[] {
  const matches: ProgramTaskMatch[] = []
  for (const enrollment of enrollments) {
    if (enrollment.status !== 'active') continue
    const program = resolveProgram(enrollment.programSlug)
    if (!program) continue
    const entry = enrollment.weekLog?.find(candidate => candidate.weekRef === weekRef)
    if (!entry || entry.decision !== 'accepted' || !entry.intentionId) continue
    const task = program.weeklyTasks?.find(candidate => candidate.key === entry.taskKey)
    if (!task || task.linkSlug !== slug) continue
    const intention = intentions.find(candidate => candidate.id === entry.intentionId)
    if (!intention) continue
    matches.push({ enrollment, program, task, intention })
  }
  return matches
}

/**
 * Does this entry count a day of `task`? Tasks without a `countRule` count
 * every completion (the original bridge). With a rule, the Moment's
 * "co zrobiłeś zamiast" answers (and the part at the wheel) decide — a
 * Moment logged with "nic, tym razem" is not a day of "zrób coś dla siebie".
 */
export function taskCountsEntry(
  task: ProgramWeeklyTask,
  entry: MicroExerciseEntry | undefined
): boolean {
  const rule = task.countRule
  if (!rule) return true
  if (!entry) return false
  if (entry.responses.hadMoment !== 'yes') return false
  // The Moment's own family decides which steps hold the reaction and the moves (shame: compass/response).
  const family = momentFamily(entry.responses.kind)
  if (rule.part && reactionOf(entry.responses, family) !== rule.part) return false
  const response = responsesOf(entry.responses, family)
  if (rule.any) return response.some(item => item !== 'nothing')
  return (rule.options ?? []).some(option => response.includes(option))
}

export interface TaskProgressResult {
  /** Intentions that got (or already had) an entry for `dayRef`. */
  intentionIds: string[]
}

/**
 * Counts a completion of `slug` on `dayRef` towards every matching task
 * of that day's week. A micro entry (`recordId`) is tagged with the first
 * match so the reflection and panels can find it.
 */
export async function recordTaskProgress(
  slug: string,
  dayRef: DayRef,
  recordId?: string
): Promise<TaskProgressResult> {
  const session = captureUserSession()
  const weekRef = getPeriodRefsForDate(new Date(`${dayRef}T12:00:00`)).week
  const enrollments = await session.wait(programEnrollmentDexieRepository.listAll())
  if (!enrollments.some(enrollment => enrollment.status === 'active')) return { intentionIds: [] }
  const intentions = await session.wait(listWeeklyIntentions(weekRef))
  let matches = matchProgramTasks(slug, weekRef, enrollments, intentions)
  if (matches.some(match => match.task.countRule)) {
    // Only tasks with a rule need the entry; a missing entry fails those rules.
    const entry = recordId
      ? await session.wait(microExerciseEntryDexieRepository.getById(recordId))
      : undefined
    matches = matches.filter(match => taskCountsEntry(match.task, entry))
  }
  const intentionIds: string[] = []
  for (const match of matches) {
    await session.wait(
      planningStateDexieRepository.upsertDailyMeasurementEntry({
        subjectType: 'weeklyIntention',
        subjectId: match.intention.id,
        dayRef,
        value: null,
      })
    )
    intentionIds.push(match.intention.id)
  }
  const first = matches[0]
  if (first && recordId && getMicroExercise(definitionSlugFor(slug))) {
    try {
      await session.wait(
        microExerciseEntryDexieRepository.update(recordId, {
          programRef: { enrollmentId: first.enrollment.id, taskKey: first.task.key, weekRef },
        })
      )
    } catch (err) {
      session.assertCurrent()
      // The day is already counted; the tag is a convenience.
      console.error('Failed to tag the micro entry with its program task:', err)
    }
  }
  return { intentionIds }
}
