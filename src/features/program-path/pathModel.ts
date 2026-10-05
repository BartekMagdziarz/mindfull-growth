import type { ProgramDefinition, ProgramPhase } from '@/domain/program'
import type { ProgramStepState } from '@/services/programSchedulerService'

/**
 * View model of the path view ("Twoja droga"): steps grouped into rows.
 * A phased path (shame v3: phases = weeks) gets one row per phase; a path
 * without phases is a single open group. The "Powrót" follow-up phase
 * (no `week`) is drawn apart from the weeks.
 */
export interface PathGroup {
  key: string
  index: number
  phase?: ProgramPhase
  /** 1-based week number shown in the row's well; absent for unphased groups and the return. */
  week?: number
  isReturn: boolean
  /** Step indices of this group, in program order. */
  stepIndices: number[]
}

export type PathItemState = 'done' | 'current' | 'later'

export function pathGroups(program: Pick<ProgramDefinition, 'steps' | 'phases'>): PathGroup[] {
  const phases = program.phases ?? []
  if (phases.length === 0) {
    return [{ key: 'all', index: 0, isReturn: false, stepIndices: program.steps.map((_, index) => index) }]
  }
  return phases.map((phase, index) => {
    const end = phases[index + 1]?.fromStepIndex ?? program.steps.length
    const stepIndices: number[] = []
    for (let step = phase.fromStepIndex; step < end; step += 1) stepIndices.push(step)
    const isReturn = phase.week === undefined && program.steps[phase.fromStepIndex]?.afterCompletion === true
    return {
      key: phase.key,
      index,
      phase,
      ...(phase.week !== undefined ? { week: phase.week } : {}),
      isReturn,
      stepIndices,
    }
  })
}

export function stepItemState(state: ProgramStepState | undefined): PathItemState {
  if (!state) return 'later'
  if (state.state === 'done' || state.state === 'skipped') return 'done'
  return state.state === 'current' ? 'current' : 'later'
}

/** Current if it holds the current step; done once every step is done or skipped; later otherwise. */
export function groupState(group: PathGroup, stepStates: readonly ProgramStepState[]): PathItemState {
  const states = group.stepIndices.map((index) => stepItemState(stepStates[index]))
  if (states.includes('current')) return 'current'
  return states.length > 0 && states.every((state) => state === 'done') ? 'done' : 'later'
}

/** Index of the group with the current step, or -1 when nothing is current. */
export function currentGroupIndex(groups: readonly PathGroup[], stepStates: readonly ProgramStepState[]): number {
  return groups.findIndex((group) => groupState(group, stepStates) === 'current')
}

/** How many groups are weeks (the "z 8" of "Tydzień 4 z 8"). */
export function weekCount(groups: readonly PathGroup[]): number {
  return groups.filter((group) => group.week !== undefined).length
}
