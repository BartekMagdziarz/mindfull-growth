import type { CreateGoalPayload, Goal, UpdateGoalPayload } from '@/domain/planning'
import { normalizeGoalPayload } from '@/domain/planning'
import { getUserDatabase } from '@/services/userDatabase.service'
import type { GoalRepository } from './goalRepository'
import { createPlanningRecord, requireRecord, toPlain, updatePlanningRecord } from './planningDexieRepository.shared'

class GoalDexieRepository implements GoalRepository {
  private get db() {
    return getUserDatabase()
  }

  async getById(id: string): Promise<Goal | undefined> {
    try {
      return await this.db.goals.get(id)
    } catch (error) {
      console.error(`Failed to get goal with id ${id}:`, error)
      throw new Error(`Failed to retrieve goal with id ${id}`)
    }
  }

  async listAll(): Promise<Goal[]> {
    try {
      return await this.db.goals.toArray()
    } catch (error) {
      console.error('Failed to list goals:', error)
      throw new Error('Failed to retrieve goals from database')
    }
  }

  async create(data: CreateGoalPayload): Promise<Goal> {
    try {
      const goal = createPlanningRecord<Goal>(normalizeGoalPayload(data))
      await this.db.goals.add(toPlain(goal))
      return goal
    } catch (error) {
      console.error('Failed to create goal:', error)
      throw new Error('Failed to create goal in database')
    }
  }

  async update(id: string, data: UpdateGoalPayload): Promise<Goal> {
    try {
      const existing = requireRecord(await this.db.goals.get(id), `Goal with id ${id} not found`)
      const updated = updatePlanningRecord(existing, normalizeGoalPayload(data, existing))
      await this.db.goals.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update goal with id ${id}:`, error)
      throw new Error(`Failed to update goal with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.transaction('rw', this.db.goals, this.db.keyResults, async () => {
        await this.db.keyResults.where('goalId').equals(id).delete()
        await this.db.goals.delete(id)
      })
    } catch (error) {
      console.error(`Failed to delete goal with id ${id}:`, error)
      throw new Error(`Failed to delete goal with id ${id}`)
    }
  }
}

export const goalDexieRepository = new GoalDexieRepository()
