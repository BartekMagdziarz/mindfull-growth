import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import PsychologicalProfileView from '../PsychologicalProfileView.vue'
import {
  createEmptySections,
  type UserProfile,
} from '@/domain/userProfile'
import type { FoundationItemStatus } from '@/services/foundationCompleteness'

const mockPush = vi.fn()
const mockRouteQuery: { versionId?: string } = {}
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ query: mockRouteQuery }),
}))

const foundationMock = vi.hoisted(() => ({
  statuses: [] as FoundationItemStatus[],
  loadFoundationSourceData: vi.fn(),
}))

vi.mock('@/services/foundationCompleteness', () => ({
  FOUNDATION_BUILD_FLOOR: 3,
  computeFoundationStatuses: () => foundationMock.statuses,
  foundationCompletionCount: (statuses: FoundationItemStatus[]) =>
    statuses.filter((status) => status.state === 'completed' || status.state === 'outdated')
      .length,
  isFoundationOutdated: (statuses: FoundationItemStatus[]) =>
    statuses.some((status) => status.state === 'outdated'),
  loadFoundationSourceData: foundationMock.loadFoundationSourceData,
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
import { useUserPreferencesStore } from '@/stores/userPreferences.store'

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

function makeFoundationStatus(
  id: FoundationItemStatus['id'],
  group: FoundationItemStatus['group'],
  state: FoundationItemStatus['state'] = 'not-started',
  routeParams?: Record<string, string>,
): FoundationItemStatus {
  return {
    id,
    group,
    state,
    lastCompletedAt:
      state === 'completed' || state === 'outdated'
        ? '2025-01-01T00:00:00.000Z'
        : undefined,
    routeName: routeParams ? 'exercise-assessment' : `exercise-${id}`,
    routeParams,
  }
}

function makeFoundationStatuses(
  completedCount = 0,
  outdatedIds: FoundationItemStatus['id'][] = [],
): FoundationItemStatus[] {
  const items: Array<{
    id: FoundationItemStatus['id']
    group: FoundationItemStatus['group']
    routeParams?: Record<string, string>
  }> = [
    { id: 'valuesDiscovery', group: 'values' },
    { id: 'valueMap', group: 'values' },
    { id: 'transformativePurpose', group: 'values' },
    { id: 'vlq', group: 'values', routeParams: { assessmentId: 'vlq' } },
    { id: 'ipip-bfm-50', group: 'personality', routeParams: { assessmentId: 'ipip-bfm-50' } },
    { id: 'ipip-neo-120', group: 'personality', routeParams: { assessmentId: 'ipip-neo-120' } },
    { id: 'hexaco-60', group: 'personality', routeParams: { assessmentId: 'hexaco-60' } },
    { id: 'shadowBeliefs', group: 'personality' },
    { id: 'wheelOfLife', group: 'lifeBalance' },
    { id: 'pvq-40', group: 'lifeBalance', routeParams: { assessmentId: 'pvq-40' } },
  ]

  return items.map((item, index) => {
    const state = outdatedIds.includes(item.id)
      ? 'outdated'
      : index < completedCount
        ? 'completed'
        : 'not-started'

    return makeFoundationStatus(item.id, item.group, state, item.routeParams)
  })
}

describe('PsychologicalProfileView', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    snackbarShow.mockClear()
    foundationMock.statuses = makeFoundationStatuses()
    foundationMock.loadFoundationSourceData.mockResolvedValue(undefined)
    vi.mocked(userProfileDexieRepository.list).mockResolvedValue([])
    vi.mocked(userProfileDexieRepository.delete).mockResolvedValue(undefined)
    // User settings start empty — the preferences store will fall back to
    // its defaults (including `includeProfileInChatContext: false`).
    vi.mocked(userSettingsDexieRepository.get).mockImplementation(
      async (key) => {
        if (key === 'preferences.locale') return 'en'
        return undefined
      },
    )
    vi.mocked(userSettingsDexieRepository.set).mockResolvedValue(undefined)
    vi.mocked(userSettingsDexieRepository.delete).mockResolvedValue(undefined)
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
      expect(screen.getByText('Values & meaning')).toBeInTheDocument()
    })
    expect(screen.getByText('0 of 10 complete')).toBeInTheDocument()
    expect(
      screen.queryByText(
        'Pick which data to include, let the AI build a first draft, and review it before saving.',
      ),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Complete at least 3 foundation items first',
      }),
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
      expect(screen.getByText('Values & meaning')).toBeInTheDocument()
    })

    const backBtn = screen.getByRole('button', { name: 'Back' })
    await user.click(backBtn)

    expect(mockPush).toHaveBeenCalledWith({ name: 'profile' })
  })

  it('navigates to the build wizard when the empty-state CTA is clicked', async () => {
    const user = userEvent.setup()
    foundationMock.statuses = makeFoundationStatuses(3)

    render(PsychologicalProfileView)

    const ctaText = await screen.findByText('Build my first profile')
    const cta = ctaText.closest('button')
    expect(cta).toBeTruthy()

    await user.click(cta as HTMLButtonElement)

    expect(mockPush).toHaveBeenCalledWith({ name: 'profile-psychological-build' })
    expect(snackbarShow).not.toHaveBeenCalled()
  })

  describe('foundation refresh banner', () => {
    it('does not render when a profile exists but no foundation tile is outdated', async () => {
      const sole = makeProfile({ id: 'exists' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([sole])
      foundationMock.statuses = makeFoundationStatuses(3)

      render(PsychologicalProfileView)

      await waitFor(() => {
        expect(screen.getByText('Summary')).toBeInTheDocument()
      })
      expect(
        screen.queryByText('Some foundation data is over 6 months old'),
      ).not.toBeInTheDocument()
    })

    it('renders when a profile exists and at least one foundation tile is outdated', async () => {
      const sole = makeProfile({ id: 'exists' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([sole])
      foundationMock.statuses = makeFoundationStatuses(3, ['valuesDiscovery'])

      render(PsychologicalProfileView)

      await waitFor(() => {
        expect(
          screen.getByText('Some foundation data is over 6 months old'),
        ).toBeInTheDocument()
      })
      expect(screen.getByText(/1 foundation item/)).toBeInTheDocument()
    })

    it('hides when the refresh banner was dismissed recently', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      vi.setSystemTime(new Date('2026-05-09T12:00:00.000Z'))
      const sole = makeProfile({ id: 'exists' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([sole])
      useUserPreferencesStore().$patch({
        locale: 'en',
        foundationRefreshDismissedAt: '2026-05-04T12:00:00.000Z',
        isLoaded: true,
      })
      foundationMock.statuses = makeFoundationStatuses(3, ['valuesDiscovery'])

      render(PsychologicalProfileView)

      await waitFor(() => {
        expect(screen.getByText('Summary')).toBeInTheDocument()
      })
      expect(
        screen.queryByText('Some foundation data is over 6 months old'),
      ).not.toBeInTheDocument()
    })

    it('renders when the refresh banner dismissal is older than 30 days', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      vi.setSystemTime(new Date('2026-05-09T12:00:00.000Z'))
      const sole = makeProfile({ id: 'exists' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([sole])
      useUserPreferencesStore().$patch({
        locale: 'en',
        foundationRefreshDismissedAt: '2026-04-08T12:00:00.000Z',
        isLoaded: true,
      })
      foundationMock.statuses = makeFoundationStatuses(3, ['valuesDiscovery'])

      render(PsychologicalProfileView)

      await waitFor(() => {
        expect(
          screen.getByText('Some foundation data is over 6 months old'),
        ).toBeInTheDocument()
      })
    })

    it('navigates to the foundation route from the banner CTA', async () => {
      const user = userEvent.setup()
      const sole = makeProfile({ id: 'exists' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([sole])
      foundationMock.statuses = makeFoundationStatuses(3, ['valuesDiscovery'])

      render(PsychologicalProfileView)

      const openButton = await screen.findByRole('button', {
        name: 'Open foundation',
      })
      await user.click(openButton)

      expect(mockPush).toHaveBeenCalledWith({
        name: 'profile-psychological-foundation',
      })
    })

    it('persists dismissal and hides the banner when dismissed', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      vi.setSystemTime(new Date('2026-05-09T12:00:00.000Z'))
      const sole = makeProfile({ id: 'exists' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([sole])
      foundationMock.statuses = makeFoundationStatuses(3, ['valuesDiscovery'])

      render(PsychologicalProfileView)

      const dismissButton = await screen.findByRole('button', {
        name: 'Remind me in 30 days',
      })
      await fireEvent.click(dismissButton)
      vi.advanceTimersByTime(200)
      await Promise.resolve()

      await waitFor(() => {
        expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
          'profile.foundationRefreshDismissedAt',
          '2026-05-09T12:00:00.000Z',
        )
      })
      await waitFor(() => {
        expect(
          screen.queryByText('Some foundation data is over 6 months old'),
        ).not.toBeInTheDocument()
      })
    })
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

  describe('profile context defaults', () => {
    async function findToggle(
      attr: 'data-test-profile-context-default-toggle' | 'data-test-profile-context-default-journal-toggle',
    ): Promise<HTMLElement> {
      let el: HTMLElement | null = null
      await waitFor(() => {
        el = document.querySelector(`[${attr}]`)
        expect(el).not.toBeNull()
      })
      return el as unknown as HTMLElement
    }

    it('renders both default toggles with aria-checked=true (module defaults)', async () => {
      // Empty storage → store falls back to module defaults: both true.
      render(PsychologicalProfileView)

      const generalToggle = await findToggle(
        'data-test-profile-context-default-toggle',
      )
      const journalToggle = await findToggle(
        'data-test-profile-context-default-journal-toggle',
      )
      expect(generalToggle).toHaveAttribute('aria-checked', 'true')
      expect(journalToggle).toHaveAttribute('aria-checked', 'true')
    })

    it('clicking the general toggle persists the new value as a string', async () => {
      const user = userEvent.setup()
      render(PsychologicalProfileView)

      const toggle = await findToggle(
        'data-test-profile-context-default-toggle',
      )
      expect(toggle).toHaveAttribute('aria-checked', 'true')

      await user.click(toggle)

      await waitFor(() => {
        expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
          'preferences.profileContext.default',
          'false',
        )
      })
      expect(toggle).toHaveAttribute('aria-checked', 'false')
    })

    it('clicking the journal toggle persists the new value separately', async () => {
      const user = userEvent.setup()
      render(PsychologicalProfileView)

      const toggle = await findToggle(
        'data-test-profile-context-default-journal-toggle',
      )
      await user.click(toggle)

      await waitFor(() => {
        expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
          'preferences.profileContext.defaultJournal',
          'false',
        )
      })
      expect(toggle).toHaveAttribute('aria-checked', 'false')
    })

    it('shows the "no profile" warning when at least one default is on but no profile exists', async () => {
      // Module defaults are true → warning should already be visible
      // because there are zero profiles in the store.
      render(PsychologicalProfileView)

      await waitFor(() => {
        expect(
          document.querySelector('[data-test-profile-context-no-profile]'),
        ).toBeInTheDocument()
      })
    })

    it('hides the "no profile" warning when a profile exists', async () => {
      const sole = makeProfile({ id: 'exists' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([sole])

      render(PsychologicalProfileView)

      await waitFor(() => {
        expect(screen.getByText('Summary')).toBeInTheDocument()
      })
      expect(
        document.querySelector('[data-test-profile-context-no-profile]'),
      ).toBeNull()
    })
  })
})
