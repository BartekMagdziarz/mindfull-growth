import { describe, it, expect } from 'vitest'
import {
  assembleFromInput,
  ageBucketOf,
  buildProfilePayload,
  estimateTokens,
  getProfilePrompts,
  parseProfileResponse,
  selectPayloadWithinBudget,
  type ProfilePayloadEmotionLog,
  type ProfilePayloadInput,
  type ProfilePayloadJournalEntry,
  type ProfilePayloadWeeklyReflection,
  type ProfilePromptModule,
} from '../profileLLMAssists'
import { PROFILE_SECTION_IDS } from '@/domain/userProfile'

/**
 * Helpers — small builders that keep each test case short and focused on
 * the behaviour under test rather than the 15+ fields of a payload input.
 */

function baseInput(
  overrides: Partial<ProfilePayloadInput> = {},
): ProfilePayloadInput {
  return {
    dataTypes: ['journal'],
    dateRange: { kind: 'preset', preset: 'last30' },
    ...overrides,
  }
}

function wellFormedResponse(headers: { id: string; header: string }[]): string {
  return headers
    .map(({ header }) => `## ${header}\n\nBody for ${header}.`)
    .join('\n\n')
}

describe('getProfilePrompts', () => {
  it('returns an English prompt with nine ordered section headers', () => {
    const module = getProfilePrompts('en', 'masculine')

    expect(module.locale).toBe('en')
    expect(module.gender).toBe('masculine')
    expect(module.systemPrompt.length).toBeGreaterThan(100)
    expect(module.sectionHeaders).toHaveLength(PROFILE_SECTION_IDS.length)
    expect(module.sectionHeaders.map((h) => h.id)).toEqual([
      ...PROFILE_SECTION_IDS,
    ])
    expect(module.sectionHeaders[0]).toEqual({
      id: 'summary',
      header: 'Summary',
    })
  })

  it('returns a Polish prompt with localised headers', () => {
    const module = getProfilePrompts('pl', 'feminine')

    expect(module.locale).toBe('pl')
    expect(module.gender).toBe('feminine')
    expect(module.sectionHeaders.find((h) => h.id === 'summary')?.header).toBe(
      'Podsumowanie',
    )
    expect(
      module.sectionHeaders.find((h) => h.id === 'emotionalPatterns')?.header,
    ).toBe('Wzorce emocjonalne')
  })

  it('applies feminine grammatical forms in the Polish system prompt', () => {
    const module = getProfilePrompts('pl', 'feminine')
    // "zauważyłaś" (feminine) vs "zauważyłeś" (masculine) — distinctive verb forms
    expect(module.systemPrompt).toContain('zauważyłaś')
    expect(module.systemPrompt).not.toContain('zauważyłeś')
  })

  it('applies masculine grammatical forms in the Polish system prompt', () => {
    const module = getProfilePrompts('pl', 'masculine')
    expect(module.systemPrompt).toContain('zauważyłeś')
    expect(module.systemPrompt).not.toContain('zauważyłaś')
  })

  it('lists every section header inside the English system prompt', () => {
    const module = getProfilePrompts('en', 'masculine')
    for (const header of module.sectionHeaders) {
      expect(module.systemPrompt).toContain(`## ${header.header}`)
    }
  })
})

