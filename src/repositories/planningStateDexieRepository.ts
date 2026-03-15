import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { Habit, KeyResult, Tracker } from '@/domain/planning'
import type {
  CreateDailyMeasurementEntryPayload,
  CreateGoalMonthStatePayload,
  CreateInitiativePlanStatePayload,
  CreateMeasurementDayAssignmentPayload,
  CreateMeasurementMonthStatePayload,
  CreateMeasurementWeekStatePayload,
  CreateTodayHiddenStatePayload,
  DailyMeasurementEntry,
  GoalMonthState,
  InitiativePlanState,
  MeasurementDayAssignment,
  MeasurementMonthState,
  MeasurementSubjectType,
  MeasurementWeekState,
  TodayHiddenState,
  TodayHiddenSubjectType,
  UpdateDailyMeasurementEntryPayload,
  UpdateGoalMonthStatePayload,
  UpdateInitiativePlanStatePayload,
  UpdateMeasurementDayAssignmentPayload,
  UpdateMeasurementMonthStatePayload,
  UpdateMeasurementWeekStatePayload,
  UpdateTodayHiddenStatePayload,
} from '@/domain/planningState'
import {
  normalizeDailyMeasurementEntryPayload,
  normalizeGoalMonthStatePayload,
  normalizeInitiativePlanStatePayload,
  normalizeMeasurementDayAssignmentPayload,
  normalizeMeasurementMonthStatePayload,
  normalizeMeasurementWeekStatePayload,
  normalizeTodayHiddenStatePayload,
} from '@/domain/planningState'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import { getUserDatabase } from '@/services/userDatabase.service'
import { getPeriodRefsForDate, getWeekOverlappingMonths } from '@/utils/periods'
import type { PlanningStateRepository } from './planningStateRepository'
import {
  createPlanningRecord,
  toPlain,
  updatePlanningRecord,
} from './planningDexieRepository.shared'

type MeasurementSubject = KeyResult | Habit | Tracker

class PlanningStateDexieRepository implements PlanningStateRepository {
  private get db() {
    return getUserDatabase()
  }

  async getGoalMonthState(monthRef: MonthRef, goalId: string): Promise<GoalMonthState | undefined> {
    try {
      return await this.db.goalMonthStates
        .where('[monthRef+goalId]')
        .equals([monthRef, goalId])
        .first()
    } catch (error) {
      console.error(`Failed to get goal month state for ${goalId} in ${monthRef}:`, error)
      throw new Error(`Failed to retrieve goal month state for ${goalId} in ${monthRef}`)
    }
  }

  async listGoalMonthStates(): Promise<GoalMonthState[]> {
    try {
      return await this.db.goalMonthStates.toArray()
    } catch (error) {
      console.error('Failed to list goal month states:', error)
      throw new Error('Failed to retrieve goal month states from database')
    }
  }

  async listGoalMonthStatesForMonths(monthRefs: MonthRef[]): Promise<GoalMonthState[]> {
    if (monthRefs.length === 0) {
      return []
    }

    try {
      return await this.db.goalMonthStates.where('monthRef').anyOf(monthRefs).toArray()
    } catch (error) {
      console.error('Failed to list goal month states for months:', error)
      throw new Error('Failed to retrieve goal month states from database')
    }
  }

  async upsertGoalMonthState(
    data: CreateGoalMonthStatePayload | UpdateGoalMonthStatePayload
  ): Promise<GoalMonthState> {
    try {
      const existing = await this.findExistingGoalMonthState(data)
      const normalized = normalizeGoalMonthStatePayload(data, existing)
      await this.assertGoalExists(normalized.goalId)

      if (existing) {
        const updated = updatePlanningRecord(existing, normalized)
        await this.db.goalMonthStates.put(toPlain(updated))
        invalidatePlanningQueryCache()
        return updated
      }

      const created = createPlanningRecord<GoalMonthState>(normalized)
      await this.db.goalMonthStates.add(toPlain(created))
      invalidatePlanningQueryCache()
      return created
    } catch (error) {
      console.error('Failed to upsert goal month state:', error)
      throw new Error('Failed to persist goal month state in database')
    }
  }

