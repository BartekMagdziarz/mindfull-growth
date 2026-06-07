/**
 * Deterministic per-ISO-period (week/month) digests for the profile build
 * (Pillar 3a). Each digest is a compact markdown block — emotion quadrant
 * distribution + top emotions, journal counts/top-people/contexts/word-count/
 * leads, exercise counts — that stands in for a whole period of raw records so
 * older history survives as aggregates instead of being dropped to fit the
 * budget. Cached in `profilePeriodSummaries`, invalidated by a content hash over
 * the period's records (+ the enabled diary-type mask).
 *
 * Deliberately reads WHOLE periods from the stores by date range (ignores
 * scope filters/includedObjectIds) so the `[periodRef+kind]` cache is
 * scope-independent — EXCEPT the enabled diary-type mask, which gates which
 * sources (and verbatim journal leads) appear and is folded into the hash.
 *
 * Kept off `reflectionDataQueries` (planning/measurement graph): the ~20-line
 * emotion aggregation is reimplemented inline; exercise bundles are passed in.
 */
import type { WeekRef, MonthRef } from '@/domain/period'
import { getPeriodBounds, getPeriodRefsForDate, getPreviousPeriod } from '@/utils/periods'
import { getQuadrant, type Quadrant } from '@/domain/emotion'
import { getDisplayTitle, type JournalEntry } from '@/domain/journal'
import type { EmotionLog } from '@/domain/emotionLog'
import { cyrb53 } from '@/utils/stableHash'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import { profilePeriodSummaryDexieRepository } from '@/repositories/profilePeriodSummaryDexieRepository'
import type {
  ProfilePeriodSummary,
  ProfilePeriodSummaryKind,
  ProfilePayloadSummary,
} from '@/domain/profilePeriodSummary'
import type { ExerciseSessionBundle } from '@/services/reflectionDataQueries'

/** Bump to invalidate every cached digest when the markdown shape changes. */
const DIGEST_FORMAT_VERSION = 'v1'

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS
/** Last N ISO weeks stay raw (Tier 0). */
export const RAW_TIER_WEEKS = 8
/** Weeks 9..WEEKLY_TIER_WEEKS get weekly digests; older get monthly. */
export const WEEKLY_TIER_WEEKS = 26

export interface EnabledDiaryTypes {
  journal: boolean
  emotionLogs: boolean
  exerciseSessions: boolean
}

interface DigestContext {
  enabled: EnabledDiaryTypes
  /** Exercise bundles for the whole summarized span (bucketed per-period here). */
  exerciseBundles: ExerciseSessionBundle[]
}

interface PeriodRecords {
  journal: JournalEntry[]
  logs: EmotionLog[]
  exercises: ExerciseSessionBundle[]
}

const QUAD_CODE: Record<Quadrant, string> = {
  'high-energy-high-pleasantness': 'HE-HP',
  'high-energy-low-pleasantness': 'HE-LP',
  'low-energy-high-pleasantness': 'LE-HP',
  'low-energy-low-pleasantness': 'LE-LP',
}

function dayBoundsIso(periodRef: WeekRef | MonthRef): { startIso: string; endIso: string } {
  const b = getPeriodBounds(periodRef)
  return {
    startIso: `${b.start}T00:00:00.000Z`,
    endIso: `${b.end}T23:59:59.999Z`,
  }
}

function countWords(text: string): number {
  const t = text.trim()
  return t.length === 0 ? 0 : t.split(/\s+/).length
}

function topN(
  ids: string[],
  resolve: (id: string) => string | undefined,
  n: number,
): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1)
  return [...counts.entries()]
    .map(([id, count]) => ({ name: resolve(id), count }))
    .filter((x): x is { name: string; count: number } => typeof x.name === 'string')
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

function collectPeriodRecords(periodRef: WeekRef | MonthRef, ctx: DigestContext): PeriodRecords {
  const { startIso, endIso } = dayBoundsIso(periodRef)
  const inRange = (iso: string) => iso >= startIso && iso <= endIso
  const journal = ctx.enabled.journal
    ? useJournalStore().sortedEntries.filter((e) => inRange(e.createdAt))
    : []
  const logs = ctx.enabled.emotionLogs
    ? useEmotionLogStore().sortedLogs.filter((l) => inRange(l.createdAt))
    : []
  const exercises = ctx.enabled.exerciseSessions
    ? ctx.exerciseBundles.filter((b) => inRange(b.createdAt))
    : []
  return { journal, logs, exercises }
}

function recordCountOf(records: PeriodRecords): number {
  return records.journal.length + records.logs.length + records.exercises.length
}

