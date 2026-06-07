import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import ProfileView from '../ProfileView.vue'
import { mockConsoleError } from '@/test/utils/console'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import {
  AI_PROVIDER_SETTINGS_KEY,
  LEGACY_OPENAI_API_KEY,
  type AIProviderSettings,
} from '@/services/llmService'

const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useRoute: () => ({ hash: '' }),
}))

vi.mock('@/repositories/userSettingsDexieRepository', () => {
  return {
    userSettingsDexieRepository: {
      get: vi.fn(),
      set: vi.fn(),
    },
  }
})

vi.mock('@/components/AppSnackbar.vue', () => ({
  default: {
    name: 'AppSnackbar',
    template: '<div data-testid="snackbar"></div>',
    methods: {
      show: vi.fn(),
    },
    expose: ['show'],
  },
}))

async function mockStoredSettings(settings?: AIProviderSettings, legacyKey?: string) {
  const { userSettingsDexieRepository } = await import(
    '@/repositories/userSettingsDexieRepository'
  )
  vi.mocked(userSettingsDexieRepository.get).mockImplementation(async (key) => {
    if (key === 'preferences.locale') return 'en'
    if (key === AI_PROVIDER_SETTINGS_KEY && settings) {
      return JSON.stringify(settings)
    }
    if (key === LEGACY_OPENAI_API_KEY) return legacyKey
    return undefined
  })
  return userSettingsDexieRepository
}

function savedAISettings(): AIProviderSettings {
  const { calls } = vi.mocked(userSettingsDexieRepository.set).mock
  const call = calls.find(([key]) => key === AI_PROVIDER_SETTINGS_KEY)
  if (!call) throw new Error('aiProviderSettings was not saved')
  return JSON.parse(call[1]) as AIProviderSettings
}

async function switchToAITab() {
  const user = userEvent.setup()
  const tab = await screen.findByRole('tab', { name: 'AI assistant' })
  await user.click(tab)
  // The tab swap is synchronous but onMounted in the freshly mounted tab
  // component runs an async settings load — wait for it to settle so the
  // inputs reflect the persisted values before the test assertions run.
  await waitFor(() => {
    expect(screen.getByLabelText('AI provider')).toBeInTheDocument()
  })
  return user
}

describe('ProfileView (shell)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    document.documentElement.removeAttribute('data-theme')
    const repo = await mockStoredSettings()
    vi.mocked(repo.set).mockResolvedValue(undefined)
  })

  it('renders the five segmented tabs with Preferences as the default panel', () => {
    render(ProfileView)

    expect(screen.getByRole('tab', { name: 'Account' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Preferences' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Life areas' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Psych. profile' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'AI assistant' })).toBeInTheDocument()

    // Default tab is Preferences — theme picker should be visible.
    expect(screen.getByRole('tab', { name: 'Preferences' }))
      .toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Color theme')).toBeInTheDocument()
  })

  it('exposes a sign-out button in the ID strip', () => {
    render(ProfileView)
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('switches to the Account tab and shows account fields + security actions', async () => {
    const user = userEvent.setup()
    render(ProfileView)

    await user.click(screen.getByRole('tab', { name: 'Account' }))

    expect(screen.getByText('Account details')).toBeInTheDocument()
    expect(screen.getByText('Activity')).toBeInTheDocument()
    expect(screen.getByText('Security & data')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export data/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument()
  })
})

describe('ProfileView › Preferences tab', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    document.documentElement.removeAttribute('data-theme')
    const repo = await mockStoredSettings()
    vi.mocked(repo.set).mockResolvedValue(undefined)
  })

  it('reflects the persisted theme preference on mount', async () => {
    const { userSettingsDexieRepository } = await import(
      '@/repositories/userSettingsDexieRepository'
    )
    vi.mocked(userSettingsDexieRepository.get).mockImplementation(async (key) => {
      if (key === 'preferences.theme') return 'sunrise-cloud'
      if (key === 'preferences.locale') return 'en'
      return undefined
    })

    render(ProfileView)

    await waitFor(() => {
      const sunriseCard = screen.getByRole('button', { name: 'Sunrise Cloud' })
      expect(sunriseCard).toHaveAttribute('aria-pressed', 'true')
    })
  })

  it('applies and persists the theme when a theme card is clicked', async () => {
    const user = userEvent.setup()
    const { userSettingsDexieRepository } = await import(
      '@/repositories/userSettingsDexieRepository'
    )

    render(ProfileView)

    await user.click(screen.getByRole('button', { name: 'Sky Mist' }))

    await waitFor(() => {
      expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
        'preferences.theme',
        'sky-mist',
      )
    })
    expect(document.documentElement.getAttribute('data-theme')).toBe('sky-mist')
  })
})

