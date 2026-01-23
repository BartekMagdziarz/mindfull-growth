import Dexie, { type Table } from 'dexie'
import type { User } from '@/domain/user'

/**
 * Separate database for authentication data
 * This keeps user credentials isolated from user data
 */
class AuthDatabase extends Dexie {
  users!: Table<User, string>

  constructor() {
    super('MindfullGrowthAuthDB')
    this.version(1).stores({
      users: 'id, &username', // & = unique index on username
    })
  }
}

const authDb = new AuthDatabase()

export interface AuthRepository {
  getUserByUsername(username: string): Promise<User | undefined>
  getUserById(id: string): Promise<User | undefined>
  createUser(user: User): Promise<User>
  updateUser(user: User): Promise<User>
  usernameExists(username: string): Promise<boolean>
}

class AuthDexieRepository implements AuthRepository {
  async getUserByUsername(username: string): Promise<User | undefined> {
    const normalizedUsername = username.toLowerCase().trim()
    return await authDb.users.where('username').equals(normalizedUsername).first()
  }

  async getUserById(id: string): Promise<User | undefined> {
    return await authDb.users.get(id)
  }

  async createUser(user: User): Promise<User> {
    await authDb.users.add(user)
    return user
  }

  async updateUser(user: User): Promise<User> {
    await authDb.users.put(user)
    return user
  }

  async usernameExists(username: string): Promise<boolean> {
    const normalizedUsername = username.toLowerCase().trim()
    const count = await authDb.users.where('username').equals(normalizedUsername).count()
    return count > 0
  }
}

export const authDexieRepository = new AuthDexieRepository()
