import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/vue'
import ModeSwitcher from '@/components/today/ModeSwitcher.vue'

describe('ModeSwitcher', () => {
  it('renders auto mode description with effective mode', () => {
    render(ModeSwitcher, {
      props: {
        modelValue: 'auto',
        effectiveMode: 'morning',
      },
    })

    expect(screen.getByText(/automatically adapting/i)).toBeInTheDocument()
    expect(screen.getByText('Auto')).toBeInTheDocument()
  })

  it('emits update when mode option is clicked', async () => {
    const { emitted } = render(ModeSwitcher, {
      props: {
        modelValue: 'auto',
        effectiveMode: 'midday',
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Evening' }))

    expect(emitted()['update:modelValue']).toEqual([['evening']])
  })
})
