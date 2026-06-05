import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import AIPlaygroundView from '../AIPlaygroundView.vue'
import type { LLMDiagnostics } from '@/services/llmService'

const mockPush = vi.fn()
const mockSendMessage = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/services/llmService', () => ({
  getAIProviderSettings: vi.fn().mockResolvedValue({
    provider: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'gemma4:e4b',
    reasoningEffort: 'low',
  }),
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
  snapshotLLMDiagnostics: (value: LLMDiagnostics) =>
    JSON.parse(JSON.stringify(value)) as LLMDiagnostics,
}))

const diagnostics: LLMDiagnostics = {
  provider: 'ollama',
  model: 'gemma4:e4b',
  reasoningEffort: 'low',
  timing: {
    connectionMs: 20,
    firstChunkMs: 40,
    reasoningStartMs: 45,
    reasoningDurationMs: 500,
    firstContentMs: 545,
    generationMs: 200,
    totalMs: 745,
  },
  observed: {
    reasoningChunks: 3,
    reasoningCharacters: 120,
    contentChunks: 2,
    contentCharacters: 12,
  },
  usage: {
    prompt_tokens: 10,
    completion_tokens: 12,
    total_tokens: 22,
    completion_tokens_details: { reasoning_tokens: 5 },
  },
  rawMetadata: { id: 'test-run' },
}

describe('AIPlaygroundView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('streams a response and shows provider diagnostics', async () => {
    mockSendMessage.mockImplementation(
      async (
        _messages: unknown,
        _systemPrompt: unknown,
        options: {
          onToken?: (token: string) => void
          onDiagnostics?: (value: LLMDiagnostics) => void
        },
      ) => {
        options.onToken?.('Streamed ')
        options.onDiagnostics?.(diagnostics)
        options.onToken?.('answer')
        return 'Streamed answer'
      },
    )

    render(AIPlaygroundView)
    const user = userEvent.setup()

    await screen.findByDisplayValue('gemma4:e4b')
    await user.click(screen.getByRole('button', { name: 'Run test' }))

    expect(await screen.findByText('Streamed answer')).toBeInTheDocument()
    expect(screen.getAllByText('500 ms')).toHaveLength(2)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('35.0 tok/s')).toBeInTheDocument()
    expect(screen.getByText(/test-run/)).toBeInTheDocument()
    expect(screen.queryByText(/structuredClone/)).not.toBeInTheDocument()
    expect(screen.getAllByText('low').length).toBeGreaterThan(0)
  })

  it('passes playground reasoning and generation settings to the service', async () => {
    mockSendMessage.mockResolvedValue('Answer')
    render(AIPlaygroundView)
    const user = userEvent.setup()

    await screen.findByDisplayValue('gemma4:e4b')
    await user.selectOptions(screen.getByLabelText('Reasoning effort'), 'high')
    await user.clear(screen.getByLabelText('Answer token budget'))
    await user.type(screen.getByLabelText('Answer token budget'), '450')
    await user.click(screen.getByRole('button', { name: 'Run test' }))

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalled()
    })
    expect(mockSendMessage.mock.calls[0][2]).toMatchObject({
      model: 'gemma4:e4b',
      reasoningEffort: 'high',
      maxTokens: 450,
      temperature: 0.7,
    })
  })
})
