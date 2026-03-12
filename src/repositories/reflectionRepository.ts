import type { MonthRef, WeekRef } from '@/domain/period'
import type {
  CreatePeriodObjectReflectionPayload,
  CreatePeriodReflectionPayload,
  PeriodObjectReflection,
  PeriodReflection,
  ReflectionPeriodType,
  ReflectionSubjectType,
  UpdatePeriodObjectReflectionPayload,
  UpdatePeriodReflectionPayload,
} from '@/domain/planningState'

export interface ReflectionRepository {
  getPeriodReflection(
    periodType: ReflectionPeriodType,
    periodRef: MonthRef | WeekRef
  ): Promise<PeriodReflection | undefined>
  listPeriodReflections(): Promise<PeriodReflection[]>
  upsertPeriodReflection(
    data: CreatePeriodReflectionPayload | UpdatePeriodReflectionPayload
  ): Promise<PeriodReflection>
  deletePeriodReflection(
    periodType: ReflectionPeriodType,
    periodRef: MonthRef | WeekRef
  ): Promise<void>

  getPeriodObjectReflection(
    periodType: ReflectionPeriodType,
    periodRef: MonthRef | WeekRef,
    subjectType: ReflectionSubjectType,
    subjectId: string
  ): Promise<PeriodObjectReflection | undefined>
  listPeriodObjectReflections(): Promise<PeriodObjectReflection[]>
  upsertPeriodObjectReflection(
    data: CreatePeriodObjectReflectionPayload | UpdatePeriodObjectReflectionPayload
  ): Promise<PeriodObjectReflection>
  deletePeriodObjectReflection(
    periodType: ReflectionPeriodType,
    periodRef: MonthRef | WeekRef,
    subjectType: ReflectionSubjectType,
    subjectId: string
  ): Promise<void>
}
