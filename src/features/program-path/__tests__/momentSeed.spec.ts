import { describe, expect, it } from 'vitest'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import type { ProgramStep } from '@/domain/program'
import { latestCriticThought, latestFairDemand, momentSeedFrom, pickableMoments } from '../momentSeed'
import { stepLaunchRoute } from '../useStepLauncher'
import { decodeMicroPrefill } from '@/utils/microExerciseFlow'

function entry(id: string, slug: string, createdAt: string, responses: MicroExerciseEntry['responses']): MicroExerciseEntry {
  return { id, exerciseSlug: slug, createdAt, updatedAt: createdAt, responses }
}

const moments = [
  entry('m1', 'moments', '2026-10-01T10:00:00Z', {
    kind: 'shame',
    hadMoment: 'yes',
    compass: 'withdraw',
    situation: 'Nie znałem skrótu.',
    criticSaid: 'Wszyscy to wiedzą.',
    about: 'demand',
    strength: 4,
  }),
  entry('m2', 'moments', '2026-10-03T10:00:00Z', { kind: 'shame', hadMoment: 'yes', compass: 'none', strength: 2 }),
  entry('calm', 'moments', '2026-10-04T10:00:00Z', { kind: 'shame', hadMoment: 'none', quietDay: 'Spokojnie.' }),
  entry('anger', 'moments', '2026-10-05T10:00:00Z', { kind: 'anger', hadMoment: 'yes', situation: 'Korek.' }),
]

describe('momentSeedFrom', () => {
  it('reads the situation, the critic line, the part and the strength of a moment', () => {
    expect(momentSeedFrom(moments[0]!)).toEqual({
      entryId: 'm1',
      createdAt: '2026-10-01T10:00:00Z',
      situation: 'Nie znałem skrótu.',
      criticThought: 'Wszyscy to wiedzą.',
      kindVoice: '',
      reaction: 'withdraw',
      about: 'demand',
      strength: 4,
    })
  })

  it('carries an anger thought into the wizard without inventing a shame part', () => {
    const seed = momentSeedFrom(entry('a', 'moments', '2026-10-06T10:00:00Z', {
      kind: 'anger', situation: 'Przerwana rozmowa.', thought: 'Nie liczą się ze mną.',
    }))
    expect(seed.situation).toBe('Przerwana rozmowa.')
    expect(seed.criticThought).toBe('Nie liczą się ze mną.')
    expect(seed.reaction).toBeUndefined()
  })

  it('uses an anxiety prediction as the thought and filters the picker by kind', () => {
    const anxious = entry('anxiety', 'moments', '2026-10-06T10:00:00Z', {
      kind: 'anxiety', hadMoment: 'yes', situation: 'Telefon.', thought: 'Na pewno się pomylę.',
    })
    expect(momentSeedFrom(anxious).criticThought).toBe('Na pewno się pomylę.')
    expect(pickableMoments([...moments, anxious], 'anxiety').map((item) => item.id)).toEqual(['anxiety'])
  })

  it('leaves the reaction out when no part took the wheel', () => {
    const seed = momentSeedFrom(moments[1]!)
    expect(seed.reaction).toBeUndefined()
    expect(seed.situation).toBe('')
  })
})

describe('pickableMoments', () => {
  it('offers the path kind’s moments only, newest first, without calm-day notes', () => {
    expect(pickableMoments(moments, 'shame').map((m) => m.id)).toEqual(['m2', 'm1'])
    expect(pickableMoments(moments, 'anger').map((m) => m.id)).toEqual(['anger'])
  })
})

describe('fair demand and critic seeds', () => {
  it('takes the latest reasonable demand and the latest critic line that was written', () => {
    const entries = [
      ...moments,
      entry('g1', 'shame-or-guilt', '2026-09-20T10:00:00Z', { fairDemand: 'Pytam, gdy nie wiem.' }),
      entry('g2', 'shame-or-guilt', '2026-09-28T10:00:00Z', { fairDemand: 'Mogę nie wiedzieć i zapytać.' }),
      entry('g3', 'shame-or-guilt', '2026-09-30T10:00:00Z', { about: ['act'] }),
    ]
    expect(latestFairDemand(entries)).toBe('Mogę nie wiedzieć i zapytać.')
    expect(latestCriticThought(entries)).toBe('Wszyscy to wiedzą.')
    expect(latestFairDemand([])).toBe('')
  })
})

describe('stepLaunchRoute', () => {
  it('adds the step’s context to the exercise route: continue, launch query, fair demand seed, picked moment', () => {
    const plain: ProgramStep = { exerciseSlug: 'shame-map', minGapDays: 0 }
    expect(stepLaunchRoute(plain)).toBe('/exercises/micro/shame-map')

    const tagged: ProgramStep = { exerciseSlug: 'protector-appreciation', minGapDays: 0, launchQuery: { partTag: 'shame-compass:attackSelf' } }
    expect(stepLaunchRoute(tagged)).toEqual({ path: '/exercises/protector-appreciation', query: { partTag: 'shame-compass:attackSelf' } })

    const seeded: ProgramStep = { exerciseSlug: 'core-beliefs', minGapDays: 0, startFrom: 'fairDemand' }
    expect(stepLaunchRoute(seeded)).toEqual({ path: '/exercises/core-beliefs', query: { seed: 'fairDemand' } })

    const fromMoment: ProgramStep = { exerciseSlug: 'thought-record', minGapDays: 0, startFrom: 'moment' }
    expect(stepLaunchRoute(fromMoment, 'm1')).toEqual({ path: '/exercises/thought-record', query: { momentId: 'm1' } })
    expect(stepLaunchRoute(fromMoment, null)).toBe('/exercises/thought-record')
  })

  it('carries a picked moment’s answers into a micro step as an editable prefill (momentPrefill)', () => {
    const need: ProgramStep = { exerciseSlug: 'need-behind-anger', minGapDays: 0, startFrom: 'moment', momentPrefill: { observation: 'situation' } }
    const moment = entry('a1', 'moments', '2026-10-02T10:00:00Z', { kind: 'anger', hadMoment: 'yes', situation: 'Przerwano mi w połowie zdania.' })
    const route = stepLaunchRoute(need, 'a1', moment) as { path: string; query: Record<string, string> }
    expect(route.path).toBe('/exercises/micro/need-behind-anger')
    expect(route.query.momentId).toBe('a1')
    expect(decodeMicroPrefill(route.query.prefill)).toEqual({ observation: 'Przerwano mi w połowie zdania.' })
    // without a moment, or without a matching answer, no prefill travels
    expect((stepLaunchRoute(need, 'a1') as { query: Record<string, string> }).query.prefill).toBeUndefined()
  })

  it('returns null for a slug the catalog does not know', () => {
    expect(stepLaunchRoute({ exerciseSlug: 'nope', minGapDays: 0 })).toBeNull()
  })
})
