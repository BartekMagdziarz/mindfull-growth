import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import {
  resolveDateRange,
  isValidDateRange,
  STEP_ORDER,
  WIZARD_DRAFT_KEY,
  useProfileBuildWizard,
} from '@/composables/useProfileBuildWizard'
import type { ProfileDateRange } from '@/domain/userProfile'

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
// real LLM service. Each test can override `buildProfileMock` to simulate
// success / error paths.
const buildProfileMock = vi.fn()
vi.mock('@/stores/userProfile.store', async () => {
  const actual = await vi.importActual<
    typeof import('@/stores/userProfile.store')
  >('@/stores/userProfile.store')
  return {
    ...actual,
    useUserProfileStore: vi.fn(() => ({
      buildProfile: buildProfileMock,
    })),
  }
})

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
      'journal',
      'emotionLogs',
      'exerciseSessions',
      'weeklyReflections',
      'monthlyReflections',
    ])
    expect(wizard.dateRange.value).toEqual({ kind: 'preset', preset: 'last90' })
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
      model: 'gpt-5-nano',
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
      model: 'gpt-5-nano',
      extras: '',
    },
  ) {
    buildProfileMock.mockResolvedValueOnce({
      sections: result.sections,
      rawResponse: result.rawResponse ?? 'raw',
      model: result.model ?? 'gpt-5-nano',
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
      model: 'gpt-5-nano',
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
