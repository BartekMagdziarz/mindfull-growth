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
import type { EmotionSummary } from '@/services/reflectionDataQueries'
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

// Completion budgets — a reflection summary is a few short paragraphs and the
// question list is even shorter, so these stay well below the profile build's 6k.
const SUMMARY_MAX_TOKENS = 900
const QUESTIONS_MAX_TOKENS = 400

// Keep individual weekly excerpts from dominating a monthly payload.
const EXCERPT_CHAR_LIMIT = 400
const MAX_WEEKLY_EXCERPTS = 5

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
  const lines: string[] = []

  lines.push(`[${L.period}]`)
  lines.push(ctx.periodLabel)
  lines.push('')

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
      `Jesteś uważnym, życzliwym obserwatorem. Czytasz dane z refleksji ${periodWord(kind, 'pl')} jednej osoby — oceny, kotwice, emocje i jej własną notatkę.`,
      '',
      `Napisz krótkie, osadzone w danych podsumowanie tego ${periodWord(kind, 'pl')} (3–5 zdań, 1–2 akapity).`,
      personalForm,
      '',
      'Zasady:',
      '- Trzymaj się danych; nie zmyślaj. Wyłap 1–2 główne wątki, nie streszczaj wszystkiego.',
      '- Bądź konkretny/a zamiast ogólny/a; możesz krótko nawiązać do liczb lub słów osoby.',
      '- Bądź ciepły/a, ale uczciwy/a. Nie diagnozuj, nie dawaj rad — opisuj.',
      '- Pisz zwykłą prozą po polsku. Bez nagłówków, list i bloków kodu.',
    ].join('\n')
  }
  return [
    `You are a careful, kind observer. You are reading one person's ${periodWord(kind, 'en')} reflection data — ratings, anchors, emotions, and their own note.`,
    '',
    `Write a short, grounded summary of the ${periodWord(kind, 'en')} (3–5 sentences, 1–2 paragraphs).`,
    'Write in the second person ("you"), speaking directly to the person.',
    '',
    'Rules:',
    '- Stay close to the data; do not invent. Surface 1–2 main threads rather than recapping everything.',
    '- Be specific rather than generic; you may briefly reference the numbers or the person\'s own words.',
    '- Be warm but honest. Do not diagnose or give advice — describe.',
    '- Write plain prose. No headings, lists, or code fences.',
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
      '- Pytania mają wynikać z danych (np. z wyróżniającej się oceny, emocji czy wątku z notatki).',
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
    '- Ground each question in the data (e.g. a standout rating, an emotion, or a thread from the note).',
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