describe('buildProfilePayload', () => {
  it('emits scope and END markers even with no data blocks', () => {
    const out = buildProfilePayload(baseInput({ dataTypes: [] }), 'en')
    expect(out).toContain('[SCOPE]')
    expect(out).toContain('[END OF DATA]')
    expect(out).not.toContain('[JOURNAL ENTRIES]')
  })

  it('lists enabled data types and the date range', () => {
    const out = buildProfilePayload(
      baseInput({
        dataTypes: ['journal', 'emotionLogs'],
        dateRange: { kind: 'preset', preset: 'last90' },
      }),
      'en',
    )
    expect(out).toMatch(/Data types:.*journal.*emotionLogs/)
    expect(out).toContain('Last 90 days')
  })

  it('handles custom date ranges', () => {
    const out = buildProfilePayload(
      baseInput({
        dateRange: { kind: 'custom', start: '2026-01-01', end: '2026-03-31' },
      }),
      'en',
    )
    expect(out).toContain('2026-01-01')
    expect(out).toContain('2026-03-31')
  })

  it('localises scope labels for Polish output', () => {
    const out = buildProfilePayload(
      baseInput({
        dataTypes: ['journal'],
        dateRange: { kind: 'preset', preset: 'last30' },
      }),
      'pl',
    )
    expect(out).toContain('Ostatnie 30 dni')
    expect(out).toContain('Typy danych:')
  })

  it('serialises a journal entry with full body and all metadata columns', () => {
    const out = buildProfilePayload(
      baseInput({
        dataTypes: ['journal'],
        journalEntries: [
          {
            id: 'j1',
            createdAt: '2026-04-01T10:00:00.000Z',
            title: 'Monday thoughts',
            body: 'I kept circling back to the same question about work boundaries.',
            emotionNames: ['anxious', 'hopeful'],
            peopleNames: ['Anna'],
            contextNames: ['work'],
            lifeAreaNames: ['Career'],
          },
        ],
      }),
      'en',
    )

    expect(out).toContain('[JOURNAL ENTRIES]')
    expect(out).toContain('--- Entry j1 (2026-04-01T10:00:00.000Z)')
    expect(out).toContain('Title: Monday thoughts')
    expect(out).toContain('Emotions: anxious, hopeful')
    expect(out).toContain('People: Anna')
    expect(out).toContain('Contexts: work')
    expect(out).toContain('Life areas: Career')
    expect(out).toContain(
      'I kept circling back to the same question about work boundaries.',
    )
  })

  it('omits sections whose data arrays are empty or missing', () => {
    const out = buildProfilePayload(
      baseInput({
        dataTypes: ['journal', 'emotionLogs', 'weeklyReflections'],
        journalEntries: [
          {
            id: 'j1',
            createdAt: '2026-04-01T10:00:00.000Z',
            body: 'Just a note.',
            emotionNames: [],
            peopleNames: [],
            contextNames: [],
            lifeAreaNames: [],
          },
        ],
      }),
      'en',
    )
    expect(out).toContain('[JOURNAL ENTRIES]')
    expect(out).not.toContain('[EMOTION LOGS]')
    expect(out).not.toContain('[WEEKLY REFLECTIONS]')
  })

  it('serialises weekly reflections with ratings, prompts and freeform body', () => {
    const out = buildProfilePayload(
      baseInput({
        dataTypes: ['weeklyReflections'],
        weeklyReflections: [
          {
            weekRef: '2026-W15',
            ratings: {
              moodRating: 4,
              energyRating: null,
              taskLoadRating: 3,
            },
            promptResponses: {
              biggestWin: 'Shipped the planner redesign.',
              dropMe: '',
            },
            freeformReflection: 'Overall a grounded week.',
          },
        ],
      }),
      'en',
    )
    expect(out).toContain('[WEEKLY REFLECTIONS]')
    expect(out).toContain('--- Week 2026-W15')
    expect(out).toContain('Ratings: moodRating=4, taskLoadRating=3')
    expect(out).not.toContain('energyRating=null')
    expect(out).toContain('biggestWin: Shipped the planner redesign.')
    expect(out).not.toContain('dropMe')
    expect(out).toContain('Overall a grounded week.')
  })

  it('serialises exercise sessions with their summariser output', () => {
    const out = buildProfilePayload(
      baseInput({
        dataTypes: ['exerciseSessions'],
        exerciseSessions: [
          {
            id: 'tr-1',
            type: 'thoughtRecord',
            createdAt: '2026-04-10T09:00:00.000Z',
            summary:
              'thoughtRecord on 2026-04-10. I felt stuck in a spiral this morning.',
          },
        ],
      }),
      'en',
    )
    expect(out).toContain('[EXERCISE SESSIONS]')
    expect(out).toContain('thoughtRecord')
    expect(out).toContain('I felt stuck in a spiral this morning.')
  })

  it('includes the planning snapshot only when the block has content', () => {
    const empty = buildProfilePayload(
      baseInput({
        dataTypes: ['planning'],
        planning: { snapshot: '   ' },
      }),
      'en',
    )
    expect(empty).not.toContain('[PLANNING SNAPSHOT]')

    const populated = buildProfilePayload(
      baseInput({
        dataTypes: ['planning'],
        planning: { snapshot: 'Active goals:\n- Ship MVP' },
      }),
      'en',
    )
    expect(populated).toContain('[PLANNING SNAPSHOT]')
    expect(populated).toContain('Ship MVP')
  })

  it('omits foundation and life-area blocks when their snapshots are missing', () => {
    const out = buildProfilePayload(
      baseInput({
        dataTypes: ['foundation', 'planning'],
        planning: { snapshot: 'Plan body' },
      }),
      'en',
    )

    expect(out).not.toContain('[FOUNDATION SNAPSHOT]')
    expect(out).not.toContain('[LIFE AREAS]')
    expect(out).toContain('[PLANNING SNAPSHOT]')
  })

  it('includes foundation immediately after scope when present', () => {
    const out = buildProfilePayload(
      baseInput({
        dataTypes: ['foundation'],
        foundation: { snapshot: '## Value map\nTop values: care' },
      }),
      'en',
    )

    expect(out).toContain('[FOUNDATION SNAPSHOT]')
    expect(out).toContain('Top values: care')
    expect(out.indexOf('[SCOPE]')).toBeLessThan(out.indexOf('[FOUNDATION SNAPSHOT]'))
    expect(out.indexOf('[FOUNDATION SNAPSHOT]')).toBeLessThan(
      out.indexOf('[END OF DATA]'),
    )
  })

  it('keeps foundation even when journal entries are empty', () => {
    const out = buildProfilePayload(
      baseInput({
        dataTypes: ['foundation', 'journal'],
        foundation: { snapshot: '## Values discovery\nCore values: honesty' },
        journalEntries: [],
      }),
      'en',
    )

    expect(out).toContain('[FOUNDATION SNAPSHOT]')
    expect(out).not.toContain('[JOURNAL ENTRIES]')
  })

  it('emits life areas immediately before planning when both are present', () => {
    const out = buildProfilePayload(
      baseInput({
        dataTypes: ['planning'],
        lifeAreas: { snapshot: '- Career\n  Meaning: Build well' },
        planning: { snapshot: '- Daily meditation [habit, daily]' },
      }),
      'en',
    )

    expect(out).toContain('[LIFE AREAS]')
    expect(out).toContain('[PLANNING SNAPSHOT]')
    expect(out.indexOf('[LIFE AREAS]')).toBeLessThan(
      out.indexOf('[PLANNING SNAPSHOT]'),
    )
  })

  it('omits whitespace-only foundation and life-area snapshots', () => {
    const out = buildProfilePayload(
      baseInput({
        dataTypes: ['foundation', 'planning'],
        foundation: { snapshot: '   ' },
        lifeAreas: { snapshot: '\n\t' },
        planning: { snapshot: 'Plan body' },
      }),
      'en',
    )

    expect(out).not.toContain('[FOUNDATION SNAPSHOT]')
    expect(out).not.toContain('[LIFE AREAS]')
    expect(out).toContain('[PLANNING SNAPSHOT]')
  })

  it('emits all data blocks in the documented order', () => {
    const out = buildProfilePayload(
      baseInput({
        dataTypes: [
          'foundation',
          'journal',
          'emotionLogs',
          'exerciseSessions',
          'weeklyReflections',
          'monthlyReflections',
          'planning',
        ],
        foundation: { snapshot: 'Foundation body' },
        journalEntries: [
          {
            id: 'j1',
            createdAt: '2026-04-01T10:00:00.000Z',
            body: 'Journal body',
            emotionNames: [],
            peopleNames: [],
            contextNames: [],
            lifeAreaNames: [],
          },
        ],
        emotionLogs: [
          {
            id: 'e1',
            createdAt: '2026-04-01T11:00:00.000Z',
            emotionNames: [],
            note: 'Emotion body',
            peopleNames: [],
            contextNames: [],
          },
        ],
        exerciseSessions: [
          {
            id: 'x1',
            type: 'valuesDiscovery',
            createdAt: '2026-04-02T00:00:00.000Z',
            summary: 'Exercise body',
          },
        ],
        weeklyReflections: [
          {
            weekRef: '2026-W15',
            ratings: {},
            promptResponses: {},
            freeformReflection: 'Weekly body',
          },
        ],
        monthlyReflections: [
          {
            monthRef: '2026-04',
            ratings: {},
            promptResponses: {},
            freeformReflection: 'Monthly body',
          },
        ],
        lifeAreas: { snapshot: 'Life areas body' },
        planning: { snapshot: 'Planning body' },
      }),
      'en',
    )

    const markers = [
      '[SCOPE]',
      '[FOUNDATION SNAPSHOT]',
      '[JOURNAL ENTRIES]',
      '[EMOTION LOGS]',
      '[EXERCISE SESSIONS]',
      '[WEEKLY REFLECTIONS]',
      '[MONTHLY REFLECTIONS]',
      '[LIFE AREAS]',
      '[PLANNING SNAPSHOT]',
      '[END OF DATA]',
    ]
    const positions = markers.map((marker) => out.indexOf(marker))
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })
})

