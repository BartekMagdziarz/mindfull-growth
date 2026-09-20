import type { MonthRef, WeekRef } from '@/domain/period'
import type {
  CreateMonthlyReflectionPayload,
  CreateWeeklyReflectionPayload,
  MonthlyReflection,
  UpdateMonthlyReflectionPayload,
  UpdateWeeklyReflectionPayload,
  WeeklyReflection,
} from '@/domain/reflection'

export interface StructuredReflectionRepository {
  // Weekly
  getWeekly(weekRef: WeekRef): Promise<WeeklyReflection | undefined>
  listWeekly(): Promise<WeeklyReflection[]>
  /** Weekly reflections for the given week refs (missing weeks are simply absent). */
  listWeeklyByRefs(weekRefs: readonly WeekRef[]): Promise<WeeklyReflection[]>
  upsertWeekly(
    data: CreateWeeklyReflectionPayload | UpdateWeeklyReflectionPayload
  ): Promise<WeeklyReflection>
  deleteWeekly(weekRef: WeekRef): Promise<void>

  // Monthly
  getMonthly(monthRef: MonthRef): Promise<MonthlyReflection | undefined>
  listMonthly(): Promise<MonthlyReflection[]>
  upsertMonthly(
    data: CreateMonthlyReflectionPayload | UpdateMonthlyReflectionPayload
  ): Promise<MonthlyReflection>
  deleteMonthly(monthRef: MonthRef): Promise<void>

  // Queries
  getWeeklyForMonth(monthRef: MonthRef): Promise<WeeklyReflection[]>
}
