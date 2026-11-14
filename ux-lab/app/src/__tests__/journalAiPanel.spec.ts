import { describe, expect, it } from 'vitest'
import {
  archivePlaceFor,
  messageCountLabel,
  sampleFor,
  separateChatFor,
  startersFor,
  topics,
  topicsPlaceFor,
  variants,
} from '~lab/lab/journalAiPanel'

describe('journal AI panel (round 1)', () => {
  it('every proposal moves the earlier conversation out of the bottom of the log', () => {
    expect(archivePlaceFor('current')).toBe('bottom')
    for (const v of variants.filter(v => v.id !== 'current')) expect(archivePlaceFor(v.id)).not.toBe('bottom')
    expect(archivePlaceFor('a')).toBe('top')
    expect(archivePlaceFor('d')).toBe('gear')
  })

  it('no proposal keeps the floating „Propozycje tematów” toggle; A and B share the composer disc', () => {
    expect(topicsPlaceFor('current')).toBe('toggle')
    for (const v of variants.filter(v => v.id !== 'current')) expect(topicsPlaceFor(v.id)).not.toBe('toggle')
    expect(topicsPlaceFor('a')).toBe('composer-disc')
    expect(topicsPlaceFor('b')).toBe('composer-disc')
    expect(topicsPlaceFor('b2')).toBe('below-field')
    expect(topicsPlaceFor('b3')).toBe('below-lines')
    expect(topicsPlaceFor('c')).toBe('log-card')
    expect(topicsPlaceFor('d')).toBe('gear')
  })

  it('separate chat: the variant default unless overridden', () => {
    expect(separateChatFor('current', 'auto')).toBe('top')
    expect(separateChatFor('a', 'auto')).toBe('footer')
    expect(separateChatFor('b', 'auto')).toBe('none')
    expect(separateChatFor('b2', 'auto')).toBe('none')
    expect(separateChatFor('c', 'auto')).toBe('none')
    expect(separateChatFor('d', 'auto')).toBe('gear')
    expect(separateChatFor('b', 'expand')).toBe('expand')
  })

  it('plural: „1 wiadomość”, otherwise „wiadomości”', () => {
    expect(messageCountLabel(1)).toBe('1 wiadomość')
    expect(messageCountLabel(2)).toBe('2 wiadomości')
    expect(messageCountLabel(6)).toBe('6 wiadomości')
    expect(messageCountLabel(21)).toBe('21 wiadomości')
  })

  it('samples: before = nothing, conversation = 3 current, reset = archived + one invitation', () => {
    expect(sampleFor('before')).toEqual({ archived: [], current: [], usedTopicIds: [] })
    const conversation = sampleFor('conversation')
    expect(conversation.current).toHaveLength(3)
    expect(conversation.current[0]!.topicTitle).toBe('Czekanie na test')
    const reset = sampleFor('reset', 3)
    expect(reset.archived).toHaveLength(3)
    expect(reset.current).toHaveLength(1)
    expect(sampleFor('reset', 1).archived).toHaveLength(1)
    expect(sampleFor('reset', 99).archived).toHaveLength(6)
  })

  it('starters: unused topics everywhere, lenses only in B and B2', () => {
    const used = ['waiting']
    expect(startersFor('a', used).map(s => s.id)).toEqual(['nina', 'sleep', 'walk'])
    expect(startersFor('a', used).every(s => s.kind === 'topic')).toBe(true)
    const b = startersFor('b', used)
    expect(b.map(s => s.kind)).toEqual(['topic', 'topic', 'topic', 'lens', 'lens', 'lens'])
    expect(startersFor('b2', used)).toEqual(b)
    expect(startersFor('b3', used)).toEqual(b)
    expect(startersFor('b', topics.map(t => t.id)).map(s => s.kind)).toEqual(['lens', 'lens', 'lens'])
  })
})
