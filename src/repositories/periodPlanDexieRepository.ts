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
import { getUserDatabase } from '@/services/userDatabase.service'
import type { PeriodPlanRepository } from './periodPlanRepository'
import {
  createPlanningRecord,
  requireRecord,
  toPlain,
  updatePlanningRecord,
} from './planningDexieRepository.shared'

class PeriodPlanDexieRepository implements PeriodPlanRepository {
  private get db() {
    return getUserDatabase()
  }

  async getMonthPlan(monthRef: MonthRef): Promise<MonthPlan | undefined> {
    try {
      return await this.db.monthPlans.where('monthRef').equals(monthRef).first()
    } catch (error) {
      console.error(`Failed to get month plan for ${monthRef}:`, error)
      throw new Error(`Failed to retrieve month plan for ${monthRef}`)
    }
  }

  async listMonthPlans(): Promise<MonthPlan[]> {
    try {
      return await this.db.monthPlans.orderBy('monthRef').toArray()
    } catch (error) {
      console.error('Failed to list month plans:', error)
      throw new Error('Failed to retrieve month plans from database')
    }
  }

  async createMonthPlan(data: CreateMonthPlanPayload): Promise<MonthPlan> {
    try {
      const monthPlan = createPlanningRecord<MonthPlan>(normalizeMonthPlanPayload(data))
      await this.db.monthPlans.add(toPlain(monthPlan))
      return monthPlan
    } catch (error) {
      console.error('Failed to create month plan:', error)
      throw new Error('Failed to create month plan in database')
    }
  }

  async updateMonthPlan(id: string, data: UpdateMonthPlanPayload): Promise<MonthPlan> {
    try {
      const existing = requireRecord(
        await this.db.monthPlans.get(id),
        `Month plan with id ${id} not found`
      )
      const updated = updatePlanningRecord(existing, normalizeMonthPlanPayload(data, existing))
      await this.db.monthPlans.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update month plan with id ${id}:`, error)
      throw new Error(`Failed to update month plan with id ${id}`)
    }
  }

  async deleteMonthPlan(id: string): Promise<void> {
    try {
      await this.db.monthPlans.delete(id)
    } catch (error) {
      console.error(`Failed to delete month plan with id ${id}:`, error)
      throw new Error(`Failed to delete month plan with id ${id}`)
    }
  }

  async getWeekPlan(weekRef: WeekRef): Promise<WeekPlan | undefined> {
    try {
      return await this.db.weekPlans.where('weekRef').equals(weekRef).first()
    } catch (error) {
      console.error(`Failed to get week plan for ${weekRef}:`, error)
      throw new Error(`Failed to retrieve week plan for ${weekRef}`)
    }
  }

  async listWeekPlans(): Promise<WeekPlan[]> {
    try {
      return await this.db.weekPlans.orderBy('weekRef').toArray()
    } catch (error) {
      console.error('Failed to list week plans:', error)
      throw new Error('Failed to retrieve week plans from database')
    }
  }

  async createWeekPlan(data: CreateWeekPlanPayload): Promise<WeekPlan> {
    try {
      const weekPlan = createPlanningRecord<WeekPlan>(normalizeWeekPlanPayload(data))
      await this.db.weekPlans.add(toPlain(weekPlan))
      return weekPlan
    } catch (error) {
      console.error('Failed to create week plan:', error)
      throw new Error('Failed to create week plan in database')
    }
  }

  async updateWeekPlan(id: string, data: UpdateWeekPlanPayload): Promise<WeekPlan> {
    try {
      const existing = requireRecord(
        await this.db.weekPlans.get(id),
        `Week plan with id ${id} not found`
      )
      const updated = updatePlanningRecord(existing, normalizeWeekPlanPayload(data, existing))
      await this.db.weekPlans.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update week plan with id ${id}:`, error)
      throw new Error(`Failed to update week plan with id ${id}`)
    }
  }

  async deleteWeekPlan(id: string): Promise<void> {
    try {
      await this.db.weekPlans.delete(id)
    } catch (error) {
      console.error(`Failed to delete week plan with id ${id}:`, error)
      throw new Error(`Failed to delete week plan with id ${id}`)
    }
  }
}

export const periodPlanDexieRepository = new PeriodPlanDexieRepository()
