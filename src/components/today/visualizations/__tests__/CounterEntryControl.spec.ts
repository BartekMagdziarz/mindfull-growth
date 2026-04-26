import { describe, it, expect } from 'vitest'
import { fireEvent, render } from '@testing-library/vue'
import CounterEntryControl from '../CounterEntryControl.vue'

describe('CounterEntryControl', () => {
  it('renders the current value and + button', () => {
    const { getByText, getByLabelText } = render(CounterEntryControl, {
      props: { currentValue: 5 },
    })

    expect(getByText('5')).toBeTruthy()
    expect(getByLabelText('Increment')).toBeTruthy()
  })

  it('renders 0 when currentValue is 0', () => {
    const { getByText } = render(CounterEntryControl, {
      props: { currentValue: 0 },
    })

    expect(getByText('0')).toBeTruthy()
  })

  it('emits increment when + is clicked', async () => {
    const { getByLabelText, emitted } = render(CounterEntryControl, {
      props: { currentValue: 3 },
    })

    await fireEvent.click(getByLabelText('Increment'))
    expect(emitted().increment).toBeTruthy()
  })

  it('clears the entry when decrement is clicked at zero', async () => {
    const { getByLabelText, emitted } = render(CounterEntryControl, {
      props: { currentValue: 0 },
    })

    const decrement = getByLabelText('Decrement') as HTMLButtonElement
    expect(decrement.disabled).toBe(false)

    await fireEvent.click(decrement)
    expect(emitted()['clear-entry']).toBeTruthy()
    expect(emitted().decrement).toBeFalsy()
  })

  it('disables decrement when there is no entry', () => {
    const { getByLabelText } = render(CounterEntryControl, {
      props: { currentValue: 0, hasEntry: false },
    })

    expect((getByLabelText('Decrement') as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables both buttons while pending', () => {
    const { getByLabelText, getByText } = render(CounterEntryControl, {
      props: { currentValue: 2, isPending: true },
    })

    expect((getByLabelText('Increment') as HTMLButtonElement).disabled).toBe(true)
    expect((getByText('2') as HTMLButtonElement).disabled).toBe(true)
  })

  it('opens inline edit when count is clicked and emits save-value on Enter', async () => {
    const { getByText, container, emitted } = render(CounterEntryControl, {
      props: { currentValue: 4 },
    })

    await fireEvent.click(getByText('4'))

    const input = container.querySelector('input[type="number"]') as HTMLInputElement
    expect(input).toBeTruthy()

    await fireEvent.update(input, '12')
    await fireEvent.keyDown(input, { key: 'Enter' })

    expect(emitted()['save-value']).toBeTruthy()
    expect(emitted()['save-value']![0]).toEqual([12])
  })

  it('emits save-value on blur when the value changed', async () => {
    const { getByText, container, emitted } = render(CounterEntryControl, {
      props: { currentValue: 4 },
    })

    await fireEvent.click(getByText('4'))

    const input = container.querySelector('input[type="number"]') as HTMLInputElement
    await fireEvent.update(input, '7')
    await fireEvent.blur(input)

    expect(emitted()['save-value']).toBeTruthy()
    expect(emitted()['save-value']![0]).toEqual([7])
  })

  it('closes edit without emitting when Escape is pressed', async () => {
    const { getByText, container, emitted } = render(CounterEntryControl, {
      props: { currentValue: 4 },
    })

    await fireEvent.click(getByText('4'))
    const input = container.querySelector('input[type="number"]') as HTMLInputElement
    await fireEvent.update(input, '9')
    await fireEvent.keyDown(input, { key: 'Escape' })

    expect(emitted()['save-value']).toBeFalsy()
  })
})
