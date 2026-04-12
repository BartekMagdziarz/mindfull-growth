import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/vue'
import CompletionRing from '../CompletionRing.vue'

const RADIUS = 32
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

describe('CompletionRing', () => {
  it('renders the done count and target denominator in the center', () => {
    const { getByText, getByRole } = render(CompletionRing, {
      props: {
        doneCount: 12,
        targetCount: 15,
        hasTodayEntry: false,
        canToggleToday: true,
      },
    })

    expect(getByText('12')).toBeTruthy()
    expect(getByText('/ 15')).toBeTruthy()
    expect(getByRole('img', { name: '12 of 15 completed' })).toBeTruthy()
  })

  it('sets the progress arc dasharray from the done/total ratio', () => {
    const { container } = render(CompletionRing, {
      props: {
        doneCount: 12,
        targetCount: 15,
        hasTodayEntry: false,
        canToggleToday: false,
      },
    })

    const progress = container.querySelector('.completion-ring__progress')
    const [filled] = (progress?.getAttribute('stroke-dasharray') ?? '0 0')
      .split(' ')
      .map(Number)

    expect(filled).toBeCloseTo(CIRCUMFERENCE * 0.8, 4)
  })

  it('renders a button and emits toggle when today can be toggled', async () => {
    const { emitted, getByRole } = render(CompletionRing, {
      props: {
        doneCount: 3,
        targetCount: 8,
        hasTodayEntry: false,
        canToggleToday: true,
      },
    })

    await fireEvent.click(getByRole('button', { name: 'Record today' }))

    expect(emitted().toggle).toBeTruthy()
  })

  it('renders a static wrapper when today cannot be toggled', () => {
    const { queryByRole } = render(CompletionRing, {
      props: {
        doneCount: 3,
        targetCount: 8,
        hasTodayEntry: false,
        canToggleToday: false,
      },
    })

    expect(queryByRole('button')).toBeNull()
  })

  it('caps overflow at a full ring', () => {
    const { container } = render(CompletionRing, {
      props: {
        doneCount: 12,
        targetCount: 8,
        hasTodayEntry: true,
        canToggleToday: false,
      },
    })

    const progress = container.querySelector('.completion-ring__progress')
    const [filled] = (progress?.getAttribute('stroke-dasharray') ?? '0 0')
      .split(' ')
      .map(Number)

    expect(filled).toBeCloseTo(CIRCUMFERENCE, 4)
  })

  it('renders a full arc and shows exact met count for 15/15', () => {
    const { getByText, container } = render(CompletionRing, {
      props: {
        doneCount: 15,
        targetCount: 15,
        hasTodayEntry: true,
        canToggleToday: false,
      },
    })

    expect(getByText('15')).toBeTruthy()
    expect(getByText('/ 15')).toBeTruthy()

    const progress = container.querySelector('.completion-ring__progress')
    const [filled] = (progress?.getAttribute('stroke-dasharray') ?? '0 0')
      .split(' ')
      .map(Number)
    expect(filled).toBeCloseTo(CIRCUMFERENCE, 4)
  })

  it('renders a non-interactive wrapper when canToggleToday is false', () => {
    const { queryByRole, getByRole } = render(CompletionRing, {
      props: {
        doneCount: 5,
        targetCount: 10,
        hasTodayEntry: false,
        canToggleToday: false,
      },
    })

    expect(queryByRole('button')).toBeNull()
    expect(getByRole('img', { name: '5 of 10 completed' })).toBeTruthy()
  })
})
