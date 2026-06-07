import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import {
  EDIT_SOURCE_SESSION_KEY,
  resolveDateRange,
  isValidDateRange,
  STEP_ORDER,
  WIZARD_DRAFT_KEY,
  useProfileBuildWizard,
} from '@/composables/useProfileBuildWizard'
import type { ProfileDateRange, UserProfile } from '@/domain/userProfile'

// Mock the draft storage so tests don't need IndexedDB.
vi.mock('@/services/draftStorage', () => {
  const store = new Map<string, string>()
  return {
    loadDraftFromDB: vi.fn(async (key: string) => store.get(key) ?? null),
    saveDraftToDB: vi.fn(async (key: string, data: string) => {
      store.set(key, data)
    }),
    clearDraftFromDB: vi.fn(async (key: string) => {
      store.delete(key)
    }),
    __reset: () => store.clear(),
  }
})

// Mock the preview service — the wizard spec doesn't care about the actual
// counts, only that `nextStep` from scope invokes it.
const queryScopePreviewMock = vi.fn(async (_args: unknown) => ({
  countsByType: { journal: 2 },
  objectIdsByType: { journal: ['a', 'b'] },
  headers: [
    { type: 'journal' as const, id: 'a', title: 'A', date: '2026-04-10T00:00:00.000Z' },
    { type: 'journal' as const, id: 'b', title: 'B', date: '2026-04-11T00:00:00.000Z' },
  ],
  approxTokens: 120,
}))
vi.mock('@/services/profileScopeQueries', () => ({
  queryScopePreview: (args: unknown) => queryScopePreviewMock(args),
}))

// Stub the userProfile store so `generate()` doesn't touch IndexedDB or the
// real LLM service. Each test can override `buildProfileMock`,
// `createProfileMock`, etc. to simulate success / error paths.
const buildProfileMock = vi.fn()
const createProfileMock = vi.fn()
const loadProfilesMock = vi.fn(async () => {})
// Mutable list backing `getById` / `profiles` for sessionStorage handoff tests.
const userProfilesList: UserProfile[] = []
function getByIdMock(id: string): UserProfile | undefined {
  return userProfilesList.find((p) => p.id === id)
}

vi.mock('@/stores/userProfile.store', async () => {
  const actual = await vi.importActual<
    typeof import('@/stores/userProfile.store')
  >('@/stores/userProfile.store')
  return {
    ...actual,
    useUserProfileStore: vi.fn(() => ({
      buildProfile: buildProfileMock,
      createProfile: createProfileMock,
      loadProfiles: loadProfilesMock,
      getById: getByIdMock,
      // Reactive readers used by the composable; in tests we just need the
      // current value at call time, not a real reactive ref.
      get profiles() {
        return userProfilesList
      },
    })),
  }
})

// Mock the build-log repository — `save()` does a best-effort link of the
// latest log entry to the saved profile, so we need spies to assert it.
const logListMock = vi.fn(async (_limit?: number) => [] as Array<{
  id: string
  success: boolean
  resultProfileId?: string
}>)
const logUpdateMock = vi.fn(async (_id: string, _patch: unknown) => ({}))
vi.mock('@/repositories/profileBuildLogDexieRepository', () => ({
  profileBuildLogDexieRepository: {
    list: (limit?: number) => logListMock(limit),
    update: (id: string, patch: unknown) => logUpdateMock(id, patch),
    add: vi.fn(),
    getById: vi.fn(),
    clearAll: vi.fn(),
  },
}))

type WizardApi = ReturnType<typeof useProfileBuildWizard>

function mountWizard(): WizardApi {
  let captured!: WizardApi
  const Host = defineComponent({
    setup() {
      captured = useProfileBuildWizard()
      return () => h('div')
    },
  })
  mount(Host)
  return captured
}

