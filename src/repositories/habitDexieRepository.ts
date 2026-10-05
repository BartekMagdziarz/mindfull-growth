import { userDatabaseOperation } from './userDatabaseOperation'
import type { CreateHabitPayload, Habit, UpdateHabitPayload } from '@/domain/planning'
import { normalizeHabitPayload } from '@/domain/planning'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import type { HabitRepository } from './habitRepository'
import {
  createPlanningRecord,
  requireRecord,
  retirePriorityLinksForSubject,
  toPlain,
  updatePlanningRecord,
} from './planningDexieRepository.shared'

class HabitDexieRepository implements HabitRepository {
  async getById(id: string): Promise<Habit | undefined> {
    return userDatabaseOperation('r', ['habits', 'priorityLinks'], async db => {
      try {
        return await db.habits.get(id)
      } catch (error) {
        console.error(`Failed to get habit with id ${id}:`, error)
        throw new Error(`Failed to retrieve habit with id ${id}`)
      }
    })
  }

  async listAll(): Promise<Habit[]> {
    return userDatabaseOperation('r', ['habits', 'priorityLinks'], async db => {
      try {
        return await db.habits.toArray()
      } catch (error) {
        console.error('Failed to list habits:', error)
        throw new Error('Failed to retrieve habits from database')
      }
    })
  }

  async create(data: CreateHabitPayload): Promise<Habit> {
    return userDatabaseOperation('rw', ['habits', 'priorityLinks'], async db => {
      try {
        const habit = createPlanningRecord<Habit>(normalizeHabitPayload(data))
        await db.habits.add(toPlain(habit))
        invalidatePlanningQueryCache()
        return habit
      } catch (error) {
        console.error('Failed to create habit:', error)
        throw new Error('Failed to create habit in database')
      }
    })
  }

  async update(id: string, data: UpdateHabitPayload): Promise<Habit> {
    return userDatabaseOperation('rw', ['habits', 'priorityLinks'], async db => {
      try {
        const existing = requireRecord(await db.habits.get(id), `Habit with id ${id} not found`)
        const updated = updatePlanningRecord(existing, normalizeHabitPayload(data, existing))
        await db.habits.put(toPlain(updated))
        invalidatePlanningQueryCache()
        return updated
      } catch (error) {
        console.error(`Failed to update habit with id ${id}:`, error)
        throw new Error(`Failed to update habit with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['habits', 'priorityLinks'], async db => {
      try {
        await db.transaction('rw', [db.habits, db.priorityLinks], async () => {
          await db.habits.delete(id)
          await retirePriorityLinksForSubject(db.priorityLinks, {
            subjectType: 'habit',
            subjectId: id,
          })
        })
        invalidatePlanningQueryCache()
      } catch (error) {
        console.error(`Failed to delete habit with id ${id}:`, error)
        throw new Error(`Failed to delete habit with id ${id}`)
      }
    })
  }
}

export const habitDexieRepository = new HabitDexieRepository()
