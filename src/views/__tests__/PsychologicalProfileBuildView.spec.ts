import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/vue'

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Keep draft storage hermetic — no IndexedDB in this unit test.
vi.mock('@/services/draftStorage', () => ({
  loadDraftFromDB: vi.fn(async () => null),
  saveDraftToDB: vi.fn(async () => undefined),
  clearDraftFromDB: vi.fn(async () => undefined),
}))

// Deterministic preview result for Step 2.
const previewMock = vi.fn(async (_args: unknown) => ({
  countsByType: { journal: 2 },
  objectIdsByType: { journal: ['a', 'b'] },
  headers: [
    { type: 'journal' as const, id: 'a', title: 'A', date: '2026-04-10T00:00:00.000Z' },
    { type: 'journal' as const, id: 'b', title: 'B', date: '2026-04-11T00:00:00.000Z' },
  ],
  approxTokens: 120,
}))
vi.mock('@/services/profileScopeQueries', () => ({
  queryScopePreview: (args: unknown) => previewMock(args),
}))

// Stub the userProfile store so buildProfile is a lightweight in-test spy.
// Each test can override `mockBuildProfile` to simulate success / error.
const mockBuildProfile = vi.fn()
vi.mock('@/stores/userProfile.store', async () => {
  const actual = await vi.importActual<
    typeof import('@/stores/userProfile.store')
  >('@/stores/userProfile.store')
  return {
    ...actual,
    useUserProfileStore: vi.fn(() => ({
      buildProfile: mockBuildProfile,
    })),
  }
})

// AppSnackbar stub so the view can mount in JSDOM without exposing the real
// snackbar implementation.
vi.mock('@/components/AppSnackbar.vue', () => {
  const show = vi.fn()
  return {
    default: {
      name: 'AppSnackbar',
      template: '<div data-testid="snackbar"></div>',
      methods: { show },
      expose: ['show'],
    },
    __snackbarShow: show,
  }
})

import PsychologicalProfileBuildView from '../PsychologicalProfileBuildView.vue'
import { ProfileBuildError } from '@/stores/userProfile.store'
import { createEmptySections } from '@/domain/userProfile'

