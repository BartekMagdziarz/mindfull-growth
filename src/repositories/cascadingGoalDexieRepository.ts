import type {
  CascadingGoal,
  CreateCascadingGoalPayload,
  UpdateCascadingGoalPayload,
  GoalStatus,
} from '@/domain/lifeSeasons'
import type { PeriodicEntryType } from '@/domain/periodicEntry'
import { getUserDatabase } from '@/services/userDatabase.service'

export interface CascadingGoalRepository {
  getAll(): Promise<CascadingGoal[]>
  getById(id: string): Promise<CascadingGoal | undefined>
  getBySourceEntry(entryId: string): Promise<CascadingGoal[]>
  getBySourcePeriodType(type: PeriodicEntryType): Promise<CascadingGoal[]>
  getByStatus(status: GoalStatus): Promise<CascadingGoal[]>
  getByParentGoal(parentId: string): Promise<CascadingGoal[]>
  getActiveGoals(): Promise<CascadingGoal[]>
  create(data: CreateCascadingGoalPayload): Promise<CascadingGoal>
  update(id: string, data: UpdateCascadingGoalPayload): Promise<CascadingGoal>
  addChildGoal(parentId: string, childId: string): Promise<void>
  delete(id: string): Promise<void>
}

class CascadingGoalDexieRepository implements CascadingGoalRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<CascadingGoal[]> {
    try {
      return await this.db.cascadingGoals.toArray()
    } catch (error) {
      console.error('Failed to get all cascading goals:', error)
      throw new Error('Failed to retrieve cascading goals from database')
    }
  }

  async getById(id: string): Promise<CascadingGoal | undefined> {
    try {
      return await this.db.cascadingGoals.get(id)
    } catch (error) {
      console.error(`Failed to get cascading goal with id ${id}:`, error)
      throw new Error(`Failed to retrieve cascading goal with id ${id}`)
    }
  }

  async getBySourceEntry(entryId: string): Promise<CascadingGoal[]> {
    try {
      return await this.db.cascadingGoals
        .where('sourceEntryId')
        .equals(entryId)
        .toArray()
    } catch (error) {
      console.error(`Failed to get goals for entry ${entryId}:`, error)
      throw new Error(`Failed to retrieve goals for entry ${entryId}`)
    }
  }

  async getBySourcePeriodType(type: PeriodicEntryType): Promise<CascadingGoal[]> {
    try {
      return await this.db.cascadingGoals
        .where('sourcePeriodType')
        .equals(type)
        .toArray()
    } catch (error) {
      console.error(`Failed to get goals for period type ${type}:`, error)
      throw new Error(`Failed to retrieve goals for period type ${type}`)
    }
  }

  async getByStatus(status: GoalStatus): Promise<CascadingGoal[]> {
    try {
      return await this.db.cascadingGoals
        .where('status')
        .equals(status)
        .toArray()
    } catch (error) {
      console.error(`Failed to get goals with status ${status}:`, error)
      throw new Error(`Failed to retrieve goals with status ${status}`)
    }
  }

  async getByParentGoal(parentId: string): Promise<CascadingGoal[]> {
    try {
      return await this.db.cascadingGoals
        .where('parentGoalId')
        .equals(parentId)
        .toArray()
    } catch (error) {
      console.error(`Failed to get child goals for parent ${parentId}:`, error)
      throw new Error(`Failed to retrieve child goals for parent ${parentId}`)
    }
  }

  async getActiveGoals(): Promise<CascadingGoal[]> {
    try {
      return await this.db.cascadingGoals
        .where('status')
        .equals('active')
        .toArray()
    } catch (error) {
      console.error('Failed to get active goals:', error)
      throw new Error('Failed to retrieve active goals')
    }
  }

  async create(data: CreateCascadingGoalPayload): Promise<CascadingGoal> {
    try {
      const now = new Date().toISOString()
      const goal: CascadingGoal = {
        id: crypto.randomUUID(),
        title: data.title,
        description: data.description,
        sourceEntryId: data.sourceEntryId,
        sourcePeriodType: data.sourcePeriodType,
        status: 'active',
        parentGoalId: data.parentGoalId,
        childGoalIds: [],
        createdAt: now,
        updatedAt: now,
      }
      await this.db.cascadingGoals.add(goal)

      // If this goal has a parent, add it to the parent's childGoalIds
      if (data.parentGoalId) {
        await this.addChildGoal(data.parentGoalId, goal.id)
      }

      return goal
    } catch (error) {
      console.error('Failed to create cascading goal:', error)
      throw new Error('Failed to create cascading goal in database')
    }
  }

  async update(id: string, data: UpdateCascadingGoalPayload): Promise<CascadingGoal> {
    try {
      const existing = await this.db.cascadingGoals.get(id)
      if (!existing) {
        throw new Error(`Goal with id ${id} not found`)
      }

      const updatedGoal: CascadingGoal = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.cascadingGoals.put(updatedGoal)
      return updatedGoal
    } catch (error) {
      console.error(`Failed to update cascading goal with id ${id}:`, error)
      throw new Error(`Failed to update cascading goal with id ${id}`)
    }
  }

  async addChildGoal(parentId: string, childId: string): Promise<void> {
    try {
      const parent = await this.db.cascadingGoals.get(parentId)
      if (!parent) {
        throw new Error(`Parent goal with id ${parentId} not found`)
      }

      const updatedChildIds = [...parent.childGoalIds, childId]
      await this.db.cascadingGoals.update(parentId, {
        childGoalIds: updatedChildIds,
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error(`Failed to add child goal ${childId} to parent ${parentId}:`, error)
      throw new Error(`Failed to add child goal to parent`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      // Get the goal to check for parent
      const goal = await this.db.cascadingGoals.get(id)
      if (goal?.parentGoalId) {
        // Remove this goal from parent's childGoalIds
        const parent = await this.db.cascadingGoals.get(goal.parentGoalId)
        if (parent) {
          const updatedChildIds = parent.childGoalIds.filter((cid) => cid !== id)
          await this.db.cascadingGoals.update(goal.parentGoalId, {
            childGoalIds: updatedChildIds,
            updatedAt: new Date().toISOString(),
          })
        }
      }

      await this.db.cascadingGoals.delete(id)
    } catch (error) {
      console.error(`Failed to delete cascading goal with id ${id}:`, error)
      throw new Error(`Failed to delete cascading goal with id ${id}`)
    }
  }
}

export const cascadingGoalDexieRepository = new CascadingGoalDexieRepository()
