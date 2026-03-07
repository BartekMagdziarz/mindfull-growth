/**
 * LLM Assist functions for Logotherapy exercises.
 *
 * Each function wraps sendMessage() from llmService with exercise-specific
 * system prompts and context formatting. Supports single-call and
 * conversational (multi-turn) assists.
 */

import { sendMessage, type ChatMessage } from '@/services/llmService'
import type { MeaningPathwayItem, MountainRangeEvent, SocraticFocus, TragicTriadFocus } from '@/domain/exercises'
import type { LocaleId } from '@/services/locale.service'
import { getLogotherapyPrompts } from '@/services/prompts'
import type { LogotherapyPromptModule } from '@/services/prompts/types'

// ============================================================================
// Context Builders
// ============================================================================

function buildThreePathwaysContext(
  params: {
    creativeValues: MeaningPathwayItem[]
    experientialValues: MeaningPathwayItem[]
    attitudinalValues: MeaningPathwayItem[]
    lifeAreaNames?: string[]
    coreValues?: string[]
  },
  labels: LogotherapyPromptModule['labels'],
): string {
  const parts: string[] = []

  const formatItems = (items: MeaningPathwayItem[]) =>
    items.map((item, i) => {
      let line = `${i + 1}. ${item.description} (${labels.engagement}: ${item.engagementRating}/5)`
      if (item.lifeAreaId) line += ` ${labels.linkedToLifeArea}`
      return line
    }).join('\n')

  parts.push(`${labels.creativeValues}:\n${formatItems(params.creativeValues)}`)
  parts.push(`${labels.experientialValues}:\n${formatItems(params.experientialValues)}`)
  parts.push(`${labels.attitudinalValues}:\n${formatItems(params.attitudinalValues)}`)

  if (params.lifeAreaNames?.length) {
    parts.push(`${labels.lifeAreas}: ${params.lifeAreaNames.join(', ')}`)
  }

  if (params.coreValues?.length) {
    parts.push(`${labels.coreValuesFromDiscovery}: ${params.coreValues.join(', ')}`)
  }

  return parts.join('\n\n')
}

function buildMountainRangeContext(
  params: {
    events: MountainRangeEvent[]
    peakPatterns?: string
    valleyPatterns?: string
    coreValues?: string[]
  },
  labels: LogotherapyPromptModule['labels'],
): string {
  const parts: string[] = []

  const peaks = params.events.filter(e => e.type === 'peak')
  const valleys = params.events.filter(e => e.type === 'valley')

  if (peaks.length) {
    parts.push(`${labels.peaksGreatestMeaning}:\n${peaks.map((p, i) => `${i + 1}. ${labels.ageYear} ${p.ageOrYear}: ${p.description}${p.reflection ? ` — "${p.reflection}"` : ''}`).join('\n')}`)
  }

  if (valleys.length) {
    parts.push(`${labels.valleysDeepestStruggle}:\n${valleys.map((v, i) => `${i + 1}. ${labels.ageYear} ${v.ageOrYear}: ${v.description}${v.reflection ? ` — "${v.reflection}"` : ''}`).join('\n')}`)
  }

  if (params.peakPatterns) parts.push(`${labels.userPeakPatterns}: ${params.peakPatterns}`)
  if (params.valleyPatterns) parts.push(`${labels.userValleyPatterns}: ${params.valleyPatterns}`)
  if (params.coreValues?.length) parts.push(`${labels.coreValues}: ${params.coreValues.join(', ')}`)

  return parts.join('\n\n')
}

function buildParadoxicalIntentionContext(
  params: {
    fear: string
    anticipatedCatastrophe: string
    userAttempt?: string
    previousMessages?: ChatMessage[]
  },
  labels: LogotherapyPromptModule['labels'],
): string {
  const parts: string[] = []
  parts.push(`${labels.fear}: ${params.fear}`)
  parts.push(`${labels.anticipatedCatastrophe}: ${params.anticipatedCatastrophe}`)
  if (params.userAttempt) {
    parts.push(`${labels.userParadoxicalAttempt}: "${params.userAttempt}"`)
  }
  return parts.join('\n\n')
}

