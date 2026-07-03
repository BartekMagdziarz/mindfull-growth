import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/vue'
import PriorityLinkPicker from '@/components/calendar/PriorityLinkPicker.vue'
import type { WeekPlanPriorityOption } from '@/components/calendar/weekPlanCandidate'

const OPTIONS: WeekPlanPriorityOption[] = [
  { id: 'p1', title: 'Career' },
  { id: 'p2', title: 'Health' },
]

function renderPicker(modelValue: string[] = []) {
  return render(PriorityLinkPicker, { props: { options: OPTIONS, modelValue } })
}

describe('PriorityLinkPicker', () => {
  it('renders nothing when there are no options', () => {
    const { container } = render(PriorityLinkPicker, {
      props: { options: [], modelValue: [] },
    })
    expect(container.querySelector('[role="checkbox"]')).toBeNull()
  })

  it('marks the selected priorities as checked', () => {
    const { container } = renderPicker(['p2'])
    const boxes = container.querySelectorAll('[role="checkbox"]')
    expect(boxes).toHaveLength(2)
    expect(boxes[0].getAttribute('aria-checked')).toBe('false')
    expect(boxes[1].getAttribute('aria-checked')).toBe('true')
  })

  it('adds a priority to the selection on click', async () => {
    const { getByText, emitted } = renderPicker([])
    await fireEvent.click(getByText('Career'))
    const updates = emitted()['update:modelValue'] as unknown[][]
    expect(updates.at(-1)?.[0]).toEqual(['p1'])
  })

  it('removes an already-selected priority on click', async () => {
    const { getByText, emitted } = renderPicker(['p1', 'p2'])
    await fireEvent.click(getByText('Career'))
    const updates = emitted()['update:modelValue'] as unknown[][]
    expect(updates.at(-1)?.[0]).toEqual(['p2'])
  })
})
