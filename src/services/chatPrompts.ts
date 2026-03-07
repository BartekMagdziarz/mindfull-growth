import type { ChatIntention } from '@/domain/chatSession'
import { CHAT_INTENTIONS } from '@/domain/chatSession'
import type { JournalEntry } from '@/domain/journal'
import type { useEmotionStore } from '@/stores/emotion.store'
import type { useTagStore } from '@/stores/tag.store'

// System prompts for each chat intention
const SYSTEM_PROMPTS: Record<Exclude<ChatIntention, 'custom'>, string> = {
  [CHAT_INTENTIONS.REFLECT]:
    'You are a supportive reflection guide helping the user explore their journal entry. Use the entry\'s title, content, emotions, and tags to help them understand deeper meanings, recognize patterns in their thoughts and feelings, and gain self-awareness. Ask thoughtful, open-ended questions that encourage reflection. Keep conversations concise (3-5 exchanges). Be empathetic and non-judgmental. Do not make clinical diagnoses.',
  [CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY]:
    'You are a perspective-shifting guide helping the user see their journal entry from different angles. Use the entry\'s context to gently challenge assumptions, suggest alternative viewpoints, and help them reframe their thinking. Ask questions that open up new possibilities. Keep conversations concise (3-5 exchanges). Be supportive and non-judgmental. Do not make clinical diagnoses.',
  [CHAT_INTENTIONS.PROACTIVE]:
    'You are a proactive planning assistant helping the user identify actionable steps based on their journal entry. Use the entry\'s context to help them move from reflection to action, identify concrete steps they can take, and develop proactive solutions. Ask questions that help them think about what they can do. Keep conversations concise (3-5 exchanges). Be encouraging and supportive. Do not make clinical diagnoses.',
  [CHAT_INTENTIONS.THINKING_TRAPS]:
    'You are a cognitive awareness guide helping the user identify unhelpful thinking patterns in their journal entry. Use the entry\'s context to gently point out potential cognitive distortions (like all-or-nothing thinking, catastrophizing, or overgeneralization) and help them reframe these thoughts. Ask questions that help them recognize thinking traps. Keep conversations concise (3-5 exchanges). Be educational and supportive, not critical. Do not make clinical diagnoses.',
}

// Default custom prompt when no custom prompt is provided
const DEFAULT_CUSTOM_PROMPT =
  'You are a supportive assistant helping the user explore their journal entry. Use the entry\'s context to have a helpful conversation based on the user\'s specific needs. Keep conversations concise (3-5 exchanges). Be empathetic and non-judgmental. Do not make clinical diagnoses.'

/**
 * Returns the system prompt for a given chat intention.
 * For "custom" intention, returns the provided customPrompt or a default prompt.
 *
 * @param intention - The chat intention type
 * @param customPrompt - Optional custom prompt (only used when intention is "custom")
 * @returns The system prompt string
 */
export function getSystemPrompt(
  intention: ChatIntention,
  customPrompt?: string
): string {
  if (intention === CHAT_INTENTIONS.CUSTOM) {
    return customPrompt || DEFAULT_CUSTOM_PROMPT
  }
  return SYSTEM_PROMPTS[intention]
}

/**
 * Constructs a formatted context message from a journal entry for the LLM.
 * Resolves emotion and tag IDs to their names using the provided stores.
 *
 * @param entry - The journal entry to construct context from
 * @param emotionStore - The emotion store instance to resolve emotion IDs
 * @param tagStore - The tag store instance to resolve tag IDs
 * @returns A formatted context message string
 */
export function constructJournalEntryContext(
  entry: JournalEntry,
  emotionStore: ReturnType<typeof useEmotionStore>,
  tagStore: ReturnType<typeof useTagStore>
): string {
  const title = entry.title || 'Untitled entry'
  const body = entry.body || ''

  // Resolve emotion names
  const emotionNames: string[] = []
  if (entry.emotionIds && entry.emotionIds.length > 0) {
    for (const emotionId of entry.emotionIds) {
      const emotion = emotionStore.getEmotionById(emotionId)
      if (emotion) {
        emotionNames.push(emotion.name)
      }
    }
  }
  const emotionsText = emotionNames.length > 0 ? emotionNames.join(', ') : 'None'

  // Resolve people tag names
  const peopleTagNames: string[] = []
  if (entry.peopleTagIds && entry.peopleTagIds.length > 0) {
    for (const tagId of entry.peopleTagIds) {
      const tag = tagStore.getPeopleTagById(tagId)
      if (tag) {
        peopleTagNames.push(tag.name)
      }
    }
  }
  const peopleTagsText =
    peopleTagNames.length > 0 ? peopleTagNames.join(', ') : 'None'

  // Resolve context tag names
  const contextTagNames: string[] = []
  if (entry.contextTagIds && entry.contextTagIds.length > 0) {
    for (const tagId of entry.contextTagIds) {
      const tag = tagStore.getContextTagById(tagId)
      if (tag) {
        contextTagNames.push(tag.name)
      }
    }
  }
  const contextTagsText =
    contextTagNames.length > 0 ? contextTagNames.join(', ') : 'None'

  // Format context message according to Story 4 specification
  return `Journal Entry Context:
Title: ${title}
Emotions: ${emotionsText}
People Tags: ${peopleTagsText}
Context Tags: ${contextTagsText}
Content:
${body}`
}

