import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/vue'
import ExerciseRatingStack from '../ExerciseRatingStack.vue'

const stubs = { AppIcon: { template: '<i />' } }

function mount(modelValue: number | null) {
  return render(ExerciseRatingStack, {
    props: { modelValue, minLabel: 'Barely', maxLabel: 'Very', ariaLabel: 'Strength' },
    global: { stubs },
  })
}

describe('ExerciseRatingStack', () => {
  it('starts empty: no bar checked, value blank, minus disabled', () => {
    const { container } = mount(null)
    expect(container.querySelectorAll('[role="radio"]')).toHaveLength(5)
    expect(container.querySelectorAll('[aria-checked="true"]')).toHaveLength(0)
    expect(container.querySelector('output')?.textContent?.trim()).toBe('')
    const [minus, plus] = Array.from(container.querySelectorAll<HTMLButtonElement>('.exercise-stack__step'))
    expect(minus!.disabled).toBe(true)
    expect(plus!.disabled).toBe(false)
  })

  it('fills from the bottom up to the picked bar and shows the value', () => {
    const { container } = mount(3)
    const bars = Array.from(container.querySelectorAll('[role="radio"]'))
    expect(bars.map((b) => b.classList.contains('is-filled'))).toEqual([true, true, true, false, false])
    expect(bars[2]!.getAttribute('aria-checked')).toBe('true')
    expect(container.querySelector('output')?.textContent?.trim()).toBe('3')
  })

  it('tapping the picked bar clears it; plus from empty starts at the minimum', async () => {
    const picked = mount(3)
    await fireEvent.click(picked.container.querySelector('[aria-label="3"]')!)
    expect(picked.emitted()['update:modelValue']?.[0]).toEqual([null])
    const empty = mount(null)
    const plus = empty.container.querySelectorAll('.exercise-stack__step')[1]!
    await fireEvent.click(plus)
    expect(empty.emitted()['update:modelValue']?.[0]).toEqual([1])
  })

  it('arrow keys step the value and stepping below the minimum empties the stack', async () => {
    const { container, emitted } = mount(1)
    const group = container.querySelector('[role="radiogroup"]')!
    await fireEvent.keyDown(group, { key: 'ArrowUp' })
    expect(emitted()['update:modelValue']?.[0]).toEqual([2])
    await fireEvent.keyDown(group, { key: 'ArrowDown' })
    expect(emitted()['update:modelValue']?.[1]).toEqual([null])
  })
})
