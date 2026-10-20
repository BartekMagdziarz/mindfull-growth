import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { DayRef, WeekRef } from '@/domain/period'
import type { DayMarker } from '@/services/dayUpcomingQueries'
import NextDayUpcoming from '../NextDayUpcoming.vue'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/composables/useT', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      `${key.split('.').at(-1)}${params ? `:${JSON.stringify(params)}` : ''}`,
    locale: ref('pl-PL'),
  }),
}))

const TODAY = '2026-03-12' as DayRef

function ritual(
  dayRef: string,
  state: 'due' | 'done',
  action: 'plan' | 'reflect',
  weekRef: string
): DayMarker {
  return {
    key: `ritual:week:${action}:${weekRef}`,
    kind: 'ritual',
    dayRef: dayRef as DayRef,
    state,
    ritual: 'week',
    action,
    weekRef: weekRef as WeekRef,
  }
}

const entries: DayMarker[] = [
  ritual('2026-03-08', 'done', 'reflect', '2026-W09'),
  ritual('2026-03-09', 'due', 'plan', '2026-W10'),
  ritual('2026-03-16', 'due', 'plan', '2026-W11'),
  { ...ritual('2026-03-16', 'done', 'plan', '2026-W11'), key: 'ritual:week:plan:2026-W11:done' },
  ritual('2026-03-23', 'due', 'plan', '2026-W12'),
  ritual('2026-03-30', 'due', 'plan', '2026-W13'),
]

function mountList(list: DayMarker[] = entries, limit = 9) {
  return mount(NextDayUpcoming, {
    props: { entries: list, todayRef: TODAY, limit },
    global: { stubs: { AppIcon: true } },
  })
}

const frontTiles = (wrapper: ReturnType<typeof mountList>) =>
  wrapper.findAll('.next-day-upcoming__list').at(0)!.findAll('.next-day-upcoming__tile')

