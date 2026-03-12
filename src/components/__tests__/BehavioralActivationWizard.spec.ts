import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import BehavioralActivationWizard from '../exercises/BehavioralActivationWizard.vue'

describe('BehavioralActivationWizard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 12, 9, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('defaults week and activity planning to the monday of the current week', async () => {
    const { container } = render(BehavioralActivationWizard, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: {
            props: ['disabled', 'loading', 'variant'],
            template:
              '<button type="button" :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    const baselineDateInput = container.querySelector('input[type="date"]') as HTMLInputElement | null
    expect(baselineDateInput?.value).toBe('2026-03-09')

    await fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    const activityDateInput = container.querySelector('input[type="date"]') as HTMLInputElement | null
    expect(activityDateInput?.value).toBe('2026-03-09')
  })
})
