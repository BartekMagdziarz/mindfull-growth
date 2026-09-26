/**
 * LLM Assist functions for IFS (Internal Family Systems) exercises.
 *
 * Each function wraps sendMessage() from llmService with exercise-specific
 * system prompts and context formatting. Supports single-call and
 * conversational (multi-turn) assists.
 */

import { sendMessage, type ChatMessage } from '@/services/llmService'
import type { GrammaticalGender, LocaleId } from '@/services/locale.service'
import { getIfsPrompts } from '@/services/prompts'
import type { IfsPromptModule } from '@/services/prompts/types'
import { withProfileContextSystemPrompt } from '@/services/userContext'
import type {
  IFSPart,
  IFSRelationship,
  IFSTrailheadEntry,
  IFSSelfEnergyCheckIn,
  IFSDialogueMessage,
  IFSDailyCheckIn,
  IFSConstellationRelationship,
} from '@/domain/exercises'

/** Options every IFS assist accepts besides its own payload. */
interface AssistOptions {
  locale: LocaleId
  useProfile?: boolean
  /** User's grammatical gender from the profile — steers 2nd-person forms (Polish). */
  gender?: GrammaticalGender
}

/** Base prompt + profile context + gender note (in that order). */
function buildSystemPrompt(
  prompts: IfsPromptModule,
  key: Exclude<keyof IfsPromptModule, 'labels' | 'enums' | 'genderNote'>,
  opts: AssistOptions,
): string {
  const base = withProfileContextSystemPrompt(prompts[key], { useProfile: opts.useProfile ?? false })
  const note = opts.gender ? prompts.genderNote[opts.gender] : undefined
  return note ? `${base}\n\n${note}` : base
}

/** Enum → label with the raw value as a safe fallback. */
function label(map: Record<string, string>, value: string): string {
  return map[value] ?? value
}

function partHeader(part: IFSPart, prompts: IfsPromptModule): string {
  return `"${part.name}" (${label(prompts.enums.roles, part.role)})`
}

// ============================================================================
// Context Builders
// ============================================================================

function buildPartsMapContext(
  params: {
    parts: IFSPart[]
    relationships: IFSRelationship[]
    lifeAreaNames?: string[]
    emotionNames?: string[]
  },
  prompts: IfsPromptModule,
): string {
  const { labels, enums } = prompts
  const sections: string[] = []

  if (params.parts.length) {
    const partLines = params.parts.map((p, i) => {
      const details: string[] = [`${labels.role}: ${label(enums.roles, p.role)}`]
      if (p.bodyLocations.length) {
        details.push(`${labels.body}: ${p.bodyLocations.map((b) => label(enums.bodyLocations, b)).join(', ')}`)
      }
      if (p.positiveIntention) details.push(`${labels.positiveIntention}: ${p.positiveIntention}`)
      if (p.fears) details.push(`${labels.fears}: ${p.fears}`)
      if (p.burden) details.push(`${labels.burden}: ${p.burden}`)
      if (p.needs) details.push(`${labels.needs}: ${p.needs}`)
      if (p.feltAge) details.push(`${labels.feltAge}: ~${p.feltAge}`)
      if (p.triggerContexts?.length) details.push(`${labels.triggers}: ${p.triggerContexts.join(', ')}`)
      return `${i + 1}. "${p.name}" — ${details.join('; ')}`
    })
    sections.push(`${labels.partsIdentified}:\n${partLines.join('\n')}`)
  }

  if (params.relationships.length) {
    const partMap = new Map(params.parts.map((p) => [p.id, p.name]))
    const relLines = params.relationships.map((r) => {
      const from = partMap.get(r.fromPartId) ?? labels.unknown
      const to = partMap.get(r.toPartId) ?? labels.unknown
      return `- "${from}" ${label(enums.relationshipTypes, r.type)} "${to}"${r.notes ? ` (${r.notes})` : ''}`
    })
    sections.push(`${labels.relationships}:\n${relLines.join('\n')}`)
  }

  if (params.lifeAreaNames?.length) {
    sections.push(`${labels.lifeAreas}: ${params.lifeAreaNames.join(', ')}`)
  }
  if (params.emotionNames?.length) {
    sections.push(`${labels.emotionsPresent}: ${params.emotionNames.join(', ')}`)
  }

  return sections.join('\n\n')
}