describe('NextDayUpcoming', () => {
  it('shows done tiles first, then the open ones with a short date, and keeps the past behind a head link', async () => {
    const wrapper = mountList()
    const front = frontTiles(wrapper)

    expect(front.map(tile => tile.find('.ndt__title').text())).toEqual([
      'planWeek_next',
      'planWeek_current',
      'planWeek_next',
      'planWeek · 23–29 mar 2026',
      'planWeek · 30 mar–5 kwi 2026',
    ])
    // Everything fits in the slots: no "Jeszcze" tile, only the past one.
    expect(wrapper.find('.next-day-upcoming__more').exists()).toBe(false)
    // Done: the icon carries the state (its tooltip names it), no date on the surface.
    expect(front[0].classes()).toContain('is-done')
    expect(front[0].find('.next-day-upcoming__glyph').attributes('title')).toBe('planned')
    expect(front[0].find('.ndt__mark').exists()).toBe(false)
    // Overdue: only a quiet date, in rose; the period sits in the tooltip.
    expect(front[1].classes()).toContain('is-overdue')
    expect(front[1].find('.ndt__mark').text()).toBe('sinceDays:{"n":3}')
    expect(front[1].find('.ndt__mark').classes()).toContain('is-rose')
    expect(front[2].attributes('title')).toBe('16–22 mar 2026')
    expect(front[2].text()).not.toContain('16–22 mar 2026')
    expect(front[2].find('.ndt__mark').text()).toBe('za 4 dni')

    const pastToggle = wrapper.find('.next-day-upcoming__past-toggle')
    expect(pastToggle.text()).toBe('past:{"n":1}')
    expect(wrapper.find('.next-day-upcoming__past').exists()).toBe(false)
    await pastToggle.trigger('click')
    const past = wrapper.find('.next-day-upcoming__past')
    expect(past.findAll('.next-day-upcoming__tile')[0].find('.ndt__title').text()).toBe(
      'reflectWeek_previous'
    )
    expect(past.findAll('.next-day-upcoming__tile')[0].classes()).toContain('ndt--done')
  })

  it('rings the tile due today', () => {
    const wrapper = mountList([
      ritual(TODAY, 'due', 'reflect', '2026-W10'),
      ritual('2026-03-16', 'due', 'plan', '2026-W11'),
    ])
    const front = frontTiles(wrapper)
    expect(front[0].classes()).toContain('ndt--today')
    expect(front[0].find('.ndt__mark').text()).toBe('today')
    expect(front[1].classes()).not.toContain('ndt--today')
  })

  it('keeps the card at `limit` tiles: "Jeszcze n" and "Minione" take the last slots', async () => {
    const wrapper = mountList(entries, 4)
    const more = wrapper.find('.next-day-upcoming__more')

    // 5 open/upcoming + 1 past in 4 slots: 2 entries, then "Jeszcze 3", then "Minione (1)".
    expect(frontTiles(wrapper)).toHaveLength(2)
    expect(wrapper.findAll('.next-day-upcoming__list').at(0)!.findAll('.ndt')).toHaveLength(4)
    expect(more.text()).toBe('more:{"n":3}')
    expect(more.attributes('aria-expanded')).toBe('false')
    await more.trigger('click')
    expect(frontTiles(wrapper)).toHaveLength(5)
    expect(wrapper.find('.next-day-upcoming__more').text()).toBe('less')
    expect(more.attributes('aria-expanded')).toBe('true')
  })

  it('shows the empty state only when the front list is empty, past link may still exist', () => {
    const wrapper = mountList([ritual('2026-03-08', 'done', 'reflect', '2026-W09')])

    expect(wrapper.find('.ndt-empty').text()).toBe('empty')
    expect(wrapper.find('.next-day-upcoming__past-toggle').exists()).toBe(true)
    expect(wrapper.find('.next-day-upcoming__more').exists()).toBe(false)
  })

  it('opens the ritual from the tile title', async () => {
    const wrapper = mountList([ritual('2026-03-16', 'due', 'plan', '2026-W11')])
    await frontTiles(wrapper)[0].find('.ndt__open').trigger('click')
    expect(push).toHaveBeenLastCalledWith({
      name: 'calendar-week',
      params: { weekRef: '2026-W11' },
      query: { action: 'plan' },
    })
  })

  it('shows the path letter without the rose and opens both path events in the path view', async () => {
    const letter: DayMarker = {
      key: 'letter:e1',
      kind: 'letter',
      dayRef: '2026-03-10' as DayRef,
      state: 'due',
      enrollmentId: 'e1',
      programSlug: 'shame-compassion',
      programTitleKey: 'programs.shame-compassion.title',
    }
    const ret: DayMarker = {
      ...letter,
      key: 'return:e1',
      kind: 'return',
      dayRef: '2026-03-18' as DayRef,
    }
    const wrapper = mountList([letter, ret])
    const tiles = frontTiles(wrapper)
    expect(tiles[0].classes()).toContain('is-letter')
    expect(tiles[0].classes()).not.toContain('is-overdue')
    expect(tiles[0].find('.next-day-upcoming__mark').classes()).not.toContain('is-rose')
    expect(tiles[0].find('.next-day-upcoming__mark').text()).toBe('sinceDays:{"n":2}')

    await tiles[0].find('.ndt__open').trigger('click')
    expect(push).toHaveBeenLastCalledWith({
      name: 'program-detail',
      params: { slug: 'shame-compassion' },
      query: { letter: '1', enrollment: 'e1' },
    })
    await tiles[1].find('.ndt__open').trigger('click')
    expect(push).toHaveBeenLastCalledWith({
      name: 'program-detail',
      params: { slug: 'shame-compassion' },
    })
  })

  it('opens the closing ritual from an overdue goal and the library card from one still ahead', async () => {
    const goal = {
      id: 'g-1',
      title: 'Blok treningowy',
      targetDate: '2026-03-10',
    } as DayMarker extends infer M
      ? M extends { kind: 'deadline'; goal: infer G }
        ? G
        : never
      : never
    const overdue: DayMarker = {
      key: 'deadline:g-1',
      kind: 'deadline',
      dayRef: '2026-03-10' as DayRef,
      state: 'due',
      goal,
    }
    const ahead: DayMarker = {
      key: 'deadline:g-2',
      kind: 'deadline',
      dayRef: '2026-03-20' as DayRef,
      state: 'due',
      goal: { ...goal, id: 'g-2' },
    }
    const wrapper = mountList([overdue, ahead])
    const tiles = frontTiles(wrapper)
    expect(tiles[0].attributes('title')).toBe('plannedEnd · 10 mar')

    await tiles[0].find('.ndt__open').trigger('click')
    expect(push).toHaveBeenLastCalledWith({
      name: 'goal-closing-ritual',
      params: { goalId: 'g-1' },
      query: { return: `/today/${TODAY}` },
    })
    await tiles[1].find('.ndt__open').trigger('click')
    expect(push).toHaveBeenLastCalledWith({
      name: 'objects-family',
      params: { family: 'goals' },
      query: { expandedType: 'goal', expandedId: 'g-2' },
    })
  })
})