describe('parseProfileResponse', () => {
  const module: ProfilePromptModule = getProfilePrompts('en', 'masculine')

  it('maps a well-formed response to every section with no extras', () => {
    const raw = wellFormedResponse(module.sectionHeaders)
    const parsed = parseProfileResponse(raw, module)

    for (const { id, header } of module.sectionHeaders) {
      expect(parsed.sections[id]).toContain(`Body for ${header}.`)
    }
    expect(parsed.extras).toBe('')
  })

  it('leaves unmatched canonical sections empty when the model skips them', () => {
    const partial = module.sectionHeaders.slice(0, 3) // summary, values, emotionalPatterns
    const raw = wellFormedResponse(partial)
    const parsed = parseProfileResponse(raw, module)

    expect(parsed.sections.summary).toContain('Body for Summary.')
    expect(parsed.sections.values).toContain('Body for Values and guiding principles.')
    expect(parsed.sections.strengths).toBe('')
    expect(parsed.sections.challenges).toBe('')
    expect(parsed.extras).toBe('')
  })

  it('routes unknown headers into extras', () => {
    const raw = [
      '## Summary\n\nShort summary.',
      '## Dreams and aspirations\n\nContent under an unknown header.',
      '## Values and guiding principles\n\nValues body.',
    ].join('\n\n')

    const parsed = parseProfileResponse(raw, module)
    expect(parsed.sections.summary).toContain('Short summary.')
    expect(parsed.sections.values).toContain('Values body.')
    expect(parsed.extras).toContain('Dreams and aspirations')
    expect(parsed.extras).toContain('Content under an unknown header.')
  })

  it('returns all-empty sections and the whole body as extras when no H2 is present', () => {
    const raw = 'A single long prose block with no markdown headers at all.'
    const parsed = parseProfileResponse(raw, module)
    for (const id of PROFILE_SECTION_IDS) {
      expect(parsed.sections[id]).toBe('')
    }
    expect(parsed.extras).toBe(raw)
  })

  it('tolerates trailing punctuation and case variants in headers', () => {
    const raw = [
      '## summary:',
      '',
      'Summary body.',
      '',
      '## VALUES AND GUIDING PRINCIPLES.',
      '',
      'Values body.',
    ].join('\n')

    const parsed = parseProfileResponse(raw, module)
    expect(parsed.sections.summary).toContain('Summary body.')
    expect(parsed.sections.values).toContain('Values body.')
    expect(parsed.extras).toBe('')
  })

  it('matches Polish headers when the caller passed a Polish prompt module', () => {
    const plModule = getProfilePrompts('pl', 'feminine')
    const raw = [
      '## Podsumowanie',
      'Krótki opis.',
      '',
      '## Wzorce emocjonalne',
      'Trochę o emocjach.',
    ].join('\n')

    const parsed = parseProfileResponse(raw, plModule)
    expect(parsed.sections.summary).toContain('Krótki opis.')
    expect(parsed.sections.emotionalPatterns).toContain('Trochę o emocjach.')
    expect(parsed.extras).toBe('')
  })

  it('recognises EN headers even under a PL prompt module (mixed-locale tolerance)', () => {
    // The parser falls back to the full EN+PL lookup so a weak model that
    // switches languages mid-output still lands content in the right buckets.
    const plModule = getProfilePrompts('pl', 'masculine')
    const raw = '## Summary\n\nShort summary.\n\n## Wzorce emocjonalne\n\nEmocje.'
    const parsed = parseProfileResponse(raw, plModule)
    expect(parsed.sections.summary).toContain('Short summary.')
    expect(parsed.sections.emotionalPatterns).toContain('Emocje.')
  })

  it('captures prose above the first header as extras', () => {
    const raw = [
      'Preamble paragraph the model added on its own.',
      '',
      '## Summary',
      '',
      'Summary body.',
    ].join('\n')

    const parsed = parseProfileResponse(raw, module)
    expect(parsed.sections.summary).toContain('Summary body.')
    expect(parsed.extras).toContain('Preamble paragraph')
  })

  it('pushes duplicate headers to extras and keeps the first occurrence', () => {
    const raw = [
      '## Summary',
      '',
      'First summary.',
      '',
      '## Summary',
      '',
      'Second summary.',
    ].join('\n')

    const parsed = parseProfileResponse(raw, module)
    expect(parsed.sections.summary).toBe('First summary.')
    expect(parsed.extras).toContain('Second summary.')
  })

  it('accepts ATX headings of other levels (#, ###)', () => {
    const raw = [
      '# Summary',
      '',
      'Top-level summary body.',
      '',
      '### Values and guiding principles',
      '',
      'Values body.',
    ].join('\n')

    const parsed = parseProfileResponse(raw, module)
    expect(parsed.sections.summary).toContain('Top-level summary body.')
    expect(parsed.sections.values).toContain('Values body.')
    expect(parsed.extras).toBe('')
  })

  it('accepts full-line bold pseudo-headings', () => {
    const raw = [
      '**Summary**',
      '',
      'Bold-header summary body.',
      '',
      '**Strengths**',
      '',
      'Strengths body.',
    ].join('\n')

    const parsed = parseProfileResponse(raw, module)
    expect(parsed.sections.summary).toContain('Bold-header summary body.')
    expect(parsed.sections.strengths).toContain('Strengths body.')
    expect(parsed.extras).toBe('')
  })

  it('strips closed <think> blocks before parsing', () => {
    const raw = [
      '<think>I should open with their work-boundaries theme.</think>',
      '',
      '## Summary',
      '',
      'Clean summary body.',
    ].join('\n')

    const parsed = parseProfileResponse(raw, module)
    expect(parsed.sections.summary).toContain('Clean summary body.')
    expect(parsed.sections.summary).not.toContain('work-boundaries theme')
    expect(parsed.extras).toBe('')
  })

  it('drops an orphan <think> with no closing tag (truncated reasoning)', () => {
    const raw = '<think>reasoning that never finished and never produced sections'
    const parsed = parseProfileResponse(raw, module)
    for (const id of PROFILE_SECTION_IDS) {
      expect(parsed.sections[id]).toBe('')
    }
    expect(parsed.extras).toBe('')
  })
})

