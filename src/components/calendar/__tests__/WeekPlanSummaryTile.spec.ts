import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import WeekPlanSummaryTile from '../WeekPlanSummaryTile.vue'
import type { WeekPlanSummary } from '@/services/weeklyPlanSummary'

const emptySummary: WeekPlanSummary = {
  keyResults: { total: 0, met: 0 },
  habits: { total: 0, met: 0 },
  trackers: { total: 0, assignedDays: 0, filledDays: 0 },
}

const populatedSummary: WeekPlanSummary = {
  keyResults: { total: 4, met: 2 },
  habits: { total: 5, met: 3 },
  trackers: { total: 2, assignedDays: 10, filledDays: 7 },
}

describe('WeekPlanSummaryTile', () => {
  it('shows the create-plan CTA in the empty state and emits create-plan when clicked', async () => {
    const { emitted } = render(WeekPlanSummaryTile, {
      props: { hasPlan: false, summary: emptySummary },
    })

    const cta = screen.getByRole('button', { name: /create plan/i })
    expect(cta).toBeInTheDocument()
    await fireEvent.click(cta)
    expect(emitted()['create-plan']).toBeTruthy()
  })

  it('does not render ring labels in the empty state', () => {
    render(WeekPlanSummaryTile, {
      props: { hasPlan: false, summary: emptySummary },
    })

    expect(screen.queryByText('Goals')).not.toBeInTheDocument()
    expect(screen.queryByText('Habits')).not.toBeInTheDocument()
    expect(screen.queryByText('Trackers')).not.toBeInTheDocument()
  })

  it('renders three rings with numerator/denominator and labels when populated', () => {
    render(WeekPlanSummaryTile, {
      props: { hasPlan: true, summary: populatedSummary },
    })

    expect(screen.getByText('Goals')).toBeInTheDocument()
    expect(screen.getByText('Habits')).toBeInTheDocument()
    expect(screen.getByText('Trackers')).toBeInTheDocument()
    expect(screen.getByText('2/4')).toBeInTheDocument()
    expect(screen.getByText('3/5')).toBeInTheDocument()
    expect(screen.getByText('7/10')).toBeInTheDocument()
  })

  it('emits edit-plan when the edit affordance is clicked', async () => {
    const { emitted } = render(WeekPlanSummaryTile, {
      props: { hasPlan: true, summary: populatedSummary },
    })

    const editButton = screen.getByRole('button', { name: /edit plan/i })
    await fireEvent.click(editButton)
    expect(emitted()['edit-plan']).toBeTruthy()
  })

  it('shows the no-objects message when the plan exists but no objects are in scope', () => {
    render(WeekPlanSummaryTile, {
      props: { hasPlan: true, summary: emptySummary },
    })

    expect(screen.getByText(/Plan created — add objects in the planner/)).toBeInTheDocument()
    expect(screen.queryByText('Goals')).not.toBeInTheDocument()
  })

  it('shows em-dash inside the ring when the denominator is zero', () => {
    const summary: WeekPlanSummary = {
      keyResults: { total: 2, met: 1 },
      habits: { total: 0, met: 0 },
      trackers: { total: 1, assignedDays: 0, filledDays: 0 },
    }
    render(WeekPlanSummaryTile, {
      props: { hasPlan: true, summary },
    })

    expect(screen.getByText('1/2')).toBeInTheDocument()
    // Habits (0/0) and Trackers (0/0 days) both fall back to em-dash.
    expect(screen.getAllByText('—').length).toBe(2)
  })
})
