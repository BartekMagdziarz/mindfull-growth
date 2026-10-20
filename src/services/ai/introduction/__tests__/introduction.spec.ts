import { createHistoryTools } from '../../history/tools'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Dexie from 'dexie'
import { getTestDatabase } from '@/test/testDatabase'
import { UserDatabase } from '@/services/userDatabase.service'
import { introductionService } from '../service'
import { approvedProfileRepository } from '@/repositories/approvedProfileRepository'
import { approvedProfileContext } from '../../profile/context'
import { blankProfileContent } from '@/domain/approvedProfile'
import { saveHistoryAccessPolicy } from '../../history/access'
import type { ModelResponse, ModelTransport } from '../../companion/openai'
const quote = 'Cenię przyjaźń i lubię chodzić po górach.'
const response = (data: unknown): ModelResponse => ({
  output: [
    {
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text: JSON.stringify(data) }],
    },
  ],
  usage: { input: 100, output: 80, cached: 0, reasoning: 0 },
  model: 'gpt-6-luna',
  requestId: null,
})
const candidate = {
  operation: 'add',
  targetId: null,
  targetVersion: null,
  category: 'values',
  scope: 'general',
  text: quote,
  quote,
  reason: 'Własny opis wartości i zasobów.',
  reviewAfter: null,
  validUntil: null,
}
const transport = () =>
  vi
    .fn<ModelTransport>()
    .mockResolvedValue(response({ message: 'Co daje Ci energię i poczucie bliskości?' }))
