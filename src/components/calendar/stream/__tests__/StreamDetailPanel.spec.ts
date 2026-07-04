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

const WeekReviewSummaryStub = {
  name: 'WeekReviewSummary',
  template: `
    <div>
      <button data-testid="stub-week-reflection" @click="$emit('create-reflection')">reflect</button>
      <button data-testid="stub-week-plan" @click="$emit('create-plan')">plan</button>
    </div>
  `,
}

async function renderPanel(scale: 'month' | 'week', readyTestId: string) {
  const utils = render(StreamDetailPanel, {
    props: {
      scale,
      monthRef: '2026-06' as MonthRef,
      weekRef: '2026-W26' as WeekRef,
      todayRef: '2026-07-04' as DayRef,
    },
    global: {
      stubs: {
        MonthReviewSummary: MonthReviewSummaryStub,
        WeekReviewSummary: WeekReviewSummaryStub,
        PlanningStatePanel: true,
      },
    },
  })
  await waitFor(() => {
    expect(utils.getByTestId(readyTestId)).toBeInTheDocument()
  })
  return utils
}

const renderMonthPanel = () => renderPanel('month', 'stub-create-reflection')
const renderWeekPanel = () => renderPanel('week', 'stub-week-reflection')

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

  it('ignores month create-plan — planning lives in the month wizard, not a classic route', async () => {
    const { getByTestId, emitted } = await renderMonthPanel()

    // The month card no longer exposes a plan affordance; a stray create-plan
    // emit must neither route to the classic calendar nor open the wizard.
    getByTestId('stub-create-plan').click()

    expect(emitted()['open-month-wizard']).toBeFalsy()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('emits open-week-wizard for both week CTAs instead of routing', async () => {
    const { getByTestId, emitted } = await renderWeekPanel()

    getByTestId('stub-week-reflection').click()
    getByTestId('stub-week-plan').click()

    expect(emitted()['open-week-wizard']).toHaveLength(2)
    expect(pushMock).not.toHaveBeenCalled()
  })
})
