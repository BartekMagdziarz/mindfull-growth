import type { CreatePriorityPayload, Priority, UpdatePriorityPayload } from '@/domain/planning'
import { normalizePriorityPayload } from '@/domain/planning'
import { getUserDatabase } from '@/services/userDatabase.service'
import type { PriorityRepository } from './priorityRepository'
import { createPlanningRecord, requireRecord, toPlain, updatePlanningRecord } from './planningDexieRepository.shared'

class PriorityDexieRepository implements PriorityRepository {
  private get db() {
    return getUserDatabase()
  }

  async getById(id: string): Promise<Priority | undefined> {
    try {
      return await this.db.priorities.get(id)
    } catch (error) {
      console.error(`Failed to get priority with id ${id}:`, error)
      throw new Error(`Failed to retrieve priority with id ${id}`)
    }
  }

  async listAll(): Promise<Priority[]> {
    try {
      return await this.db.priorities.toArray()
    } catch (error) {
      console.error('Failed to list priorities:', error)
      throw new Error('Failed to retrieve priorities from database')
    }
  }

  async create(data: CreatePriorityPayload): Promise<Priority> {
    try {
      const priority = createPlanningRecord<Priority>(normalizePriorityPayload(data))
      await this.db.priorities.add(toPlain(priority))
      return priority
    } catch (error) {
      console.error('Failed to create priority:', error)
      throw new Error('Failed to create priority in database')
    }
  }

  async update(id: string, data: UpdatePriorityPayload): Promise<Priority> {
    try {
      const existing = requireRecord(await this.db.priorities.get(id), `Priority with id ${id} not found`)
      const updated = updatePlanningRecord(existing, normalizePriorityPayload(data, existing))
      await this.db.priorities.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update priority with id ${id}:`, error)
      throw new Error(`Failed to update priority with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.priorities.delete(id)
    } catch (error) {
      console.error(`Failed to delete priority with id ${id}:`, error)
      throw new Error(`Failed to delete priority with id ${id}`)
    }
  }
}

export const priorityDexieRepository = new PriorityDexieRepository()
