import type { PeopleTag } from '@/domain/tag'
import type { ContextTag } from '@/domain/tag'
import type { PeopleTagRepository } from './tagRepository'
import type { ContextTagRepository } from './tagRepository'
import { db } from './journalDexieRepository'

// Use the shared database instance from journalDexieRepository
// The database schema (version 2) is already defined in MindfullGrowthDatabase

// Implementation of PeopleTagRepository using IndexedDB via Dexie
class PeopleTagDexieRepository implements PeopleTagRepository {
  async getAll(): Promise<PeopleTag[]> {
    try {
      return await db.peopleTags.toArray()
    } catch (error) {
      console.error('Failed to get all people tags:', error)
      throw new Error('Failed to retrieve people tags from database')
    }
  }

  async getById(id: string): Promise<PeopleTag | undefined> {
    try {
      return await db.peopleTags.get(id)
    } catch (error) {
      console.error(`Failed to get people tag with id ${id}:`, error)
      throw new Error(`Failed to retrieve people tag with id ${id}`)
    }
  }

  async create(data: { name: string }): Promise<PeopleTag> {
    try {
      const tag: PeopleTag = {
        id: crypto.randomUUID(),
        name: data.name,
      }
      await db.peopleTags.add(tag)
      return tag
    } catch (error) {
      console.error('Failed to create people tag:', error)
      throw new Error('Failed to create people tag in database')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await db.peopleTags.delete(id)
    } catch (error) {
      console.error(`Failed to delete people tag with id ${id}:`, error)
      throw new Error(`Failed to delete people tag with id ${id}`)
    }
  }

  async update(id: string, data: { name: string }): Promise<PeopleTag> {
    try {
      const existing = await db.peopleTags.get(id)
      if (!existing) {
        throw new Error(`People tag with id ${id} not found`)
      }
      const updated: PeopleTag = { ...existing, name: data.name }
      await db.peopleTags.put(updated)
      return updated
    } catch (error) {
      console.error(`Failed to update people tag with id ${id}:`, error)
      throw new Error(`Failed to update people tag with id ${id}`)
    }
  }
}

// Implementation of ContextTagRepository using IndexedDB via Dexie
class ContextTagDexieRepository implements ContextTagRepository {
  async getAll(): Promise<ContextTag[]> {
    try {
      return await db.contextTags.toArray()
    } catch (error) {
      console.error('Failed to get all context tags:', error)
      throw new Error('Failed to retrieve context tags from database')
    }
  }

  async getById(id: string): Promise<ContextTag | undefined> {
    try {
      return await db.contextTags.get(id)
    } catch (error) {
      console.error(`Failed to get context tag with id ${id}:`, error)
      throw new Error(`Failed to retrieve context tag with id ${id}`)
    }
  }

  async create(data: { name: string }): Promise<ContextTag> {
    try {
      const tag: ContextTag = {
        id: crypto.randomUUID(),
        name: data.name,
      }
      await db.contextTags.add(tag)
      return tag
    } catch (error) {
      console.error('Failed to create context tag:', error)
      throw new Error('Failed to create context tag in database')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await db.contextTags.delete(id)
    } catch (error) {
      console.error(`Failed to delete context tag with id ${id}:`, error)
      throw new Error(`Failed to delete context tag with id ${id}`)
    }
  }

  async update(id: string, data: { name: string }): Promise<ContextTag> {
    try {
      const existing = await db.contextTags.get(id)
      if (!existing) {
        throw new Error(`Context tag with id ${id} not found`)
      }
      const updated: ContextTag = { ...existing, name: data.name }
      await db.contextTags.put(updated)
      return updated
    } catch (error) {
      console.error(`Failed to update context tag with id ${id}:`, error)
      throw new Error(`Failed to update context tag with id ${id}`)
    }
  }
}

// Export singleton instances
export const peopleTagDexieRepository = new PeopleTagDexieRepository()
export const contextTagDexieRepository = new ContextTagDexieRepository()