describe('useProfileBuildWizard', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    queryScopePreviewMock.mockClear()
    buildProfileMock.mockReset()
    const storage = await import('@/services/draftStorage')
    ;(storage as unknown as { __reset: () => void }).__reset()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initialises on the scope step with sensible defaults', () => {
    const wizard = mountWizard()
    expect(wizard.currentStep.value).toBe('scope')
    expect(wizard.stepIndex.value).toBe(0)
    expect(wizard.dataTypes.value).toEqual([
      'foundation',
      'journal',
      'emotionLogs',
      'exerciseSessions',
      'weeklyReflections',
      'monthlyReflections',
    ])
    expect(wizard.dateRange.value).toEqual({ kind: 'preset', preset: 'last90' })
  })

  it('does not include planning in the default data types', () => {
    const wizard = mountWizard()
    expect(wizard.dataTypes.value).toContain('foundation')
    expect(wizard.dataTypes.value).not.toContain('planning')
  })

  it('disables Next on scope when no data types are selected', () => {
    const wizard = mountWizard()
    expect(wizard.canAdvance.value).toBe(true)

    wizard.dataTypes.value = []
    expect(wizard.canAdvance.value).toBe(false)
  })

  it('advances from scope to preview and calls queryScopePreview', async () => {
    const wizard = mountWizard()
    await wizard.nextStep()
    expect(queryScopePreviewMock).toHaveBeenCalledTimes(1)
    expect(wizard.currentStep.value).toBe('preview')
    expect(wizard.previewTotalCount.value).toBe(2)
  })

  it('Next on preview invokes generate() and advances past preview', async () => {
    // Keep the build pending so we can observe the mid-flight step.
    let resolveBuild: (value: {
      sections: Record<string, string>
      rawResponse: string
      model: string
      extras: string
    }) => void = () => {}
    buildProfileMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveBuild = resolve
        }),
    )

    const wizard = mountWizard()
    await wizard.nextStep() // scope → preview
    expect(wizard.currentStep.value).toBe('preview')

    // Preview → generate: should flip to the generate step before awaiting.
    const nextPromise = wizard.nextStep()
    await nextTick()
    expect(wizard.currentStep.value).toBe('generate')
    expect(wizard.generateState.value).toBe('in-flight')
    expect(buildProfileMock).toHaveBeenCalledTimes(1)

    // Resolve so the composable can settle into the review step.
    resolveBuild({
      sections: {} as Record<string, string>,
      rawResponse: '',
      model: 'gpt-5.4-nano',
      extras: '',
    })
    await nextPromise
    expect(wizard.currentStep.value).toBe('review')
  })

  it('previousStep from preview goes back to scope', async () => {
    const wizard = mountWizard()
    await wizard.nextStep()
    wizard.previousStep()
    expect(wizard.currentStep.value).toBe('scope')
  })

  it('persists a draft on field changes and re-hydrates on a fresh mount', async () => {
    vi.useFakeTimers()
    const wizard = mountWizard()
    // Wait for the initial load to complete so `ready` flips true.
    await vi.advanceTimersByTimeAsync(0)
    await nextTick()

    wizard.dataTypes.value = ['journal']
    wizard.dateRange.value = { kind: 'preset', preset: 'last30' }
    await vi.advanceTimersByTimeAsync(350)

    const storage = await import('@/services/draftStorage')
    expect(storage.saveDraftToDB).toHaveBeenCalled()
    const [, savedRaw] = (storage.saveDraftToDB as unknown as { mock: { calls: unknown[][] } })
      .mock.calls.at(-1) as [string, string]
    const parsed = JSON.parse(savedRaw)
    expect(parsed.dataTypes).toEqual(['journal'])

    vi.useRealTimers()

    // New wizard instance should pick up the persisted scope.
    setActivePinia(createPinia())
    const second = mountWizard()
    await nextTick()
    await nextTick()
    expect(second.dataTypes.value).toEqual(['journal'])
    expect(second.dateRange.value).toEqual({ kind: 'preset', preset: 'last30' })
  })

  it('coerces legacy questionnaires drafts to foundation', async () => {
    const storage = await import('@/services/draftStorage')
    await storage.saveDraftToDB(
      WIZARD_DRAFT_KEY,
      JSON.stringify({
        dataTypes: ['questionnaires', 'journal'],
        dateRange: { kind: 'preset', preset: 'last30' },
        filters: {},
      }),
    )

    const wizard = mountWizard()
    await nextTick()
    await nextTick()

    expect(wizard.dataTypes.value).toEqual(['foundation', 'journal'])
  })

  it('deduplicates legacy questionnaires drafts when foundation is already present', async () => {
    const storage = await import('@/services/draftStorage')
    await storage.saveDraftToDB(
      WIZARD_DRAFT_KEY,
      JSON.stringify({
        dataTypes: ['questionnaires', 'foundation', 'journal'],
        dateRange: { kind: 'preset', preset: 'last30' },
        filters: {},
      }),
    )

    const wizard = mountWizard()
    await nextTick()
    await nextTick()

    expect(wizard.dataTypes.value).toEqual(['foundation', 'journal'])
  })

  it('resetDraft clears the persisted payload', async () => {
    const wizard = mountWizard()
    await wizard.resetDraft()
    const storage = await import('@/services/draftStorage')
    expect(storage.clearDraftFromDB).toHaveBeenCalledWith(WIZARD_DRAFT_KEY)
  })

  it('STEP_ORDER lists the 5 wizard steps in order', () => {
    expect(STEP_ORDER).toEqual(['scope', 'preview', 'generate', 'review', 'save'])
  })
})

