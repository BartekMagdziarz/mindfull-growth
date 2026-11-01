import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/vue'
import ObjectsPeriodSelect from '@/components/objects/ObjectsPeriodSelect.vue'
import type { PeriodRef } from '@/domain/period'

const labels = {
  label: 'Period',
  clearLabel: 'Clear period',
  yearHint: 'Click the year to select the whole year',
  previousLabel: 'Previous year',
  nextLabel: 'Next year',
  weekLabel: 'wk',
}

function renderSelect(modelValue?: PeriodRef) {
  return render(ObjectsPeriodSelect, { props: { ...labels, modelValue } })
}

const year = String(new Date().getFullYear())

describe('ObjectsPeriodSelect', () => {
  it('shows the quiet label when nothing is selected and no clear button', () => {
    renderSelect()
    expect(screen.getByRole('button', { name: 'Period' })).toHaveTextContent('Period')
    expect(screen.queryByRole('button', { name: 'Clear period' })).not.toBeInTheDocument()
  })

  it('opens a year/month dialog and emits a month ref', async () => {
    const { emitted } = renderSelect()
    await fireEvent.click(screen.getByRole('button', { name: 'Period' }))
    const dialog = screen.getByRole('dialog', { name: 'Period' })
    expect(within(dialog).getAllByRole('button')).toHaveLength(12 + 3)

    await fireEvent.click(within(dialog).getByRole('button', { name: `March ${year}` }))
    expect(emitted()['update:modelValue']).toEqual([[`${year}-03`]])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('selects the whole year from the heading and toggles it off on a second click', async () => {
    const { emitted, rerender } = renderSelect()
    await fireEvent.click(screen.getByRole('button', { name: 'Period' }))
    await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: year }))
    expect(emitted()['update:modelValue']).toEqual([[year]])

    await rerender({ ...labels, modelValue: year as PeriodRef })
    await fireEvent.click(screen.getByRole('button', { name: 'Period' }))
    const heading = within(screen.getByRole('dialog')).getByRole('button', { name: year })
    expect(heading).toHaveAttribute('aria-pressed', 'true')
    await fireEvent.click(heading)
    expect(emitted()['update:modelValue'][1]).toEqual([undefined])
  })

  it('renders the selected month in the chip and clears from the × button', async () => {
    const { emitted } = renderSelect(`${year}-03` as PeriodRef)
    expect(screen.getByRole('button', { name: 'Period' })).toHaveTextContent(`Mar ${year}`)
    await fireEvent.click(screen.getByRole('button', { name: 'Clear period' }))
    expect(emitted()['update:modelValue']).toEqual([[undefined]])
  })

  it('shows a week ref from the URL as-is instead of hiding it', () => {
    renderSelect(`${year}-W10` as PeriodRef)
    expect(screen.getByRole('button', { name: 'Period' })).toHaveTextContent('wk 10')
  })

  it('closes on Escape', async () => {
    renderSelect()
    await fireEvent.click(screen.getByRole('button', { name: 'Period' }))
    await fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
