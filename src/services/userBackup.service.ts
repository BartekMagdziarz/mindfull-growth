import type { Table } from 'dexie'
import { getUserDatabase } from './userDatabase.service'
import { captureUserSession, invalidateUserSession } from './userSessionScope'
import { pendingProgramPlanKey, type ExercisePlanItem } from '@/domain/exercisePlan'

export const MAX_BACKUP_BYTES = 50 * 1024 * 1024
const OMITTED_TABLES = new Set(['historyDigests', 'profileTasks'])
const PRIVATE_SETTINGS = new Set(['aiProviderSettings', 'openaiApiKey'])
type Row = Record<string, unknown>
export interface UserBackup {
  format: 'mindfull-growth-backup'
  version: 1
  databaseVersion: number
  exportedAt: string
  tables: Record<string, Row[]>
}

function persistentTables(): Table[] {
  return getUserDatabase().tables.filter(table => !OMITTED_TABLES.has(table.name))
}
function cleanRow(table: string, row: Row): Row | null {
  if (table === 'userSettings' && PRIVATE_SETTINGS.has(String(row.key))) return null
  if (table === 'companionConversations') {
    // Leases and provider continuation state must never resume from a backup.
    const { pending: _pending, state: _state, ...persistent } = row
    return persistent
  }
  return row
}

/** Read every collection in one snapshot; auth credentials live in another DB. */
export async function createUserBackup(): Promise<UserBackup> {
  const scope = captureUserSession()
  const db = getUserDatabase()
  const tables = persistentTables()
  const snapshot = await db.transaction('r', tables, async () => {
    scope.assertCurrent()
    const rows: Record<string, Row[]> = {}
    for (const table of tables) {
      rows[table.name] = (await table.toArray()).flatMap(row => {
        const clean = cleanRow(table.name, row)
        return clean ? [clean] : []
      })
    }
    return rows
  })
  scope.assertCurrent()
  return {
    format: 'mindfull-growth-backup',
    version: 1,
    databaseVersion: db.verno,
    exportedAt: new Date().toISOString(),
    tables: snapshot,
  }
}

function object(value: unknown): value is Row {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
function invalid(): never {
  throw new Error('Invalid or incompatible backup')
}

/** Validate before presenting replacement confirmation or modifying any data. */
export function parseUserBackup(json: string): UserBackup {
  if (new Blob([json]).size > MAX_BACKUP_BYTES) invalid()
  const value: unknown = JSON.parse(json)
  const db = getUserDatabase()
  if (
    !object(value) ||
    value.format !== 'mindfull-growth-backup' ||
    value.version !== 1 ||
    value.databaseVersion !== db.verno ||
    typeof value.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.exportedAt)) ||
    !object(value.tables)
  )
    invalid()
  const tables = persistentTables()
  const expected = new Set(tables.map(table => table.name))
  if (
    Object.keys(value.tables).length !== expected.size ||
    Object.keys(value.tables).some(name => !expected.has(name))
  )
    invalid()
  const sanitized: Record<string, Row[]> = {}
  for (const table of tables) {
    const rows = value.tables[table.name]
    if (!Array.isArray(rows)) invalid()
    const keyPath = table.schema.primKey.keyPath
    if (typeof keyPath !== 'string') invalid()
    const keys = new Set<string>()
    const uniqueIndexes = table.schema.indexes.filter(index => index.unique)
    const indexValues = uniqueIndexes.map(() => new Set<string>())
    sanitized[table.name] = rows
      .map(row => {
        if (
          !object(row) ||
          typeof row[keyPath] !== 'string' ||
          !row[keyPath].trim() ||
          keys.has(row[keyPath])
        )
          invalid()
        keys.add(row[keyPath])
        for (const field of ['createdAt', 'updatedAt']) {
          if (
            row[field] !== undefined &&
            (typeof row[field] !== 'string' || !Number.isFinite(Date.parse(row[field])))
          )
            invalid()
        }
        if (table.name === 'journalEntries' && typeof row.body !== 'string') invalid()
        if (table.name === 'userSettings' && typeof row.value !== 'string') invalid()
        if (table.name === 'drafts' && typeof row.data !== 'string') invalid()
        if (table.name === 'exercisePlanItems') {
          if (
            !['pending', 'done', 'skipped'].includes(String(row.status)) ||
            typeof row.exerciseSlug !== 'string'
          )
            invalid()
          row.pendingProgramKey = pendingProgramPlanKey(row as unknown as ExercisePlanItem)
        }
        uniqueIndexes.forEach((index, i) => {
          const paths = Array.isArray(index.keyPath) ? index.keyPath : [index.keyPath]
          const values = paths.map(path => (typeof path === 'string' ? row[path] : undefined))
          if (values.some(v => v === undefined || v === null)) return
          const key = JSON.stringify(values)
          if (indexValues[i].has(key)) invalid()
          indexValues[i].add(key)
        })
        return cleanRow(table.name, row)
      })
      .filter((row): row is Row => row !== null)
  }
  return {
    format: 'mindfull-growth-backup',
    version: 1,
    databaseVersion: db.verno,
    exportedAt: value.exportedAt,
    tables: sanitized,
  }
}

/** Replace local user data atomically. Call only after explicit UI confirmation. */
export async function restoreUserBackup(backup: UserBackup): Promise<void> {
  // Revalidate a serialized copy: callers cannot bypass validation or mutate
  // the object while the transaction is queued.
  const snapshot = parseUserBackup(JSON.stringify(backup))
  const db = getUserDatabase()
  invalidateUserSession()
  const scope = captureUserSession()
  await db.transaction('rw', db.tables, async () => {
    scope.assertCurrent()
    const privateSettings = (await db.userSettings.toArray()).filter(row =>
      PRIVATE_SETTINGS.has(row.key)
    )
    for (const table of db.tables) {
      await table.clear()
      const rows = snapshot.tables[table.name]
      if (rows?.length) await table.bulkAdd(rows)
    }
    if (privateSettings.length) await db.userSettings.bulkPut(privateSettings)
    scope.assertCurrent()
  })
  scope.assertCurrent()
}
