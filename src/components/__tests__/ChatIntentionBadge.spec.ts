import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/vue'
import ChatIntentionBadge from '../ChatIntentionBadge.vue'
import { CHAT_INTENTIONS } from '@/domain/chatSession'

describe('ChatIntentionBadge', () => {
  it('renders correct label for each standard intention', () => {
    const cases: Array<{ value: string; label: string }> = [
      { value: CHAT_INTENTIONS.REFLECT, label: 'Reflect' },
      {
        value: CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY,
        label: 'Help see differently',
      },
      {
        value: CHAT_INTENTIONS.PROACTIVE,
        label: 'Help to be proactive',
      },
      {
        value: CHAT_INTENTIONS.THINKING_TRAPS,
        label: 'Thinking traps',
      },
    ]

    for (const { value, label } of cases) {
      const { unmount } = render(ChatIntentionBadge, {
        props: {
          intention: value,
        },
      })

      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    }
  })

  it('renders "Custom" label for custom intention', () => {
    render(ChatIntentionBadge, {
      props: {
        intention: CHAT_INTENTIONS.CUSTOM,
      },
    })

    expect(screen.getByText('Custom')).toBeInTheDocument()
  })
})


