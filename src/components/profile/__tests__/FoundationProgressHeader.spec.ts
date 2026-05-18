import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import FoundationProgressHeader from '../FoundationProgressHeader.vue'

describe('FoundationProgressHeader', () => {
  it('renders progress text with interpolation', () => {
    render(FoundationProgressHeader, {
      props: {
        done: 2,
        total: 10,
        buildEnabled: false,
      },
    })

    expect(screen.getByText('2 of 10 complete')).toBeInTheDocument()
  })

  it('disables the build button and shows the floor when build is not enabled', () => {
    render(FoundationProgressHeader, {
      props: {
        done: 2,
        total: 10,
        buildEnabled: false,
      },
    })

    const button = screen.getByRole('button', {
      name: 'Complete at least 3 foundation items first',
    })
    expect(button).toBeDisabled()
  })

  it('emits build when the enabled button is clicked', async () => {
    const { emitted } = render(FoundationProgressHeader, {
      props: {
        done: 3,
        total: 10,
        buildEnabled: true,
      },
    })

    await fireEvent.click(
      screen.getByRole('button', { name: 'Build my first profile' }),
    )

    expect(emitted().build).toHaveLength(1)
  })
})