function buildAttitudinalShiftContext(
  params: {
    belief: string
    previousMessages?: ChatMessage[]
  },
  labels: LogotherapyPromptModule['labels'],
): string {
  return `${labels.becauseStatement}: "${params.belief}"`
}

function buildSocraticDialogueContext(
  params: {
    focus: SocraticFocus
    customFocus?: string
    contextSummary?: string
  },
  labels: LogotherapyPromptModule['labels'],
): string {
  const parts: string[] = []
  if (params.focus === 'custom' && params.customFocus) {
    parts.push(`${labels.focusTopic}: ${params.customFocus}`)
  } else {
    parts.push(`${labels.focus}: ${params.focus}`)
  }
  if (params.contextSummary) {
    parts.push(`${labels.context}: ${params.contextSummary}`)
  }
  return parts.join('\n')
}

function buildTragicOptimismContext(
  params: {
    focus: TragicTriadFocus
    freeWriting?: string
    guidedAnswers?: string[]
  },
  labels: LogotherapyPromptModule['labels'],
): string {
  const parts: string[] = []
  parts.push(`${labels.focus}: ${params.focus}`)
  if (params.freeWriting) parts.push(`${labels.freeWriting}:\n${params.freeWriting}`)
  if (params.guidedAnswers?.length) {
    parts.push(`${labels.guidedAnswers}:\n${params.guidedAnswers.map((a, i) => `${i + 1}. ${a}`).join('\n')}`)
  }
  return parts.join('\n\n')
}

function buildLegacyLetterContext(
  params: {
    letterText: string
    coreValues?: string[]
    purposeStatement?: string
  },
  labels: LogotherapyPromptModule['labels'],
): string {
  const parts: string[] = []
  parts.push(`${labels.legacyLetter}:\n${params.letterText}`)
  if (params.coreValues?.length) parts.push(`${labels.coreValues}: ${params.coreValues.join(', ')}`)
  if (params.purposeStatement) parts.push(`${labels.purposeStatement}: ${params.purposeStatement}`)
  return parts.join('\n\n')
}

// ============================================================================
// Public API — Single-Call Assists
// ============================================================================

/**
 * Three Pathways — Synthesize meaning balance across all three pathways.
 * Single-call. Returns analysis text.
 */
export async function synthesizeThreePathways(params: {
  creativeValues: MeaningPathwayItem[]
  experientialValues: MeaningPathwayItem[]
  attitudinalValues: MeaningPathwayItem[]
  lifeAreaNames?: string[]
  coreValues?: string[]
  locale: LocaleId
}): Promise<string> {
  const prompts = getLogotherapyPrompts(params.locale)
  const context = buildThreePathwaysContext(params, prompts.labels)
  const messages: ChatMessage[] = [{ role: 'user', content: context }]
  return sendMessage(messages, prompts.THREE_PATHWAYS_SYNTHESIS)
}

/**
 * Mountain Range — Synthesize biographical peaks and valleys.
 * Single-call. Returns theme analysis text.
 */
export async function synthesizeMountainRange(params: {
  events: MountainRangeEvent[]
  peakPatterns?: string
  valleyPatterns?: string
  coreValues?: string[]
  locale: LocaleId
}): Promise<string> {
  const prompts = getLogotherapyPrompts(params.locale)
  const context = buildMountainRangeContext(params, prompts.labels)
  const messages: ChatMessage[] = [{ role: 'user', content: context }]
  return sendMessage(messages, prompts.MOUNTAIN_RANGE_SYNTHESIS)
}

/**
 * Paradoxical Intention — Help craft a more absurd, humorous intention.
 * Single-call. Returns creative suggestion text.
 */
export async function craftParadoxicalIntention(params: {
  fear: string
  anticipatedCatastrophe: string
  userAttempt?: string
  previousMessages?: ChatMessage[]
  locale: LocaleId
}): Promise<string> {
  const prompts = getLogotherapyPrompts(params.locale)
  const context = buildParadoxicalIntentionContext(params, prompts.labels)
  const messages: ChatMessage[] = [
    ...(params.previousMessages ?? []),
    { role: 'user' as const, content: context },
  ]
  return sendMessage(messages, prompts.PARADOXICAL_INTENTION_CRAFT)
}

