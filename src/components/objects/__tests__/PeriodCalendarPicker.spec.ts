import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/vue'
import PeriodCalendarPicker from '@/components/objects/PeriodCalendarPicker.vue'
import { getChildPeriods, getPeriodRefsForDate } from '@/utils/periods'
import { formatWeekRange } from '@/utils/periodLabels'

vi.mock('@/composables/useT', () => ({
  useT: () => ({ locale: { value: 'en' }, t: (key: string) => key.split('.').at(-1) }),
}))
const week = getPeriodRefsForDate('2026-09-07').week
function setup(commit?: (refs: string[]) => Promise<void>) {
  return render(PeriodCalendarPicker, { props: { cadence: 'weekly', modelValue: [week], commit } })
}

describe('PeriodCalendarPicker', () => {
  it('shows dates, keeps multiple selections open, and commits only on Done', async () => {
    const commit = vi.fn(async () => {})
    const view = setup(commit)
    await fireEvent.click(screen.getByRole('button', { name: /choose/ }))
    const nextWeek = getPeriodRefsForDate('2026-09-14').week
    await fireEvent.click(screen.getByRole('button', { name: formatWeekRange(nextWeek, 'en') }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(commit).not.toHaveBeenCalled()
    await fireEvent.click(screen.getByRole('button', { name: 'done' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(commit).toHaveBeenCalledWith([week, nextWeek])
    expect(view.emitted()['update:modelValue']).toEqual([[[week, nextWeek]]])
  })

  it('preserves a boundary week when navigating months and supports deselection', async () => {
    setup()
    await fireEvent.click(screen.getByRole('button', { name: /choose/ }))
    const boundary = getPeriodRefsForDate('2026-09-30').week
    await fireEvent.click(screen.getByRole('button', { name: formatWeekRange(boundary, 'en') }))
    await fireEvent.click(screen.getByRole('button', { name: 'next' }))
    const selected = screen.getByRole('button', { name: formatWeekRange(boundary, 'en') })
    expect(selected).toHaveAttribute('aria-pressed', 'true')
    await fireEvent.click(selected)
    expect(selected).toHaveAttribute('aria-pressed', 'false')
  })

  it('cancels staged changes with Escape and restores trigger focus', async () => {
    const view = setup()
    const trigger = screen.getByRole('button', { name: /choose/ })
    await fireEvent.click(trigger)
    await fireEvent.click(screen.getByRole('button', { name: 'clear' }))
    await fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(view.emitted()['update:modelValue']).toBeUndefined()
    expect(trigger).toHaveFocus()
  })

  it('keeps failed selections available for retry', async () => {
    const commit = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined)
    setup(commit)
    await fireEvent.click(screen.getByRole('button', { name: /choose/ }))
    await fireEvent.click(screen.getByRole('button', { name: 'selectVisible' }))
    await fireEvent.click(screen.getByRole('button', { name: 'done' }))
    await screen.findByRole('alert')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await fireEvent.click(screen.getByRole('button', { name: 'done' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(commit).toHaveBeenLastCalledWith(
      getChildPeriods(getPeriodRefsForDate('2026-09-01').month)
    )
  })

  it('selects a range across years in the month grid', async () => {
    const view = render(PeriodCalendarPicker, {
      props: { cadence: 'monthly', modelValue: ['2026-12'] },
    })
    await fireEvent.click(screen.getByRole('button', { name: /choose/ }))
    await fireEvent.click(screen.getByText('range', { selector: 'summary' }))
    await fireEvent.update(screen.getByLabelText('from'), '2026-12')
    await fireEvent.update(screen.getByLabelText('to'), '2027-02')
    await fireEvent.click(screen.getByRole('button', { name: 'addRange' }))
    await fireEvent.click(screen.getByRole('button', { name: 'done' }))
    expect(view.emitted()['update:modelValue']).toEqual([[['2026-12', '2027-01', '2027-02']]])
  })
})
