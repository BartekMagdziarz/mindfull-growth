import type { CreateHabitPayload, Habit, UpdateHabitPayload } from '@/domain/planning'
import { normalizeHabitPayload } from '@/domain/planning'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import { getUserDatabase } from '@/services/userDatabase.service'
import type { HabitRepository } from './habitRepository'
import { createPlanningRecord, requireRecord, toPlain, updatePlanningRecord } from './planningDexieRepository.shared'

class HabitDexieRepository implements HabitRepository {
  private get db() {
    return getUserDatabase()
  }

  async getById(id: string): Promise<Habit | undefined> {
    try {
      return await this.db.habits.get(id)
    } catch (error) {
      console.error(`Failed to get habit with id ${id}:`, error)
      throw new Error(`Failed to retrieve habit with id ${id}`)
    }
  }

  async listAll(): Promise<Habit[]> {
    try {
      return await this.db.habits.toArray()
    } catch (error) {
      console.error('Failed to list habits:', error)
      throw new Error('Failed to retrieve habits from database')
    }
  }

  async create(data: CreateHabitPayload): Promise<Habit> {
    try {
      const habit = createPlanningRecord<Habit>(normalizeHabitPayload(data))
      await this.db.habits.add(toPlain(habit))
      invalidatePlanningQueryCache()
      return habit
    } catch (error) {
      console.error('Failed to create habit:', error)
      throw new Error('Failed to create habit in database')
    }
  }

  async update(id: string, data: UpdateHabitPayload): Promise<Habit> {
    try {
      const existing = requireRecord(await this.db.habits.get(id), `Habit with id ${id} not found`)
      const updated = updatePlanningRecord(existing, normalizeHabitPayload(data, existing))
      await this.db.habits.put(toPlain(updated))
      invalidatePlanningQueryCache()
      return updated
    } catch (error) {
      console.error(`Failed to update habit with id ${id}:`, error)
      throw new Error(`Failed to update habit with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.habits.delete(id)
      invalidatePlanningQueryCache()
    } catch (error) {
      console.error(`Failed to delete habit with id ${id}:`, error)
      throw new Error(`Failed to delete habit with id ${id}`)
    }
  }
}

export const habitDexieRepository = new HabitDexieRepository()
