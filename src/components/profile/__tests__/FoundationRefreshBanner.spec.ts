import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import FoundationRefreshBanner from '../FoundationRefreshBanner.vue'

describe('FoundationRefreshBanner', () => {
  it('renders title, body and calls to action', () => {
    render(FoundationRefreshBanner, {
      props: {
        outdatedCount: 2,
      },
    })

    expect(
      screen.getByText('Some foundation data is over 6 months old'),
    ).toBeInTheDocument()
    expect(screen.getByText(/2 foundation item/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open foundation' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remind me in 30 days' }),
    ).toBeInTheDocument()
  })

  it('emits open from the primary action', async () => {
    const { emitted } = render(FoundationRefreshBanner, {
      props: {
        outdatedCount: 2,
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Open foundation' }))

    expect(emitted().open).toHaveLength(1)
  })

  it('emits dismiss from the secondary action', async () => {
    const { emitted } = render(FoundationRefreshBanner, {
      props: {
        outdatedCount: 2,
      },
    })

    await fireEvent.click(
      screen.getByRole('button', { name: 'Remind me in 30 days' }),
    )

    expect(emitted().dismiss).toHaveLength(1)
  })
})
