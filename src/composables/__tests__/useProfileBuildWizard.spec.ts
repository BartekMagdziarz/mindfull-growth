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

  it('Next on preview flags generateRequested without changing step', async () => {
    const wizard = mountWizard()
    await wizard.nextStep() // scope → preview
    expect(wizard.generateRequested.value).toBe(false)

    await wizard.nextStep() // preview → (stub)
    expect(wizard.generateRequested.value).toBe(true)
    expect(wizard.currentStep.value).toBe('preview')
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