function buildDirectAccessContext(
  params: {
    part: IFSPart
    previousMessages?: IFSDialogueMessage[]
  },
  prompts: IfsPromptModule,
): string {
  const { labels, enums } = prompts
  const details: string[] = [
    `${labels.partName}: "${params.part.name}"`,
    `${labels.role}: ${label(enums.roles, params.part.role)}`,
  ]
  if (params.part.positiveIntention) details.push(`${labels.positiveIntention}: ${params.part.positiveIntention}`)
  if (params.part.fears) details.push(`${labels.fears}: ${params.part.fears}`)
  if (params.part.burden) details.push(`${labels.burden}: ${params.part.burden}`)
  if (params.part.needs) details.push(`${labels.needs}: ${params.part.needs}`)
  if (params.part.bodyLocations.length) {
    details.push(
      `${labels.bodyLocations}: ${params.part.bodyLocations.map((b) => label(enums.bodyLocations, b)).join(', ')}`,
    )
  }
  if (params.part.feltAge) details.push(`${labels.feltAge}: ~${params.part.feltAge}`)
  if (params.part.triggerContexts?.length) details.push(`${labels.triggerContexts}: ${params.part.triggerContexts.join(', ')}`)
  return details.join('\n')
}

function buildTrailheadAnalysisContext(
  params: {
    entries: IFSTrailheadEntry[]
    partNames?: Record<string, string>
    emotionNames?: Record<string, string>
  },
  prompts: IfsPromptModule,
): string {
  const { labels, enums } = prompts
  const entryLines = params.entries.map((e, i) => {
    const details: string[] = [
      `${labels.trigger}: ${e.triggerDescription}`,
      `${labels.intensity}: ${e.intensity}/10`,
    ]
    const emotionNames = e.emotionIds
      .map((id) => params.emotionNames?.[id])
      .filter((name): name is string => !!name)
    if (emotionNames.length) details.push(`${labels.emotions}: ${emotionNames.join(', ')}`)
    if (e.bodyLocation) details.push(`${labels.body}: ${label(enums.bodyLocations, e.bodyLocation)}`)
    details.push(
      `${labels.thoughts}: ${e.thoughts}`,
      `${labels.sensations}: ${e.sensations}`,
      `${labels.behaviors}: ${e.behaviors}`,
      `${labels.perception}: ${e.perception}/10`,
    )
    if (e.images) details.push(`${labels.images}: ${e.images}`)
    if (e.linkedPartId && params.partNames?.[e.linkedPartId]) {
      details.push(`${labels.linkedPart}: "${params.partNames[e.linkedPartId]}"`)
    }
    if (e.reflection) details.push(`${labels.reflection}: ${e.reflection}`)
    return `${labels.entry} ${i + 1} (${e.createdAt.slice(0, 10)}):\n  ${details.join('\n  ')}`
  })
  return `${labels.trailheadJournalEntries}:\n${entryLines.join('\n\n')}`
}

function buildProtectorResponseContext(
  params: {
    part: IFSPart
    appreciationLetter: string
    behaviors: string[]
    activationTriggers?: string
    fearIfStopped?: string
  },
  prompts: IfsPromptModule,
): string {
  const { labels } = prompts
  const sections: string[] = [`${labels.part}: ${partHeader(params.part, prompts)}`]
  const fears = params.fearIfStopped || params.part.fears
  if (fears) sections.push(`${labels.fears}: ${fears}`)
  if (params.part.positiveIntention) sections.push(`${labels.positiveIntention}: ${params.part.positiveIntention}`)
  if (params.part.feltAge) sections.push(`${labels.feltAge}: ~${params.part.feltAge}`)
  if (params.activationTriggers) sections.push(`${labels.triggers}: ${params.activationTriggers}`)
  sections.push(`${labels.protectiveBehaviors}: ${params.behaviors.join(', ')}`)
  sections.push(`${labels.appreciationLetter}:\n"${params.appreciationLetter}"`)
  return sections.join('\n')
}