describe('useProfileBuildWizard — review state (Story 5)', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    queryScopePreviewMock.mockClear()
    buildProfileMock.mockReset()
    const storage = await import('@/services/draftStorage')
    ;(storage as unknown as { __reset: () => void }).__reset()
    vi.clearAllMocks()
  })

  /**
   * Helper that advances the wizard through scope → preview → generate and
   * lets `generate()` settle with a deterministic result so the review
   * state has something to work on.
   */
  async function mountAndGenerate(
    result: {
      sections: Record<string, string>
      rawResponse?: string
      model?: string
      extras?: string
    } = {
      sections: {
        summary: 'S',
        values: 'V',
        emotionalPatterns: 'EP',
        strengths: 'ST',
        challenges: 'CH',
        relationships: 'R',
        themes: 'TH',
        recentArc: 'RA',
        suggestedDirections: 'SD',
      },
      rawResponse: 'raw',
      model: 'gpt-5.4-nano',
      extras: '',
    },
  ) {
    buildProfileMock.mockResolvedValueOnce({
      sections: result.sections,
      rawResponse: result.rawResponse ?? 'raw',
      model: result.model ?? 'gpt-5.4-nano',
      extras: result.extras ?? '',
    })
    const wizard = mountWizard()
    await wizard.nextStep() // scope → preview
    await wizard.nextStep() // preview → generate → review
    return wizard
  }

  it('syncs editedSections and extras from a successful generate()', async () => {
    const wizard = await mountAndGenerate({
      sections: {
        summary: 'Summary text',
        values: 'Values text',
        emotionalPatterns: '',
        strengths: '',
        challenges: '',
        relationships: '',
        themes: '',
        recentArc: '',
        suggestedDirections: '',
      },
      extras: 'bonus',
    })

    expect(wizard.currentStep.value).toBe('review')
    expect(wizard.extras.value).toBe('bonus')
    expect(wizard.editedSections.value.summary).toBe('Summary text')
    expect(wizard.editedSections.value.values).toBe('Values text')
  })

  it('reports no unsaved edits right after generate(), true after setSectionValue', async () => {
    const wizard = await mountAndGenerate()
    expect(wizard.hasUnsavedEdits.value).toBe(false)
    wizard.setSectionValue('summary', 'edited')
    expect(wizard.hasUnsavedEdits.value).toBe(true)
    expect(wizard.editedSections.value.summary).toBe('edited')
  })

  it('toggleEditSection flips a single per-section edit flag', async () => {
    const wizard = await mountAndGenerate()
    expect(wizard.editingPerSection.values).toBe(false)
    wizard.toggleEditSection('values')
    expect(wizard.editingPerSection.values).toBe(true)
    wizard.toggleEditSection('values')
    expect(wizard.editingPerSection.values).toBe(false)
  })

  it('enterEditAllMode / exitEditAllMode flip editingAll and every section', async () => {
    const wizard = await mountAndGenerate()

    wizard.enterEditAllMode()
    expect(wizard.editingAll.value).toBe(true)
    for (const id of [
      'summary',
      'values',
      'emotionalPatterns',
      'strengths',
      'challenges',
      'relationships',
      'themes',
      'recentArc',
      'suggestedDirections',
    ] as const) {
      expect(wizard.editingPerSection[id]).toBe(true)
    }

    wizard.exitEditAllMode()
    expect(wizard.editingAll.value).toBe(false)
    for (const id of [
      'summary',
      'values',
      'emotionalPatterns',
      'strengths',
      'challenges',
      'relationships',
      'themes',
      'recentArc',
      'suggestedDirections',
    ] as const) {
      expect(wizard.editingPerSection[id]).toBe(false)
    }
  })

  it('revertEdits restores editedSections to the AI version', async () => {
    const wizard = await mountAndGenerate()
    wizard.setSectionValue('summary', 'edited')
    expect(wizard.hasUnsavedEdits.value).toBe(true)
    wizard.revertEdits()
    expect(wizard.hasUnsavedEdits.value).toBe(false)
    expect(wizard.editedSections.value.summary).toBe('S')
  })

  it('regenerate() short-circuits with confirmationNeeded when unsaved edits exist', async () => {
    const wizard = await mountAndGenerate()
    wizard.setSectionValue('summary', 'edited')

    const res = await wizard.regenerate()
    expect(res).toEqual({ confirmationNeeded: true })
    // buildProfile should have been called exactly once (from the initial
    // mountAndGenerate run); no retry happened without force.
    expect(buildProfileMock).toHaveBeenCalledTimes(1)
  })

  it('regenerate({ force: true }) clears edits and calls buildProfile again', async () => {
    const wizard = await mountAndGenerate()
    wizard.setSectionValue('summary', 'edited')

    buildProfileMock.mockResolvedValueOnce({
      sections: {
        summary: 'Fresh summary',
        values: '',
        emotionalPatterns: '',
        strengths: '',
        challenges: '',
        relationships: '',
        themes: '',
        recentArc: '',
        suggestedDirections: '',
      },
      rawResponse: 'raw2',
      model: 'gpt-5.4-nano',
      extras: '',
    })

    const res = await wizard.regenerate({ force: true })
    expect(res).toEqual({ confirmationNeeded: false })
    expect(buildProfileMock).toHaveBeenCalledTimes(2)
    expect(wizard.editedSections.value.summary).toBe('Fresh summary')
    expect(wizard.hasUnsavedEdits.value).toBe(false)
    expect(wizard.currentStep.value).toBe('review')
  })

  it('nextStep from review advances to save', async () => {
    const wizard = await mountAndGenerate()
    expect(wizard.currentStep.value).toBe('review')
    await wizard.nextStep()
    expect(wizard.currentStep.value).toBe('save')
  })

  it('canAdvance is true on review regardless of edits', async () => {
    const wizard = await mountAndGenerate()
    expect(wizard.canAdvance.value).toBe(true)
    wizard.setSectionValue('summary', 'edited')
    expect(wizard.canAdvance.value).toBe(true)
  })
})