describe('estimateTokens', () => {
  it('divides character count by 3 (matching num_ctx sizing), rounding up', () => {
    expect(estimateTokens('')).toBe(0)
    expect(estimateTokens('x'.repeat(9))).toBe(3)
    expect(estimateTokens('x'.repeat(10))).toBe(4) // ceil(10/3)
  })
})

describe('ageBucketOf', () => {
  const NOW_MS = Date.UTC(2026, 5, 6) // 2026-06-06T00:00:00Z
  const daysAgo = (n: number) => new Date(NOW_MS - n * 86_400_000).toISOString()

  it('buckets by recency relative to nowMs', () => {
    expect(ageBucketOf(daysAgo(10), NOW_MS)).toBe('0-30d')
    expect(ageBucketOf(daysAgo(60), NOW_MS)).toBe('31-90d')
    expect(ageBucketOf(daysAgo(200), NOW_MS)).toBe('91-365d')
    expect(ageBucketOf(daysAgo(400), NOW_MS)).toBe('365d+')
  })

  it('treats missing or unparseable dates as undated', () => {
    expect(ageBucketOf(undefined, NOW_MS)).toBe('undated')
    expect(ageBucketOf('not-a-date', NOW_MS)).toBe('undated')
  })
})

describe('assembleFromInput', () => {
  const NOW_MS = Date.UTC(2026, 5, 6)
  const daysAgo = (n: number) => new Date(NOW_MS - n * 86_400_000).toISOString()

  function journalEntry(id: string, createdAt: string) {
    return {
      id,
      createdAt,
      title: `Title ${id}`,
      body: `Body for entry ${id} with enough text to register some tokens.`,
      emotionNames: ['calm'],
      peopleNames: [],
      contextNames: [],
      lifeAreaNames: [],
    }
  }

  it('returns text byte-identical to buildProfilePayload', () => {
    const input = baseInput({
      journalEntries: [journalEntry('a', daysAgo(5))],
    })
    const out = assembleFromInput(input, 'en', NOW_MS)
    expect(out.text).toBe(buildProfilePayload(input, 'en'))
    expect(out.approxTokens).toBe(estimateTokens(out.text))
  })

  it('attributes per-type and per-age token cost consistently', () => {
    const input = baseInput({
      journalEntries: [
        journalEntry('recent', daysAgo(5)), // 0-30d
        journalEntry('older', daysAgo(100)), // 91-365d
      ],
    })
    const out = assembleFromInput(input, 'en', NOW_MS)

    expect(out.tokensByType.journal).toBeGreaterThan(0)
    expect(out.tokensByAge['0-30d']).toBeGreaterThan(0)
    expect(out.tokensByAge['91-365d']).toBeGreaterThan(0)
    expect(out.tokensByAge['31-90d']).toBe(0)
    expect(out.tokensByAge['365d+']).toBe(0)
    // Journal is the only type and each entry lands in exactly one age bucket,
    // so the per-type total equals the sum across age buckets.
    expect(out.tokensByType.journal).toBe(
      out.tokensByAge['0-30d'] + out.tokensByAge['91-365d'],
    )
    // The headline includes bracket scaffolding, so it's ≥ the body attribution.
    expect(out.approxTokens).toBeGreaterThanOrEqual(out.tokensByType.journal ?? 0)
  })

  it('files snapshot blocks (foundation/planning) under the undated bucket', () => {
    const input = baseInput({
      dataTypes: ['foundation', 'planning'],
      foundation: { snapshot: 'Purpose: live deliberately.\nValues: clarity, courage.' },
      planning: { snapshot: 'Active goal: ship the assembler.' },
      lifeAreas: { snapshot: 'Health: steady. Work: busy.' },
    })
    const out = assembleFromInput(input, 'en', NOW_MS)

    expect(out.tokensByType.foundation).toBeGreaterThan(0)
    expect(out.tokensByType.planning).toBeGreaterThan(0) // planning + life areas
    expect(out.tokensByAge.undated).toBeGreaterThan(0)
    expect(out.tokensByAge['0-30d']).toBe(0)
  })
})

