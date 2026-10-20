import type { Table } from 'dexie'
import type { UserDatabase } from '@/services/userDatabaseService'
import { reportError } from '@/utils/reportError'
import { userDatabaseOperation } from './userDatabaseOperation'

/**
 * Generic CRUD over one Dexie table of the current user's database.
 *
 * Every exercise entity is stored the same way: a `crypto.randomUUID()` id,
 * ISO `createdAt`/`updatedAt` stamps, and a JSON clone to strip Vue proxies.
 * The factory keeps that shape in one place (docs/backlog.md P-3); a
 * repository with reads beyond CRUD spreads the result and adds its own
 * methods (see `ifsPartDexieRepository`).
 *
 * Failures are reported through `reportError('<table>.<operation>', error)`
 * and rethrown as `Error('Failed to …', { cause })`, so the Dexie error is
 * kept while stores keep showing the stable message.
 */

/** Stamps every record handled by the factory carries. */
export interface TimestampedRecord {
  id: string
  createdAt: string
  updatedAt: string
}

export interface DexieCrudRepositoryOptions<T extends TimestampedRecord> {
  /** Picks the table from the current user's database. */
  table: (db: UserDatabase) => Table<T, string>
  /** Singular label used in messages, e.g. "thought record". */
  label: string
  /** Plural label; `${label}s` unless the English plural is irregular. */
  labelPlural?: string
  /** Tables locked by the write transaction; the record's own one at least. */
  tables: string[]
}

export interface DexieCrudRepository<T extends TimestampedRecord, CreatePayload, UpdatePayload> {
  getAll(): Promise<T[]>
  getById(id: string): Promise<T | undefined>
  create(data: CreatePayload): Promise<T>
  update(id: string, data: UpdatePayload): Promise<T>
  delete(id: string): Promise<void>
}

/** JSON round-trip: drops Vue proxies and functions before Dexie clones the value. */
export function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

export function createDexieCrudRepository<
  T extends TimestampedRecord,
  CreatePayload extends object = Omit<T, keyof TimestampedRecord>,
  UpdatePayload extends object = Partial<CreatePayload>,
>(options: DexieCrudRepositoryOptions<T>): DexieCrudRepository<T, CreatePayload, UpdatePayload> {
  const { table, label, tables } = options
  const plural = options.labelPlural ?? `${label}s`
  const scope = tables[0] ?? label
  const capitalized = label.charAt(0).toUpperCase() + label.slice(1)

  const fail = (operation: string, message: string, error: unknown): Error => {
    reportError(`${scope}.${operation}`, error)
    return new Error(message, { cause: error })
  }

  return {
    getAll() {
      return userDatabaseOperation('r', tables, async db => {
        try {
          return await table(db).toArray()
        } catch (error) {
          throw fail('getAll', `Failed to retrieve ${plural} from database`, error)
        }
      })
    },

    getById(id) {
      return userDatabaseOperation('r', tables, async db => {
        try {
          return await table(db).get(id)
        } catch (error) {
          throw fail('getById', `Failed to retrieve ${label} with id ${id}`, error)
        }
      })
    },

    create(data) {
      return userDatabaseOperation('rw', tables, async db => {
        try {
          const now = new Date().toISOString()
          const record = {
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
            ...data,
          } as unknown as T
          await table(db).add(toPlain(record))
          return record
        } catch (error) {
          throw fail('create', `Failed to create ${label} in database`, error)
        }
      })
    },

    update(id, data) {
      return userDatabaseOperation('rw', tables, async db => {
        try {
          const existing = await table(db).get(id)
          if (!existing) {
            throw new Error(`${capitalized} with id ${id} not found`)
          }
          const updated = {
            ...existing,
            ...data,
            updatedAt: new Date().toISOString(),
          } as T
          await table(db).put(toPlain(updated))
          return updated
        } catch (error) {
          throw fail('update', `Failed to update ${label} with id ${id}`, error)
        }
      })
    },

    delete(id) {
      return userDatabaseOperation('rw', tables, async db => {
        try {
          await table(db).delete(id)
        } catch (error) {
          throw fail('delete', `Failed to delete ${label} with id ${id}`, error)
        }
      })
    },
  }
}
