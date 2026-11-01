import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/vue'
import DsRatingStack from '../DsRatingStack.vue'

const stubs = { AppIcon: { template: '<i />' } }

function mount(modelValue: number | null, extra: Record<string, unknown> = {}) {
  return render(DsRatingStack, {
    props: { modelValue, lowLabel: 'Barely', highLabel: 'Very', label: 'Strength', ...extra },
    global: { stubs },
  })
}

describe('DsRatingStack', () => {
  it('starts empty: no cloud checked, value blank, minus disabled', () => {
    const { container } = mount(null)
    expect(container.querySelectorAll('[role="radio"]')).toHaveLength(5)
    expect(container.querySelectorAll('[aria-checked="true"]')).toHaveLength(0)
    expect(container.querySelector('output')?.textContent?.trim()).toBe('')
    const [minus, plus] = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.ds-rating__step')
    )
    expect(minus!.disabled).toBe(true)
    expect(plus!.disabled).toBe(false)
    expect(minus!.getAttribute('aria-label')).toBe('Zmniejsz: Strength')
  })

  it('fills from the bottom up to the picked cloud and shows the value', () => {
    const { container } = mount(3)
    const bars = Array.from(container.querySelectorAll('[role="radio"]'))
    expect(bars.map(b => b.classList.contains('is-filled'))).toEqual([
      true,
      true,
      true,
      false,
      false,
    ])
    expect(bars[2]!.getAttribute('aria-checked')).toBe('true')
    expect(container.querySelector('output')?.textContent?.trim()).toBe('3')
  })

  it('tapping the picked cloud clears it; plus from empty starts at the minimum', async () => {
    const picked = mount(3)
    await fireEvent.click(picked.container.querySelector('[aria-label="3"]')!)
    expect(picked.emitted()['update:modelValue']?.[0]).toEqual([null])
    const empty = mount(null)
    const plus = empty.container.querySelectorAll('.ds-rating__step')[1]!
    await fireEvent.click(plus)
    expect(empty.emitted()['update:modelValue']?.[0]).toEqual([1])
  })

  it('arrow keys step the value and stepping below the minimum empties the stack', async () => {
    const { container, emitted } = mount(1)
    const group = container.querySelector('[role="radiogroup"]')!
    expect(group.getAttribute('aria-label')).toBe('Strength')
    await fireEvent.keyDown(group, { key: 'ArrowUp' })
    expect(emitted()['update:modelValue']?.[0]).toEqual([2])
    await fireEvent.keyDown(group, { key: 'ArrowDown' })
    expect(emitted()['update:modelValue']?.[1]).toEqual([null])
  })

  it('respects a shorter scale and draws the ghost only while there is no value', () => {
    const short = mount(null, { min: 1, max: 3, ghost: 2, ghostLabel: 'Last week' })
    const radios = Array.from(short.container.querySelectorAll('[role="radio"]'))
    expect(radios).toHaveLength(3)
    expect(radios.map(r => r.classList.contains('is-ghost'))).toEqual([true, true, false])
    expect(radios[1]!.getAttribute('title')).toBe('Last week: 2')
    const rated = mount(1, { max: 3, ghost: 2 })
    expect(rated.container.querySelectorAll('.is-ghost')).toHaveLength(0)
  })

  it('marks the quiet variant used inside ritual cards', () => {
    const { container } = mount(null, { quiet: true })
    expect(container.querySelector('.ds-rating')?.classList.contains('ds-rating--quiet')).toBe(true)
  })
})
