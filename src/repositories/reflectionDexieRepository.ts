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
import {
  normalizePeriodObjectReflectionPayload,
  normalizePeriodReflectionPayload,
} from '@/domain/planningState'
import { getUserDatabase } from '@/services/userDatabase.service'
import type { ReflectionRepository } from './reflectionRepository'
import {
  createPlanningRecord,
  toPlain,
  updatePlanningRecord,
} from './planningDexieRepository.shared'

class ReflectionDexieRepository implements ReflectionRepository {
  private get db() {
    return getUserDatabase()
  }

  async getPeriodReflection(
    periodType: ReflectionPeriodType,
    periodRef: MonthRef | WeekRef
  ): Promise<PeriodReflection | undefined> {
    try {
      return await this.db.periodReflections
        .where('[periodType+periodRef]')
        .equals([periodType, periodRef])
        .first()
    } catch (error) {
      console.error(`Failed to get period reflection for ${periodType}:${periodRef}:`, error)
      throw new Error(`Failed to retrieve period reflection for ${periodType}:${periodRef}`)
    }
  }

  async listPeriodReflections(): Promise<PeriodReflection[]> {
    try {
      return await this.db.periodReflections.toArray()
    } catch (error) {
      console.error('Failed to list period reflections:', error)
      throw new Error('Failed to retrieve period reflections from database')
    }
  }

  async upsertPeriodReflection(
    data: CreatePeriodReflectionPayload | UpdatePeriodReflectionPayload
  ): Promise<PeriodReflection> {
    try {
      const existing = await this.findExistingPeriodReflection(data)
      const normalized = normalizePeriodReflectionPayload(data, existing)

      if (existing) {
        const updated = updatePlanningRecord(existing, normalized)
        await this.db.periodReflections.put(toPlain(updated))
        return updated
      }

      const created = createPlanningRecord<PeriodReflection>(normalized)
      await this.db.periodReflections.add(toPlain(created))
      return created
    } catch (error) {
      console.error('Failed to upsert period reflection:', error)
      throw new Error('Failed to persist period reflection in database')
    }
  }

  async deletePeriodReflection(
    periodType: ReflectionPeriodType,
    periodRef: MonthRef | WeekRef
  ): Promise<void> {
    try {
      const existing = await this.getPeriodReflection(periodType, periodRef)
      if (!existing) return

      await this.db.periodReflections.delete(existing.id)
    } catch (error) {
      console.error(`Failed to delete period reflection for ${periodType}:${periodRef}:`, error)
      throw new Error(`Failed to delete period reflection for ${periodType}:${periodRef}`)
    }
  }

  async getPeriodObjectReflection(
    periodType: ReflectionPeriodType,
    periodRef: MonthRef | WeekRef,
    subjectType: ReflectionSubjectType,
    subjectId: string
  ): Promise<PeriodObjectReflection | undefined> {
    try {
      return await this.db.periodObjectReflections
        .where('[periodType+periodRef+subjectType+subjectId]')
        .equals([periodType, periodRef, subjectType, subjectId])
        .first()
    } catch (error) {
      console.error(
        `Failed to get period object reflection for ${subjectType}:${subjectId} in ${periodType}:${periodRef}:`,
        error
      )
      throw new Error(`Failed to retrieve period object reflection for ${subjectType}:${subjectId}`)
    }
  }

  async listPeriodObjectReflections(): Promise<PeriodObjectReflection[]> {
    try {
      return await this.db.periodObjectReflections.toArray()
    } catch (error) {
      console.error('Failed to list period object reflections:', error)
      throw new Error('Failed to retrieve period object reflections from database')
    }
  }

  async upsertPeriodObjectReflection(
    data: CreatePeriodObjectReflectionPayload | UpdatePeriodObjectReflectionPayload
  ): Promise<PeriodObjectReflection> {
    try {
      const existing = await this.findExistingPeriodObjectReflection(data)
      const normalized = normalizePeriodObjectReflectionPayload(data, existing)
      await this.assertReflectionSubjectExists(normalized.subjectType, normalized.subjectId)

      if (existing) {
        const updated = updatePlanningRecord(existing, normalized)
        await this.db.periodObjectReflections.put(toPlain(updated))
        return updated
      }

      const created = createPlanningRecord<PeriodObjectReflection>(normalized)
      await this.db.periodObjectReflections.add(toPlain(created))
      return created
    } catch (error) {
      console.error('Failed to upsert period object reflection:', error)
      throw new Error('Failed to persist period object reflection in database')
    }
  }

  async deletePeriodObjectReflection(
    periodType: ReflectionPeriodType,
    periodRef: MonthRef | WeekRef,
    subjectType: ReflectionSubjectType,
    subjectId: string
  ): Promise<void> {
    try {
      const existing = await this.getPeriodObjectReflection(
        periodType,
        periodRef,
        subjectType,
        subjectId
      )
      if (!existing) return

      await this.db.periodObjectReflections.delete(existing.id)
    } catch (error) {
      console.error(
        `Failed to delete period object reflection for ${subjectType}:${subjectId} in ${periodType}:${periodRef}:`,
        error
      )
      throw new Error(`Failed to delete period object reflection for ${subjectType}:${subjectId}`)
    }
  }

  private async findExistingPeriodReflection(
    data: CreatePeriodReflectionPayload | UpdatePeriodReflectionPayload
  ): Promise<PeriodReflection | undefined> {
    if (!data.periodType || !data.periodRef) {
      return undefined
    }

    return this.getPeriodReflection(data.periodType, data.periodRef)
  }

  private async findExistingPeriodObjectReflection(
    data: CreatePeriodObjectReflectionPayload | UpdatePeriodObjectReflectionPayload
  ): Promise<PeriodObjectReflection | undefined> {
    if (!data.periodType || !data.periodRef || !data.subjectType || !data.subjectId) {
      return undefined
    }

    return this.getPeriodObjectReflection(
      data.periodType,
      data.periodRef,
      data.subjectType,
      data.subjectId
    )
  }

  private async assertReflectionSubjectExists(
    subjectType: ReflectionSubjectType,
    subjectId: string
  ): Promise<void> {
    switch (subjectType) {
      case 'goal':
        if (!(await this.db.goals.get(subjectId))) {
          throw new Error(`Goal with id ${subjectId} not found`)
        }
        return
      case 'keyResult':
        if (!(await this.db.keyResults.get(subjectId))) {
          throw new Error(`KeyResult with id ${subjectId} not found`)
        }
        return
      case 'habit':
        if (!(await this.db.habits.get(subjectId))) {
          throw new Error(`Habit with id ${subjectId} not found`)
        }
        return
      case 'tracker':
        if (!(await this.db.trackers.get(subjectId))) {
          throw new Error(`Tracker with id ${subjectId} not found`)
        }
        return
      case 'initiative':
        if (!(await this.db.initiatives.get(subjectId))) {
          throw new Error(`Initiative with id ${subjectId} not found`)
        }
    }
  }
}

export const reflectionDexieRepository = new ReflectionDexieRepository()
