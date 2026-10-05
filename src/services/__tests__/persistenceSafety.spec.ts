import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import Dexie from 'dexie'
import { connectTestDatabase } from '@/test/testDatabase'
import {
  UserDatabase,
  getUserDatabase,
  connectUserDatabase,
  disconnectUserDatabase,
} from '@/services/userDatabase.service'
import {
  UserSessionChangedError,
  captureUserSession,
  createStoreSessionScope,
  invalidateUserSession,
} from '@/services/userSessionScope'
import { journalDexieRepository } from '@/repositories/journalDexieRepository'
import { useJournalStore } from '@/stores/journal.store'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { assessmentsDexieRepository } from '@/repositories/assessmentsDexieRepository'
import { exercisePlanDexieRepository } from '@/repositories/exercisePlanDexieRepository'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import { exerciseCompletionDexieRepository } from '@/repositories/exerciseCompletionDexieRepository'
import { autoCompleteFor } from '@/services/exercisePlanService'
import { recordCompletion } from '@/services/exerciseCompletionService'
import { ensureCurrentStepMaterialized } from '@/services/programSchedulerService'
import { userDatabaseOperation } from '@/repositories/userDatabaseOperation'
import { createUserBackup, parseUserBackup, restoreUserBackup } from '@/services/userBackup.service'
import { createScopedDraftStorage } from '@/services/scopedDraftStorage'
import type { DayRef, YearRef } from '@/domain/period'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => {
    resolve = done
  })
  return { promise, resolve }
}
beforeEach(async () => {
  const db = await connectTestDatabase()
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})
afterEach(() => vi.restoreAllMocks())

