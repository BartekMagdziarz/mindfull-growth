import type { ChatIntention } from '@/domain/chatSession'
import { CHAT_INTENTIONS } from '@/domain/chatSession'
import type { JournalEntry } from '@/domain/journal'
import type { useEmotionStore } from '@/stores/emotion.store'
import type { useTagStore } from '@/stores/tag.store'
import type { LocaleId } from '@/services/locale.service'
import { getChatPrompts } from '@/services/prompts'

/**
 * Returns the system prompt for a given chat intention.
 * For "custom" intention, returns the provided customPrompt or a default prompt.
 *
 * @param intention - The chat intention type
 * @param customPrompt - Optional custom prompt (only used when intention is "custom")
 * @param locale - The user's locale
 * @returns The system prompt string
 */
export function getSystemPrompt(
  intention: ChatIntention,
  customPrompt: string | undefined,
  locale: LocaleId,
): string {
  if (intention === CHAT_INTENTIONS.CUSTOM) {
    return customPrompt || getChatPrompts(locale).defaultCustom
  }
  const prompts = getChatPrompts(locale)
  const promptMap: Record<Exclude<ChatIntention, 'custom'>, string> = {
    [CHAT_INTENTIONS.REFLECT]: prompts.reflect,
    [CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY]: prompts.helpSeeDifferently,
    [CHAT_INTENTIONS.PROACTIVE]: prompts.proactive,
    [CHAT_INTENTIONS.THINKING_TRAPS]: prompts.thinkingTraps,
  }
  return promptMap[intention]
}

/**
 * Constructs a formatted context message from a journal entry for the LLM.
 * Resolves emotion and tag IDs to their names using the provided stores.
 *
 * @param entry - The journal entry to construct context from
 * @param emotionStore - The emotion store instance to resolve emotion IDs
 * @param tagStore - The tag store instance to resolve tag IDs
 * @param locale - The user's locale
 * @returns A formatted context message string
 */
export function constructJournalEntryContext(
  entry: JournalEntry,
  emotionStore: ReturnType<typeof useEmotionStore>,
  tagStore: ReturnType<typeof useTagStore>,
  locale: LocaleId,
): string {
  const l = getChatPrompts(locale).labels
  const title = entry.title || l.untitledEntry
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
  const emotionsText = emotionNames.length > 0 ? emotionNames.join(', ') : l.none

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
    peopleTagNames.length > 0 ? peopleTagNames.join(', ') : l.none

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
    contextTagNames.length > 0 ? contextTagNames.join(', ') : l.none

  // Format context message
  return `${l.journalEntryContext}
${l.title}: ${title}
${l.emotions}: ${emotionsText}
${l.peopleTags}: ${peopleTagsText}
${l.contextTags}: ${contextTagsText}
${l.content}
${body}`
}
