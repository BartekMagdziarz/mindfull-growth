import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/vue'
import ContextualNudgesCard from '@/components/today/ContextualNudgesCard.vue'

describe('ContextualNudgesCard', () => {
  const recommendations = [
    {
      id: 'ifs-daily-checkin',
      title: 'IFS Daily Check-In',
      description: 'Name parts and reset.',
      route: '/exercises/daily-checkin',
      modality: 'ifs' as const,
      tone: 'regulation' as const,
      whyNow: 'You logged anxious recently.',
      score: 1.2,
    },
  ]

  it('renders recommendation and emits open event', async () => {
    const { emitted } = render(ContextualNudgesCard, {
      props: { recommendations },
    })

    expect(screen.getByText('IFS Daily Check-In')).toBeInTheDocument()
    await fireEvent.click(screen.getByRole('button', { name: 'Open' }))

    expect(emitted().open).toEqual([['/exercises/daily-checkin', 'ifs-daily-checkin']])
  })

  it('emits feedback events', async () => {
    const { emitted } = render(ContextualNudgesCard, {
      props: { recommendations },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'More like this' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Less like this' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Not now' }))

    expect(emitted().feedback).toEqual([
      ['ifs-daily-checkin', 'more'],
      ['ifs-daily-checkin', 'less'],
      ['ifs-daily-checkin', 'not-now'],
    ])
  })
})
