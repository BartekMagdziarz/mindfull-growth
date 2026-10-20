import { buildCompanionScenario, PERSONA_IDS } from '@/dev/ai-companion/scenarios'
import { seedScenarioInTestDatabase } from '@/dev/ai-companion/__tests__/seedScenario'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/test/testDatabase'
import { approvedProfileRepository } from '@/repositories/approvedProfileRepository'
import { proposeHistoryObservations } from '../observations'
import { approvedProfileContext } from '../context'
import { discussProfileProposal } from '../assistant'
import { saveHistoryAccessPolicy } from '../../history/access'
import { createHistoryTools } from '../../history/tools'
import { companionConversation } from '../../companion/weeklyConversation'
import type { ModelResponse, ModelTransport } from '../../companion/openai'
const input = {
  focus: 'Co pomaga w odpoczynku i ruchu?',
  from: '2026-09-01',
  to: '2026-09-27',
  timeZone: 'Europe/Warsaw',
}
const response = (data: unknown): ModelResponse => ({
  output: [
    {
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text: JSON.stringify(data) }],
    },
  ],
  usage: { input: 100, output: 100, cached: 0, reasoning: 0 },
  model: 'gpt-6-luna',
  requestId: null,
})
async function entry(id: string, date: string, body: string) {
  await getTestDatabase().journalEntries.put({
    id,
    title: '',
    body,
    createdAt: `${date}T12:00:00Z`,
    updatedAt: `${date}T12:00:00Z`,
  })
}
const model = (mutate?: (candidate: Record<string, unknown>, payload: any) => void) =>
  vi.fn<ModelTransport>(async request => {
    const payload = JSON.parse(String(request.input[0].content))
    if (request.schema.properties?.topicQuery)
      return response({ topicQuery: 'ruch', counterQuery: 'odpoczynek' })
    const evidence = payload.evidence as Array<{ id: string; citation: { ref: { id: string } } }>
    const candidate = {
      text: 'Być może krótki ruch bywa pomocny, ale odpoczynek bez ruchu również ma miejsce.',
      reason: 'Dwa różne dni i wyjątek.',
      limitations: 'Mała próbka. Nie dowodzi przyczyny ani stałej cechy.',
      support: ['one', 'two'].map(id => evidence.find(e => e.citation.ref.id === id)!.id),
      counterexamples: [evidence.find(e => e.citation.ref.id === 'counter')!.id],
    }
    mutate?.(candidate, payload)
    return response({ observations: [candidate] })
  })
