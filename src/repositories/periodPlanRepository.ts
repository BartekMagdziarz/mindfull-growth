import type { MonthRef, WeekRef } from '@/domain/period'
import type {
  CreateMonthPlanPayload,
  CreateWeekPlanPayload,
  MonthPlan,
  UpdateMonthPlanPayload,
  UpdateWeekPlanPayload,
  WeekPlan,
} from '@/domain/planningState'

export interface PeriodPlanRepository {
  getMonthPlan(monthRef: MonthRef): Promise<MonthPlan | undefined>
  listMonthPlans(): Promise<MonthPlan[]>
  createMonthPlan(data: CreateMonthPlanPayload): Promise<MonthPlan>
  updateMonthPlan(id: string, data: UpdateMonthPlanPayload): Promise<MonthPlan>
  deleteMonthPlan(id: string): Promise<void>

  getWeekPlan(weekRef: WeekRef): Promise<WeekPlan | undefined>
  listWeekPlans(): Promise<WeekPlan[]>
  createWeekPlan(data: CreateWeekPlanPayload): Promise<WeekPlan>
  updateWeekPlan(id: string, data: UpdateWeekPlanPayload): Promise<WeekPlan>
  deleteWeekPlan(id: string): Promise<void>
}
