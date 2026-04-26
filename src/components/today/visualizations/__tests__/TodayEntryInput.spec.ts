import { describe, it, expect } from 'vitest'
import { fireEvent, render } from '@testing-library/vue'
import TodayEntryInput from '../TodayEntryInput.vue'

describe('TodayEntryInput', () => {
  it('counter shows + button and value', () => {
    const { getByText, getByLabelText } = render(TodayEntryInput, {
      props: { entryMode: 'counter', currentValue: 5 },
    })

    expect(getByLabelText('Increment')).toBeTruthy()
    expect(getByText('5')).toBeTruthy()
  })

  it('value mode shows input field', () => {
    const { container } = render(TodayEntryInput, {
      props: { entryMode: 'value', currentValue: 3.5 },
    })

    const input = container.querySelector('input[type="number"]')
    expect(input).toBeTruthy()
  })

  it('clears value entry when the number input is emptied and blurred', async () => {
    const { container, emitted } = render(TodayEntryInput, {
      props: { entryMode: 'value', currentValue: 3.5 },
    })

    const input = container.querySelector('input[type="number"]') as HTMLInputElement
    await fireEvent.update(input, '')
    await fireEvent.blur(input)

    expect(emitted()['clear-entry']).toBeTruthy()
    expect(emitted()['save-value']).toBeUndefined()
  })

  it('saves zero in value mode instead of clearing it', async () => {
    const { container, emitted } = render(TodayEntryInput, {
      props: { entryMode: 'value', currentValue: 3.5 },
    })

    const input = container.querySelector('input[type="number"]') as HTMLInputElement
    await fireEvent.update(input, '0')
    await fireEvent.blur(input)

    expect(emitted()['save-value']).toEqual([[0]])
    expect(emitted()['clear-entry']).toBeUndefined()
  })

  it('rating mode shows counter-style ± buttons', () => {
    const { getByLabelText, getByText } = render(TodayEntryInput, {
      props: { entryMode: 'rating', currentValue: 5, ratingMax: 10 },
    })

    expect(getByLabelText('Increment')).toBeTruthy()
    expect(getByLabelText('Decrement')).toBeTruthy()
    expect(getByText('5')).toBeTruthy()
  })

  it('completion mode renders nothing', () => {
    const { container } = render(TodayEntryInput, {
      props: { entryMode: 'completion', currentValue: 0 },
    })

    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('input')).toBeNull()
  })

  it('clears rating entry when decrement is clicked at ratingMin', async () => {
    const { getByLabelText, emitted } = render(TodayEntryInput, {
      props: { entryMode: 'rating', currentValue: 3, ratingMin: 3, ratingMax: 7 },
    })

    const dec = getByLabelText('Decrement') as HTMLButtonElement
    expect(dec.disabled).toBe(false)

    await fireEvent.click(dec)
    expect(emitted()['clear-entry']).toBeTruthy()
  })

  it('emits increment on + click', async () => {
    const { getByLabelText, emitted } = render(TodayEntryInput, {
      props: { entryMode: 'counter', currentValue: 3 },
    })

    await getByLabelText('Increment').click()
    expect(emitted().increment).toBeTruthy()
  })
})
