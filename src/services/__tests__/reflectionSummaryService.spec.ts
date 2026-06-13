import { describe, it, expect } from 'vitest'
import {
  buildReflectionSummaryPayload,
  emotionContextFromSummary,
  parseReflectionQuestions,
  type ReflectionSummaryContext,
} from '../reflectionSummaryService'
import type {
  ReflectionEmotionLogDetail,
  ReflectionJournalEntryDetail,
} from '../reflectionDataQueries'

function baseContext(
  overrides: Partial<ReflectionSummaryContext> = {},
): ReflectionSummaryContext {
  return {
    kind: 'weekly',
    periodLabel: 'W24 · 10–16 Jun 2026',
    ratings: [],
    anchors: [],
    freeform: '',
    ...overrides,
  }
}

describe('buildReflectionSummaryPayload', () => {
  it('emits only the period + end markers when nothing is filled in', () => {
    const text = buildReflectionSummaryPayload(baseContext(), 'en')
    expect(text).toContain('[PERIOD]')
    expect(text).toContain('W24 · 10–16 Jun 2026')
    expect(text).toContain('[END OF DATA]')
    expect(text).not.toContain('[RATINGS')
    expect(text).not.toContain('[ANCHORS]')
    expect(text).not.toContain('[USER NOTE]')
  })

  it('localizes section headers and content in Polish', () => {
    const text = buildReflectionSummaryPayload(
      baseContext({
        ratings: [{ label: 'Nastrój', value: 4 }],
        anchors: [{ label: 'Co poszło dobrze?', text: 'Sporo' }],
        freeform: 'Trudny tydzień.',
      }),
      'pl',
    )
    expect(text).toContain('[OKRES]')
    expect(text).toContain('[OCENY (1–5)]')
    expect(text).toContain('Nastrój: 4/5')
    expect(text).toContain('[KOTWICE]')
    expect(text).toContain('Co poszło dobrze?:')
    expect(text).toContain('[NOTATKA UŻYTKOWNIKA]')
    expect(text).toContain('Trudny tydzień.')
    expect(text).toContain('[KONIEC DANYCH]')
  })

  it('skips unrated dimensions but keeps rated ones', () => {
    const text = buildReflectionSummaryPayload(
      baseContext({
        ratings: [
          { label: 'Mood', value: null },
          { label: 'Energy', value: 2 },
        ],
      }),
      'en',
    )
    expect(text).toContain('[RATINGS (1–5)]')
    expect(text).toContain('Energy: 2/5')
    expect(text).not.toContain('Mood:')
  })

  it('renders the emotion snapshot', () => {
    const text = buildReflectionSummaryPayload(
      baseContext({
        emotions: {
          totalLogs: 12,
          pleasantPct: 58,
          top: [
            { name: 'calm', count: 4 },
            { name: 'tense', count: 3 },
          ],
        },
      }),
      'en',
    )
    expect(text).toContain('[EMOTIONS]')
    expect(text).toContain('12× · 58% pleasant')
    expect(text).toContain('calm ×4, tense ×3')
  })

  it('renders monthly extras and truncates long weekly excerpts', () => {
    const longText = 'x'.repeat(600)
    const text = buildReflectionSummaryPayload(
      baseContext({
        kind: 'monthly',
        weeklyTrends: [
          { weekLabel: '1–7 Jun', mood: 4, energy: null, calm: 3, connection: 5 },
        ],
        weeklyExcerpts: [{ weekLabel: '1–7 Jun', text: longText }],
        goals: [{ title: 'Ship v2', metKRs: 2, totalKRs: 3 }],
        habits: [
          { title: 'Run', status: 'met' },
          { title: 'Read', status: 'missed' },
        ],
        trackers: [
          { title: 'Weight', latest: 80 },
          { title: 'Steps', latest: null },
        ],
      }),
      'en',
    )
    expect(text).toContain('[WEEKLY TRENDS]')
    // null energy is skipped within the line
    expect(text).toContain('1–7 Jun: mood 4, calm 3, connection 5')
    expect(text).toContain('[GOALS]')
    expect(text).toContain('Ship v2 — 2/3')
    expect(text).toContain('[HABITS]')
    expect(text).toContain('Run: met')
    expect(text).toContain('Read: missed')
    expect(text).toContain('[TRACKERS]')
    expect(text).toContain('Weight: 80')
    expect(text).toContain('Steps')
    expect(text).toContain('[WEEKLY REFLECTIONS]')
    expect(text).toContain('…')
    expect(text).not.toContain('x'.repeat(401))
  })

  it('localizes habit status and state-dimension labels in Polish', () => {
    const text = buildReflectionSummaryPayload(
      baseContext({
        kind: 'monthly',
        weeklyTrends: [
          { weekLabel: 't1', mood: 5, energy: 4, calm: null, connection: null },
        ],
        habits: [{ title: 'Bieganie', status: 'met' }],
      }),
      'pl',
    )
    expect(text).toContain('t1: nastrój 5, energia 4')
    expect(text).toContain('Bieganie: zrealizowany')
  })
})

describe('parseReflectionQuestions', () => {
  it('strips bullets and numbering, trims, and drops blanks', () => {
    const raw = '1. What changed?\n- How did you cope?\n\n• What helped?\n   \n2) Next step?'
    expect(parseReflectionQuestions(raw)).toEqual([
      'What changed?',
      'How did you cope?',
      'What helped?',
      'Next step?',
    ])
  })

  it('dedupes case-insensitively and caps at five', () => {
    const raw = 'Q1?\nq1?\nQ2?\nQ3?\nQ4?\nQ5?\nQ6?'
    const out = parseReflectionQuestions(raw)
    expect(out).toHaveLength(5)
    expect(out).toEqual(['Q1?', 'Q2?', 'Q3?', 'Q4?', 'Q5?'])
  })

  it('returns an empty array for blank input', () => {
    expect(parseReflectionQuestions('\n\n   \n')).toEqual([])
  })
})

