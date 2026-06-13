/**
 * Reflection summary assists — prompt assembly + LLM calls that back the
 * "AI summary" and "AI questions" buttons in the weekly/monthly reflection
 * journal step (ReflectionJournalSidebar).
 *
 * Mirrors the structure of `profileLLMAssists.ts`:
 *   1. `buildReflectionSummaryPayload(ctx, locale)` — composes the free-text
 *      user message from a kind-agnostic, already-localized context object.
 *   2. system prompts (EN/PL, gender-aware) for the summary and the questions.
 *   3. `generateReflectionSummary` / `generateReflectionQuestions` — call
 *      `sendMessage` with sane completion budgets. The summary supports
 *      streaming (the caller receives the running text as it arrives).
 *
 * Unlike the profile build there is no token tiering: reflection payloads are
 * small (a handful of ratings, anchors, and short excerpts) and comfortably fit
 * any provider's context window.
 */

import type { GrammaticalGender, LocaleId } from '@/services/locale.service'
import type { MeasurementEvaluationStatus } from '@/services/measurementProgress'
import type {
  EmotionSummary,
  ReflectionEmotionLogDetail,
  ReflectionJournalEntryDetail,
} from '@/services/reflectionDataQueries'
import { type ChatMessage, sendMessage } from '@/services/llmService'

// ---------------------------------------------------------------------------
// Context shape (assembled by the weekly/monthly wizard from its data bundle)
// ---------------------------------------------------------------------------

export interface ReflectionRatingLine {
  /** Localized dimension label, e.g. "Nastrój". */
  label: string
  /** 1–5, or null when the dimension was not rated. */
  value: number | null
}

export interface ReflectionAnchorLine {
  /** Localized anchor/prompt label, e.g. "Co poszło dobrze?". */
  label: string
  /** The user's answer. Callers pass only non-empty answers. */
  text: string
}

export interface ReflectionEmotionContext {
  totalLogs: number
  /** Share of logged emotions that sit in a pleasant quadrant (0–100). */
  pleasantPct: number
  /** Most frequent emotions over the period (localized names). */
  top: { name: string; count: number }[]
}

export interface ReflectionWeeklyTrendLine {
  weekLabel: string
  mood: number | null
  energy: number | null
  calm: number | null
  connection: number | null
}

export interface ReflectionWeeklyExcerpt {
  weekLabel: string
  text: string
}

export interface ReflectionGoalLine {
  title: string
  metKRs: number
  totalKRs: number
}

export interface ReflectionMeasurableLine {
  title: string
  status: MeasurementEvaluationStatus
}

export interface ReflectionTrackerLine {
  title: string
  latest: number | null
}

/**
 * Everything the model needs to write a summary / propose questions, already
 * localized by the caller. Weekly reflections populate `ratings`, `anchors`,
 * `freeform`, and `emotions`; monthly reflections additionally populate the
 * `weeklyTrends` / `weeklyExcerpts` / `goals` / `habits` / `trackers` extras.
 */
export interface ReflectionSummaryContext {
  kind: 'weekly' | 'monthly'
  /** Human-readable period label, e.g. "Tydzień 24 (10–16 cze)" or "Czerwiec 2026". */
  periodLabel: string
  ratings: ReflectionRatingLine[]
  anchors: ReflectionAnchorLine[]
  freeform: string
  /**
   * Full journal entries written during the period (title + body + resolved
   * emotion/people/context tags). The primary, most personal source — the
   * summary should lean on these first.
   */
  journalEntries?: ReflectionJournalEntryDetail[]
  /** Emotion logs whose notes + tags carry standalone context. */
  emotionLogs?: ReflectionEmotionLogDetail[]
  emotions?: ReflectionEmotionContext
  // Monthly-only extras
  weeklyTrends?: ReflectionWeeklyTrendLine[]
  weeklyExcerpts?: ReflectionWeeklyExcerpt[]
  goals?: ReflectionGoalLine[]
  habits?: ReflectionMeasurableLine[]
  trackers?: ReflectionTrackerLine[]
}

