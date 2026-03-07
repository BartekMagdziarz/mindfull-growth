import { describe, expect, it } from 'vitest'
import { resolveAutoTodayMode } from '@/composables/useTodayGrounding'

describe('useTodayGrounding helpers', () => {
  it('resolves morning mode between 04:00 and 11:59', () => {
    expect(resolveAutoTodayMode(new Date('2026-02-14T04:00:00'))).toBe('morning')
    expect(resolveAutoTodayMode(new Date('2026-02-14T11:59:00'))).toBe('morning')
  })

  it('resolves midday mode between 12:00 and 17:59', () => {
    expect(resolveAutoTodayMode(new Date('2026-02-14T12:00:00'))).toBe('midday')
    expect(resolveAutoTodayMode(new Date('2026-02-14T17:59:00'))).toBe('midday')
  })

  it('resolves evening mode outside morning and midday windows', () => {
    expect(resolveAutoTodayMode(new Date('2026-02-14T18:00:00'))).toBe('evening')
    expect(resolveAutoTodayMode(new Date('2026-02-14T03:59:00'))).toBe('evening')
  })
})