  async deleteGoalMonthState(monthRef: MonthRef, goalId: string): Promise<void> {
    try {
      const existing = await this.getGoalMonthState(monthRef, goalId)
      if (!existing) return

      await this.db.goalMonthStates.delete(existing.id)
      invalidatePlanningQueryCache()
    } catch (error) {
      console.error(`Failed to delete goal month state for ${goalId} in ${monthRef}:`, error)
      throw new Error(`Failed to delete goal month state for ${goalId} in ${monthRef}`)
    }
  }

  async getMeasurementMonthState(
    monthRef: MonthRef,
    subjectType: MeasurementSubjectType,
    subjectId: string
  ): Promise<MeasurementMonthState | undefined> {
    try {
      return await this.db.measurementMonthStates
        .where('[monthRef+subjectType+subjectId]')
        .equals([monthRef, subjectType, subjectId])
        .first()
    } catch (error) {
      console.error(
        `Failed to get measurement month state for ${subjectType}:${subjectId} in ${monthRef}:`,
        error
      )
      throw new Error(`Failed to retrieve measurement month state for ${subjectType}:${subjectId}`)
    }
  }

  async listMeasurementMonthStates(): Promise<MeasurementMonthState[]> {
    try {
      return await this.db.measurementMonthStates.toArray()
    } catch (error) {
      console.error('Failed to list measurement month states:', error)
      throw new Error('Failed to retrieve measurement month states from database')
    }
  }

  async listMeasurementMonthStatesForMonths(monthRefs: MonthRef[]): Promise<MeasurementMonthState[]> {
    if (monthRefs.length === 0) {
      return []
    }

    try {
      return await this.db.measurementMonthStates.where('monthRef').anyOf(monthRefs).toArray()
    } catch (error) {
      console.error('Failed to list measurement month states for months:', error)
      throw new Error('Failed to retrieve measurement month states from database')
    }
  }

  async listMeasurementMonthStatesForSubject(
    subjectType: MeasurementSubjectType,
    subjectId: string
  ): Promise<MeasurementMonthState[]> {
    try {
      return await this.db.measurementMonthStates
        .where('[subjectType+subjectId]')
        .equals([subjectType, subjectId])
        .toArray()
    } catch (error) {
      console.error(`Failed to list measurement month states for ${subjectType}:${subjectId}:`, error)
      throw new Error(`Failed to retrieve measurement month states for ${subjectType}:${subjectId}`)
    }
  }

  async upsertMeasurementMonthState(
    data: CreateMeasurementMonthStatePayload | UpdateMeasurementMonthStatePayload
  ): Promise<MeasurementMonthState> {
    try {
      const existing = await this.findExistingMeasurementMonthState(data)
      const normalized = normalizeMeasurementMonthStatePayload(data, existing)
      await this.assertMeasurementMonthStateAllowed(normalized)

      if (existing) {
        const updated = updatePlanningRecord(existing, normalized)
        await this.db.measurementMonthStates.put(toPlain(updated))
        invalidatePlanningQueryCache()
        return updated
      }

      const created = createPlanningRecord<MeasurementMonthState>(normalized)
      await this.db.measurementMonthStates.add(toPlain(created))
      invalidatePlanningQueryCache()
      return created
    } catch (error) {
      console.error('Failed to upsert measurement month state:', error)
      throw new Error('Failed to persist measurement month state in database')
    }
  }

  async deleteMeasurementMonthState(
    monthRef: MonthRef,
    subjectType: MeasurementSubjectType,
    subjectId: string
  ): Promise<void> {
    try {
      const existing = await this.getMeasurementMonthState(monthRef, subjectType, subjectId)
      if (!existing) return

      await this.db.measurementMonthStates.delete(existing.id)
      invalidatePlanningQueryCache()
    } catch (error) {
      console.error(
        `Failed to delete measurement month state for ${subjectType}:${subjectId} in ${monthRef}:`,
        error
      )
      throw new Error(`Failed to delete measurement month state for ${subjectType}:${subjectId}`)
    }
  }