describe('session boundaries', () => {
  it('does not run an old wizard’s autosave or clear after the session changed', async () => {
    const oldWizard = createScopedDraftStorage()
    invalidateUserSession()
    const newWizard = createScopedDraftStorage()
    await newWizard.saveDraftToDB('wizard', 'new account')
    await oldWizard.saveDraftToDB('wizard', 'old account')
    await oldWizard.clearDraftFromDB('wizard')
    expect(await oldWizard.loadDraftFromDB('wizard')).toBeNull()
    expect(await newWizard.loadDraftFromDB('wizard')).toBe('new account')
  })
  it('invalidates an already captured session and a locally reset store', () => {
    const session = captureUserSession()
    const store = createStoreSessionScope()
    const action = store.capture()
    store.reset()
    expect(() => action.assertCurrent()).toThrow(UserSessionChangedError)
    expect(session.isCurrent()).toBe(true)
    invalidateUserSession()
    expect(() => session.assertCurrent()).toThrow(UserSessionChangedError)
  })
  it('does not repopulate the journal from a response that arrived after reset', async () => {
    const response = deferred<Awaited<ReturnType<typeof journalDexieRepository.getAll>>>()
    vi.spyOn(journalDexieRepository, 'getAll').mockReturnValue(response.promise)
    const store = useJournalStore()
    const loading = store.loadEntries()
    store.reset()
    response.resolve([
      {
        id: 'old',
        body: 'Account A',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    await loading
    expect(store.entries).toEqual([])
    expect(store.isLoaded).toBe(false)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })
  it('a queued write cannot start after session invalidation', async () => {
    const db = getUserDatabase()
    // Queue behind a transaction owning the same table; invalidate while queued.
    let rejected!: Promise<unknown>
    const held = db.transaction('rw', db.journalEntries, async () => {
      await db.journalEntries.put({ id: 'first', body: 'first', createdAt: '', updatedAt: '' })
      const pending = Dexie.ignoreTransaction(() =>
        userDatabaseOperation('rw', ['journalEntries'], async bound => {
          await bound.journalEntries.put({ id: 'late', body: 'late', createdAt: '', updatedAt: '' })
        })
      )
      rejected = expect(pending).rejects.toThrow(UserSessionChangedError)
      invalidateUserSession()
    })
    await held
    await rejected
    expect(await db.journalEntries.get('late')).toBeUndefined()
  })
  it('disconnect wins against an unfinished database open', async () => {
    const opening = deferred<void>()
    const original = UserDatabase.prototype.open
    vi.spyOn(UserDatabase.prototype, 'open').mockImplementation(function (this: UserDatabase) {
      return Dexie.Promise.resolve(opening.promise).then(() => original.call(this))
    })
    const id = `cancelled-${crypto.randomUUID()}`
    const connecting = connectUserDatabase(id)
    const rejected = expect(connecting).rejects.toThrow(UserSessionChangedError)
    await disconnectUserDatabase()
    opening.resolve()
    await rejected
    expect(() => getUserDatabase()).toThrow()
    vi.restoreAllMocks()
    await Dexie.delete(`MindfullGrowthDB_simplify_${id}`)
    await connectTestDatabase()
  })
})

describe('serialized read/modify/write', () => {
  it('preserves both concurrent goal patches', async () => {
    const goal = await goalDexieRepository.create({
      title: 'Goal',
      status: 'open',
      isActive: true,
      lifeAreaIds: [],
      priorityIds: [],
    })
    await Promise.all([
      goalDexieRepository.update(goal.id, { title: 'New title' }),
      goalDexieRepository.update(goal.id, { description: 'New description' }),
    ])
    expect(await goalDexieRepository.getById(goal.id)).toMatchObject({
      title: 'New title',
      description: 'New description',
    })
  })
  it('enforces the five-priority limit with concurrent requests', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, (_, index) =>
        priorityDexieRepository.create({
          title: `P${index}`,
          status: 'active',
          years: ['2026' as YearRef],
          lifeAreaIds: [],
          progressSignals: [],
          riskSignals: [],
        })
      )
    )
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(5)
    const priorities = await priorityDexieRepository.listAll()
    expect(priorities).toHaveLength(5)
    expect(priorities.map(p => p.order).sort()).toEqual([1, 2, 3, 4, 5])
  })
  it('stores one answer and counts it once when two saves overlap', async () => {
    const attempt = await assessmentsDexieRepository.startAttempt({
      assessmentId: 'ipip-bfm-50',
      instrumentVersion: '1',
      language: 'en',
      scoringKeyVersion: '1',
      missingDataPolicyVersion: '1',
      totalItems: 1,
    })
    const payload = {
      attemptId: attempt.id,
      assessmentId: 'ipip-bfm-50' as const,
      itemId: 'item',
      responseValue: 2,
      reverseFlagAtTime: false,
      scoringKeyVersion: '1',
    }
    await Promise.all([
      assessmentsDexieRepository.saveResponse(payload),
      assessmentsDexieRepository.saveResponse({ ...payload, responseValue: 4 }),
    ])
    expect(await assessmentsDexieRepository.getResponsesByAttempt(attempt.id)).toHaveLength(1)
    expect((await assessmentsDexieRepository.getAttemptById(attempt.id))?.responseCount).toBe(1)
  })
  it('consumes separate plans for concurrent completions', async () => {
    for (let i = 0; i < 2; i++)
      await exercisePlanDexieRepository.create({
        exerciseSlug: 'worry-tree',
        dayRef: '2026-01-01' as DayRef,
        source: 'repeat',
      })
    const completed = await Promise.all([
      autoCompleteFor('worry-tree', '2026-01-02' as DayRef),
      autoCompleteFor('worry-tree', '2026-01-02' as DayRef),
    ])
    expect(new Set(completed.map(plan => plan?.id)).size).toBe(2)
    expect(await exercisePlanDexieRepository.listPendingBySlug('worry-tree')).toHaveLength(0)
  })
  it('materializes just one step when two schedulers run together', async () => {
    const enrollment = await programEnrollmentDexieRepository.create({ programSlug: 'ifs-parts' })
    await Promise.all([
      ensureCurrentStepMaterialized(enrollment),
      ensureCurrentStepMaterialized(enrollment),
    ])
    expect(
      await exercisePlanDexieRepository.listPendingByProgramSourceRef(enrollment.id)
    ).toHaveLength(1)
  })
  it('rolls back plan completion if the history insert fails', async () => {
    const plan = await exercisePlanDexieRepository.create({
      exerciseSlug: 'worry-tree',
      dayRef: '2020-01-01' as DayRef,
      source: 'repeat',
    })
    vi.spyOn(exerciseCompletionDexieRepository, 'create').mockRejectedValue(new Error('disk full'))
    await expect(recordCompletion('worry-tree')).rejects.toThrow('disk full')
    expect((await exercisePlanDexieRepository.getById(plan.id))?.status).toBe('pending')
  })
  it('retries the same event without a second history record or plan consumption', async () => {
    for (let i = 0; i < 2; i++)
      await exercisePlanDexieRepository.create({
        exerciseSlug: 'worry-tree',
        dayRef: '2020-01-01' as DayRef,
        source: 'repeat',
      })
    const results = await Promise.all([
      recordCompletion('worry-tree', 'record', 'event'),
      recordCompletion('worry-tree', 'record', 'event'),
    ])
    expect(results[0].completion.id).toBe(results[1].completion.id)
    expect(await getUserDatabase().exerciseCompletions.count()).toBe(1)
    expect(await exercisePlanDexieRepository.listPendingBySlug('worry-tree')).toHaveLength(1)
  })
})

