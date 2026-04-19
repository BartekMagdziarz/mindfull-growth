import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { render, screen, fireEvent, waitFor } from '@testing-library/vue'

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

// AppSnackbar stub to spy on show() calls.
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
import * as snackbarModule from '@/components/AppSnackbar.vue'
const snackbarShow = (
  snackbarModule as unknown as { __snackbarShow: ReturnType<typeof vi.fn> }
).__snackbarShow

describe('PsychologicalProfileBuildView', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    const { useUserPreferencesStore } = await import('@/stores/userPreferences.store')
    useUserPreferencesStore().$patch({ locale: 'en' })
    mockPush.mockClear()
    previewMock.mockClear()
    snackbarShow.mockClear()
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

  it('shows the coming-soon snackbar when Next is clicked on the preview step', async () => {
    render(PsychologicalProfileBuildView)
    const nextBtn = document.querySelector('[data-test-next]') as HTMLButtonElement
    await fireEvent.click(nextBtn)
    await waitFor(() => expect(previewMock).toHaveBeenCalled())

    const generateBtn = await screen.findByRole('button', { name: 'Generate' })
    await fireEvent.click(generateBtn)

    await waitFor(() => {
      expect(snackbarShow).toHaveBeenCalledWith(
        'Generation arrives in the next story.',
      )
    })
  })
})