  async getMeasurementWeekState(
    weekRef: WeekRef,
    subjectType: MeasurementSubjectType,
    subjectId: string,
    sourceMonthRef?: MonthRef
  ): Promise<MeasurementWeekState | undefined> {
    try {
      if (sourceMonthRef) {
        return await this.db.measurementWeekStates
          .where('[weekRef+sourceMonthRef+subjectType+subjectId]')
          .equals([weekRef, sourceMonthRef, subjectType, subjectId])
          .first()
      }

      const candidate = await this.db.measurementWeekStates
        .where('[weekRef+subjectType+subjectId]')
        .equals([weekRef, subjectType, subjectId])
        .first()

      return candidate?.sourceMonthRef ? undefined : candidate
    } catch (error) {
      console.error(
        `Failed to get measurement week state for ${subjectType}:${subjectId} in ${weekRef}:`,
        error
      )
      throw new Error(`Failed to retrieve measurement week state for ${subjectType}:${subjectId}`)
    }
  }

  async listMeasurementWeekStates(): Promise<MeasurementWeekState[]> {
    try {
      return await this.db.measurementWeekStates.toArray()
    } catch (error) {
      console.error('Failed to list measurement week states:', error)
      throw new Error('Failed to retrieve measurement week states from database')
    }
  }

  async listMeasurementWeekStatesForWeeks(weekRefs: WeekRef[]): Promise<MeasurementWeekState[]> {
    if (weekRefs.length === 0) {
      return []
    }

    try {
      return await this.db.measurementWeekStates.where('weekRef').anyOf(weekRefs).toArray()
    } catch (error) {
      console.error('Failed to list measurement week states for weeks:', error)
      throw new Error('Failed to retrieve measurement week states from database')
    }
  }

  async listMeasurementWeekStatesForSubject(
    subjectType: MeasurementSubjectType,
    subjectId: string
  ): Promise<MeasurementWeekState[]> {
    try {
      return await this.db.measurementWeekStates
        .where('[subjectType+subjectId]')
        .equals([subjectType, subjectId])
        .toArray()
    } catch (error) {
      console.error(`Failed to list measurement week states for ${subjectType}:${subjectId}:`, error)
      throw new Error(`Failed to retrieve measurement week states for ${subjectType}:${subjectId}`)
    }
  }

  async upsertMeasurementWeekState(
    data: CreateMeasurementWeekStatePayload | UpdateMeasurementWeekStatePayload
  ): Promise<MeasurementWeekState> {
    try {
      const existing = await this.findExistingMeasurementWeekState(data)
      const normalized = normalizeMeasurementWeekStatePayload(data, existing)
      await this.assertMeasurementWeekStateAllowed(normalized)

      if (existing) {
        const updated = updatePlanningRecord(existing, normalized)
        await this.db.measurementWeekStates.put(toPlain(updated))
        invalidatePlanningQueryCache()
        return updated
      }

      const created = createPlanningRecord<MeasurementWeekState>(normalized)
      await this.db.measurementWeekStates.add(toPlain(created))
      invalidatePlanningQueryCache()
      return created
    } catch (error) {
      console.error('Failed to upsert measurement week state:', error)
      throw new Error('Failed to persist measurement week state in database')
    }
  }

  async deleteMeasurementWeekState(
    weekRef: WeekRef,
    subjectType: MeasurementSubjectType,
    subjectId: string,
    sourceMonthRef?: MonthRef
  ): Promise<void> {
    try {
      const existing = await this.getMeasurementWeekState(
        weekRef,
        subjectType,
        subjectId,
        sourceMonthRef
      )
      if (!existing) return

      await this.db.measurementWeekStates.delete(existing.id)
      invalidatePlanningQueryCache()
    } catch (error) {
      console.error(
        `Failed to delete measurement week state for ${subjectType}:${subjectId} in ${weekRef}:`,
        error
      )
      throw new Error(`Failed to delete measurement week state for ${subjectType}:${subjectId}`)
    }
  }

  async getMeasurementDayAssignment(
    dayRef: DayRef,
    subjectType: MeasurementSubjectType,
    subjectId: string
  ): Promise<MeasurementDayAssignment | undefined> {
    try {
      return await this.db.measurementDayAssignments
        .where('[dayRef+subjectType+subjectId]')
        .equals([dayRef, subjectType, subjectId])
        .first()
    } catch (error) {
      console.error(
        `Failed to get measurement day assignment for ${subjectType}:${subjectId} on ${dayRef}:`,
        error
      )
      throw new Error(
        `Failed to retrieve measurement day assignment for ${subjectType}:${subjectId}`
      )
    }
  }