/**
 * Attitudinal Shift — Help reframe a "because" statement into "although".
 * Single-call. Returns reframing guidance text.
 */
export async function reframeAttitudinalShift(params: {
  belief: string
  previousMessages?: ChatMessage[]
  locale: LocaleId
}): Promise<string> {
  const prompts = getLogotherapyPrompts(params.locale)
  const context = buildAttitudinalShiftContext(params, prompts.labels)
  const messages: ChatMessage[] = [
    ...(params.previousMessages ?? []),
    { role: 'user' as const, content: context },
  ]
  return sendMessage(messages, prompts.ATTITUDINAL_SHIFT_REFRAME)
}

// ============================================================================
// Public API — Multi-Turn Assists
// ============================================================================

/**
 * Socratic Dialogue — One turn in a multi-turn Socratic conversation.
 * Accepts previous messages for context continuity.
 */
export async function socraticDialogueTurn(params: {
  focus: SocraticFocus
  customFocus?: string
  userMessage: string
  previousMessages?: ChatMessage[]
  contextSummary?: string
  locale: LocaleId
}): Promise<string> {
  const prompts = getLogotherapyPrompts(params.locale)

  const systemPrompt = params.focus === 'custom'
    ? `${prompts.SOCRATIC_DIALOGUE_MEANING}\n\n${prompts.labels.customFocus}: ${params.customFocus ?? prompts.labels.generalMeaningExploration}`
    : prompts.socraticPrompts[params.focus] ?? prompts.SOCRATIC_DIALOGUE_MEANING

  const contextPreamble = buildSocraticDialogueContext(params, prompts.labels)
  const messages: ChatMessage[] = []

  if (params.previousMessages?.length) {
    messages.push(...params.previousMessages)
  } else {
    // First turn: include context as system-level user message
    messages.push({ role: 'user', content: contextPreamble })
  }

  // Add the current user message
  if (params.previousMessages?.length) {
    messages.push({ role: 'user', content: params.userMessage })
  } else {
    // First turn: combine context with user message
    messages[0] = { role: 'user', content: `${contextPreamble}\n\n${params.userMessage}` }
  }

  return sendMessage(messages, systemPrompt)
}

/**
 * Tragic Optimism — One turn in a gentle multi-turn dialogue.
 * Accepts previous messages and contextual data.
 */
export async function tragicOptimismTurn(params: {
  focus: TragicTriadFocus
  userMessage: string
  previousMessages?: ChatMessage[]
  freeWriting?: string
  guidedAnswers?: string[]
  locale: LocaleId
}): Promise<string> {
  const prompts = getLogotherapyPrompts(params.locale)
  const systemPrompt = prompts.tragicOptimismPrompts[params.focus]
  const context = buildTragicOptimismContext(params, prompts.labels)
  const messages: ChatMessage[] = []

  if (params.previousMessages?.length) {
    messages.push(...params.previousMessages)
    messages.push({ role: 'user', content: params.userMessage })
  } else {
    messages.push({ role: 'user', content: `${context}\n\n${params.userMessage}` })
  }

  return sendMessage(messages, systemPrompt)
}

/**
 * Legacy Letter — Discuss the user's legacy letter with reverence.
 * Accepts previous messages for ongoing reflection.
 */
export async function legacyLetterDiscuss(params: {
  userMessage: string
  previousMessages?: ChatMessage[]
  letterText: string
  coreValues?: string[]
  purposeStatement?: string
  locale: LocaleId
}): Promise<string> {
  const prompts = getLogotherapyPrompts(params.locale)
  const context = buildLegacyLetterContext(params, prompts.labels)
  const messages: ChatMessage[] = []

  if (params.previousMessages?.length) {
    messages.push(...params.previousMessages)
    messages.push({ role: 'user', content: params.userMessage })
  } else {
    messages.push({ role: 'user', content: `${context}\n\n${params.userMessage}` })
  }

  return sendMessage(messages, prompts.LEGACY_LETTER_DISCUSS)
}
