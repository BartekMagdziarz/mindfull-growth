import { describe, expect, it } from 'vitest'
import router from '@/router'

describe('legacy route redirects', () => {
  it('redirects removed entry points to /journal', () => {
    const routes = router.getRoutes()

    expect(routes.find((route) => route.path === '/today')?.redirect).toBe('/journal')
    expect(routes.find((route) => route.path === '/planning/:pathMatch(.*)*')?.redirect).toBe('/journal')
    expect(routes.find((route) => route.path === '/periodic')?.redirect).toBe('/journal')
  })
})
