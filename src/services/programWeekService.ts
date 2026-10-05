/**
 * Program week layer — the weekly real-world task and the weekly
 * reflection's "Ścieżka" step (plan §5 "Tydzień ścieżki").
 *
 * - The weekly planning ritual PROPOSES one task per active program; the
 *   user accepts (→ a regular weekly intention carrying `programLink`),
 *   edits, or declines. Nothing is created automatically.
 * - The task follows the PHASE of the current step, not the week number,
 *   so a late step never skips tasks and a task never runs ahead of the
 *   exercise that prepares it.
 * - Decisions live in `ProgramEnrollment.weekLog` (one entry per week).
 *   The reflection's answers live in the weekly reflection itself
 *   (`promptResponses`, keys from `programReflectionKeys`).
 *
 * Writes go through repositories/services only.
 */

import type { DayRef, WeekRef } from '@/domain/period'
import type { WeeklyIntention } from '@/domain/planning'
import type {
  ProgramDefinition,
  ProgramEnrollment,
  ProgramPhase,
  ProgramWeekEntry,
  ProgramWeeklyTask,
} from '@/domain/program'
import type { WeeklyReflection } from '@/domain/reflection'
import { getProgramDefinition } from '@/data/programCatalog'
import { UNLOGGED_BUCKETS } from '@/domain/momentsProgress'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import { createWeeklyIntention, listWeeklyIntentions } from '@/services/weeklyIntentionService'
import { getPeriodBounds } from '@/utils/periods'

export interface ProgramTaskProposal extends WeeklyTaskOptions {
  enrollment: ProgramEnrollment
  program: ProgramDefinition
  /** The suggested task (`suggested`), kept under its old name for callers. */
  task: ProgramWeeklyTask
}

/**
 * What the planning ritual offers for one enrollment: the tasks of the
 * current phase (a choice), the tasks of earlier phases (collapsed), and
 * the one to preselect.
 */
export interface WeeklyTaskOptions {
  /** Tasks of the current phase, in definition order. */
  current: ProgramWeeklyTask[]
  /** Tasks of earlier phases, in definition order (never the current phase's). */
  earlier: ProgramWeeklyTask[]
  /** Preselected: last week's task after "stay", else the first task of the phase not accepted yet, else the phase's last. */
  suggested: ProgramWeeklyTask
  /** The same task as last week (after "zostań przy tym zadaniu" or a phase without new tasks). */
  repeat: boolean
}

/** The phase holding the current step (the last step once the path is walked). */
export function currentPhase(program: ProgramDefinition, enrollment: ProgramEnrollment): ProgramPhase | undefined {
  const phases = program.phases ?? []
  const index = Math.min(enrollment.currentStepIndex, program.steps.length - 1)
  return [...phases].reverse().find((phase) => phase.fromStepIndex <= index)
}

function sortedLog(enrollment: ProgramEnrollment): ProgramWeekEntry[] {
  return [...(enrollment.weekLog ?? [])].sort((a, b) => a.weekRef.localeCompare(b.weekRef))
}

/**
 * The tasks to offer for `weekRef`, or null. Rules for `suggested`, in order:
 * 1. only active enrollments, and only while the week has no decision yet;
 * 2. the previous week asked to stay → the same task again;
 * 3. the first task of the current phase not accepted yet;
 * 4. every task of the phase already accepted → the phase's last task (repeat);
 * 5. a phase without tasks (e.g. an optional "deeper" phase) → the last
 *    accepted task (repeat), or nothing when none was ever accepted.
 * `current` lists the phase's tasks, `earlier` those of the phases before
 * it, so the user can pick another aspect to work on (plan §4, 2026-09-26).
 */
export function proposeWeeklyTaskOptions(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment,
  weekRef: WeekRef,
): WeeklyTaskOptions | null {
  if (enrollment.status !== 'active') return null
  const tasks = program.weeklyTasks ?? []
  if (tasks.length === 0) return null
  const log = sortedLog(enrollment)
  if (log.some((entry) => entry.weekRef === weekRef)) return null

  const phase = currentPhase(program, enrollment)
  const phases = program.phases ?? []
  const phaseIndex = phases.findIndex((candidate) => candidate.key === phase?.key)
  const earlierKeys = new Set(phases.slice(0, Math.max(phaseIndex, 0)).map((candidate) => candidate.key))
  const current = tasks.filter((task) => task.phaseKey === phase?.key)
  const earlier = tasks.filter((task) => earlierKeys.has(task.phaseKey))

  const previous = [...log].reverse().find((entry) => entry.weekRef < weekRef)
  if (previous?.stayNextWeek) {
    const task = tasks.find((candidate) => candidate.key === previous.taskKey)
    if (task) return { current, earlier, suggested: task, repeat: true }
  }

  const accepted = new Set(log.filter((entry) => entry.decision === 'accepted').map((entry) => entry.taskKey))
  if (current.length === 0) {
    // An optional phase without tasks: offer the earlier ones, preselecting
    // the last accepted task so a repeat is one click.
    const lastAccepted = [...log].reverse().find((entry) => entry.decision === 'accepted')
    const task = lastAccepted ? tasks.find((candidate) => candidate.key === lastAccepted.taskKey) : undefined
    if (!task) return null
    return { current, earlier, suggested: task, repeat: true }
  }
  const fresh = current.find((task) => !accepted.has(task.key))
  if (fresh) return { current, earlier, suggested: fresh, repeat: false }
  return { current, earlier, suggested: current[current.length - 1]!, repeat: true }
}

