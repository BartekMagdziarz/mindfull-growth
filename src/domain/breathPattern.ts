/**
 * Breath pattern — the timing model behind `MicroBreathTimer.vue`.
 *
 * One breath is four phases in a fixed order (inhale, hold after the
 * inhale, exhale, hold after the exhale). A phase of 0 s is skipped. The
 * session runs a whole number of breaths — the chosen duration is rounded
 * to the nearest full breath, so the exercise never stops mid-breath.
 */

export type BreathPhaseSeconds = [number, number, number, number]

export const BREATH_PHASES = ['inhale', 'holdIn', 'exhale', 'holdOut'] as const
export type BreathPhase = (typeof BREATH_PHASES)[number]

/** Allowed seconds per phase; holds may be switched off with 0. */
export const PHASE_LIMITS: Record<BreathPhase, { min: number; max: number }> = {
  inhale: { min: 2, max: 10 },
  holdIn: { min: 0, max: 10 },
  exhale: { min: 2, max: 12 },
  holdOut: { min: 0, max: 10 },
}

export const DURATION_MINUTES = { min: 1, max: 20 } as const

export interface BreathPreset {
  id: string
  phaseSeconds: BreathPhaseSeconds
}

export const BREATH_PRESETS: BreathPreset[] = [
  { id: 'soothing', phaseSeconds: [4, 0, 6, 0] },
  { id: 'box', phaseSeconds: [4, 4, 4, 4] },
  { id: 'relax478', phaseSeconds: [4, 7, 8, 0] },
  { id: 'even', phaseSeconds: [5, 0, 5, 0] },
]

export interface BreathSettings {
  phaseSeconds: BreathPhaseSeconds
  /** Whole minutes the user asked for; the session rounds to full breaths. */
  minutes: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

/** Clamps every phase into its limits; bad input falls back per phase. */
export function normalizePhaseSeconds(
  value: unknown,
  fallback: BreathPhaseSeconds,
): BreathPhaseSeconds {
  const source = Array.isArray(value) && value.length === 4 ? value : fallback
  return BREATH_PHASES.map((phase, index) => {
    const raw = Number(source[index])
    const { min, max } = PHASE_LIMITS[phase]
    return clamp(Number.isFinite(raw) ? raw : fallback[index]!, min, max)
  }) as BreathPhaseSeconds
}

export function normalizeMinutes(value: unknown, fallback: number): number {
  const raw = Number(value)
  return clamp(Number.isFinite(raw) ? raw : fallback, DURATION_MINUTES.min, DURATION_MINUTES.max)
}

export function cycleSeconds(phaseSeconds: BreathPhaseSeconds): number {
  return phaseSeconds.reduce((sum, seconds) => sum + seconds, 0)
}

/** Full breaths that fit the chosen minutes (at least one). */
export function breathCount(settings: BreathSettings): number {
  const cycle = cycleSeconds(settings.phaseSeconds)
  if (cycle <= 0) return 1
  return Math.max(1, Math.round((settings.minutes * 60) / cycle))
}

/** Real session length: whole breaths, so it may differ from the minutes. */
export function sessionSeconds(settings: BreathSettings): number {
  return breathCount(settings) * cycleSeconds(settings.phaseSeconds)
}

export function samePhaseSeconds(a: BreathPhaseSeconds, b: BreathPhaseSeconds): boolean {
  return a.every((seconds, index) => seconds === b[index])
}

export interface BreathPosition {
  /** 0-based breath; equals the breath count once the session is over. */
  breath: number
  /** 0–3 in `BREATH_PHASES` order; never a 0-second phase. */
  phase: number
  /** 0–1 through the current phase. */
  progress: number
  /** Whole seconds left in the phase (the countdown in the square). */
  remaining: number
  done: boolean
}

/** Where the session is after `elapsedMs` of breathing. */
export function breathPositionAt(settings: BreathSettings, elapsedMs: number): BreathPosition {
  const phases = settings.phaseSeconds
  const cycleMs = cycleSeconds(phases) * 1000
  const breaths = breathCount(settings)
  const elapsed = Math.max(0, elapsedMs)
  if (cycleMs <= 0 || elapsed >= breaths * cycleMs) {
    return { breath: breaths, phase: 0, progress: 1, remaining: 0, done: true }
  }

  const breath = Math.floor(elapsed / cycleMs)
  let within = elapsed - breath * cycleMs
  for (let phase = 0; phase < phases.length; phase++) {
    const phaseMs = phases[phase]! * 1000
    if (phaseMs === 0) continue
    if (within < phaseMs) {
      return {
        breath,
        phase,
        progress: within / phaseMs,
        remaining: Math.ceil((phaseMs - within) / 1000),
        done: false,
      }
    }
    within -= phaseMs
  }
  // Float edge at the very end of a cycle: count it as the next breath.
  return breathPositionAt(settings, (breath + 1) * cycleMs)
}
