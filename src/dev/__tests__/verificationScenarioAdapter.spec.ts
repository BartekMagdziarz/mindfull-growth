import { describe, expect, it } from 'vitest'
import type { DayRef } from '@/domain/period'
import { buildRichVerificationScenario } from '@/dev/richVerificationScenario'
import { createVerificationScenarioIdRegistry } from '@/dev/verificationScenarioAdapter'

describe('verification scenario semantic id adapter', () => {
  it('zamienia klucze semantyczne na wygenerowane ID i zachowuje relacje wiele-do-wielu', () => {
    const scenario = buildRichVerificationScenario('2026-07-19' as DayRef)
    const registry = createVerificationScenarioIdRegistry(scenario)

    for (const priority of scenario.priorities) {
      registry.registerPriority(priority.key, `id:${priority.key}`)
    }
    registry.registerObject('tracker-evening', 'id:tracker-evening')

    expect(registry.priorityId('movement')).toBe('id:movement')
    expect(registry.objectId('tracker-evening')).toBe('id:tracker-evening')
    expect(registry.priorityIdsForObject('tracker-evening')).toEqual([
      'id:movement',
      'id:relationships',
    ])
  })

  it('odrzuca nieznane klucze i brakujące mapowania', () => {
    const registry = createVerificationScenarioIdRegistry(
      buildRichVerificationScenario('2026-07-19' as DayRef),
    )

    expect(() => registry.registerObject('unknown', 'id')).toThrow('Unknown rich-v1 object key')
    expect(() => registry.priorityId('movement')).toThrow('Missing generated id')
  })
})
