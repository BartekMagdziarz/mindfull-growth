import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/vue'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import StreamDetailPanel from '../StreamDetailPanel.vue'

const pushMock = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('@/services/planningStateQueries', () => ({
  getMonthPlanningBundle: vi.fn().mockResolvedValue({
    monthPlan: undefined,
    rawEntries: [],
    goalItems: [],
    cadencedItems: [],
    trackerItems: [],
  }),
  getWeekPlanningBundle: vi.fn().mockResolvedValue({ weekPlan: undefined, rawEntries: [] }),
  getWeekReflectionBundle: vi.fn().mockResolvedValue({
    overlappingMonthRefs: [],
    relevant: { goalItems: [], measurementItems: [], cadencedItems: [], trackerItems: [], initiativeItems: [] },
  }),
}))

vi.mock('@/services/reflectionDataQueries', () => ({
  loadDayAssignmentsForMonths: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/services/weeklyIntentionService', () => ({
  listWeeklyIntentionsForMonth: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/components/calendar/objectItems', () => ({
  buildMonthObjectItems: vi.fn().mockReturnValue([]),
  buildWeekObjectItems: vi.fn().mockReturnValue([]),
  extractWeekIntentions: vi.fn().mockReturnValue([]),
}))

const MonthReviewSummaryStub = {
  name: 'MonthReviewSummary',
  template: `
    <div>
      <button data-testid="stub-create-reflection" @click="$emit('create-reflection')">reflect</button>
      <button data-testid="stub-create-plan" @click="$emit('create-plan')">plan</button>
    </div>
  `,
}

async function renderMonthPanel() {
  const utils = render(StreamDetailPanel, {
    props: {
      scale: 'month' as const,
      monthRef: '2026-06' as MonthRef,
      weekRef: '2026-W26' as WeekRef,
      todayRef: '2026-07-04' as DayRef,
    },
    global: {
      stubs: {
        MonthReviewSummary: MonthReviewSummaryStub,
        WeekReviewSummary: true,
        PlanningStatePanel: true,
      },
    },
  })
  await waitFor(() => {
    expect(utils.getByTestId('stub-create-reflection')).toBeInTheDocument()
  })
  return utils
}

describe('StreamDetailPanel', () => {
  beforeEach(() => {
    pushMock.mockClear()
  })

  it('emits open-month-wizard for the month reflection CTA instead of routing', async () => {
    const { getByTestId, emitted } = await renderMonthPanel()

    getByTestId('stub-create-reflection').click()

    expect(emitted()['open-month-wizard']).toBeTruthy()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('still routes month planning to the classic calendar view', async () => {
    const { getByTestId, emitted } = await renderMonthPanel()

    getByTestId('stub-create-plan').click()

    expect(emitted()['open-month-wizard']).toBeFalsy()
    expect(pushMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'calendar-month',
        params: { monthRef: '2026-06' },
        query: expect.objectContaining({ action: 'plan', origin: 'stream' }),
      }),
    )
  })
})