export interface GenerateReflectionOptions {
  locale: LocaleId
  gender: GrammaticalGender
  /** Receive the running summary text as it streams in. */
  onToken?: (fullText: string) => void
}

// Completion budgets. This cap covers BOTH the visible answer AND any hidden
// reasoning — local "thinking" models (Gemma) and hosted reasoning models
// (gpt-5.4-nano) both spend tokens on reasoning that count against it. The
// summary is now 2–4 paragraphs, often in token-heavy Polish, so the old 900
// was too low: reasoning + answer hit the cap and the text was truncated
// mid-sentence. These stay well under the profile build's 6k.
const SUMMARY_MAX_TOKENS = 2000
const QUESTIONS_MAX_TOKENS = 800

// Keep individual weekly excerpts from dominating a monthly payload.
const EXCERPT_CHAR_LIMIT = 400
const MAX_WEEKLY_EXCERPTS = 5

// Journal entries are the primary source — give them room, but cap per-entry
// body length and the overall count so a heavy journaler can't blow a local
// model's context window. Emotion logs are short; cap their count + note length.
const JOURNAL_BODY_CHAR_LIMIT = 1000
const MAX_JOURNAL_ENTRIES = 15
const EMOTION_NOTE_CHAR_LIMIT = 300
const MAX_EMOTION_LOGS = 30

// ---------------------------------------------------------------------------
// Context helpers
// ---------------------------------------------------------------------------

/**
 * Distil a reflection data bundle's emotion summary into the compact emotion
 * context the prompt needs. Returns undefined when nothing was logged.
 */
export function emotionContextFromSummary(
  summary: EmotionSummary,
): ReflectionEmotionContext | undefined {
  if (summary.totalLogs === 0) return undefined
  const q = summary.quadrantDistribution
  const total =
    q['high-energy-high-pleasantness'] +
    q['high-energy-low-pleasantness'] +
    q['low-energy-high-pleasantness'] +
    q['low-energy-low-pleasantness']
  const pleasant =
    q['high-energy-high-pleasantness'] + q['low-energy-high-pleasantness']
  const pleasantPct = total > 0 ? Math.round((pleasant / total) * 100) : 0
  return {
    totalLogs: summary.totalLogs,
    pleasantPct,
    top: summary.topEmotions.slice(0, 5).map((e) => ({ name: e.name, count: e.count })),
  }
}

// ---------------------------------------------------------------------------
// Localized section labels (the payload structure; not user-facing UI copy)
// ---------------------------------------------------------------------------

type SectionKey =
  | 'period'
  | 'journal'
  | 'emotionLogs'
  | 'ratings'
  | 'emotions'
  | 'anchors'
  | 'note'
  | 'trends'
  | 'weeklyReflections'
  | 'goals'
  | 'habits'
  | 'trackers'
  | 'end'

const SECTION_LABELS: Record<LocaleId, Record<SectionKey, string>> = {
  en: {
    period: 'PERIOD',
    journal: 'JOURNAL ENTRIES',
    emotionLogs: 'EMOTION LOGS',
    ratings: 'RATINGS (1–5)',
    emotions: 'EMOTIONS',
    anchors: 'ANCHORS',
    note: 'USER NOTE',
    trends: 'WEEKLY TRENDS',
    weeklyReflections: 'WEEKLY REFLECTIONS',
    goals: 'GOALS',
    habits: 'HABITS',
    trackers: 'TRACKERS',
    end: 'END OF DATA',
  },
  pl: {
    period: 'OKRES',
    journal: 'WPISY Z DZIENNIKA',
    emotionLogs: 'LOGI EMOCJI',
    ratings: 'OCENY (1–5)',
    emotions: 'EMOCJE',
    anchors: 'KOTWICE',
    note: 'NOTATKA UŻYTKOWNIKA',
    trends: 'TRENDY TYGODNIOWE',
    weeklyReflections: 'REFLEKSJE TYGODNIOWE',
    goals: 'CELE',
    habits: 'NAWYKI',
    trackers: 'POMIARY',
    end: 'KONIEC DANYCH',
  },
}

