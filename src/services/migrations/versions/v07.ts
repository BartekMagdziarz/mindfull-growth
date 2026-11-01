import type { DexieMigration } from './types'
import type { PeriodObjectReflection } from '@/domain/planningState'

export const v07: DexieMigration = {
  version: 7,
  stores: {
    journalEntries: 'id',
    peopleTags: 'id',
    contextTags: 'id',
    emotionLogs: 'id',
    userSettings: 'key',
    wheelOfLifeSnapshots: 'id, createdAt',
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
    priorities: 'id, year, isActive, *lifeAreaIds',
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
    initiativePlanStates: 'id, &initiativeId, monthRef, weekRef, dayRef',
    periodReflections: 'id, periodType, periodRef, &[periodType+periodRef]',
    periodObjectReflections:
      'id, periodType, periodRef, subjectType, subjectId, &[periodType+periodRef+subjectType+subjectId], [subjectType+subjectId]',
    assessmentAttempts: 'id, assessmentId',
    assessmentResponses: 'id, attemptId, itemId, [attemptId+itemId]',
    drafts: '&key',
  },
  upgrade: async trans => {
    await trans.table('keyResults').clear()
    await trans.table('habits').clear()
    await trans.table('trackers').clear()
    await trans.table('cadencedMonthStates').clear()
    await trans.table('cadencedWeekStates').clear()
    await trans.table('cadencedDayAssignments').clear()
    await trans.table('trackerMonthStates').clear()
    await trans.table('trackerWeekStates').clear()
    await trans.table('trackerEntries').clear()

    const reflections = await trans.table('periodObjectReflections').toArray()
    for (const reflection of reflections as Array<
      PeriodObjectReflection & { subjectType: string }
    >) {
      if (
        reflection.subjectType === 'keyResult' ||
        reflection.subjectType === 'habit' ||
        reflection.subjectType === 'tracker'
      ) {
        await trans.table('periodObjectReflections').delete(reflection.id)
      }
    }
  },
}
