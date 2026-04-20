import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { render, screen, fireEvent, within } from '@testing-library/vue'
import ProfileReviewStep from '../ProfileReviewStep.vue'
import {
  PROFILE_SECTION_IDS,
  type ProfileSectionId,
  type ProfileSections,
  createEmptySections,
} from '@/domain/userProfile'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import type { useProfileBuildWizard } from '@/composables/useProfileBuildWizard'

/**
 * The review step only reads a small slice of the wizard surface (the
 * review-related fields + a handful of actions). Test stubs therefore
 * only populate that slice and are cast to the full wizard type at the
 * render boundary — we do NOT try to satisfy the scope/preview/generate
 * fields that the review step never touches.
 */
type Wizard = ReturnType<typeof useProfileBuildWizard>
type WizardStub = {
  editedSections: { value: ProfileSections }
  extras: { value: string }
  editingAll: { value: boolean }
  editingPerSection: Record<ProfileSectionId, boolean>
  hasUnsavedEdits: { value: boolean }
  setSectionValue: ReturnType<typeof vi.fn>
  toggleEditSection: ReturnType<typeof vi.fn>
  enterEditAllMode: ReturnType<typeof vi.fn>
  exitEditAllMode: ReturnType<typeof vi.fn>
  regenerate: ReturnType<typeof vi.fn>
}

/** Narrow cast helper so each render site stays readable. */
function asWizard(stub: WizardStub): Wizard {
  return stub as unknown as Wizard
}

/**
 * Builds a minimal stub that shape-matches the wizard's public surface. The
 * review step only reads the review-related fields, so we don't need to
 * provide scope/preview/generate state. Actions are plain spies; refs and
 * reactive objects are real so the template re-renders correctly.
 */
function buildWizardStub(
  overrides: Partial<{
    sections: Partial<ProfileSections>
    extras: string
    editingAll: boolean
    editingPerSection: Partial<Record<ProfileSectionId, boolean>>
    hasUnsavedEdits: boolean
    regenerateResult: { confirmationNeeded: boolean }
  }> = {},
): WizardStub {
  const sections: ProfileSections = {
    ...createEmptySections(),
    ...overrides.sections,
  }
  const editedSections = ref<ProfileSections>(sections)
  const extras = ref<string>(overrides.extras ?? '')
  const editingAll = ref<boolean>(overrides.editingAll ?? false)
  const editingPerSection = reactive<Record<ProfileSectionId, boolean>>(
    PROFILE_SECTION_IDS.reduce(
      (acc, id) => {
        acc[id] = overrides.editingPerSection?.[id] ?? false
        return acc
      },
      {} as Record<ProfileSectionId, boolean>,
    ),
  )
  const hasUnsavedEdits = computed(() => overrides.hasUnsavedEdits ?? false)

  const regenerate = vi.fn(
    async () => overrides.regenerateResult ?? { confirmationNeeded: false },
  )

  return {
    editedSections,
    extras,
    editingAll,
    editingPerSection,
    hasUnsavedEdits,
    setSectionValue: vi.fn((id: ProfileSectionId, value: string) => {
      editedSections.value = { ...editedSections.value, [id]: value }
    }),
    toggleEditSection: vi.fn((id: ProfileSectionId) => {
      editingPerSection[id] = !editingPerSection[id]
    }),
    enterEditAllMode: vi.fn(() => {
      editingAll.value = true
      for (const id of PROFILE_SECTION_IDS) editingPerSection[id] = true
    }),
    exitEditAllMode: vi.fn(() => {
      editingAll.value = false
      for (const id of PROFILE_SECTION_IDS) editingPerSection[id] = false
    }),
    regenerate,
  }
}

