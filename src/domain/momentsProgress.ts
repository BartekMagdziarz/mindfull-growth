/**
 * Problem paths — progress read from Momenty (shame plan §2.3; anger and
 * anxiety read the same pictures through their reaction families, see
 * `momentFamilies.ts`).
 *
 * Three pictures, each with a reading rule written next to it in the UI:
 * 1. which part (or reaction) took the wheel, week by week (stacked counts
 *    per key, plus the "unlogged" estimate the weekly reflection asks for);
 * 2. "a response instead of the reaction": the share of the week's moments
 *    where the user did something other than nothing;
 * 3. "when I notice": the share noticed as it happened or a moment later,
 *    compared between the first and the last weeks.
 *
 * Plus the two-voice diary (critic logged vs kind voice logged) and the
 * collection of the user's own compassionate sentences ("Moje zdania").
 * Pure functions over micro entries — views, the weekly reflection and
 * tests share them. A week without moments is a "quiet week", never an
 * error state.
 */

import type { MicroExerciseEntry } from '@/domain/microExercises'
import {
  momentFamily,
  reactionOf,
  responsesOf,
  strengthOf,
  summaryKeys,
  type MomentFamilyConfig,
  type MomentFamilyKind,
} from '@/domain/momentFamilies'
import { hadMoment, isMoment, momentDayRef } from '@/domain/moments'
import type { WeekRef } from '@/domain/period'
import { getPeriodBounds, getPreviousPeriod } from '@/utils/periods'

export type ShamePartKey = 'withdraw' | 'attackSelf' | 'attackOthers' | 'avoid' | 'none'
export const SHAME_PART_KEYS: readonly ShamePartKey[] = [
  'withdraw',
  'attackSelf',
  'attackOthers',
  'avoid',
  'none',
]
/** A reaction key of any family (`ShamePartKey` for the shame path). */
export type ReactionKey = string

export type NoticedKey = 'during' | 'soon' | 'hours' | 'later' | 'unknown'
export const NOTICED_KEYS: readonly NoticedKey[] = ['during', 'soon', 'hours', 'later', 'unknown']

/**
 * The reflection's "moments you did not log" answer, as the representative
 * count it adds to the week's bar (shown as an outline, never as data).
 */
export const UNLOGGED_BUCKETS: Readonly<Record<string, number>> = {
  none: 0,
  few: 2,
  several: 4,
  many: 6,
}

export interface MomentsWeekStats {
  weekRef: WeekRef
  /** Entries with a moment (calm-day notes excluded). */
  total: number
  /** Estimate from the weekly reflection (representative count), absent when not asked. */
  unlogged?: number
  /** Which family the stats were read with. */
  kind: MomentFamilyKind
  /** Counts per reaction key of the family (`MOMENT_FAMILIES[kind].keys`). */
  byPart: Record<ReactionKey, number>
  /** "Jak mocno" (1–5) summed per key, with how many moments carried a rating (v2 entries have none). */
  strength: Record<ReactionKey, { sum: number; rated: number }>
  /** Moments where `response` holds anything other than "nothing". */
  responded: number
  noticed: Record<NoticedKey, number>
  /** Two-voice diary: how often each side got written down. */
  criticLogged: number
  kindVoiceLogged: number
  /** No moments this week — "cichy tydzień". */
  quiet: boolean
}

function emptyStats(weekRef: WeekRef, config: MomentFamilyConfig): MomentsWeekStats {
  return {
    weekRef,
    kind: config.kind,
    total: 0,
    byPart: Object.fromEntries(config.keys.map(key => [key, 0])),
    strength: Object.fromEntries(config.keys.map(key => [key, { sum: 0, rated: 0 }])),
    responded: 0,
    noticed: { during: 0, soon: 0, hours: 0, later: 0, unknown: 0 },
    criticLogged: 0,
    kindVoiceLogged: 0,
    quiet: true,
  }
}

/** `count` consecutive weeks ending at `last`, oldest first. */
export function weekRefsEndingAt(last: WeekRef, count: number): WeekRef[] {
  const weeks: WeekRef[] = [last]
  while (weeks.length < count) {
    weeks.unshift(getPreviousPeriod(weeks[0]!) as WeekRef)
  }
  return weeks
}

function noticedOf(entry: MicroExerciseEntry): NoticedKey {
  const value = entry.responses.noticed
  return typeof value === 'string' && (NOTICED_KEYS as readonly string[]).includes(value)
    ? (value as NoticedKey)
    : 'unknown'
}

