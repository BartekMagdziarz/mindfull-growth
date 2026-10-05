import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Goal, KeyResult } from '@/domain/planning'
import type { GoalClosingSnapshot } from '@/services/goalClosingService'

const closeGoal = vi.fn()
const buildGoalClosingSnapshot = vi.fn()
const moveGoalTargetDate = vi.fn(async (_goalId: string, _targetDate: string) => undefined)
vi.mock('@/services/goalClosingService', () => ({
  buildGoalClosingSnapshot: (goalId: string) => buildGoalClosingSnapshot(goalId),
  closeGoal: (goalId: string, draft: unknown, snapshot?: unknown) => closeGoal(goalId, draft, snapshot),
}))
vi.mock('@/services/planningMutations', () => ({
  moveGoalTargetDate: (goalId: string, targetDate: string) => moveGoalTargetDate(goalId, targetDate),
}))

import GoalClosingRitual from '../GoalClosingRitual.vue'

function goalFixture(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g-1',
    createdAt: '2026-03-12T10:00:00.000Z',
    updatedAt: '2026-03-12T10:00:00.000Z',
    title: 'Blok treningowy',
    isActive: true,
    status: 'open',
    priorityIds: ['p-1'],
    lifeAreaIds: [],
    startDate: '2026-03-12',
    targetDate: '2026-09-30',
    successDefinition: 'Trzy treningi tygodniowo',
    confidenceRating: 8,
    obstacles: 'Sezon urlopowy',
    resources: 'siłownia obok pracy',
    ...overrides,
  }
}

const keyResult: KeyResult = {
  id: 'kr-1',
  createdAt: 'x',
  updatedAt: 'x',
  title: '3 treningi w tygodniu',
  isActive: true,
  status: 'open',
  goalId: 'g-1',
  cadence: 'weekly',
  entryMode: 'completion',
  target: { kind: 'count', operator: 'min', value: 3 },
}

// Weeks 36–39 of 2026 (Mon 7 Sep … Sun 4 Oct; weeks count from the year's first Monday):
// week 39 straddles September and October.
const WEEKS = ['2026-W36', '2026-W37', '2026-W38', '2026-W39'] as GoalClosingSnapshot['weeks']

function snapshotFixture(goal: Goal, withKeyResults = true): GoalClosingSnapshot {
  return {
    goal,
    keyResults: withKeyResults ? [keyResult] : [],
    months: ['2026-07', '2026-08', '2026-09'] as GoalClosingSnapshot['months'],
    weeks: WEEKS,
    weeksPlanned: 4,
    keyResultSnapshots: withKeyResults
      ? [
          {
            id: 'kr-1',
            title: keyResult.title,
            entryMode: 'completion',
            cadence: 'weekly',
            evaluation: 'met',
            monthsMet: 0,
            monthsPlanned: 0,
            months: [],
            weeksMet: 2,
            weeksPlanned: 3,
            weeks: [
              { weekRef: WEEKS[0], state: 'met' },
              { weekRef: WEEKS[1], state: 'missed' },
              { weekRef: WEEKS[2], state: 'met' },
              { weekRef: WEEKS[3], state: 'ongoing' },
            ],
            lastReadout: '2/3 tyg.',
          },
          {
            id: 'kr-2',
            title: 'Rozciąganie',
            entryMode: 'completion',
            cadence: 'weekly',
            evaluation: 'missed',
            monthsMet: 0,
            monthsPlanned: 0,
            months: [],
            weeksMet: 0,
            weeksPlanned: 3,
            weeks: [
              { weekRef: WEEKS[0], state: 'missed' },
              { weekRef: WEEKS[1], state: 'unplanned' },
              { weekRef: WEEKS[2], state: 'no-data' },
              { weekRef: WEEKS[3], state: 'missed' },
            ],
          },
        ]
      : [],
  }
}