describe('PsychologicalProfileBuildView', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    const { useUserPreferencesStore } = await import('@/stores/userPreferences.store')
    useUserPreferencesStore().$patch({ locale: 'en' })
    mockPush.mockClear()
    previewMock.mockClear()
    mockBuildProfile.mockReset()
  })

  it('starts on the scope step and shows the Preview button label', async () => {
    render(PsychologicalProfileBuildView)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument()
    })
  })

  it('navigates back to the profile route when the back arrow is clicked', async () => {
    render(PsychologicalProfileBuildView)
    const backBtn = screen.getByRole('button', { name: 'Back' })
    await fireEvent.click(backBtn)
    expect(mockPush).toHaveBeenCalledWith({ name: 'profile-psychological' })
  })

  it('advances to the preview step and calls queryScopePreview', async () => {
    render(PsychologicalProfileBuildView)
    const nextBtn = document.querySelector('[data-test-next]') as HTMLButtonElement
    await fireEvent.click(nextBtn)
    await waitFor(() => expect(previewMock).toHaveBeenCalledTimes(1))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument()
    })
  })

  it('runs buildProfile when Generate is clicked and advances to review on success', async () => {
    mockBuildProfile.mockResolvedValue({
      sections: { ...createEmptySections(), summary: 'Generated summary.' },
      rawResponse: '## Summary\n\nGenerated summary.',
      model: 'gpt-5-nano',
      extras: '',
    })

    render(PsychologicalProfileBuildView)

    // Advance scope → preview
    await fireEvent.click(
      document.querySelector('[data-test-next]') as HTMLButtonElement,
    )
    await waitFor(() => expect(previewMock).toHaveBeenCalled())

    // Click Generate (the Next button on Step 2)
    const generateBtn = await screen.findByRole('button', { name: 'Generate' })
    await fireEvent.click(generateBtn)

    // The store action ran with a scope we can sanity-check.
    await waitFor(() => expect(mockBuildProfile).toHaveBeenCalledTimes(1))
    const passedScope = mockBuildProfile.mock.calls[0][0] as {
      dataTypes: string[]
      locale: string
    }
    expect(passedScope.dataTypes).toContain('journal')
    expect(passedScope.locale).toBe('en')

    // On success the wizard auto-advances to the review placeholder.
    await waitFor(() => {
      expect(
        document.querySelector('[data-test-section="summary"]'),
      ).toBeInTheDocument()
    })
  })

  it('shows the error panel with a Retry button when the build fails', async () => {
    mockBuildProfile.mockRejectedValue(
      new ProfileBuildError('unknown', 'Simulated failure.'),
    )

    render(PsychologicalProfileBuildView)
    await fireEvent.click(
      document.querySelector('[data-test-next]') as HTMLButtonElement,
    )
    await waitFor(() => expect(previewMock).toHaveBeenCalled())
    const generateBtn = await screen.findByRole('button', { name: 'Generate' })
    await fireEvent.click(generateBtn)

    await waitFor(() => {
      expect(
        document.querySelector('[data-test-generate-state="error"]'),
      ).toBeInTheDocument()
    })
    expect(screen.getByText('Simulated failure.')).toBeInTheDocument()

    // Retry triggers a second buildProfile invocation.
    mockBuildProfile.mockResolvedValueOnce({
      sections: { ...createEmptySections(), summary: 'After retry.' },
      rawResponse: '## Summary\n\nAfter retry.',
      model: 'gpt-5-nano',
      extras: '',
    })
    const retryBtn = document.querySelector('[data-test-retry]') as HTMLButtonElement
    await fireEvent.click(retryBtn)
    await waitFor(() => expect(mockBuildProfile).toHaveBeenCalledTimes(2))
  })

  it('shows the missing-API-key CTA and navigates to /profile on click', async () => {
    mockBuildProfile.mockRejectedValue(
      new ProfileBuildError('missingApiKey', 'OpenAI API key is not configured.'),
    )

    render(PsychologicalProfileBuildView)
    await fireEvent.click(
      document.querySelector('[data-test-next]') as HTMLButtonElement,
    )
    await waitFor(() => expect(previewMock).toHaveBeenCalled())
    const generateBtn = await screen.findByRole('button', { name: 'Generate' })
    await fireEvent.click(generateBtn)

    await waitFor(() => {
      expect(
        document.querySelector('[data-test-generate-state="missing-api-key"]'),
      ).toBeInTheDocument()
    })

    const goToSettings = document.querySelector(
      '[data-test-go-to-settings]',
    ) as HTMLButtonElement
    await fireEvent.click(goToSettings)
    expect(mockPush).toHaveBeenCalledWith({
      name: 'profile',
      hash: '#ai-settings',
    })
  })

  it('shows ProfileReviewStep (not the placeholder) and "Continue to save" on success', async () => {
    mockBuildProfile.mockResolvedValue({
      sections: { ...createEmptySections(), summary: 'Generated summary.' },
      rawResponse: '## Summary\n\nGenerated summary.',
      model: 'gpt-5-nano',
      extras: '',
    })

    render(PsychologicalProfileBuildView)
    await fireEvent.click(
      document.querySelector('[data-test-next]') as HTMLButtonElement,
    )
    await waitFor(() => expect(previewMock).toHaveBeenCalled())
    await fireEvent.click(await screen.findByRole('button', { name: 'Generate' }))

    await waitFor(() => {
      expect(document.querySelector('[data-test-review-step]')).toBeInTheDocument()
    })
    expect(
      screen.getByRole('button', { name: 'Continue to save' }),
    ).toBeInTheDocument()
  })

  it('Next on review advances to save and renders the save placeholder', async () => {
    mockBuildProfile.mockResolvedValue({
      sections: { ...createEmptySections(), summary: 'Generated.' },
      rawResponse: '## Summary\n\nGenerated.',
      model: 'gpt-5-nano',
      extras: '',
    })

    render(PsychologicalProfileBuildView)
    await fireEvent.click(
      document.querySelector('[data-test-next]') as HTMLButtonElement,
    )
    await waitFor(() => expect(previewMock).toHaveBeenCalled())
    await fireEvent.click(await screen.findByRole('button', { name: 'Generate' }))
    await waitFor(() =>
      expect(document.querySelector('[data-test-review-step]')).toBeInTheDocument(),
    )

    const continueBtn = await screen.findByRole('button', {
      name: 'Continue to save',
    })
    await fireEvent.click(continueBtn)

    await waitFor(() => {
      expect(
        document.querySelector('[data-test-save-placeholder]'),
      ).toBeInTheDocument()
    })
  })

  it('Back on review with unsaved edits opens the confirm dialog; Stay cancels, Continue returns to preview', async () => {
    mockBuildProfile.mockResolvedValue({
      sections: { ...createEmptySections(), summary: 'Generated summary.' },
      rawResponse: '## Summary\n\nGenerated summary.',
      model: 'gpt-5-nano',
      extras: '',
    })

    render(PsychologicalProfileBuildView)
    await fireEvent.click(
      document.querySelector('[data-test-next]') as HTMLButtonElement,
    )
    await waitFor(() => expect(previewMock).toHaveBeenCalled())
    await fireEvent.click(await screen.findByRole('button', { name: 'Generate' }))
    await waitFor(() =>
      expect(document.querySelector('[data-test-review-step]')).toBeInTheDocument(),
    )

    // Open the summary editor and type to create an unsaved edit.
    const toggle = document.querySelector(
      '[data-test-toggle-section="summary"]',
    ) as HTMLButtonElement
    await fireEvent.click(toggle)
    const textarea = document.querySelector(
      '[data-test-textarea="summary"]',
    ) as HTMLTextAreaElement
    await fireEvent.update(textarea, 'edited summary')

    // Footer back opens the dialog.
    const backBtn = document.querySelector('[data-test-back]') as HTMLButtonElement
    await fireEvent.click(backBtn)
    let dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(
      within(dialog).getByText('Discard unsaved edits?'),
    ).toBeInTheDocument()

    // Stay closes the dialog, leaves the user on review.
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Stay' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.querySelector('[data-test-review-step]')).toBeInTheDocument()

    // Re-open the dialog and confirm Continue — should return to preview.
    await fireEvent.click(
      document.querySelector('[data-test-back]') as HTMLButtonElement,
    )
    dialog = await screen.findByRole('dialog')
    await fireEvent.click(
      within(dialog).getByRole('button', { name: 'Continue' }),
    )
    await waitFor(() => {
      expect(document.querySelector('[data-test-review-step]')).toBeNull()
    })
    // The preview step's Generate button is back on screen.
    expect(
      await screen.findByRole('button', { name: 'Generate' }),
    ).toBeInTheDocument()
  })

  it('Back on review without unsaved edits skips the dialog and goes straight to preview', async () => {
    mockBuildProfile.mockResolvedValue({
      sections: { ...createEmptySections(), summary: 'Generated.' },
      rawResponse: '## Summary\n\nGenerated.',
      model: 'gpt-5-nano',
      extras: '',
    })

    render(PsychologicalProfileBuildView)
    await fireEvent.click(
      document.querySelector('[data-test-next]') as HTMLButtonElement,
    )
    await waitFor(() => expect(previewMock).toHaveBeenCalled())
    await fireEvent.click(await screen.findByRole('button', { name: 'Generate' }))
    await waitFor(() =>
      expect(document.querySelector('[data-test-review-step]')).toBeInTheDocument(),
    )

    const backBtn = document.querySelector('[data-test-back]') as HTMLButtonElement
    await fireEvent.click(backBtn)
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => {
      expect(document.querySelector('[data-test-review-step]')).toBeNull()
    })
    expect(
      await screen.findByRole('button', { name: 'Generate' }),
    ).toBeInTheDocument()
  })

  it('hides the Next button while the generate step is active', async () => {
    // Keep the build pending so the view stays on the generate step during
    // the assertion.
    let resolveBuild: (v: {
      sections: Record<string, string>
      rawResponse: string
      model: string
      extras: string
    }) => void = () => {}
    mockBuildProfile.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveBuild = resolve
        }),
    )

    render(PsychologicalProfileBuildView)
    await fireEvent.click(
      document.querySelector('[data-test-next]') as HTMLButtonElement,
    )
    await waitFor(() => expect(previewMock).toHaveBeenCalled())
    await fireEvent.click(await screen.findByRole('button', { name: 'Generate' }))

    // While in-flight, the footer's Next button is not rendered.
    await waitFor(() => {
      expect(
        document.querySelector('[data-test-generate-state="in-flight"]'),
      ).toBeInTheDocument()
    })
    expect(document.querySelector('[data-test-next]')).toBeNull()

    // Resolve so the component finishes its lifecycle cleanly.
    resolveBuild({
      sections: createEmptySections(),
      rawResponse: '',
      model: 'gpt-5-nano',
      extras: '',
    })
  })
})