describe('ProfileReviewStep', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useUserPreferencesStore().$patch({ locale: 'en' })
  })

  it('renders all nine sections with localised titles', () => {
    const wizard = buildWizardStub()
    render(ProfileReviewStep, { props: { wizard: asWizard(wizard) } })
    for (const id of PROFILE_SECTION_IDS) {
      expect(
        document.querySelector(`[data-test-section="${id}"]`),
      ).toBeTruthy()
    }
    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(screen.getByText('Recent arc')).toBeInTheDocument()
  })

  it('shows the empty-section note when a section has no text', () => {
    const wizard = buildWizardStub({ sections: { summary: '' } })
    render(ProfileReviewStep, { props: { wizard: asWizard(wizard) } })
    const summary = document.querySelector(
      '[data-test-section="summary"]',
    ) as HTMLElement
    expect(
      within(summary).getByText('No observations in the selected data.'),
    ).toBeInTheDocument()
  })

  it('clicking the per-section edit button calls toggleEditSection', async () => {
    const wizard = buildWizardStub({ sections: { summary: 'Hello' } })
    render(ProfileReviewStep, { props: { wizard: asWizard(wizard) } })
    const btn = document.querySelector(
      '[data-test-toggle-section="summary"]',
    ) as HTMLButtonElement
    await fireEvent.click(btn)
    expect(wizard.toggleEditSection).toHaveBeenCalledWith('summary')
  })

  it('renders a textarea when editingPerSection flag is true and binds value', async () => {
    const wizard = buildWizardStub({
      sections: { summary: 'Existing text' },
      editingPerSection: { summary: true },
    })
    render(ProfileReviewStep, { props: { wizard: asWizard(wizard) } })
    const textarea = document.querySelector(
      '[data-test-textarea="summary"]',
    ) as HTMLTextAreaElement
    expect(textarea).toBeTruthy()
    expect(textarea.value).toBe('Existing text')

    await fireEvent.update(textarea, 'typed')
    expect(wizard.setSectionValue).toHaveBeenCalledWith('summary', 'typed')
  })

  it('Edit all button invokes enterEditAllMode; Done editing invokes exit', async () => {
    const wizard = buildWizardStub()
    const { rerender } = render(ProfileReviewStep, {
      props: { wizard: asWizard(wizard) },
    })

    const editAll = document.querySelector(
      '[data-test-edit-all]',
    ) as HTMLButtonElement
    await fireEvent.click(editAll)
    expect(wizard.enterEditAllMode).toHaveBeenCalledTimes(1)

    // Simulate the parent flipping the flag via the store action
    wizard.editingAll.value = true
    await rerender({ wizard: asWizard(wizard) })
    const done = document.querySelector(
      '[data-test-done-editing]',
    ) as HTMLButtonElement
    await fireEvent.click(done)
    expect(wizard.exitEditAllMode).toHaveBeenCalledTimes(1)
  })

  it('Regenerate without unsaved edits calls wizard.regenerate and does NOT show the dialog', async () => {
    const wizard = buildWizardStub({
      regenerateResult: { confirmationNeeded: false },
    })
    render(ProfileReviewStep, { props: { wizard: asWizard(wizard) } })

    const regenBtn = document.querySelector(
      '[data-test-regenerate]',
    ) as HTMLButtonElement
    await fireEvent.click(regenBtn)

    expect(wizard.regenerate).toHaveBeenCalledTimes(1)
    // Dialog should remain closed because confirmationNeeded was false.
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('Regenerate with unsaved edits opens the confirm dialog; confirm calls regenerate(force)', async () => {
    const wizard = buildWizardStub({
      hasUnsavedEdits: true,
      regenerateResult: { confirmationNeeded: true },
    })
    render(ProfileReviewStep, { props: { wizard: asWizard(wizard) } })

    const regenBtn = document.querySelector(
      '[data-test-regenerate]',
    ) as HTMLButtonElement
    await fireEvent.click(regenBtn)

    // Dialog is teleported to <body>; check via role.
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('Regenerate profile?')).toBeInTheDocument()

    const confirmBtn = within(dialog).getByRole('button', {
      name: 'Regenerate',
    })
    await fireEvent.click(confirmBtn)

    // First call: plain regenerate (returned confirmationNeeded=true).
    // Second call: regenerate({ force: true }) after the user confirmed.
    expect(wizard.regenerate).toHaveBeenCalledTimes(2)
    expect(wizard.regenerate).toHaveBeenLastCalledWith({ force: true })
  })

  it('renders the extras warning section when extras is non-empty (read-only)', () => {
    const wizard = buildWizardStub({ extras: 'leftover prose' })
    render(ProfileReviewStep, { props: { wizard: asWizard(wizard) } })

    const extras = document.querySelector('[data-test-extras]') as HTMLElement
    expect(extras).toBeTruthy()
    expect(within(extras).getByText('leftover prose')).toBeInTheDocument()
    // No textarea inside the extras section — it's strictly read-only.
    expect(extras.querySelector('textarea')).toBeNull()
  })

  it('hides the unsaved-edits badge when there are no edits, shows it otherwise', async () => {
    const cleanWizard = buildWizardStub()
    const { unmount } = render(ProfileReviewStep, {
      props: { wizard: asWizard(cleanWizard) },
    })
    expect(document.querySelector('[data-test-unsaved-note]')).toBeNull()
    unmount()

    const dirtyWizard = buildWizardStub({ hasUnsavedEdits: true })
    render(ProfileReviewStep, { props: { wizard: asWizard(dirtyWizard) } })
    expect(document.querySelector('[data-test-unsaved-note]')).toBeTruthy()
  })
})
