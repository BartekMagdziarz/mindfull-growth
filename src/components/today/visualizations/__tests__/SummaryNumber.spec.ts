import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/vue'
import SummaryNumber from '../SummaryNumber.vue'
import type { TodaySummaryNumberData } from '@/services/todayChartData'

function makeData(overrides: Partial<TodaySummaryNumberData> = {}): TodaySummaryNumberData {
  return {
    value: 12,
    entryCount: 12,
    sublabelKind: 'days-logged',
    ...overrides,
  }
}

describe('SummaryNumber', () => {
  it('renders the value as the big number', () => {
    const { getByText } = render(SummaryNumber, {
      props: { data: makeData({ value: 17 }) },
    })

    expect(getByText('17')).toBeTruthy()
  })

  it('formats decimal values to one decimal place', () => {
    const { getByText } = render(SummaryNumber, {
      props: { data: makeData({ value: 8.4, entryCount: 5 }) },
    })

    expect(getByText('8.4')).toBeTruthy()
  })

  it('renders the days-logged sublabel', () => {
    const { getByText } = render(SummaryNumber, {
      props: {
        data: makeData({ value: 9, entryCount: 9, sublabelKind: 'days-logged' }),
      },
    })

    expect(getByText(/9\s+days\s+logged/i)).toBeTruthy()
  })

  it('renders the total-sum sublabel', () => {
    const { getByText } = render(SummaryNumber, {
      props: {
        data: makeData({ value: 450, entryCount: 22, sublabelKind: 'total-sum' }),
      },
    })

    expect(getByText(/450\s+total/i)).toBeTruthy()
  })

  it('renders the entries sublabel', () => {
    const { getByText } = render(SummaryNumber, {
      props: {
        data: makeData({ value: 5, entryCount: 5, sublabelKind: 'entries' }),
      },
    })

    expect(getByText(/5\s+entries/i)).toBeTruthy()
  })

  it('renders zero value without errors', () => {
    const { getByText } = render(SummaryNumber, {
      props: { data: makeData({ value: 0, entryCount: 0 }) },
    })

    expect(getByText('0')).toBeTruthy()
  })
})