describe('useProfileBuildWizard — save state (Story 6)', () => {
  function makeUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
    return {
      id: 'profile-saved-1',
      createdAt: '2026-04-20T12:00:00.000Z',
      updatedAt: '2026-04-20T12:00:00.000Z',
      note: 'baseline',
      scope: {
        dataTypes: ['journal'],
        dateRange: { kind: 'preset', preset: 'last30' },
        filters: {
          emotionQuadrants: [],
          peopleTagIds: [],
          contextTagIds: [],
          lifeAreaIds: [],
        },
        includedObjectIds: { journal: ['x', 'y'] },
        approxTokenCount: 250,
        locale: 'en',
        grammaticalGender: 'masculine',
      },
      sections: {
        summary: 'baseline summary',
        values: 'baseline values',
        emotionalPatterns: '',
        strengths: '',
        challenges: '',
        relationships: '',
        themes: '',
        recentArc: '',
        suggestedDirections: '',
      },
      rawResponse: 'raw-baseline',
      model: 'gpt-baseline',
      ...overrides,
    }
  }

  beforeEach(async () => {
    setActivePinia(createPinia())
    queryScopePreviewMock.mockClear()
    buildProfileMock.mockReset()
    createProfileMock.mockReset()
    loadProfilesMock.mockClear()
    logListMock.mockReset()
    logListMock.mockResolvedValue([])
    logUpdateMock.mockReset()
    logUpdateMock.mockResolvedValue({})
    userProfilesList.length = 0
    const storage = await import('@/services/draftStorage')
    ;(storage as unknown as { __reset: () => void }).__reset()
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.clear()
    }
    vi.clearAllMocks()
  })

  /**
   * Same shape as the Story 5 helper, but parameterised so save tests can
   * specify rawResponse / model assertions.
   */
  async function mountAndGenerate(
    result: {
      sections?: Record<string, string>
      rawResponse?: string
      model?: string
      extras?: string
    } = {},
  ) {
    buildProfileMock.mockResolvedValueOnce({
      sections: result.sections ?? {
        summary: 'AI summary',
        values: 'AI values',
        emotionalPatterns: '',
        strengths: '',
        challenges: '',
        relationships: '',
        themes: '',
        recentArc: '',
        suggestedDirections: '',
      },
      rawResponse: result.rawResponse ?? 'raw-from-llm',
      model: result.model ?? 'gpt-test',
      extras: result.extras ?? '',
    })
    const wizard = mountWizard()
    await wizard.nextStep() // scope → preview
    await wizard.nextStep() // preview → generate → review
    return wizard
  }

  it('save() returns an error and sets saveError when generatedSections is null', async () => {
    const wizard = mountWizard()
    const res = await wizard.save()
    expect(res).toEqual({ error: 'No generated profile to save' })
    expect(wizard.saveError.value).toBe('No generated profile to save')
    expect(createProfileMock).not.toHaveBeenCalled()
  })

  it('save() forwards the right payload to createProfile and returns the new profile', async () => {
    const wizard = await mountAndGenerate()
    wizard.note.value = '   end-of-Q1 review   '
    wizard.setSectionValue('summary', 'edited summary')

    const created = makeUserProfile({
      id: 'profile-new',
      sections: { ...wizard.editedSections.value },
      rawResponse: 'raw-from-llm',
      model: 'gpt-test',
    })
    createProfileMock.mockResolvedValueOnce(created)

    const res = await wizard.save()

    expect('profile' in res).toBe(true)
    if (!('profile' in res)) throw new Error('expected success')
    expect(res.profile.id).toBe('profile-new')

    expect(createProfileMock).toHaveBeenCalledTimes(1)
    const payload = createProfileMock.mock.calls[0][0]
    expect(payload.note).toBe('end-of-Q1 review') // trimmed
    expect(payload.sections.summary).toBe('edited summary')
    expect(payload.rawResponse).toBe('raw-from-llm')
    expect(payload.model).toBe('gpt-test')

    // Draft cleared on success.
    const storage = await import('@/services/draftStorage')
    expect(storage.clearDraftFromDB).toHaveBeenCalledWith(WIZARD_DRAFT_KEY)

    // saveError clear, isSaving back to idle.
    expect(wizard.saveError.value).toBeNull()
    expect(wizard.isSaving.value).toBe(false)
  })

  it('save() drops an empty note (whitespace only) from the payload', async () => {
    const wizard = await mountAndGenerate()
    wizard.note.value = '   '
    createProfileMock.mockResolvedValueOnce(makeUserProfile())

    await wizard.save()

    const payload = createProfileMock.mock.calls[0][0]
    expect(payload.note).toBeUndefined()
  })

  it('save() captures createProfile errors and resets isSaving', async () => {
    const wizard = await mountAndGenerate()
    createProfileMock.mockRejectedValueOnce(new Error('disk full'))

    const res = await wizard.save()

    expect(res).toEqual({ error: 'disk full' })
    expect(wizard.saveError.value).toBe('disk full')
    expect(wizard.isSaving.value).toBe(false)
  })

  it('linkLatestBuildLogToProfile updates only successful, unlinked latest logs', async () => {
    const wizard = await mountAndGenerate()
    logListMock.mockResolvedValueOnce([
      { id: 'log-1', success: true, resultProfileId: undefined },
    ])
    createProfileMock.mockResolvedValueOnce(makeUserProfile({ id: 'profile-link' }))

    await wizard.save()

    expect(logUpdateMock).toHaveBeenCalledWith('log-1', {
      resultProfileId: 'profile-link',
    })
  })

  it('linkLatestBuildLogToProfile skips failed logs', async () => {
    const wizard = await mountAndGenerate()
    logListMock.mockResolvedValueOnce([
      { id: 'log-fail', success: false },
    ])
    createProfileMock.mockResolvedValueOnce(makeUserProfile())

    await wizard.save()

    expect(logUpdateMock).not.toHaveBeenCalled()
  })

  it('linkLatestBuildLogToProfile no-ops when there are no logs', async () => {
    const wizard = await mountAndGenerate()
    logListMock.mockResolvedValueOnce([])
    createProfileMock.mockResolvedValueOnce(makeUserProfile())

    await wizard.save()

    expect(logUpdateMock).not.toHaveBeenCalled()
  })

  it('save() does not propagate errors from build-log linkage', async () => {
    const wizard = await mountAndGenerate()
    logListMock.mockRejectedValueOnce(new Error('log table corrupt'))
    createProfileMock.mockResolvedValueOnce(makeUserProfile({ id: 'profile-x' }))

    const res = await wizard.save()
    expect('profile' in res).toBe(true)
    if (!('profile' in res)) throw new Error('expected success')
    expect(res.profile.id).toBe('profile-x')
  })

  it('nextStep on save calls save() and sets onSaveComplete on success', async () => {
    const wizard = await mountAndGenerate()
    await wizard.nextStep() // review → save
    expect(wizard.currentStep.value).toBe('save')

    const created = makeUserProfile({ id: 'profile-via-nextStep' })
    createProfileMock.mockResolvedValueOnce(created)

    await wizard.nextStep()

    expect(createProfileMock).toHaveBeenCalledTimes(1)
    expect(wizard.onSaveComplete.value?.id).toBe('profile-via-nextStep')
  })

  it('nextStep on save leaves onSaveComplete null on failure', async () => {
    const wizard = await mountAndGenerate()
    await wizard.nextStep() // review → save
    createProfileMock.mockRejectedValueOnce(new Error('boom'))

    await wizard.nextStep()

    expect(wizard.onSaveComplete.value).toBeNull()
    expect(wizard.saveError.value).toBe('boom')
    expect(wizard.currentStep.value).toBe('save') // stays on save
  })

  it('canAdvance on save is true when generatedSections exists and not saving', async () => {
    const wizard = await mountAndGenerate()
    await wizard.nextStep() // review → save
    expect(wizard.canAdvance.value).toBe(true)
  })

  it('hydrateForEdit seeds scope, sections, note and jumps to review', () => {
    const wizard = mountWizard()
    const source = makeUserProfile({
      id: 'src-1',
      note: 'first portrait',
      sections: {
        summary: 'src summary',
        values: 'src values',
        emotionalPatterns: 'src ep',
        strengths: '',
        challenges: '',
        relationships: '',
        themes: '',
        recentArc: '',
        suggestedDirections: '',
      },
      rawResponse: 'src raw',
      model: 'src model',
    })

    wizard.hydrateForEdit(source)

    expect(wizard.sourceProfileId.value).toBe('src-1')
    expect(wizard.dataTypes.value).toEqual(['journal'])
    expect(wizard.dateRange.value).toEqual({ kind: 'preset', preset: 'last30' })
    expect(wizard.generatedSections.value?.summary).toBe('src summary')
    expect(wizard.editedSections.value.summary).toBe('src summary')
    expect(wizard.generatedRawResponse.value).toBe('src raw')
    expect(wizard.generatedModel.value).toBe('src model')
    expect(wizard.note.value).toBe('first portrait')
    expect(wizard.currentStep.value).toBe('review')
    expect(wizard.previewApproxTokens.value).toBe(250)
  })

  it('hydrateForEdit deep-clones scope so wizard mutations do not touch the source', () => {
    const wizard = mountWizard()
    const source = makeUserProfile()
    wizard.hydrateForEdit(source)

    wizard.dataTypes.value.push('emotionLogs')
    expect(source.scope.dataTypes).toEqual(['journal'])
  })

  it('resetWizard restores defaults and clears save state', async () => {
    const wizard = await mountAndGenerate()
    wizard.note.value = 'something'
    wizard.setSectionValue('summary', 'edited')
    await wizard.nextStep() // review → save
    wizard.onSaveComplete.value = makeUserProfile({ id: 'whatever' })

    wizard.resetWizard()

    expect(wizard.currentStep.value).toBe('scope')
    expect(wizard.dataTypes.value).toEqual([
      'foundation',
      'journal',
      'emotionLogs',
      'exerciseSessions',
      'weeklyReflections',
      'monthlyReflections',
    ])
    expect(wizard.dateRange.value).toEqual({ kind: 'preset', preset: 'last90' })
    expect(wizard.note.value).toBe('')
    expect(wizard.isSaving.value).toBe(false)
    expect(wizard.saveError.value).toBeNull()
    expect(wizard.onSaveComplete.value).toBeNull()
    expect(wizard.sourceProfileId.value).toBeNull()
    expect(wizard.generatedSections.value).toBeNull()
    expect(wizard.editedSections.value.summary).toBe('')
  })

  it('loadDraft consumes sessionStorage edit-source key and hydrates from the source profile', async () => {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      // jsdom should provide this; bail otherwise to avoid false fail
      return
    }
    const source = makeUserProfile({
      id: 'src-from-storage',
      sections: {
        summary: 'from storage',
        values: '',
        emotionalPatterns: '',
        strengths: '',
        challenges: '',
        relationships: '',
        themes: '',
        recentArc: '',
        suggestedDirections: '',
      },
    })
    userProfilesList.push(source)
    window.sessionStorage.setItem(EDIT_SOURCE_SESSION_KEY, 'src-from-storage')

    const wizard = mountWizard()
    // Allow onMounted → loadDraft to settle.
    await nextTick()
    await nextTick()
    await nextTick()

    expect(wizard.currentStep.value).toBe('review')
    expect(wizard.editedSections.value.summary).toBe('from storage')
    expect(wizard.sourceProfileId.value).toBe('src-from-storage')

    // Key must be removed so a follow-up build does not re-hydrate.
    expect(window.sessionStorage.getItem(EDIT_SOURCE_SESSION_KEY)).toBeNull()

    // The IndexedDB scope draft path must have been skipped — saveDraftToDB
    // would be called via scheduleSave, but loadDraftFromDB must NOT have
    // been the one driving state.
    const storage = await import('@/services/draftStorage')
    expect(storage.loadDraftFromDB).not.toHaveBeenCalled()
  })

  it('loadDraft falls back to default scope when sessionStorage points at a missing profile', async () => {
    if (typeof window === 'undefined' || !window.sessionStorage) return
    window.sessionStorage.setItem(EDIT_SOURCE_SESSION_KEY, 'missing-id')

    const wizard = mountWizard()
    await nextTick()
    await nextTick()

    expect(wizard.currentStep.value).toBe('scope')
    // Key cleared anyway.
    expect(window.sessionStorage.getItem(EDIT_SOURCE_SESSION_KEY)).toBeNull()
  })
})