function buildSelfEnergyReviewContext(
  params: {
    checkIns: IFSSelfEnergyCheckIn[]
    trailheadEntries?: IFSTrailheadEntry[]
    parts?: IFSPart[]
  },
  prompts: IfsPromptModule,
): string {
  const { labels, enums } = prompts
  const sections: string[] = []

  const checkInLines = params.checkIns.map((c) => {
    const ratings = Object.entries(c.ratings)
      .map(([k, v]) => `${label(enums.qualities, k)}: ${v}/5`)
      .join(', ')
    return `${c.createdAt.slice(0, 10)}: ${ratings} (${labels.lowest}: ${label(enums.qualities, c.lowestQuality)})`
  })
  sections.push(`${labels.eightCsCheckIns} (${params.checkIns.length} ${labels.total}):\n${checkInLines.join('\n')}`)

  if (params.parts?.length) {
    sections.push(`${labels.knownParts}: ${params.parts.map((p) => partHeader(p, prompts)).join(', ')}`)
  }

  if (params.trailheadEntries?.length) {
    sections.push(`${labels.recentTrailheadEntries}: ${params.trailheadEntries.length} ${labels.entriesLogged}`)
  }

  return sections.join('\n\n')
}

function buildPartDialogueContext(
  params: {
    part: IFSPart
    dialogue: IFSDialogueMessage[]
    intention: string
  },
  prompts: IfsPromptModule,
): string {
  const { labels } = prompts
  const sections: string[] = [
    `${labels.part}: ${partHeader(params.part, prompts)}`,
    `${labels.dialogueIntention}: ${params.intention}`,
  ]
  if (params.part.fears) sections.push(`${labels.partsFears}: ${params.part.fears}`)
  if (params.part.positiveIntention) sections.push(`${labels.partsPositiveIntention}: ${params.part.positiveIntention}`)
  if (params.part.burden) sections.push(`${labels.burden}: ${params.part.burden}`)
  if (params.part.needs) sections.push(`${labels.needs}: ${params.part.needs}`)
  if (params.part.feltAge) sections.push(`${labels.feltAge}: ~${params.part.feltAge}`)

  if (params.dialogue.length) {
    const transcript = params.dialogue
      .map((m) => `${m.role === 'user' ? labels.selfLabel : params.part.name}: ${m.content}`)
      .join('\n')
    sections.push(`${labels.dialogueSoFar}:\n${transcript}`)
  }

  return sections.join('\n')
}

function buildWeeklySummaryContext(
  params: {
    checkIns: IFSDailyCheckIn[]
    parts: IFSPart[]
  },
  prompts: IfsPromptModule,
): string {
  const { labels, enums } = prompts
  const sections: string[] = []
  const partMap = new Map(params.parts.map((p) => [p.id, p.name]))

  const byType: Record<string, IFSDailyCheckIn[]> = {}
  for (const ci of params.checkIns) {
    if (!byType[ci.practiceType]) byType[ci.practiceType] = []
    byType[ci.practiceType].push(ci)
  }

  for (const [type, items] of Object.entries(byType)) {
    const lines = items.map((item) => {
      const parts: string[] = [`${item.createdAt.slice(0, 10)}`]
      if (item.activeParts?.length) {
        const activeNames = item.activeParts
          .map((ap) => {
            const name = partMap.get(ap.partId) ?? labels.unknown
            return `${name} (${ap.intensity}/10)${ap.triggerNote ? ` — ${ap.triggerNote}` : ''}`
          })
          .join(', ')
        parts.push(`${labels.active}: ${activeNames}`)
      }
      if (item.gratitudePartId) parts.push(`${labels.gratitudeTo}: ${partMap.get(item.gratitudePartId) ?? labels.unknown}`)
      if (item.gratitudeNote) parts.push(`${labels.note}: ${item.gratitudeNote}`)
      if (item.selfEnergyQuality) parts.push(`${labels.selfEnergy}: ${label(enums.qualities, item.selfEnergyQuality)}`)
      if (item.microPracticeNotes) parts.push(`${labels.note}: ${item.microPracticeNotes}`)
      if (item.selfLeadershipRating) parts.push(`${labels.leadership}: ${label(enums.leadership, item.selfLeadershipRating)}`)
      if (item.eveningReflection) parts.push(`${labels.reflection}: ${item.eveningReflection}`)
      return `  ${parts.join(' | ')}`
    })
    sections.push(`${label(enums.practiceTypes, type)}:\n${lines.join('\n')}`)
  }

  return sections.join('\n\n')
}

