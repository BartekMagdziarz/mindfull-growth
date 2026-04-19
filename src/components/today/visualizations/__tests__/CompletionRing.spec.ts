import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/vue'
import CompletionRing from '../CompletionRing.vue'

const RADIUS = 44
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

describe('CompletionRing', () => {
  it('renders the done count and target denominator in the center', () => {
    const { getByText, getByRole } = render(CompletionRing, {
      props: {
        doneCount: 12,
        targetCount: 15,
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
      },
    })

    const progress = container.querySelector('.completion-ring__progress')
    const [filled] = (progress?.getAttribute('stroke-dasharray') ?? '0 0')
      .split(' ')
      .map(Number)

    expect(filled).toBeCloseTo(CIRCUMFERENCE * 0.8, 4)
  })

  it('always renders as a non-interactive div', () => {
    const { queryByRole } = render(CompletionRing, {
      props: {
        doneCount: 3,
        targetCount: 8,
      },
    })

    expect(queryByRole('button')).toBeNull()
  })

  it('caps overflow at a full ring', () => {
    const { container } = render(CompletionRing, {
      props: {
        doneCount: 12,
        targetCount: 8,
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
})