beforeEach(async () => {
  const db = getTestDatabase()
  for (const table of db.tables) await table.clear()
  await entry('one', '2026-09-10', 'Krótki ruch po pracy dał mi ulgę i przyjemność.')
  await entry('two', '2026-09-15', 'Dzisiaj ruch na świeżym powietrzu był pomocny i spokojny.')
  await entry('counter', '2026-09-20', 'Tym razem odpoczynek na kanapie był ważniejszy niż spacer.')
})
describe('history observations', () => {
  it('creates only a proposal with literal source evidence, exception search and review date', async () => {
    const transport = model(),
      result = await proposeHistoryObservations(input, { transport })
    expect(result.created).toBe(1)
    expect(transport).toHaveBeenCalledTimes(2)
    const repo = approvedProfileRepository(),
      state = await repo.snapshot(),
      p = state.proposals[0]
    expect(state.items).toEqual([])
    expect(p.origin.kind).toBe('observation')
    expect(p.origin.observation?.searches.some(s => s.purpose === 'counterexample')).toBe(true)
    expect(p.origin.observation?.counterexamples[0].citation.ref.id).toBe('counter')
    expect(p.origin.observation?.support[0].quote).toContain('Krótki ruch')
    expect(p.content.reviewAfter).toBeTruthy()
    await repo.decide(p.id, p.version, true, {
      ...p.content,
      text: 'Ruch czasem pomaga; nie chcę zamieniać go w obowiązek.',
    })
    const context = await approvedProfileContext()
    expect(context.items[0].text).toContain('nie chcę')
    expect(context.items[0].epistemicStatus).toBe('user-accepted-hypothesis')
    expect(context.items[0].observation?.counterexamples).toHaveLength(1)
  })
  it('reuses a completed analysis without paying again', async () => {
    const transport = model()
    await proposeHistoryObservations(input, { transport })
    const result = await proposeHistoryObservations(input, { transport })
    expect(result.reused).toBe(true)
    expect(transport).toHaveBeenCalledTimes(2)
  })
  it('does not treat one retrospective reflection as multiple episodes', async () => {
    await getTestDatabase().journalEntries.clear()
    await getTestDatabase().weeklyReflections.put({
      id: 'summary',
      weekRef: '2026-W38',
      freeformReflection: 'Powtarzana opowieść o ruchu.',
      createdAt: '2026-09-21T12:00:00Z',
      updatedAt: '2026-09-21T12:00:00Z',
    } as any)
    const transport = model()
    expect((await proposeHistoryObservations(input, { transport })).created).toBe(0)
    expect(transport).toHaveBeenCalledTimes(1)
  })
  it('does not count two records on the same day or literal copies as two episodes', async () => {
    const db = getTestDatabase()
    await db.journalEntries.clear()
    await entry('one', '2026-09-10', 'Krótki ruch po pracy dał mi ulgę i przyjemność.')
    await entry('two', '2026-09-10', 'Opis tego samego spaceru w innym wpisie.')
    await entry('copy', '2026-09-11', 'Krótki ruch po pracy dał mi ulgę i przyjemność.')
    const transport = model()
    expect((await proposeHistoryObservations(input, { transport })).created).toBe(0)
    expect(transport).toHaveBeenCalledTimes(1)
  })
  it('rejects invented evidence IDs without writing any proposal', async () => {
    await expect(
      proposeHistoryObservations(input, {
        transport: model(c => {
          c.support = ['invented', 'also-invented']
        }),
      })
    ).rejects.toThrow('invalid-response')
    expect((await approvedProfileRepository().snapshot()).proposals).toEqual([])
  })
  it('rejects two quotes from one episode without partial writes', async () => {
    await expect(
      proposeHistoryObservations(input, {
        transport: model(c => {
          c.support = [(c.support as string[])[0], (c.support as string[])[0]]
        }),
      })
    ).rejects.toThrow('insufficient-evidence')
    expect((await approvedProfileRepository().snapshot()).proposals).toEqual([])
  })
  it('blocks acceptance, discussion and accepted context after excluding an evidence source', async () => {
    await proposeHistoryObservations(input, { transport: model() })
    const repo = approvedProfileRepository(),
      p = (await repo.snapshot()).proposals[0]
    await saveHistoryAccessPolicy({
      excludedKinds: [],
      excludedSources: [{ collection: 'journalEntries', id: 'counter' }],
    })
    await expect(repo.decide(p.id, p.version, true)).rejects.toThrow('source-unavailable')
    const transport = vi.fn<ModelTransport>()
    await expect(discussProfileProposal(p, 'Czy to prawda?', { transport })).rejects.toThrow(
      'source-unavailable'
    )
    expect(transport).not.toHaveBeenCalled()
    await repo.decide(p.id, p.version, false)
    expect((await approvedProfileContext()).observationDecisions).toEqual([])
  })
  it('keeps rejected interpretations out of facts and respects them in the next chat', async () => {
    await proposeHistoryObservations(input, { transport: model() })
    const repo = approvedProfileRepository(),
      p = (await repo.snapshot()).proposals[0]
    await repo.decide(p.id, p.version, false)
    const context = await approvedProfileContext()
    expect(context.items).toEqual([])
    expect(context.observationDecisions[0].status).toBe('rejected')
    const transport = vi
      .fn<ModelTransport>()
      .mockResolvedValue(
        response({ message: 'O czym chcesz porozmawiać?', topics: [], citations: [] })
      )
    const chat = companionConversation('2026-W39', {
      locale: 'pl',
      timeZone: 'Europe/Warsaw',
      transport,
    })
    await chat.setEnabled(true)
    const row = await chat.run({
      mode: 'conversation',
      message: 'Co teraz?',
      draft: '',
      signal: new AbortController().signal,
    })
    expect(JSON.stringify(transport.mock.calls[0][0].input)).toContain('observationDecisions')
    expect(transport.mock.calls[0][0].instructions).toContain('NOT facts')
    await getTestDatabase().journalEntries.delete('one')
    expect((await approvedProfileContext()).observationDecisions).toEqual([])
    const history = await createHistoryTools().readSources({
      requests: [{ ref: { collection: 'companionConversations', id: row.id } }],
    })
    expect(history.items[0].status).toBe('unavailable')
  })
  it('does not recreate a rejected observation after an unrelated history change', async () => {
    await proposeHistoryObservations(input, { transport: model() })
    const repo = approvedProfileRepository(),
      p = (await repo.snapshot()).proposals[0]
    await repo.decide(p.id, p.version, false)
    await entry('new', '2026-09-25', 'Inny temat: lubię spędzać czas z rodziną.')
    expect((await proposeHistoryObservations(input, { transport: model() })).created).toBe(0)
    expect((await repo.snapshot()).proposals).toHaveLength(1)
  })
  it('discards the analysis if source data changes while the model is responding', async () => {
    const base = model(),
      transport: ModelTransport = async request => {
        const result = await base(request)
        if (request.schema.properties?.observations)
          await getTestDatabase().journalEntries.delete('one')
        return result
      }
    await expect(proposeHistoryObservations(input, { transport })).rejects.toThrow(
      'history-changed'
    )
    expect((await approvedProfileRepository().snapshot()).proposals).toEqual([])
  })
  it('cancellation never accepts or creates a late proposal', async () => {
    const controller = new AbortController(),
      base = model(),
      transport: ModelTransport = async request => {
        const result = await base(request)
        controller.abort()
        return result
      }
    await expect(
      proposeHistoryObservations(input, { transport, signal: controller.signal })
    ).rejects.toThrow('cancelled')
    expect((await approvedProfileRepository().snapshot()).proposals).toEqual([])
  })
  it('allows the model to find no useful observation', async () => {
    const transport: ModelTransport = async request =>
      response(
        request.schema.properties?.topicQuery
          ? { topicQuery: 'ruch', counterQuery: 'odpoczynek' }
          : { observations: [] }
      )
    expect((await proposeHistoryObservations(input, { transport })).created).toBe(0)
  })
  it('rejects invalid dates before requesting a model', async () => {
    const transport = model()
    await expect(
      proposeHistoryObservations({ ...input, from: '2026-02-30' }, { transport })
    ).rejects.toThrow('invalid-input')
    expect(transport).not.toHaveBeenCalled()
  })
  it('does not suppress a fresh proposal when old evidence metadata was invalidated by access changes', async () => {
    await proposeHistoryObservations(input, { transport: model() })
    await saveHistoryAccessPolicy({
      excludedKinds: [],
      excludedSources: [{ collection: 'journalEntries', id: 'unrelated-private-source' }],
    })
    const result = await proposeHistoryObservations(input, { transport: model() })
    expect(result.created).toBe(1)
    const proposals = (await approvedProfileRepository().snapshot()).proposals
    expect(proposals).toHaveLength(2)
  })
  it('rejects a plan that only repeats the confirming search', async () => {
    const transport: ModelTransport = async () =>
      response({ topicQuery: 'Ruch', counterQuery: 'ruch' })
    await expect(proposeHistoryObservations(input, { transport })).rejects.toThrow(
      'invalid-search-plan'
    )
    expect((await approvedProfileRepository().snapshot()).proposals).toEqual([])
  })
  it.each(PERSONA_IDS)(
    'runs bounded research on %s without passing protected fixture text to the model',
    async persona => {
      for (const table of getTestDatabase().tables) await table.clear()
      await seedScenarioInTestDatabase(buildCompanionScenario(persona))
      const transport: ModelTransport = async request => {
        expect(JSON.stringify(request.input)).not.toContain('bursztynowy-latawiec')
        if (request.schema.properties?.topicQuery)
          return response({ topicQuery: 'przyjem', counterQuery: 'trud' })
        const payload = JSON.parse(String(request.input[0].content))
        const episodes = [
          ...new Map(
            (payload.evidence as Array<{ id: string; episode: string }>).map(e => [e.episode, e])
          ).values(),
        ]
        expect(episodes.length).toBeGreaterThanOrEqual(2)
        expect(
          payload.searches.some((s: { purpose: string }) => s.purpose === 'counterexample')
        ).toBe(true)
        return response({
          observations: [
            {
              text: 'Możliwe, że krótkie dobre doświadczenia są warte uwagi.',
              reason: 'Propozycja do wspólnego sprawdzenia.',
              limitations: 'Wybrane zapisy nie są pełnym obrazem osoby.',
              support: episodes.slice(0, 2).map(e => e.id),
              counterexamples: [],
            },
          ],
        })
      }
      expect((await proposeHistoryObservations(input, { transport })).created).toBe(1)
      expect((await approvedProfileContext()).items).toEqual([])
    }
  )
  it('removes accepted hypotheses from AI context when a counterexample is deleted', async () => {
    await proposeHistoryObservations(input, { transport: model() })
    const repo = approvedProfileRepository(),
      proposal = (await repo.snapshot()).proposals[0]
    await repo.decide(proposal.id, proposal.version, true)
    expect((await approvedProfileContext()).items).toHaveLength(1)
    await getTestDatabase().journalEntries.delete('counter')
    expect((await approvedProfileContext()).items).toEqual([])
    expect((await repo.snapshot()).items).toHaveLength(1)
  })
})