  async listMeasurementDayAssignments(): Promise<MeasurementDayAssignment[]> {
    try {
      return await this.db.measurementDayAssignments.toArray()
    } catch (error) {
      console.error('Failed to list measurement day assignments:', error)
      throw new Error('Failed to retrieve measurement day assignments from database')
    }
  }

  async listMeasurementDayAssignmentsForDayRange(
    startDayRef: DayRef,
    endDayRef: DayRef
  ): Promise<MeasurementDayAssignment[]> {
    try {
      return await this.db.measurementDayAssignments
        .where('dayRef')
        .between(startDayRef, endDayRef, true, true)
        .toArray()
    } catch (error) {
      console.error('Failed to list measurement day assignments for day range:', error)
      throw new Error('Failed to retrieve measurement day assignments from database')
    }
  }

  async upsertMeasurementDayAssignment(
    data: CreateMeasurementDayAssignmentPayload | UpdateMeasurementDayAssignmentPayload
  ): Promise<MeasurementDayAssignment> {
    try {
      const existing = await this.findExistingMeasurementDayAssignment(data)
      const normalized = normalizeMeasurementDayAssignmentPayload(data, existing)
      await this.assertMeasurementDayAssignmentAllowed(normalized)

      if (existing) {
        const updated = updatePlanningRecord(existing, normalized)
        await this.db.measurementDayAssignments.put(toPlain(updated))
        invalidatePlanningQueryCache()
        return updated
      }

      const created = createPlanningRecord<MeasurementDayAssignment>(normalized)
      await this.db.measurementDayAssignments.add(toPlain(created))
      invalidatePlanningQueryCache()
      return created
    } catch (error) {
      console.error('Failed to upsert measurement day assignment:', error)
      throw new Error('Failed to persist measurement day assignment in database')
    }
  }

  async deleteMeasurementDayAssignment(
    dayRef: DayRef,
    subjectType: MeasurementSubjectType,
    subjectId: string
  ): Promise<void> {
    try {
      const existing = await this.getMeasurementDayAssignment(dayRef, subjectType, subjectId)
      if (!existing) return

      await this.db.measurementDayAssignments.delete(existing.id)
      invalidatePlanningQueryCache()
    } catch (error) {
      console.error(
        `Failed to delete measurement day assignment for ${subjectType}:${subjectId} on ${dayRef}:`,
        error
      )
      throw new Error(`Failed to delete measurement day assignment for ${subjectType}:${subjectId}`)
    }
  }

  async getDailyMeasurementEntry(
    subjectType: MeasurementSubjectType,
    subjectId: string,
    dayRef: DayRef
  ): Promise<DailyMeasurementEntry | undefined> {
    try {
      return await this.db.dailyMeasurementEntries
        .where('[subjectType+subjectId+dayRef]')
        .equals([subjectType, subjectId, dayRef])
        .first()
    } catch (error) {
      console.error(
        `Failed to get daily measurement entry for ${subjectType}:${subjectId} on ${dayRef}:`,
        error
      )
      throw new Error(`Failed to retrieve daily measurement entry for ${subjectType}:${subjectId}`)
    }
  }

  async listDailyMeasurementEntries(): Promise<DailyMeasurementEntry[]> {
    try {
      return await this.db.dailyMeasurementEntries.toArray()
    } catch (error) {
      console.error('Failed to list daily measurement entries:', error)
      throw new Error('Failed to retrieve daily measurement entries from database')
    }
  }

  async listDailyMeasurementEntriesForDayRange(
    startDayRef: DayRef,
    endDayRef: DayRef
  ): Promise<DailyMeasurementEntry[]> {
    try {
      return await this.db.dailyMeasurementEntries
        .where('dayRef')
        .between(startDayRef, endDayRef, true, true)
        .toArray()
    } catch (error) {
      console.error('Failed to list daily measurement entries for day range:', error)
      throw new Error('Failed to retrieve daily measurement entries from database')
    }
  }