const META_LABELS: Record<LocaleId, { emotions: string; people: string; contexts: string; note: string }> = {
  en: { emotions: 'Emotions', people: 'People', contexts: 'Contexts', note: 'Note' },
  pl: { emotions: 'Emocje', people: 'Osoby', contexts: 'Konteksty', note: 'Notatka' },
}

const STATE_DIMENSION_LABELS: Record<LocaleId, Record<'mood' | 'energy' | 'calm' | 'connection', string>> = {
  en: { mood: 'mood', energy: 'energy', calm: 'calm', connection: 'connection' },
  pl: { mood: 'nastrój', energy: 'energia', calm: 'spokój', connection: 'więź' },
}

const STATUS_LABELS: Record<LocaleId, Record<MeasurementEvaluationStatus, string>> = {
  en: { met: 'met', missed: 'missed', 'no-data': 'no data' },
  pl: { met: 'zrealizowany', missed: 'pominięty', 'no-data': 'brak danych' },
}

const PLEASANT_LABELS: Record<LocaleId, string> = {
  en: 'pleasant',
  pl: 'przyjemne',
}

// ---------------------------------------------------------------------------
// Payload assembly
// ---------------------------------------------------------------------------

/**
 * Compose the free-text user message handed to the model. Only sections with
 * real content are emitted, so the payload stays compact when a reflection is
 * sparsely filled.
 */
