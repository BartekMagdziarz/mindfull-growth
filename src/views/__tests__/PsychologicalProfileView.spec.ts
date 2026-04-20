import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import PsychologicalProfileView from '../PsychologicalProfileView.vue'
import {
  createEmptySections,
  type UserProfile,
} from '@/domain/userProfile'

const mockPush = vi.fn()
const mockRouteQuery: { versionId?: string } = {}
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ query: mockRouteQuery }),
}))

// Mock the user profile repository so tests can inject controlled state.
vi.mock('@/repositories/userProfileDexieRepository', () => ({
  userProfileDexieRepository: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    clearAll: vi.fn(),
  },
}))

vi.mock('@/repositories/profileBuildLogDexieRepository', () => ({
  profileBuildLogDexieRepository: {
    list: vi.fn(),
    getById: vi.fn(),
    add: vi.fn(),
    clearAll: vi.fn(),
  },
}))

// Mock the user settings repository so the preferences store can be
// driven in isolation — this drives the `includeProfileInChatContext`
// toggle on the chat-context card.
vi.mock('@/repositories/userSettingsDexieRepository', () => ({
  userSettingsDexieRepository: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock AppSnackbar to spy on `show()` calls.
// The `show` spy is accessed via the mocked module after import to
// avoid the "top-level variable referenced before initialization" issue
// caused by vi.mock hoisting.
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

import { userProfileDexieRepository } from '@/repositories/userProfileDexieRepository'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
 
import * as appSnackbarModule from '@/components/AppSnackbar.vue'
const snackbarShow = (appSnackbarModule as unknown as { __snackbarShow: ReturnType<typeof vi.fn> })
  .__snackbarShow

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: overrides.id ?? 'p' + Math.random().toString(36).slice(2, 10),
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
    note: overrides.note,
    scope: overrides.scope ?? {
      dataTypes: ['journal'],
      dateRange: { kind: 'preset', preset: 'last30' },
      includedObjectIds: {},
      approxTokenCount: 0,
      locale: 'en',
      grammaticalGender: 'masculine',
    },
    sections: overrides.sections ?? createEmptySections(),
    rawResponse: overrides.rawResponse ?? '',
    model: overrides.model ?? 'gpt-test',
  }
}

describe('PsychologicalProfileView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    snackbarShow.mockClear()
    vi.mocked(userProfileDexieRepository.list).mockResolvedValue([])
    vi.mocked(userProfileDexieRepository.delete).mockResolvedValue(undefined)
    // User settings start empty — the preferences store will fall back to
    // its defaults (including `includeProfileInChatContext: false`).
    vi.mocked(userSettingsDexieRepository.get).mockResolvedValue(undefined)
    vi.mocked(userSettingsDexieRepository.set).mockResolvedValue(undefined)
    // Reset route query and sessionStorage between tests so the
    // edit-handoff key never bleeds over.
    delete mockRouteQuery.versionId
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.clear()
    }
  })

  it('renders the empty state when there are no saved profiles', async () => {
    render(PsychologicalProfileView)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: 'Build your first profile' }),
      ).toBeInTheDocument()
    })
    expect(
      screen.getByText(
        'Pick which data to include, let the AI build a first draft, and review it before saving.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Build your first profile' }),
    ).toBeInTheDocument()
  })

  it('renders the profile sections when a single profile is loaded', async () => {
    const sections = createEmptySections()
    sections.summary = 'Inline summary text.'
    const p = makeProfile({ sections })
    vi.mocked(userProfileDexieRepository.list).mockResolvedValue([p])

    render(PsychologicalProfileView)

    await waitFor(() => {
      expect(screen.getByText('Summary')).toBeInTheDocument()
    })
    expect(screen.getByText('Inline summary text.')).toBeInTheDocument()
    expect(screen.getByText('Values and guiding principles')).toBeInTheDocument()
    // Version picker should NOT be shown with a sole version.
    expect(screen.queryByLabelText('View a past version')).not.toBeInTheDocument()
  })

  it('shows the version picker only when there are 2+ profiles', async () => {
    const older = makeProfile({
      id: 'older',
      createdAt: '2026-01-01T00:00:00.000Z',
      note: 'Older version',
    })
    const newer = makeProfile({
      id: 'newer',
      createdAt: '2026-02-01T00:00:00.000Z',
    })
    vi.mocked(userProfileDexieRepository.list).mockResolvedValue([newer, older])

    render(PsychologicalProfileView)

    await waitFor(() => {
      expect(screen.getByLabelText('View a past version')).toBeInTheDocument()
    })
  })

  it('updates the displayed profile when a past version is selected', async () => {
    const user = userEvent.setup()
    const olderSections = createEmptySections()
    olderSections.summary = 'Older summary text.'
    const newerSections = createEmptySections()
    newerSections.summary = 'Newer summary text.'
    const older = makeProfile({
      id: 'older',
      createdAt: '2026-01-01T00:00:00.000Z',
      sections: olderSections,
    })
    const newer = makeProfile({
      id: 'newer',
      createdAt: '2026-02-01T00:00:00.000Z',
      sections: newerSections,
    })
    vi.mocked(userProfileDexieRepository.list).mockResolvedValue([newer, older])

    render(PsychologicalProfileView)

    await waitFor(() => {
      expect(screen.getByText('Newer summary text.')).toBeInTheDocument()
    })

    const select = screen.getByLabelText('View a past version') as HTMLSelectElement
    await user.selectOptions(select, 'older')

    await waitFor(() => {
      expect(screen.getByText('Older summary text.')).toBeInTheDocument()
    })
    expect(screen.queryByText('Newer summary text.')).not.toBeInTheDocument()
  })

  it('disables the Delete button for the current version when older versions exist, and shows the helper text', async () => {
    const older = makeProfile({ id: 'older', createdAt: '2026-01-01T00:00:00.000Z' })
    const newer = makeProfile({ id: 'newer', createdAt: '2026-02-01T00:00:00.000Z' })
    vi.mocked(userProfileDexieRepository.list).mockResolvedValue([newer, older])

    render(PsychologicalProfileView)

    await waitFor(() => {
      expect(screen.getByLabelText('View a past version')).toBeInTheDocument()
    })

    // Default selection is current (newer): Delete is rendered but disabled.
    const deleteBtn = screen.getByRole('button', {
      name: 'Delete this version',
    }) as HTMLButtonElement
    expect(deleteBtn).toBeInTheDocument()
    expect(deleteBtn).toBeDisabled()
    // Helper text appears next to the disabled button.
    expect(
      document.querySelector('[data-test-delete-blocked]'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'The current version is protected. Build a newer version first, then you can delete this one.',
      ),
    ).toBeInTheDocument()
  })

  it('shows the Delete button when the only version is selected (sole version)', async () => {
    const only = makeProfile({ id: 'only' })
    vi.mocked(userProfileDexieRepository.list).mockResolvedValue([only])

    render(PsychologicalProfileView)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Delete this version' }),
      ).toBeInTheDocument()
    })
  })

  it('shows the Delete button when a non-current (older) version is selected', async () => {
    const user = userEvent.setup()
    const older = makeProfile({ id: 'older', createdAt: '2026-01-01T00:00:00.000Z' })
    const newer = makeProfile({ id: 'newer', createdAt: '2026-02-01T00:00:00.000Z' })
    vi.mocked(userProfileDexieRepository.list).mockResolvedValue([newer, older])

    render(PsychologicalProfileView)

    await waitFor(() => {
      expect(screen.getByLabelText('View a past version')).toBeInTheDocument()
    })

    const select = screen.getByLabelText('View a past version') as HTMLSelectElement
    await user.selectOptions(select, 'older')

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Delete this version' }),
      ).toBeInTheDocument()
    })
  })

  it('confirming the delete dialog calls deleteProfile with the displayed id', async () => {
    const user = userEvent.setup()
    const older = makeProfile({ id: 'older', createdAt: '2026-01-01T00:00:00.000Z' })
    const newer = makeProfile({ id: 'newer', createdAt: '2026-02-01T00:00:00.000Z' })
    vi.mocked(userProfileDexieRepository.list).mockResolvedValue([newer, older])

    render(PsychologicalProfileView)

    await waitFor(() => {
      expect(screen.getByLabelText('View a past version')).toBeInTheDocument()
    })

    const select = screen.getByLabelText('View a past version') as HTMLSelectElement
    await user.selectOptions(select, 'older')

    const deleteBtn = await screen.findByRole('button', { name: 'Delete this version' })
    await user.click(deleteBtn)

    // AppDialog stub from test/setup.ts renders its confirmText as a button.
    const confirmBtn = await screen.findByRole('button', { name: 'Delete' })
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(userProfileDexieRepository.delete).toHaveBeenCalledWith('older')
    })
  })

  it('navigates back to /profile on back button click', async () => {
    const user = userEvent.setup()
    render(PsychologicalProfileView)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: 'Build your first profile' }),
      ).toBeInTheDocument()
    })

    const backBtn = screen.getByRole('button', { name: 'Back' })
    await user.click(backBtn)

    expect(mockPush).toHaveBeenCalledWith({ name: 'profile' })
  })

  it('navigates to the build wizard when the empty-state CTA is clicked', async () => {
    const user = userEvent.setup()
    render(PsychologicalProfileView)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Build your first profile' }),
      ).toBeInTheDocument()
    })

    await user.click(
      screen.getByRole('button', { name: 'Build your first profile' }),
    )

    expect(mockPush).toHaveBeenCalledWith({ name: 'profile-psychological-build' })
    expect(snackbarShow).not.toHaveBeenCalled()
  })

  it('clicking "Edit this version" stashes the id in sessionStorage and navigates to the build wizard', async () => {
    const user = userEvent.setup()
    const sole = makeProfile({ id: 'src-edit' })
    vi.mocked(userProfileDexieRepository.list).mockResolvedValue([sole])

    render(PsychologicalProfileView)

    const editBtn = await screen.findByRole('button', { name: /Edit this version/ })
    await user.click(editBtn)

    expect(window.sessionStorage.getItem('profile-build-edit-source')).toBe(
      'src-edit',
    )
    expect(mockPush).toHaveBeenCalledWith({
      name: 'profile-psychological-build',
    })
  })

  it('preselects the version from route.query.versionId on mount', async () => {
    const olderSections = createEmptySections()
    olderSections.summary = 'Older summary text.'
    const newerSections = createEmptySections()
    newerSections.summary = 'Newer summary text.'
    const older = makeProfile({
      id: 'older',
      createdAt: '2026-01-01T00:00:00.000Z',
      sections: olderSections,
    })
    const newer = makeProfile({
      id: 'newer',
      createdAt: '2026-02-01T00:00:00.000Z',
      sections: newerSections,
    })
    vi.mocked(userProfileDexieRepository.list).mockResolvedValue([newer, older])

    // Simulate landing on /profile/psychological?versionId=older
    mockRouteQuery.versionId = 'older'

    render(PsychologicalProfileView)

    // The older summary text is shown — older is preselected, not newer.
    await waitFor(() => {
      expect(screen.getByText('Older summary text.')).toBeInTheDocument()
    })
    expect(screen.queryByText('Newer summary text.')).not.toBeInTheDocument()
  })

  it('falls back to the current version when route.query.versionId points at a missing profile', async () => {
    const sole = makeProfile({ id: 'only', sections: { ...createEmptySections(), summary: 'Only one' } })
    vi.mocked(userProfileDexieRepository.list).mockResolvedValue([sole])

    mockRouteQuery.versionId = 'does-not-exist'

    render(PsychologicalProfileView)

    await waitFor(() => {
      expect(screen.getByText('Only one')).toBeInTheDocument()
    })
  })

  it('Delete button is enabled with no helper text when there is only a single version', async () => {
    const only = makeProfile({ id: 'only' })
    vi.mocked(userProfileDexieRepository.list).mockResolvedValue([only])

    render(PsychologicalProfileView)

    const deleteBtn = await screen.findByRole('button', {
      name: 'Delete this version',
    })
    expect(deleteBtn).not.toBeDisabled()
    expect(
      document.querySelector('[data-test-delete-blocked]'),
    ).toBeNull()
  })

  describe('chat context toggle', () => {
    it('renders the toggle with aria-checked=false by default (no stored preference)', async () => {
      // Empty storage → preferences store defaults `includeProfileInChatContext`
      // to false, and the toggle should reflect that.
      render(PsychologicalProfileView)

      const toggle = await screen.findByRole('switch', {
        name: 'Toggle including profile in chat context',
      })
      expect(toggle).toBeInTheDocument()
      expect(toggle).toHaveAttribute('aria-checked', 'false')
    })

    it('clicking the toggle persists "true" as a string and updates aria-checked', async () => {
      const user = userEvent.setup()
      render(PsychologicalProfileView)

      const toggle = await screen.findByRole('switch', {
        name: 'Toggle including profile in chat context',
      })
      expect(toggle).toHaveAttribute('aria-checked', 'false')

      await user.click(toggle)

      // The preference is serialized as a string because the underlying
      // repository only accepts strings (Story 7 design).
      await waitFor(() => {
        expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
          'preferences.chat.includeProfile',
          'true',
        )
      })
      expect(toggle).toHaveAttribute('aria-checked', 'true')
    })

    it('shows the "no profile" warning when the preference is on but no profile exists', async () => {
      const user = userEvent.setup()
      render(PsychologicalProfileView)

      // Turn the toggle on while there are zero profiles in the store.
      const toggle = await screen.findByRole('switch', {
        name: 'Toggle including profile in chat context',
      })
      await user.click(toggle)

      await waitFor(() => {
        expect(
          document.querySelector('[data-test-chat-context-no-profile]'),
        ).toBeInTheDocument()
      })
      expect(
        screen.getByText(
          'You have no saved profile yet. Build your first profile to give chat this context.',
        ),
      ).toBeInTheDocument()
    })

    it('hides the "no profile" warning when the preference is on and a profile exists', async () => {
      const user = userEvent.setup()
      const sole = makeProfile({ id: 'exists' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([sole])

      render(PsychologicalProfileView)

      const toggle = await screen.findByRole('switch', {
        name: 'Toggle including profile in chat context',
      })
      await user.click(toggle)

      await waitFor(() => {
        expect(toggle).toHaveAttribute('aria-checked', 'true')
      })
      // Warning must not appear when there is at least one saved profile.
      expect(
        document.querySelector('[data-test-chat-context-no-profile]'),
      ).toBeNull()
    })
  })
})