function computeInputHash(
  periodRef: string,
  kind: ProfilePeriodSummaryKind,
  enabled: EnabledDiaryTypes,
  records: PeriodRecords,
): string {
  const parts = [
    ...records.journal.map((e) => `j:${e.id}:${e.updatedAt}`),
    ...records.logs.map((l) => `e:${l.id}:${l.updatedAt}`),
    ...records.exercises.map((x) => {
      const u = typeof x.raw?.updatedAt === 'string' ? x.raw.updatedAt : x.createdAt
      return `x:${x.id}:${u}`
    }),
  ].sort()
  const mask = `${enabled.journal ? 1 : 0}${enabled.emotionLogs ? 1 : 0}${enabled.exerciseSessions ? 1 : 0}`
  return cyrb53([DIGEST_FORMAT_VERSION, kind, periodRef, mask, ...parts].join('|'))
}

/**
 * Render one period's deterministic digest, or `null` if it has no activity for
 * the enabled diary types. Pure given the stores' contents.
 */
export function buildPeriodDigestContent(
  periodRef: WeekRef | MonthRef,
  tier: 1 | 2,
  records: PeriodRecords,
  enabled: EnabledDiaryTypes,
): string | null {
  const b = getPeriodBounds(periodRef)
  const lines: string[] = [`### ${tier === 1 ? 'Week' : 'Month'} ${periodRef} (${b.start} – ${b.end})`]
  let hasContent = false

  if (enabled.journal && records.journal.length > 0) {
    hasContent = true
    const tagStore = useTagStore()
    const n = records.journal.length
    const words = records.journal.reduce((s, e) => s + countWords(e.body ?? ''), 0)
    const people = topN(
      records.journal.flatMap((e) => e.peopleTagIds ?? []),
      (id) => tagStore.getPeopleTagById(id)?.name,
      5,
    )
    const contexts = topN(
      records.journal.flatMap((e) => e.contextTagIds ?? []),
      (id) => tagStore.getContextTagById(id)?.name,
      5,
    )
    let line = `Journal: ${n} ${n === 1 ? 'entry' : 'entries'}, ~${words} words.`
    if (people.length) line += ` People: ${people.map((p) => p.name).join(', ')}.`
    if (contexts.length) line += ` Contexts: ${contexts.map((c) => c.name).join(', ')}.`
    lines.push(line)
    // sortedEntries is newest-first → leads are the most recent entries.
    const leadCap = tier === 1 ? 2 : 5
    for (const e of records.journal.slice(0, leadCap)) {
      const title = getDisplayTitle(e)
      if (title) lines.push(`  - ${title} (${e.createdAt.slice(0, 10)})`)
    }
  }

  if (enabled.emotionLogs && records.logs.length > 0) {
    hasContent = true
    const emotionStore = useEmotionStore()
    const emotionIds = records.logs.flatMap((l) => l.emotionIds ?? [])
    const top = topN(emotionIds, (id) => emotionStore.getEmotionById(id)?.name, 5)
    const quad: Record<Quadrant, number> = {
      'high-energy-high-pleasantness': 0,
      'high-energy-low-pleasantness': 0,
      'low-energy-high-pleasantness': 0,
      'low-energy-low-pleasantness': 0,
    }
    for (const id of emotionIds) {
      const em = emotionStore.getEmotionById(id)
      if (em) quad[getQuadrant(em)]++
    }
    let line = `Emotions: ${records.logs.length} logs.`
    if (top.length) line += ` Top: ${top.map((t) => `${t.name} ${t.count}`).join(', ')}.`
    line +=
      ` Quadrants: ${QUAD_CODE['high-energy-high-pleasantness']} ${quad['high-energy-high-pleasantness']}` +
      ` / ${QUAD_CODE['high-energy-low-pleasantness']} ${quad['high-energy-low-pleasantness']}` +
      ` / ${QUAD_CODE['low-energy-high-pleasantness']} ${quad['low-energy-high-pleasantness']}` +
      ` / ${QUAD_CODE['low-energy-low-pleasantness']} ${quad['low-energy-low-pleasantness']}.`
    lines.push(line)
  }

  if (enabled.exerciseSessions && records.exercises.length > 0) {
    hasContent = true
    const byType = new Map<string, number>()
    for (const x of records.exercises) byType.set(x.type, (byType.get(x.type) ?? 0) + 1)
    const typeStr = [...byType.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([t, c]) => `${t} ${c}`)
      .join(', ')
    lines.push(`Exercises: ${records.exercises.length} — ${typeStr}.`)
  }

  return hasContent ? lines.join('\n') : null
}

/**
 * Get a period's digest, using the cache when the period's records are unchanged.
 * Cache reads/writes are best-effort — a cache failure never breaks the build.
 * Returns `null` for an empty period (caller skips it).
 */
