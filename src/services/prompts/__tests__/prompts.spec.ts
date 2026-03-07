import { describe, it, expect } from 'vitest'
import { getCbtPrompts, getLogotherapyPrompts, getIfsPrompts, getChatPrompts } from '../index'
import type { CbtPromptModule, LogotherapyPromptModule, IfsPromptModule, ChatPromptModule } from '../types'

describe('prompt modules', () => {
  describe('getCbtPrompts', () => {
    const cbtKeys: (keyof Omit<CbtPromptModule, 'labels'>)[] = [
      'THOUGHT_RECORD_IDENTIFY_THOUGHTS',
      'THOUGHT_RECORD_FIND_EVIDENCE',
      'THOUGHT_RECORD_REFRAME',
      'CORE_BELIEFS_IDENTIFY',
      'CORE_BELIEFS_ALTERNATIVE',
      'COMPASSIONATE_LETTER_GUIDE',
      'BEHAVIORAL_EXPERIMENT_DESIGN',
      'PROBLEM_SOLVING_BRAINSTORM',
      'PROBLEM_SOLVING_EVALUATE',
      'POSITIVE_DATA_LOG_REVIEW',
      'BEHAVIORAL_ACTIVATION_SUGGEST',
      'BEHAVIORAL_ACTIVATION_REVIEW',
      'GRADED_EXPOSURE_BRAINSTORM',
      'DISTORTION_SPOT_TRAPS',
    ]

    it('returns all required prompt keys for English', () => {
      const prompts = getCbtPrompts('en')
      for (const key of cbtKeys) {
        expect(prompts[key], `missing key: ${key}`).toBeTruthy()
        expect(typeof prompts[key]).toBe('string')
      }
      expect(prompts.labels).toBeDefined()
      expect(prompts.labels.situation).toBeTruthy()
    })

    it('returns all required prompt keys for Polish', () => {
      const prompts = getCbtPrompts('pl')
      for (const key of cbtKeys) {
        expect(prompts[key], `missing key: ${key}`).toBeTruthy()
        expect(typeof prompts[key]).toBe('string')
      }
      expect(prompts.labels).toBeDefined()
      expect(prompts.labels.situation).toBeTruthy()
    })

    it('Polish prompts contain Polish language instruction', () => {
      const prompts = getCbtPrompts('pl')
      for (const key of cbtKeys) {
        expect(prompts[key]).toContain('po polsku')
      }
    })

    it('English prompts do NOT contain Polish instruction', () => {
      const prompts = getCbtPrompts('en')
      for (const key of cbtKeys) {
        expect(prompts[key]).not.toContain('po polsku')
      }
    })

    it('falls back to English for unknown locale', () => {
      const prompts = getCbtPrompts('xx' as never)
      const enPrompts = getCbtPrompts('en')
      expect(prompts).toBe(enPrompts)
    })
  })

  describe('getLogotherapyPrompts', () => {
    const logoKeys: (keyof Omit<LogotherapyPromptModule, 'labels' | 'socraticPrompts' | 'tragicOptimismPrompts'>)[] = [
      'THREE_PATHWAYS_SYNTHESIS',
      'SOCRATIC_DIALOGUE_MEANING',
      'SOCRATIC_DIALOGUE_EMPTINESS',
      'SOCRATIC_DIALOGUE_SUFFERING',
      'SOCRATIC_DIALOGUE_VALUES',
      'SOCRATIC_DIALOGUE_DECISION',
      'MOUNTAIN_RANGE_SYNTHESIS',
      'PARADOXICAL_INTENTION_CRAFT',
      'TRAGIC_OPTIMISM_SUFFERING',
      'TRAGIC_OPTIMISM_GUILT',
      'TRAGIC_OPTIMISM_FINITUDE',
      'ATTITUDINAL_SHIFT_REFRAME',
      'LEGACY_LETTER_DISCUSS',
    ]

    it('returns all required prompt keys for English', () => {
      const prompts = getLogotherapyPrompts('en')
      for (const key of logoKeys) {
        expect(prompts[key], `missing key: ${key}`).toBeTruthy()
        expect(typeof prompts[key]).toBe('string')
      }
      expect(prompts.socraticPrompts).toBeDefined()
      expect(prompts.tragicOptimismPrompts).toBeDefined()
      expect(prompts.labels).toBeDefined()
    })

    it('returns all required prompt keys for Polish', () => {
      const prompts = getLogotherapyPrompts('pl')
      for (const key of logoKeys) {
        expect(prompts[key], `missing key: ${key}`).toBeTruthy()
        expect(typeof prompts[key]).toBe('string')
      }
    })

    it('Polish prompts contain Polish language instruction', () => {
      const prompts = getLogotherapyPrompts('pl')
      for (const key of logoKeys) {
        expect(prompts[key]).toContain('po polsku')
      }
    })

    it('socratic prompt maps have correct keys', () => {
      const en = getLogotherapyPrompts('en')
      expect(en.socraticPrompts.meaning).toBeTruthy()
      expect(en.socraticPrompts.emptiness).toBeTruthy()
      expect(en.socraticPrompts.suffering).toBeTruthy()
      expect(en.socraticPrompts.values).toBeTruthy()
      expect(en.socraticPrompts.decision).toBeTruthy()
    })

    it('tragic optimism prompt maps have correct keys', () => {
      const en = getLogotherapyPrompts('en')
      expect(en.tragicOptimismPrompts.suffering).toBeTruthy()
      expect(en.tragicOptimismPrompts.guilt).toBeTruthy()
      expect(en.tragicOptimismPrompts.finitude).toBeTruthy()
    })

    it('falls back to English for unknown locale', () => {
      const prompts = getLogotherapyPrompts('xx' as never)
      const enPrompts = getLogotherapyPrompts('en')
      expect(prompts).toBe(enPrompts)
    })
  })

  describe('getIfsPrompts', () => {
    const ifsKeys: (keyof Omit<IfsPromptModule, 'labels'>)[] = [
      'IFS_PARTS_REFLECTION',
      'IFS_DIRECT_ACCESS',
      'IFS_TRAILHEAD_ANALYSIS',
      'IFS_PROTECTOR_RESPONSE',
      'IFS_SELF_ENERGY_REVIEW',
      'IFS_DIALOGUE_ASSIST',
      'IFS_WEEKLY_SUMMARY',
      'IFS_CONSTELLATION_ANALYSIS',
    ]

    it('returns all required prompt keys for English', () => {
      const prompts = getIfsPrompts('en')
      for (const key of ifsKeys) {
        expect(prompts[key], `missing key: ${key}`).toBeTruthy()
        expect(typeof prompts[key]).toBe('string')
      }
      expect(prompts.labels).toBeDefined()
    })

    it('returns all required prompt keys for Polish', () => {
      const prompts = getIfsPrompts('pl')
      for (const key of ifsKeys) {
        expect(prompts[key], `missing key: ${key}`).toBeTruthy()
        expect(typeof prompts[key]).toBe('string')
      }
    })

    it('Polish prompts contain Polish language instruction', () => {
      const prompts = getIfsPrompts('pl')
      for (const key of ifsKeys) {
        expect(prompts[key]).toContain('po polsku')
      }
    })

    it('falls back to English for unknown locale', () => {
      const prompts = getIfsPrompts('xx' as never)
      const enPrompts = getIfsPrompts('en')
      expect(prompts).toBe(enPrompts)
    })
  })

  describe('getChatPrompts', () => {
    const chatKeys: (keyof Omit<ChatPromptModule, 'labels'>)[] = [
      'reflect',
      'helpSeeDifferently',
      'proactive',
      'thinkingTraps',
      'defaultCustom',
    ]

    it('returns all required prompt keys for English', () => {
      const prompts = getChatPrompts('en')
      for (const key of chatKeys) {
        expect(prompts[key], `missing key: ${key}`).toBeTruthy()
        expect(typeof prompts[key]).toBe('string')
      }
      expect(prompts.labels).toBeDefined()
      expect(prompts.labels.journalEntryContext).toBeTruthy()
    })

    it('returns all required prompt keys for Polish', () => {
      const prompts = getChatPrompts('pl')
      for (const key of chatKeys) {
        expect(prompts[key], `missing key: ${key}`).toBeTruthy()
        expect(typeof prompts[key]).toBe('string')
      }
    })

    it('Polish prompts contain Polish language instruction', () => {
      const prompts = getChatPrompts('pl')
      for (const key of chatKeys) {
        expect(prompts[key]).toContain('po polsku')
      }
    })

    it('Polish labels are translated', () => {
      const pl = getChatPrompts('pl')
      const en = getChatPrompts('en')
      expect(pl.labels.journalEntryContext).not.toBe(en.labels.journalEntryContext)
      expect(pl.labels.emotions).not.toBe(en.labels.emotions)
    })

    it('falls back to English for unknown locale', () => {
      const prompts = getChatPrompts('xx' as never)
      const enPrompts = getChatPrompts('en')
      expect(prompts).toBe(enPrompts)
    })
  })
})
