import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/vue'
import AppButton from '../AppButton.vue'

describe('AppButton', () => {
  it('renders correctly', () => {
    const { getByRole } = render(AppButton, {
      slots: {
        default: 'Click me',
      },
    })

    const button = getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Click me')
  })

  it('applies filled variant by default', () => {
    const { getByRole } = render(AppButton, {
      slots: {
        default: 'Button',
      },
    })

    const button = getByRole('button')
    expect(button).toHaveClass('bg-gradient-to-br', 'from-primary', 'to-primary-strong', 'text-on-primary')
  })

  it('applies outlined variant when specified', () => {
    const { getByRole } = render(AppButton, {
      props: {
        variant: 'outlined',
      },
      slots: {
        default: 'Button',
      },
    })

    const button = getByRole('button')
    expect(button).toHaveClass('border', 'bg-transparent', 'text-primary')
  })
})
