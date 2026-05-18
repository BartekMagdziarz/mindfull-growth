import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import FoundationTile from '../FoundationTile.vue'
import type { FoundationItemStatus } from '@/services/foundationCompleteness'

function makeStatus(
  overrides: Partial<FoundationItemStatus> = {},
): FoundationItemStatus {
  return {
    id: 'valuesDiscovery',
    group: 'values',
    state: 'not-started',
    routeName: 'exercise-values',
    ...overrides,
  }
}

describe('FoundationTile', () => {
  it('renders the localized title and description', () => {
    render(FoundationTile, {
      props: {
        status: makeStatus(),
      },
    })

    expect(screen.getByText('Values discovery')).toBeInTheDocument()
    expect(screen.getByText('Who do you admire and why?')).toBeInTheDocument()
  })

  it('renders the pill label for each state', async () => {
    const { rerender } = render(FoundationTile, {
      props: {
        status: makeStatus({ state: 'not-started' }),
      },
    })

    expect(screen.getByText('Not started')).toBeInTheDocument()

    await rerender({ status: makeStatus({ state: 'in-progress' }) })
    expect(screen.getByText('In progress')).toBeInTheDocument()

    await rerender({
      status: makeStatus({
        state: 'completed',
        lastCompletedAt: '2026-04-10T00:00:00.000Z',
      }),
    })
    expect(screen.getByText('Completed')).toBeInTheDocument()

    await rerender({
      status: makeStatus({
        state: 'outdated',
        lastCompletedAt: '2025-08-10T00:00:00.000Z',
      }),
    })
    expect(screen.getByText('Refresh recommended')).toBeInTheDocument()
  })

  it('applies the amber border class for the outdated state', () => {
    render(FoundationTile, {
      props: {
        status: makeStatus({
          state: 'outdated',
          lastCompletedAt: '2025-08-10T00:00:00.000Z',
        }),
      },
    })

    expect(screen.getByRole('button', { name: 'Values discovery' })).toHaveClass(
      'border-amber-500/40',
    )
  })

  it('emits navigate with route name and params when clicked', async () => {
    const { emitted } = render(FoundationTile, {
      props: {
        status: makeStatus({
          id: 'vlq',
          routeName: 'exercise-assessment',
          routeParams: { assessmentId: 'vlq' },
        }),
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Valued living (VLQ)' }))

    expect(emitted().navigate).toEqual([
      [{ routeName: 'exercise-assessment', routeParams: { assessmentId: 'vlq' } }],
    ])
  })

  it('renders a formatted completion date line', () => {
    render(FoundationTile, {
      props: {
        status: makeStatus({
          state: 'completed',
          lastCompletedAt: '2026-04-10T00:00:00.000Z',
        }),
      },
    })

    expect(screen.getByTestId('foundation-date-line')).toHaveTextContent(
      'Completed Apr 10, 2026',
    )
  })
})
