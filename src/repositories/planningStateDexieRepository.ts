import type { MonthRef, WeekRef } from '@/domain/period'
import type { Habit, KeyResult, Tracker } from '@/domain/planning'
import type {
  CadencedDayAssignment,
  CadencedMonthState,
  CadencedWeekState,
  CreateCadencedDayAssignmentPayload,
  CreateCadencedMonthStatePayload,
  CreateCadencedWeekStatePayload,
  CreateGoalMonthStatePayload,
  CreateInitiativePlanStatePayload,
  CreateTrackerEntryPayload,
  CreateTrackerMonthStatePayload,
  CreateTrackerWeekStatePayload,
  GoalMonthState,
  InitiativePlanState,
  PlanningSubjectType,
  TrackerEntry,
  TrackerMonthState,
  TrackerWeekState,
  UpdateCadencedDayAssignmentPayload,
  UpdateCadencedMonthStatePayload,
  UpdateCadencedWeekStatePayload,
  UpdateGoalMonthStatePayload,
  UpdateInitiativePlanStatePayload,
  UpdateTrackerEntryPayload,
  UpdateTrackerMonthStatePayload,
  UpdateTrackerWeekStatePayload,
} from '@/domain/planningState'
import {
  normalizeCadencedDayAssignmentPayload,
  normalizeCadencedMonthStatePayload,
  normalizeCadencedWeekStatePayload,
  normalizeGoalMonthStatePayload,
  normalizeInitiativePlanStatePayload,
  normalizeTrackerEntryPayload,
  normalizeTrackerMonthStatePayload,
  normalizeTrackerWeekStatePayload,
} from '@/domain/planningState'
import { getUserDatabase } from '@/services/userDatabase.service'
import { getPeriodRefsForDate, getWeekOverlappingMonths } from '@/utils/periods'
import type { PlanningStateRepository } from './planningStateRepository'
import {
  createPlanningRecord,
  toPlain,
  updatePlanningRecord,
} from './planningDexieRepository.shared'

