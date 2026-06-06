/**
 * Profile LLM assists — prompt module, payload assembly, and response parser
 * used by the Psychological Profile build wizard (Epic 11 Story 4).
 *
 * Three responsibilities:
 *   1. `getProfilePrompts(locale, gender)` — returns a localized system
 *      prompt plus the list of section headers the LLM should emit.
 *   2. `buildProfilePayload(input, locale)` — composes the free-text user
 *      message containing scope metadata plus every source body the AI
 *      should read. No truncation is performed here.
 *   3. `parseProfileResponse(raw, promptModule)` — splits the markdown
 *      response on `## Header` boundaries and maps each section to a known
 *      `ProfileSectionId` (falling back to `extras` for unknown text).
 */

import type { GrammaticalGender, LocaleId } from '@/services/locale.service'
import { NUM_CTX_CHARS_PER_TOKEN } from '@/services/llmService'
import {
  PROFILE_SECTION_IDS,
  createEmptySections,
  type ProfileAgeBucket,
  type ProfileDataType,
  type ProfileDateRange,
  type ProfileEstimateBreakdown,
  type ProfileSectionId,
  type ProfileSections,
} from '@/domain/userProfile'

// ---------------------------------------------------------------------------
// Prompt module
// ---------------------------------------------------------------------------

/**
 * Pair of (canonical section id, localised header string) expected to appear
 * as an `## H2` in the LLM response.
 */
export interface ProfileSectionHeader {
  id: ProfileSectionId
  header: string
}

export interface ProfilePromptModule {
  systemPrompt: string
  sectionHeaders: ProfileSectionHeader[]
  locale: LocaleId
  gender: GrammaticalGender
}

const EN_HEADERS: Record<ProfileSectionId, string> = {
  summary: 'Summary',
  values: 'Values and guiding principles',
  emotionalPatterns: 'Emotional patterns',
  strengths: 'Strengths',
  challenges: 'Challenges and growth edges',
  relationships: 'Relationships and social patterns',
  themes: 'Themes and recurring topics',
  recentArc: 'Recent arc',
  suggestedDirections: 'Suggested directions',
}

const PL_HEADERS: Record<ProfileSectionId, string> = {
  summary: 'Podsumowanie',
  values: 'Wartości i zasady',
  emotionalPatterns: 'Wzorce emocjonalne',
  strengths: 'Mocne strony',
  challenges: 'Wyzwania i obszary rozwoju',
  relationships: 'Relacje i wzorce społeczne',
  themes: 'Tematy i powtarzające się wątki',
  recentArc: 'Ostatni okres',
  suggestedDirections: 'Sugerowane kierunki',
}

function buildHeaderList(locale: LocaleId): ProfileSectionHeader[] {
  const table = locale === 'pl' ? PL_HEADERS : EN_HEADERS
  return PROFILE_SECTION_IDS.map((id) => ({ id, header: table[id] }))
}

function enSystemPrompt(headers: ProfileSectionHeader[]): string {
  const list = headers.map((h) => `   - ## ${h.header}`).join('\n')
  return [
    'You are a careful, psychologically literate observer. You are reading a person\'s own notes about their life — journal entries, emotion logs, reflections, and completed therapy-style exercises.',
    '',
    'Your task is to produce a short, grounded portrait of who this person is *right now*, based only on the data provided. You are writing in the second person ("you") — speaking directly to the person whose data this is.',
    '',
    'Rules:',
    '- Stay close to the data. Quote short fragments where useful; do not invent facts.',
    '- Be specific rather than generic. "You keep returning to questions about work boundaries" is better than "you value work–life balance".',
    '- Be kind but honest. Name recurring patterns, including uncomfortable ones, with compassion.',
    '- Do not diagnose. You are not a clinician. Use descriptive language, not labels.',
    '- Write full sentences, not bullets, unless a short enumeration is clearer.',
    '- Keep the overall length around 1800–3000 words.',
    '',
    `Produce exactly these ${headers.length} sections in this order, each introduced with an H2 heading:`,
    list,
    '',
    'Under each heading, write 2–6 paragraphs. If a section genuinely has no supporting data, say so briefly rather than padding.',
    '',
    'Output plain Markdown only. Do not wrap the response in code fences.',
  ].join('\n')
}

