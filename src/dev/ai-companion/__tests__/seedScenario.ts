/** Vitest-only adapter; browser demo has its own strict origin/account guard. */
import { vi } from 'vitest'
import { getCurrentUserId } from '@/services/userDatabaseService'
import { getTestUserId } from '@/test/testDatabase'
import type { CompanionScenario } from '../scenarios'
import { seedCompanionScenario } from '../seedScenario'
export async function seedScenarioInTestDatabase(scenario: CompanionScenario) {
  const guard = () => {
    if (import.meta.env.MODE !== 'test' || getCurrentUserId() !== getTestUserId())
      throw new Error('AI fixtures require the connected isolated Vitest database')
  }
  guard()
  vi.useFakeTimers({ toFake: ['Date'] })
  try {
    return await seedCompanionScenario(scenario, guard, date => vi.setSystemTime(date))
  } finally {
    vi.useRealTimers()
  }
}