type CadencedSubject = KeyResult | Habit

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
        return updated
      }

      const created = createPlanningRecord<GoalMonthState>(normalized)
      await this.db.goalMonthStates.add(toPlain(created))
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
    } catch (error) {
      console.error(`Failed to delete goal month state for ${goalId} in ${monthRef}:`, error)
      throw new Error(`Failed to delete goal month state for ${goalId} in ${monthRef}`)
    }
  }

  async getCadencedMonthState(
    monthRef: MonthRef,
    subjectType: PlanningSubjectType,
    subjectId: string
  ): Promise<CadencedMonthState | undefined> {
    try {
      return await this.db.cadencedMonthStates
        .where('[monthRef+subjectType+subjectId]')
        .equals([monthRef, subjectType, subjectId])
        .first()
    } catch (error) {
      console.error(
        `Failed to get cadenced month state for ${subjectType}:${subjectId} in ${monthRef}:`,
        error
      )
      throw new Error(`Failed to retrieve cadenced month state for ${subjectType}:${subjectId}`)
    }
  }

  async listCadencedMonthStates(): Promise<CadencedMonthState[]> {
    try {
      return await this.db.cadencedMonthStates.toArray()
    } catch (error) {
      console.error('Failed to list cadenced month states:', error)
      throw new Error('Failed to retrieve cadenced month states from database')
    }
  }

  async upsertCadencedMonthState(
    data: CreateCadencedMonthStatePayload | UpdateCadencedMonthStatePayload
  ): Promise<CadencedMonthState> {
    try {
      const existing = await this.findExistingCadencedMonthState(data)
      const normalized = normalizeCadencedMonthStatePayload(data, existing)
      await this.assertCadencedMonthStateAllowed(normalized)

      if (existing) {
        const updated = updatePlanningRecord(existing, normalized)
        await this.db.cadencedMonthStates.put(toPlain(updated))
        return updated
      }

      const created = createPlanningRecord<CadencedMonthState>(normalized)
      await this.db.cadencedMonthStates.add(toPlain(created))
      return created
    } catch (error) {
      console.error('Failed to upsert cadenced month state:', error)
      throw new Error('Failed to persist cadenced month state in database')
    }
  }

  async deleteCadencedMonthState(
    monthRef: MonthRef,
    subjectType: PlanningSubjectType,
    subjectId: string
  ): Promise<void> {
    try {
      const existing = await this.getCadencedMonthState(monthRef, subjectType, subjectId)
      if (!existing) return

      await this.db.cadencedMonthStates.delete(existing.id)
    } catch (error) {
      console.error(
        `Failed to delete cadenced month state for ${subjectType}:${subjectId} in ${monthRef}:`,
        error
      )
      throw new Error(`Failed to delete cadenced month state for ${subjectType}:${subjectId}`)
    }
  }

  async getCadencedWeekState(
    weekRef: WeekRef,
    subjectType: PlanningSubjectType,
    subjectId: string,
    sourceMonthRef?: MonthRef
  ): Promise<CadencedWeekState | undefined> {
    try {
      if (sourceMonthRef) {
        return await this.db.cadencedWeekStates
          .where('[weekRef+sourceMonthRef+subjectType+subjectId]')
          .equals([weekRef, sourceMonthRef, subjectType, subjectId])
          .first()
      }

      const candidate = await this.db.cadencedWeekStates
        .where('[weekRef+subjectType+subjectId]')
        .equals([weekRef, subjectType, subjectId])
        .first()

      return candidate?.sourceMonthRef ? undefined : candidate
    } catch (error) {
      console.error(
        `Failed to get cadenced week state for ${subjectType}:${subjectId} in ${weekRef}:`,
        error
      )
      throw new Error(`Failed to retrieve cadenced week state for ${subjectType}:${subjectId}`)
    }
  }

  async listCadencedWeekStates(): Promise<CadencedWeekState[]> {
    try {
      return await this.db.cadencedWeekStates.toArray()
    } catch (error) {
      console.error('Failed to list cadenced week states:', error)
      throw new Error('Failed to retrieve cadenced week states from database')
    }
  }

  async upsertCadencedWeekState(
    data: CreateCadencedWeekStatePayload | UpdateCadencedWeekStatePayload
  ): Promise<CadencedWeekState> {
    try {
      const existing = await this.findExistingCadencedWeekState(data)
      const normalized = normalizeCadencedWeekStatePayload(data, existing)
      await this.assertCadencedWeekStateAllowed(normalized)

      if (existing) {
        const updated = updatePlanningRecord(existing, normalized)
        await this.db.cadencedWeekStates.put(toPlain(updated))
        return updated
      }

      const created = createPlanningRecord<CadencedWeekState>(normalized)
      await this.db.cadencedWeekStates.add(toPlain(created))
      return created
    } catch (error) {
      console.error('Failed to upsert cadenced week state:', error)
      throw new Error('Failed to persist cadenced week state in database')
    }
  }

  async deleteCadencedWeekState(
    weekRef: WeekRef,
    subjectType: PlanningSubjectType,
    subjectId: string,
    sourceMonthRef?: MonthRef
  ): Promise<void> {
    try {
      const existing = await this.getCadencedWeekState(
        weekRef,
        subjectType,
        subjectId,
        sourceMonthRef
      )
      if (!existing) return

      await this.db.cadencedWeekStates.delete(existing.id)
    } catch (error) {
      console.error(
        `Failed to delete cadenced week state for ${subjectType}:${subjectId} in ${weekRef}:`,
        error
      )
      throw new Error(`Failed to delete cadenced week state for ${subjectType}:${subjectId}`)
    }
  }

  async getCadencedDayAssignment(
    dayRef: CadencedDayAssignment['dayRef'],
    subjectType: PlanningSubjectType,
    subjectId: string
  ): Promise<CadencedDayAssignment | undefined> {
    try {
      return await this.db.cadencedDayAssignments
        .where('[dayRef+subjectType+subjectId]')
        .equals([dayRef, subjectType, subjectId])
        .first()
    } catch (error) {
      console.error(
        `Failed to get cadenced day assignment for ${subjectType}:${subjectId} on ${dayRef}:`,
        error
      )
      throw new Error(`Failed to retrieve cadenced day assignment for ${subjectType}:${subjectId}`)
    }
  }

  async listCadencedDayAssignments(): Promise<CadencedDayAssignment[]> {
    try {
      return await this.db.cadencedDayAssignments.toArray()
    } catch (error) {
      console.error('Failed to list cadenced day assignments:', error)
      throw new Error('Failed to retrieve cadenced day assignments from database')
    }
  }

  async upsertCadencedDayAssignment(
    data: CreateCadencedDayAssignmentPayload | UpdateCadencedDayAssignmentPayload
  ): Promise<CadencedDayAssignment> {
    try {
      const existing = await this.findExistingCadencedDayAssignment(data)
      const normalized = normalizeCadencedDayAssignmentPayload(data, existing)
      await this.assertCadencedDayAssignmentAllowed(normalized)

      if (existing) {
        const updated = updatePlanningRecord(existing, normalized)
        await this.db.cadencedDayAssignments.put(toPlain(updated))
        return updated
      }

      const created = createPlanningRecord<CadencedDayAssignment>(normalized)
      await this.db.cadencedDayAssignments.add(toPlain(created))
      return created
    } catch (error) {
      console.error('Failed to upsert cadenced day assignment:', error)
      throw new Error('Failed to persist cadenced day assignment in database')
    }
  }

  async deleteCadencedDayAssignment(
    dayRef: CadencedDayAssignment['dayRef'],
    subjectType: PlanningSubjectType,
    subjectId: string
  ): Promise<void> {
    try {
      const existing = await this.getCadencedDayAssignment(dayRef, subjectType, subjectId)
      if (!existing) return

      await this.db.cadencedDayAssignments.delete(existing.id)
    } catch (error) {
      console.error(
        `Failed to delete cadenced day assignment for ${subjectType}:${subjectId} on ${dayRef}:`,
        error
      )
      throw new Error(`Failed to delete cadenced day assignment for ${subjectType}:${subjectId}`)
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
        return updated
      }

      const created = createPlanningRecord<InitiativePlanState>(normalized)
      await this.db.initiativePlanStates.add(toPlain(created))
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
    } catch (error) {
      console.error(`Failed to delete initiative plan state for ${initiativeId}:`, error)
      throw new Error(`Failed to delete initiative plan state for ${initiativeId}`)
    }
  }

  async getTrackerMonthState(
    monthRef: MonthRef,
    trackerId: string
  ): Promise<TrackerMonthState | undefined> {
    try {
      return await this.db.trackerMonthStates
        .where('[monthRef+trackerId]')
        .equals([monthRef, trackerId])
        .first()
    } catch (error) {
      console.error(`Failed to get tracker month state for ${trackerId} in ${monthRef}:`, error)
      throw new Error(`Failed to retrieve tracker month state for ${trackerId}`)
    }
  }

  async listTrackerMonthStates(): Promise<TrackerMonthState[]> {
    try {
      return await this.db.trackerMonthStates.toArray()
    } catch (error) {
      console.error('Failed to list tracker month states:', error)
      throw new Error('Failed to retrieve tracker month states from database')
    }
  }

  async upsertTrackerMonthState(
    data: CreateTrackerMonthStatePayload | UpdateTrackerMonthStatePayload
  ): Promise<TrackerMonthState> {
    try {
      const existing = await this.findExistingTrackerMonthState(data)
      const normalized = normalizeTrackerMonthStatePayload(data, existing)
      await this.assertTrackerExists(normalized.trackerId)

      if (existing) {
        const updated = updatePlanningRecord(existing, normalized)
        await this.db.trackerMonthStates.put(toPlain(updated))
        return updated
      }

      const created = createPlanningRecord<TrackerMonthState>(normalized)
      await this.db.trackerMonthStates.add(toPlain(created))
      return created
    } catch (error) {
      console.error('Failed to upsert tracker month state:', error)
      throw new Error('Failed to persist tracker month state in database')
    }
  }

  async deleteTrackerMonthState(monthRef: MonthRef, trackerId: string): Promise<void> {
    try {
      const existing = await this.getTrackerMonthState(monthRef, trackerId)
      if (!existing) return

      await this.db.trackerMonthStates.delete(existing.id)
    } catch (error) {
      console.error(`Failed to delete tracker month state for ${trackerId} in ${monthRef}:`, error)
      throw new Error(`Failed to delete tracker month state for ${trackerId}`)
    }
  }

  async getTrackerWeekState(
    weekRef: WeekRef,
    trackerId: string
  ): Promise<TrackerWeekState | undefined> {
    try {
      return await this.db.trackerWeekStates
        .where('[weekRef+trackerId]')
        .equals([weekRef, trackerId])
        .first()
    } catch (error) {
      console.error(`Failed to get tracker week state for ${trackerId} in ${weekRef}:`, error)
      throw new Error(`Failed to retrieve tracker week state for ${trackerId}`)
    }
  }

  async listTrackerWeekStates(): Promise<TrackerWeekState[]> {
    try {
      return await this.db.trackerWeekStates.toArray()
    } catch (error) {
      console.error('Failed to list tracker week states:', error)
      throw new Error('Failed to retrieve tracker week states from database')
    }
  }

  async upsertTrackerWeekState(
    data: CreateTrackerWeekStatePayload | UpdateTrackerWeekStatePayload
  ): Promise<TrackerWeekState> {
    try {
      const existing = await this.findExistingTrackerWeekState(data)
      const normalized = normalizeTrackerWeekStatePayload(data, existing)
      await this.assertTrackerWeekStateAllowed(normalized)

      if (existing) {
        const updated = updatePlanningRecord(existing, normalized)
        await this.db.trackerWeekStates.put(toPlain(updated))
        return updated
      }

      const created = createPlanningRecord<TrackerWeekState>(normalized)
      await this.db.trackerWeekStates.add(toPlain(created))
      return created
    } catch (error) {
      console.error('Failed to upsert tracker week state:', error)
      throw new Error('Failed to persist tracker week state in database')
    }
  }

  async deleteTrackerWeekState(weekRef: WeekRef, trackerId: string): Promise<void> {
    try {
      const existing = await this.getTrackerWeekState(weekRef, trackerId)
      if (!existing) return

      await this.db.trackerWeekStates.delete(existing.id)
    } catch (error) {
      console.error(`Failed to delete tracker week state for ${trackerId} in ${weekRef}:`, error)
      throw new Error(`Failed to delete tracker week state for ${trackerId}`)
    }
  }

  async getTrackerEntry(
    trackerId: string,
    periodRef: TrackerEntry['periodRef']
  ): Promise<TrackerEntry | undefined> {
    try {
      return await this.db.trackerEntries
        .where('[trackerId+periodRef]')
        .equals([trackerId, periodRef])
        .first()
    } catch (error) {
      console.error(`Failed to get tracker entry for ${trackerId} at ${periodRef}:`, error)
      throw new Error(`Failed to retrieve tracker entry for ${trackerId}`)
    }
  }

  async listTrackerEntries(): Promise<TrackerEntry[]> {
    try {
      return await this.db.trackerEntries.toArray()
    } catch (error) {
      console.error('Failed to list tracker entries:', error)
      throw new Error('Failed to retrieve tracker entries from database')
    }
  }

  async upsertTrackerEntry(
    data: CreateTrackerEntryPayload | UpdateTrackerEntryPayload
  ): Promise<TrackerEntry> {
    try {
      const existing = await this.findExistingTrackerEntry(data)
      const normalized = normalizeTrackerEntryPayload(data, existing)
      await this.assertTrackerEntryAllowed(normalized)

      if (existing) {
        const updated = updatePlanningRecord(existing, normalized)
        await this.db.trackerEntries.put(toPlain(updated))
        return updated
      }

      const created = createPlanningRecord<TrackerEntry>(normalized)
      await this.db.trackerEntries.add(toPlain(created))
      return created
    } catch (error) {
      console.error('Failed to upsert tracker entry:', error)
      throw new Error('Failed to persist tracker entry in database')
    }
  }

  async deleteTrackerEntry(trackerId: string, periodRef: TrackerEntry['periodRef']): Promise<void> {
    try {
      const existing = await this.getTrackerEntry(trackerId, periodRef)
      if (!existing) return

      await this.db.trackerEntries.delete(existing.id)
    } catch (error) {
      console.error(`Failed to delete tracker entry for ${trackerId} at ${periodRef}:`, error)
      throw new Error(`Failed to delete tracker entry for ${trackerId}`)
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

  private async findExistingCadencedMonthState(
    data: CreateCadencedMonthStatePayload | UpdateCadencedMonthStatePayload
  ): Promise<CadencedMonthState | undefined> {
    if (!data.monthRef || !data.subjectType || !data.subjectId) {
      return undefined
    }

    return this.getCadencedMonthState(data.monthRef, data.subjectType, data.subjectId)
  }

  private async findExistingCadencedWeekState(
    data: CreateCadencedWeekStatePayload | UpdateCadencedWeekStatePayload
  ): Promise<CadencedWeekState | undefined> {
    if (!data.weekRef || !data.subjectType || !data.subjectId) {
      return undefined
    }

    return this.getCadencedWeekState(
      data.weekRef,
      data.subjectType,
      data.subjectId,
      data.sourceMonthRef
    )
  }

  private async findExistingCadencedDayAssignment(
    data: CreateCadencedDayAssignmentPayload | UpdateCadencedDayAssignmentPayload
  ): Promise<CadencedDayAssignment | undefined> {
    if (!data.dayRef || !data.subjectType || !data.subjectId) {
      return undefined
    }

    return this.getCadencedDayAssignment(data.dayRef, data.subjectType, data.subjectId)
  }

  private async findExistingInitiativePlanState(
    data: CreateInitiativePlanStatePayload | UpdateInitiativePlanStatePayload
  ): Promise<InitiativePlanState | undefined> {
    if (!data.initiativeId) {
      return undefined
    }

    return this.getInitiativePlanState(data.initiativeId)
  }

  private async findExistingTrackerMonthState(
    data: CreateTrackerMonthStatePayload | UpdateTrackerMonthStatePayload
  ): Promise<TrackerMonthState | undefined> {
    if (!data.monthRef || !data.trackerId) {
      return undefined
    }

    return this.getTrackerMonthState(data.monthRef, data.trackerId)
  }

  private async findExistingTrackerWeekState(
    data: CreateTrackerWeekStatePayload | UpdateTrackerWeekStatePayload
  ): Promise<TrackerWeekState | undefined> {
    if (!data.weekRef || !data.trackerId) {
      return undefined
    }

    return this.getTrackerWeekState(data.weekRef, data.trackerId)
  }

  private async findExistingTrackerEntry(
    data: CreateTrackerEntryPayload | UpdateTrackerEntryPayload
  ): Promise<TrackerEntry | undefined> {
    if (!data.trackerId || !data.periodRef) {
      return undefined
    }

    return this.getTrackerEntry(data.trackerId, data.periodRef)
  }

  private async assertGoalExists(goalId: string): Promise<void> {
    const goal = await this.db.goals.get(goalId)
    if (!goal) {
      throw new Error(`Goal with id ${goalId} not found`)
    }
  }

  private async resolveCadencedSubject(
    subjectType: PlanningSubjectType,
    subjectId: string
  ): Promise<CadencedSubject> {
    if (subjectType === 'keyResult') {
      const keyResult = await this.db.keyResults.get(subjectId)
      if (!keyResult) {
        throw new Error(`KeyResult with id ${subjectId} not found`)
      }

      return keyResult
    }

    const habit = await this.db.habits.get(subjectId)
    if (!habit) {
      throw new Error(`Habit with id ${subjectId} not found`)
    }

    return habit
  }

  private async assertCadencedMonthStateAllowed(
    normalized: Omit<CadencedMonthState, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const subject = await this.resolveCadencedSubject(normalized.subjectType, normalized.subjectId)
    if (subject.cadence === 'weekly' && normalized.planningMode !== undefined) {
      throw new Error(
        'Weekly cadence subjects cannot store canonical planning config on month state'
      )
    }
  }

  private async assertCadencedWeekStateAllowed(
    normalized: Omit<CadencedWeekState, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const subject = await this.resolveCadencedSubject(normalized.subjectType, normalized.subjectId)

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
      const monthState = await this.getCadencedMonthState(
        normalized.sourceMonthRef as MonthRef,
        normalized.subjectType,
        normalized.subjectId
      )
      if (monthState?.activityState !== 'active') {
        throw new Error('Active monthly week state requires an active month state')
      }
      return
    }

    const overlappingMonths = getWeekOverlappingMonths(normalized.weekRef)
    const monthStates = await this.db.cadencedMonthStates
      .where('[subjectType+subjectId]')
      .equals([normalized.subjectType, normalized.subjectId])
      .toArray()
    const hasActiveMonth = monthStates.some(
      state => state.activityState === 'active' && overlappingMonths.includes(state.monthRef)
    )

    if (!hasActiveMonth) {
      throw new Error('Active weekly week state requires an active overlapping month state')
    }
  }

  private async assertCadencedDayAssignmentAllowed(
    normalized: Omit<CadencedDayAssignment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const subject = await this.resolveCadencedSubject(normalized.subjectType, normalized.subjectId)
    const dayRefs = getPeriodRefsForDate(normalized.dayRef)

    if (subject.cadence === 'monthly') {
      const monthState = await this.getCadencedMonthState(
        dayRefs.month,
        normalized.subjectType,
        normalized.subjectId
      )
      if (monthState?.activityState !== 'active') {
        throw new Error('Cadenced day assignments require an active month state')
      }
      return
    }

    const weekState = await this.getCadencedWeekState(
      dayRefs.week,
      normalized.subjectType,
      normalized.subjectId
    )
    if (weekState?.activityState !== 'active') {
      throw new Error('Weekly cadence day assignments require an active week state')
    }
  }

  private async assertInitiativeExists(initiativeId: string): Promise<void> {
    const initiative = await this.db.initiatives.get(initiativeId)
    if (!initiative) {
      throw new Error(`Initiative with id ${initiativeId} not found`)
    }
  }

  private async assertTrackerExists(trackerId: string): Promise<Tracker> {
    const tracker = await this.db.trackers.get(trackerId)
    if (!tracker) {
      throw new Error(`Tracker with id ${trackerId} not found`)
    }

    return tracker
  }

  private async assertTrackerWeekStateAllowed(
    normalized: Omit<TrackerWeekState, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    await this.assertTrackerExists(normalized.trackerId)
    if (normalized.activityState !== 'active') {
      return
    }

    const overlappingMonths = getWeekOverlappingMonths(normalized.weekRef)
    const monthStates = await this.db.trackerMonthStates.toArray()
    const hasActiveMonth = monthStates.some(
      state =>
        state.trackerId === normalized.trackerId &&
        state.activityState === 'active' &&
        overlappingMonths.includes(state.monthRef)
    )

    if (!hasActiveMonth) {
      throw new Error('Active tracker week state requires an active overlapping month state')
    }
  }

  private async assertTrackerEntryAllowed(
    normalized: Omit<TrackerEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const tracker = await this.assertTrackerExists(normalized.trackerId)
    if (tracker.entryMode !== normalized.periodType) {
      throw new Error('TrackerEntry.periodType must match Tracker.entryMode')
    }
  }
}

export const planningStateDexieRepository = new PlanningStateDexieRepository()
