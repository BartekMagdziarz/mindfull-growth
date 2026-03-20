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
import { getUserDatabase } from '@/services/userDatabase.service'
import type { StructuredReflectionRepository } from './structuredReflectionRepository'
import { createPlanningRecord, toPlain, updatePlanningRecord } from './planningDexieRepository.shared'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import { getChildPeriods } from '@/utils/periods'

class StructuredReflectionDexieRepository implements StructuredReflectionRepository {
  private get db() {
    return getUserDatabase()
  }

  // ---------------------------------------------------------------------------
  // Weekly
  // ---------------------------------------------------------------------------

  async getWeekly(weekRef: WeekRef): Promise<WeeklyReflection | undefined> {
    try {
      return await this.db.weeklyReflections.where('weekRef').equals(weekRef).first()
    } catch (error) {
      console.error(`Failed to get weekly reflection for ${weekRef}:`, error)
      throw new Error(`Failed to retrieve weekly reflection for ${weekRef}`)
    }
  }

  async listWeekly(): Promise<WeeklyReflection[]> {
    try {
      return await this.db.weeklyReflections.toArray()
    } catch (error) {
      console.error('Failed to list weekly reflections:', error)
      throw new Error('Failed to retrieve weekly reflections from database')
    }
  }

  async upsertWeekly(
    data: CreateWeeklyReflectionPayload | UpdateWeeklyReflectionPayload
  ): Promise<WeeklyReflection> {
    try {
      const existing = data.weekRef ? await this.getWeekly(data.weekRef) : undefined
      const normalized = normalizeWeeklyReflectionPayload(data, existing)

      if (existing) {
        const updated = updatePlanningRecord(existing, normalized)
        await this.db.weeklyReflections.put(toPlain(updated))
        invalidatePlanningQueryCache()
        return updated
      }

      const created = createPlanningRecord<WeeklyReflection>(normalized)
      await this.db.weeklyReflections.add(toPlain(created))
      invalidatePlanningQueryCache()
      return created
    } catch (error) {
      console.error('Failed to upsert weekly reflection:', error)
      throw new Error('Failed to persist weekly reflection in database')
    }
  }

  async deleteWeekly(weekRef: WeekRef): Promise<void> {
    try {
      const existing = await this.getWeekly(weekRef)
      if (!existing) return

      await this.db.weeklyReflections.delete(existing.id)
      invalidatePlanningQueryCache()
    } catch (error) {
      console.error(`Failed to delete weekly reflection for ${weekRef}:`, error)
      throw new Error(`Failed to delete weekly reflection for ${weekRef}`)
    }
  }

  // ---------------------------------------------------------------------------
  // Monthly
  // ---------------------------------------------------------------------------

  async getMonthly(monthRef: MonthRef): Promise<MonthlyReflection | undefined> {
    try {
      return await this.db.monthlyReflections.where('monthRef').equals(monthRef).first()
    } catch (error) {
      console.error(`Failed to get monthly reflection for ${monthRef}:`, error)
      throw new Error(`Failed to retrieve monthly reflection for ${monthRef}`)
    }
  }

  async listMonthly(): Promise<MonthlyReflection[]> {
    try {
      return await this.db.monthlyReflections.toArray()
    } catch (error) {
      console.error('Failed to list monthly reflections:', error)
      throw new Error('Failed to retrieve monthly reflections from database')
    }
  }

  async upsertMonthly(
    data: CreateMonthlyReflectionPayload | UpdateMonthlyReflectionPayload
  ): Promise<MonthlyReflection> {
    try {
      const existing = data.monthRef ? await this.getMonthly(data.monthRef) : undefined
      const normalized = normalizeMonthlyReflectionPayload(data, existing)

      if (existing) {
        const updated = updatePlanningRecord(existing, normalized)
        await this.db.monthlyReflections.put(toPlain(updated))
        invalidatePlanningQueryCache()
        return updated
      }

      const created = createPlanningRecord<MonthlyReflection>(normalized)
      await this.db.monthlyReflections.add(toPlain(created))
      invalidatePlanningQueryCache()
      return created
    } catch (error) {
      console.error('Failed to upsert monthly reflection:', error)
      throw new Error('Failed to persist monthly reflection in database')
    }
  }

  async deleteMonthly(monthRef: MonthRef): Promise<void> {
    try {
      const existing = await this.getMonthly(monthRef)
      if (!existing) return

      await this.db.monthlyReflections.delete(existing.id)
      invalidatePlanningQueryCache()
    } catch (error) {
      console.error(`Failed to delete monthly reflection for ${monthRef}:`, error)
      throw new Error(`Failed to delete monthly reflection for ${monthRef}`)
    }
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async getWeeklyForMonth(monthRef: MonthRef): Promise<WeeklyReflection[]> {
    try {
      const weekRefs = getChildPeriods(monthRef) as WeekRef[]
      if (weekRefs.length === 0) return []

      const results = await Promise.all(weekRefs.map((wr) => this.getWeekly(wr)))
      return results.filter((r): r is WeeklyReflection => r !== undefined)
    } catch (error) {
      console.error(`Failed to get weekly reflections for month ${monthRef}:`, error)
      throw new Error(`Failed to retrieve weekly reflections for month ${monthRef}`)
    }
  }
}

export const structuredReflectionDexieRepository = new StructuredReflectionDexieRepository()
