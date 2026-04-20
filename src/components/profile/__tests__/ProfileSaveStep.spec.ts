import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { computed, ref } from 'vue'
import { render, screen, fireEvent } from '@testing-library/vue'
import ProfileSaveStep from '../ProfileSaveStep.vue'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import type { ProfilePreviewCounts } from '@/composables/useProfileBuildWizard'
import type {
  ProfileDataType,
  ProfileDateRange,
} from '@/domain/userProfile'
import type { useProfileBuildWizard } from '@/composables/useProfileBuildWizard'

/**
 * The save step only reads a slim slice of the wizard surface (note,
 * dataTypes, dateRange, previewCountsByType, generatedModel, hasUnsavedEdits,
 * saveError, revertEdits). Stubs satisfy that slice and are cast to the
 * full wizard type at the render boundary.
 */
type Wizard = ReturnType<typeof useProfileBuildWizard>
type WizardStub = {
  note: { value: string }
  dataTypes: { value: ProfileDataType[] }
  dateRange: { value: ProfileDateRange }
  previewCountsByType: { value: ProfilePreviewCounts }
  generatedModel: { value: string }
  hasUnsavedEdits: { value: boolean }
  saveError: { value: string | null }
  revertEdits: ReturnType<typeof vi.fn>
}

function asWizard(stub: WizardStub): Wizard {
  return stub as unknown as Wizard
}

function buildWizardStub(
  overrides: Partial<{
    note: string
    dataTypes: ProfileDataType[]
    dateRange: ProfileDateRange
    previewCountsByType: ProfilePreviewCounts
    generatedModel: string
    hasUnsavedEdits: boolean
    saveError: string | null
  }> = {},
): WizardStub {
  return {
    note: ref(overrides.note ?? ''),
    dataTypes: ref<ProfileDataType[]>(
      overrides.dataTypes ?? ['journal', 'emotionLogs'],
    ),
    dateRange: ref<ProfileDateRange>(
      overrides.dateRange ?? { kind: 'preset', preset: 'last90' },
    ),
    previewCountsByType: ref<ProfilePreviewCounts>(
      overrides.previewCountsByType ?? { journal: 12, emotionLogs: 8 },
    ),
    generatedModel: ref(overrides.generatedModel ?? 'gpt-test'),
    hasUnsavedEdits: computed(() => overrides.hasUnsavedEdits ?? false),
    saveError: ref<string | null>(overrides.saveError ?? null),
    revertEdits: vi.fn(),
  }
}

describe('ProfileSaveStep', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useUserPreferencesStore().$patch({ locale: 'en' })
  })

  it('renders the summary card with date range, data types, item total and model', () => {
    const wizard = buildWizardStub()
    render(ProfileSaveStep, { props: { wizard: asWizard(wizard) } })

    // Date range — preset key resolves to the localised label.
    const dateRange = document.querySelector(
      '[data-test-summary-date-range]',
    ) as HTMLElement
    expect(dateRange).toBeTruthy()
    expect(dateRange.textContent).toContain('Last 90 days')

    // Data types — joined list of localised titles.
    const types = document.querySelector(
      '[data-test-summary-data-types]',
    ) as HTMLElement
    expect(types.textContent).toContain('Journal entries')
    expect(types.textContent).toContain('Emotion logs')

    // Total items — sum of preview counts.
    const totalItems = document.querySelector(
      '[data-test-summary-total-items]',
    ) as HTMLElement
    expect(totalItems.textContent?.trim()).toBe('20')

    // Model name.
    const model = document.querySelector(
      '[data-test-summary-model]',
    ) as HTMLElement
    expect(model.textContent?.trim()).toBe('gpt-test')
  })

  it('renders a custom date range as start — end ISO dates', () => {
    const wizard = buildWizardStub({
      dateRange: { kind: 'custom', start: '2026-01-01', end: '2026-03-31' },
    })
    render(ProfileSaveStep, { props: { wizard: asWizard(wizard) } })
    const dateRange = document.querySelector(
      '[data-test-summary-date-range]',
    ) as HTMLElement
    expect(dateRange.textContent).toContain('2026-01-01')
    expect(dateRange.textContent).toContain('2026-03-31')
  })

  it('shows a placeholder dash for the model when none is set', () => {
    const wizard = buildWizardStub({ generatedModel: '' })
    render(ProfileSaveStep, { props: { wizard: asWizard(wizard) } })
    const model = document.querySelector(
      '[data-test-summary-model]',
    ) as HTMLElement
    expect(model.textContent?.trim()).toBe('—')
  })

  it('typing into the note input updates wizard.note.value', async () => {
    const wizard = buildWizardStub({ note: '' })
    render(ProfileSaveStep, { props: { wizard: asWizard(wizard) } })

    const input = document.querySelector(
      '[data-test-save-note]',
    ) as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.maxLength).toBe(120)

    await fireEvent.update(input, 'after Big Five')
    expect(wizard.note.value).toBe('after Big Five')
  })

  it('hides the edits row and revert button when there are no unsaved edits', () => {
    const wizard = buildWizardStub({ hasUnsavedEdits: false })
    render(ProfileSaveStep, { props: { wizard: asWizard(wizard) } })

    expect(document.querySelector('[data-test-summary-edits]')).toBeNull()
    expect(document.querySelector('[data-test-revert-edits]')).toBeNull()
  })

  it('shows the edits row and revert button when there are unsaved edits; clicking revert calls wizard.revertEdits', async () => {
    const wizard = buildWizardStub({ hasUnsavedEdits: true })
    render(ProfileSaveStep, { props: { wizard: asWizard(wizard) } })

    expect(document.querySelector('[data-test-summary-edits]')).toBeTruthy()
    const revertBtn = document.querySelector(
      '[data-test-revert-edits]',
    ) as HTMLButtonElement
    expect(revertBtn).toBeTruthy()

    await fireEvent.click(revertBtn)
    expect(wizard.revertEdits).toHaveBeenCalledTimes(1)
  })

  it('renders the error banner only when saveError is set', () => {
    const clean = buildWizardStub({ saveError: null })
    const { unmount } = render(ProfileSaveStep, {
      props: { wizard: asWizard(clean) },
    })
    expect(document.querySelector('[data-test-save-error]')).toBeNull()
    unmount()

    const dirty = buildWizardStub({ saveError: 'Disk on fire' })
    render(ProfileSaveStep, { props: { wizard: asWizard(dirty) } })
    const banner = document.querySelector(
      '[data-test-save-error]',
    ) as HTMLElement
    expect(banner).toBeTruthy()
    expect(banner.textContent).toContain('Disk on fire')
  })

  it('renders title, subtitle and note label', () => {
    const wizard = buildWizardStub()
    render(ProfileSaveStep, { props: { wizard: asWizard(wizard) } })
    expect(screen.getByText('Save this profile')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Review the summary, add an optional note, and save as a new version.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Optional note')).toBeInTheDocument()
  })
})
