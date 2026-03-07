import { connectUserDatabase, getUserDatabase } from '@/services/userDatabase.service'

type GlobalWithTestUser = typeof globalThis & { __TEST_USER_ID__?: string }

function resolveTestUserId(): string {
  const globalScope = globalThis as GlobalWithTestUser
  if (!globalScope.__TEST_USER_ID__) {
    globalScope.__TEST_USER_ID__ = `test-user-${process.pid}`
  }
  return globalScope.__TEST_USER_ID__
}

export function getTestUserId(): string {
  return resolveTestUserId()
}

export async function connectTestDatabase() {
  const userId = resolveTestUserId()
  await connectUserDatabase(userId)
  return getUserDatabase()
}

export function getTestDatabase() {
  return getUserDatabase()
}