function plSystemPrompt(
  headers: ProfileSectionHeader[],
  gender: GrammaticalGender,
): string {
  const list = headers.map((h) => `   - ## ${h.header}`).join('\n')
  const personalForm =
    gender === 'feminine'
      ? 'Zwracaj się do osoby bezpośrednio w drugiej osobie liczby pojedynczej, w rodzaju żeńskim (np. "zauważyłaś", "wracasz", "byłaś skupiona").'
      : 'Zwracaj się do osoby bezpośrednio w drugiej osobie liczby pojedynczej, w rodzaju męskim (np. "zauważyłeś", "wracasz", "byłeś skupiony").'
  return [
    'Jesteś uważnym, psychologicznie świadomym obserwatorem. Czytasz własne notatki osoby o jej życiu — wpisy z dziennika, zapisy emocji, refleksje oraz ukończone ćwiczenia terapeutyczne.',
    '',
    'Twoim zadaniem jest stworzenie krótkiego, osadzonego w danych portretu tego, kim ta osoba *jest teraz*, wyłącznie na podstawie dostarczonych danych.',
    personalForm,
    '',
    'Zasady:',
    '- Trzymaj się blisko danych. Cytuj krótkie fragmenty tam, gdzie to pomocne; nie zmyślaj faktów.',
    '- Bądź konkretny/a zamiast ogólny/a. "Wracasz do pytań o granice w pracy" jest lepsze niż "cenisz balans".',
    '- Bądź życzliwy/a, ale uczciwy/a. Nazywaj powracające wzorce, w tym niewygodne, ze współczuciem.',
    '- Nie diagnozuj. Nie jesteś klinicystą. Używaj języka opisowego, nie etykiet.',
    '- Pisz pełnymi zdaniami, nie listami, chyba że krótkie wyliczenie jest bardziej czytelne.',
    '- Zachowaj łączną długość około 1800–3000 słów.',
    '',
    `Utwórz dokładnie ${headers.length} sekcji w tej kolejności, każdą wprowadź nagłówkiem H2:`,
    list,
    '',
    'Pod każdym nagłówkiem napisz 2–6 akapitów. Jeśli dana sekcja naprawdę nie ma poparcia w danych, zaznacz to krótko zamiast ją sztucznie wypełniać.',
    '',
    'Odpowiedz czystym Markdownem. Nie zamykaj odpowiedzi w bloku kodu.',
  ].join('\n')
}

/**
 * Builds the prompt module for a given locale and grammatical gender. The
 * returned `sectionHeaders` is also used by `parseProfileResponse` to map
 * raw headings back to canonical section ids.
 */
export function getProfilePrompts(
  locale: LocaleId,
  gender: GrammaticalGender,
): ProfilePromptModule {
  const sectionHeaders = buildHeaderList(locale)
  const systemPrompt =
    locale === 'pl'
      ? plSystemPrompt(sectionHeaders, gender)
      : enSystemPrompt(sectionHeaders)
  return { systemPrompt, sectionHeaders, locale, gender }
}

// ---------------------------------------------------------------------------
// Payload assembly
// ---------------------------------------------------------------------------

export interface ProfilePayloadJournalEntry {
  id: string
  createdAt: string
  title?: string
  body: string
  emotionNames: string[]
  peopleNames: string[]
  contextNames: string[]
  lifeAreaNames: string[]
}

export interface ProfilePayloadEmotionLog {
  id: string
  createdAt: string
  emotionNames: string[]
  note: string
  peopleNames: string[]
  contextNames: string[]
}

export interface ProfilePayloadExerciseSummary {
  id: string
  type: string
  createdAt: string
  summary: string
}