describe('broader observation sources', () => {
  it('includes other exercises, reflection, planning and assessments alongside journal entries', async () => {
    const db = getTestDatabase()
    for (const [collection, content] of [
      ['compassionateLetters', { letter: 'Dałam sobie przestrzeń na odpoczynek bez oceniania.' }],
      [
        'weeklyReflections',
        {
          weekRef: '2026-W38',
          freeformReflection: 'W tym tygodniu odpoczynek wspierał mnie w pracy.',
        },
      ],
      ['habits', { title: 'Spacer', description: 'Chcę wychodzić na krótkie spacery po pracy.' }],
      [
        'assessmentAttempts',
        { responseCount: 0, notes: 'Moja odpowiedź w kwestionariuszu dotyczy odpoczynku.' },
      ],
    ] as const) {
      await db.table(collection).put({
        id: collection,
        ...content,
        createdAt: '2026-09-22T12:00:00Z',
        updatedAt: '2026-09-22T12:00:00Z',
      })
    }
    const transport = model((_c, payload) => {
      const collections = payload.evidence.map((e: any) => e.citation.ref.collection)
      for (const name of [
        'compassionateLetters',
        'weeklyReflections',
        'habits',
        'assessmentAttempts',
      ])
        expect(collections).toContain(name)
      expect(payload.evidence.find((e: any) => e.citation.ref.collection === 'habits').role).toBe(
        'plan'
      )
      expect(
        payload.evidence.find((e: any) => e.citation.ref.collection === 'weeklyReflections').role
      ).toBe('retrospective')
    })
    expect((await proposeHistoryObservations(input, { transport })).created).toBe(1)
  })
  it('retains numeric execution, its actual day and linked older habit; invalidates on definition change', async () => {
    const db = getTestDatabase()
    await db.table('habits').put({
      id: 'old-habit',
      title: 'Spacer',
      description: 'Spacer bez obowiązku osiągania dystansu.',
      createdAt: '2026-01-01T12:00:00Z',
      updatedAt: '2026-01-01T12:00:00Z',
    })
    await db.table('dailyMeasurementEntries').put({
      id: 'measurement',
      subjectType: 'habit',
      subjectId: 'old-habit',
      dayRef: '2026-09-05',
      value: 0,
      createdAt: '2026-09-25T12:00:00Z',
      updatedAt: '2026-09-25T12:00:00Z',
    })
    const transport = model((_c, payload) => {
      const item = payload.evidence.find(
        (e: any) => e.citation.ref.id === 'measurement' && e.field === 'value'
      )
      expect(item).toMatchObject({ quote: '0', role: 'execution', eventDay: '2026-09-05' })
      expect(payload.relatedContext.find((s: any) => s.ref.id === 'old-habit').title).toBe('Spacer')
    })
    await proposeHistoryObservations(input, { transport })
    const repo = approvedProfileRepository(),
      proposal = (await repo.snapshot()).proposals[0]
    expect(proposal.origin.citations.some(c => c.ref.id === 'old-habit')).toBe(true)
    await db.table('habits').update('old-habit', { description: 'Nowa definicja celu.' })
    await expect(repo.decide(proposal.id, proposal.version, true)).rejects.toThrow(
      'source-unavailable'
    )
  })
  it('does not send excluded exercises to either model call', async () => {
    const db = getTestDatabase()
    await db.table('compassionateLetters').put({
      id: 'private',
      letter: 'SEKRET NIE PRZEKAZUJ',
      createdAt: '2026-09-22T12:00:00Z',
      updatedAt: '2026-09-22T12:00:00Z',
    })
    await saveHistoryAccessPolicy({ excludedKinds: ['exercise'], excludedSources: [] })
    const transport = model()
    await proposeHistoryObservations(input, { transport })
    expect(JSON.stringify(transport.mock.calls)).not.toContain('SEKRET')
  })
})

