import type { DexieMigration } from './types'

export const v12: DexieMigration = {
  version: 12,
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
  },
  upgrade: async trans => {
    // Migrate weekly reflections: map old dimension fields to new
    await trans
      .table('weeklyReflections')
      .toCollection()
      .modify((record: Record<string, unknown>) => {
        // Map old fields to new equivalents
        record.productivityRating = record.focusRating ?? null
        record.connectionRating = record.socialConnectionRating ?? null
        // Invert stressLevel (high stress = low calm): calm = 6 - stress
        const stress = record.stressLevelRating as number | null
        record.calmRating = stress != null ? 6 - stress : null

        // New fields default to null
        record.physicalIntensityRating = null
        record.taskLoadRating = null
        record.emotionalIntensityRating = null
        record.socialIntensityRating = null
        record.engagementRating = null
        record.emotionalRegulationRating = null
        record.selfCareRating = null

        // Remove old fields
        delete record.focusRating
        delete record.socialConnectionRating
        delete record.stressLevelRating
      })

    // Migrate monthly reflections: map old dimension fields to new
    await trans
      .table('monthlyReflections')
      .toCollection()
      .modify((record: Record<string, unknown>) => {
        // Map alignment → coherence
        record.coherenceRating = record.alignmentRating ?? null

        // New fields default to null
        record.balanceRating = null
        record.agencyRating = null

        // Remove old fields
        delete record.motivationRating
        delete record.lifeSatisfactionRating
        delete record.alignmentRating
      })
  },
}
