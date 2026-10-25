/**
 * Reflection over the break — three short, optional answers collected in the
 * return ritual's first step and written as ONE journal entry (title with the
 * date range, body with labelled paragraphs, tag „Powrót”). The journal is
 * already what the profile, the companion, the stream and the history read,
 * so the reflection reaches them without a new channel.
 *
 * Plan: ideas/html-plans/2026-10-25-return-reflection-step.html.
 */

import type { DayRef } from '@/domain/period'
import { formatDayShort } from '@/utils/periodLabels'

export interface ReturnReflection {
  /** Co się działo? */
  whatHappened: string
  /** Co z planu było żywe, a co odpadło? */
  aliveAndDropped: string
  /** Czego chcę teraz? */
  wantNow: string
}

export type ReturnReflectionKey = keyof ReturnReflection

export const RETURN_JOURNAL_TITLE = 'Powrót po przerwie'
export const RETURN_CONTEXT_TAG_NAME = 'Powrót'

/** Section labels in the journal body, in this order. */
export const RETURN_REFLECTION_LABELS: Record<ReturnReflectionKey, string> = {
  whatHappened: 'Co się działo',
  aliveAndDropped: 'Żywe i odpadłe',
  wantNow: 'Chcę teraz',
}

export const RETURN_REFLECTION_KEYS: ReturnReflectionKey[] = [
  'whatHappened',
  'aliveAndDropped',
  'wantNow',
]

export function emptyReturnReflection(): ReturnReflection {
  return { whatHappened: '', aliveAndDropped: '', wantNow: '' }
}

export function hasReturnReflection(reflection: ReturnReflection): boolean {
  return RETURN_REFLECTION_KEYS.some(key => reflection[key].trim().length > 0)
}

/** „Powrót po przerwie · 30 wrz – 25 paź” */
export function returnReflectionTitle(breakStart: DayRef, today: DayRef): string {
  return `${RETURN_JOURNAL_TITLE} · ${formatDayShort(breakStart, 'pl-PL')} – ${formatDayShort(today, 'pl-PL')}`
}

export function isReturnReflectionTitle(title: string | undefined): boolean {
  return (title ?? '').startsWith(RETURN_JOURNAL_TITLE)
}

/**
 * Journal body: one paragraph per non-empty answer, each opened by its label
 * and a colon. Empty reflection → empty body (the caller writes nothing).
 */
export function formatReturnReflection(reflection: ReturnReflection): string {
  return RETURN_REFLECTION_KEYS.flatMap(key => {
    const text = reflection[key].trim()
    return text ? [`${RETURN_REFLECTION_LABELS[key]}: ${text}`] : []
  }).join('\n\n')
}

/**
 * The inverse, tolerant of the user's own edits in the journal: a paragraph
 * that opens with a known label goes to its answer, everything else joins
 * „co się działo”. Round-trips what `formatReturnReflection` wrote.
 */
export function parseReturnReflection(body: string): ReturnReflection {
  const reflection = emptyReturnReflection()
  const byLabel = new Map(
    RETURN_REFLECTION_KEYS.map(key => [RETURN_REFLECTION_LABELS[key].toLowerCase(), key])
  )
  const loose: string[] = []
  for (const paragraph of body.split(/\n\s*\n/)) {
    const text = paragraph.trim()
    if (!text) continue
    const match = /^([^:\n]{1,40}):\s*([\s\S]*)$/.exec(text)
    const key = match ? byLabel.get(match[1]!.trim().toLowerCase()) : undefined
    if (key && match) {
      reflection[key] = reflection[key]
        ? `${reflection[key]}\n${match[2]!.trim()}`
        : match[2]!.trim()
    } else {
      loose.push(text)
    }
  }
  if (loose.length) {
    const extra = loose.join('\n')
    reflection.whatHappened = reflection.whatHappened
      ? `${reflection.whatHappened}\n${extra}`
      : extra
  }
  return reflection
}