  async upsertDailyMeasurementEntry(
    data: CreateDailyMeasurementEntryPayload | UpdateDailyMeasurementEntryPayload
  ): Promise<DailyMeasurementEntry> {
    try {
      const existing = await this.findExistingDailyMeasurementEntry(data)
      const normalized = normalizeDailyMeasurementEntryPayload(data, existing)
      await this.assertDailyMeasurementEntryAllowed(normalized)

      if (existing) {
        const updated = updatePlanningRecord(existing, normalized)
        await this.db.dailyMeasurementEntries.put(toPlain(updated))
        invalidatePlanningQueryCache()
        return updated
      }

      const created = createPlanningRecord<DailyMeasurementEntry>(normalized)
      await this.db.dailyMeasurementEntries.add(toPlain(created))
      invalidatePlanningQueryCache()
      return created
    } catch (error) {
      console.error('Failed to upsert daily measurement entry:', error)
      throw new Error('Failed to persist daily measurement entry in database')
    }
  }

  async deleteDailyMeasurementEntry(
    subjectType: MeasurementSubjectType,
    subjectId: string,
    dayRef: DayRef
  ): Promise<void> {
    try {
      const existing = await this.getDailyMeasurementEntry(subjectType, subjectId, dayRef)
      if (!existing) return

      await this.db.dailyMeasurementEntries.delete(existing.id)
      invalidatePlanningQueryCache()
    } catch (error) {
      console.error(
        `Failed to delete daily measurement entry for ${subjectType}:${subjectId} on ${dayRef}:`,
        error
      )
      throw new Error(`Failed to delete daily measurement entry for ${subjectType}:${subjectId}`)
    }
  }

  async getTodayHiddenState(
    dayRef: DayRef,
    subjectType: TodayHiddenSubjectType,
    subjectId: string
  ): Promise<TodayHiddenState | undefined> {
    try {
      return await this.db.todayHiddenStates
        .where('[dayRef+subjectType+subjectId]')
        .equals([dayRef, subjectType, subjectId])
        .first()
    } catch (error) {
      console.error(
        `Failed to get Today hidden state for ${subjectType}:${subjectId} on ${dayRef}:`,
        error
      )
      throw new Error(`Failed to retrieve Today hidden state for ${subjectType}:${subjectId}`)
    }
  }

  async listTodayHiddenStates(): Promise<TodayHiddenState[]> {
    try {
      return await this.db.todayHiddenStates.toArray()
    } catch (error) {
      console.error('Failed to list Today hidden states:', error)
      throw new Error('Failed to retrieve Today hidden states from database')
    }
  }

  async listTodayHiddenStatesForDay(dayRef: DayRef): Promise<TodayHiddenState[]> {
    try {
      return await this.db.todayHiddenStates.where('dayRef').equals(dayRef).toArray()
    } catch (error) {
      console.error(`Failed to list Today hidden states for ${dayRef}:`, error)
      throw new Error('Failed to retrieve Today hidden states from database')
    }
  }

  async upsertTodayHiddenState(
    data: CreateTodayHiddenStatePayload | UpdateTodayHiddenStatePayload
  ): Promise<TodayHiddenState> {
    try {
      const existing = await this.findExistingTodayHiddenState(data)
      const normalized = normalizeTodayHiddenStatePayload(data, existing)
      await this.assertTodayHiddenStateAllowed(normalized)

      if (existing) {
        const updated = updatePlanningRecord(existing, normalized)
        await this.db.todayHiddenStates.put(toPlain(updated))
        invalidatePlanningQueryCache()
        return updated
      }

      const created = createPlanningRecord<TodayHiddenState>(normalized)
      await this.db.todayHiddenStates.add(toPlain(created))
      invalidatePlanningQueryCache()
      return created
    } catch (error) {
      console.error('Failed to upsert Today hidden state:', error)
      throw new Error('Failed to persist Today hidden state in database')
    }
  }