describe('resolveDateRange', () => {
  it('resolves the last30 preset to ~30 days back', () => {
    const { start, end } = resolveDateRange({ kind: 'preset', preset: 'last30' })
    const spanMs = new Date(end).getTime() - new Date(start).getTime()
    const days = spanMs / (1000 * 60 * 60 * 24)
    expect(days).toBeGreaterThan(29.5)
    expect(days).toBeLessThan(30.5)
  })

  it('resolves the last90 preset to ~90 days back', () => {
    const { start, end } = resolveDateRange({ kind: 'preset', preset: 'last90' })
    const days = (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000
    expect(days).toBeGreaterThan(89.5)
    expect(days).toBeLessThan(90.5)
  })

  it('resolves the all preset to a very long span', () => {
    const { start, end } = resolveDateRange({ kind: 'preset', preset: 'all' })
    const years =
      (new Date(end).getTime() - new Date(start).getTime()) / (86_400_000 * 365)
    expect(years).toBeGreaterThan(19)
  })

  it('passes custom ranges through as day-bound ISO strings', () => {
    const { start, end } = resolveDateRange({
      kind: 'custom',
      start: '2026-01-01',
      end: '2026-01-31',
    })
    expect(start.startsWith('2026-01-01')).toBe(true)
    expect(end.startsWith('2026-01-31')).toBe(true)
  })
})

describe('isValidDateRange', () => {
  it('accepts any preset', () => {
    const range: ProfileDateRange = { kind: 'preset', preset: 'last30' }
    expect(isValidDateRange(range)).toBe(true)
  })

  it('rejects custom ranges where start > end', () => {
    expect(
      isValidDateRange({ kind: 'custom', start: '2026-02-01', end: '2026-01-01' }),
    ).toBe(false)
  })

  it('rejects custom ranges with missing bounds', () => {
    expect(isValidDateRange({ kind: 'custom', start: '', end: '' })).toBe(false)
  })

  it('accepts custom ranges with start <= end', () => {
    expect(
      isValidDateRange({ kind: 'custom', start: '2026-01-01', end: '2026-01-31' }),
    ).toBe(true)
  })
})
