import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { effectScope, type EffectScope } from 'vue'
import {
  PRIORITY_CREATOR_DRAFT_KEY,
  RITUAL_STEPS,
  usePriorityCreatorRitual,
} from '@/composables/usePriorityCreatorRitual'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { loadDraftFromDB, saveDraftToDB } from '@/services/draftStorage'
import { connectTestDatabase } from '@/test/testDatabase'
import type { UserDatabase } from '@/services/userDatabase.service'
import type { YearRef } from '@/domain/period'

async function seedActivePriorities(count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await priorityDexieRepository.create({
      title: `Priorytet ${index + 1}`,
      years: ['2026' as YearRef],
      status: 'active',
      lifeAreaIds: [],
      progressSignals: [],
      riskSignals: [],
    })
  }
}

describe('usePriorityCreatorRitual', () => {
  let db: UserDatabase
  const scopes: EffectScope[] = []

  // The composable registers a deep autosave watcher; run each instance in its
  // own effect scope so watchers do not leak (and keep writing) across tests.
  function makeRitual(): ReturnType<typeof usePriorityCreatorRitual> {
    const scope = effectScope()
    scopes.push(scope)
    return scope.run(() => usePriorityCreatorRitual())!
  }

  beforeEach(async () => {
    db = await connectTestDatabase()
    await db.drafts.clear()
    await db.priorityLinks.clear()
    await db.priorities.clear()
    await db.goals.clear()
    await db.habits.clear()
    await db.trackers.clear()
    await db.weeklyIntentions.clear()
  })

  afterEach(() => {
    while (scopes.length) scopes.pop()?.stop()
  })

  it('starts clean when no draft exists', async () => {
    const ritual = makeRitual()
    await ritual.initialize()

    expect(ritual.resumedFromDraft.value).toBe(false)
    expect(ritual.stepIndex.value).toBe(0)
    expect(ritual.currentStep.value).toBe('meaning')
    expect(RITUAL_STEPS).toHaveLength(6)
  })

  it('resumes from a persisted draft (step, form, proposals)', async () => {
    await saveDraftToDB(PRIORITY_CREATOR_DRAFT_KEY, JSON.stringify({
      stepIndex: 3,
      form: { title: 'Równowaga', direction: 'Spokój', whyNow: '', influence: '', notControlled: '', tradeoffs: '', endingType: 'natural', endingDescription: 'Samo się zamknie' },
      progressSignals: ['więcej spokoju'],
      riskSignals: [],
      proposals: [{ id: 'p1', kind: 'new', objectType: 'habit', title: 'Spacer', contribution: '', expectedSignal: '', selected: true }],
      savedAt: '2026-07-20T10:00:00.000Z',
    }))

    const ritual = makeRitual()
    await ritual.initialize()

    expect(ritual.resumedFromDraft.value).toBe(true)
    expect(ritual.draftSavedAt.value).toBe('2026-07-20T10:00:00.000Z')
    expect(ritual.stepIndex.value).toBe(3)
    expect(ritual.form.title).toBe('Równowaga')
    expect(ritual.form.endingType).toBe('natural')
    expect(ritual.proposals.value).toHaveLength(1)
  })

  it('recovers from a corrupt draft by starting clean', async () => {
    await saveDraftToDB(PRIORITY_CREATOR_DRAFT_KEY, '{not json')

    const ritual = makeRitual()
    await ritual.initialize()

    expect(ritual.resumedFromDraft.value).toBe(false)
    expect(await loadDraftFromDB(PRIORITY_CREATOR_DRAFT_KEY)).toBeNull()
  })

  it('autosaves the draft after an edit (real debounce)', async () => {
    // Real timers, not fake: the draft goes through Dexie, which relies on
    // real timers internally — faking them deadlocks the write.
    const ritual = makeRitual()
    await ritual.initialize()

    ritual.form.title = 'Nowy kierunek'

    let raw: string | null = null
    for (let attempt = 0; attempt < 20 && !raw; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
      raw = await loadDraftFromDB(PRIORITY_CREATOR_DRAFT_KEY)
    }

    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!).form.title).toBe('Nowy kierunek')
  })

  it('dedupes signals and toggles library candidates', async () => {
    const habit = await habitDexieRepository.create({
      title: 'Spacer',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
      entryMode: 'completion',
      cadence: 'weekly',
      target: { kind: 'count', operator: 'min', value: 4 },
    })

    const ritual = makeRitual()
    await ritual.initialize()

    ritual.addSignal('progress', ' więcej spokoju ')
    ritual.addSignal('progress', 'więcej spokoju')
    ritual.addSignal('progress', '   ')
    expect(ritual.progressSignals.value).toEqual(['więcej spokoju'])
    ritual.removeSignal('progress', 'więcej spokoju')
    expect(ritual.progressSignals.value).toEqual([])

    const candidate = ritual.libraryCandidates.value.find(item => item.subjectRef.subjectId === habit.id)
    expect(candidate).toBeTruthy()
    ritual.toggleExistingCandidate(candidate!)
    expect(ritual.isLinkedCandidate(candidate!.subjectRef)).toBe(true)
    ritual.toggleExistingCandidate(candidate!)
    expect(ritual.isLinkedCandidate(candidate!.subjectRef)).toBe(false)
  })

  it('finishes as an active priority below the limit and clears the draft', async () => {
    const ritual = makeRitual()
    await ritual.initialize()

    ritual.form.title = 'Równowaga'
    ritual.form.direction = 'Więcej spokoju'
    ritual.addSignal('progress', 'spokój')
    ritual.addNewProposal('goal', 'Plan przygotowań')

    const ok = await ritual.finish()
    expect(ok).toBe(true)
    expect(ritual.result.value?.priority.status).toBe('active')
    expect(ritual.result.value?.links).toHaveLength(1)
    expect(ritual.result.value?.links[0].status).toBe('proposed')
    expect(await loadDraftFromDB(PRIORITY_CREATOR_DRAFT_KEY)).toBeNull()
  })

  it('finishes as a waiting draft at the portfolio limit (D5)', async () => {
    await seedActivePriorities(5)

    const ritual = makeRitual()
    await ritual.initialize()
    expect(ritual.atPortfolioLimit.value).toBe(true)

    ritual.form.title = 'Szósty kierunek'
    ritual.form.direction = 'Poczeka na slot'

    const ok = await ritual.finish()
    expect(ok).toBe(true)
    expect(ritual.result.value?.priority.status).toBe('draft')
  })

  it('refuses to finish without the required meaning fields', async () => {
    const ritual = makeRitual()
    await ritual.initialize()

    ritual.form.title = 'Tylko tytuł'
    expect(ritual.canFinish.value).toBe(false)
    expect(await ritual.finish()).toBe(false)
    expect(ritual.result.value).toBeNull()
  })

  it('unselected proposals stay out of the finale', async () => {
    const ritual = makeRitual()
    await ritual.initialize()

    ritual.form.title = 'Kierunek'
    ritual.form.direction = 'Zmiana'
    ritual.addNewProposal('habit', 'Spacer')
    ritual.addNewProposal('tracker', 'Energia')
    const tracker = ritual.proposals.value.find(item => item.title === 'Energia')!
    ritual.toggleProposalSelected(tracker.id)

    await ritual.finish()
    expect(ritual.result.value?.links).toHaveLength(1)
    expect(ritual.result.value?.links[0].proposal?.title).toBe('Spacer')
  })
})
