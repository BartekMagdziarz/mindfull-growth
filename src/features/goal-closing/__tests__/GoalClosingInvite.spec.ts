import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { Goal } from '@/domain/planning'
import type { DayRef } from '@/domain/period'

const push = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ fullPath: '/calendar/week/2026-W40?action=reflect' }),
}))
const getGoalsAwaitingClosing = vi.fn()
const deferGoalClosing = vi.fn(async (_id: string, _days: number) => undefined)
vi.mock('@/services/goalClosingQueries', () => ({
  getGoalsAwaitingClosing: (end: string, today: string) => getGoalsAwaitingClosing(end, today),
}))
vi.mock('@/services/goalClosingService', () => ({
  GOAL_CLOSING_DEFER_DAYS: 7,
  deferGoalClosing: (id: string, days: number) => deferGoalClosing(id, days),
}))

import GoalClosingInvite from '../GoalClosingInvite.vue'

function goal(id: string, title: string, targetDate: string): Goal {
  return {
    id,
    createdAt: 'x',
    updatedAt: 'x',
    title,
    isActive: true,
    status: 'open',
    priorityIds: [],
    lifeAreaIds: [],
    targetDate,
  }
}

beforeEach(() => {
  push.mockClear()
  deferGoalClosing.mockClear()
  getGoalsAwaitingClosing.mockReset()
})

describe('GoalClosingInvite', () => {
  it('renders nothing when no goal awaits closing', async () => {
    getGoalsAwaitingClosing.mockResolvedValue([])
    const wrapper = mount(GoalClosingInvite, {
      props: { periodEnd: '2026-10-04' as DayRef, periodStart: '2026-09-28' as DayRef },
      global: { stubs: { AppIcon: true } },
    })
    await flushPromises()
    expect(wrapper.find('.gc-invite').exists()).toBe(false)
  })

  it('lists goals with a lead that separates this period from older ones', async () => {
    getGoalsAwaitingClosing.mockResolvedValue([
      goal('g-old', 'Porządek w finansach', '2026-09-15'),
      goal('g-new', 'Blok treningowy', '2026-09-30'),
    ])
    const wrapper = mount(GoalClosingInvite, {
      props: { periodEnd: '2026-10-04' as DayRef, periodStart: '2026-09-28' as DayRef },
      global: { stubs: { AppIcon: true } },
    })
    await flushPromises()
    expect(getGoalsAwaitingClosing).toHaveBeenCalledWith(
      '2026-10-04',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    )
    expect(wrapper.find('.gc-invite__head small').text()).toBe(
      'W tym okresie minął termin 1 celu, 1 czeka od wcześniej.'
    )
    const rows = wrapper.findAll('.gc-invite__row')
    expect(rows.map(row => row.find('strong').text())).toEqual([
      'Porządek w finansach',
      'Blok treningowy',
    ])
    expect(rows[1].find('small').text()).toMatch(/^termin 30 wrz/)

    await rows[1].find('.gc-invite__go').trigger('click')
    expect(push).toHaveBeenCalledWith({
      name: 'goal-closing-ritual',
      params: { goalId: 'g-new' },
      query: { return: '/calendar/week/2026-W40?action=reflect' },
    })
  })

  it('„Później” defers the goal for a week and drops it from the list', async () => {
    getGoalsAwaitingClosing.mockResolvedValue([goal('g-1', 'Blok treningowy', '2026-09-30')])
    const wrapper = mount(GoalClosingInvite, {
      props: { periodEnd: '2026-10-04' as DayRef },
      global: { stubs: { AppIcon: true } },
    })
    await flushPromises()
    await wrapper.find('.gc-invite__actions .qr-quiet').trigger('click')
    await flushPromises()
    expect(deferGoalClosing).toHaveBeenCalledWith('g-1', 7)
    expect(wrapper.find('.gc-invite').exists()).toBe(false)
  })
})
