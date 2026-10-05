import { userDatabaseOperation } from './userDatabaseOperation'
import type { MonthRef, WeekRef } from '@/domain/period'
import type {
  CreateMonthlyReflectionPayload,
  CreateWeeklyReflectionPayload,
  MonthlyReflection,
  UpdateMonthlyReflectionPayload,
  UpdateWeeklyReflectionPayload,
  WeeklyReflection,
} from '@/domain/reflection'
import {
  normalizeMonthlyReflectionPayload,
  normalizeWeeklyReflectionPayload,
} from '@/domain/reflection'
import type { StructuredReflectionRepository } from './structuredReflectionRepository'
import {
  createPlanningRecord,
  toPlain,
  updatePlanningRecord,
} from './planningDexieRepository.shared'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import { getChildPeriods } from '@/utils/periods'

class StructuredReflectionDexieRepository implements StructuredReflectionRepository {
  // ---------------------------------------------------------------------------
  // Weekly
  // ---------------------------------------------------------------------------

  async getWeekly(weekRef: WeekRef): Promise<WeeklyReflection | undefined> {
    return userDatabaseOperation('r', ['weeklyReflections', 'monthlyReflections'], async db => {
      try {
        return await db.weeklyReflections.where('weekRef').equals(weekRef).first()
      } catch (error) {
        console.error(`Failed to get weekly reflection for ${weekRef}:`, error)
        throw new Error(`Failed to retrieve weekly reflection for ${weekRef}`)
      }
    })
  }

  async listWeekly(): Promise<WeeklyReflection[]> {
    return userDatabaseOperation('r', ['weeklyReflections', 'monthlyReflections'], async db => {
      try {
        return await db.weeklyReflections.toArray()
      } catch (error) {
        console.error('Failed to list weekly reflections:', error)
        throw new Error('Failed to retrieve weekly reflections from database')
      }
    })
  }

  async listWeeklyByRefs(weekRefs: readonly WeekRef[]): Promise<WeeklyReflection[]> {
    return userDatabaseOperation('r', ['weeklyReflections', 'monthlyReflections'], async db => {
      if (!weekRefs.length) return []
      try {
        return await db.weeklyReflections
          .where('weekRef')
          .anyOf([...weekRefs])
          .toArray()
      } catch (error) {
        console.error('Failed to list weekly reflections by refs:', error)
        throw new Error('Failed to retrieve weekly reflections from database')
      }
    })
  }

  async upsertWeekly(
    data: CreateWeeklyReflectionPayload | UpdateWeeklyReflectionPayload
  ): Promise<WeeklyReflection> {
    return userDatabaseOperation('rw', ['weeklyReflections', 'monthlyReflections'], async db => {
      try {
        const existing = data.weekRef ? await this.getWeekly(data.weekRef) : undefined
        const normalized = normalizeWeeklyReflectionPayload(data, existing)

        if (existing) {
          const updated = updatePlanningRecord(existing, normalized)
          await db.weeklyReflections.put(toPlain(updated))
          invalidatePlanningQueryCache()
          return updated
        }

        const created = createPlanningRecord<WeeklyReflection>(normalized)
        await db.weeklyReflections.add(toPlain(created))
        invalidatePlanningQueryCache()
        return created
      } catch (error) {
        console.error('Failed to upsert weekly reflection:', error)
        throw new Error('Failed to persist weekly reflection in database')
      }
    })
  }

  async deleteWeekly(weekRef: WeekRef): Promise<void> {
    return userDatabaseOperation('rw', ['weeklyReflections', 'monthlyReflections'], async db => {
      try {
        const existing = await this.getWeekly(weekRef)
        if (!existing) return

        await db.weeklyReflections.delete(existing.id)
        invalidatePlanningQueryCache()
      } catch (error) {
        console.error(`Failed to delete weekly reflection for ${weekRef}:`, error)
        throw new Error(`Failed to delete weekly reflection for ${weekRef}`)
      }
    })
  }

  // ---------------------------------------------------------------------------
  // Monthly
  // ---------------------------------------------------------------------------

  async getMonthly(monthRef: MonthRef): Promise<MonthlyReflection | undefined> {
    return userDatabaseOperation('r', ['weeklyReflections', 'monthlyReflections'], async db => {
      try {
        return await db.monthlyReflections.where('monthRef').equals(monthRef).first()
      } catch (error) {
        console.error(`Failed to get monthly reflection for ${monthRef}:`, error)
        throw new Error(`Failed to retrieve monthly reflection for ${monthRef}`)
      }
    })
  }

  async listMonthly(): Promise<MonthlyReflection[]> {
    return userDatabaseOperation('r', ['weeklyReflections', 'monthlyReflections'], async db => {
      try {
        return await db.monthlyReflections.toArray()
      } catch (error) {
        console.error('Failed to list monthly reflections:', error)
        throw new Error('Failed to retrieve monthly reflections from database')
      }
    })
  }

  async upsertMonthly(
    data: CreateMonthlyReflectionPayload | UpdateMonthlyReflectionPayload
  ): Promise<MonthlyReflection> {
    return userDatabaseOperation('rw', ['weeklyReflections', 'monthlyReflections'], async db => {
      try {
        const existing = data.monthRef ? await this.getMonthly(data.monthRef) : undefined
        const normalized = normalizeMonthlyReflectionPayload(data, existing)

        if (existing) {
          const updated = updatePlanningRecord(existing, normalized)
          await db.monthlyReflections.put(toPlain(updated))
          invalidatePlanningQueryCache()
          return updated
        }

        const created = createPlanningRecord<MonthlyReflection>(normalized)
        await db.monthlyReflections.add(toPlain(created))
        invalidatePlanningQueryCache()
        return created
      } catch (error) {
        console.error('Failed to upsert monthly reflection:', error)
        throw new Error('Failed to persist monthly reflection in database')
      }
    })
  }

  async deleteMonthly(monthRef: MonthRef): Promise<void> {
    return userDatabaseOperation('rw', ['weeklyReflections', 'monthlyReflections'], async db => {
      try {
        const existing = await this.getMonthly(monthRef)
        if (!existing) return

        await db.monthlyReflections.delete(existing.id)
        invalidatePlanningQueryCache()
      } catch (error) {
        console.error(`Failed to delete monthly reflection for ${monthRef}:`, error)
        throw new Error(`Failed to delete monthly reflection for ${monthRef}`)
      }
    })
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async getWeeklyForMonth(monthRef: MonthRef): Promise<WeeklyReflection[]> {
    return userDatabaseOperation('r', ['weeklyReflections', 'monthlyReflections'], async _db => {
      try {
        const weekRefs = getChildPeriods(monthRef) as WeekRef[]
        if (weekRefs.length === 0) return []

        const results = await Promise.all(weekRefs.map(wr => this.getWeekly(wr)))
        return results.filter((r): r is WeeklyReflection => r !== undefined)
      } catch (error) {
        console.error(`Failed to get weekly reflections for month ${monthRef}:`, error)
        throw new Error(`Failed to retrieve weekly reflections for month ${monthRef}`)
      }
    })
  }
}

export const structuredReflectionDexieRepository = new StructuredReflectionDexieRepository()
