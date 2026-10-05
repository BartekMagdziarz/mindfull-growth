import { afterEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/test/testDatabase'
import { buildCompanionScenario, PERSONA_IDS } from '@/dev/ai-companion/scenarios'
import { seedScenarioInTestDatabase } from '@/dev/ai-companion/__tests__/seedScenario'
import { saveHistoryAccessPolicy } from '../../history/access'
import { HISTORY_TOOL_DEFINITIONS } from '../../history/toolDefinitions'
import { sourceKey } from '../../history/contracts'
import { assertSchema, normalizeArguments, strictSchema } from '../schema'
import {
  createCompanionHistoryAccess,
  createCompanionSession,
  SpendingBudget,
  type CompanionContext,
  type CompanionEvent,
} from '../runtime'
import {
  createOpenAITransport,
  type ModelResponse,
  type ModelTransport,
  type WireItem,
} from '../openai'

const reply = (message = 'Co pomaga Ci odpocząć?') => ({ message, topics: [], citations: [] })
const response = (output: WireItem[]): ModelResponse => ({
  output,
  usage: { input: 100, output: 30, cached: 0, reasoning: 10 },
  model: 'test-model',
  requestId: 'test-request',
})
const final = (value = reply()) =>
  response([
    {
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text: JSON.stringify(value) }],
    },
  ])
const call = (name: string, args: unknown, id = 'call-1') =>
  response([{ type: 'function_call', call_id: id, name, arguments: JSON.stringify(args) }])
async function setup(persona: (typeof PERSONA_IDS)[number] = 'marta') {
  for (const table of getTestDatabase().tables) await table.clear()
  const scenario = buildCompanionScenario(persona)
  await seedScenarioInTestDatabase(scenario)
  const context: CompanionContext = {
    surface: 'weekly-reflection',
    periodRef: scenario.checkpoints[0].weekRef,
    asOf: scenario.asOf,
    locale: 'pl',
    timeZone: 'Europe/Warsaw',
    approvedProfile: scenario.profile,
  }
  const access = await createCompanionHistoryAccess(context)
  return { scenario, context, access }
}
afterEach(async () => {
  const db = getTestDatabase()
  for (const table of db.tables) await table.clear()
})