it('uses measurement days rather than backfill time for distinct evidence episodes', async () => {
  const db = getTestDatabase()
  await db.table('habits').put({
    id: 'habit',
    title: 'Spacer',
    createdAt: '2026-01-01T12:00:00Z',
    updatedAt: '2026-01-01T12:00:00Z',
  })
  for (const [id, dayRef, value] of [
    ['m1', '2026-09-03', 1],
    ['m2', '2026-09-04', 0],
  ] as const)
    await db.table('dailyMeasurementEntries').put({
      id,
      subjectType: 'habit',
      subjectId: 'habit',
      dayRef,
      value,
      createdAt: '2026-09-25T12:00:00Z',
      updatedAt: '2026-09-25T12:00:00Z',
    })
  const transport = model((candidate, payload) => {
    candidate.support = ['m1', 'm2'].map(
      id => payload.evidence.find((e: any) => e.citation.ref.id === id && e.field === 'value').id
    )
    candidate.text = 'Dwa zapisy spaceru mają różne wartości; warto omówić ich znaczenie.'
  })
  expect((await proposeHistoryObservations(input, { transport })).created).toBe(1)
  const repo = approvedProfileRepository(),
    p = (await repo.snapshot()).proposals[0]
  await repo.decide(p.id, p.version, true)
  expect((await approvedProfileContext()).items).toHaveLength(1)
})
