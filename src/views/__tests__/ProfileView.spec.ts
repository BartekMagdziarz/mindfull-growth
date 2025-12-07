import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import ProfileView from '../ProfileView.vue'

// Mock the user settings repository
vi.mock('@/repositories/userSettingsDexieRepository', () => {
  return {
    userSettingsDexieRepository: {
      get: vi.fn(),
      set: vi.fn(),
    },
  }
})

// Mock AppSnackbar component
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

describe('ProfileView', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { userSettingsDexieRepository } = await import(
      '@/repositories/userSettingsDexieRepository'
    )
    vi.mocked(userSettingsDexieRepository.get).mockResolvedValue(undefined)
    vi.mocked(userSettingsDexieRepository.set).mockResolvedValue(undefined)
  })

  it('renders the profile view with AI Settings section', () => {
    render(ProfileView)

    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('AI Settings')).toBeInTheDocument()
    expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument()
    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('loads existing API key on mount', async () => {
    const existingKey = 'sk-test123456789'
    const { userSettingsDexieRepository } = await import(
      '@/repositories/userSettingsDexieRepository'
    )
    vi.mocked(userSettingsDexieRepository.get).mockResolvedValue(existingKey)

    render(ProfileView)

    await waitFor(() => {
      const input = screen.getByLabelText('OpenAI API Key') as HTMLInputElement
      expect(input.value).toBe(existingKey)
    })
  })

  it('validates API key format in real-time', async () => {
    const user = userEvent.setup()
    render(ProfileView)

    const input = screen.getByLabelText('OpenAI API Key') as HTMLInputElement

    // Type invalid key (doesn't start with sk-)
    await user.type(input, 'invalid-key')
    await waitFor(() => {
      expect(screen.getByText("API key must start with 'sk-'")).toBeInTheDocument()
    })

    // Clear and type valid key
    await user.clear(input)
    await user.type(input, 'sk-valid123456789')
    await waitFor(() => {
      expect(screen.queryByText("API key must start with 'sk-'")).not.toBeInTheDocument()
    })
  })

  it('disables save button when input is empty', () => {
    render(ProfileView)

    const saveButton = screen.getByRole('button', { name: 'Save' })
    expect(saveButton).toBeDisabled()
  })

  it('disables save button when API key is invalid', async () => {
    const user = userEvent.setup()
    render(ProfileView)

    const input = screen.getByLabelText('OpenAI API Key')
    const saveButton = screen.getByRole('button', { name: 'Save' })

    await user.type(input, 'invalid-key')
    await waitFor(() => {
      expect(saveButton).toBeDisabled()
    })
  })

  it('enables save button when API key is valid', async () => {
    const user = userEvent.setup()
    render(ProfileView)

    const input = screen.getByLabelText('OpenAI API Key')
    const saveButton = screen.getByRole('button', { name: 'Save' })

    await user.type(input, 'sk-valid123456789')
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled()
    })
  })

  it('saves API key successfully', async () => {
    const user = userEvent.setup()
    const { userSettingsDexieRepository } = await import(
      '@/repositories/userSettingsDexieRepository'
    )
    vi.mocked(userSettingsDexieRepository.set).mockResolvedValue(undefined)

    render(ProfileView)

    const input = screen.getByLabelText('OpenAI API Key')
    const saveButton = screen.getByRole('button', { name: 'Save' })

    await user.type(input, 'sk-test123456789')
    await user.click(saveButton)

    await waitFor(() => {
      expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
        'openaiApiKey',
        'sk-test123456789'
      )
    })
  })

  it('shows loading state while saving', async () => {
    const user = userEvent.setup()
    const { userSettingsDexieRepository } = await import(
      '@/repositories/userSettingsDexieRepository'
    )
    // Delay the mock to allow loading state to show
    vi.mocked(userSettingsDexieRepository.set).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )

    render(ProfileView)

    const input = screen.getByLabelText('OpenAI API Key')
    const saveButton = screen.getByRole('button', { name: 'Save' })

    await user.type(input, 'sk-test123456789')
    await user.click(saveButton)

    // Check for loading text
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(saveButton).toBeDisabled()

    await waitFor(() => {
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
    })
  })

  it('handles save error gracefully', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Failed to save setting'
    const { userSettingsDexieRepository } = await import(
      '@/repositories/userSettingsDexieRepository'
    )
    vi.mocked(userSettingsDexieRepository.set).mockRejectedValue(
      new Error(errorMessage)
    )

    render(ProfileView)

    const input = screen.getByLabelText('OpenAI API Key')
    const saveButton = screen.getByRole('button', { name: 'Save' })

    await user.type(input, 'sk-test123456789')
    await user.click(saveButton)

    await waitFor(() => {
      expect(userSettingsDexieRepository.set).toHaveBeenCalled()
    })

    // Error should be logged but snackbar is mocked, so we just verify the call was made
    expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
      'openaiApiKey',
      'sk-test123456789'
    )
  })

  it('trims whitespace from API key before saving', async () => {
    const user = userEvent.setup()
    const { userSettingsDexieRepository } = await import(
      '@/repositories/userSettingsDexieRepository'
    )
    render(ProfileView)

    const input = screen.getByLabelText('OpenAI API Key')
    const saveButton = screen.getByRole('button', { name: 'Save' })

    await user.type(input, '  sk-test123456789  ')
    await user.click(saveButton)

    await waitFor(() => {
      expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
        'openaiApiKey',
        'sk-test123456789'
      )
    })
  })

  it('displays help text with OpenAI link', () => {
    render(ProfileView)

    const helpText = screen.getByText(/Your API key is stored locally/)
    expect(helpText).toBeInTheDocument()

    const link = screen.getByRole('link', { name: "OpenAI's website" })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://platform.openai.com/api-keys')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('does not show error message when input is empty', async () => {
    const user = userEvent.setup()
    render(ProfileView)

    const input = screen.getByLabelText('OpenAI API Key')

    // Type and then clear
    await user.type(input, 'invalid')
    await user.clear(input)

    await waitFor(() => {
      expect(screen.queryByText("API key must start with 'sk-'")).not.toBeInTheDocument()
    })
  })

  it('applies error styling when validation fails', async () => {
    const user = userEvent.setup()
    render(ProfileView)

    const input = screen.getByLabelText('OpenAI API Key') as HTMLInputElement

    await user.type(input, 'invalid-key')

    await waitFor(() => {
      // Check for error border class (border-error)
      expect(input.className).toContain('border-error')
    })
  })
})

