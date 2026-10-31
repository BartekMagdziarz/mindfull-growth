/**
 * Shared helpers of the dev seeds (`verificationSeed.ts`, `demo/demoSeed.ts`).
 *
 * Dev-only: reachable solely through the seeds, which main.ts loads with a
 * DEV-guarded dynamic import, so none of this reaches a production bundle.
 * Everything writes through repositories and services; the one deliberate
 * exception is `backdate()`, which rewrites the wall-clock timestamps that
 * repositories stamp on rows a seed just created.
 */

import Dexie from 'dexie'
import type { AssessmentId, AssessmentItemDefinition } from '@/domain/assessments'
import type { DayRef, WeekRef } from '@/domain/period'
import type { MeasurementSubjectType } from '@/domain/planningState'
import type { User } from '@/domain/user'
import { assessmentsDexieRepository } from '@/repositories/assessmentsDexieRepository'
import { authDexieRepository } from '@/repositories/authDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { getAssessmentRegistryEntry } from '@/services/assessments/registry'
import { hashPassword } from '@/services/cryptoService'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import {
  connectUserDatabase,
  disconnectUserDatabase,
  getUserDatabase,
} from '@/services/userDatabaseService'
import { addDaysToDayRef, getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'

// ─── Dates ───────────────────────────────────────────────────────────────────

/** DayRefs at the given Monday-offsets (0=Mon … 6=Sun) within a week. */
export function weekDays(weekRef: WeekRef, offsets: number[]): DayRef[] {
  const monday = getPeriodBounds(weekRef).start
  return offsets.map(offset => addDaysToDayRef(monday, offset))
}

/** ISO timestamp at a local-looking wall-clock time on the given day (UTC-suffixed). */
export const isoAt = (dayRef: DayRef, time = '12:00:00'): string => `${dayRef}T${time}.000Z`

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Rewrites timestamps of a row this seed created. Repositories stamp
 * createdAt/completedAt with the wall clock, so historical rows need a narrow
 * pass after creation (same approach as src/dev/ai-companion/demo.ts).
 */
export async function backdate(
  table: string,
  id: string,
  fields: Record<string, string>
): Promise<void> {
  await getUserDatabase().table(table).update(id, fields)
}

// ─── Measurement entries ─────────────────────────────────────────────────────

/** One daily entry; `checkedItemIds` is written only when given (multi-completion). */
export async function upsertMeasurementEntry(
  subjectType: MeasurementSubjectType,
  subjectId: string,
  dayRef: DayRef,
  value: number | null,
  checkedItemIds?: string[]
): Promise<void> {
  await planningStateDexieRepository.upsertDailyMeasurementEntry({
    subjectType,
    subjectId,
    dayRef,
    value,
    ...(checkedItemIds ? { checkedItemIds } : {}),
  })
}

/** The same value on every given day. */
export async function addMeasurementEntries(
  subjectType: MeasurementSubjectType,
  subjectId: string,
  days: DayRef[],
  value: number | null
): Promise<void> {
  await Promise.all(
    days.map(dayRef => upsertMeasurementEntry(subjectType, subjectId, dayRef, value))
  )
}

/** Multi-completion entries: the same checked items on every given day. */
export async function addMultiCompletionEntries(
  subjectType: MeasurementSubjectType,
  subjectId: string,
  days: DayRef[],
  checkedItemIds: string[]
): Promise<void> {
  await Promise.all(
    days.map(dayRef => upsertMeasurementEntry(subjectType, subjectId, dayRef, null, checkedItemIds))
  )
}

// ─── Assessments ─────────────────────────────────────────────────────────────

export type AssessmentResponseFor = (item: AssessmentItemDefinition, index: number) => number

/**
 * Responses around a per-item level (e.g. 3.4 on a 1–5 scale): a small
 * ±0.4 wobble by item position, reverse-keyed items mirrored, rounded and
 * clamped to the item's range.
 */
export function leveledResponses(
  level: (item: AssessmentItemDefinition) => number
): AssessmentResponseFor {
  return (item, index) => {
    const keyed = level(item) + (index % 3 === 0 ? 0.4 : index % 3 === 1 ? -0.4 : 0)
    const raw = item.reverse ? item.responseMax + item.responseMin - keyed : keyed
    return clamp(Math.round(raw), item.responseMin, item.responseMax)
  }
}

/**
 * A completed, scored attempt of an instrument. With `daysAgo` the attempt is
 * backdated to that afternoon; without it the timestamps stay at "now".
 */
export async function seedAssessmentAttempt(
  assessmentId: AssessmentId,
  responseFor: AssessmentResponseFor,
  options: { daysAgo?: number } = {}
) {
  const entry = getAssessmentRegistryEntry(assessmentId)
  const { definition } = entry
  const attempt = await assessmentsDexieRepository.startAttempt({
    assessmentId,
    instrumentVersion: definition.instrumentVersion,
    language: 'pl',
    scoringKeyVersion: definition.scoringKeyVersion,
    missingDataPolicyVersion: definition.missingDataPolicy.id,
    totalItems: definition.items.length,
  })
  const responses = await assessmentsDexieRepository.bulkSaveResponses(
    definition.items.map((item, index) => ({
      attemptId: attempt.id,
      assessmentId,
      itemId: item.id,
      responseValue: responseFor(item, index),
      reverseFlagAtTime: item.reverse,
      scoringKeyVersion: definition.scoringKeyVersion,
    }))
  )
  await assessmentsDexieRepository.completeAttempt(
    attempt.id,
    entry.scorer.score({ definition, responses })
  )
  if (options.daysAgo !== undefined) {
    const day = addDaysToDayRef(getPeriodRefsForDate(new Date()).day, -options.daysAgo)
    await backdate('assessmentAttempts', attempt.id, {
      startedAt: isoAt(day, '17:40:00'),
      completedAt: isoAt(day, '17:55:00'),
      updatedAt: isoAt(day, '17:55:00'),
    })
  }
  return attempt
}

// ─── Account + bootstrap ─────────────────────────────────────────────────────

export interface SeedAccount {
  id: string
  username: string
  password: string
  displayName: string
}

/** Create the fixed seed user in the auth DB if it does not exist yet. */
export async function ensureSeedUser(account: SeedAccount): Promise<void> {
  if (await authDexieRepository.getUserById(account.id)) return
  const now = new Date().toISOString()
  const user: User = {
    id: account.id,
    username: account.username,
    passwordHash: await hashPassword(account.password),
    createdAt: now,
    lastLoginAt: now,
    displayName: account.displayName,
  }
  try {
    await authDexieRepository.createUser(user)
  } catch (error) {
    // Two tabs can race here; the fixed id already existing is the success case.
    if (!(await authDexieRepository.getUserById(account.id))) throw error
  }
}

export interface SeedRunnerConfig {
  account: SeedAccount
  dbName: string
  /** localStorage key of the "already seeded" marker. */
  markerKey: string
  /** Current marker value; a mismatch on bootstrap triggers a re-seed. */
  markerValue: () => string
  seed: () => Promise<void>
  log: { prefix: string; resetting: string; ready: string }
}

export interface RunSeedOptions {
  /** Reload after seeding so Pinia stores drop stale state (default true). */
  reload?: boolean
}

/**
 * Reset-then-seed runner plus the bootstrap used from main.ts BEFORE
 * `app.use(router)`: the router's initial navigation runs the one-shot
 * auth-store initialize(), so the seed user must already exist for the dev
 * auto-login bypass.
 */
export function createSeedRunner(config: SeedRunnerConfig) {
  const log = (message: string) => console.log(`${config.log.prefix} ${message}`)

  /** Always deletes the DB first, so re-runs never duplicate. */
  async function runSeed(options: RunSeedOptions = {}): Promise<void> {
    log(config.log.resetting)
    await ensureSeedUser(config.account)
    await disconnectUserDatabase()
    await Dexie.delete(config.dbName)
    await connectUserDatabase(config.account.id)

    await config.seed()

    invalidatePlanningQueryCache()
    window.localStorage.setItem(config.markerKey, config.markerValue())
    log(config.log.ready)
    if (options.reload !== false) window.location.reload()
  }

  /** Ensure the user and the connection; seed when the marker is missing or stale. */
  async function bootstrap(): Promise<void> {
    await ensureSeedUser(config.account)
    await connectUserDatabase(config.account.id)
    if (window.localStorage.getItem(config.markerKey) !== config.markerValue()) {
      await runSeed({ reload: false })
    }
  }

  return { runSeed, bootstrap }
}
