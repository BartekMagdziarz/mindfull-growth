import { describe, it, expect } from 'vitest'
import Dexie from 'dexie'
import router from '@/router'
import { UserDatabase } from '@/services/userDatabase.service'

describe('Planning migration + routing safety', () => {
  it('upgrades legacy periodicEntries schema without breaking startup', async () => {
    const dbName = `MindfullGrowthDB_migration_${Date.now()}`

    const legacyDb = new Dexie(dbName)
    legacyDb.version(6).stores({
      periodicEntries: 'id, type, periodStartDate, [type+periodStartDate]',
    })
    await legacyDb.open()
    await legacyDb.table('periodicEntries').add({
      id: 'periodic-1',
      type: 'weekly',
      periodStartDate: '2025-12-29',
    })
    await legacyDb.close()

    const upgradedDb = new UserDatabase(dbName)
    await upgradedDb.open()

    const tableNames = upgradedDb.tables.map((table) => table.name)
    expect(tableNames).not.toContain('periodicEntries')

    await upgradedDb.close()
    await upgradedDb.delete()
  })

  it('redirects /periodic to /planning and avoids legacy routes', () => {
    const periodicRoutes = router.getRoutes().filter((route) => route.path.includes('periodic'))

    expect(periodicRoutes).toHaveLength(1)
    expect(periodicRoutes[0].path).toBe('/periodic')
    expect(periodicRoutes[0].redirect).toBe('/planning')
  })
})
