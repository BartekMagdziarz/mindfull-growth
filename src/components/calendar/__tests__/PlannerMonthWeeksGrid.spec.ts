import { describe, expect, it } from 'vitest'
import { fireEvent, render, within } from '@testing-library/vue'
import PlannerMonthWeeksGrid from '../PlannerMonthWeeksGrid.vue'
import type { WeekRef } from '@/domain/period'
import type {
  PlannerMeasurementRow,
  PlannerMonthWeekRow,
  PlannerWeekTargetSummary,
} from '../plannerTypes'

function makeAssignmentRow(overrides: Partial<PlannerMeasurementRow> = {}): PlannerMeasurementRow {
  return {
    id: 'habit-1',
    title: 'Strength training',
    subjectType: 'habit',
    cadence: 'monthly',
    target: { kind: 'count', operator: 'min', value: 12 },
    isActive: true,
    weekScopeByRef: {},
    weekTargetOverrideByRef: {},
    scheduledDayRefs: [],
    ...overrides,
  }
}

function makeWeekRow(
  weekRef: string,
  overrides: Partial<PlannerMonthWeekRow> = {}
): PlannerMonthWeekRow {
  return {
    weekRef: weekRef as WeekRef,
    label: weekRef.slice(6),
    rangeLabel: '9–15 mar',
    isBoundary: false,
    chips: [],
    isAssignedInWeek: false,
    viaWholeMonth: false,
    canEditTarget: false,
    ...overrides,
  }
}

const WEEKS = ['2026-W10', '2026-W11', '2026-W12', '2026-W13']

function renderGrid(options: {
  assignmentRow?: PlannerMeasurementRow
  weekRows?: PlannerMonthWeekRow[]
  weekTargetSummary?: PlannerWeekTargetSummary | null
  canDistribute?: boolean
} = {}) {
  return render(PlannerMonthWeeksGrid, {
    props: {
      weekRows: options.weekRows ?? WEEKS.map(weekRef => makeWeekRow(weekRef)),
      assignmentRow: options.assignmentRow,
      weekTargetSummary: options.weekTargetSummary ?? null,
      canDistribute: options.canDistribute ?? false,
      canToggleWeek: Boolean(options.assignmentRow),
    },
  })
}

describe('PlannerMonthWeeksGrid', () => {
  it('renders one static row per week and no click targets in idle mode', () => {
    const { container } = renderGrid()

    for (const weekRef of WEEKS) {
      expect(
        container.querySelector(`[data-testid="monthly-planner-week-${weekRef}"]`)
      ).toBeTruthy()
    }
    expect(container.querySelectorAll('button')).toHaveLength(0)
  })

  it('emits weekToggle for the clicked week in assignment mode', async () => {
    const { container, emitted } = renderGrid({ assignmentRow: makeAssignmentRow() })

    const week = container.querySelector('[data-testid="monthly-planner-week-2026-W11"]')
    expect(week?.tagName).toBe('BUTTON')
    await fireEvent.click(week!)

    expect(emitted().weekToggle).toEqual([['2026-W11']])
  })

  it('renders the day badge as a non-interactive summary', () => {
    const { container } = renderGrid({
      assignmentRow: makeAssignmentRow(),
      weekRows: WEEKS.map((weekRef, index) =>
        makeWeekRow(weekRef, index === 0
          ? { isAssignedInWeek: true, assignmentScope: 'specific-days', dayBadge: { count: 2, days: 'wt, czw' } }
          : {})
      ),
    })

    const badge = container.querySelector('[data-testid="monthly-planner-day-badge-2026-W10"]')
    expect(badge?.tagName).toBe('SPAN')
    expect(badge?.textContent).toContain('wt, czw')
  })

  it('shows the target pill only on weeks that allow editing', () => {
    const { container } = renderGrid({
      assignmentRow: makeAssignmentRow(),
      weekRows: WEEKS.map((weekRef, index) =>
        makeWeekRow(weekRef, index < 2
          ? {
              isAssignedInWeek: true,
              assignmentScope: 'whole-week',
              canEditTarget: true,
              effectiveTarget: { kind: 'count', operator: 'min', value: 3 },
              weekTargetOverride:
                index === 0 ? { kind: 'count', operator: 'min', value: 3 } : undefined,
            }
          : {})
      ),
    })

    expect(container.querySelector('[data-testid="monthly-planner-week-target-2026-W10"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="monthly-planner-week-target-2026-W11"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="monthly-planner-week-target-2026-W12"]')).toBeNull()
  })

  it('emits weekTargetChange from the pill input and weekTargetClear from its clear button', async () => {
    const { container, emitted } = renderGrid({
      assignmentRow: makeAssignmentRow(),
      weekRows: WEEKS.map((weekRef, index) =>
        makeWeekRow(weekRef, index === 0
          ? {
              isAssignedInWeek: true,
              assignmentScope: 'whole-week',
              canEditTarget: true,
              effectiveTarget: { kind: 'count', operator: 'min', value: 3 },
              weekTargetOverride: { kind: 'count', operator: 'min', value: 3 },
            }
          : {})
      ),
    })

    const pill = within(
      container.querySelector<HTMLElement>('[data-testid="monthly-planner-week-target-2026-W10"]')!
    )
    const input = pill.getByRole('spinbutton')
    await fireEvent.update(input, '5')
    await fireEvent.change(input)
    expect(emitted().weekTargetChange).toEqual([['2026-W10', 5]])

    const clear = pill.getByRole('button')
    await fireEvent.click(clear)
    expect(emitted().weekTargetClear).toEqual([['2026-W10']])
  })

  it('renders the soft sum indicator and the distribute action', async () => {
    const { container, emitted, rerender } = renderGrid({
      assignmentRow: makeAssignmentRow(),
      weekTargetSummary: { assigned: 10, total: 12 },
      canDistribute: true,
    })

    const sum = container.querySelector('[data-testid="monthly-planner-target-sum"]')
    expect(sum?.textContent).toContain('10')
    expect(sum?.textContent).toContain('12')
    expect(sum?.textContent).not.toContain('✓')

    await fireEvent.click(
      container.querySelector('[data-testid="monthly-planner-distribute"]')!
    )
    expect(emitted().distributeEvenly).toBeTruthy()

    await rerender({ weekTargetSummary: { assigned: 12, total: 12 } })
    expect(
      container.querySelector('[data-testid="monthly-planner-target-sum"]')?.textContent
    ).toContain('✓')
  })
})
