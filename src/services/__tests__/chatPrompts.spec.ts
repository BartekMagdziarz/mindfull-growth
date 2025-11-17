import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getSystemPrompt, constructJournalEntryContext } from '../chatPrompts'
import type { ChatIntention } from '@/domain/chatSession'
import { CHAT_INTENTIONS } from '@/domain/chatSession'
import type { JournalEntry } from '@/domain/journal'
import type { Emotion } from '@/domain/emotion'
import type { PeopleTag, ContextTag } from '@/domain/tag'
import type { useEmotionStore } from '@/stores/emotion.store'
import type { useTagStore } from '@/stores/tag.store'

describe('chatPrompts', () => {
  describe('getSystemPrompt', () => {
    it('returns reflect prompt for reflect intention', () => {
      const prompt = getSystemPrompt(CHAT_INTENTIONS.REFLECT)
      expect(prompt).toBeTruthy()
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(0)
      expect(prompt).toContain('reflection guide')
      expect(prompt).toContain('journal entry')
      expect(prompt).toContain('empathetic')
      expect(prompt).toContain('non-judgmental')
    })

    it('returns help-see-differently prompt for help-see-differently intention', () => {
      const prompt = getSystemPrompt(CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY)
      expect(prompt).toBeTruthy()
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(0)
      expect(prompt).toContain('perspective-shifting')
      expect(prompt).toContain('journal entry')
      expect(prompt).toContain('alternative viewpoints')
      expect(prompt).toContain('non-judgmental')
    })

    it('returns proactive prompt for proactive intention', () => {
      const prompt = getSystemPrompt(CHAT_INTENTIONS.PROACTIVE)
      expect(prompt).toBeTruthy()
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(0)
      expect(prompt).toContain('proactive planning')
      expect(prompt).toContain('journal entry')
      expect(prompt).toContain('actionable steps')
      expect(prompt).toContain('supportive')
    })

    it('returns thinking-traps prompt for thinking-traps intention', () => {
      const prompt = getSystemPrompt(CHAT_INTENTIONS.THINKING_TRAPS)
      expect(prompt).toBeTruthy()
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(0)
      expect(prompt).toContain('cognitive awareness')
      expect(prompt).toContain('journal entry')
      expect(prompt).toContain('cognitive distortions')
      expect(prompt).toContain('supportive')
    })

    it('returns custom prompt when custom intention with customPrompt provided', () => {
      const customPrompt = 'This is my custom prompt for the AI'
      const prompt = getSystemPrompt(CHAT_INTENTIONS.CUSTOM, customPrompt)
      expect(prompt).toBe(customPrompt)
    })

    it('returns default custom prompt when custom intention without customPrompt', () => {
      const prompt = getSystemPrompt(CHAT_INTENTIONS.CUSTOM)
      expect(prompt).toBeTruthy()
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(0)
      expect(prompt).toContain('supportive assistant')
      expect(prompt).toContain('journal entry')
      expect(prompt).toContain('empathetic')
      expect(prompt).toContain('non-judgmental')
    })

    it('returns default custom prompt when custom intention with undefined customPrompt', () => {
      const prompt = getSystemPrompt(CHAT_INTENTIONS.CUSTOM, undefined)
      expect(prompt).toBeTruthy()
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(0)
      expect(prompt).toContain('supportive assistant')
    })

    it('returns default custom prompt when custom intention with empty string customPrompt', () => {
      const prompt = getSystemPrompt(CHAT_INTENTIONS.CUSTOM, '')
      expect(prompt).toBeTruthy()
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(0)
      // Empty string is falsy, so should return default
      expect(prompt).toContain('supportive assistant')
    })

    it('all prompts are non-empty strings', () => {
      const intentions: ChatIntention[] = [
        CHAT_INTENTIONS.REFLECT,
        CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY,
        CHAT_INTENTIONS.PROACTIVE,
        CHAT_INTENTIONS.THINKING_TRAPS,
        CHAT_INTENTIONS.CUSTOM,
      ]

      intentions.forEach((intention) => {
        const prompt = getSystemPrompt(intention)
        expect(prompt).toBeTruthy()
        expect(typeof prompt).toBe('string')
        expect(prompt.length).toBeGreaterThan(0)
      })
    })

    it('all prompts contain expected keywords', () => {
      const reflectPrompt = getSystemPrompt(CHAT_INTENTIONS.REFLECT)
      expect(reflectPrompt).toContain('journal entry')

      const helpSeePrompt = getSystemPrompt(CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY)
      expect(helpSeePrompt).toContain('journal entry')

      const proactivePrompt = getSystemPrompt(CHAT_INTENTIONS.PROACTIVE)
      expect(proactivePrompt).toContain('journal entry')

      const thinkingTrapsPrompt = getSystemPrompt(CHAT_INTENTIONS.THINKING_TRAPS)
      expect(thinkingTrapsPrompt).toContain('journal entry')

      const customPrompt = getSystemPrompt(CHAT_INTENTIONS.CUSTOM)
      expect(customPrompt).toContain('journal entry')
    })
  })

  describe('constructJournalEntryContext', () => {
    let mockEmotionStore: ReturnType<typeof useEmotionStore>
    let mockTagStore: ReturnType<typeof useTagStore>

    beforeEach(() => {
      mockEmotionStore = {
        getEmotionById: vi.fn(),
      } as unknown as ReturnType<typeof useEmotionStore>

      mockTagStore = {
        getPeopleTagById: vi.fn(),
        getContextTagById: vi.fn(),
      } as unknown as ReturnType<typeof useTagStore>
    })

    it('constructs context message with all fields populated', () => {
      const mockEmotion: Emotion = {
        id: 'emotion-1',
        name: 'Happy',
        valence: 1,
        arousal: 1,
      }
      const mockPeopleTag: PeopleTag = { id: 'people-1', name: 'John' }
      const mockContextTag: ContextTag = { id: 'context-1', name: 'Work' }

      const entry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Title',
        body: 'This is the entry body text.',
        emotionIds: ['emotion-1'],
        peopleTagIds: ['people-1'],
        contextTagIds: ['context-1'],
      }

      vi.mocked(mockEmotionStore.getEmotionById).mockReturnValue(mockEmotion)
      vi.mocked(mockTagStore.getPeopleTagById).mockReturnValue(mockPeopleTag)
      vi.mocked(mockTagStore.getContextTagById).mockReturnValue(mockContextTag)

      const context = constructJournalEntryContext(entry, mockEmotionStore, mockTagStore)

      expect(context).toContain('Journal Entry Context:')
      expect(context).toContain('Title: Test Title')
      expect(context).toContain('Emotions: Happy')
      expect(context).toContain('People Tags: John')
      expect(context).toContain('Context Tags: Work')
      expect(context).toContain('Content:')
      expect(context).toContain('This is the entry body text.')
    })

    it('uses "Untitled entry" when title is empty', () => {
      const entry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      const context = constructJournalEntryContext(entry, mockEmotionStore, mockTagStore)

      expect(context).toContain('Title: Untitled entry')
    })

    it('uses "Untitled entry" when title is undefined', () => {
      const entry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }

      const context = constructJournalEntryContext(entry, mockEmotionStore, mockTagStore)

      expect(context).toContain('Title: Untitled entry')
    })

    it('shows "None" when no emotions are present', () => {
      const entry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Title',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      const context = constructJournalEntryContext(entry, mockEmotionStore, mockTagStore)

      expect(context).toContain('Emotions: None')
    })

    it('shows "None" when emotionIds is undefined', () => {
      const entry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Title',
        body: 'Test body',
      }

      const context = constructJournalEntryContext(entry, mockEmotionStore, mockTagStore)

      expect(context).toContain('Emotions: None')
    })

    it('shows "None" for people tags when none are present', () => {
      const entry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Title',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: ['context-1'],
      }

      const mockContextTag: ContextTag = { id: 'context-1', name: 'Work' }
      vi.mocked(mockTagStore.getContextTagById).mockReturnValue(mockContextTag)

      const context = constructJournalEntryContext(entry, mockEmotionStore, mockTagStore)

      expect(context).toContain('People Tags: None')
      expect(context).toContain('Context Tags: Work')
    })

    it('shows "None" for context tags when none are present', () => {
      const entry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Title',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: ['people-1'],
        contextTagIds: [],
      }

      const mockPeopleTag: PeopleTag = { id: 'people-1', name: 'John' }
      vi.mocked(mockTagStore.getPeopleTagById).mockReturnValue(mockPeopleTag)

      const context = constructJournalEntryContext(entry, mockEmotionStore, mockTagStore)

      expect(context).toContain('People Tags: John')
      expect(context).toContain('Context Tags: None')
    })

    it('shows "None" for both tag categories when no tags are present', () => {
      const entry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Title',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      const context = constructJournalEntryContext(entry, mockEmotionStore, mockTagStore)

      expect(context).toContain('People Tags: None')
      expect(context).toContain('Context Tags: None')
    })

    it('handles multiple emotions correctly', () => {
      const mockEmotion1: Emotion = {
        id: 'emotion-1',
        name: 'Happy',
        valence: 1,
        arousal: 1,
      }
      const mockEmotion2: Emotion = {
        id: 'emotion-2',
        name: 'Excited',
        valence: 1,
        arousal: 1,
      }

      const entry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Title',
        body: 'Test body',
        emotionIds: ['emotion-1', 'emotion-2'],
        peopleTagIds: [],
        contextTagIds: [],
      }

      vi.mocked(mockEmotionStore.getEmotionById)
        .mockReturnValueOnce(mockEmotion1)
        .mockReturnValueOnce(mockEmotion2)

      const context = constructJournalEntryContext(entry, mockEmotionStore, mockTagStore)

      expect(context).toContain('Emotions: Happy, Excited')
    })

    it('handles multiple tags correctly', () => {
      const mockPeopleTag1: PeopleTag = { id: 'people-1', name: 'John' }
      const mockPeopleTag2: PeopleTag = { id: 'people-2', name: 'Jane' }
      const mockContextTag1: ContextTag = { id: 'context-1', name: 'Work' }
      const mockContextTag2: ContextTag = { id: 'context-2', name: 'Home' }

      const entry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Title',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: ['people-1', 'people-2'],
        contextTagIds: ['context-1', 'context-2'],
      }

      vi.mocked(mockTagStore.getPeopleTagById)
        .mockReturnValueOnce(mockPeopleTag1)
        .mockReturnValueOnce(mockPeopleTag2)
      vi.mocked(mockTagStore.getContextTagById)
        .mockReturnValueOnce(mockContextTag1)
        .mockReturnValueOnce(mockContextTag2)

      const context = constructJournalEntryContext(entry, mockEmotionStore, mockTagStore)

      expect(context).toContain('People Tags: John, Jane')
      expect(context).toContain('Context Tags: Work, Home')
    })

    it('handles non-existent emotion IDs gracefully', () => {
      const entry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Title',
        body: 'Test body',
        emotionIds: ['non-existent-id'],
        peopleTagIds: [],
        contextTagIds: [],
      }

      vi.mocked(mockEmotionStore.getEmotionById).mockReturnValue(undefined)

      const context = constructJournalEntryContext(entry, mockEmotionStore, mockTagStore)

      expect(context).toContain('Emotions: None')
    })

    it('handles non-existent tag IDs gracefully', () => {
      const entry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Title',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: ['non-existent-id'],
        contextTagIds: ['non-existent-id'],
      }

      vi.mocked(mockTagStore.getPeopleTagById).mockReturnValue(undefined)
      vi.mocked(mockTagStore.getContextTagById).mockReturnValue(undefined)

      const context = constructJournalEntryContext(entry, mockEmotionStore, mockTagStore)

      expect(context).toContain('People Tags: None')
      expect(context).toContain('Context Tags: None')
    })

    it('includes all required sections in the correct format', () => {
      const entry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Title',
        body: 'Test body content',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      const context = constructJournalEntryContext(entry, mockEmotionStore, mockTagStore)

      // Check that all sections are present
      expect(context).toContain('Journal Entry Context:')
      expect(context).toContain('Title:')
      expect(context).toContain('Emotions:')
      expect(context).toContain('People Tags:')
      expect(context).toContain('Context Tags:')
      expect(context).toContain('Content:')

      // Check format (should have newlines)
      const lines = context.split('\n')
      expect(lines.length).toBeGreaterThan(5)
    })

    it('handles empty body text', () => {
      const entry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Title',
        body: '',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      const context = constructJournalEntryContext(entry, mockEmotionStore, mockTagStore)

      expect(context).toContain('Content:')
      // Body should be empty but Content: line should still be present
      const contentIndex = context.indexOf('Content:')
      const afterContent = context.substring(contentIndex + 'Content:'.length)
      expect(afterContent.trim()).toBe('')
    })

    it('handles very long body text', () => {
      const longBody = 'A'.repeat(1000)
      const entry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Title',
        body: longBody,
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      const context = constructJournalEntryContext(entry, mockEmotionStore, mockTagStore)

      expect(context).toContain(longBody)
      expect(context.length).toBeGreaterThan(1000)
    })
  })
})

