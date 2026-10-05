import { describe, expect, it } from 'vitest'
import {
  assertDemoEnvironment,
  DEMO_ORIGIN,
  demoUserId,
  DEMO_SELECTION,
  selectedPersona,
} from '../demoEnvironment'
describe('demo boundary', () => {
  it('rejects ordinary, verification, production and remote origins', () => {
    for (const [mode, origin] of [
      ['development', DEMO_ORIGIN],
      ['production', DEMO_ORIGIN],
      ['verification', DEMO_ORIGIN],
      ['ai-demo', 'http://127.0.0.1:5173'],
      ['ai-demo', 'http://127.0.0.1:5199'],
      ['ai-demo', 'http://example.com:5203'],
    ])
      expect(() => assertDemoEnvironment(mode, origin)).toThrow()
    expect(() => assertDemoEnvironment('ai-demo', DEMO_ORIGIN)).not.toThrow()
  })
  it('only selects known personas and uses a separate account namespace', () => {
    sessionStorage.setItem(DEMO_SELECTION, 'private-user')
    expect(selectedPersona()).toBe('marta')
    sessionStorage.setItem(DEMO_SELECTION, 'alex')
    expect(selectedPersona()).toBe('alex')
    expect(demoUserId('alex')).toBe('ai-companion-demo-alex')
    sessionStorage.removeItem(DEMO_SELECTION)
  })
})