  async deleteTodayHiddenState(
    dayRef: DayRef,
    subjectType: TodayHiddenSubjectType,
    subjectId: string
  ): Promise<void> {
    try {
      const existing = await this.getTodayHiddenState(dayRef, subjectType, subjectId)
      if (!existing) return

      await this.db.todayHiddenStates.delete(existing.id)
      invalidatePlanningQueryCache()
    } catch (error) {
      console.error(
        `Failed to delete Today hidden state for ${subjectType}:${subjectId} on ${dayRef}:`,
        error
      )
      throw new Error(`Failed to delete Today hidden state for ${subjectType}:${subjectId}`)
    }
  }

  async getInitiativePlanState(initiativeId: string): Promise<InitiativePlanState | undefined> {
    try {
      return await this.db.initiativePlanStates.where('initiativeId').equals(initiativeId).first()
    } catch (error) {
      console.error(`Failed to get initiative plan state for ${initiativeId}:`, error)
      throw new Error(`Failed to retrieve initiative plan state for ${initiativeId}`)
    }
  }

  async listInitiativePlanStates(): Promise<InitiativePlanState[]> {
    try {
      return await this.db.initiativePlanStates.toArray()
    } catch (error) {
      console.error('Failed to list initiative plan states:', error)
      throw new Error('Failed to retrieve initiative plan states from database')
    }
  }

  async upsertInitiativePlanState(
    data: CreateInitiativePlanStatePayload | UpdateInitiativePlanStatePayload
  ): Promise<InitiativePlanState> {
    try {
      const existing = await this.findExistingInitiativePlanState(data)
      const normalized = normalizeInitiativePlanStatePayload(data, existing)
      await this.assertInitiativeExists(normalized.initiativeId)

      if (existing) {
        const updated = updatePlanningRecord(existing, normalized)
        await this.db.initiativePlanStates.put(toPlain(updated))
        invalidatePlanningQueryCache()
        return updated
      }

      const created = createPlanningRecord<InitiativePlanState>(normalized)
      await this.db.initiativePlanStates.add(toPlain(created))
      invalidatePlanningQueryCache()
      return created
    } catch (error) {
      console.error('Failed to upsert initiative plan state:', error)
      throw new Error('Failed to persist initiative plan state in database')
    }
  }

  async deleteInitiativePlanState(initiativeId: string): Promise<void> {
    try {
      const existing = await this.getInitiativePlanState(initiativeId)
      if (!existing) return

      await this.db.initiativePlanStates.delete(existing.id)
      invalidatePlanningQueryCache()
    } catch (error) {
      console.error(`Failed to delete initiative plan state for ${initiativeId}:`, error)
      throw new Error(`Failed to delete initiative plan state for ${initiativeId}`)
    }
  }

  private async findExistingGoalMonthState(
    data: CreateGoalMonthStatePayload | UpdateGoalMonthStatePayload
  ): Promise<GoalMonthState | undefined> {
    if (!data.monthRef || !data.goalId) {
      return undefined
    }

    return this.getGoalMonthState(data.monthRef, data.goalId)
  }

  private async findExistingMeasurementMonthState(
    data: CreateMeasurementMonthStatePayload | UpdateMeasurementMonthStatePayload
  ): Promise<MeasurementMonthState | undefined> {
    if (!data.monthRef || !data.subjectType || !data.subjectId) {
      return undefined
    }

    return this.getMeasurementMonthState(data.monthRef, data.subjectType, data.subjectId)
  }

  private async findExistingMeasurementWeekState(
    data: CreateMeasurementWeekStatePayload | UpdateMeasurementWeekStatePayload
  ): Promise<MeasurementWeekState | undefined> {
    if (!data.weekRef || !data.subjectType || !data.subjectId) {
      return undefined
    }

    return this.getMeasurementWeekState(
      data.weekRef,
      data.subjectType,
      data.subjectId,
      data.sourceMonthRef
    )
  }

  private async findExistingMeasurementDayAssignment(
    data: CreateMeasurementDayAssignmentPayload | UpdateMeasurementDayAssignmentPayload
  ): Promise<MeasurementDayAssignment | undefined> {
    if (!data.dayRef || !data.subjectType || !data.subjectId) {
      return undefined
    }

    return this.getMeasurementDayAssignment(data.dayRef, data.subjectType, data.subjectId)
  }