describe('companion runtime with real history tools', () => {
  it.each(PERSONA_IDS)(
    'runs %s discovery → read → topics → selected topic and custom conversation',
    async persona => {
      const { context, access } = await setup(persona)
      const events: CompanionEvent[] = []
      let step = 0
      const transport = vi.fn<ModelTransport>(async request => {
        step++
        if (step === 1) {
          const input = JSON.parse(request.input[0].content as string)
          expect(input.context.periodBounds).toEqual({ start: '2026-09-21', end: '2026-09-27' })
          return call('search_history', { kinds: ['journal'], limit: 2 })
        }
        const outputs = request.input.filter(i => i.type === 'function_call_output')
        if (step === 2) {
          const search = JSON.parse(outputs.at(-1)!.output as string)
          return {
            ...call(
              'read_sources',
              {
                requests: search.items.map((item: { ref: unknown }) => ({ ref: item.ref })),
                maxCharsPerSource: 2000,
              },
              'call-2'
            ),
            output: [
              { type: 'reasoning', id: 'rs-1', summary: [], encrypted_content: 'opaque' },
              ...call(
                'read_sources',
                {
                  requests: search.items.map((item: { ref: unknown }) => ({ ref: item.ref })),
                  maxCharsPerSource: 2000,
                },
                'call-2'
              ).output,
            ],
          }
        }
        if (step === 3) {
          expect(
            request.input.some(i => i.type === 'reasoning' && i.encrypted_content === 'opaque')
          ).toBe(true)
          const read = JSON.parse(outputs.at(-1)!.output as string)
          const citation = { ref: read.items[0].ref, version: read.items[0].version }
          return final({
            message: '',
            topics: [
              {
                id: 'rest',
                title: 'Chwila odpoczynku',
                invitation: 'Porozmawiajmy o tym, co Ci pomaga.',
                citations: [citation],
              },
            ],
            citations: [],
          } as ReturnType<typeof reply>)
        }
        expect(request.input.some(i => i.type === 'reasoning')).toBe(false)
        expect(JSON.stringify(request.input)).not.toContain('bursztynowy-latawiec')
        return final()
      })
      const session = createCompanionSession({
        context,
        access,
        transport,
        budget: new SpendingBudget(10),
        onEvent: e => events.push(e),
      })
      const topics = await session.run({ mode: 'topics', draft: '' })
      expect(topics.reply.topics).toHaveLength(1)
      expect(topics.metrics.toolCalls).toBe(2)
      await session.run({ mode: 'conversation', draft: '', topicId: 'rest' })
      await session.run({ mode: 'conversation', draft: '', message: 'Wolę porozmawiać o muzyce.' })
      expect(transport).toHaveBeenCalledTimes(5)
      expect(JSON.stringify(events)).not.toContain('opaque')
      expect(events.filter(e => e.type === 'usage')).toHaveLength(5)
    }
  )

  it('rejects fabricated citations after one correction and does not commit the failed turn', async () => {
    const { context, access } = await setup()
    const bad = final({
      ...reply(),
      citations: [{ ref: { collection: 'journalEntries', id: 'made-up' }, version: 'fake' }],
    } as ReturnType<typeof reply>)
    const transport = vi
      .fn<ModelTransport>()
      .mockResolvedValueOnce(bad)
      .mockResolvedValueOnce(bad)
      .mockResolvedValueOnce(final())
    const session = createCompanionSession({
      context,
      access,
      transport,
      budget: new SpendingBudget(5),
    })
    await expect(
      session.run({ mode: 'conversation', draft: '', message: 'Pytanie' })
    ).rejects.toThrow('unverified-citation')
    expect(transport).toHaveBeenCalledTimes(2)
    await session.run({ mode: 'conversation', draft: '', message: 'Ponów' })
    expect(JSON.stringify(transport.mock.calls[2][0].input)).not.toContain('made-up')
  })

  it('allows one citation correction but never publishes the rejected answer', async () => {
    const { context, access } = await setup()
    const bad = final({
      ...reply('Rejected'),
      citations: [{ ref: { collection: 'journalEntries', id: 'made-up' }, version: 'fake' }],
    } as ReturnType<typeof reply>)
    const transport = vi
      .fn<ModelTransport>()
      .mockResolvedValueOnce(bad)
      .mockResolvedValueOnce(final(reply('Nie mam potwierdzenia w źródłach.')))
    const events: CompanionEvent[] = []
    const session = createCompanionSession({
      context,
      access,
      transport,
      budget: new SpendingBudget(5),
      onEvent: e => events.push(e),
    })
    const result = await session.run({ mode: 'conversation', draft: '', message: 'Pytanie' })
    expect(result.metrics.requests).toBe(2)
    expect(events.filter(e => e.type === 'message')).toHaveLength(1)
    expect(events.some(e => e.type === 'validation-error')).toBe(true)
    expect(result.reply.message).not.toBe('Rejected')
  })

  it('invalidates cached conversation after access changes during a request', async () => {
    const { context, access } = await setup()
    const transport = vi.fn<ModelTransport>(async () => {
      await saveHistoryAccessPolicy({ excludedKinds: ['journal'], excludedSources: [] })
      return final()
    })
    const session = createCompanionSession({
      context,
      access,
      transport,
      budget: new SpendingBudget(5),
    })
    await expect(session.run({ mode: 'conversation', draft: '', message: 'Test' })).rejects.toThrow(
      'history-changed'
    )
    await expect(session.run({ mode: 'conversation', draft: '', message: 'Test' })).rejects.toThrow(
      'session-invalidated'
    )
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('invalidates history on deletion before another network request', async () => {
    const { context, access } = await setup()
    const transport = vi.fn<ModelTransport>().mockResolvedValue(final())
    const session = createCompanionSession({
      context,
      access,
      transport,
      budget: new SpendingBudget(5),
    })
    await session.run({ mode: 'conversation', draft: '', message: 'Test' })
    await getTestDatabase().journalEntries.clear()
    await expect(session.run({ mode: 'conversation', draft: '', message: 'Test' })).rejects.toThrow(
      'history-changed'
    )
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('counts invalid calls toward the tool budget and forces a final answer', async () => {
    const { context, access } = await setup()
    const transport = vi.fn<ModelTransport>(async request => {
      if (!request.toolsEnabled) return final()
      return call('delete_everything', { secret: 'no' })
    })
    const session = createCompanionSession({
      context,
      access,
      transport,
      budget: new SpendingBudget(10),
    })
    const result = await session.run({ mode: 'topics', draft: '' })
    expect(result.metrics.toolCalls).toBe(6)
    expect(transport).toHaveBeenCalledTimes(7)
    expect(JSON.stringify(transport.mock.calls.at(-1)![0].input)).toContain('invalid-arguments')
  })

  it('stops before sending a request that exceeds the spending budget', async () => {
    const { context, access } = await setup()
    const transport = vi.fn<ModelTransport>()
    const session = createCompanionSession({
      context,
      access,
      transport,
      budget: new SpendingBudget(0.001),
    })
    await expect(session.run({ mode: 'topics', draft: '' })).rejects.toThrow('cost-limit')
    expect(transport).not.toHaveBeenCalled()
  })

  it('cancels without committing and prevents concurrent requests', async () => {
    const { context, access } = await setup()
    let release!: (value: ModelResponse) => void
    const transport = vi.fn<ModelTransport>(
      () =>
        new Promise(resolve => {
          release = resolve
        })
    )
    const session = createCompanionSession({
      context,
      access,
      transport,
      budget: new SpendingBudget(5),
    })
    const abort = new AbortController()
    const pending = session.run({ mode: 'topics', draft: '', signal: abort.signal })
    await vi.waitFor(() => expect(transport).toHaveBeenCalled())
    await expect(session.run({ mode: 'topics', draft: '' })).rejects.toThrow('session-busy')
    abort.abort()
    release(final())
    await expect(pending).rejects.toThrow('cancelled')
  })

  it('enforces the deadline and keeps cancellation out of conversation history', async () => {
    const { context, access } = await setup()
    const transport = vi.fn<ModelTransport>(
      request =>
        new Promise((_resolve, reject) => {
          request.signal.addEventListener('abort', () => reject(new Error('aborted')), {
            once: true,
          })
        })
    )
    const session = createCompanionSession({
      context,
      access,
      transport,
      timeoutMs: 80,
      budget: new SpendingBudget(5),
    })
    await expect(session.run({ mode: 'topics', draft: '' })).rejects.toThrow('cancelled')
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('stops oversized context before network use', async () => {
    const { context, access } = await setup()
    context.approvedProfile[0].text = 'a'.repeat(100001)
    const transport = vi.fn<ModelTransport>()
    const session = createCompanionSession({
      context,
      access,
      transport,
      budget: new SpendingBudget(5),
    })
    await expect(session.run({ mode: 'topics', draft: '' })).rejects.toThrow('context-limit')
    expect(transport).not.toHaveBeenCalled()
  })

  it('rejects tool batches above the remaining budget without executing any', async () => {
    const { context, access } = await setup()
    const spy = vi.spyOn(access.tools, 'getHistoryOverview')
    const transport: ModelTransport = async () =>
      response(
        Array.from({ length: 7 }, (_, i) => call('get_history_overview', {}, String(i)).output[0])
      )
    const session = createCompanionSession({
      context,
      access,
      transport,
      budget: new SpendingBudget(5),
    })
    await expect(session.run({ mode: 'topics', draft: '' })).rejects.toThrow('tool-limit')
    expect(spy).not.toHaveBeenCalled()
  })

  it('handles model refusal as an explicit error, without saving a reply', async () => {
    const { context, access } = await setup()
    const session = createCompanionSession({
      context,
      access,
      budget: new SpendingBudget(5),
      transport: async () =>
        response([{ type: 'message', content: [{ type: 'refusal', refusal: 'No' }] }]),
    })
    await expect(session.run({ mode: 'topics', draft: '' })).rejects.toThrow('model-refusal')
  })

  it('keeps a conservative reservation when provider usage is unknown', async () => {
    const { context, access } = await setup()
    const budget = new SpendingBudget(5)
    const session = createCompanionSession({
      context,
      access,
      budget,
      transport: async () => {
        throw new Error('secret provider body')
      },
    })
    await expect(session.run({ mode: 'topics', draft: '' })).rejects.toThrow('runtime-error')
    expect(budget.usedUsd).toBeGreaterThan(0)
  })
})

describe('schemas and OpenAI wire adapter', () => {
  it('converts optional fields to nullable strict keys and validates nested arguments', () => {
    const schema = HISTORY_TOOL_DEFINITIONS[3].parameters
    const strict = strictSchema(schema)
    expect(strict.required).toContain('maxCharsPerSource')
    const args = normalizeArguments(
      {
        requests: [
          { ref: { collection: 'journalEntries', id: 'x' }, offset: null, expectedVersion: null },
        ],
        maxCharsPerSource: null,
      },
      schema
    )
    expect(() => assertSchema(args, schema)).not.toThrow()
    expect(() =>
      assertSchema(normalizeArguments({ ...(args as object), unknown: null }, schema), schema)
    ).toThrow()
    expect(() =>
      assertSchema({ requests: [{ ref: { collection: 'userSettings', id: 'x' } }] }, schema)
    ).toThrow()
    expect(() =>
      assertSchema(
        { requests: [{ ref: { collection: 'journalEntries', id: 'x' }, injection: 'bad' }] },
        schema
      )
    ).toThrow()
    expect(sourceKey({ collection: 'journalEntries', id: 'x' })).toBe('["journalEntries","x"]')
  })

  it('uses stateless Responses with encrypted reasoning, strict tools and bounded outputs', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'completed',
          model: 'gpt-6-luna',
          output: final().output,
          usage: {
            input_tokens: 20,
            output_tokens: 10,
            output_tokens_details: { reasoning_tokens: 5 },
          },
        }),
        { headers: { 'x-request-id': 'r-1' } }
      )
    )
    const transport = createOpenAITransport({ apiKey: 'local-test-key', fetch: fetcher })
    const result = await transport({
      input: [],
      instructions: 'test',
      schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
      maxOutputTokens: 1024,
      toolsEnabled: true,
      signal: new AbortController().signal,
    })
    const body = JSON.parse(fetcher.mock.calls[0][1]!.body as string)
    expect(fetcher.mock.calls[0][0]).toBe('https://api.openai.com/v1/responses')
    expect(body).toMatchObject({
      model: 'gpt-6-luna',
      store: false,
      include: ['reasoning.encrypted_content'],
      parallel_tool_calls: false,
      max_output_tokens: 1024,
      truncation: 'disabled',
    })
    expect(body.tools).toHaveLength(6)
    expect(body.tools.every((t: { strict: boolean }) => t.strict)).toBe(true)
    expect(result.usage.reasoning).toBe(5)
    expect(result.requestId).toBe('r-1')
  })

  it.each(['incomplete', 'failed'])(
    'does not treat %s output as a final response',
    async status => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            status,
            output: final().output,
            usage: { input_tokens: 20, output_tokens: 10 },
          })
        )
      )
      const transport = createOpenAITransport({ apiKey: 'key', fetch: fetcher })
      await expect(
        transport({
          input: [],
          instructions: '',
          schema: {},
          maxOutputTokens: 1024,
          toolsEnabled: true,
          signal: new AbortController().signal,
        })
      ).rejects.toThrow(status === 'incomplete' ? 'incomplete-response' : 'failed-response')
    }
  )

  it.each([401, 429, 500])(
    'redacts provider error body for HTTP %s without retrying',
    async status => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('secret-key-and-data', { status }))
      const transport = createOpenAITransport({ apiKey: 'key', fetch: fetcher })
      await expect(
        transport({
          input: [],
          instructions: '',
          schema: {},
          maxOutputTokens: 1024,
          toolsEnabled: true,
          signal: new AbortController().signal,
        })
      ).rejects.toThrow(`openai-http-${status}`)
      expect(fetcher).toHaveBeenCalledTimes(1)
    }
  )
})
