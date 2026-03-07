/**
 * LLM Assist functions for CBT exercises.
 *
 * Each function wraps sendMessage() from llmService with exercise-specific
 * system prompts and context formatting. Supports single-call and
 * conversational (multi-turn) assists.
 */

import { sendMessage, type ChatMessage } from '@/services/llmService'
import type { LocaleId } from '@/services/locale.service'
import { getCbtPrompts } from '@/services/prompts'
import type { CbtPromptModule } from '@/services/prompts/types'

// ============================================================================
// Context Builders
// ============================================================================

function buildThoughtRecordContext(
  params: {
    situation: string
    emotions?: Array<{ name: string; intensity: number }>
    automaticThoughts?: string[]
    hotThought?: string
    evidenceFor?: string[]
    evidenceAgainst?: string[]
  },
  labels: CbtPromptModule['labels'],
): string {
  const parts: string[] = []
  parts.push(`${labels.situation}: ${params.situation}`)

  if (params.emotions?.length) {
    const emotionStr = params.emotions
      .map((e) => `${e.name} (${e.intensity}%)`)
      .join(', ')
    parts.push(`${labels.emotions}: ${emotionStr}`)
  }

  if (params.automaticThoughts?.length) {
    parts.push(`${labels.automaticThoughts}:\n${params.automaticThoughts.map((t, i) => `${i + 1}. ${t}`).join('\n')}`)
  }

  if (params.hotThought) {
    parts.push(`${labels.hotThought}: "${params.hotThought}"`)
  }

  if (params.evidenceFor?.length) {
    parts.push(`${labels.evidenceForHotThought}:\n${params.evidenceFor.map((e, i) => `${i + 1}. ${e}`).join('\n')}`)
  }

  if (params.evidenceAgainst?.length) {
    parts.push(`${labels.evidenceAgainstHotThought}:\n${params.evidenceAgainst.map((e, i) => `${i + 1}. ${e}`).join('\n')}`)
  }

  return parts.join('\n\n')
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Thought Record — Assist 1: Help identify automatic thoughts.
 * Single-call. Returns suggested thoughts as text.
 */
export async function identifyThoughts(params: {
  situation: string
  emotions: Array<{ name: string; intensity: number }>
  locale: LocaleId
}): Promise<string> {
  const prompts = getCbtPrompts(params.locale)
  const context = buildThoughtRecordContext(params, prompts.labels)
  const messages: ChatMessage[] = [{ role: 'user', content: context }]
  return sendMessage(messages, prompts.THOUGHT_RECORD_IDENTIFY_THOUGHTS)
}

/**
 * Thought Record — Assist 2: Help find evidence against the hot thought.
 * Supports conversational follow-up.
 */
export async function findEvidence(params: {
  situation: string
  emotions: Array<{ name: string; intensity: number }>
  hotThought: string
  evidenceFor: string[]
  evidenceAgainst?: string[]
  conversationHistory?: ChatMessage[]
  previousMessages?: Array<{ role: 'assistant' | 'user'; content: string }>
  locale: LocaleId
}): Promise<string> {
  const prompts = getCbtPrompts(params.locale)
  const context = buildThoughtRecordContext(params, prompts.labels)
  const history = params.conversationHistory ?? params.previousMessages ?? []
  const messages: ChatMessage[] = [
    { role: 'user', content: context },
    ...history,
  ]
  return sendMessage(messages, prompts.THOUGHT_RECORD_FIND_EVIDENCE)
}

/**
 * Thought Record — Assist 3: Help reframe into balanced thoughts.
 * Supports conversational follow-up.
 */
export async function reframeThought(params: {
  situation: string
  emotions: Array<{ name: string; intensity: number }>
  automaticThoughts?: string[]
  hotThought: string
  evidenceFor: string[]
  evidenceAgainst: string[]
  conversationHistory?: ChatMessage[]
  previousMessages?: Array<{ role: 'assistant' | 'user'; content: string }>
  locale: LocaleId
}): Promise<string> {
  const prompts = getCbtPrompts(params.locale)
  const context = buildThoughtRecordContext(params, prompts.labels)
  const history = params.conversationHistory ?? params.previousMessages ?? []
  const messages: ChatMessage[] = [
    { role: 'user', content: context },
    ...history,
  ]
  return sendMessage(messages, prompts.THOUGHT_RECORD_REFRAME)
}

/**
 * Cognitive Distortions — "Help me spot the traps".
 * Single-call. Returns identified distortions with explanations.
 */
export async function spotDistortions(params: {
  thought: string
  situation?: string
  locale: LocaleId
}): Promise<string> {
  const prompts = getCbtPrompts(params.locale)
  const l = prompts.labels
  let content = `${l.thought}: "${params.thought}"`
  if (params.situation) {
    content += `\n\n${l.contextSituation}: ${params.situation}`
  }
  const messages: ChatMessage[] = [{ role: 'user', content }]
  return sendMessage(messages, prompts.DISTORTION_SPOT_TRAPS)
}

// ============================================================================
// Phase 2 Public API
// ============================================================================

/**
 * Core Beliefs — Assist 1: Guide the Downward Arrow process.
 * Conversational. Returns either the next question or the identified belief.
 */
export async function guideCoreBeliefExploration(params: {
  startingThought: string
  downwardArrowSteps: string[]
  previousMessages?: Array<{ role: 'assistant' | 'user'; content: string }>
  locale: LocaleId
}): Promise<string> {
  const prompts = getCbtPrompts(params.locale)
  const l = prompts.labels
  const parts: string[] = []
  parts.push(`${l.startingAutomaticThought}: "${params.startingThought}"`)

  if (params.downwardArrowSteps.length > 0) {
    parts.push(
      `${l.downwardArrowAnswers}:\n${params.downwardArrowSteps.map((s, i) => `${i + 1}. "${s}"`).join('\n')}`,
    )
  }

  const history = params.previousMessages ?? []
  const messages: ChatMessage[] = [
    { role: 'user', content: parts.join('\n\n') },
    ...history,
  ]
  return sendMessage(messages, prompts.CORE_BELIEFS_IDENTIFY)
}

/**
 * Core Beliefs — Assist 2: Help develop alternative beliefs.
 * Supports conversational follow-up.
 */
export async function suggestAlternativeBeliefs(params: {
  coreBelief: string
  beliefCategory: 'self' | 'others' | 'world'
  evidenceFor: string[]
  evidenceAgainst: string[]
  previousMessages?: Array<{ role: 'assistant' | 'user'; content: string }>
  locale: LocaleId
}): Promise<string> {
  const prompts = getCbtPrompts(params.locale)
  const l = prompts.labels
  const parts: string[] = []
  parts.push(`${l.coreBelief}: "${params.coreBelief}"`)
  parts.push(`${l.category}: ${params.beliefCategory}`)

  if (params.evidenceFor.length > 0) {
    parts.push(
      `${l.evidenceForBelief}:\n${params.evidenceFor.map((e, i) => `${i + 1}. ${e}`).join('\n')}`,
    )
  }

  if (params.evidenceAgainst.length > 0) {
    parts.push(
      `${l.evidenceAgainstBelief}:\n${params.evidenceAgainst.map((e, i) => `${i + 1}. ${e}`).join('\n')}`,
    )
  }

  const history = params.previousMessages ?? []
  const messages: ChatMessage[] = [
    { role: 'user', content: parts.join('\n\n') },
    ...history,
  ]
  return sendMessage(messages, prompts.CORE_BELIEFS_ALTERNATIVE)
}

/**
 * Compassionate Letter — Help write a compassionate response.
 * Single-call. Returns a draft compassionate response.
 */
export async function guideCompassionateResponse(params: {
  situation: string
  emotions: Array<{ name: string; intensity?: number }>
  selfCriticalThoughts: string[]
  locale: LocaleId
}): Promise<string> {
  const prompts = getCbtPrompts(params.locale)
  const l = prompts.labels
  const parts: string[] = []
  parts.push(`${l.situation}: ${params.situation}`)

  if (params.emotions.length > 0) {
    const emotionStr = params.emotions
      .map((e) => (e.intensity ? `${e.name} (${e.intensity}%)` : e.name))
      .join(', ')
    parts.push(`${l.emotions}: ${emotionStr}`)
  }

  if (params.selfCriticalThoughts.length > 0) {
    parts.push(
      `${l.selfCriticalThoughts}:\n${params.selfCriticalThoughts.map((t, i) => `${i + 1}. "${t}"`).join('\n')}`,
    )
  }

  const messages: ChatMessage[] = [{ role: 'user', content: parts.join('\n\n') }]
  return sendMessage(messages, prompts.COMPASSIONATE_LETTER_GUIDE)
}

// ============================================================================
// Phase 3 Public API
// ============================================================================

/**
 * Behavioral Experiment — Help design an experiment to test a belief.
 * Single-call. Returns experiment design suggestions.
 */
export async function designBehavioralExperiment(params: {
  targetBelief: string
  prediction: string
  predictionConfidence: number
  locale: LocaleId
}): Promise<string> {
  const prompts = getCbtPrompts(params.locale)
  const l = prompts.labels
  const parts: string[] = []
  parts.push(`${l.targetBelief}: "${params.targetBelief}"`)
  parts.push(`${l.prediction}: "${params.prediction}"`)
  parts.push(`${l.confidenceInPrediction}: ${params.predictionConfidence}%`)

  const messages: ChatMessage[] = [{ role: 'user', content: parts.join('\n\n') }]
  return sendMessage(messages, prompts.BEHAVIORAL_EXPERIMENT_DESIGN)
}

/**
 * Structured Problem Solving — Brainstorm solutions.
 * Single-call. Returns 4-6 solution ideas.
 */
export async function brainstormSolutions(params: {
  problemStatement: string
  emotions?: string[]
  locale: LocaleId
}): Promise<string> {
  const prompts = getCbtPrompts(params.locale)
  const l = prompts.labels
  const parts: string[] = []
  parts.push(`${l.problem}: ${params.problemStatement}`)

  if (params.emotions?.length) {
    parts.push(`${l.currentEmotions}: ${params.emotions.join(', ')}`)
  }

  const messages: ChatMessage[] = [{ role: 'user', content: parts.join('\n\n') }]
  return sendMessage(messages, prompts.PROBLEM_SOLVING_BRAINSTORM)
}

/**
 * Structured Problem Solving — Evaluate solutions.
 * Single-call. Returns analysis and recommendation.
 */
export async function evaluateSolutions(params: {
  problemStatement: string
  solutions: Array<{ description: string; pros: string[]; cons: string[] }>
  locale: LocaleId
}): Promise<string> {
  const prompts = getCbtPrompts(params.locale)
  const l = prompts.labels
  const parts: string[] = []
  parts.push(`${l.problem}: ${params.problemStatement}`)

  if (params.solutions.length > 0) {
    const solutionStr = params.solutions
      .map((s, i) => {
        const pros = s.pros.length > 0 ? `${l.pros}: ${s.pros.join(', ')}` : `${l.pros}: ${l.noneListed}`
        const cons = s.cons.length > 0 ? `${l.cons}: ${s.cons.join(', ')}` : `${l.cons}: ${l.noneListed}`
        return `${i + 1}. ${s.description}\n   ${pros}\n   ${cons}`
      })
      .join('\n')
    parts.push(`${l.solutions}:\n${solutionStr}`)
  }

  const messages: ChatMessage[] = [{ role: 'user', content: parts.join('\n\n') }]
  return sendMessage(messages, prompts.PROBLEM_SOLVING_EVALUATE)
}

// ============================================================================
// Phase 2 — Positive Data Log
// ============================================================================

/**
 * Positive Data Log — Periodic review summary.
 * Single-call. Returns a warm review of collected evidence.
 */
export async function reviewPositiveDataLog(params: {
  targetBelief: string
  entries: Array<{ date: string; evidence: string }>
  believabilityInitial: number
  believabilityLatest?: number
  locale: LocaleId
}): Promise<string> {
  const prompts = getCbtPrompts(params.locale)
  const l = prompts.labels
  const parts: string[] = []
  parts.push(`${l.targetBelief}: "${params.targetBelief}"`)
  parts.push(`${l.initialBelievability}: ${params.believabilityInitial}%`)

  if (params.believabilityLatest !== undefined) {
    parts.push(`${l.currentBelievability}: ${params.believabilityLatest}%`)
  }

  if (params.entries.length > 0) {
    const entryStr = params.entries
      .map((e, i) => `${i + 1}. [${e.date}] ${e.evidence}`)
      .join('\n')
    parts.push(`${l.evidenceEntries}:\n${entryStr}`)
  }

  const messages: ChatMessage[] = [{ role: 'user', content: parts.join('\n\n') }]
  return sendMessage(messages, prompts.POSITIVE_DATA_LOG_REVIEW)
}

// ============================================================================
// Phase 3 — Behavioral Activation
// ============================================================================

/**
 * Behavioral Activation — Suggest activities aligned with values.
 * Single-call. Returns 4-6 activity suggestions.
 */
export async function suggestActivities(params: {
  overallMood: number
  existingActivities?: Array<{ activity: string; category: string }>
  locale: LocaleId
}): Promise<string> {
  const prompts = getCbtPrompts(params.locale)
  const l = prompts.labels
  const parts: string[] = []
  parts.push(`${l.currentMoodBaseline}: ${params.overallMood}/10`)

  if (params.existingActivities?.length) {
    const existing = params.existingActivities
      .map((a) => `- ${a.activity} (${a.category})`)
      .join('\n')
    parts.push(`${l.alreadyPlanned}:\n${existing}`)
  }

  const messages: ChatMessage[] = [{ role: 'user', content: parts.join('\n\n') }]
  return sendMessage(messages, prompts.BEHAVIORAL_ACTIVATION_SUGGEST)
}

/**
 * Behavioral Activation — Week-end analysis.
 * Single-call. Returns a review of completed activities.
 */
export async function reviewActivationWeek(params: {
  overallMoodStart: number
  activities: Array<{
    activity: string
    category: string
    completed: boolean
    moodBefore?: number
    moodAfter?: number
  }>
  locale: LocaleId
}): Promise<string> {
  const prompts = getCbtPrompts(params.locale)
  const l = prompts.labels
  const parts: string[] = []
  parts.push(`${l.baselineMood}: ${params.overallMoodStart}/10`)

  const completedCount = params.activities.filter((a) => a.completed).length
  parts.push(`${l.activities}: ${completedCount}/${params.activities.length} ${l.completed}`)

  if (params.activities.length > 0) {
    const activityStr = params.activities
      .map((a) => {
        let line = `- ${a.activity} (${a.category})`
        if (a.completed) {
          line += ` ${l.done}`
          if (a.moodBefore !== undefined && a.moodAfter !== undefined) {
            line += ` ${l.mood}: ${a.moodBefore} → ${a.moodAfter}`
          }
        } else {
          line += ` ${l.notCompleted}`
        }
        return line
      })
      .join('\n')
    parts.push(`${l.activityDetails}:\n${activityStr}`)
  }

  const messages: ChatMessage[] = [{ role: 'user', content: parts.join('\n\n') }]
  return sendMessage(messages, prompts.BEHAVIORAL_ACTIVATION_REVIEW)
}

// ============================================================================
// Phase 4 — Graded Exposure
// ============================================================================

/**
 * Graded Exposure — Brainstorm hierarchy steps.
 * Single-call. Returns 6-10 suggested exposure situations with SUDS ratings.
 */
export async function brainstormExposureSteps(params: {
  fearTarget: string
  ultimateGoal: string
  existingItems?: Array<{ situation: string; sudsRating: number }>
  locale: LocaleId
}): Promise<string> {
  const prompts = getCbtPrompts(params.locale)
  const l = prompts.labels
  const parts: string[] = []
  parts.push(`${l.fearTarget}: "${params.fearTarget}"`)
  parts.push(`${l.ultimateGoal}: "${params.ultimateGoal}"`)

  if (params.existingItems?.length) {
    const existing = params.existingItems
      .map((item) => `- SUDS ${item.sudsRating}: ${item.situation}`)
      .join('\n')
    parts.push(`${l.alreadyInHierarchy}:\n${existing}`)
  }

  const messages: ChatMessage[] = [{ role: 'user', content: parts.join('\n\n') }]
  return sendMessage(messages, prompts.GRADED_EXPOSURE_BRAINSTORM)
}