export async function getPeriodDigest(
  periodRef: WeekRef | MonthRef,
  kind: ProfilePeriodSummaryKind,
  tier: 1 | 2,
  ctx: DigestContext,
): Promise<ProfilePeriodSummary | null> {
  const records = collectPeriodRecords(periodRef, ctx)
  if (recordCountOf(records) === 0) return null

  const inputHash = computeInputHash(periodRef, kind, ctx.enabled, records)

  try {
    const cached = await profilePeriodSummaryDexieRepository.getByPeriod(periodRef, kind)
    if (cached && cached.inputHash === inputHash) return cached
  } catch {
    // cache read failed — fall through and recompute
  }

  const content = buildPeriodDigestContent(periodRef, tier, records, ctx.enabled)
  if (content === null) return null

  const payload = {
    periodRef,
    kind,
    tier,
    content,
    inputHash,
    recordCount: recordCountOf(records),
  }
  try {
    return await profilePeriodSummaryDexieRepository.upsert(payload)
  } catch {
    // Best-effort cache: still return the freshly-computed digest for this build.
    return { id: '', createdAt: new Date().toISOString(), ...payload }
  }
}

function weekStartMs(ms: number): number {
  const ref = getPeriodRefsForDate(new Date(ms).toISOString()).week
  return Date.parse(`${getPeriodBounds(ref).start}T00:00:00.000Z`)
}

/**
 * ISO timestamp of the start of the raw-tier window: diary records at or after
 * this stay raw (Tier 0); older ones are summarized. Snapped to an ISO-week
 * start so the boundary doesn't drift between preview and build.
 */
export function rawTierCutoffIso(nowMs: number): string {
  return new Date(weekStartMs(nowMs - RAW_TIER_WEEKS * WEEK_MS)).toISOString()
}

/**
 * Build deterministic digests for every in-scope period older than the raw
 * window: ISO weeks for weeks 9–26, ISO months for 27wk+. Newest period first.
 * `exerciseBundles` should cover the summarized span (bucketed per-period here).
 */
export async function buildSummarizedHistory(args: {
  scopeStartIso: string
  scopeEndIso: string
  nowMs: number
  enabled: EnabledDiaryTypes
  exerciseBundles: ExerciseSessionBundle[]
}): Promise<ProfilePayloadSummary[]> {
  const { scopeStartIso, scopeEndIso, nowMs, enabled, exerciseBundles } = args
  const rawCutoffMs = weekStartMs(nowMs - RAW_TIER_WEEKS * WEEK_MS)
  const weeklyCutoffMs = weekStartMs(nowMs - WEEKLY_TIER_WEEKS * WEEK_MS)
  const scopeStartMs = Date.parse(scopeStartIso)
  const scopeEndMs = Date.parse(scopeEndIso)

  // Nothing in scope is old enough to summarize.
  if (Math.min(scopeEndMs, rawCutoffMs) <= scopeStartMs) return []

  const ctx: DigestContext = { enabled, exerciseBundles }
  const out: ProfilePayloadSummary[] = []
  let guard = 0

  const push = async (
    ref: WeekRef | MonthRef,
    tier: 1 | 2,
    endMs: number,
  ): Promise<void> => {
    const summary = await getPeriodDigest(ref, 'deterministic', tier, ctx)
    if (summary && summary.recordCount > 0) {
      out.push({ periodRef: ref, periodEndIso: new Date(endMs).toISOString(), content: summary.content })
    }
  }

  // Weekly tier: [max(scopeStart, weeklyCutoff), rawCutoff), newest first.
  // The ISO week the raw cutoff snaps to is RAW-only; start digests at the week
  // strictly before it, in ref-space. Deriving the start from `rawCutoffMs - 1`
  // (an instant) re-buckets onto the boundary week itself in non-UTC zones (the
  // user is UTC+1/+2), so its records showed up in BOTH raw and a digest.
  const rawBoundaryWeek = getPeriodRefsForDate(new Date(rawCutoffMs).toISOString()).week
  let weekRef = getPreviousPeriod(rawBoundaryWeek) as WeekRef
  while (guard++ < 600) {
    const b = getPeriodBounds(weekRef)
    const startMs = Date.parse(`${b.start}T00:00:00.000Z`)
    const endMs = Date.parse(`${b.end}T23:59:59.999Z`)
    if (endMs < scopeStartMs || startMs < weeklyCutoffMs) break
    await push(weekRef, 1, endMs)
    weekRef = getPreviousPeriod(weekRef) as WeekRef
  }

  // Monthly tier: months before weeklyCutoff, overlapping scope, newest first.
  // TODO(3b/3c): the weekly↔monthly handoff (a month straddling the 26-week
  // cutoff) and the sub-week UTC-seam (a record on the boundary day whose local
  // week differs from its UTC instant) can still double-count or skip a sliver.
  // Both need record-level partitioning (clamp digests to the cutoff instant),
  // which lands with the tiering rework — narrow + rare now that #2 gates tiering.
  let monthRef = getPeriodRefsForDate(new Date(weeklyCutoffMs - 1).toISOString()).month
  while (guard++ < 1200) {
    const b = getPeriodBounds(monthRef)
    const endMs = Date.parse(`${b.end}T23:59:59.999Z`)
    if (endMs < scopeStartMs) break
    await push(monthRef, 2, endMs)
    monthRef = getPreviousPeriod(monthRef) as MonthRef
  }

  return out
}
