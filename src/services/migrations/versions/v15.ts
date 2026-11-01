import type { DexieMigration } from './types'
import { MAX_ACTIVE_PRIORITIES } from '@/domain/planning'

export const v15: DexieMigration = {
  version: 15,
  stores: {
    journalEntries: 'id',
    peopleTags: 'id',
    contextTags: 'id',
    emotionLogs: 'id',
    userSettings: 'key',
    valuesDiscoveries: 'id',
    shadowBeliefs: 'id',
    transformativePurposes: 'id',
    thoughtRecords: 'id',
    distortionAssessments: 'id',
    worryTreeEntries: 'id',
    coreBeliefsExplorations: 'id',
    compassionateLetters: 'id',
    positiveDataLogs: 'id',
    behavioralExperiments: 'id',
    behavioralActivations: 'id',
    structuredProblemSolvings: 'id',
    gradedExposureHierarchies: 'id',
    threePathwaysToMeaning: 'id',
    socraticSelfDialogues: 'id',
    mountainRangesOfMeaning: 'id',
    paradoxicalIntentionLabs: 'id',
    dereflectionPractices: 'id',
    tragicOptimisms: 'id',
    attitudinalShifts: 'id',
    legacyLetters: 'id',
    ifsParts: 'id',
    ifsPartsMaps: 'id',
    ifsUnblendingSessions: 'id',
    ifsDirectAccessSessions: 'id',
    ifsTrailheadEntries: 'id',
    ifsProtectorAppreciations: 'id',
    ifsExileWitnessings: 'id',
    ifsSelfEnergyCheckIns: 'id',
    ifsPartsDialogues: 'id',
    ifsDailyCheckIns: 'id',
    ifsConstellations: 'id',
    lifeAreas: 'id, isActive',
    lifeAreaAssessments: 'id, createdAt, *lifeAreaIds',
    priorities: 'id, status, *years, order, *lifeAreaIds',
    goals: 'id, status, isActive, *priorityIds, *lifeAreaIds',
    keyResults: 'id, goalId, status, isActive, cadence, entryMode',
    habits: 'id, status, isActive, cadence, entryMode, *priorityIds, *lifeAreaIds',
    trackers: 'id, status, isActive, cadence, entryMode, *priorityIds, *lifeAreaIds',
    initiatives: 'id, status, isActive, goalId, *priorityIds, *lifeAreaIds',
    monthPlans: 'id, &monthRef',
    weekPlans: 'id, &weekRef',
    goalMonthStates: 'id, monthRef, goalId, activityState, &[monthRef+goalId]',
    measurementMonthStates:
      'id, monthRef, subjectType, subjectId, activityState, scheduleScope, &[monthRef+subjectType+subjectId], [subjectType+subjectId]',
    measurementWeekStates:
      'id, weekRef, sourceMonthRef, subjectType, subjectId, activityState, scheduleScope, [weekRef+subjectType+subjectId], [weekRef+sourceMonthRef+subjectType+subjectId], [subjectType+subjectId]',
    measurementDayAssignments:
      'id, dayRef, subjectType, subjectId, &[dayRef+subjectType+subjectId], [subjectType+subjectId]',
    dailyMeasurementEntries:
      'id, subjectType, subjectId, dayRef, &[subjectType+subjectId+dayRef], [subjectType+subjectId]',
    todayHiddenStates:
      'id, dayRef, subjectType, subjectId, &[dayRef+subjectType+subjectId], [subjectType+subjectId]',
    initiativePlanStates: 'id, &initiativeId, monthRef, weekRef, dayRef',
    periodReflections: 'id, periodType, periodRef, &[periodType+periodRef]',
    periodObjectReflections:
      'id, periodType, periodRef, subjectType, subjectId, &[periodType+periodRef+subjectType+subjectId], [subjectType+subjectId]',
    assessmentAttempts: 'id, assessmentId',
    assessmentResponses: 'id, attemptId, itemId, [attemptId+itemId]',
    drafts: '&key',
    weeklyReflections: 'id, &weekRef',
    monthlyReflections: 'id, &monthRef',
    userProfiles: 'id, createdAt',
    profileBuildLogs: 'id, timestamp, success',
  },
  upgrade: async trans => {
    const yearRefPattern = /^\d{4}$/
    const isValidYearRef = (value: unknown): value is string => {
      if (typeof value !== 'string' || !yearRefPattern.test(value)) return false
      const numeric = Number(value)
      return Number.isInteger(numeric) && numeric >= 1 && numeric <= 9999
    }
    const fallbackYear = (record: Record<string, unknown>): string => {
      if (isValidYearRef(record.year)) return record.year
      if (typeof record.createdAt === 'string') {
        const maybeYear = record.createdAt.slice(0, 4)
        if (isValidYearRef(maybeYear)) return maybeYear
      }
      return new Date().getFullYear().toString()
    }

    const priorities = (await trans.table('priorities').toArray()) as Record<string, unknown>[]
    const activeCandidates = priorities
      .filter(record => record.isActive !== false)
      .sort(
        (left, right) =>
          fallbackYear(left).localeCompare(fallbackYear(right)) ||
          String(left.title ?? '').localeCompare(String(right.title ?? '')) ||
          String(left.createdAt ?? '').localeCompare(String(right.createdAt ?? ''))
      )
    const activeIds = new Set(
      activeCandidates
        .slice(0, MAX_ACTIVE_PRIORITIES)
        .map(record => record.id)
        .filter((id): id is string => typeof id === 'string')
    )
    const activeOrderById = new Map([...activeIds].map((id, index) => [id, index + 1]))

    await trans
      .table('priorities')
      .toCollection()
      .modify((record: Record<string, unknown>) => {
        const year = fallbackYear(record)
        const id = typeof record.id === 'string' ? record.id : ''
        const isActive = activeIds.has(id)
        record.years = [year]
        record.status = isActive ? 'active' : 'paused'
        if (isActive) {
          record.order = activeOrderById.get(id)
        } else {
          delete record.order
        }
        record.progressSignals = []
        record.riskSignals = []
        delete record.year
        delete record.isActive
        delete record.closingReflection
      })
  },
}
