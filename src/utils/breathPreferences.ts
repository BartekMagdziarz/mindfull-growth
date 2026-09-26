import {
  normalizeMinutes,
  normalizePhaseSeconds,
  type BreathSettings,
} from '@/domain/breathPattern'

/**
 * The last rhythm a user started, per breathing exercise — so a changed
 * pattern (e.g. 4·2·6·2) comes back next time instead of the default.
 */
const STORAGE_PREFIX = 'mg-breath-pattern:'

export function loadBreathSettings(key: string, fallback: BreathSettings): BreathSettings {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<BreathSettings>
    return {
      phaseSeconds: normalizePhaseSeconds(parsed.phaseSeconds, fallback.phaseSeconds),
      minutes: normalizeMinutes(parsed.minutes, fallback.minutes),
    }
  } catch {
    // localStorage unavailable or a corrupt entry
    return fallback
  }
}

export function saveBreathSettings(key: string, settings: BreathSettings): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(settings))
  } catch {
    // localStorage unavailable
  }
}

/** Called by `resetAppState()` — rhythms belong to the previous user. */
export function clearBreathPreferences(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  } catch {
    // localStorage unavailable — ignore
  }
}
