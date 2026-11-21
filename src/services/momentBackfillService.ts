import type { MicroExerciseEntry, MicroStepValue } from '@/domain/microExercises'
import { momentFamily, type MomentFamilyKind } from '@/domain/momentFamilies'
import { MOMENTS_SLUG } from '@/domain/moments'
import type { DayRef } from '@/domain/period'
import { microExerciseEntryDexieRepository } from '@/repositories/microExerciseEntryDexieRepository'
import { captureUserSession } from '@/services/userSessionScope'

/**
 * A Moment written down later — from the weekly reflection's "Były momenty,
 * których nie zapisałeś?" (Lab /concepts/path-week-reflection, 2026-10-11).
 *
 * The entry gets the day it happened (noon, local), `noticed: 'later'`
 * and `backfilled: 'yes'`, so the charts can hatch it and the "when I
 * notice" statistic files it honestly. It is not an exercise completion:
 * the practice "Momenty" was not done that day, so no completion row and
 * no plan-item auto-complete.
 */
export interface BackfillMomentInput {
  kind: MomentFamilyKind
  day: DayRef
  /** The part or reaction that took the wheel (a key of the kind's family). */
  reaction: string
  /** "Co zrobiłeś zamiast" answers; empty = "nothing". */
  response?: string[]
  situation?: string
}

/** How many Moments a reflection may add for one week — the ones remembered best. */
export const BACKFILL_LIMIT = 2

export function isBackfilledMoment(entry: MicroExerciseEntry): boolean {
  return entry.responses.backfilled === 'yes'
}

export async function backfillMoment(input: BackfillMomentInput): Promise<MicroExerciseEntry> {
  const session = captureUserSession()
  const family = momentFamily(input.kind)
  const response = input.response?.length ? input.response : ['nothing']
  const responses: Record<string, MicroStepValue> = {
    kind: input.kind,
    hadMoment: 'yes',
    [family.reactionStep]: input.reaction,
    noticed: 'later',
    [family.responseStep]: response,
    backfilled: 'yes',
    ...(input.situation?.trim() ? { situation: input.situation.trim() } : {}),
  }
  return session.wait(
    microExerciseEntryDexieRepository.create({
      exerciseSlug: MOMENTS_SLUG,
      responses,
      createdAt: new Date(`${input.day}T12:00:00`).toISOString(),
    })
  )
}