export function buildReflectionSummaryPayload(
  ctx: ReflectionSummaryContext,
  locale: LocaleId,
): string {
  const L = SECTION_LABELS[locale]
  const M = META_LABELS[locale]
  const lines: string[] = []

  lines.push(`[${L.period}]`)
  lines.push(ctx.periodLabel)
  lines.push('')

  // Journal entries — the primary, most personal source. Lead with them.
  if (ctx.journalEntries && ctx.journalEntries.length > 0) {
    const entries = ctx.journalEntries.slice(0, MAX_JOURNAL_ENTRIES)
    lines.push(`[${L.journal}]`)
    for (const e of entries) {
      const title = e.title.trim()
      lines.push(
        title.length > 0
          ? `--- ${formatEntryDate(e.createdAt, locale)} · ${title}`
          : `--- ${formatEntryDate(e.createdAt, locale)}`,
      )
      const meta = metaLine([
        [M.emotions, e.emotions],
        [M.people, e.people],
        [M.contexts, e.contexts],
      ])
      if (meta) lines.push(meta)
      const body = e.body.trim()
      if (body.length > 0) lines.push(truncate(body, JOURNAL_BODY_CHAR_LIMIT))
      lines.push('')
    }
    if (ctx.journalEntries.length > entries.length) {
      lines.push(omittedNote(ctx.journalEntries.length - entries.length, locale))
      lines.push('')
    }
  }

  // Emotion logs whose note/tags carry standalone context (pure emotion-only
  // logs are already represented by the [EMOTIONS] aggregate below).
  if (ctx.emotionLogs && ctx.emotionLogs.length > 0) {
    const meaningful = ctx.emotionLogs.filter(
      (l) => l.note.trim().length > 0 || l.people.length > 0 || l.contexts.length > 0,
    )
    const logs = meaningful.slice(0, MAX_EMOTION_LOGS)
    if (logs.length > 0) {
      lines.push(`[${L.emotionLogs}]`)
      for (const l of logs) {
        const emo = l.emotions.length > 0 ? ` · ${l.emotions.join(', ')}` : ''
        lines.push(`--- ${formatEntryDate(l.createdAt, locale)}${emo}`)
        const meta = metaLine([
          [M.people, l.people],
          [M.contexts, l.contexts],
        ])
        if (meta) lines.push(meta)
        const note = l.note.trim()
        if (note.length > 0) lines.push(`${M.note}: ${truncate(note, EMOTION_NOTE_CHAR_LIMIT)}`)
        lines.push('')
      }
      if (meaningful.length > logs.length) {
        lines.push(omittedNote(meaningful.length - logs.length, locale))
        lines.push('')
      }
    }
  }

  const ratedLines = ctx.ratings.filter((r) => r.value !== null)
  if (ratedLines.length > 0) {
    lines.push(`[${L.ratings}]`)
    for (const r of ratedLines) {
      lines.push(`${r.label}: ${r.value}/5`)
    }
    lines.push('')
  }

  if (ctx.emotions && ctx.emotions.totalLogs > 0) {
    lines.push(`[${L.emotions}]`)
    const e = ctx.emotions
    lines.push(`${e.totalLogs}× · ${e.pleasantPct}% ${PLEASANT_LABELS[locale]}`)
    if (e.top.length > 0) {
      lines.push(e.top.map((t) => `${t.name} ×${t.count}`).join(', '))
    }
    lines.push('')
  }

  if (ctx.weeklyTrends && ctx.weeklyTrends.length > 0) {
    const sd = STATE_DIMENSION_LABELS[locale]
    const trendLines = ctx.weeklyTrends
      .map((w) => {
        const parts: string[] = []
        if (w.mood !== null) parts.push(`${sd.mood} ${w.mood}`)
        if (w.energy !== null) parts.push(`${sd.energy} ${w.energy}`)
        if (w.calm !== null) parts.push(`${sd.calm} ${w.calm}`)
        if (w.connection !== null) parts.push(`${sd.connection} ${w.connection}`)
        return parts.length > 0 ? `${w.weekLabel}: ${parts.join(', ')}` : null
      })
      .filter((l): l is string => l !== null)
    if (trendLines.length > 0) {
      lines.push(`[${L.trends}]`)
      lines.push(...trendLines)
      lines.push('')
    }
  }

  if (ctx.goals && ctx.goals.length > 0) {
    lines.push(`[${L.goals}]`)
    for (const g of ctx.goals) {
      lines.push(`${g.title} — ${g.metKRs}/${g.totalKRs}`)
    }
    lines.push('')
  }

  if (ctx.habits && ctx.habits.length > 0) {
    const sl = STATUS_LABELS[locale]
    lines.push(`[${L.habits}]`)
    for (const h of ctx.habits) {
      lines.push(`${h.title}: ${sl[h.status]}`)
    }
    lines.push('')
  }

  if (ctx.trackers && ctx.trackers.length > 0) {
    lines.push(`[${L.trackers}]`)
    for (const tr of ctx.trackers) {
      lines.push(tr.latest !== null ? `${tr.title}: ${tr.latest}` : tr.title)
    }
    lines.push('')
  }

  if (ctx.anchors.length > 0) {
    lines.push(`[${L.anchors}]`)
    for (const a of ctx.anchors) {
      lines.push(`${a.label}:`)
      lines.push(a.text.trim())
      lines.push('')
    }
  }

  if (ctx.weeklyExcerpts && ctx.weeklyExcerpts.length > 0) {
    const excerpts = ctx.weeklyExcerpts
      .filter((w) => w.text.trim().length > 0)
      .slice(0, MAX_WEEKLY_EXCERPTS)
    if (excerpts.length > 0) {
      lines.push(`[${L.weeklyReflections}]`)
      for (const w of excerpts) {
        lines.push(`${w.weekLabel}:`)
        lines.push(truncate(w.text.trim(), EXCERPT_CHAR_LIMIT))
        lines.push('')
      }
    }
  }

  if (ctx.freeform.trim().length > 0) {
    lines.push(`[${L.note}]`)
    lines.push(ctx.freeform.trim())
    lines.push('')
  }

  lines.push(`[${L.end}]`)
  return lines.join('\n')
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text
  return text.slice(0, limit).trimEnd() + '…'
}

/** Short, locale-aware date for an entry/log marker line, e.g. "Mon, Jun 10". */
function formatEntryDate(iso: string, locale: LocaleId): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** Join the non-empty "Label: a, b" segments of an entry's metadata line. */
function metaLine(parts: Array<[string, string[]]>): string | null {
  const segments = parts
    .filter(([, values]) => values.length > 0)
    .map(([label, values]) => `${label}: ${values.join(', ')}`)
  return segments.length > 0 ? segments.join(' | ') : null
}

