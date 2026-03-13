import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import ObjectsLibraryPillSelect from '@/components/objects/ObjectsLibraryPillSelect.vue'

const options = [
  { id: 'la-1', label: 'Health & Fitness' },
  { id: 'la-2', label: 'Career & Work' },
  { id: 'la-3', label: 'Finances' },
]

function renderPillSelect(modelValue: string[] = []) {
  return render(ObjectsLibraryPillSelect, {
    props: {
      modelValue,
      options,
      label: 'Life areas',
      emptyLabel: 'None',
      clearLabel: 'Clear',
      addLabel: 'Add',
    },
  })
}

describe('ObjectsLibraryPillSelect', () => {
  it('renders selected items as pills', () => {
    renderPillSelect(['la-1', 'la-3'])

    expect(screen.getByText('Health & Fitness')).toBeInTheDocument()
    expect(screen.getByText('Finances')).toBeInTheDocument()
    expect(screen.queryByText('Career & Work')).not.toBeInTheDocument()
  })

  it('opens dropdown on add button click', async () => {
    renderPillSelect()

    expect(screen.queryByText('Career & Work')).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('Health & Fitness')).toBeInTheDocument()
    expect(screen.getByText('Career & Work')).toBeInTheDocument()
    expect(screen.getByText('Finances')).toBeInTheDocument()
  })

  it('emits update when checking an option in the dropdown', async () => {
    const { emitted } = renderPillSelect(['la-1'])

    await fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Career & Work' }))

    expect(emitted()['update:modelValue']).toEqual([
      [['la-1', 'la-2']],
    ])
  })

  it('emits update when unchecking an option in the dropdown', async () => {
    const { emitted } = renderPillSelect(['la-1', 'la-2'])

    await fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Health & Fitness' }))

    expect(emitted()['update:modelValue']).toEqual([
      [['la-2']],
    ])
  })

  it('emits update when removing a pill via X button', async () => {
    const { emitted } = renderPillSelect(['la-1', 'la-3'])

    const pills = screen.getByText('Health & Fitness').closest('span')!
    const removeButton = pills.querySelector('button')!
    await fireEvent.click(removeButton)

    expect(emitted()['update:modelValue']).toEqual([
      [['la-3']],
    ])
  })

  it('clears all selections when clear button is clicked', async () => {
    const { emitted } = renderPillSelect(['la-1', 'la-2'])

    await fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(emitted()['update:modelValue']).toEqual([
      [[]],
    ])
  })
})