/** Anything other than "nothing" counts — a late attempt is still an attempt. */
export function hasResponse(
  entry: MicroExerciseEntry,
  config: MomentFamilyConfig = momentFamily(entry.responses.kind)
): boolean {
  return responsesOf(entry.responses, config).some(item => item !== 'nothing')
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Week-by-week statistics of one kind's moments in `entries` for the given
 * weeks (oldest first). `unlogged` maps a week to the reflection's estimate;
 * `kind` picks the family (the shame compass by default).
 */
export function momentsProgress(
  entries: readonly MicroExerciseEntry[],
  weeks: readonly WeekRef[],
  unlogged: Partial<Record<WeekRef, number>> = {},
  kind: MomentFamilyKind = 'shame'
): MomentsWeekStats[] {
  const config = momentFamily(kind)
  const moments = entries.filter(entry => isMoment(entry, kind) && hadMoment(entry))
  return weeks.map(weekRef => {
    const stats = emptyStats(weekRef, config)
    const { start, end } = getPeriodBounds(weekRef)
    for (const entry of moments) {
      const day = momentDayRef(entry)
      if (day < start || day > end) continue
      stats.total += 1
      const part = reactionOf(entry.responses, config)
      if (part) {
        stats.byPart[part]! += 1
        const strength = strengthOf(entry.responses, config)
        if (strength !== undefined) {
          stats.strength[part]!.sum += strength
          stats.strength[part]!.rated += 1
        }
      }
      if (hasResponse(entry, config)) stats.responded += 1
      stats.noticed[noticedOf(entry)] += 1
      if (hasText(entry.responses.criticSaid)) stats.criticLogged += 1
      if (hasText(entry.responses.kindVoice)) stats.kindVoiceLogged += 1
    }
    const estimate = unlogged[weekRef]
    if (estimate !== undefined) stats.unlogged = estimate
    stats.quiet = stats.total === 0
    return stats
  })
}

export interface PartSummary {
  part: ReactionKey
  count: number
  /** Share (0–1) of the moments in the given weeks that this part took; 0 without moments. */
  share: number
  /** Mean "jak mocno" 1–5 over the rated moments of this part; null when none were rated. */
  meanStrength: number | null
}

/**
 * "Kto przejmuje ster" summed over the given weeks: how often each part took
 * the wheel and how strongly it did (the moment's own 1–5 rating). Order is
 * the compass order; the self key comes last and is the pattern the path
 * works toward.
 */
export function partSummary(stats: readonly MomentsWeekStats[]): PartSummary[] {
  const total = stats.reduce((sum, week) => sum + week.total, 0)
  const config = momentFamily(stats[0]?.kind)
  return summaryKeys(config).map(part => {
    let count = 0
    let sum = 0
    let rated = 0
    for (const week of stats) {
      count += week.byPart[part] ?? 0
      sum += week.strength[part]?.sum ?? 0
      rated += week.strength[part]?.rated ?? 0
    }
    return {
      part,
      count,
      share: total === 0 ? 0 : count / total,
      meanStrength: rated === 0 ? null : Math.round((sum / rated) * 10) / 10,
    }
  })
}

/** Share (0–1) of moments noticed as they happened or a moment later; null without data. */
export function noticedEarlyShare(stats: readonly MomentsWeekStats[]): number | null {
  let early = 0
  let known = 0
  for (const week of stats) {
    early += week.noticed.during + week.noticed.soon
    known += week.total - week.noticed.unknown
  }
  return known === 0 ? null : early / known
}

/**
 * "Kiedy zauważam" compared between the first and the last `span` weeks
 * that have moments. Either side is null when it has no data.
 */
export function noticedShift(
  stats: readonly MomentsWeekStats[],
  span = 2
): { early: number | null; late: number | null } {
  const withMoments = stats.filter(week => week.total > 0)
  if (withMoments.length === 0) return { early: null, late: null }
  const first = withMoments.slice(0, span)
  const last = withMoments.slice(-span)
  return { early: noticedEarlyShare(first), late: noticedEarlyShare(last) }
}

/** Share (0–1) of moments with a response across the given weeks; null without moments. */
export function respondedShare(stats: readonly MomentsWeekStats[]): number | null {
  const total = stats.reduce((sum, week) => sum + week.total, 0)
  if (total === 0) return null
  return stats.reduce((sum, week) => sum + week.responded, 0) / total
}

// ── "Moje zdania" ────────────────────────────────────────────────────

export type OwnSentenceSource =
  | 'image'
  | 'self'
  | 'response'
  | 'unblend'
  | 'moment'
  | 'defender'
  | 'request'
  | 'return'

export interface OwnSentence {
  text: string
  source: OwnSentenceSource
  createdAt: string
  entryId: string
}

interface SentenceSource {
  slug: string
  step: string
  source: OwnSentenceSource
  kind?: MomentFamilyKind
}
/** Per path kind: where the user's own sentences come from. The anxiety path has none ("Moje słowa" is not shown). */
const SENTENCE_SOURCES: Readonly<Record<MomentFamilyKind, readonly SentenceSource[]>> = {
  shame: [
    { slug: 'compassionate-image', step: 'message', source: 'image' },
    { slug: 'compassionate-self', step: 'toPart', source: 'self' },
    { slug: 'shame-response', step: 'sentence', source: 'response' },
    { slug: 'shame-response', step: 'unblendSentence', source: 'unblend' },
    { slug: 'defender-voice', step: 'mySentence', source: 'defender' },
    { slug: 'moments', step: 'kindVoice', source: 'moment', kind: 'shame' },
  ],
  // "Moje słowa": the request or boundary and the promise to return to the conversation.
  anger: [
    { slug: 'need-behind-anger', step: 'request', source: 'request' },
    { slug: 'pause-plan', step: 'returnPromise', source: 'return' },
  ],
  anxiety: [],
}

function normalizeSentence(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[„”"']/g, '')
    .replace(/[.!…\s]+$/u, '')
    .toLocaleLowerCase()
}

/**
 * The user's own compassionate sentences, newest first, de-duplicated by
 * text: what the image says, what the compassionate self says to the
 * ashamed part, the shame-response sentence and unblending sentence, the
 * defending sentence, and every kind voice written in a moment.
 */
export function collectOwnSentences(
  entries: readonly MicroExerciseEntry[],
  limit = Infinity,
  kind: MomentFamilyKind = 'shame'
): OwnSentence[] {
  const seen = new Set<string>()
  const sentences: OwnSentence[] = []
  const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  for (const entry of sorted) {
    for (const rule of SENTENCE_SOURCES[kind]) {
      if (entry.exerciseSlug !== rule.slug) continue
      if (rule.kind && entry.responses.kind !== rule.kind) continue
      const value = entry.responses[rule.step]
      if (typeof value !== 'string') continue
      const text = value.trim()
      if (!text) continue
      const key = normalizeSentence(text)
      if (seen.has(key)) continue
      seen.add(key)
      sentences.push({ text, source: rule.source, createdAt: entry.createdAt, entryId: entry.id })
    }
  }
  return sentences.slice(0, limit)
}

// ── "Czy to pomogło" ─────────────────────────────────────────────────

export interface PracticeHelpfulness {
  count: number
  /** Mean of the 1–5 answers, rounded to one decimal. */
  mean: number
}

/** Per exercise slug: how often "czy to pomogło" was answered and the mean. */
export function practiceHelpfulness(
  entries: readonly MicroExerciseEntry[]
): Record<string, PracticeHelpfulness> {
  const sums: Record<string, { count: number; sum: number }> = {}
  for (const entry of entries) {
    const value = entry.responses.helpful
    if (typeof value !== 'number') continue
    const bucket = (sums[entry.exerciseSlug] ??= { count: 0, sum: 0 })
    bucket.count += 1
    bucket.sum += value
  }
  return Object.fromEntries(
    Object.entries(sums).map(([slug, { count, sum }]) => [
      slug,
      { count, mean: Math.round((sum / count) * 10) / 10 },
    ])
  )
}

/** Distinct local days in `weekRef` with a completion of any of `slugs`. */
export function practiceDaysInWeek(
  completions: ReadonlyArray<{ exerciseSlug: string; dayRef: string }>,
  weekRef: WeekRef,
  slugs: readonly string[]
): number {
  const { start, end } = getPeriodBounds(weekRef)
  const wanted = new Set(slugs)
  const days = new Set<string>()
  for (const completion of completions) {
    if (!wanted.has(completion.exerciseSlug)) continue
    if (completion.dayRef < start || completion.dayRef > end) continue
    days.add(completion.dayRef)
  }
  return days.size
}
