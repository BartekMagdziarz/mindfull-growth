import { beforeEach, describe, expect, it, vi } from 'vitest'
import Dexie from 'dexie'
import { UserDatabase } from '@/services/userDatabase.service'
import { getTestDatabase } from '@/test/testDatabase'
import { weeklyConversation, reconcileTopics } from '../weeklyConversation'
import { companionConversationRepository } from '@/repositories/companionConversationRepository'
import { saveHistoryAccessPolicy } from '../../history/access'
import type { ModelResponse, ModelTransport } from '../openai'
import type { CompanionReply } from '../runtime'
const PERIOD = '2026-W38'
const topic = (id: string) => ({
  id,
  title: `Temat ${id}`,
  invitation: 'Porozmawiajmy.',
  citations: [],
})
const answer = (
  topics: CompanionReply['topics'] = [],
  message = 'Co było dla Ciebie ważne?'
): ModelResponse => ({
  output: [
    {
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text: JSON.stringify({ message, topics, citations: [] }) }],
    },
  ],
  usage: { input: 100, output: 50, cached: 0, reasoning: 0 },
  model: 'gpt-6-luna',
  requestId: 'test',
})
const input = () => ({
  mode: 'topics' as const,
  draft: 'Mój tydzień',
  signal: new AbortController().signal,
})
const client = (transport: ModelTransport, period = PERIOD) =>
  weeklyConversation(period, { locale: 'pl', timeZone: 'Europe/Warsaw', transport })
