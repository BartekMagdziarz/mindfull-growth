import Dexie, { type Table } from 'dexie'
import type { JournalEntry } from '@/domain/journal'
import type { PeopleTag, ContextTag } from '@/domain/tag'
import type { EmotionLog } from '@/domain/emotionLog'
import type {
  WheelOfLifeSnapshot,
  ValuesDiscovery,
  ShadowBeliefs,
  TransformativePurpose,
  ThoughtRecord,
  DistortionAssessment,
  WorryTreeEntry,
  CoreBeliefsExploration,
  CompassionateLetter,
  PositiveDataLog,
  BehavioralExperiment,
  BehavioralActivation,
  StructuredProblemSolving,
  GradedExposureHierarchy,
  ThreePathwaysToMeaning,
  SocraticSelfDialogue,
  MountainRangeOfMeaning,
  ParadoxicalIntentionLab,
  DereflectionPractice,
  TragicOptimism,
  AttitudinalShift,
  LegacyLetter,
  IFSPart,
  IFSPartsMap,
  IFSUnblendingSession,
  IFSDirectAccessSession,
  IFSTrailheadEntry,
  IFSProtectorAppreciation,
  IFSExileWitnessing,
  IFSSelfEnergyCheckIn,
  IFSPartsDialogue,
  IFSDailyCheckIn,
  IFSConstellation,
} from '@/domain/exercises'
import type { LifeArea } from '@/domain/lifeArea'
import type { LifeAreaAssessment } from '@/domain/lifeAreaAssessment'
import type { AssessmentAttempt, AssessmentResponse } from '@/domain/assessments'
import type { Goal, Habit, Initiative, KeyResult, Priority, Tracker } from '@/domain/planning'
import type {
  DailyMeasurementEntry,
  GoalMonthState,
  InitiativePlanState,
  MeasurementDayAssignment,
  MeasurementMonthState,
  MeasurementWeekState,
  MonthPlan,
  PeriodObjectReflection,
  PeriodReflection,
  WeekPlan,
} from '@/domain/planningState'

export class UserDatabase extends Dexie {
  journalEntries!: Table<JournalEntry, string>
  peopleTags!: Table<PeopleTag, string>
  contextTags!: Table<ContextTag, string>
  emotionLogs!: Table<EmotionLog, string>
  userSettings!: Table<{ key: string; value: string }, string>

  wheelOfLifeSnapshots!: Table<WheelOfLifeSnapshot, string>
  valuesDiscoveries!: Table<ValuesDiscovery, string>
  shadowBeliefs!: Table<ShadowBeliefs, string>
  transformativePurposes!: Table<TransformativePurpose, string>
  thoughtRecords!: Table<ThoughtRecord, string>
  distortionAssessments!: Table<DistortionAssessment, string>
  worryTreeEntries!: Table<WorryTreeEntry, string>
  coreBeliefsExplorations!: Table<CoreBeliefsExploration, string>
  compassionateLetters!: Table<CompassionateLetter, string>
  positiveDataLogs!: Table<PositiveDataLog, string>
  behavioralExperiments!: Table<BehavioralExperiment, string>
  behavioralActivations!: Table<BehavioralActivation, string>
  structuredProblemSolvings!: Table<StructuredProblemSolving, string>
  gradedExposureHierarchies!: Table<GradedExposureHierarchy, string>
  threePathwaysToMeaning!: Table<ThreePathwaysToMeaning, string>
  socraticSelfDialogues!: Table<SocraticSelfDialogue, string>
  mountainRangesOfMeaning!: Table<MountainRangeOfMeaning, string>
  paradoxicalIntentionLabs!: Table<ParadoxicalIntentionLab, string>
  dereflectionPractices!: Table<DereflectionPractice, string>
  tragicOptimisms!: Table<TragicOptimism, string>
  attitudinalShifts!: Table<AttitudinalShift, string>
  legacyLetters!: Table<LegacyLetter, string>
  ifsParts!: Table<IFSPart, string>
  ifsPartsMaps!: Table<IFSPartsMap, string>
  ifsUnblendingSessions!: Table<IFSUnblendingSession, string>
  ifsDirectAccessSessions!: Table<IFSDirectAccessSession, string>
  ifsTrailheadEntries!: Table<IFSTrailheadEntry, string>
  ifsProtectorAppreciations!: Table<IFSProtectorAppreciation, string>
  ifsExileWitnessings!: Table<IFSExileWitnessing, string>
  ifsSelfEnergyCheckIns!: Table<IFSSelfEnergyCheckIn, string>
  ifsPartsDialogues!: Table<IFSPartsDialogue, string>
  ifsDailyCheckIns!: Table<IFSDailyCheckIn, string>
  ifsConstellations!: Table<IFSConstellation, string>

