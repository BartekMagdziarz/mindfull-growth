import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/vue'
import IconPicker from '../IconPicker.vue'

describe('IconPicker', () => {
  it('emits selected icon ID', async () => {
    const { emitted } = render(IconPicker, {
      props: {
        modelValue: undefined,
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select icon' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Heart' }))

    const updates = emitted('update:modelValue') || []
    expect(updates).toEqual([['heart']])
  })

  it('emits undefined when clearing selection', async () => {
    const { emitted } = render(IconPicker, {
      props: {
        modelValue: 'chart',
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select icon' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

    const updates = emitted('update:modelValue') || []
    expect(updates).toEqual([[undefined]])
  })

  it('filters icon options through text search', async () => {
    render(IconPicker, {
      props: {
        modelValue: undefined,
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select icon' }))
    await fireEvent.update(screen.getByRole('textbox', { name: 'Search icons' }), 'leaf')

    expect(screen.getByRole('button', { name: 'Leaf' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Heart' })).not.toBeInTheDocument()
  })
})
