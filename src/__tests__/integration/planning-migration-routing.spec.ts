import { describe, expect, it } from 'vitest'
import router from '@/router'

describe('calendar routing', () => {
  it('registers Dzisiaj as its own view, the week/month/year workspace and the legacy redirects', () => {
    const routes = router.getRoutes()

    expect(routes.find((route) => route.path === '/today')?.name).toBe('today')
    // The day is a unit, not a calendar scale: /today/:dayRef renders a component…
    const todayDay = routes.find((route) => route.path === '/today/:dayRef')
    expect(todayDay?.name).toBe('today-day')
    expect(todayDay?.components?.default).toBeDefined()
    // …and the old calendar day address only redirects there.
    const calendarDay = routes.find((route) => route.path === '/calendar/day/:dayRef')
    expect(calendarDay?.name).toBe('calendar-day')
    expect(calendarDay?.redirect).toBeDefined()
    expect(calendarDay?.components).toBeUndefined()
    expect(routes.find((route) => route.path === '/calendar')).toBeDefined()
    expect(routes.find((route) => route.path === '/calendar/year/:yearRef')?.name).toBe('calendar-year')
    expect(routes.find((route) => route.path === '/calendar/month/:monthRef')?.name).toBe('calendar-month')
    expect(routes.find((route) => route.path === '/calendar/week/:weekRef')?.name).toBe('calendar-week')
    expect(routes.find((route) => route.path === '/calendar/stream/:periodRef?')?.name).toBe('calendar-stream')

    expect(routes.find((route) => route.path === '/planning/:pathMatch(.*)*')).toBeUndefined()
    expect(routes.find((route) => route.path === '/periodic')).toBeUndefined()
  })
})

describe('day hand-over', () => {
  // The auth guard would send an anonymous test router to /login, so the
  // redirect records are exercised directly.
  function redirectOf(path: string, to: { params?: Record<string, string>; query?: Record<string, string> }) {
    const record = router.getRoutes().find((route) => route.path === path)
    const redirect = record?.redirect
    if (typeof redirect !== 'function') throw new Error(`${path} has no redirect function`)
    const target = redirect({ params: {}, query: {}, ...to } as never, {} as never)
    return target as { name?: string; params?: Record<string, string> }
  }

  it('sends the legacy calendar day address and /today to today-day', () => {
    expect(redirectOf('/calendar/day/:dayRef', { params: { dayRef: '2026-03-12' } })).toMatchObject({
      name: 'today-day',
      params: { dayRef: '2026-03-12' },
    })
    const today = redirectOf('/today', {})
    expect(today.name).toBe('today-day')
    expect(today.params?.dayRef).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('opens the calendar on the current week, not on a day', () => {
    const calendar = redirectOf('/calendar', {})
    expect(calendar.name).toBe('calendar-week')
    expect(calendar.params?.weekRef).toMatch(/^\d{4}-W\d{2}$/)
  })
})