export interface ProfilePayloadWeeklyReflection {
  weekRef: string
  ratings: Record<string, number | null>
  promptResponses: Record<string, string>
  freeformReflection: string
  /** Used only for age-bucket attribution; never rendered into the payload. */
  createdAt?: string
}

export interface ProfilePayloadMonthlyReflection {
  monthRef: string
  ratings: Record<string, number | null>
  promptResponses: Record<string, string>
  freeformReflection: string
  /** Used only for age-bucket attribution; never rendered into the payload. */
  createdAt?: string
}

export interface ProfilePayloadSnapshot {
  snapshot: string
}

export interface ProfilePayloadPlanning extends ProfilePayloadSnapshot {
  /** A bulleted summary of currently active goals / KRs / habits / trackers. */
  snapshot: string
}

export interface ProfilePayloadInput {
  dataTypes: ProfileDataType[]
  dateRange: ProfileDateRange
  journalEntries?: ProfilePayloadJournalEntry[]
  emotionLogs?: ProfilePayloadEmotionLog[]
  exerciseSessions?: ProfilePayloadExerciseSummary[]
  weeklyReflections?: ProfilePayloadWeeklyReflection[]
  monthlyReflections?: ProfilePayloadMonthlyReflection[]
  foundation?: ProfilePayloadSnapshot
  lifeAreas?: ProfilePayloadSnapshot
  planning?: ProfilePayloadPlanning
}

function formatDateRange(range: ProfileDateRange, locale: LocaleId): string {
  if (range.kind === 'custom') {
    return locale === 'pl'
      ? `Zakres: ${range.start ?? '—'} do ${range.end ?? '—'}`
      : `Range: ${range.start ?? '—'} to ${range.end ?? '—'}`
  }
  const label =
    locale === 'pl'
      ? {
          last30: 'Ostatnie 30 dni',
          last90: 'Ostatnie 90 dni',
          last12m: 'Ostatnie 12 miesięcy',
          all: 'Cały okres',
        }[range.preset]
      : {
          last30: 'Last 30 days',
          last90: 'Last 90 days',
          last12m: 'Last 12 months',
          all: 'All time',
        }[range.preset]
  return locale === 'pl' ? `Zakres: ${label}` : `Range: ${label}`
}

function formatList(label: string, items: string[]): string {
  if (items.length === 0) return ''
  return `${label}: ${items.join(', ')}`
}

function formatJournalEntry(e: ProfilePayloadJournalEntry): string {
  const parts: string[] = []
  parts.push(`--- Entry ${e.id} (${e.createdAt})`)
  if (e.title) parts.push(`Title: ${e.title}`)
  const meta = [
    formatList('Emotions', e.emotionNames),
    formatList('People', e.peopleNames),
    formatList('Contexts', e.contextNames),
    formatList('Life areas', e.lifeAreaNames),
  ].filter(Boolean)
  if (meta.length > 0) parts.push(meta.join(' | '))
  parts.push('')
  parts.push(e.body)
  return parts.join('\n')
}

function formatEmotionLog(log: ProfilePayloadEmotionLog): string {
  const parts: string[] = []
  parts.push(`--- Log ${log.id} (${log.createdAt})`)
  const meta = [
    formatList('Emotions', log.emotionNames),
    formatList('People', log.peopleNames),
    formatList('Contexts', log.contextNames),
  ].filter(Boolean)
  if (meta.length > 0) parts.push(meta.join(' | '))
  if (log.note.trim().length > 0) parts.push(log.note)
  return parts.join('\n')
}

function formatExercise(s: ProfilePayloadExerciseSummary): string {
  return `--- ${s.type} (${s.createdAt}, ${s.id})\n${s.summary}`
}

function formatRatings(ratings: Record<string, number | null>): string {
  const entries = Object.entries(ratings)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
  return entries.length > 0 ? `Ratings: ${entries.join(', ')}` : ''
}

