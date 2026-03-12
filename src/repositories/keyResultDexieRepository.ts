import type { CreateKeyResultPayload, KeyResult, UpdateKeyResultPayload } from '@/domain/planning'
import { normalizeKeyResultPayload } from '@/domain/planning'
import { getUserDatabase } from '@/services/userDatabase.service'
import type { KeyResultRepository } from './keyResultRepository'
import { createPlanningRecord, requireRecord, toPlain, updatePlanningRecord } from './planningDexieRepository.shared'

class KeyResultDexieRepository implements KeyResultRepository {
  private get db() {
    return getUserDatabase()
  }

  async getById(id: string): Promise<KeyResult | undefined> {
    try {
      return await this.db.keyResults.get(id)
    } catch (error) {
      console.error(`Failed to get key result with id ${id}:`, error)
      throw new Error(`Failed to retrieve key result with id ${id}`)
    }
  }

  async listAll(): Promise<KeyResult[]> {
    try {
      return await this.db.keyResults.toArray()
    } catch (error) {
      console.error('Failed to list key results:', error)
      throw new Error('Failed to retrieve key results from database')
    }
  }

  async create(data: CreateKeyResultPayload): Promise<KeyResult> {
    try {
      const normalized = normalizeKeyResultPayload(data)
      await this.assertGoalExists(normalized.goalId)
      const keyResult = createPlanningRecord<KeyResult>(normalized)
      await this.db.keyResults.add(toPlain(keyResult))
      return keyResult
    } catch (error) {
      console.error('Failed to create key result:', error)
      throw new Error('Failed to create key result in database')
    }
  }

  async update(id: string, data: UpdateKeyResultPayload): Promise<KeyResult> {
    try {
      const existing = requireRecord(
        await this.db.keyResults.get(id),
        `Key result with id ${id} not found`,
      )
      const normalized = normalizeKeyResultPayload(data, existing)
      await this.assertGoalExists(normalized.goalId)
      const updated = updatePlanningRecord(existing, normalized)
      await this.db.keyResults.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update key result with id ${id}:`, error)
      throw new Error(`Failed to update key result with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.keyResults.delete(id)
    } catch (error) {
      console.error(`Failed to delete key result with id ${id}:`, error)
      throw new Error(`Failed to delete key result with id ${id}`)
    }
  }

  private async assertGoalExists(goalId: string): Promise<void> {
    const goal = await this.db.goals.get(goalId)
    if (!goal) {
      throw new Error(`Key result requires an existing goal with id ${goalId}`)
    }
  }
}

export const keyResultDexieRepository = new KeyResultDexieRepository()
