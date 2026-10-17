import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/vue'
import ExerciseStepWhy from '../ExerciseStepWhy.vue'

const stubs = { AppIcon: { template: '<i />' } }

describe('ExerciseStepWhy', () => {
  it('renders nothing without text', () => {
    const { container } = render(ExerciseStepWhy, { props: { text: '' }, global: { stubs } })
    expect(container.querySelector('.exercise-step-why')).toBeNull()
  })

  it('folds the why into a details block by default', () => {
    const { container } = render(ExerciseStepWhy, { props: { text: 'Because.' }, global: { stubs } })
    expect(container.querySelector('details.exercise-step-why')).not.toBeNull()
    expect(container.querySelector('.exercise-step-why__disc')).toBeNull()
  })

  it('disc: a "?" button toggles a floating note, Escape closes it, a new text folds it again', async () => {
    const { container, rerender } = render(ExerciseStepWhy, {
      props: { text: 'Because.', variant: 'disc' },
      global: { stubs },
    })
    const disc = container.querySelector<HTMLButtonElement>('.exercise-step-why__disc')!
    expect(disc.getAttribute('aria-expanded')).toBe('false')
    expect(container.querySelector('[data-testid="step-why-note"]')).toBeNull()
    await fireEvent.click(disc)
    expect(disc.getAttribute('aria-expanded')).toBe('true')
    expect(container.querySelector('[data-testid="step-why-note"]')?.textContent).toBe('Because.')
    await fireEvent.keyDown(disc, { key: 'Escape' })
    expect(container.querySelector('[data-testid="step-why-note"]')).toBeNull()
    await fireEvent.click(disc)
    await rerender({ text: 'Another step.', variant: 'disc' })
    expect(container.querySelector('[data-testid="step-why-note"]')).toBeNull()
  })

  it('disc: a pointer down outside closes the note', async () => {
    const { container } = render(ExerciseStepWhy, {
      props: { text: 'Because.', variant: 'disc' },
      global: { stubs },
    })
    await fireEvent.click(container.querySelector('.exercise-step-why__disc')!)
    expect(container.querySelector('[data-testid="step-why-note"]')).not.toBeNull()
    await fireEvent.pointerDown(document.body)
    expect(container.querySelector('[data-testid="step-why-note"]')).toBeNull()
  })
})
