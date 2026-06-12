import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import PlanExecutionSection, { type PlanExecutionRing } from '../PlanExecutionSection.vue'

function buildRings(
  goals: [number, number],
  habits: [number, number],
  trackers: [number, number],
): PlanExecutionRing[] {
  return [
    { key: 'goals', label: 'Goals', numerator: goals[0], denominator: goals[1] },
    { key: 'habits', label: 'Habits', numerator: habits[0], denominator: habits[1] },
    { key: 'trackers', label: 'Trackers', numerator: trackers[0], denominator: trackers[1] },
  ]
}

const populatedRings = buildRings([2, 4], [3, 5], [7, 10])

describe('PlanExecutionSection', () => {
  it('shows the create-plan CTA in the empty state and emits create-plan when clicked', async () => {
    const { emitted } = render(PlanExecutionSection, {
      props: { hasPlan: false, hasObjects: false, rings: buildRings([0, 0], [0, 0], [0, 0]) },
    })

    const cta = screen.getByRole('button', { name: /create plan/i })
    expect(cta).toBeInTheDocument()
    await fireEvent.click(cta)
    expect(emitted()['create-plan']).toBeTruthy()
  })

  it('does not render ring labels in the empty state', () => {
    render(PlanExecutionSection, {
      props: { hasPlan: false, hasObjects: false, rings: populatedRings },
    })

    expect(screen.queryByText('Goals')).not.toBeInTheDocument()
    expect(screen.queryByText('Habits')).not.toBeInTheDocument()
    expect(screen.queryByText('Trackers')).not.toBeInTheDocument()
  })

  it('renders three rings with numerator/denominator and labels when populated', () => {
    render(PlanExecutionSection, {
      props: { hasPlan: true, hasObjects: true, rings: populatedRings },
    })

    expect(screen.getByText('Goals')).toBeInTheDocument()
    expect(screen.getByText('Habits')).toBeInTheDocument()
    expect(screen.getByText('Trackers')).toBeInTheDocument()
    expect(screen.getByText('2/4')).toBeInTheDocument()
    expect(screen.getByText('3/5')).toBeInTheDocument()
    expect(screen.getByText('7/10')).toBeInTheDocument()
  })

  it('emits edit-plan when the edit affordance is clicked', async () => {
    const { emitted } = render(PlanExecutionSection, {
      props: { hasPlan: true, hasObjects: true, rings: populatedRings },
    })

    const editButton = screen.getByRole('button', { name: /edit plan/i })
    await fireEvent.click(editButton)
    expect(emitted()['edit-plan']).toBeTruthy()
  })

  it('shows the no-objects message when the plan exists but no objects are in scope', () => {
    render(PlanExecutionSection, {
      props: { hasPlan: true, hasObjects: false, rings: buildRings([0, 0], [0, 0], [0, 0]) },
    })

    expect(screen.getByText(/Plan created — add objects in the planner/)).toBeInTheDocument()
    expect(screen.queryByText('Goals')).not.toBeInTheDocument()
  })

  it('shows em-dash inside the ring when the denominator is zero', () => {
    render(PlanExecutionSection, {
      props: { hasPlan: true, hasObjects: true, rings: buildRings([1, 2], [0, 0], [0, 0]) },
    })

    expect(screen.getByText('1/2')).toBeInTheDocument()
    // Habits (0/0) and Trackers (0/0) both fall back to em-dash.
    expect(screen.getAllByText('—').length).toBe(2)
  })

  it('hides the create and edit affordances when showActions is false', () => {
    render(PlanExecutionSection, {
      props: { hasPlan: false, hasObjects: false, rings: populatedRings, showActions: false },
    })

    expect(screen.queryByRole('button', { name: /create plan/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit plan/i })).not.toBeInTheDocument()
    // The explanatory description still renders without the CTA.
    expect(screen.getByText(/Create a plan to see/)).toBeInTheDocument()
  })
})
