import { enrichDemoHistory } from './enrichDemoHistory'
import { authDexieRepository } from '@/repositories/authDexieRepository'
import {
  connectUserDatabase,
  getCurrentUserId,
  getUserDatabase,
} from '@/services/userDatabase.service'
import { setSession } from '@/services/session.service'
import { blankProfileContent, type ProfileCategory } from '@/domain/approvedProfile'
import { approvedProfileRepository } from '@/repositories/approvedProfileRepository'
import { buildCompanionScenario, type PersonaId } from './scenarios'
import { seedCompanionScenario } from './seedScenario'
import { assertDemoEnvironment, demoUserId, selectedPersona } from './demoEnvironment'

export function guardDemoAccount(persona: PersonaId) {
  assertDemoEnvironment()
  if (
    getCurrentUserId() !== demoUserId(persona) ||
    getUserDatabase().name !== `MindfullGrowthDB_simplify_${demoUserId(persona)}`
  )
    throw new Error('Demo account mismatch')
}
const marker = 'ai-companion-demo-v1'
async function populate(persona: PersonaId) {
  const db = getUserDatabase(),
    scenario = buildCompanionScenario(persona)
  const loaded = await seedCompanionScenario(scenario, () => guardDemoAccount(persona))
  // Repository defaults use wall-clock time. Restore fixture event metadata without
  // replacing the browser Date global (new user actions keep their real timestamps).
  const timestamps = new Map([
    ...scenario.sources.map(s => [loaded.ids.get(s.id), s.occurredAt] as const),
    ...[...scenario.priorities, ...scenario.goals, ...scenario.habits].map(
      s => [loaded.ids.get(s.id), s.createdAt] as const
    ),
  ])
  for (const table of db.tables) {
    const rows = await table.toArray()
    for (const row of rows) {
      const at = timestamps.get(row.id) ?? scenario.asOf
      let changed = false
      for (const field of ['createdAt', 'updatedAt'])
        if (field in row) {
          row[field] = at
          changed = true
        }
      if (changed) await table.put(row)
    }
  }
  const categories: Record<string, ProfileCategory> = {
    about: 'identity',
    support: 'preferences',
    resources: 'strengths',
    current: 'currentContext',
    focus: 'focus',
  }
  const repo = approvedProfileRepository()
  for (const item of scenario.profile) {
    await repo.save({
      ...blankProfileContent(),
      category: categories[item.category],
      text: item.text,
      reviewAfter: item.reviewAfter?.slice(0, 10) ?? null,
    })
  }
  await enrichDemoHistory(persona, () => guardDemoAccount(persona))
  await db.userSettings.put({ key: marker, value: scenario.version })
}
export async function resetDemoPersona(persona: PersonaId) {
  guardDemoAccount(persona)
  const db = getUserDatabase()
  await db.transaction('rw', db.tables, async () => {
    guardDemoAccount(persona)
    for (const table of db.tables) await table.clear()
    await populate(persona)
  })
}
export async function bootstrapCompanionDemo() {
  assertDemoEnvironment()
  const persona = selectedPersona(),
    id = demoUserId(persona)
  if (!(await authDexieRepository.getUserById(id))) {
    // Deliberately unusable password: only the isolated bootstrap opens this account.
    try {
      await authDexieRepository.createUser({
        id,
        username: id,
        displayName: buildCompanionScenario(persona).displayName,
        passwordHash: 'demo-no-password-login',
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })
    } catch (error) {
      if (!(await authDexieRepository.getUserById(id))) throw error
    }
  }
  const db = await connectUserDatabase(id)
  await db.transaction('rw', db.tables, async () => {
    if (!(await db.userSettings.get(marker))) {
      // Do not silently overwrite any partially populated or unrelated data.
      for (const table of db.tables)
        if (await table.count()) throw new Error('Unrecognized demo data; automatic reset refused')
      await populate(persona)
    }
  })
  await db.transaction('rw', db.tables, () =>
    enrichDemoHistory(persona, () => guardDemoAccount(persona))
  )
  setSession({ id, username: id, displayName: buildCompanionScenario(persona).displayName })
}