  private async findExistingDailyMeasurementEntry(
    data: CreateDailyMeasurementEntryPayload | UpdateDailyMeasurementEntryPayload
  ): Promise<DailyMeasurementEntry | undefined> {
    if (!data.subjectType || !data.subjectId || !data.dayRef) {
      return undefined
    }

    return this.getDailyMeasurementEntry(data.subjectType, data.subjectId, data.dayRef)
  }

  private async findExistingTodayHiddenState(
    data: CreateTodayHiddenStatePayload | UpdateTodayHiddenStatePayload
  ): Promise<TodayHiddenState | undefined> {
    if (!data.dayRef || !data.subjectType || !data.subjectId) {
      return undefined
    }

    return this.getTodayHiddenState(data.dayRef, data.subjectType, data.subjectId)
  }

  private async findExistingInitiativePlanState(
    data: CreateInitiativePlanStatePayload | UpdateInitiativePlanStatePayload
  ): Promise<InitiativePlanState | undefined> {
    if (!data.initiativeId) {
      return undefined
    }

    return this.getInitiativePlanState(data.initiativeId)
  }

  private async assertGoalExists(goalId: string): Promise<void> {
    const goal = await this.db.goals.get(goalId)
    if (!goal) {
      throw new Error(`Goal with id ${goalId} not found`)
    }
  }

  private async resolveMeasurementSubject(
    subjectType: MeasurementSubjectType,
    subjectId: string
  ): Promise<MeasurementSubject> {
    switch (subjectType) {
      case 'keyResult': {
        const keyResult = await this.db.keyResults.get(subjectId)
        if (!keyResult) {
          throw new Error(`KeyResult with id ${subjectId} not found`)
        }

        return keyResult
      }
      case 'habit': {
        const habit = await this.db.habits.get(subjectId)
        if (!habit) {
          throw new Error(`Habit with id ${subjectId} not found`)
        }

        return habit
      }
      case 'tracker': {
        const tracker = await this.db.trackers.get(subjectId)
        if (!tracker) {
          throw new Error(`Tracker with id ${subjectId} not found`)
        }

        return tracker
      }
    }
  }

  private async assertMeasurementMonthStateAllowed(
    normalized: Omit<MeasurementMonthState, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const subject = await this.resolveMeasurementSubject(normalized.subjectType, normalized.subjectId)
    if (normalized.subjectType === 'tracker') {
      if (normalized.successNote) {
        throw new Error('Tracker month state does not support successNote')
      }
      if (normalized.targetOverride) {
        throw new Error('Tracker month state does not support targetOverride')
      }
      return
    }

    if (normalized.subjectType === 'keyResult') {
      const goalMonthState = await this.getGoalMonthState(
        normalized.monthRef,
        (subject as KeyResult).goalId
      )
      if (goalMonthState?.activityState !== 'active') {
        throw new Error('Goal must be active in this month before assigning a KeyResult to it')
      }
    }

    if (
      normalized.targetOverride &&
      'target' in subject &&
      subject.target.kind !== normalized.targetOverride.kind
    ) {
      throw new Error('Measurement month targetOverride must match the base target kind')
    }
  }