function formatPromptResponses(responses: Record<string, string>): string {
  const entries = Object.entries(responses).filter(
    ([, v]) => typeof v === 'string' && v.trim().length > 0,
  )
  if (entries.length === 0) return ''
  return entries.map(([k, v]) => `  - ${k}: ${v}`).join('\n')
}

function formatWeeklyReflection(r: ProfilePayloadWeeklyReflection): string {
  const parts: string[] = [`--- Week ${r.weekRef}`]
  const ratings = formatRatings(r.ratings)
  if (ratings) parts.push(ratings)
  const prompts = formatPromptResponses(r.promptResponses)
  if (prompts) parts.push(`Prompt responses:\n${prompts}`)
  if (r.freeformReflection.trim()) parts.push(`Free-form:\n${r.freeformReflection}`)
  return parts.join('\n')
}

function formatMonthlyReflection(r: ProfilePayloadMonthlyReflection): string {
  const parts: string[] = [`--- Month ${r.monthRef}`]
  const ratings = formatRatings(r.ratings)
  if (ratings) parts.push(ratings)
  const prompts = formatPromptResponses(r.promptResponses)
  if (prompts) parts.push(`Prompt responses:\n${prompts}`)
  if (r.freeformReflection.trim()) parts.push(`Free-form:\n${r.freeformReflection}`)
  return parts.join('\n')
}

/**
 * Assembles the free-text user message for the profile build. Sections with
 * no data are omitted entirely so the prompt stays tight. No truncation.
 */
