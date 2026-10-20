import Dexie, { type Table } from 'dexie'
import { getUserDatabase, type UserDatabase } from '@/services/userDatabaseService'
import { captureUserSession } from '@/services/userSessionScope'

/** Bind a repository call to one account and keep read/modify/write atomic. */
export async function userDatabaseOperation<T>(
  mode: 'r' | 'rw',
  tableNames: string[],
  work: (db: UserDatabase) => Promise<T>
): Promise<T> {
  const session = captureUserSession()
  const db = getUserDatabase()
  session.assertCurrent()
  // Join an existing transaction without widening its table set. The caller
  // already owns atomicity; actual table accesses still enforce its scope.
  const execute = async () => {
    session.assertCurrent()
    return await work(db)
  }
  const tables: Table[] = tableNames.map(name => db.table(name))
  const result =
    mode === 'r' || Dexie.currentTransaction
      ? await execute()
      : await db.transaction('rw', tables, execute)
  session.assertCurrent()
  return result
}
