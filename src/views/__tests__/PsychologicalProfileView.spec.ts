import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import PsychologicalProfileView from '../PsychologicalProfileView.vue'
import {
  createEmptySections,
  type UserProfile,
} from '@/domain/userProfile'

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  it('hides the Delete button for the current version when older versions exist', async () => {
    const older = makeProfile({ id: 'older', createdAt: '2026-01-01T00:00:00.000Z' })
    const newer = makeProfile({ id: 'newer', createdAt: '2026-02-01T00:00:00.000Z' })
    vi.mocked(userProfileDexieRepository.list).mockResolvedValue([newer, older])

    render(PsychologicalProfileView)

    await waitFor(() => {
      expect(screen.getByLabelText('View a past version')).toBeInTheDocument()
    })

    // Default selection is current (newer) → Delete must be hidden.
    expect(
      screen.queryByRole('button', { name: 'Delete this version' }),
    ).not.toBeInTheDocument()
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

  it('shows a snackbar when the empty-state CTA is clicked (wizard not yet available)', async () => {
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

    expect(snackbarShow).toHaveBeenCalledWith(
      'Profile building wizard is coming in a follow-up story.',
    )
  })
})
