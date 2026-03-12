import { describe, expect, it } from 'vitest'
import router from '@/router'

describe('calendar routing', () => {
  it('registers calendar routes and removes legacy planning aliases', () => {
    const routes = router.getRoutes()

    expect(routes.find((route) => route.path === '/calendar')).toBeDefined()
    expect(routes.find((route) => route.path === '/calendar/year/:yearRef')?.name).toBe('calendar-year')
    expect(routes.find((route) => route.path === '/calendar/month/:monthRef')?.name).toBe('calendar-month')
    expect(routes.find((route) => route.path === '/calendar/week/:weekRef')?.name).toBe('calendar-week')
    expect(routes.find((route) => route.path === '/calendar/day/:dayRef')?.name).toBe('calendar-day')

    expect(routes.find((route) => route.path === '/planning/:pathMatch(.*)*')).toBeUndefined()
    expect(routes.find((route) => route.path === '/periodic')).toBeUndefined()
  })
})