beforeEach(async () => {
  for (const table of getTestDatabase().tables) await table.clear()
})
describe('broad introduction', () => {
  it('starts locally, skips without inference, persists an unfinished answer and resumes', async () => {
    const api = introductionService()
    let row = await api.start()
    expect(row.area).toBe('identity')
    row = await api.skip(row)
    expect(row.coverage.identity).toBe('skipped')
    row = await api.pause(row, 'Niedokończona odpowiedź')
    row = await introductionService().resume(await api.load(row.id))
    expect(row.draft).toBe('Niedokończona odpowiedź')
    expect((await approvedProfileRepository().snapshot()).proposals).toEqual([])
    expect(await getTestDatabase().profileTasks.count()).toBe(0)
    await expect(api.finish(row)).rejects.toThrow('unsent-draft')
  })
  it('keeps a balanced conversation separate from approval, then revokes excluded introductory context', async () => {
    const api = introductionService(),
      model = transport()
    let row = await api.send(await api.start(), quote, { transport: model })
    expect(row.coverage.identity).toBe('answered')
    expect(row.area).toBe('values')
    expect(model.mock.calls[0][0].toolsEnabled).toBe(false)
    row = await api.finish(row, { transport: async () => response({ proposals: [candidate] }) })
    expect(row.status).toBe('complete')
    const repo = approvedProfileRepository(),
      state = await repo.snapshot()
    expect(state.items).toHaveLength(0)
    expect(state.proposals).toHaveLength(1)
    expect(state.proposals[0].origin.kind).toBe('introduction')
    await repo.decide(state.proposals[0].id, state.proposals[0].version, true)
    expect((await approvedProfileContext()).items).toHaveLength(1)
    await saveHistoryAccessPolicy({
      excludedKinds: [],
      excludedSources: [{ collection: 'companionIntroductions', id: row.id }],
    })
    expect((await approvedProfileContext()).items).toHaveLength(0)
  })
  it('rejects all proposals atomically if any quote was spoken only by AI', async () => {
    const api = introductionService()
    const row = await api.send(await api.start(), quote, { transport: transport() })
    await expect(
      api.finish(row, {
        transport: async () =>
          response({ proposals: [candidate, { ...candidate, quote: 'Co daje Ci energię' }] }),
      })
    ).rejects.toThrow()
    expect((await approvedProfileRepository().snapshot()).proposals).toHaveLength(0)
    expect((await api.load(row.id)).status).toBe('active')
  })
  it('rejects stale-tab updates, cancelled responses and source access changes in flight', async () => {
    const api = introductionService(),
      row = await api.start(),
      model = transport()
    await api.skip(row)
    await expect(api.send(row, quote, { transport: model })).rejects.toThrow(
      'introduction-conflict'
    )
    expect(model).not.toHaveBeenCalled()
    const controller = new AbortController()
    await expect(
      api.send(await api.load(row.id), quote, {
        signal: controller.signal,
        transport: async () => {
          controller.abort()
          return response({ message: 'Nie zapisuj mnie' })
        },
      })
    ).rejects.toThrow('cancelled')
    expect((await api.load(row.id)).draft).toBe(quote)
    expect((await api.load(row.id)).messages.some(m => m.text === 'Nie zapisuj mnie')).toBe(false)
    await expect(
      api.send(await api.load(row.id), quote, {
        transport: async () => {
          await saveHistoryAccessPolicy({ excludedKinds: ['conversation'], excludedSources: [] })
          return response({ message: 'Stary kontekst' })
        },
      })
    ).rejects.toThrow('source-unavailable')
    expect((await api.load(row.id)).messages.some(m => m.role === 'user')).toBe(false)
  })
  it('does not resend a dialogue based on an outdated approved profile', async () => {
    const repo = approvedProfileRepository(),
      api = introductionService()
    const item = await repo.save({ ...blankProfileContent(), text: 'Ważne są relacje.' })
    const row = await api.send(await api.start(), quote, { transport: transport() })
    await repo.save(
      { ...item, text: 'Obecnie najważniejszy jest odpoczynek.' },
      item.id,
      item.version
    )
    const model = transport()
    await expect(api.send(row, 'Kolejna odpowiedź', { transport: model })).rejects.toThrow(
      'introduction-context-changed'
    )
    expect(model).not.toHaveBeenCalled()
  })
  it('allows completion with no answers and no model expense', async () => {
    const api = introductionService()
    const row = await api.finish(await api.start())
    expect(row.status).toBe('complete')
    expect(await getTestDatabase().profileTasks.count()).toBe(0)
  })
  it('includes only explicitly selected exercise results and refuses changed results before sending', async () => {
    const db = getTestDatabase(),
      api = introductionService(),
      model = transport()
    const at = '2026-09-01T12:00:00Z'
    await db.lifeAreaAssessments.bulkPut([
      {
        id: 'chosen',
        createdAt: at,
        updatedAt: at,
        scope: 'partial',
        lifeAreaIds: [],
        items: [],
        notes: 'Pomagają mi spotkania z przyjaciółmi.',
      },
      {
        id: 'other',
        createdAt: at,
        updatedAt: at,
        scope: 'partial',
        lifeAreaIds: [],
        items: [],
        notes: 'Nie dołączaj tego wyniku.',
      },
    ])
    const ref = { collection: 'lifeAreaAssessments' as const, id: 'chosen' }
    const source = (await createHistoryTools().readSources({ requests: [{ ref }] })).items[0]
    if (source.status !== 'ok') throw new Error('Missing exercise')
    let row = await api.start([{ ref, version: source.version }])
    row = await api.send(row, quote, { transport: model })
    expect(JSON.stringify(model.mock.calls[0][0].input)).toContain('Pomagają mi spotkania')
    expect(JSON.stringify(model.mock.calls[0][0].input)).not.toContain('Nie dołączaj tego wyniku')
    await db.lifeAreaAssessments.update('chosen', { notes: 'Aktualny wynik jest inny.' })
    await expect(api.send(row, 'Kolejna odpowiedź', { transport: model })).rejects.toThrow(
      'source-unavailable'
    )
    expect(model).toHaveBeenCalledTimes(1)
  })
  it('upgrades v30 without modifying existing personal data', async () => {
    const id = `e5-migration-${crypto.randomUUID()}`,
      name = id
    const template = new UserDatabase(id)
    const schema = Object.fromEntries(
      template.tables
        .filter(
          t => !['companionIntroductions', 'historyDigests', 'journalDrafts'].includes(t.name)
        )
        .map(t => [t.name, [t.schema.primKey.src, ...t.schema.indexes.map(i => i.src)].join(',')])
    )
    template.close()
    const old = new Dexie(name)
    old.version(30).stores(schema)
    await old.open()
    await old.table('journalEntries').put({
      id: 'kept',
      body: 'Nie zmieniaj mnie',
      createdAt: '2026-09-01T12:00:00Z',
      updatedAt: '2026-09-01T12:00:00Z',
    })
    old.close()
    const current = new UserDatabase(id)
    try {
      await current.open()
      expect(current.verno).toBe(34)
      expect((await current.journalEntries.get('kept'))?.body).toBe('Nie zmieniaj mnie')
      expect(await current.historyDigests.count()).toBe(0)
      expect(await current.companionIntroductions.count()).toBe(0)
    } finally {
      await current.delete()
      await Dexie.delete(name)
    }
  })
})