describe('ProfileView › AI assistant tab', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    document.documentElement.removeAttribute('data-theme')
    const repo = await mockStoredSettings()
    vi.mocked(repo.set).mockResolvedValue(undefined)
  })

  it('renders AI provider settings fields after switching to the tab', async () => {
    render(ProfileView)
    await switchToAITab()

    expect(screen.getByLabelText('AI provider')).toBeInTheDocument()
    expect(screen.getByLabelText('Base URL')).toBeInTheDocument()
    expect(screen.getByLabelText('Model')).toBeInTheDocument()
    // OpenAI (the default provider) runs reasoning models, so the effort
    // selector is shown.
    expect(screen.getByLabelText('Reasoning effort')).toBeInTheDocument()
    expect(screen.getByLabelText('API key')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('loads an existing legacy OpenAI API key on mount', async () => {
    await mockStoredSettings(undefined, 'sk-test123456789')

    render(ProfileView)
    await switchToAITab()

    await waitFor(() => {
      expect((screen.getByLabelText('AI provider') as HTMLSelectElement).value).toBe(
        'openai',
      )
      expect((screen.getByLabelText('Base URL') as HTMLInputElement).value).toBe(
        'https://api.openai.com/v1',
      )
      expect((screen.getByLabelText('Model') as HTMLInputElement).value).toBe(
        'gpt-5.4-nano',
      )
      expect((screen.getByLabelText('API key') as HTMLInputElement).value).toBe(
        'sk-test123456789',
      )
    })
  })

  it('saves OpenAI settings under aiProviderSettings and the legacy key', async () => {
    const { userSettingsDexieRepository } = await import(
      '@/repositories/userSettingsDexieRepository'
    )
    render(ProfileView)
    const user = await switchToAITab()

    await user.type(screen.getByLabelText('API key'), 'sk-test123456789')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
        LEGACY_OPENAI_API_KEY,
        'sk-test123456789',
      )
    })
    expect(savedAISettings()).toEqual({
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-5.4-nano',
      apiKey: 'sk-test123456789',
      reasoningEffort: 'low',
    })
  })

  it('requires API key for OpenAI', async () => {
    render(ProfileView)
    await switchToAITab()

    const saveButton = screen.getByRole('button', { name: 'Save' })
    expect(saveButton).toBeDisabled()
    expect(await screen.findByText('OpenAI API key is required.')).toBeInTheDocument()
  })

  it('does not require API key for Ollama and applies its preset', async () => {
    const { userSettingsDexieRepository } = await import(
      '@/repositories/userSettingsDexieRepository'
    )
    render(ProfileView)
    const user = await switchToAITab()

    await user.selectOptions(screen.getByLabelText('AI provider'), 'ollama')

    expect((screen.getByLabelText('Base URL') as HTMLInputElement).value).toBe(
      'http://localhost:11434/v1',
    )
    expect((screen.getByLabelText('Model') as HTMLInputElement).value).toBe(
      'gemma4:e4b',
    )
    expect(screen.queryByText('OpenAI API key is required.')).not.toBeInTheDocument()
    expect((screen.getByLabelText('Reasoning effort') as HTMLSelectElement).value).toBe(
      'low',
    )
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
        AI_PROVIDER_SETTINGS_KEY,
        expect.any(String),
      )
    })
    expect(savedAISettings()).toEqual({
      provider: 'ollama',
      baseUrl: 'http://localhost:11434/v1',
      model: 'gemma4:e4b',
      reasoningEffort: 'low',
    })
  })

  it('saves the selected Ollama reasoning effort', async () => {
    render(ProfileView)
    const user = await switchToAITab()

    await user.selectOptions(screen.getByLabelText('AI provider'), 'ollama')
    await user.selectOptions(screen.getByLabelText('Reasoning effort'), 'medium')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(savedAISettings().reasoningEffort).toBe('medium')
    })
  })

  it('does not require API key for MLX and applies its preset', async () => {
    render(ProfileView)
    const user = await switchToAITab()

    await user.selectOptions(screen.getByLabelText('AI provider'), 'mlx')

    expect((screen.getByLabelText('Base URL') as HTMLInputElement).value).toBe(
      'http://localhost:8080/v1',
    )
    expect((screen.getByLabelText('Model') as HTMLInputElement).value).toBe(
      'mlx-community/gemma-4-26B-A4B-it-OptiQ-4bit',
    )
    expect(screen.queryByText('OpenAI API key is required.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled()
  })

  it('reapplies the OpenAI preset when OpenAI is selected', async () => {
    render(ProfileView)
    const user = await switchToAITab()

    await user.selectOptions(screen.getByLabelText('AI provider'), 'ollama')
    await user.selectOptions(screen.getByLabelText('AI provider'), 'openai')

    expect((screen.getByLabelText('Base URL') as HTMLInputElement).value).toBe(
      'https://api.openai.com/v1',
    )
    expect((screen.getByLabelText('Model') as HTMLInputElement).value).toBe(
      'gpt-5.4-nano',
    )
  })

  it('requires baseUrl and model for custom providers', async () => {
    render(ProfileView)
    const user = await switchToAITab()

    await user.selectOptions(screen.getByLabelText('AI provider'), 'custom')
    await user.clear(screen.getByLabelText('Base URL'))
    await user.clear(screen.getByLabelText('Model'))

    await waitFor(() => {
      expect(screen.getByText('Base URL is required.')).toBeInTheDocument()
      expect(screen.getByText('Model is required.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    })
  })

  it('does not validate local provider keys with an sk- prefix rule', async () => {
    render(ProfileView)
    const user = await switchToAITab()

    await user.selectOptions(screen.getByLabelText('AI provider'), 'ollama')
    await user.type(screen.getByLabelText('API key'), 'not-an-openai-key')

    expect(screen.queryByText(/must start with 'sk-'/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled()
  })

  it('trims baseUrl, model, and apiKey before saving', async () => {
    render(ProfileView)
    const user = await switchToAITab()

    await user.selectOptions(screen.getByLabelText('AI provider'), 'custom')
    await user.clear(screen.getByLabelText('Base URL'))
    await user.type(screen.getByLabelText('Base URL'), '  http://localhost:9999/v1  ')
    await user.clear(screen.getByLabelText('Model'))
    await user.type(screen.getByLabelText('Model'), '  custom-model  ')
    await user.type(screen.getByLabelText('API key'), '  custom-token  ')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(savedAISettings()).toEqual({
        provider: 'custom',
        baseUrl: 'http://localhost:9999/v1',
        model: 'custom-model',
        apiKey: 'custom-token',
      })
    })
  })

  it('shows loading state while saving', async () => {
    const { userSettingsDexieRepository } = await import(
      '@/repositories/userSettingsDexieRepository'
    )
    vi.mocked(userSettingsDexieRepository.set).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    )

    render(ProfileView)
    const user = await switchToAITab()

    await user.type(screen.getByLabelText('API key'), 'sk-test123456789')
    const saveButton = screen.getByRole('button', { name: 'Save' })
    await user.click(saveButton)

    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(saveButton).toBeDisabled()

    await waitFor(() => {
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
    })
  })

  it('handles save error gracefully', async () => {
    const consoleError = mockConsoleError()
    const { userSettingsDexieRepository } = await import(
      '@/repositories/userSettingsDexieRepository'
    )
    vi.mocked(userSettingsDexieRepository.set).mockRejectedValue(
      new Error('Failed to save setting'),
    )

    render(ProfileView)
    const user = await switchToAITab()

    await user.type(screen.getByLabelText('API key'), 'sk-test123456789')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
        AI_PROVIDER_SETTINGS_KEY,
        expect.any(String),
      )
    })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('displays help text with OpenAI link once the API key field is valid', async () => {
    render(ProfileView)
    const user = await switchToAITab()

    // The hint takes the slot of the validation error, so fill in a valid key
    // first so the error clears and the hint can render.
    await user.type(screen.getByLabelText('API key'), 'sk-test123456789')

    await waitFor(() => {
      expect(screen.getByText(/API keys are stored locally/)).toBeInTheDocument()
    })

    const aiPanel = screen.getByRole('tabpanel')
    const link = within(aiPanel).getByRole('link', { name: "OpenAI's website" })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://platform.openai.com/api-keys')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