/** The suggested task only — the shape the reflection and older callers use. */
export function proposeWeeklyTask(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment,
  weekRef: WeekRef,
): { task: ProgramWeeklyTask; repeat: boolean } | null {
  const options = proposeWeeklyTaskOptions(program, enrollment, weekRef)
  return options ? { task: options.suggested, repeat: options.repeat } : null
}

/** Proposals for every active enrollment whose program has weekly tasks. */
export async function listWeeklyTaskProposals(weekRef: WeekRef): Promise<ProgramTaskProposal[]> {
  const enrollments = await programEnrollmentDexieRepository.listAll()
  const proposals: ProgramTaskProposal[] = []
  for (const enrollment of enrollments.filter((e) => e.status === 'active')) {
    const program = getProgramDefinition(enrollment.programSlug)
    if (!program) continue
    const options = proposeWeeklyTaskOptions(program, enrollment, weekRef)
    if (options) proposals.push({ enrollment, program, task: options.suggested, ...options })
  }
  return proposals.sort((a, b) => a.enrollment.createdAt.localeCompare(b.enrollment.createdAt))
}

function withEntry(enrollment: ProgramEnrollment, entry: ProgramWeekEntry): ProgramWeekEntry[] {
  return [...(enrollment.weekLog ?? []).filter((existing) => existing.weekRef !== entry.weekRef), entry]
}

export interface AcceptWeeklyTaskInput {
  enrollmentId: string
  weekRef: WeekRef
  taskKey: string
  /** Translated (possibly edited) intention title — services stay i18n-free. */
  title: string
  /** Weekly target; defaults to the task's `times`. */
  times?: number
  priorityIds?: string[]
}

/** Creates the linked weekly intention and records the acceptance. */
export async function acceptWeeklyTask(
  input: AcceptWeeklyTaskInput,
): Promise<{ intention: WeeklyIntention; enrollment: ProgramEnrollment }> {
  const enrollment = await requireEnrollment(input.enrollmentId)
  const program = getProgramDefinition(enrollment.programSlug)
  const task = program?.weeklyTasks?.find((candidate) => candidate.key === input.taskKey)
  if (!task) throw new Error(`Program ${enrollment.programSlug} has no weekly task ${input.taskKey}`)
  const times = Math.max(1, Math.round(input.times ?? task.times))
  const intention = await createWeeklyIntention({
    weekRef: input.weekRef,
    title: input.title.trim(),
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: times },
    priorityIds: input.priorityIds ?? [],
    programLink: { enrollmentId: enrollment.id, taskKey: task.key },
  })
  const updated = await programEnrollmentDexieRepository.update(enrollment.id, {
    weekLog: withEntry(enrollment, {
      weekRef: input.weekRef,
      taskKey: task.key,
      decision: 'accepted',
      intentionId: intention.id,
    }),
  })
  return { intention, enrollment: updated }
}

/** "Nie w tym tygodniu": closes this week's proposal without an intention. */
export async function declineWeeklyTask(
  enrollmentId: string,
  weekRef: WeekRef,
  taskKey: string,
): Promise<ProgramEnrollment> {
  const enrollment = await requireEnrollment(enrollmentId)
  return programEnrollmentDexieRepository.update(enrollment.id, {
    weekLog: withEntry(enrollment, { weekRef, taskKey, decision: 'declined' }),
  })
}

/** Reflection toggle "zostań przy tym zadaniu w przyszłym tygodniu". */
export async function setStayNextWeek(
  enrollmentId: string,
  weekRef: WeekRef,
  stay: boolean,
): Promise<ProgramEnrollment> {
  const enrollment = await requireEnrollment(enrollmentId)
  const entry = enrollment.weekLog?.find((candidate) => candidate.weekRef === weekRef)
  if (!entry) throw new Error(`Enrollment ${enrollmentId} has no task decision for ${weekRef}`)
  return programEnrollmentDexieRepository.update(enrollment.id, {
    weekLog: withEntry(enrollment, { ...entry, stayNextWeek: stay }),
  })
}

/**
 * This week's entry together with its linked intention. An accepted entry
 * whose intention was deleted reads as declined — the reflection shows the
 * task without a result.
 */
export async function weekTaskForEnrollment(
  enrollment: ProgramEnrollment,
  weekRef: WeekRef,
): Promise<{ entry: ProgramWeekEntry; intention: WeeklyIntention | null } | null> {
  const entry = enrollment.weekLog?.find((candidate) => candidate.weekRef === weekRef)
  if (!entry) return null
  if (entry.decision !== 'accepted' || !entry.intentionId) return { entry, intention: null }
  const intentions = await listWeeklyIntentions(weekRef)
  const intention = intentions.find((candidate) => candidate.id === entry.intentionId) ?? null
  return intention ? { entry, intention } : { entry: { ...entry, decision: 'declined' }, intention: null }
}