  private async assertMeasurementWeekStateAllowed(
    normalized: Omit<MeasurementWeekState, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const subject = await this.resolveMeasurementSubject(
      normalized.subjectType,
      normalized.subjectId
    )

    if (normalized.subjectType === 'tracker' && normalized.successNote) {
      throw new Error('Tracker week state does not support successNote')
    }

    if (subject.cadence === 'monthly' && !normalized.sourceMonthRef) {
      throw new Error('Monthly cadence subjects require sourceMonthRef on week state')
    }

    if (subject.cadence === 'weekly' && normalized.sourceMonthRef) {
      throw new Error('Weekly cadence subjects cannot use sourceMonthRef on week state')
    }

    if (normalized.activityState !== 'active') {
      return
    }

    if (subject.cadence === 'monthly') {
      const monthState = await this.getMeasurementMonthState(
        normalized.sourceMonthRef as MonthRef,
        normalized.subjectType,
        normalized.subjectId
      )
      if (monthState?.activityState !== 'active') {
        throw new Error('Active monthly week state requires an active month state')
      }
      if (normalized.subjectType === 'keyResult') {
        const goalMonthState = await this.getGoalMonthState(
          normalized.sourceMonthRef as MonthRef,
          (subject as KeyResult).goalId
        )
        if (goalMonthState?.activityState !== 'active') {
          throw new Error('Goal must be active in the source month to assign a KeyResult week to it')
        }
      }
      return
    }

    const overlappingMonths = getWeekOverlappingMonths(normalized.weekRef)
    const monthStates = await this.db.measurementMonthStates
      .where('[subjectType+subjectId]')
      .equals([normalized.subjectType, normalized.subjectId])
      .toArray()
    const hasActiveMonth = monthStates.some(
      state => state.activityState === 'active' && overlappingMonths.includes(state.monthRef)
    )

    if (!hasActiveMonth) {
      throw new Error('Active weekly week state requires an active overlapping month state')
    }

    if (normalized.subjectType === 'keyResult') {
      const goalMonthStates = await this.db.goalMonthStates
        .where('goalId')
        .equals((subject as KeyResult).goalId)
        .toArray()
      const hasActiveGoalMonth = goalMonthStates.some(
        s => s.activityState === 'active' && overlappingMonths.includes(s.monthRef)
      )
      if (!hasActiveGoalMonth) {
        throw new Error(
          'Goal must be active in an overlapping month to assign a KeyResult week to it'
        )
      }
    }
  }

  private async assertMeasurementDayAssignmentAllowed(
    normalized: Omit<MeasurementDayAssignment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const subject = await this.resolveMeasurementSubject(
      normalized.subjectType,
      normalized.subjectId
    )
    const refs = getPeriodRefsForDate(normalized.dayRef)

    if (subject.cadence === 'monthly') {
      const weekState = await this.getMeasurementWeekState(
        refs.week,
        normalized.subjectType,
        normalized.subjectId,
        refs.month
      )
      const monthState = await this.getMeasurementMonthState(
        refs.month,
        normalized.subjectType,
        normalized.subjectId
      )
      const hasSpecificDaysPlacement =
        (weekState?.activityState === 'active' && weekState.scheduleScope === 'specific-days') ||
        (monthState?.activityState === 'active' && monthState.scheduleScope === 'specific-days')

      if (!hasSpecificDaysPlacement) {
        throw new Error('Monthly cadence day assignments require a specific-days schedule scope')
      }
      return
    }

    const weekState = await this.getMeasurementWeekState(
      refs.week,
      normalized.subjectType,
      normalized.subjectId
    )
    if (weekState?.activityState !== 'active' || weekState.scheduleScope !== 'specific-days') {
      throw new Error(
        'Weekly cadence day assignments require an active week state with specific-days scope'
      )
    }
  }

  private async assertDailyMeasurementEntryAllowed(
    normalized: Omit<DailyMeasurementEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const subject = await this.resolveMeasurementSubject(
      normalized.subjectType,
      normalized.subjectId
    )

    switch (subject.entryMode) {
      case 'completion':
        if (normalized.value !== null) {
          throw new Error('Completion entries must store null value')
        }
        return
      case 'counter':
        if (
          typeof normalized.value !== 'number' ||
          !Number.isInteger(normalized.value) ||
          normalized.value < 0
        ) {
          throw new Error('Counter entries must store a non-negative integer')
        }
        return
      case 'value':
      case 'rating':
        if (typeof normalized.value !== 'number' || !Number.isFinite(normalized.value)) {
          throw new Error(`${subject.entryMode} entries must store a finite number`)
        }
        return
    }
  }

  private async assertTodayHiddenStateAllowed(
    normalized: Omit<TodayHiddenState, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    if (normalized.subjectType === 'initiative') {
      await this.assertInitiativeExists(normalized.subjectId)
      return
    }

    await this.resolveMeasurementSubject(normalized.subjectType, normalized.subjectId)
  }

  private async assertInitiativeExists(initiativeId: string): Promise<void> {
    const initiative = await this.db.initiatives.get(initiativeId)
    if (!initiative) {
      throw new Error(`Initiative with id ${initiativeId} not found`)
    }
  }
}

export const planningStateDexieRepository = new PlanningStateDexieRepository()
