import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import KeyResultsEditor from '../KeyResultsEditor.vue'

describe('KeyResultsEditor', () => {
  it('renders selected type and cadence chips with a pressed state', () => {
    render(KeyResultsEditor, {
      props: {
        modelValue: [
          {
            id: 'kr-1',
            name: 'Run 5K',
            type: 'count',
            cadence: 'monthly',
          },
        ],
      },
    })

    const selectedType = screen.getByRole('button', { name: /count/i })
    const selectedCadence = screen.getByRole('button', { name: /monthly/i })
    const unselectedCadence = screen.getByRole('button', { name: /weekly/i })

    expect(selectedType).toHaveAttribute('aria-pressed', 'true')
    expect(selectedType).toHaveClass('shadow-neu-pressed', 'text-primary')
    expect(selectedCadence).toHaveAttribute('aria-pressed', 'true')
    expect(selectedCadence).toHaveClass('shadow-neu-pressed', 'text-primary')
    expect(unselectedCadence).toHaveAttribute('aria-pressed', 'false')
    expect(unselectedCadence).toHaveClass('shadow-neu-raised-sm', 'text-on-surface-variant')
  })

  it('updates the cadence chip state when a new option is selected', async () => {
    const { emitted } = render(KeyResultsEditor, {
      props: {
        modelValue: [
          {
            id: 'kr-1',
            name: 'Run 5K',
            type: 'count',
            cadence: 'monthly',
          },
        ],
      },
    })

    const weeklyButton = screen.getByRole('button', { name: /weekly/i })
    const monthlyButton = screen.getByRole('button', { name: /monthly/i })

    await fireEvent.click(weeklyButton)

    expect(weeklyButton).toHaveAttribute('aria-pressed', 'true')
    expect(weeklyButton).toHaveClass('shadow-neu-pressed', 'text-primary')
    expect(monthlyButton).toHaveAttribute('aria-pressed', 'false')

    const updates = emitted('update:modelValue') ?? []
    expect(updates).toHaveLength(1)
    expect(updates[0][0]).toEqual([
      expect.objectContaining({
        id: 'kr-1',
        cadence: 'weekly',
      }),
    ])
  })
})
