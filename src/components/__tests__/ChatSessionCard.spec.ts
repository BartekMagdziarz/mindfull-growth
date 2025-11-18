import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/vue'
import ChatSessionCard from '../ChatSessionCard.vue'
import type { ChatSession } from '@/domain/chatSession'

vi.mock('../AppCard.vue', () => ({
  default: {
    name: 'AppCard',
    template: '<div><slot /></div>',
  },
}))

vi.mock('../ChatIntentionBadge.vue', () => ({
  default: {
    name: 'ChatIntentionBadge',
    props: ['intention'],
    template: '<span data-testid="intention-badge">{{ intention }}</span>',
  },
}))

vi.mock('@/components/AppButton.vue', () => ({
  default: {
    name: 'AppButton',
    props: ['variant', 'ariaLabel'],
    template:
      '<button type="button" :aria-label="ariaLabel" @click="$emit(\'click\')"><slot /></button>',
  },
}))

vi.mock('@/utils/dateFormat', () => ({
  formatChatSessionDate: (timestamp: string) => `Formatted: ${timestamp}`,
}))

const createSession = (overrides: Partial<ChatSession> = {}): ChatSession => ({
  id: 'session-1',
  journalEntryId: 'entry-1',
  intention: 'reflect',
  createdAt: '2024-01-01T00:00:00.000Z',
  messages: [],
  ...overrides,
})

describe('ChatSessionCard', () => {
  it('renders intention badge and formatted createdAt', () => {
    const session = createSession()

    render(ChatSessionCard, {
      props: {
        chatSession: session,
      },
    })

    expect(screen.getByTestId('intention-badge')).toHaveTextContent('reflect')
    expect(screen.getByText(/Formatted:/)).toBeInTheDocument()
  })

  it('shows correct message count label for single message', () => {
    const session = createSession({
      messages: [
        {
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-01T10:00:00.000Z',
        },
      ],
    })

    render(ChatSessionCard, {
      props: {
        chatSession: session,
      },
    })

    expect(screen.getByText('1 message')).toBeInTheDocument()
  })

  it('shows correct message count label for multiple messages', () => {
    const session = createSession({
      messages: [
        {
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-01T10:00:00.000Z',
        },
        {
          role: 'assistant',
          content: 'Hi there',
          timestamp: '2024-01-01T10:01:00.000Z',
        },
      ],
    })

    render(ChatSessionCard, {
      props: {
        chatSession: session,
      },
    })

    expect(screen.getByText('2 messages')).toBeInTheDocument()
  })

  it('hides actions when showActions is false', () => {
    const session = createSession()

    render(ChatSessionCard, {
      props: {
        chatSession: session,
        showActions: false,
      },
    })

    expect(screen.queryByRole('button', { name: /view/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })
})