beforeEach(async () => {
  for (const table of getTestDatabase().tables) await table.clear()
})
describe('weekly companion persistence', () => {
  it('adds conversation storage to version 28 without changing existing records', async () => {
    const name = `migration-companion-${crypto.randomUUID()}`
    const candidate = new UserDatabase(name)
    const schema = Object.fromEntries(
      candidate.tables
        .filter(
          t =>
            ![
              'companionConversations',
              'approvedProfileItems',
              'profileProposals',
              'profileChanges',
              'profileTasks',
              'companionIntroductions',
              'historyDigests',
              'journalDrafts',
            ].includes(t.name)
        )
        .map(t => [t.name, [t.schema.primKey.src, ...t.schema.indexes.map(i => i.src)].join(', ')])
    )
    candidate.close()
    const old = new Dexie(name)
    old.version(28).stores(schema)
    const original = {
      id: 'retained-entry',
      text: 'Mój własny zapis',
      createdAt: '2026-09-21T12:00:00Z',
    }
    await old.table('journalEntries').put(original)
    old.close()
    const upgraded = new UserDatabase(name)
    try {
      await upgraded.open()
      expect(upgraded.verno).toBe(34)
      expect(await upgraded.journalEntries.get(original.id)).toEqual(original)
      expect(await upgraded.companionConversations.count()).toBe(0)
    } finally {
      await upgraded.delete()
    }
  })
  it('restores topics and conversation independently of a saved reflection', async () => {
    const transport = vi
      .fn<ModelTransport>()
      .mockResolvedValueOnce(answer([topic('a')]))
      .mockResolvedValueOnce(answer())
      .mockResolvedValueOnce(answer())
    const first = client(transport)
    await first.setEnabled(true)
    await first.run(input())
    await first.run({ ...input(), mode: 'conversation', topicId: 'a' })
    const second = client(transport)
    const row = await second.load()
    expect(row.topics[0].id).toBe('a')
    expect(row.messages.map(m => m.role)).toEqual(['assistant'])
    expect(row.messages[0].text).toBe(topic('a').invitation)
    expect(transport).toHaveBeenCalledTimes(1)
    expect(await getTestDatabase().weeklyReflections.count()).toBe(0)
    await second.run({ ...input(), mode: 'conversation', message: 'A co z odpoczynkiem?' })
    expect(JSON.stringify(transport.mock.calls[1][0].input)).toContain(topic('a').invitation)
    expect((await second.load()).messages).toHaveLength(3)
    expect((await client(transport, '2026-W37').load()).messages).toHaveLength(0)
  })
  it('opens the selected question across topic changes and context refresh without model calls', async () => {
    const a = { ...topic('a'), invitation: 'Pierwsze pytanie?' }
    const b = { ...topic('b'), invitation: 'Drugie pytanie?' }
    const transport = vi.fn<ModelTransport>().mockResolvedValue(answer([a, b]))
    const c = client(transport)
    await c.setEnabled(true)
    await c.run(input())
    for (const selected of [a, b, a]) {
      const row = await c.run({ ...input(), mode: 'conversation', topicId: selected.id })
      expect(row.messages.at(-1)).toMatchObject({
        role: 'assistant',
        topicId: selected.id,
        topicTitle: selected.title,
        text: selected.invitation,
      })
      expect(row.state?.history.at(-1)?.content).toBe(selected.invitation)
    }
    expect(transport).toHaveBeenCalledTimes(1)
    await c.resetContext()
    await c.run(input())
    const row = await c.run({ ...input(), mode: 'conversation', topicId: b.id })
    expect(row.messages.at(-1)?.text).toBe(b.invitation)
    expect(row.messages.slice(row.historyStartIndex).map(m => m.text)).toEqual([b.invitation])
    expect(transport).toHaveBeenCalledTimes(2)
  })
  it('acquires one lease atomically across two tabs and recovers expired leases', async () => {
    const one = companionConversationRepository(PERIOD),
      two = companionConversationRepository(PERIOD)
    await one.setEnabled(true)
    const attempts = await Promise.allSettled([one.acquire(), two.acquire()])
    expect(attempts.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    const row = await one.load()
    await getTestDatabase().companionConversations.update(row.id, {
      pending: { token: 'expired', expiresAt: Date.now() - 1 },
    })
    const recovered = await two.acquire()
    expect(recovered.token).not.toBe('expired')
  })
  it('never commits a response after cancellation and preserves the previous topics', async () => {
    let release!: (r: ModelResponse) => void
    const transport = vi
      .fn<ModelTransport>()
      .mockResolvedValueOnce(answer([topic('a')]))
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            release = resolve
          })
      )
    const c = client(transport)
    await c.setEnabled(true)
    await c.run(input())
    const abort = new AbortController()
    const pending = c.run({
      ...input(),
      mode: 'conversation',
      message: 'Test',
      signal: abort.signal,
    })
    await vi.waitFor(() => expect(release).toBeTypeOf('function'))
    abort.abort()
    release(answer())
    await expect(pending).rejects.toThrow('cancelled')
    const row = await c.load()
    expect(row.messages).toEqual([])
    expect(row.pending).toBeUndefined()
    expect(row.topics[0].id).toBe('a')
  })
  it('stops old results when another tab disables the feature', async () => {
    let release!: (r: ModelResponse) => void
    const transport = vi.fn<ModelTransport>(
      () =>
        new Promise(resolve => {
          release = resolve
        })
    )
    const c = client(transport)
    await c.setEnabled(true)
    const pending = c.run(input())
    await vi.waitFor(() => expect(release).toBeTypeOf('function'))
    await companionConversationRepository(PERIOD).setEnabled(false)
    release(answer([topic('a')]))
    await expect(pending).rejects.toThrow('conversation-changed')
    expect((await c.load()).topics).toEqual([])
  })
  it('requires fresh context after permissions change; old conversation is not resent', async () => {
    const transport = vi.fn<ModelTransport>().mockResolvedValue(answer([], 'OLD PRIVATE MESSAGE'))
    const c = client(transport)
    await c.setEnabled(true)
    await c.run({ ...input(), mode: 'conversation', message: 'Hello' })
    await saveHistoryAccessPolicy({ excludedKinds: ['journal'], excludedSources: [] })
    await expect(c.run({ ...input(), mode: 'conversation', message: 'Continue' })).rejects.toThrow(
      'history-changed'
    )
    expect(transport).toHaveBeenCalledTimes(1)
    await c.resetContext()
    const reopened = client(transport)
    await reopened.run({ ...input(), mode: 'conversation', message: 'Nowy temat' })
    // The mock stores a mutable input array, including its eventual response;
    // inspect the outgoing user content, not the newly appended output item.
    const userInput = transport.mock.calls[1][0].input.filter(i => i.role === 'user')
    expect(JSON.stringify(userInput)).not.toContain('OLD PRIVATE MESSAGE')
    expect((await reopened.load()).messages.some(m => m.role === 'notice')).toBe(true)
  })
  it('clears current and archived messages without resetting cost or another conversation', async () => {
    const transport = vi.fn<ModelTransport>().mockResolvedValue(answer([], 'OLD ANSWER'))
    const c = client(transport)
    await c.setEnabled(true)
    await c.run({ ...input(), mode: 'conversation', message: 'OLD USER TEXT' })
    await c.resetContext()
    const other = client(transport, '2026-W39')
    await other.setEnabled(true)
    await other.run({ ...input(), mode: 'conversation', message: 'Other week' })
    const otherBefore = await other.load()
    const before = await c.load()
    const calls = transport.mock.calls.length
    await c.clearConversation()
    const cleared = await c.load()
    expect(cleared.messages).toEqual([])
    expect(cleared.topics).toEqual([])
    expect(cleared.state).toBeUndefined()
    expect(cleared.historyStartIndex).toBeUndefined()
    expect(cleared.enabled).toBe(true)
    expect(cleared.spentUsd).toBe(before.spentUsd)
    expect(await other.load()).toEqual(otherBefore)
    expect(transport).toHaveBeenCalledTimes(calls)
    await c.run({ ...input(), mode: 'conversation', message: 'Fresh start' })
    const outgoing = transport.mock.calls.at(-1)![0].input.filter(i => i.role === 'user')
    expect(JSON.stringify(outgoing)).not.toContain('OLD USER TEXT')
  })
  it('refuses clearing while another tab owns the conversation lease', async () => {
    const repository = companionConversationRepository(PERIOD)
    await repository.setEnabled(true)
    const { token } = await repository.acquire()
    await expect(repository.clearConversation()).rejects.toThrow('conversation-busy')
    await repository.assertLease(token)
  })
  it('does not regenerate topics wholesale during a manual draft update', () => {
    const old = ['a', 'b', 'c', 'd', 'e'].map(topic)
    const updated = reconcileTopics(old, ['v', 'w', 'x', 'y', 'z'].map(topic))
    expect(updated.slice(0, 4)).toEqual(old.slice(0, 4))
    expect(updated[4].id).toBe('v')
    expect(reconcileTopics(old, old)).toEqual(old)
  })
  it('charges unsuccessful requests and prevents further calls at the weekly limit', async () => {
    const transport = vi.fn<ModelTransport>().mockRejectedValue(new Error('network'))
    const c = client(transport)
    await c.setEnabled(true)
    await expect(c.run(input())).rejects.toThrow()
    const row = await c.load()
    expect(row.spentUsd).toBeGreaterThan(0)
    await getTestDatabase().companionConversations.update(row.id, { spentUsd: 0.5 })
    await expect(c.run(input())).rejects.toThrow('cost-limit')
    expect(transport).toHaveBeenCalledTimes(1)
  })
})