/** `promptResponses` keys of the reflection's "Ścieżka" step for one enrollment. */
export function programReflectionKeys(enrollmentId: string) {
  return {
    outcome: `program.${enrollmentId}.outcome`,
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
  reflections: readonly WeeklyReflection[],
): Partial<Record<WeekRef, number>> {
  const key = programReflectionKeys(enrollmentId).unlogged
  const series: Partial<Record<WeekRef, number>> = {}
  for (const reflection of reflections) {
    const bucket = reflection.promptResponses?.[key]
    if (typeof bucket === 'string' && bucket in UNLOGGED_BUCKETS) series[reflection.weekRef] = UNLOGGED_BUCKETS[bucket]
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
  startWeek: WeekRef,
): SeverityPoint[] {
  const key = programReflectionKeys(enrollmentId).severity
  return reflections
    .filter((reflection) => reflection.weekRef >= startWeek)
    .sort((a, b) => a.weekRef.localeCompare(b.weekRef))
    .map((reflection) => {
      const raw = Number(reflection.promptResponses?.[key])
      return { weekRef: reflection.weekRef, value: Number.isInteger(raw) && raw >= 1 && raw <= 5 ? raw : null }
    })
}

/** This week's task of one enrollment as the path view and the reflection read it. */
export interface WeekTaskState {
  entry?: ProgramWeekEntry
  task?: ProgramWeeklyTask
  /** The accepted task's intention (null when declined or deleted). */
  intention: WeeklyIntention | null
  /** Days with an entry for the intention this week. */
  doneCount: number
}

/**
 * The task decision of `weekRef` with its intention and how many days it
 * already has (`entries` = the week's daily measurement entries, loaded
 * once by callers that read several enrollments).
 */
export async function weekTaskState(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment,
  weekRef: WeekRef,
  entries?: readonly { subjectType: string; subjectId: string; dayRef: DayRef }[],
): Promise<WeekTaskState> {
  const weekTask = await weekTaskForEnrollment(enrollment, weekRef)
  const intention = weekTask?.intention ?? null
  let doneCount = 0
  if (intention) {
    const { start, end } = getPeriodBounds(weekRef)
    const list =
      entries ?? (await planningStateDexieRepository.listDailyMeasurementEntriesForDayRange(start as DayRef, end as DayRef))
    doneCount = new Set(
      list
        .filter((entry) => entry.subjectType === 'weeklyIntention' && entry.subjectId === intention.id)
        .map((entry) => entry.dayRef),
    ).size
  }
  const task = weekTask ? program.weeklyTasks?.find((candidate) => candidate.key === weekTask.entry.taskKey) : undefined
  return {
    ...(weekTask ? { entry: weekTask.entry } : {}),
    ...(task ? { task } : {}),
    intention,
    doneCount,
  }
}

/** One program's block in the weekly reflection's "Ścieżka" step. */
export interface ReflectionPathBlock {
  enrollment: ProgramEnrollment
  program: ProgramDefinition
  phase?: ProgramPhase
  /** This week's task decision, when there was one. */
  entry?: ProgramWeekEntry
  task?: ProgramWeeklyTask
  /** The accepted task's intention (null when declined or deleted). */
  intention: WeeklyIntention | null
  /** Days with an entry for the intention this week. */
  doneCount: number
}

/**
 * Programs that get a "Ścieżka" block in `weekRef`'s reflection: those with
 * `weeklyReflection` that are active, or that recorded a task decision this
 * week (e.g. a path completed mid-week).
 */
export async function loadReflectionPathBlocks(weekRef: WeekRef): Promise<ReflectionPathBlock[]> {
  const enrollments = await programEnrollmentDexieRepository.listAll()
  const relevant = enrollments
    .filter((enrollment) => {
      const program = getProgramDefinition(enrollment.programSlug)
      if (!program?.weeklyReflection) return false
      return enrollment.status === 'active' || Boolean(enrollment.weekLog?.some((entry) => entry.weekRef === weekRef))
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  if (relevant.length === 0) return []

  const { start, end } = getPeriodBounds(weekRef)
  const entries = await planningStateDexieRepository.listDailyMeasurementEntriesForDayRange(
    start as DayRef,
    end as DayRef,
  )
  const blocks: ReflectionPathBlock[] = []
  for (const enrollment of relevant) {
    const program = getProgramDefinition(enrollment.programSlug)!
    const state = await weekTaskState(program, enrollment, weekRef, entries)
    // A past week is read in the phase of the task it had, not today's phase.
    const phase = state.task
      ? (program.phases?.find((candidate) => candidate.key === state.task!.phaseKey) ?? currentPhase(program, enrollment))
      : currentPhase(program, enrollment)
    blocks.push({ enrollment, program, phase, ...state })
  }
  return blocks
}

async function requireEnrollment(id: string): Promise<ProgramEnrollment> {
  const enrollment = await programEnrollmentDexieRepository.getById(id)
  if (!enrollment) throw new Error(`Program enrollment ${id} not found`)
  return enrollment
}
