import { describe, expect, it } from 'vitest'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import type { WeekRef } from '@/domain/period'
import {
  collectOwnSentences,
  momentsProgress,
  noticedShift,
  practiceDaysInWeek,
  practiceHelpfulness,
  respondedShare,
  weekRefsEndingAt,
} from '@/domain/momentsProgress'
import { getPeriodRefsForDate } from '@/utils/periods'

function entry(id: string, createdAt: string, responses: MicroExerciseEntry['responses'], slug = 'moments'): MicroExerciseEntry {
  return { id, exerciseSlug: slug, createdAt, updatedAt: createdAt, responses }
}

const week = (iso: string) => getPeriodRefsForDate(new Date(`${iso}T12:00:00`)).week as WeekRef
const W1 = week('2026-09-14')
const W2 = week('2026-09-21')
const W3 = week('2026-09-28')

const entries = [
  // week 1: two moments, nothing done, noticed late, critic only
  entry('a', '2026-09-14T19:00:00', { kind: 'shame', hadMoment: 'yes', compass: 'withdraw', noticed: 'later', response: ['nothing'], criticSaid: 'x' }),
  entry('b', '2026-09-16T23:30:00', { kind: 'shame', hadMoment: 'yes', compass: 'attackSelf', noticed: 'hours', response: ['nothing'], criticSaid: 'y', kindVoice: 'Zapomniałeś raz.' }),
  // week 2: quiet
  entry('q', '2026-09-23T19:00:00', { kind: 'shame', hadMoment: 'none', quietDay: 'walk' }),
  // week 3: three moments, two with a response, noticed early, a v2 entry without noticed
  entry('c', '2026-09-28T19:00:00', { kind: 'shame', hadMoment: 'yes', compass: 'withdraw', noticed: 'during', response: ['breath', 'unblend'], kindVoice: 'Widzę cię.' }),
  entry('d', '2026-09-30T19:00:00', { kind: 'shame', hadMoment: 'yes', compass: 'none', noticed: 'soon', response: ['sentence'], kindVoice: 'Widzę cię.' }),
  entry('e', '2026-10-02T19:00:00', { kind: 'shame', hadMoment: 'yes', compass: 'attackOthers', response: ['nothing'] }),
  // other kinds and exercises never count
  entry('anger', '2026-09-29T19:00:00', { kind: 'anger', hadMoment: 'yes', intensity: 6 }),
  entry('map', '2026-09-15T12:00:00', { compass: ['withdraw', 'attackSelf'] }, 'shame-map'),
]

describe('momentsProgress', () => {
  it('lists consecutive weeks ending at the given one, oldest first', () => {
    expect(weekRefsEndingAt(W3, 3)).toEqual([W1, W2, W3])
  })

  it('counts parts, responses, noticing and the two voices per week; a week without moments is quiet', () => {
    const stats = momentsProgress(entries, [W1, W2, W3], { [W2]: 2 })
    expect(stats[0]).toMatchObject({
      total: 2,
      byPart: { withdraw: 1, attackSelf: 1, attackOthers: 0, avoid: 0, none: 0 },
      responded: 0,
      noticed: { during: 0, soon: 0, hours: 1, later: 1, unknown: 0 },
      criticLogged: 2,
      kindVoiceLogged: 1,
      quiet: false,
    })
    expect(stats[1]).toMatchObject({ total: 0, quiet: true, unlogged: 2 })
    expect(stats[2]).toMatchObject({
      total: 3,
      byPart: { withdraw: 1, attackSelf: 0, attackOthers: 1, avoid: 0, none: 1 },
      responded: 2,
      noticed: { during: 1, soon: 1, hours: 0, later: 0, unknown: 1 },
      kindVoiceLogged: 2,
    })
    expect(stats[0]!.unlogged).toBeUndefined()
  })

  it('derives the response share and the shift in noticing, ignoring entries without `noticed`', () => {
    const stats = momentsProgress(entries, [W1, W2, W3])
    expect(respondedShare(stats)).toBeCloseTo(2 / 5)
    expect(respondedShare([stats[1]!])).toBeNull()
    // first week with moments: 0 of 2 early; last: 2 of 2 known (the v2 entry is unknown)
    expect(noticedShift(stats, 1)).toEqual({ early: 0, late: 1 })
    expect(noticedShift([stats[1]!])).toEqual({ early: null, late: null })
  })
})

describe('collectOwnSentences', () => {
  it('gathers the compassionate sentences newest first and de-duplicates by text', () => {
    const own = collectOwnSentences([
      ...entries,
      entry('img', '2026-09-17T12:00:00', { message: 'Jesteś człowiekiem i to boli.' }, 'compassionate-image'),
      entry('self', '2026-09-19T12:00:00', { toPart: 'Widzę cię.' }, 'compassionate-self'),
      entry('resp', '2026-09-20T12:00:00', { sentence: '„Widzę cię”', unblendSentence: 'To mój Krytyk mówi, nie ja.' }, 'shame-response'),
      entry('def', '2026-10-03T12:00:00', { mySentence: 'Zrobiłem błąd i nadal jestem w porządku.' }, 'defender-voice'),
    ])
    expect(own.map((s) => [s.source, s.text])).toEqual([
      ['defender', 'Zrobiłem błąd i nadal jestem w porządku.'],
      ['moment', 'Widzę cię.'],
      ['unblend', 'To mój Krytyk mówi, nie ja.'],
      ['image', 'Jesteś człowiekiem i to boli.'],
      ['moment', 'Zapomniałeś raz.'],
    ])
    expect(collectOwnSentences(entries, 1)).toHaveLength(1)
  })
})

describe('practice helpfulness and days', () => {
  it('averages the "czy to pomogło" answers per exercise', () => {
    const helpful = practiceHelpfulness([
      entry('p1', '2026-09-14T08:00:00', { helpful: 4 }, 'self-compassion-break'),
      entry('p2', '2026-09-16T08:00:00', { helpful: 3 }, 'self-compassion-break'),
      entry('p3', '2026-09-16T09:00:00', { helpful: 5 }, 'paced-breathing'),
      entry('p4', '2026-09-17T09:00:00', { mindfulness: 'no rating' }, 'self-compassion-break'),
    ])
    expect(helpful).toEqual({
      'self-compassion-break': { count: 2, mean: 3.5 },
      'paced-breathing': { count: 1, mean: 5 },
    })
  })

  it('counts distinct practice days in a week', () => {
    const completions = [
      { exerciseSlug: 'self-compassion-break', dayRef: '2026-09-14' },
      { exerciseSlug: 'moment-shame', dayRef: '2026-09-14' },
      { exerciseSlug: 'paced-breathing', dayRef: '2026-09-16' },
      { exerciseSlug: 'thought-record', dayRef: '2026-09-17' },
      { exerciseSlug: 'self-compassion-break', dayRef: '2026-09-21' },
    ]
    expect(practiceDaysInWeek(completions, W1, ['self-compassion-break', 'moment-shame', 'paced-breathing'])).toBe(2)
    expect(practiceDaysInWeek(completions, W2, ['self-compassion-break'])).toBe(1)
  })
})
