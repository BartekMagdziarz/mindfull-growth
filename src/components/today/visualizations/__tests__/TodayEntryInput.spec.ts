import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/vue'
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

  it('rating mode shows input field', () => {
    const { container } = render(TodayEntryInput, {
      props: { entryMode: 'rating', currentValue: 0 },
    })

    const input = container.querySelector('input[type="number"]')
    expect(input).toBeTruthy()
  })

  it('completion mode renders nothing', () => {
    const { container } = render(TodayEntryInput, {
      props: { entryMode: 'completion', currentValue: 0 },
    })

    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('input')).toBeNull()
  })

  it('emits increment on + click', async () => {
    const { getByLabelText, emitted } = render(TodayEntryInput, {
      props: { entryMode: 'counter', currentValue: 3 },
    })

    await getByLabelText('Increment').click()
    expect(emitted().increment).toBeTruthy()
  })
})