function buildConstellationContext(
  params: {
    parts: IFSPart[]
    relationships: IFSConstellationRelationship[]
    cascadeNotes?: string
  },
  prompts: IfsPromptModule,
): string {
  const { labels, enums } = prompts
  const sections: string[] = []
  const partMap = new Map(params.parts.map((p) => [p.id, p]))

  const partLines = params.parts.map((p) => {
    const extra: string[] = []
    if (p.positiveIntention) extra.push(`${labels.positiveIntention}: ${p.positiveIntention}`)
    if (p.fears) extra.push(`${labels.fears}: ${p.fears}`)
    if (p.burden) extra.push(`${labels.burden}: ${p.burden}`)
    return `- ${partHeader(p, prompts)}${extra.length ? ` — ${extra.join('; ')}` : ''}`
  })
  sections.push(`${labels.partsInConstellation}:\n${partLines.join('\n')}`)

  if (params.relationships.length) {
    const relLines = params.relationships.map((r) => {
      const a = partMap.get(r.partAId)?.name ?? labels.unknown
      const b = partMap.get(r.partBId)?.name ?? labels.unknown
      const details: string[] = [`"${a}" ↔ "${b}": ${label(enums.relationshipTypes, r.type)}`]
      if (r.partAThinks) details.push(`"${a}" ${labels.thinks}: "${r.partAThinks}"`)
      if (r.partBThinks) details.push(`"${b}" ${labels.thinks}: "${r.partBThinks}"`)
      if (r.ifOneWon) details.push(`${labels.ifOneWon}: "${r.ifOneWon}"`)
      if (r.commonProtection) details.push(`${labels.bothProtect}: "${r.commonProtection}"`)
      return details.join('\n  ')
    })
    sections.push(`${labels.relationships}:\n${relLines.join('\n\n')}`)
  }

  if (params.cascadeNotes?.trim()) {
    sections.push(`${labels.cascades}:\n${params.cascadeNotes.trim()}`)
  }

  return sections.join('\n\n')
}

// ============================================================================
// Public API — Single-Call Assists
// ============================================================================

/**
 * Parts Mapping — Reflect on the user's inner parts map.
 * Single-call. Returns analysis text.
 */
export async function reflectOnPartsMap(params: {
  parts: IFSPart[]
  relationships: IFSRelationship[]
  lifeAreaNames?: string[]
  emotionNames?: string[]
} & AssistOptions): Promise<string> {
  const prompts = getIfsPrompts(params.locale)
  const context = buildPartsMapContext(params, prompts)
  const messages: ChatMessage[] = [{ role: 'user', content: context }]
  const systemPrompt = buildSystemPrompt(prompts, 'IFS_PARTS_REFLECTION', params)
  return sendMessage(messages, systemPrompt)
}

/**
 * Trailhead Journal — Analyze patterns across journal entries.
 * Single-call. Returns pattern analysis text.
 */
export async function analyzeTrailheadPatterns(params: {
  entries: IFSTrailheadEntry[]
  partNames?: Record<string, string>
  emotionNames?: Record<string, string>
} & AssistOptions): Promise<string> {
  const prompts = getIfsPrompts(params.locale)
  const context = buildTrailheadAnalysisContext(params, prompts)
  const messages: ChatMessage[] = [{ role: 'user', content: context }]
  const systemPrompt = buildSystemPrompt(prompts, 'IFS_TRAILHEAD_ANALYSIS', params)
  return sendMessage(messages, systemPrompt)
}

/**
 * Protector Appreciation — Generate a protector's response to an appreciation letter.
 * Single-call. Returns in-character part response.
 */
