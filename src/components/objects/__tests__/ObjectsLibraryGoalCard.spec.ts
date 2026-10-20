import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/vue'
import ObjectsLibraryGoalCard from '@/components/objects/ObjectsLibraryGoalCard.vue'
import type { ObjectsLibraryListItem } from '@/services/objectsLibraryQueries'

function goal(overrides: Partial<ObjectsLibraryListItem> = {}): ObjectsLibraryListItem {
  return {
    id: 'goal-1',
    panelType: 'goal',
    title: 'Training block',
    status: 'open',
    isActive: true,
    startDate: '2026-08-01',
    targetDate: '2026-10-03',
    ...overrides,
  }
}

function renderGoal(item = goal()) {
  return render(ObjectsLibraryGoalCard, {
    props: {
      item,
      linkedMonths: [],
      statusOptions: [
        { value: 'open', label: 'Open' },
        { value: 'completed', label: 'Completed' },
        { value: 'dropped', label: 'Dropped' },
      ],
      priorityOptions: [],
      lifeAreaOptions: [],
      expandedKrId: null,
      expandedKrPeriods: [],
      cadenceOptions: [],
      entryModeOptions: [],
      krStatusOptions: [],
      krTargetOperatorOptions: () => [],
      krTargetAggregationOptions: () => [],
      krShowTargetAggregation: () => false,
    },
    global: {
      stubs: {
        IconPicker: true,
        AppIcon: true,
        ObjectCardAffiliation: true,
        GoalLinksDropdown: true,
        GoalMonthsDropdown: true,
        GoalClosingSummary: true,
      },
    },
  })
}

describe('ObjectsLibraryGoalCard — timeline visibility', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-11T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the timeline and overdue hint for an active, open goal', () => {
    const { container, getByText } = renderGoal()
    expect(container.querySelector('.mg-v2-timeline--overdue')).not.toBeNull()
    expect(getByText(/8 days overdue/)).toBeInTheDocument()
  })

  it.each([
    { status: 'completed', isActive: true },
    { status: 'dropped', isActive: true },
    { status: 'open', isActive: false },
    { status: 'completed', isActive: false },
    { status: 'dropped', isActive: false },
  ])('hides the timeline for status=$status, isActive=$isActive even without a closing reflection', (state) => {
    const { container, queryByText } = renderGoal(goal(state))
    expect(container.querySelector('.mg-v2-timeline')).toBeNull()
    expect(queryByText(/overdue/)).not.toBeInTheDocument()
  })

  it('keeps the closing metadata, summary and month editing on a closed goal', async () => {
    const { container, getByText, getByRole } = renderGoal(goal({
      status: 'completed',
      goalClosingReflection: {
        closedAt: '2026-10-04',
        outcome: 'achieved',
        learned: 'A useful lesson',
        keyResults: [],
        window: { startDate: '2026-08-01', targetDate: '2026-10-03', weeksPlanned: 9 },
      },
    }))

    expect(getByText('Completed')).toBeInTheDocument()
    expect(getByText('achieved')).toBeInTheDocument()
    expect(container.querySelector('goal-closing-summary-stub')).not.toBeNull()
    expect(container.querySelector('.mg-v2-timeline')).toBeNull()
    await fireEvent.click(getByRole('button', { name: 'More actions' }))
    expect(getByRole('button', { name: /Goal months/ })).toBeInTheDocument()
  })

  it.each(['completed', 'dropped', 'archived'])('restores the live timeline after reopening or unarchiving a %s goal', async (state) => {
    const item = goal(state === 'archived' ? { isActive: false } : { status: state })
    const { container, rerender } = renderGoal(item)
    expect(container.querySelector('.mg-v2-timeline')).toBeNull()

    await rerender({ item: goal() })
    expect(container.querySelector('.mg-v2-timeline--overdue')).not.toBeNull()
  })
})
