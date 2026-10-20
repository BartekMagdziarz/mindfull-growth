import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Table } from 'dexie'
import { connectTestDatabase } from '@/test/testDatabase'
import type { UserDatabase } from '@/services/userDatabaseService'
import { reportError } from '@/utils/reportError'
import { createDexieCrudRepository, type TimestampedRecord } from '../_crud'

interface Note extends TimestampedRecord {
  title: string
  body?: string
}
type CreateNotePayload = Omit<Note, keyof TimestampedRecord>
type UpdateNotePayload = Partial<CreateNotePayload>

// Dexie does not validate record shapes, so any string-keyed table hosts the
// fixture; the cast keeps the factory's generics honest for the spec.
const notesTable = (db: UserDatabase) => db.thoughtRecords as unknown as Table<Note, string>

const notes = createDexieCrudRepository<Note, CreateNotePayload, UpdateNotePayload>({
  table: notesTable,
  label: 'note',
  tables: ['thoughtRecords'],
})

describe('createDexieCrudRepository', () => {
  let db: UserDatabase

  beforeEach(async () => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    db = await connectTestDatabase()
    await db.thoughtRecords.clear()
  })

  it('stamps id and timestamps on create and reads the record back', async () => {
    const created = await notes.create({ title: 'first' })

    expect(created.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(created.createdAt).toBe(created.updatedAt)
    expect(created.title).toBe('first')
    expect(await notes.getById(created.id)).toEqual(created)
    expect(await notes.getAll()).toEqual([created])
  })

  it('stores a plain clone, not the caller object', async () => {
    const payload = { title: 'proxy-free', body: 'x' }
    const created = await notes.create(payload)
    const stored = await notesTable(db).get(created.id)

    expect(stored).toEqual(created)
    expect(stored).not.toBe(created)
  })

  it('merges the patch and bumps updatedAt', async () => {
    const created = await notes.create({ title: 'before', body: 'keep' })
    // Only Date is faked: fake-indexeddb needs the real timer queue.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'))

    const updated = await notes.update(created.id, { title: 'after' })

    expect(updated).toEqual({
      ...created,
      title: 'after',
      updatedAt: '2030-01-01T00:00:00.000Z',
    })
    expect(await notes.getById(created.id)).toEqual(updated)
  })

  it('removes the record on delete and returns undefined afterwards', async () => {
    const created = await notes.create({ title: 'gone' })

    await notes.delete(created.id)

    expect(await notes.getById(created.id)).toBeUndefined()
  })

  it('wraps a missing record on update with the stable message and keeps the cause', async () => {
    const failure = await notes.update('missing', { title: 'x' }).catch((e: unknown) => e)

    expect(failure).toBeInstanceOf(Error)
    expect((failure as Error).message).toBe('Failed to update note with id missing')
    expect(((failure as Error).cause as Error).message).toBe('Note with id missing not found')
    expect(reportError).toHaveBeenCalledWith('thoughtRecords.update', expect.any(Error))
  })

  it('reports and rethrows storage failures with the original error as cause', async () => {
    const dexieFailure = new Error('IndexedDB failure')
    vi.spyOn(db.thoughtRecords, 'toArray').mockRejectedValue(dexieFailure)

    const failure = await notes.getAll().catch((e: unknown) => e)

    expect((failure as Error).message).toBe('Failed to retrieve notes from database')
    expect((failure as Error).cause).toBe(dexieFailure)
    expect(reportError).toHaveBeenCalledTimes(1)
    expect(reportError).toHaveBeenCalledWith('thoughtRecords.getAll', dexieFailure)
  })

  it('names each operation in the message', async () => {
    vi.spyOn(db.thoughtRecords, 'get').mockRejectedValue(new Error('read'))
    vi.spyOn(db.thoughtRecords, 'add').mockRejectedValue(new Error('write'))
    vi.spyOn(db.thoughtRecords, 'delete').mockRejectedValue(new Error('delete'))

    await expect(notes.getById('n-1')).rejects.toThrow('Failed to retrieve note with id n-1')
    await expect(notes.create({ title: 'x' })).rejects.toThrow('Failed to create note in database')
    await expect(notes.delete('n-1')).rejects.toThrow('Failed to delete note with id n-1')
  })

  it('uses the irregular plural when given', async () => {
    const entries = createDexieCrudRepository<Note, CreateNotePayload, UpdateNotePayload>({
      table: notesTable,
      label: 'worry tree entry',
      labelPlural: 'worry tree entries',
      tables: ['thoughtRecords'],
    })
    vi.spyOn(db.thoughtRecords, 'toArray').mockRejectedValue(new Error('boom'))

    await expect(entries.getAll()).rejects.toThrow(
      'Failed to retrieve worry tree entries from database'
    )
  })

  it('can be spread into a repository with extra reads', async () => {
    const withSearch = {
      ...notes,
      async findByTitle(title: string): Promise<Note[]> {
        return (await notes.getAll()).filter(n => n.title === title)
      },
    }
    await withSearch.create({ title: 'a' })
    await withSearch.create({ title: 'b' })

    expect(await withSearch.findByTitle('b')).toHaveLength(1)
  })
})