export async function generateProtectorResponse(params: {
  part: IFSPart
  appreciationLetter: string
  behaviors: string[]
  activationTriggers?: string
  fearIfStopped?: string
} & AssistOptions): Promise<string> {
  const prompts = getIfsPrompts(params.locale)
  const context = buildProtectorResponseContext(params, prompts)
  const messages: ChatMessage[] = [{ role: 'user', content: context }]
  const systemPrompt = buildSystemPrompt(prompts, 'IFS_PROTECTOR_RESPONSE', params)
  return sendMessage(messages, systemPrompt)
}

/**
 * Self-Energy — Review 8 C's trends over time.
 * Single-call. Returns narrative summary.
 */
export async function reviewSelfEnergyTrends(params: {
  checkIns: IFSSelfEnergyCheckIn[]
  trailheadEntries?: IFSTrailheadEntry[]
  parts?: IFSPart[]
} & AssistOptions): Promise<string> {
  const prompts = getIfsPrompts(params.locale)
  const context = buildSelfEnergyReviewContext(params, prompts)
  const messages: ChatMessage[] = [{ role: 'user', content: context }]
  const systemPrompt = buildSystemPrompt(prompts, 'IFS_SELF_ENERGY_REVIEW', params)
  return sendMessage(messages, systemPrompt)
}

/**
 * Parts Dialogue — Suggest what a part might say when user is stuck.
 * Single-call. Returns in-character suggestion.
 */
export async function suggestPartDialogueResponse(params: {
  part: IFSPart
  dialogue: IFSDialogueMessage[]
  intention: string
} & AssistOptions): Promise<string> {
  const prompts = getIfsPrompts(params.locale)
  const context = buildPartDialogueContext(params, prompts)
  const messages: ChatMessage[] = [{ role: 'user', content: context }]
  const systemPrompt = buildSystemPrompt(prompts, 'IFS_DIALOGUE_ASSIST', params)
  return sendMessage(messages, systemPrompt)
}

/**
 * Daily Check-In — Generate weekly summary of micro-practices.
 * Single-call. Returns narrative summary.
 */
export async function generateWeeklySummary(params: {
  checkIns: IFSDailyCheckIn[]
  parts: IFSPart[]
} & AssistOptions): Promise<string> {
  const prompts = getIfsPrompts(params.locale)
  const context = buildWeeklySummaryContext(params, prompts)
  const messages: ChatMessage[] = [{ role: 'user', content: context }]
  const systemPrompt = buildSystemPrompt(prompts, 'IFS_WEEKLY_SUMMARY', params)
  return sendMessage(messages, systemPrompt)
}

/**
 * Constellation — Analyze system dynamics between parts.
 * Single-call. Returns system analysis text.
 */
export async function analyzeConstellation(params: {
  parts: IFSPart[]
  relationships: IFSConstellationRelationship[]
  cascadeNotes?: string
} & AssistOptions): Promise<string> {
  const prompts = getIfsPrompts(params.locale)
  const context = buildConstellationContext(params, prompts)
  const messages: ChatMessage[] = [{ role: 'user', content: context }]
  const systemPrompt = buildSystemPrompt(prompts, 'IFS_CONSTELLATION_ANALYSIS', params)
  return sendMessage(messages, systemPrompt)
}

// ============================================================================
// Public API — Multi-Turn Assists
// ============================================================================

/**
 * Direct Access — One turn in a multi-turn dialogue with a part.
 * LLM role-plays as the specified part.
 */
export async function directAccessDialogueTurn(params: {
  part: IFSPart
  userMessage: string
  previousMessages?: IFSDialogueMessage[]
} & AssistOptions): Promise<string> {
  const prompts = getIfsPrompts(params.locale)
  const context = buildDirectAccessContext(params, prompts)
  const messages: ChatMessage[] = []

  if (params.previousMessages?.length) {
    // First message includes part context
    messages.push({ role: 'user', content: context })
    // Add conversation history
    for (const msg of params.previousMessages) {
      messages.push({ role: msg.role, content: msg.content })
    }
    // Add current user message
    messages.push({ role: 'user', content: params.userMessage })
  } else {
    // First turn: combine context with user message
    messages.push({ role: 'user', content: `${context}\n\n${params.userMessage}` })
  }

  const systemPrompt = buildSystemPrompt(prompts, 'IFS_DIRECT_ACCESS', params)
  return sendMessage(messages, systemPrompt)
}