describe('selectPayloadWithinBudget', () => {
  const d = (n: number) => `2026-04-${String(n).padStart(2, '0')}T00:00:00.000Z`

  function jEntry(id: string, createdAt: string, bodyLen = 30): ProfilePayloadJournalEntry {
    return {
      id,
      createdAt,
      body: 'x'.repeat(bodyLen),
      emotionNames: [],
      peopleNames: [],
      contextNames: [],
      lifeAreaNames: [],
    }
  }
  function eLog(id: string, createdAt: string, noteLen = 30): ProfilePayloadEmotionLog {
    return { id, createdAt, emotionNames: [], note: 'x'.repeat(noteLen), peopleNames: [], contextNames: [] }
  }
  function weekly(weekRef: string, createdAt: string, freeLen: number): ProfilePayloadWeeklyReflection {
    return { weekRef, createdAt, ratings: {}, promptResponses: {}, freeformReflection: 'x'.repeat(freeLen) }
  }
  function scope(over: Partial<ProfilePayloadInput>): ProfilePayloadInput {
    return { dataTypes: [], dateRange: { kind: 'preset', preset: 'all' }, ...over }
  }

  it('drops nothing when everything fits', () => {
    const input = scope({
      dataTypes: ['journal'],
      journalEntries: [jEntry('j1', d(1)), jEntry('j2', d(2))],
    })
    const res = selectPayloadWithinBudget(input, 100_000)
    expect(res.input.journalEntries).toHaveLength(2)
    expect(res.droppedByType).toEqual({})
    expect(res.fits).toBe(true)
  })

  it('keeps the newest records and drops the oldest to fit (newest-first)', () => {
    // body 3000 ⇒ ~1015 tok each; budget 2500 keeps exactly 2.
    const entries = [1, 2, 3, 4].map((n) => jEntry(`j${n}`, d(n), 3000))
    const res = selectPayloadWithinBudget(
      scope({ dataTypes: ['journal'], journalEntries: entries }),
      2500,
    )
    expect((res.input.journalEntries ?? []).map((e) => e.id)).toEqual(['j4', 'j3'])
    expect(res.droppedByType.journal).toBe(2)
    expect(res.fits).toBe(true)
  })

  it('always keeps the bounded snapshots even under heavy pressure', () => {
    const res = selectPayloadWithinBudget(
      scope({
        dataTypes: ['foundation', 'planning', 'journal'],
        foundation: { snapshot: 'Purpose: clarity.' },
        planning: { snapshot: 'Goal: ship it.' },
        lifeAreas: { snapshot: 'Health: ok.' },
        journalEntries: [1, 2, 3].map((n) => jEntry(`j${n}`, d(n), 3000)),
      }),
      50,
    )
    expect(res.input.foundation?.snapshot).toBe('Purpose: clarity.')
    expect(res.input.planning?.snapshot).toBe('Goal: ship it.')
    expect(res.input.lifeAreas?.snapshot).toBe('Health: ok.')
    expect(res.input.journalEntries).toEqual([])
    expect(res.droppedByType.journal).toBe(3)
    expect(res.fits).toBe(true)
  })

  it('reports fits=false when mandatory snapshots alone exceed the budget', () => {
    const res = selectPayloadWithinBudget(
      scope({ dataTypes: ['foundation'], foundation: { snapshot: 'x'.repeat(3000) } }),
      100,
    )
    expect(res.fits).toBe(false)
    expect(res.mandatoryTokens).toBeGreaterThan(100)
  })

  it('splits the remainder ~70/30, never starving emotion logs', () => {
    const journal = Array.from({ length: 60 }, (_, i) => jEntry(`j${i}`, d((i % 28) + 1)))
    const logs = Array.from({ length: 60 }, (_, i) => eLog(`l${i}`, d((i % 28) + 1)))
    const res = selectPayloadWithinBudget(
      scope({ dataTypes: ['journal', 'emotionLogs'], journalEntries: journal, emotionLogs: logs }),
      600,
    )
    const j = res.input.journalEntries?.length ?? 0
    const l = res.input.emotionLogs?.length ?? 0
    expect(j).toBeGreaterThan(0)
    expect(l).toBeGreaterThan(0) // logs reserved share — not starved by journal
    expect(j).toBeGreaterThan(l) // journal got the larger 70% share
  })

  it('donates unused journal budget to emotion logs', () => {
    const journal = [jEntry('j1', d(5))] // one tiny journal entry → big slack
    const logs = Array.from({ length: 60 }, (_, i) => eLog(`l${i}`, d((i % 28) + 1)))
    const res = selectPayloadWithinBudget(
      scope({ dataTypes: ['journal', 'emotionLogs'], journalEntries: journal, emotionLogs: logs }),
      600,
    )
    expect(res.input.journalEntries).toHaveLength(1) // all journal kept
    // Logs exceeded their bare 30% quota (~7 records) thanks to journal's slack.
    expect(res.input.emotionLogs?.length ?? 0).toBeGreaterThan(10)
  })

  it('donates unused emotion-log budget to journal', () => {
    const journal = Array.from({ length: 60 }, (_, i) => jEntry(`j${i}`, d((i % 28) + 1)))
    const logs = [eLog('l1', d(5))]
    const res = selectPayloadWithinBudget(
      scope({ dataTypes: ['journal', 'emotionLogs'], journalEntries: journal, emotionLogs: logs }),
      600,
    )
    expect(res.input.emotionLogs).toHaveLength(1)
    // Journal exceeded its bare 70% quota (~17 records) thanks to the logs' slack.
    expect(res.input.journalEntries?.length ?? 0).toBeGreaterThan(20)
  })

  it('admits reflections before journal (high-signal priority crowds journal out)', () => {
    const res = selectPayloadWithinBudget(
      scope({
        dataTypes: ['weeklyReflections', 'journal'],
        weeklyReflections: [weekly('2026-W20', d(20), 1500)],
        journalEntries: [1, 2, 3, 4, 5].map((n) => jEntry(`j${n}`, d(n), 3000)),
      }),
      600,
    )
    expect(res.input.weeklyReflections).toHaveLength(1)
    expect(res.input.journalEntries?.length ?? 0).toBeLessThan(5)
  })

  it('keeps input order on equal timestamps (stable)', () => {
    const res = selectPayloadWithinBudget(
      scope({
        dataTypes: ['journal'],
        journalEntries: [jEntry('a', d(10), 3000), jEntry('b', d(10), 3000)],
      }),
      1200, // ~1 entry
    )
    expect((res.input.journalEntries ?? []).map((e) => e.id)).toEqual(['a'])
  })

  it('trims summarized-history periods oldest-first under budget', () => {
    const sh = [
      { periodRef: '2026-W20', periodEndIso: '2026-05-17T00:00:00.000Z', content: 'NEW '.repeat(300) },
      { periodRef: '2026-W19', periodEndIso: '2026-05-10T00:00:00.000Z', content: 'MID '.repeat(300) },
      { periodRef: '2026-W18', periodEndIso: '2026-05-03T00:00:00.000Z', content: 'OLD '.repeat(300) },
    ]
    const res = selectPayloadWithinBudget(scope({ summarizedHistory: sh }), 800) // ~401 tok each
    expect((res.input.summarizedHistory ?? []).map((s) => s.periodRef)).toEqual(['2026-W20'])
    expect(res.droppedSummarizedPeriods).toBe(2)
    expect(res.fits).toBe(true)
  })

  it('admits summarized history ahead of raw journal under pressure', () => {
    const sh = [{ periodRef: '2026-W18', periodEndIso: '2026-05-03T00:00:00.000Z', content: 'DIGEST '.repeat(100) }]
    const journal = Array.from({ length: 10 }, (_, i) => jEntry(`j${i}`, d((i % 28) + 1), 3000))
    const res = selectPayloadWithinBudget(
      scope({ dataTypes: ['journal'], summarizedHistory: sh, journalEntries: journal }),
      1500,
    )
    expect(res.input.summarizedHistory).toHaveLength(1) // digest survived
    expect(res.input.journalEntries?.length ?? 0).toBeGreaterThanOrEqual(1)
    expect(res.input.journalEntries?.length ?? 0).toBeLessThan(10) // raw journal trimmed
    expect(res.droppedSummarizedPeriods).toBe(0)
  })
})
