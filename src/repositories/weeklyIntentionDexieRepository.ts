import type {
  CreateWeeklyIntentionPayload,
  UpdateWeeklyIntentionPayload,
  WeeklyIntention,
} from '@/domain/planning'
import { normalizeWeeklyIntentionPayload } from '@/domain/planning'
import type { WeekRef } from '@/domain/period'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import { getUserDatabase } from '@/services/userDatabase.service'
import type { WeeklyIntentionRepository } from './weeklyIntentionRepository'
import { createPlanningRecord, requireRecord, toPlain, updatePlanningRecord } from './planningDexieRepository.shared'

class WeeklyIntentionDexieRepository implements WeeklyIntentionRepository {
  private get db() {
    return getUserDatabase()
  }

  async getById(id: string): Promise<WeeklyIntention | undefined> {
    try {
      return await this.db.weeklyIntentions.get(id)
    } catch (error) {
      console.error(`Failed to get weekly intention with id ${id}:`, error)
      throw new Error(`Failed to retrieve weekly intention with id ${id}`)
    }
  }

  async listAll(): Promise<WeeklyIntention[]> {
    try {
      return await this.db.weeklyIntentions.toArray()
    } catch (error) {
      console.error('Failed to list weekly intentions:', error)
      throw new Error('Failed to retrieve weekly intentions from database')
    }
  }

  async listByWeek(weekRef: WeekRef): Promise<WeeklyIntention[]> {
    try {
      return await this.db.weeklyIntentions.where('weekRef').equals(weekRef).toArray()
    } catch (error) {
      console.error(`Failed to list weekly intentions for week ${weekRef}:`, error)
      throw new Error(`Failed to retrieve weekly intentions for week ${weekRef}`)
    }
  }

  async create(data: CreateWeeklyIntentionPayload): Promise<WeeklyIntention> {
    try {
      const intention = createPlanningRecord<WeeklyIntention>(normalizeWeeklyIntentionPayload(data))
      await this.db.weeklyIntentions.add(toPlain(intention))
      invalidatePlanningQueryCache()
      return intention
    } catch (error) {
      console.error('Failed to create weekly intention:', error)
      throw new Error('Failed to create weekly intention in database')
    }
  }

  async update(id: string, data: UpdateWeeklyIntentionPayload): Promise<WeeklyIntention> {
    try {
      const existing = requireRecord(
        await this.db.weeklyIntentions.get(id),
        `Weekly intention with id ${id} not found`,
      )
      const updated = updatePlanningRecord(existing, normalizeWeeklyIntentionPayload(data, existing))
      await this.db.weeklyIntentions.put(toPlain(updated))
      invalidatePlanningQueryCache()
      return updated
    } catch (error) {
      console.error(`Failed to update weekly intention with id ${id}:`, error)
      throw new Error(`Failed to update weekly intention with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.weeklyIntentions.delete(id)
      invalidatePlanningQueryCache()
    } catch (error) {
      console.error(`Failed to delete weekly intention with id ${id}:`, error)
      throw new Error(`Failed to delete weekly intention with id ${id}`)
    }
  }
}

export const weeklyIntentionDexieRepository = new WeeklyIntentionDexieRepository()
