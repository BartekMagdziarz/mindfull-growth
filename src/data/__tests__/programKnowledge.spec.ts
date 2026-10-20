import { describe, expect, it } from 'vitest'
import { getProgramDefinition } from '@/data/programCatalog'
import { PROGRAM_KNOWLEDGE, orderedKnowledgeCards } from '@/data/programKnowledge'
import enKnowledge from '@/locales/en/programKnowledge.json'
import plKnowledge from '@/locales/pl/programKnowledge.json'

type Card = { title?: string; lead?: string; body?: string[]; sources?: string[] }

describe('program knowledge cards', () => {
  it('have unique keys, real programs and phases, and copy in both locales', () => {
    const keys = PROGRAM_KNOWLEDGE.map((card) => card.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const card of PROGRAM_KNOWLEDGE) {
      const program = getProgramDefinition(card.programSlug)
      expect(program, card.key).toBeDefined()
      const phaseKeys = new Set((program?.phases ?? []).map((phase) => phase.key))
      for (const phaseKey of card.phaseKeys) expect(phaseKeys.has(phaseKey), `${card.key} → ${phaseKey}`).toBe(true)
      for (const locale of [plKnowledge, enKnowledge]) {
        const copy = (locale as Record<string, Card>)[card.i18nKey]
        expect(copy?.title, `${card.key} title`).toBeTruthy()
        expect(copy?.lead, `${card.key} lead`).toBeTruthy()
        expect(copy?.body?.length, `${card.key} body`).toBeGreaterThanOrEqual(2)
        const words = copy!.body!.join(' ').split(/\s+/).length
        expect(words, `${card.key} length`).toBeGreaterThanOrEqual(100)
        expect(copy?.sources?.length, `${card.key} sources`).toBeGreaterThan(0)
      }
    }
  })

  it('orders pinned cards first, then the current phase, then the rest', () => {
    const keys = orderedKnowledgeCards('shame-compassion', 'w5').map((card) => card.key)
    expect(keys.slice(0, 2)).toEqual(['whenWarmthHurts', 'whenTooMuch'])
    expect(keys.slice(2, 5)).toEqual(['compassParts', 'criticProtector', 'notIndulgence'])
    expect(keys).toHaveLength(PROGRAM_KNOWLEDGE.filter((card) => card.programSlug === 'shame-compassion').length)
  })
})