describe('local backups', () => {
  it('round-trips user data and keeps current API settings private', async () => {
    const db = getUserDatabase()
    await db.journalEntries.put({
      id: 'journal',
      body: 'Żółć 🧘',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    await db.userSettings.put({ key: 'aiProviderSettings', value: 'secret' })
    await db.userSettings.put({ key: 'preferences.locale', value: 'pl' })
    const backup = parseUserBackup(JSON.stringify(await createUserBackup()))
    expect(JSON.stringify(backup)).not.toContain('secret')
    expect(backup.tables.profileTasks).toBeUndefined()
    await db.journalEntries.clear()
    await db.userSettings.put({ key: 'aiProviderSettings', value: 'current-secret' })
    await restoreUserBackup(backup)
    expect((await db.journalEntries.get('journal'))?.body).toBe('Żółć 🧘')
    expect((await db.userSettings.get('aiProviderSettings'))?.value).toBe('current-secret')
    expect((await db.userSettings.get('preferences.locale'))?.value).toBe('pl')
  })
  it('rejects incompatible, incomplete and duplicate backup rows without mutation', async () => {
    const db = getUserDatabase()
    await db.journalEntries.put({
      id: 'keep',
      body: 'safe',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    const backup = await createUserBackup()
    expect(() => parseUserBackup(JSON.stringify({ ...backup, version: 99 }))).toThrow()
    expect(() => parseUserBackup(JSON.stringify({ ...backup, tables: {} }))).toThrow()
    backup.tables.journalEntries.push(backup.tables.journalEntries[0])
    await expect(restoreUserBackup(backup)).rejects.toThrow()
    expect((await db.journalEntries.get('keep'))?.body).toBe('safe')
  })
  it('rolls back replacement across tables when any insert fails', async () => {
    const db = getUserDatabase()
    await db.journalEntries.put({
      id: 'keep',
      body: 'safe',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    const backup = await createUserBackup()
    backup.tables.journalEntries[0].body = 'replacement'
    const hook = () => {
      throw new Error('disk full')
    }
    db.userSettings.hook('creating', hook)
    // Ensure an insert occurs after the journal table was replaced.
    backup.tables.userSettings.push({ key: 'preferences.locale', value: 'pl' })
    try {
      await expect(restoreUserBackup(backup)).rejects.toThrow('disk full')
    } finally {
      db.userSettings.hook('creating').unsubscribe(hook)
    }
    expect((await db.journalEntries.get('keep'))?.body).toBe('safe')
  })
})
