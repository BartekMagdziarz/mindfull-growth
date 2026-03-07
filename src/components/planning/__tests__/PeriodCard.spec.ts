import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import PeriodCard from '../PeriodCard.vue'

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10)
}

describe('PeriodCard', () => {
  it('renders visible badge labels for action state', () => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - 1)
    const end = new Date(now)
    end.setDate(now.getDate() + 1)

    render(PeriodCard, {
      props: {
        type: 'weekly',
        startDate: toISO(start),
        endDate: toISO(end),
        hasPlan: false,
        hasReflection: false,
      },
    })

    expect(screen.getByText('Plan')).toBeVisible()
    expect(screen.getByText('Reflect')).toBeVisible()
  })

  it('renders visible badge labels for completed and expired states', () => {
    const completed = render(PeriodCard, {
      props: {
        type: 'monthly',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        hasPlan: true,
        hasReflection: true,
      },
    })

    expect(screen.getByText('Planned')).toBeVisible()
    expect(screen.getByText('Reflected')).toBeVisible()

    completed.unmount()

    render(PeriodCard, {
      props: {
        type: 'monthly',
        startDate: '2025-02-01',
        endDate: '2025-02-28',
        hasPlan: false,
        hasReflection: false,
      },
    })

    expect(screen.getByText('Plan Missed')).toBeVisible()
    expect(screen.getByText('Reflect')).toBeVisible()
  })

  it('emits select, plan, and reflect when action controls are used', async () => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - 1)
    const end = new Date(now)
    end.setDate(now.getDate() + 1)

    const { container, emitted } = render(PeriodCard, {
      props: {
        type: 'weekly',
        startDate: toISO(start),
        endDate: toISO(end),
        hasPlan: false,
        hasReflection: false,
      },
    })

    const card = container.querySelector('.period-card')
    expect(card).not.toBeNull()

    await fireEvent.click(card as Element)
    await fireEvent.click(screen.getByRole('button', { name: 'Plan' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Reflect' }))

    expect(emitted().select).toHaveLength(1)
    expect(emitted().plan).toHaveLength(1)
    expect(emitted().reflect).toHaveLength(1)
  })

  it('applies selected class when selected', async () => {
    const { container, rerender } = render(PeriodCard, {
      props: {
        type: 'monthly',
        startDate: '2025-03-01',
        endDate: '2025-03-31',
        hasPlan: true,
        hasReflection: false,
        isSelected: false,
      },
    })

    const getCard = () => container.querySelector('.period-card') as HTMLElement
    expect(getCard()).toBeTruthy()
    expect(getCard()).not.toHaveClass('period-card--selected')

    await rerender({
      type: 'monthly',
      startDate: '2025-03-01',
      endDate: '2025-03-31',
      hasPlan: true,
      hasReflection: false,
      isSelected: true,
    })

    expect(getCard()).toHaveClass('period-card--selected')
  })
})
