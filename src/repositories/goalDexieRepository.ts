import { userDatabaseOperation } from './userDatabaseOperation'
import type {
  CreateGoalPayload,
  CreateKeyResultPayload,
  Goal,
  KeyResult,
  UpdateGoalPayload,
} from '@/domain/planning'
import { normalizeGoalPayload, normalizeKeyResultPayload } from '@/domain/planning'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import type { GoalRepository } from './goalRepository'
import {
  createPlanningRecord,
  requireRecord,
  retirePriorityLinksForSubject,
  toPlain,
  updatePlanningRecord,
} from './planningDexieRepository.shared'

class GoalDexieRepository implements GoalRepository {
  async getById(id: string): Promise<Goal | undefined> {
    return userDatabaseOperation('r', ['goals', 'keyResults', 'priorityLinks'], async db => {
      try {
        return await db.goals.get(id)
      } catch (error) {
        console.error(`Failed to get goal with id ${id}:`, error)
        throw new Error(`Failed to retrieve goal with id ${id}`)
      }
    })
  }

  async listAll(): Promise<Goal[]> {
    return userDatabaseOperation('r', ['goals', 'keyResults', 'priorityLinks'], async db => {
      try {
        return await db.goals.toArray()
      } catch (error) {
        console.error('Failed to list goals:', error)
        throw new Error('Failed to retrieve goals from database')
      }
    })
  }

  async create(data: CreateGoalPayload): Promise<Goal> {
    return userDatabaseOperation('rw', ['goals', 'keyResults', 'priorityLinks'], async db => {
      try {
        const goal = createPlanningRecord<Goal>(normalizeGoalPayload(data))
        await db.goals.add(toPlain(goal))
        invalidatePlanningQueryCache()
        return goal
      } catch (error) {
        console.error('Failed to create goal:', error)
        throw new Error('Failed to create goal in database')
      }
    })
  }

  async createWithKeyResults(
    goalData: CreateGoalPayload,
    keyResultsData: Omit<CreateKeyResultPayload, 'goalId'>[]
  ): Promise<{ goal: Goal; keyResults: KeyResult[] }> {
    return userDatabaseOperation('rw', ['goals', 'keyResults', 'priorityLinks'], async db => {
      try {
        const goal = createPlanningRecord<Goal>(normalizeGoalPayload(goalData))
        const keyResults = keyResultsData.map(kr =>
          createPlanningRecord<KeyResult>(
            normalizeKeyResultPayload({ ...kr, goalId: goal.id } as CreateKeyResultPayload)
          )
        )
        await db.transaction('rw', db.goals, db.keyResults, async () => {
          await db.goals.add(toPlain(goal))
          for (const kr of keyResults) {
            await db.keyResults.add(toPlain(kr))
          }
        })
        invalidatePlanningQueryCache()
        return { goal, keyResults }
      } catch (error) {
        console.error('Failed to create goal with key results:', error)
        throw new Error('Failed to create goal with key results in database')
      }
    })
  }

  async update(id: string, data: UpdateGoalPayload): Promise<Goal> {
    return userDatabaseOperation('rw', ['goals', 'keyResults', 'priorityLinks'], async db => {
      try {
        const existing = requireRecord(await db.goals.get(id), `Goal with id ${id} not found`)
        const updated = updatePlanningRecord(existing, normalizeGoalPayload(data, existing))
        await db.goals.put(toPlain(updated))
        invalidatePlanningQueryCache()
        return updated
      } catch (error) {
        console.error(`Failed to update goal with id ${id}:`, error)
        throw new Error(`Failed to update goal with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['goals', 'keyResults', 'priorityLinks'], async db => {
      try {
        await db.transaction('rw', [db.goals, db.keyResults, db.priorityLinks], async () => {
          const keyResultIds = (await db.keyResults
            .where('goalId')
            .equals(id)
            .primaryKeys()) as string[]
          await db.keyResults.where('goalId').equals(id).delete()
          await db.goals.delete(id)
          await retirePriorityLinksForSubject(db.priorityLinks, {
            subjectType: 'goal',
            subjectId: id,
          })
          for (const keyResultId of keyResultIds) {
            await retirePriorityLinksForSubject(db.priorityLinks, {
              subjectType: 'keyResult',
              subjectId: keyResultId,
            })
          }
        })
        invalidatePlanningQueryCache()
      } catch (error) {
        console.error(`Failed to delete goal with id ${id}:`, error)
        throw new Error(`Failed to delete goal with id ${id}`)
      }
    })
  }
}

export const goalDexieRepository = new GoalDexieRepository()