export function buildProfilePayload(
  input: ProfilePayloadInput,
  locale: LocaleId,
): string {
  const lines: string[] = []

  lines.push('[SCOPE]')
  lines.push(formatDateRange(input.dateRange, locale))
  if (input.dataTypes.length > 0) {
    lines.push(
      (locale === 'pl' ? 'Typy danych: ' : 'Data types: ') +
        input.dataTypes.join(', '),
    )
  }
  lines.push('')

  const enabled = new Set(input.dataTypes)

  if (
    enabled.has('foundation') &&
    input.foundation &&
    input.foundation.snapshot.trim().length > 0
  ) {
    lines.push('[FOUNDATION SNAPSHOT]')
    lines.push(input.foundation.snapshot, '')
  }

  if (enabled.has('journal') && input.journalEntries && input.journalEntries.length > 0) {
    lines.push('[JOURNAL ENTRIES]')
    for (const e of input.journalEntries) lines.push(formatJournalEntry(e), '')
  }

  if (enabled.has('emotionLogs') && input.emotionLogs && input.emotionLogs.length > 0) {
    lines.push('[EMOTION LOGS]')
    for (const l of input.emotionLogs) lines.push(formatEmotionLog(l), '')
  }

  if (
    enabled.has('exerciseSessions') &&
    input.exerciseSessions &&
    input.exerciseSessions.length > 0
  ) {
    lines.push('[EXERCISE SESSIONS]')
    for (const s of input.exerciseSessions) lines.push(formatExercise(s), '')
  }

  if (
    enabled.has('weeklyReflections') &&
    input.weeklyReflections &&
    input.weeklyReflections.length > 0
  ) {
    lines.push('[WEEKLY REFLECTIONS]')
    for (const r of input.weeklyReflections) lines.push(formatWeeklyReflection(r), '')
  }

  if (
    enabled.has('monthlyReflections') &&
    input.monthlyReflections &&
    input.monthlyReflections.length > 0
  ) {
    lines.push('[MONTHLY REFLECTIONS]')
    for (const r of input.monthlyReflections) lines.push(formatMonthlyReflection(r), '')
  }

  if (
    enabled.has('planning') &&
    input.lifeAreas &&
    input.lifeAreas.snapshot.trim().length > 0
  ) {
    lines.push('[LIFE AREAS]')
    lines.push(input.lifeAreas.snapshot, '')
  }

  if (enabled.has('planning') && input.planning && input.planning.snapshot.trim().length > 0) {
    lines.push('[PLANNING SNAPSHOT]')
    lines.push(input.planning.snapshot, '')
  }

  lines.push('[END OF DATA]')
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Token estimation + payload attribution
// ---------------------------------------------------------------------------

/**
 * Estimate tokens from character count using the SAME divisor that sizes the
 * Ollama context window (`NUM_CTX_CHARS_PER_TOKEN`), so the build's pre-flight
 * guard and the wizard preview can't disagree about how big a scope is.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / NUM_CTX_CHARS_PER_TOKEN)
}

/** Bucket a record's ISO `createdAt` into a coarse age band relative to `nowMs`. */
export function ageBucketOf(
  createdAt: string | undefined,
  nowMs: number,
): ProfileAgeBucket {
  if (!createdAt) return 'undated'
  const t = Date.parse(createdAt)
  if (Number.isNaN(t)) return 'undated'
  const days = (nowMs - t) / 86_400_000
  if (days <= 30) return '0-30d'
  if (days <= 90) return '31-90d'
  if (days <= 365) return '91-365d'
  return '365d+'
}

export interface AssembledPayloadBreakdown extends ProfileEstimateBreakdown {
  /** Full payload text — byte-identical to `buildProfilePayload(input, locale)`. */
  text: string
}

/**
 * Pure assembly: produce the canonical payload text AND attribute its estimated
 * token cost per data type and per record-age. `text` comes straight from
 * `buildProfilePayload` (so it stays byte-identical to what the build sends);
 * the breakdowns re-run the same per-record formatters to attribute cost.
 * Bracket scaffolding ([SCOPE] / section markers / [END OF DATA]) is uncounted
 * in the breakdowns — `approxTokens` (the whole text) is the source-of-truth headline.
 */
export function assembleFromInput(
  input: ProfilePayloadInput,
  locale: LocaleId,
  nowMs: number,
): AssembledPayloadBreakdown {
  const text = buildProfilePayload(input, locale)
  const enabled = new Set(input.dataTypes)

  const tokensByType: Partial<Record<ProfileDataType, number>> = {}
  const tokensByAge: Record<ProfileAgeBucket, number> = {
    '0-30d': 0,
    '31-90d': 0,
    '91-365d': 0,
    '365d+': 0,
    undated: 0,
  }

  const add = (
    type: ProfileDataType,
    createdAt: string | undefined,
    formatted: string,
  ): void => {
    const cost = estimateTokens(formatted)
    if (cost === 0) return
    tokensByType[type] = (tokensByType[type] ?? 0) + cost
    tokensByAge[ageBucketOf(createdAt, nowMs)] += cost
  }

  // Mirrors the section gating in `buildProfilePayload` so the attribution
  // covers exactly the records that appear in `text`.
  if (enabled.has('foundation') && input.foundation?.snapshot.trim()) {
    add('foundation', undefined, input.foundation.snapshot)
  }
  if (enabled.has('journal') && input.journalEntries) {
    for (const e of input.journalEntries) add('journal', e.createdAt, formatJournalEntry(e))
  }
  if (enabled.has('emotionLogs') && input.emotionLogs) {
    for (const l of input.emotionLogs) add('emotionLogs', l.createdAt, formatEmotionLog(l))
  }
  if (enabled.has('exerciseSessions') && input.exerciseSessions) {
    for (const s of input.exerciseSessions) add('exerciseSessions', s.createdAt, formatExercise(s))
  }
  if (enabled.has('weeklyReflections') && input.weeklyReflections) {
    for (const r of input.weeklyReflections) {
      add('weeklyReflections', r.createdAt, formatWeeklyReflection(r))
    }
  }
  if (enabled.has('monthlyReflections') && input.monthlyReflections) {
    for (const r of input.monthlyReflections) {
      add('monthlyReflections', r.createdAt, formatMonthlyReflection(r))
    }
  }
  // [LIFE AREAS] and [PLANNING SNAPSHOT] are both gated by the 'planning' type.
  if (enabled.has('planning')) {
    if (input.lifeAreas?.snapshot.trim()) add('planning', undefined, input.lifeAreas.snapshot)
    if (input.planning?.snapshot.trim()) add('planning', undefined, input.planning.snapshot)
  }

  return {
    text,
    approxTokens: estimateTokens(text),
    tokensByType,
    tokensByAge,
  }
}

// ---------------------------------------------------------------------------
// Budget-aware selection (Pillar 2)
// ---------------------------------------------------------------------------

export interface BudgetSelectionResult {
  /** Trimmed copy of the input — newest records kept, oldest dropped to fit. */
  input: ProfilePayloadInput
  /** Per-type counts of records removed (zero entries pruned). */
  droppedByType: Partial<Record<ProfileDataType, number>>
  /** Token cost of the always-included snapshot blocks. */
  mandatoryTokens: number
  /** false ⟺ the mandatory snapshots alone exceed the budget. */
  fits: boolean
}

// Each record is rendered as `(formatted, '')` then `join('\n')`, so it costs
// its own length plus two newlines. Slightly conservative vs the attribution
// estimate (which omits separators) — guarantees the reassembled payload fits.
const PER_RECORD_SCAFFOLD_CHARS = 2

function recordTokens(formatted: string): number {
  return Math.ceil(
    (formatted.length + PER_RECORD_SCAFFOLD_CHARS) / NUM_CTX_CHARS_PER_TOKEN,
  )
}

function parsedTs(createdAt: string | undefined): number {
  if (!createdAt) return -Infinity
  const t = Date.parse(createdAt)
  return Number.isNaN(t) ? -Infinity : t
}

interface Costed<T> {
  record: T
  cost: number
  ts: number
}

/** Sort newest-first; undated/unparseable sort oldest. Stable on ties. */
function costSortDesc<T>(records: T[], cost: (r: T) => number, when: (r: T) => string | undefined): Costed<T>[] {
  return records
    .map((record) => ({ record, cost: cost(record), ts: parsedTs(when(record)) }))
    .sort((a, b) => (a.ts === b.ts ? 0 : b.ts - a.ts))
}

/** Greedily keep the newest contiguous prefix that fits `cap` (strict prefix). */
function fillByCost<T>(costed: Costed<T>[], cap: number): { kept: T[]; used: number } {
  const kept: T[] = []
  let used = 0
  for (const c of costed) {
    if (used + c.cost > cap) break
    kept.push(c.record)
    used += c.cost
  }
  return { kept, used }
}

/**
 * Fill the payload to a token budget instead of dumping everything. Admits the
 * bounded high-signal snapshots whole (foundation → life areas → planning), then
 * reflections, then exercises, then splits the remainder between journal (70%)
 * and emotion logs (30%) with two-pass slack donation — each stream newest-first.
 * Returns a trimmed input plus per-type drop counts; `fits=false` only when the
 * mandatory snapshots alone can't fit (the caller turns that into contextTooLarge).
 */
export function selectPayloadWithinBudget(
  input: ProfilePayloadInput,
  maxPromptTokens: number,
): BudgetSelectionResult {
  const enabled = new Set(input.dataTypes)
  const dropped: Partial<Record<ProfileDataType, number>> = {}

  // 1. Mandatory snapshots (all-or-nothing, never trimmed).
  let mandatoryTokens = 0
  if (enabled.has('foundation') && input.foundation?.snapshot.trim()) {
    mandatoryTokens += estimateTokens(input.foundation.snapshot)
  }
  if (enabled.has('planning')) {
    if (input.lifeAreas?.snapshot.trim()) mandatoryTokens += estimateTokens(input.lifeAreas.snapshot)
    if (input.planning?.snapshot.trim()) mandatoryTokens += estimateTokens(input.planning.snapshot)
  }
  if (mandatoryTokens > maxPromptTokens) {
    return { input, droppedByType: {}, mandatoryTokens, fits: false }
  }
  let remaining = maxPromptTokens - mandatoryTokens

  const out: ProfilePayloadInput = { ...input }

  // 2. Reflections (weekly + monthly merged), newest-first per record.
  const weekly = enabled.has('weeklyReflections') ? (input.weeklyReflections ?? []) : []
  const monthly = enabled.has('monthlyReflections') ? (input.monthlyReflections ?? []) : []
  type ReflTag =
    | { kind: 'weekly'; r: ProfilePayloadWeeklyReflection }
    | { kind: 'monthly'; r: ProfilePayloadMonthlyReflection }
  const reflTagged: ReflTag[] = [
    ...weekly.map((r): ReflTag => ({ kind: 'weekly', r })),
    ...monthly.map((r): ReflTag => ({ kind: 'monthly', r })),
  ]
  const reflFill = fillByCost(
    costSortDesc(
      reflTagged,
      (t) => recordTokens(t.kind === 'weekly' ? formatWeeklyReflection(t.r) : formatMonthlyReflection(t.r)),
      (t) => t.r.createdAt,
    ),
    remaining,
  )
  remaining -= reflFill.used
  if (enabled.has('weeklyReflections')) {
    out.weeklyReflections = reflFill.kept.flatMap((t) => (t.kind === 'weekly' ? [t.r] : []))
    const d = weekly.length - (out.weeklyReflections?.length ?? 0)
    if (d > 0) dropped.weeklyReflections = d
  }
  if (enabled.has('monthlyReflections')) {
    out.monthlyReflections = reflFill.kept.flatMap((t) => (t.kind === 'monthly' ? [t.r] : []))
    const d = monthly.length - (out.monthlyReflections?.length ?? 0)
    if (d > 0) dropped.monthlyReflections = d
  }

  // 3. Exercises, newest-first per record.
  const exercises = enabled.has('exerciseSessions') ? (input.exerciseSessions ?? []) : []
  const exFill = fillByCost(
    costSortDesc(exercises, (s) => recordTokens(formatExercise(s)), (s) => s.createdAt),
    remaining,
  )
  remaining -= exFill.used
  if (enabled.has('exerciseSessions')) {
    out.exerciseSessions = exFill.kept
    const d = exercises.length - exFill.kept.length
    if (d > 0) dropped.exerciseSessions = d
  }

  // 4. Journal 70% / emotion logs 30% of the remainder, with slack donation.
  const journal = enabled.has('journal') ? (input.journalEntries ?? []) : []
  const logs = enabled.has('emotionLogs') ? (input.emotionLogs ?? []) : []
  const jCosted = costSortDesc(journal, (e) => recordTokens(formatJournalEntry(e)), (e) => e.createdAt)
  const lCosted = costSortDesc(logs, (l) => recordTokens(formatEmotionLog(l)), (l) => l.createdAt)

  const jQuota = Math.floor(remaining * 0.7)
  const lQuota = remaining - jQuota
  let jFill = fillByCost(jCosted, jQuota)
  let lFill = fillByCost(lCosted, lQuota)
  // Donate unused budget, journal first, capped so the combined total never
  // exceeds `remaining` (extend journal up to remaining−logsUsed, then logs up
  // to remaining−journalUsed).
  if (remaining - jFill.used - lFill.used > 0 && jFill.kept.length < jCosted.length) {
    jFill = fillByCost(jCosted, remaining - lFill.used)
  }
  if (remaining - jFill.used - lFill.used > 0 && lFill.kept.length < lCosted.length) {
    lFill = fillByCost(lCosted, remaining - jFill.used)
  }
  if (enabled.has('journal')) {
    out.journalEntries = jFill.kept
    const d = journal.length - jFill.kept.length
    if (d > 0) dropped.journal = d
  }
  if (enabled.has('emotionLogs')) {
    out.emotionLogs = lFill.kept
    const d = logs.length - lFill.kept.length
    if (d > 0) dropped.emotionLogs = d
  }

  return { input: out, droppedByType: dropped, mandatoryTokens, fits: true }
}

// ---------------------------------------------------------------------------
// Response parser
// ---------------------------------------------------------------------------

export interface ParsedProfileResponse {
  sections: ProfileSections
  /** Text that appeared before the first H2 or under an unknown header. */
  extras: string
}

/**
 * Normalises a raw H2 heading for matching: trims, lowercases, and strips
 * trailing punctuation that the model sometimes adds (`:`, `.`, `—`).
 */
function normaliseHeader(raw: string): string {
  return raw
    .trim()
    .replace(/[\s:.\-—]+$/u, '')
    .toLowerCase()
}

interface HeaderHit {
  /** Byte offset of the line start. */
  start: number
  /** Byte offset of the line end (newline position). */
  end: number
  /** Raw header text after the `##` and spaces. */
  raw: string
}

function findHeaders(raw: string): HeaderHit[] {
  const hits: HeaderHit[] = []
  // Accept ATX headings of any level (`#`..`######`) and full-line bold
  // pseudo-headings (`**Header**`). Local models don't always emit exactly
  // `## ` — tolerating the common variants stops a whole portrait from
  // silently falling into `extras`.
  const regex = /^(?:#{1,6}\s+(.+?)|\*\*(.+?)\*\*)\s*$/gm
  let match: RegExpExecArray | null
  while ((match = regex.exec(raw)) !== null) {
    const start = match.index
    const end = start + match[0].length
    hits.push({ start, end, raw: (match[1] ?? match[2]).trim() })
  }
  return hits
}

/**
 * Strip chain-of-thought so it never reaches the section parser. Removes closed
 * `<think>…</think>` blocks and an orphan `<think>` with no close (a truncated
 * thinking-only response). Native Ollama keeps reasoning in a separate field,
 * but a model that inlines it into `content` would otherwise pollute `extras`.
 */
function stripThinkBlocks(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/i, '')
    .trim()
}

/**
 * Maps raw LLM output into the canonical `ProfileSections` shape. Unknown
 * headers and any prose before the first `## H2` are concatenated into
 * `extras` so nothing is silently dropped.
 */
export function parseProfileResponse(
  raw: string,
  promptModule: ProfilePromptModule,
): ParsedProfileResponse {
  const sections = createEmptySections()
  const extrasChunks: string[] = []
  const cleaned = stripThinkBlocks(raw)

  // Build header lookup from ALL known localisations so we tolerate mixed
  // output (model switches language mid-response, rare but possible).
  const lookup = new Map<string, ProfileSectionId>()
  for (const { id, header } of promptModule.sectionHeaders) {
    lookup.set(normaliseHeader(header), id)
  }
  for (const id of PROFILE_SECTION_IDS) {
    lookup.set(normaliseHeader(EN_HEADERS[id]), id)
    lookup.set(normaliseHeader(PL_HEADERS[id]), id)
  }

  const hits = findHeaders(cleaned)
  if (hits.length === 0) {
    // No recognisable header at all — treat whole response as extras so it
    // isn't lost. (buildProfile turns an all-empty parse into a real error.)
    return { sections, extras: cleaned.trim() }
  }

  // Prose before the first header.
  if (hits[0].start > 0) {
    const prelude = cleaned.slice(0, hits[0].start).trim()
    if (prelude.length > 0) extrasChunks.push(prelude)
  }

  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i]
    const nextStart = i + 1 < hits.length ? hits[i + 1].start : cleaned.length
    const body = cleaned.slice(hit.end, nextStart).trim()
    const id = lookup.get(normaliseHeader(hit.raw))
    if (id) {
      // If the model somehow emits the same header twice, keep the first
      // occurrence and stash the duplicate in extras for debugging.
      if (sections[id].length === 0) {
        sections[id] = body
      } else {
        extrasChunks.push(`## ${hit.raw}\n${body}`)
      }
    } else {
      extrasChunks.push(`## ${hit.raw}\n${body}`)
    }
  }

  return {
    sections,
    extras: extrasChunks.join('\n\n').trim(),
  }
}