  lifeAreas!: Table<LifeArea, string>
  lifeAreaAssessments!: Table<LifeAreaAssessment, string>
  priorities!: Table<Priority, string>
  goals!: Table<Goal, string>
  keyResults!: Table<KeyResult, string>
  habits!: Table<Habit, string>
  trackers!: Table<Tracker, string>
  initiatives!: Table<Initiative, string>
  monthPlans!: Table<MonthPlan, string>
  weekPlans!: Table<WeekPlan, string>
  goalMonthStates!: Table<GoalMonthState, string>
  measurementMonthStates!: Table<MeasurementMonthState, string>
  measurementWeekStates!: Table<MeasurementWeekState, string>
  measurementDayAssignments!: Table<MeasurementDayAssignment, string>
  dailyMeasurementEntries!: Table<DailyMeasurementEntry, string>
  initiativePlanStates!: Table<InitiativePlanState, string>
  periodReflections!: Table<PeriodReflection, string>
  periodObjectReflections!: Table<PeriodObjectReflection, string>
  assessmentAttempts!: Table<AssessmentAttempt, string>
  assessmentResponses!: Table<AssessmentResponse, string>
  drafts!: Table<{ key: string; data: string; updatedAt: string }, string>

  constructor(databaseName: string) {
    super(databaseName)

    this.version(1).stores({
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
      assessmentAttempts: 'id',
      assessmentResponses: 'id, attemptId, questionId',
      drafts: '&key',
    })

    this.version(2).stores({
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
      assessmentAttempts: 'id, assessmentId',
      assessmentResponses: 'id, attemptId, itemId, [attemptId+itemId]',
      drafts: '&key',
    })

    this.version(3).stores({
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
      assessmentAttempts: 'id, assessmentId',
      assessmentResponses: 'id, attemptId, itemId, [attemptId+itemId]',
      drafts: '&key',
    })

    this.version(4).stores({
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
      keyResults: 'id, goalId, status, isActive, cadence, kind',
      habits: 'id, status, isActive, cadence, kind, *priorityIds, *lifeAreaIds',
      trackers: 'id, status, isActive, analysisPeriod, entryMode, kind, *priorityIds, *lifeAreaIds',
      initiatives: 'id, isActive, goalId, *priorityIds, *lifeAreaIds',
      assessmentAttempts: 'id, assessmentId',
      assessmentResponses: 'id, attemptId, itemId, [attemptId+itemId]',
      drafts: '&key',
    })

    this.version(5).stores({
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
      keyResults: 'id, goalId, status, isActive, cadence, kind',
      habits: 'id, status, isActive, cadence, kind, *priorityIds, *lifeAreaIds',
      trackers: 'id, status, isActive, analysisPeriod, entryMode, kind, *priorityIds, *lifeAreaIds',
      initiatives: 'id, isActive, goalId, *priorityIds, *lifeAreaIds',
      monthPlans: 'id, &monthRef',
      weekPlans: 'id, &weekRef',
      goalMonthStates: 'id, monthRef, goalId, activityState, &[monthRef+goalId]',
      cadencedMonthStates:
        'id, monthRef, subjectType, subjectId, activityState, &[monthRef+subjectType+subjectId], [subjectType+subjectId]',
      cadencedWeekStates:
        'id, weekRef, sourceMonthRef, subjectType, subjectId, activityState, [weekRef+subjectType+subjectId], [weekRef+sourceMonthRef+subjectType+subjectId], [subjectType+subjectId]',
      cadencedDayAssignments:
        'id, dayRef, subjectType, subjectId, &[dayRef+subjectType+subjectId], [subjectType+subjectId]',
      initiativePlanStates: 'id, &initiativeId, monthRef, weekRef, dayRef',
      trackerMonthStates: 'id, monthRef, trackerId, activityState, &[monthRef+trackerId]',
      trackerWeekStates: 'id, weekRef, trackerId, activityState, &[weekRef+trackerId]',
      trackerEntries:
        'id, trackerId, periodType, periodRef, &[trackerId+periodRef], [periodType+periodRef]',
      periodReflections: 'id, periodType, periodRef, &[periodType+periodRef]',
      periodObjectReflections:
        'id, periodType, periodRef, subjectType, subjectId, &[periodType+periodRef+subjectType+subjectId], [subjectType+subjectId]',
      assessmentAttempts: 'id, assessmentId',
      assessmentResponses: 'id, attemptId, itemId, [attemptId+itemId]',
      drafts: '&key',
    })

    this.version(6)
      .stores({
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
        keyResults: 'id, goalId, status, isActive, cadence, kind',
        habits: 'id, status, isActive, cadence, kind, *priorityIds, *lifeAreaIds',
        trackers:
          'id, status, isActive, analysisPeriod, entryMode, kind, *priorityIds, *lifeAreaIds',
        initiatives: 'id, status, isActive, goalId, *priorityIds, *lifeAreaIds',
        monthPlans: 'id, &monthRef',
        weekPlans: 'id, &weekRef',
        goalMonthStates: 'id, monthRef, goalId, activityState, &[monthRef+goalId]',
        cadencedMonthStates:
          'id, monthRef, subjectType, subjectId, activityState, &[monthRef+subjectType+subjectId], [subjectType+subjectId]',
        cadencedWeekStates:
          'id, weekRef, sourceMonthRef, subjectType, subjectId, activityState, [weekRef+subjectType+subjectId], [weekRef+sourceMonthRef+subjectType+subjectId], [subjectType+subjectId]',
        cadencedDayAssignments:
          'id, dayRef, subjectType, subjectId, &[dayRef+subjectType+subjectId], [subjectType+subjectId]',
        initiativePlanStates: 'id, &initiativeId, monthRef, weekRef, dayRef',
        trackerMonthStates: 'id, monthRef, trackerId, activityState, &[monthRef+trackerId]',
        trackerWeekStates: 'id, weekRef, trackerId, activityState, &[weekRef+trackerId]',
        trackerEntries:
          'id, trackerId, periodType, periodRef, &[trackerId+periodRef], [periodType+periodRef]',
        periodReflections: 'id, periodType, periodRef, &[periodType+periodRef]',
        periodObjectReflections:
          'id, periodType, periodRef, subjectType, subjectId, &[periodType+periodRef+subjectType+subjectId], [subjectType+subjectId]',
        assessmentAttempts: 'id, assessmentId',
        assessmentResponses: 'id, attemptId, itemId, [attemptId+itemId]',
        drafts: '&key',
      })
      .upgrade(async (trans) => {
        const initiatives = await trans.table('initiatives').toArray()

        for (const initiative of initiatives as Array<Initiative & { status?: Initiative['status'] }>) {
          if (initiative.status) {
            continue
          }

          await trans.table('initiatives').put({
            ...initiative,
            status: 'open',
          })
        }
      })

    this.version(7)
      .stores({
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
      })
      .upgrade(async (trans) => {
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
      })
  }
}

let currentDb: UserDatabase | null = null
let currentUserId: string | null = null

export function getUserDatabase(): UserDatabase {
  if (!currentDb) {
    throw new Error('No user database connected. User must be logged in.')
  }
  return currentDb
}

export function isUserDatabaseConnected(): boolean {
  return currentDb !== null
}

export async function connectUserDatabase(userId: string): Promise<UserDatabase> {
  if (currentUserId === userId && currentDb) {
    return currentDb
  }

  if (currentDb) {
    currentDb.close()
    currentDb = null
    currentUserId = null
  }

  const db = new UserDatabase(`MindfullGrowthDB_simplify_${userId}`)
  await db.open()

  currentDb = db
  currentUserId = userId

  return db
}

export async function disconnectUserDatabase(): Promise<void> {
  if (currentDb) {
    currentDb.close()
    currentDb = null
    currentUserId = null
  }
}

export function getCurrentUserId(): string | null {
  return currentUserId
}