function omittedNote(n: number, locale: LocaleId): string {
  return locale === 'pl'
    ? `(+${n} pominięto, by zmieścić się w kontekście)`
    : `(+${n} omitted to fit the context)`
}

// ---------------------------------------------------------------------------
// Question parsing
// ---------------------------------------------------------------------------

const MAX_QUESTIONS = 5

/**
 * Split the model's question list (one per line) into a clean array — stripping
 * bullets / numbering, dropping empties and duplicates, capping at MAX_QUESTIONS.
 */
export function parseReflectionQuestions(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of raw.split('\n')) {
    const cleaned = line
      .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '') // leading bullet or "1." / "1)"
      .trim()
    if (cleaned.length === 0) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(cleaned)
    if (out.length >= MAX_QUESTIONS) break
  }
  return out
}

// ---------------------------------------------------------------------------
// System prompts (EN/PL, gender-aware)
// ---------------------------------------------------------------------------

function periodWord(kind: 'weekly' | 'monthly', locale: LocaleId): string {
  if (locale === 'pl') return kind === 'weekly' ? 'tygodnia' : 'miesiąca'
  return kind === 'weekly' ? 'week' : 'month'
}

function summarySystemPrompt(
  kind: 'weekly' | 'monthly',
  locale: LocaleId,
  gender: GrammaticalGender,
): string {
  if (locale === 'pl') {
    const personalForm =
      gender === 'feminine'
        ? 'Zwracaj się do osoby w drugiej osobie, w rodzaju żeńskim (np. "zauważyłaś", "czułaś").'
        : 'Zwracaj się do osoby w drugiej osobie, w rodzaju męskim (np. "zauważyłeś", "czułeś").'
    return [
      `Jesteś uważnym, życzliwym obserwatorem. Czytasz dane z ${periodWord(kind, 'pl')} jednej osoby. NAJWAŻNIEJSZYM źródłem są jej wpisy z dziennika oraz logi emocji (z notatkami i tagami) — to w nich kryją się konkrety. Oceny, kotwice i statystyki traktuj jako tło.`,
      '',
      `Napisz osadzone w danych podsumowanie tego ${periodWord(kind, 'pl')}: 2–4 krótkie akapity.`,
      personalForm,
      '',
      'Zasady:',
      '- Kotwicz się we WPISACH i LOGACH: przywołuj konkretne sytuacje, decyzje i wydarzenia; nazywaj konteksty i osoby tak, jak zapisała je ta osoba. Wpleć 1–2 krótkie cytaty jej własnych słów (w cudzysłowie).',
      '- Wiąż emocje z ich przyczynami — korzystaj z notatek i kontekstów przy logach emocji (np. „napięcie przy …", „ulga po …"), zamiast tylko wyliczać emocje.',
      `- Pokaż łuk tego ${periodWord(kind, 'pl')}: co go obciążało, jak ta osoba na to reagowała i w jakim stanie się skończył.`,
      '- Nazwij 1–2 powracające wątki lub wzorce widoczne w danych — to one mówią najwięcej o tej osobie.',
      '- Bądź konkretny/a, nie ogólny/a. Unikaj pustych formułek i języka „wellness". Nie zmyślaj; jeśli czegoś nie ma w danych, pomiń.',
      '- Bądź ciepły/a, ale uczciwy/a. Nie diagnozuj i nie dawaj rad — opisuj.',
      '- Pisz zwykłą prozą po polsku, w drugiej osobie. Bez nagłówków, list i bloków kodu.',
    ].join('\n')
  }
  return [
    `You are a careful, kind observer. You are reading one person's ${periodWord(kind, 'en')} of data. The MOST IMPORTANT sources are their journal entries and emotion logs (with notes and tags) — that is where the specifics live. Treat ratings, anchors, and statistics as background.`,
    '',
    `Write a grounded summary of the ${periodWord(kind, 'en')}: 2–4 short paragraphs.`,
    'Write in the second person ("you"), speaking directly to the person.',
    '',
    'Rules:',
    '- Anchor in the ENTRIES and LOGS: name concrete situations, decisions, and events; name the contexts and people the way the person logged them. Weave in 1–2 short quotes of their own words (in quotation marks).',
    '- Tie emotions to their causes — use the notes and contexts on the emotion logs (e.g. "tension around …", "relief after …") rather than just listing emotions.',
    `- Show the arc of the ${periodWord(kind, 'en')}: what weighed on it, how the person responded, and the state it ended in.`,
    '- Name 1–2 recurring threads or patterns visible in the data — these say the most about this person.',
    '- Be specific, not generic. Avoid empty phrases and "wellness" language. Do not invent; if something is not in the data, leave it out.',
    '- Be warm but honest. Do not diagnose or give advice — describe.',
    '- Write plain prose in the second person. No headings, lists, or code fences.',
  ].join('\n')
}

