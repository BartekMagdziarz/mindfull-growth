import { userDatabaseOperation } from './userDatabaseOperation'
import type { MonthRef, WeekRef } from '@/domain/period'
import type {
  CreateMonthPlanPayload,
  CreateWeekPlanPayload,
  MonthPlan,
  UpdateMonthPlanPayload,
  UpdateWeekPlanPayload,
  WeekPlan,
} from '@/domain/planningState'
import { normalizeMonthPlanPayload, normalizeWeekPlanPayload } from '@/domain/planningState'
import type { PeriodPlanRepository } from './periodPlanRepository'
import {
  createPlanningRecord,
  requireRecord,
  toPlain,
  updatePlanningRecord,
} from './planningDexieRepository.shared'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'

class PeriodPlanDexieRepository implements PeriodPlanRepository {
  async getMonthPlan(monthRef: MonthRef): Promise<MonthPlan | undefined> {
    return userDatabaseOperation('r', ['monthPlans', 'weekPlans'], async db => {
      try {
        return await db.monthPlans.where('monthRef').equals(monthRef).first()
      } catch (error) {
        console.error(`Failed to get month plan for ${monthRef}:`, error)
        throw new Error(`Failed to retrieve month plan for ${monthRef}`)
      }
    })
  }

  async listMonthPlans(): Promise<MonthPlan[]> {
    return userDatabaseOperation('r', ['monthPlans', 'weekPlans'], async db => {
      try {
        return await db.monthPlans.orderBy('monthRef').toArray()
      } catch (error) {
        console.error('Failed to list month plans:', error)
        throw new Error('Failed to retrieve month plans from database')
      }
    })
  }

  async createMonthPlan(data: CreateMonthPlanPayload): Promise<MonthPlan> {
    return userDatabaseOperation('rw', ['monthPlans', 'weekPlans'], async db => {
      try {
        const monthPlan = createPlanningRecord<MonthPlan>(normalizeMonthPlanPayload(data))
        await db.monthPlans.add(toPlain(monthPlan))
        invalidatePlanningQueryCache()
        return monthPlan
      } catch (error) {
        console.error('Failed to create month plan:', error)
        throw new Error('Failed to create month plan in database')
      }
    })
  }

  async updateMonthPlan(id: string, data: UpdateMonthPlanPayload): Promise<MonthPlan> {
    return userDatabaseOperation('rw', ['monthPlans', 'weekPlans'], async db => {
      try {
        const existing = requireRecord(
          await db.monthPlans.get(id),
          `Month plan with id ${id} not found`
        )
        const updated = updatePlanningRecord(existing, normalizeMonthPlanPayload(data, existing))
        await db.monthPlans.put(toPlain(updated))
        invalidatePlanningQueryCache()
        return updated
      } catch (error) {
        console.error(`Failed to update month plan with id ${id}:`, error)
        throw new Error(`Failed to update month plan with id ${id}`)
      }
    })
  }

  async deleteMonthPlan(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['monthPlans', 'weekPlans'], async db => {
      try {
        await db.monthPlans.delete(id)
        invalidatePlanningQueryCache()
      } catch (error) {
        console.error(`Failed to delete month plan with id ${id}:`, error)
        throw new Error(`Failed to delete month plan with id ${id}`)
      }
    })
  }

  async getWeekPlan(weekRef: WeekRef): Promise<WeekPlan | undefined> {
    return userDatabaseOperation('r', ['monthPlans', 'weekPlans'], async db => {
      try {
        return await db.weekPlans.where('weekRef').equals(weekRef).first()
      } catch (error) {
        console.error(`Failed to get week plan for ${weekRef}:`, error)
        throw new Error(`Failed to retrieve week plan for ${weekRef}`)
      }
    })
  }

  async listWeekPlans(): Promise<WeekPlan[]> {
    return userDatabaseOperation('r', ['monthPlans', 'weekPlans'], async db => {
      try {
        return await db.weekPlans.orderBy('weekRef').toArray()
      } catch (error) {
        console.error('Failed to list week plans:', error)
        throw new Error('Failed to retrieve week plans from database')
      }
    })
  }

  async createWeekPlan(data: CreateWeekPlanPayload): Promise<WeekPlan> {
    return userDatabaseOperation('rw', ['monthPlans', 'weekPlans'], async db => {
      try {
        const weekPlan = createPlanningRecord<WeekPlan>(normalizeWeekPlanPayload(data))
        await db.weekPlans.add(toPlain(weekPlan))
        invalidatePlanningQueryCache()
        return weekPlan
      } catch (error) {
        console.error('Failed to create week plan:', error)
        throw new Error('Failed to create week plan in database')
      }
    })
  }

  async updateWeekPlan(id: string, data: UpdateWeekPlanPayload): Promise<WeekPlan> {
    return userDatabaseOperation('rw', ['monthPlans', 'weekPlans'], async db => {
      try {
        const existing = requireRecord(
          await db.weekPlans.get(id),
          `Week plan with id ${id} not found`
        )
        const updated = updatePlanningRecord(existing, normalizeWeekPlanPayload(data, existing))
        await db.weekPlans.put(toPlain(updated))
        invalidatePlanningQueryCache()
        return updated
      } catch (error) {
        console.error(`Failed to update week plan with id ${id}:`, error)
        throw new Error(`Failed to update week plan with id ${id}`)
      }
    })
  }

  async deleteWeekPlan(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['monthPlans', 'weekPlans'], async db => {
      try {
        await db.weekPlans.delete(id)
        invalidatePlanningQueryCache()
      } catch (error) {
        console.error(`Failed to delete week plan with id ${id}:`, error)
        throw new Error(`Failed to delete week plan with id ${id}`)
      }
    })
  }
}

export const periodPlanDexieRepository = new PeriodPlanDexieRepository()
