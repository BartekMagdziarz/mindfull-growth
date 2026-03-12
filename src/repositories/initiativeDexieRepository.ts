import type { CreateInitiativePayload, Initiative, UpdateInitiativePayload } from '@/domain/planning'
import { normalizeInitiativePayload } from '@/domain/planning'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import { getUserDatabase } from '@/services/userDatabase.service'
import type { InitiativeRepository } from './initiativeRepository'
import { createPlanningRecord, requireRecord, toPlain, updatePlanningRecord } from './planningDexieRepository.shared'

class InitiativeDexieRepository implements InitiativeRepository {
  private get db() {
    return getUserDatabase()
  }

  async getById(id: string): Promise<Initiative | undefined> {
    try {
      return await this.db.initiatives.get(id)
    } catch (error) {
      console.error(`Failed to get initiative with id ${id}:`, error)
      throw new Error(`Failed to retrieve initiative with id ${id}`)
    }
  }

  async listAll(): Promise<Initiative[]> {
    try {
      return await this.db.initiatives.toArray()
    } catch (error) {
      console.error('Failed to list initiatives:', error)
      throw new Error('Failed to retrieve initiatives from database')
    }
  }

  async create(data: CreateInitiativePayload): Promise<Initiative> {
    try {
      const initiative = createPlanningRecord<Initiative>(normalizeInitiativePayload(data))
      await this.db.initiatives.add(toPlain(initiative))
      invalidatePlanningQueryCache()
      return initiative
    } catch (error) {
      console.error('Failed to create initiative:', error)
      throw new Error('Failed to create initiative in database')
    }
  }

  async update(id: string, data: UpdateInitiativePayload): Promise<Initiative> {
    try {
      const existing = requireRecord(
        await this.db.initiatives.get(id),
        `Initiative with id ${id} not found`,
      )
      const updated = updatePlanningRecord(existing, normalizeInitiativePayload(data, existing))
      await this.db.initiatives.put(toPlain(updated))
      invalidatePlanningQueryCache()
      return updated
    } catch (error) {
      console.error(`Failed to update initiative with id ${id}:`, error)
      throw new Error(`Failed to update initiative with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.initiatives.delete(id)
      invalidatePlanningQueryCache()
    } catch (error) {
      console.error(`Failed to delete initiative with id ${id}:`, error)
      throw new Error(`Failed to delete initiative with id ${id}`)
    }
  }
}

export const initiativeDexieRepository = new InitiativeDexieRepository()
