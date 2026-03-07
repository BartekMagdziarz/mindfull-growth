import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/vue'
import EntityIcon from '../EntityIcon.vue'

describe('EntityIcon', () => {
  it('renders catalog icon for known icon IDs', () => {
    const { container } = render(EntityIcon, {
      props: {
        icon: 'heart',
      },
    })

    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders legacy emoji fallback values', () => {
    const { getByText } = render(EntityIcon, {
      props: {
        icon: '💪',
      },
    })

    expect(getByText('💪')).toBeInTheDocument()
  })

  it('renders neutral dot fallback for unknown icon values', () => {
    const { container } = render(EntityIcon, {
      props: {
        icon: 'non-existent-id',
      },
    })

    const dot = container.querySelector('.rounded-full.bg-current\\/65')
    expect(dot).toBeTruthy()
  })
})
