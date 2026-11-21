/**
 * Program week layer — the weekly reflection's "Ścieżka" step.
 *
 * One block per program with `weeklyReflection`: how much the problem
 * weighed this week (severity 1–5), the phase question and — for paths
 * that log Momenty — the week's moments. The answers live in the weekly
 * reflection itself (`promptResponses`, keys from `programReflectionKeys`).
 *
 * The weekly real-world task ("W świecie": a proposal in the weekly plan,
 * an intention with a program link, a task section here) was removed on
 * 2026-11-17 — the user never used it. Old rows may still carry
 * `weekLog` / `programLink` / `programRef`; nothing reads them.
 */

import type { WeekRef } from '@/domain/period'
import type { ProgramDefinition, ProgramEnrollment, ProgramPhase } from '@/domain/program'
import type { WeeklyReflection } from '@/domain/reflection'
import { getProgramDefinition } from '@/data/programCatalog'
import { UNLOGGED_BUCKETS } from '@/domain/momentsProgress'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'

/** The phase holding the current step (the last step once the path is walked). */
export function currentPhase(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment
): ProgramPhase | undefined {
  return phaseOfStep(program, enrollment.currentStepIndex)
}

function phaseOfStep(program: ProgramDefinition, stepIndex: number): ProgramPhase | undefined {
  const phases = program.phases ?? []
  const index = Math.min(stepIndex, program.steps.length - 1)
  return [...phases].reverse().find(phase => phase.fromStepIndex <= index)
}

/**
 * The phase the enrollment was in at the end of `weekRef`: the step after
 * the last one completed by then. The running (or a later) week reads the
 * current step, so a skipped optional step is not counted twice.
 */
export function phaseInWeek(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment,
  weekRef: WeekRef
): ProgramPhase | undefined {
  if (weekRef >= getPeriodRefsForDate(new Date()).week) return currentPhase(program, enrollment)
  const { end } = getPeriodBounds(weekRef)
  const doneByThen = enrollment.completedSteps
    .filter(step => getPeriodRefsForDate(step.completedAt).day <= end)
    .map(step => step.stepIndex)
  const next = doneByThen.length ? Math.max(...doneByThen) + 1 : 0
  return phaseOfStep(program, Math.min(next, enrollment.currentStepIndex))
}

/** `promptResponses` keys of the reflection's "Ścieżka" step for one enrollment. */
export function programReflectionKeys(enrollmentId: string) {
  return {
    severity: `program.${enrollmentId}.severity`,
    phase: `program.${enrollmentId}.phase`,
    unlogged: `program.${enrollmentId}.unlogged`,
  }
}

/**
 * The reflection's "moments you did not log" answers for one enrollment,
 * as the representative counts `momentsProgress` draws (bucket keys from
 * `UNLOGGED_BUCKETS`; weeks without an answer are absent).
 */
export function unloggedSeries(
  enrollmentId: string,
  reflections: readonly WeeklyReflection[]
): Partial<Record<WeekRef, number>> {
  const key = programReflectionKeys(enrollmentId).unlogged
  const series: Partial<Record<WeekRef, number>> = {}
  for (const reflection of reflections) {
    const bucket = reflection.promptResponses?.[key]
    if (typeof bucket === 'string' && bucket in UNLOGGED_BUCKETS)
      series[reflection.weekRef] = UNLOGGED_BUCKETS[bucket]
  }
  return series
}

export interface SeverityPoint {
  weekRef: WeekRef
  /** 1–5, null when the week had no reflection answer. */
  value: number | null
}

/** Weekly severity answers for one enrollment, oldest first, from `startWeek` on. */
export function severitySeries(
  enrollmentId: string,
  reflections: readonly WeeklyReflection[],
  startWeek: WeekRef
): SeverityPoint[] {
  const key = programReflectionKeys(enrollmentId).severity
  return reflections
    .filter(reflection => reflection.weekRef >= startWeek)
    .sort((a, b) => a.weekRef.localeCompare(b.weekRef))
    .map(reflection => {
      const raw = Number(reflection.promptResponses?.[key])
      return {
        weekRef: reflection.weekRef,
        value: Number.isInteger(raw) && raw >= 1 && raw <= 5 ? raw : null,
      }
    })
}

/** One program's block in the weekly reflection's "Ścieżka" step. */
export interface ReflectionPathBlock {
  enrollment: ProgramEnrollment
  program: ProgramDefinition
  /** The phase the path was in that week. */
  phase?: ProgramPhase
}

/**
 * One "Ścieżka" block per program: use the latest approach started by the
 * end of the reflected week. A restart supersedes the old approach from
 * that week on; earlier weeks still read the earlier approach. The
 * selected approach gets a block when it is active, when it was closed no
 * earlier than that week (a path completed mid-week keeps its block), or
 * when that week's reflection already holds its answers (a path abandoned
 * later keeps what was written about it).
 */
export async function loadReflectionPathBlocks(weekRef: WeekRef): Promise<ReflectionPathBlock[]> {
  const enrollments = await programEnrollmentDexieRepository.listAll()
  const { start, end } = getPeriodBounds(weekRef)
  const latestByProgram = new Map<string, ProgramEnrollment>()
  for (const enrollment of [...enrollments].sort(
    (a, b) => a.startedAt.localeCompare(b.startedAt) || a.createdAt.localeCompare(b.createdAt)
  )) {
    if (getPeriodRefsForDate(enrollment.startedAt).day > end) continue
    latestByProgram.set(enrollment.programSlug, enrollment)
  }
  // Select before filtering by status: pausing the new approach must not
  // make the abandoned approach reappear.
  const answers = (await structuredReflectionDexieRepository.getWeekly(weekRef))?.promptResponses
  const blocks: ReflectionPathBlock[] = []
  for (const enrollment of [...latestByProgram.values()].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  )) {
    const program = getProgramDefinition(enrollment.programSlug)
    if (!program?.weeklyReflection) continue
    const closedThatWeek =
      enrollment.status === 'completed' &&
      Boolean(enrollment.completedAt) &&
      getPeriodRefsForDate(enrollment.completedAt!).day >= start
    const answered = Object.keys(answers ?? {}).some(key =>
      key.startsWith(`program.${enrollment.id}.`)
    )
    if (enrollment.status !== 'active' && !closedThatWeek && !answered) continue
    blocks.push({ enrollment, program, phase: phaseInWeek(program, enrollment, weekRef) })
  }
  return blocks
}