async function mountRitual(goal = goalFixture(), props: Record<string, unknown> = {}) {
  buildGoalClosingSnapshot.mockResolvedValue(snapshotFixture(goal, props.withKeyResults !== false))
  const wrapper = mount(GoalClosingRitual, { props: { goalId: goal.id, ...props }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

async function next(wrapper: ReturnType<typeof mount>) {
  await wrapper.find('.qr-arrow--next').trigger('click')
  await flushPromises()
}

beforeEach(() => {
  setActivePinia(createPinia())
  closeGoal.mockReset()
  closeGoal.mockImplementation(async (goalId: string, draft: { outcome: string }) => ({
    goal: goalFixture({ id: goalId, status: draft.outcome === 'abandoned' ? 'dropped' : 'completed' }),
    createdHabits: [],
  }))
  buildGoalClosingSnapshot.mockReset()
  moveGoalTargetDate.mockClear()
})

describe('GoalClosingRitual', () => {
  it('has four steps for a goal with creation fields and pre-selects the suggested outcome', async () => {
    const wrapper = await mountRitual()
    expect(wrapper.findAll('.qr-progress button')).toHaveLength(4)
    expect(wrapper.find('h1').text()).toBe('Jak skończył się ten cel?')
    // one met + one missed key result → partial
    const selected = wrapper.find('.qr-choice.selected')
    expect(selected.text()).toContain('Częściowo')
    expect(selected.text()).toContain('podpowiedź')
    // weekly key results: one table on the week axis, never collapsed into months
    expect(wrapper.findAll('.gc-table')).toHaveLength(1)
    expect(wrapper.find('.gc-table--weekly').exists()).toBe(true)
    expect(wrapper.findAll('.gc-table-row')).toHaveLength(2)
    const dots = wrapper.findAll('.gc-table-row').at(0)!.findAll('.gc-dot')
    expect(dots.map((dot) => dot.classes().find((name) => name.startsWith('gc-dot--')))).toEqual([
      'gc-dot--met', 'gc-dot--missed', 'gc-dot--met', 'gc-dot--ongoing',
    ])
    // month label only where a month starts (by the week's Monday)
    const headers = wrapper.findAll('.gc-table-head [role="columnheader"]').map((cell) => cell.text())
    expect(headers.slice(1, -1)).toEqual(['wrz', '', '', ''])
    expect(wrapper.find('.gc-table-head [role="columnheader"]:nth-child(5)').attributes('title')).toContain('Tydzień 39')
    expect(wrapper.text()).toContain('2/3 tyg.')
    // the second key result was not assigned to week 37: an empty cell in the same column
    const second = wrapper.findAll('.gc-table-row').at(1)!.findAll('.gc-cell')
    expect(second.map((cell) => cell.find('.gc-dot').exists())).toEqual([true, false, true, true])
    wrapper.unmount()
  })

  it('drops weeks no key result was assigned to from the shared axis', async () => {
    const goal = goalFixture()
    const snapshot = snapshotFixture(goal)
    snapshot.keyResultSnapshots[0].weeks![1] = { weekRef: WEEKS[1], state: 'unplanned' }
    buildGoalClosingSnapshot.mockResolvedValue(snapshot)
    const wrapper = mount(GoalClosingRitual, { props: { goalId: goal.id }, attachTo: document.body })
    await flushPromises()
    const titles = wrapper.findAll('.gc-table-head [role="columnheader"]').slice(1, -1).map((cell) => cell.attributes('title'))
    expect(titles).toHaveLength(3)
    expect(titles.join(' ')).not.toContain('Tydzień 37')
    for (const row of wrapper.findAll('.gc-table-row')) {
      expect(row.findAll('.gc-cell')).toHaveLength(3)
    }
    wrapper.unmount()
  })

  it('splits mixed cadences into a weekly and a monthly table', async () => {
    const goal = goalFixture()
    const snapshot = snapshotFixture(goal)
    snapshot.keyResultSnapshots[1] = {
      id: 'kr-2',
      title: 'Waga',
      entryMode: 'value',
      cadence: 'monthly',
      evaluation: 'met',
      monthsMet: 2,
      monthsPlanned: 3,
      months: [
        { monthRef: '2026-07', state: 'met' },
        { monthRef: '2026-08', state: 'missed' },
        { monthRef: '2026-09', state: 'met' },
      ],
      lastReadout: '78',
    }
    buildGoalClosingSnapshot.mockResolvedValue(snapshot)
    const wrapper = mount(GoalClosingRitual, { props: { goalId: goal.id }, attachTo: document.body })
    await flushPromises()
    const weekly = wrapper.find('.gc-table--weekly')
    const monthly = wrapper.find('.gc-table--monthly')
    expect(weekly.text()).toContain('Rezultat tygodniowy')
    expect(weekly.findAll('.gc-table-row .gc-dot')).toHaveLength(4)
    expect(monthly.text()).toContain('Rezultat miesięczny')
    expect(monthly.findAll('.gc-table-row .gc-dot')).toHaveLength(3)
    expect(monthly.findAll('.gc-table-head [role="columnheader"]').map((cell) => cell.text()).slice(1, -1)).toEqual([
      'lip', 'sie', 'wrz',
    ])
    wrapper.unmount()
  })

  it('skips the mirror step when the goal was created without the mirrored fields', async () => {
    const wrapper = await mountRitual(
      goalFixture({ successDefinition: undefined, confidenceRating: undefined, obstacles: undefined }),
    )
    expect(wrapper.findAll('.qr-progress button')).toHaveLength(3)
    await next(wrapper)
    expect(wrapper.find('h1').text()).toBe('Co z tego zostaje?')
    wrapper.unmount()
  })

  it('mirrors the creation answers and writes the full draft on „Zamknij cel”', async () => {
    const wrapper = await mountRitual()
    await next(wrapper)
    expect(wrapper.find('h1').text()).toMatch(/^Co powiedział/)
    expect(wrapper.text()).toContain('Trzy treningi tygodniowo')
    expect(wrapper.text()).toContain('Pewność na starcie · 8/10')
    expect(wrapper.text()).toContain('Sezon urlopowy')

    await wrapper.findAll('.gc-seg button').at(1)!.trigger('click') // Częściowo
    await wrapper.findAll('.gc-scale button').at(5)!.trigger('click') // 6/10
    expect(wrapper.find('.gc-scale small').text()).toBe('wtedy 8 · dziś 6')

    await next(wrapper)
    expect(wrapper.text()).toContain('siłownia obok pracy')
    const areas = wrapper.findAll('.gc-field textarea')
    await areas.at(2)!.setValue('  Mniej, ale regularnie.  ')

    await next(wrapper)
    await wrapper.findAll('.gc-choices .qr-choice-pick').at(0)!.trigger('click') // Zostaje nawyk
    await wrapper.find('.gc-sub-row input').setValue(true)
    await wrapper.find('.qr-primary').trigger('click')
    await flushPromises()

    expect(closeGoal).toHaveBeenCalledTimes(1)
    const [goalId, draft, snapshot] = closeGoal.mock.calls[0]
    expect(goalId).toBe('g-1')
    expect(draft).toMatchObject({
      outcome: 'partial',
      successMet: 'partly',
      confidenceInHindsight: 6,
      learned: 'Mniej, ale regularnie.',
      followUp: { kind: 'habit' },
      habitFromKeyResultIds: ['kr-1'],
    })
    expect(snapshot).toBeTruthy()
    expect(wrapper.emitted('finished')).toHaveLength(1)
    wrapper.unmount()
  })

  it('„Zamknij bez wniosków” sends only the outcome', async () => {
    const wrapper = await mountRitual()
    await wrapper.findAll('.gc-choices .qr-choice-pick').at(3)!.trigger('click') // Porzucony
    await next(wrapper)
    await next(wrapper)
    await next(wrapper)
    await wrapper.find('.qr-finish .qr-quiet').trigger('click')
    await flushPromises()
    expect(closeGoal.mock.calls[0][1]).toEqual({ outcome: 'abandoned' })
    wrapper.unmount()
  })

  it('moves the deadline from the side exit without closing', async () => {
    const wrapper = await mountRitual()
    await wrapper.find('.gc-deadline > .qr-quiet').trigger('click')
    await wrapper.find('.gc-deadline-form input').setValue('2026-11-30')
    await wrapper.find('.gc-deadline-form .qr-primary').trigger('click')
    await flushPromises()
    expect(moveGoalTargetDate).toHaveBeenCalledWith('g-1', '2026-11-30')
    expect(closeGoal).not.toHaveBeenCalled()
    expect(wrapper.emitted('moved')?.[0]).toEqual(['2026-11-30'])
    wrapper.unmount()
  })

  it('honours a preset outcome and opens a closed goal in edit mode', async () => {
    const preset = await mountRitual(goalFixture(), { presetOutcome: 'abandoned' })
    expect(preset.find('.qr-choice.selected').text()).toContain('Porzucony')
    preset.unmount()

    const closed = goalFixture({
      status: 'completed',
      closingReflection: {
        closedAt: '2026-10-01',
        outcome: 'achieved',
        learned: 'Stały dzień i godzina.',
        keyResults: [],
        window: { weeksPlanned: 13 },
      },
    })
    const wrapper = await mountRitual(closed)
    expect(wrapper.find('.qr-choice.selected').text()).toContain('Osiągnięty')
    expect(wrapper.find('.gc-deadline').exists()).toBe(false)
    expect(wrapper.text()).toContain('Edycja podsumowania')
    await next(wrapper)
    await next(wrapper)
    expect((wrapper.findAll('.gc-field textarea').at(2)!.element as HTMLTextAreaElement).value).toBe(
      'Stały dzień i godzina.',
    )
    wrapper.unmount()
  })
})
