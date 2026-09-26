import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import ExerciseStepper from '../exercises/ExerciseStepper.vue'

describe('ExerciseStepper navigation', () => {
  it('allows returning to a completed step but prevents skipping ahead', async () => {
    const { emitted } = render(ExerciseStepper, {
      props: { labels: ['Start', 'Practice', 'Review'], current: 1 },
    })
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toBeEnabled()
    expect(buttons[1]).toBeDisabled()
    expect(buttons[1]).toHaveAttribute('aria-current', 'step')
    expect(buttons[2]).toBeDisabled()
    await fireEvent.click(buttons[0])
    expect(emitted().go).toEqual([[0]])
  })

  it('does not offer navigation for informational progress indicators', async () => {
    const { emitted } = render(ExerciseStepper, {
      props: { labels: ['Start', 'Practice'], current: 1, interactive: false },
    })
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled()
      await fireEvent.click(button)
    }
    expect(emitted().go).toBeUndefined()
  })
})