describe('emotionContextFromSummary', () => {
  it('returns undefined when nothing was logged', () => {
    expect(
      emotionContextFromSummary({
        totalLogs: 0,
        topEmotions: [],
        quadrantDistribution: {
          'high-energy-high-pleasantness': 0,
          'high-energy-low-pleasantness': 0,
          'low-energy-high-pleasantness': 0,
          'low-energy-low-pleasantness': 0,
        },
      }),
    ).toBeUndefined()
  })

  it('computes the pleasant percentage from the quadrant distribution', () => {
    const ctx = emotionContextFromSummary({
      totalLogs: 10,
      topEmotions: [
        { emotionId: 'a', name: 'calm', count: 6, quadrant: 'low-energy-high-pleasantness' },
        { emotionId: 'b', name: 'tense', count: 4, quadrant: 'high-energy-low-pleasantness' },
      ],
      quadrantDistribution: {
        'high-energy-high-pleasantness': 3,
        'high-energy-low-pleasantness': 4,
        'low-energy-high-pleasantness': 1,
        'low-energy-low-pleasantness': 2,
      },
    })
    // pleasant = HEHP(3) + LEHP(1) = 4 of 10 logged quadrants = 40%
    expect(ctx).toEqual({
      totalLogs: 10,
      pleasantPct: 40,
      top: [
        { name: 'calm', count: 6 },
        { name: 'tense', count: 4 },
      ],
    })
  })
})

describe('buildReflectionSummaryPayload — journal entries & emotion logs', () => {
  function journalEntry(
    over: Partial<ReflectionJournalEntryDetail> = {},
  ): ReflectionJournalEntryDetail {
    return {
      id: 'j1',
      createdAt: '2026-06-10T09:00:00.000Z',
      title: '',
      body: 'Body text',
      emotions: [],
      people: [],
      contexts: [],
      ...over,
    }
  }

  function emotionLog(
    over: Partial<ReflectionEmotionLogDetail> = {},
  ): ReflectionEmotionLogDetail {
    return {
      id: 'e1',
      createdAt: '2026-06-10T18:00:00.000Z',
      emotions: [],
      note: '',
      people: [],
      contexts: [],
      ...over,
    }
  }

  it('renders journal entries (title, tags, body) and leads with them, before ratings', () => {
    const text = buildReflectionSummaryPayload(
      baseContext({
        ratings: [{ label: 'Mood', value: 4 }],
        journalEntries: [
          journalEntry({
            title: 'Hard Tuesday',
            body: 'The deadline crushed me.',
            emotions: ['anxious'],
            people: ['Anna'],
            contexts: ['work'],
          }),
        ],
      }),
      'en',
    )
    expect(text).toContain('[JOURNAL ENTRIES]')
    expect(text).toContain('Hard Tuesday')
    expect(text).toContain('Emotions: anxious | People: Anna | Contexts: work')
    expect(text).toContain('The deadline crushed me.')
    // Journal is the primary source — it must precede the ratings block.
    expect(text.indexOf('[JOURNAL ENTRIES]')).toBeLessThan(text.indexOf('[RATINGS'))
  })

  it('truncates long journal bodies', () => {
    const text = buildReflectionSummaryPayload(
      baseContext({ journalEntries: [journalEntry({ body: 'y'.repeat(2000) })] }),
      'en',
    )
    expect(text).toContain('…')
    expect(text).not.toContain('y'.repeat(1001))
  })

  it('includes only emotion logs that carry a note or tags', () => {
    const text = buildReflectionSummaryPayload(
      baseContext({
        emotionLogs: [
          emotionLog({ emotions: ['calm'] }), // no note/tags → skipped
          emotionLog({
            emotions: ['tense'],
            note: 'before the meeting',
            contexts: ['work'],
          }),
        ],
      }),
      'en',
    )
    expect(text).toContain('[EMOTION LOGS]')
    expect(text).toContain('tense')
    expect(text).toContain('Note: before the meeting')
    expect(text).toContain('Contexts: work')
    // The noteless / tagless log contributes nothing.
    expect(text).not.toContain('calm')
  })

  it('omits the emotion-logs section entirely when no log carries context', () => {
    const text = buildReflectionSummaryPayload(
      baseContext({ emotionLogs: [emotionLog({ emotions: ['calm'] })] }),
      'en',
    )
    expect(text).not.toContain('[EMOTION LOGS]')
  })

  it('localizes the journal / emotion-log headers and meta labels in Polish', () => {
    const text = buildReflectionSummaryPayload(
      baseContext({
        journalEntries: [
          journalEntry({ body: 'Ciężki dzień', emotions: ['lęk'], people: ['Anna'] }),
        ],
        emotionLogs: [emotionLog({ emotions: ['spokój'], note: 'po spacerze' })],
      }),
      'pl',
    )
    expect(text).toContain('[WPISY Z DZIENNIKA]')
    expect(text).toContain('Emocje: lęk | Osoby: Anna')
    expect(text).toContain('[LOGI EMOCJI]')
    expect(text).toContain('Notatka: po spacerze')
  })
})
