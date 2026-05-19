import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/vue'
import InitiativeCheckmark from '../InitiativeCheckmark.vue'

describe('InitiativeCheckmark', () => {
  it('renders the chart-primary gradient state when complete', () => {
    const { container } = render(InitiativeCheckmark, {
      props: { isComplete: true },
    })

    const button = container.querySelector('button')!
    expect(button.className).toContain('initiative-check--on')
  })

  it('renders the neumorphic raised state when incomplete', () => {
    const { container } = render(InitiativeCheckmark, {
      props: { isComplete: false },
    })

    const button = container.querySelector('button')!
    expect(button.className).toContain('initiative-check--off')
  })

  it('uses white stroke when complete and subdued stroke when incomplete', () => {
    const { container: completeContainer } = render(InitiativeCheckmark, {
      props: { isComplete: true },
    })
    const completePath = completeContainer.querySelector('path')!
    expect(completePath.getAttribute('stroke')).toBe('white')
    expect(completePath.getAttribute('stroke-opacity')).toBe('1')

    const { container: incompleteContainer } = render(InitiativeCheckmark, {
      props: { isComplete: false },
    })
    const incompletePath = incompleteContainer.querySelector('path')!
    expect(incompletePath.getAttribute('stroke-opacity')).toBe('0.4')
  })

  it('emits toggle on click', async () => {
    const { container, emitted } = render(InitiativeCheckmark, {
      props: { isComplete: false },
    })

    await fireEvent.click(container.querySelector('button')!)
    expect(emitted().toggle).toBeTruthy()
  })

  it('renders day label when provided', () => {
    const { getByText } = render(InitiativeCheckmark, {
      props: { isComplete: false, dayLabel: 'Tu' },
    })

    expect(getByText('Tu')).toBeTruthy()
  })

  it('does not render day label when omitted', () => {
    const { container } = render(InitiativeCheckmark, {
      props: { isComplete: false },
    })

    const spans = container.querySelectorAll('span')
    expect(spans.length).toBe(0)
  })

  it('disables button when pending', () => {
    const { container } = render(InitiativeCheckmark, {
      props: { isComplete: false, isPending: true },
    })

    expect(container.querySelector('button')!.disabled).toBe(true)
  })
})
