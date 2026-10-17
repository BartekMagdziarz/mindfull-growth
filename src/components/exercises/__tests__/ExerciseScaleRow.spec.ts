import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/vue'
import ExerciseScaleRow from '../ExerciseScaleRow.vue'

describe('ExerciseScaleRow', () => {
  it('spreads one grid column per value so the tiles share the row', () => {
    const { container } = render(ExerciseScaleRow, {
      props: { modelValue: 5, min: 0, max: 10, minLabel: 'Calm', maxLabel: 'Out of control' },
    })
    expect(container.querySelector<HTMLElement>('.exercise-scale')!.style.getPropertyValue('--scale-n')).toBe('11')
    expect(container.querySelectorAll('[role="radio"]')).toHaveLength(11)
    expect(container.querySelector('.exercise-scale__ends')?.textContent).toContain('Calm')
  })

  it('arrow keys move the value within the bounds', async () => {
    const { container, emitted } = render(ExerciseScaleRow, { props: { modelValue: 5, min: 1, max: 5 } })
    const row = container.querySelector('.exercise-scale__row')!
    await fireEvent.keyDown(row, { key: 'ArrowRight' })
    expect(emitted()['update:modelValue']).toBeUndefined()
    await fireEvent.keyDown(row, { key: 'ArrowLeft' })
    expect(emitted()['update:modelValue']?.[0]).toEqual([4])
  })
})