function questionsSystemPrompt(
  kind: 'weekly' | 'monthly',
  locale: LocaleId,
  gender: GrammaticalGender,
): string {
  if (locale === 'pl') {
    const personalForm =
      gender === 'feminine'
        ? 'Pytania kieruj w drugiej osobie, w rodzaju żeńskim tam, gdzie to potrzebne.'
        : 'Pytania kieruj w drugiej osobie, w rodzaju męskim tam, gdzie to potrzebne.'
    return [
      `Jesteś uważnym towarzyszem refleksji. Czytasz dane z refleksji ${periodWord(kind, 'pl')} jednej osoby.`,
      '',
      'Zaproponuj 3–5 otwartych, pogłębiających pytań, które pomogą tej osobie spojrzeć głębiej na ten okres.',
      personalForm,
      '',
      'Zasady:',
      '- Pytania mają wynikać z danych — najlepiej z wątku we wpisie z dziennika, z notatki przy logu emocji albo z wyróżniającej się oceny.',
      '- Każde pytanie krótkie, otwarte (nie tak/nie), nieoceniające.',
      '- Zwróć WYŁĄCZNIE pytania, po jednym w linii. Bez numeracji, wypunktowań i wstępu.',
    ].join('\n')
  }
  return [
    `You are an attentive reflection companion. You are reading one person's ${periodWord(kind, 'en')} reflection data.`,
    '',
    'Propose 3–5 open, deepening questions that help this person look more closely at the period.',
    '',
    'Rules:',
    '- Ground each question in the data — ideally a thread from a journal entry, a note on an emotion log, or a standout rating.',
    '- Keep each question short, open (not yes/no), and non-judgmental.',
    '- Return ONLY the questions, one per line. No numbering, bullets, or preamble.',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a short narrative summary of the reflection. When `onToken` is
 * provided the summary streams in; the returned string is the final full text.
 * Throws if no AI provider is configured or the request fails (callers classify).
 */
export async function generateReflectionSummary(
  ctx: ReflectionSummaryContext,
  options: GenerateReflectionOptions,
): Promise<string> {
  const systemPrompt = summarySystemPrompt(ctx.kind, options.locale, options.gender)
  const payload = buildReflectionSummaryPayload(ctx, options.locale)
  const messages: ChatMessage[] = [{ role: 'user', content: payload }]

  let acc = ''
  const forward = options.onToken
  const text = await sendMessage(messages, systemPrompt, {
    maxTokens: SUMMARY_MAX_TOKENS,
    ...(forward
      ? {
          onToken: (delta: string) => {
            acc += delta
            forward(acc)
          },
        }
      : {}),
  })
  return text.trim()
}

/**
 * Generate a short list of deepening questions for the reflection. Returns the
 * parsed, de-duplicated questions (may be empty if the model returns nothing
 * usable). Throws if no AI provider is configured or the request fails.
 */
export async function generateReflectionQuestions(
  ctx: ReflectionSummaryContext,
  options: GenerateReflectionOptions,
): Promise<string[]> {
  const systemPrompt = questionsSystemPrompt(ctx.kind, options.locale, options.gender)
  const payload = buildReflectionSummaryPayload(ctx, options.locale)
  const messages: ChatMessage[] = [{ role: 'user', content: payload }]

  const raw = await sendMessage(messages, systemPrompt, {
    maxTokens: QUESTIONS_MAX_TOKENS,
  })
  return parseReflectionQuestions(raw)
}
