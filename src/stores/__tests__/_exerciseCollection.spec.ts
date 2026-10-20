import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import type { DexieCrudRepository, TimestampedRecord } from '@/repositories/_crud'
import { reportError } from '@/utils/reportError'
import { useExerciseCollection } from '../_exerciseCollection'

const record = vi.fn()
vi.mock('@/stores/exerciseCompletions.store', () => ({
  useExerciseCompletionsStore: () => ({ record }),
}))

interface Note extends TimestampedRecord {
  title: string
}
type CreateNote = Omit<Note, keyof TimestampedRecord>
type UpdateNote = Partial<CreateNote>

function makeNote(id: string, createdAt: string, title = id): Note {
  return { id, createdAt, updatedAt: createdAt, title }
}

function makeRepository(): DexieCrudRepository<Note, CreateNote, UpdateNote> & {
  getAll: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
} {
  return {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
}

function makeStore(repository: DexieCrudRepository<Note, CreateNote, UpdateNote>, slug?: string) {
  const useNotes = defineStore(`notes-${Math.random()}`, () => {
    const notes = useExerciseCollection({
      repository,
      label: 'note',
      scope: 'noteStore',
      completionSlug: slug,
    })
    return {
      notes: notes.items,
      isLoading: notes.isLoading,
      error: notes.error,
      sortedNotes: notes.sorted,
      latestNote: notes.latest,
      getNoteById: notes.getById,
      loadNotes: notes.loadAll,
      createNote: notes.create,
      updateNote: notes.update,
      deleteNote: notes.remove,
      reset: notes.reset,
    }
  })
  return useNotes()
}

describe('useExerciseCollection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    record.mockResolvedValue(undefined)
  })

  it('loads records and derives sorted, latest and lookup', async () => {
    const repo = makeRepository()
    const older = makeNote('older', '2026-04-01T00:00:00.000Z')
    const newer = makeNote('newer', '2026-05-01T00:00:00.000Z')
    repo.getAll.mockResolvedValue([older, newer])
    const store = makeStore(repo)

    await store.loadNotes()

    expect(store.notes).toEqual([older, newer])
    expect(store.sortedNotes.map(n => n.id)).toEqual(['newer', 'older'])
    expect(store.latestNote?.id).toBe('newer')
    expect(store.getNoteById('older')).toEqual(older)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('keeps the load failure as a message instead of throwing', async () => {
    const repo = makeRepository()
    repo.getAll.mockRejectedValue(new Error('Database error'))
    const store = makeStore(repo)

    await expect(store.loadNotes()).resolves.toBeUndefined()

    expect(store.error).toBe('Database error')
    expect(store.isLoading).toBe(false)
    expect(reportError).toHaveBeenCalledWith('noteStore.loadAll', expect.any(Error))
  })

  it('falls back to a label-based message for non-Error failures', async () => {
    const repo = makeRepository()
    repo.getAll.mockRejectedValue('boom')
    const store = makeStore(repo)

    await store.loadNotes()

    expect(store.error).toBe('Failed to load notes')
  })

  it('appends created records and records the completion under the slug', async () => {
    const repo = makeRepository()
    const created = makeNote('n-1', '2026-05-01T00:00:00.000Z')
    repo.create.mockResolvedValue(created)
    const store = makeStore(repo, 'note-slug')

    const result = await store.createNote({ title: 'n-1' })

    expect(result).toEqual(created)
    expect(store.notes).toEqual([created])
    expect(record).toHaveBeenCalledWith('note-slug', 'n-1')
  })

  it('does not record a completion without a slug', async () => {
    const repo = makeRepository()
    repo.create.mockResolvedValue(makeNote('n-1', '2026-05-01T00:00:00.000Z'))
    const store = makeStore(repo)

    await store.createNote({ title: 'n-1' })

    expect(record).not.toHaveBeenCalled()
  })

  it('reports a failed completion without failing the create', async () => {
    const repo = makeRepository()
    repo.create.mockResolvedValue(makeNote('n-1', '2026-05-01T00:00:00.000Z'))
    record.mockRejectedValue(new Error('completion down'))
    const store = makeStore(repo, 'note-slug')

    await expect(store.createNote({ title: 'n-1' })).resolves.toBeTruthy()
    await Promise.resolve()

    expect(reportError).toHaveBeenCalledWith('noteStore.recordCompletion', expect.any(Error))
  })

  it('rethrows create failures after storing the message', async () => {
    const repo = makeRepository()
    repo.create.mockRejectedValue(new Error('Create failed'))
    const store = makeStore(repo)

    await expect(store.createNote({ title: 'x' })).rejects.toThrow('Create failed')

    expect(store.error).toBe('Create failed')
    expect(store.notes).toEqual([])
  })

  it('replaces the updated record in place', async () => {
    const repo = makeRepository()
    const existing = makeNote('n-1', '2026-05-01T00:00:00.000Z', 'before')
    repo.getAll.mockResolvedValue([existing])
    repo.update.mockResolvedValue({ ...existing, title: 'after' })
    const store = makeStore(repo)
    await store.loadNotes()

    const updated = await store.updateNote('n-1', { title: 'after' })

    expect(updated.title).toBe('after')
    expect(store.notes).toEqual([updated])
    expect(repo.update).toHaveBeenCalledWith('n-1', { title: 'after' })
  })

  it('removes the record and rethrows delete failures', async () => {
    const repo = makeRepository()
    repo.getAll.mockResolvedValue([
      makeNote('n-1', '2026-05-01T00:00:00.000Z'),
      makeNote('n-2', '2026-05-02T00:00:00.000Z'),
    ])
    repo.delete.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Delete failed'))
    const store = makeStore(repo)
    await store.loadNotes()

    await store.deleteNote('n-1')
    expect(store.notes.map(n => n.id)).toEqual(['n-2'])

    await expect(store.deleteNote('n-2')).rejects.toThrow('Delete failed')
    expect(store.error).toBe('Delete failed')
    expect(store.notes.map(n => n.id)).toEqual(['n-2'])
  })

  it('reset clears state and drops results of work started before it', async () => {
    const repo = makeRepository()
    let resolveLoad: (notes: Note[]) => void = () => undefined
    repo.getAll.mockReturnValue(new Promise<Note[]>(resolve => (resolveLoad = resolve)))
    const store = makeStore(repo)

    const pending = store.loadNotes()
    store.reset()
    resolveLoad([makeNote('stale', '2026-05-01T00:00:00.000Z')])
    await pending

    expect(store.notes).toEqual([])
    expect(store.error).toBeNull()
    expect(store.isLoading).toBe(false)
  })
})
