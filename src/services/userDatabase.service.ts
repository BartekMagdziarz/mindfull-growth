import Dexie, { type Table } from 'dexie'
import type { JournalEntry } from '@/domain/journal'
import type { PeopleTag, ContextTag } from '@/domain/tag'
import type { EmotionLog } from '@/domain/emotionLog'
import type {
  ValuesDiscovery,
  ValueMap,
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
import { MAX_ACTIVE_PRIORITIES, type Goal, type Habit, type Initiative, type KeyResult, type Priority, type Tracker, type WeeklyIntention } from '@/domain/planning'
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
  TodayHiddenState,
  WeekPlan,
} from '@/domain/planningState'
import type { WeeklyReflection, MonthlyReflection } from '@/domain/reflection'
import type { UserProfile, ProfileBuildLogEntry } from '@/domain/userProfile'
import type { ProfilePeriodSummary } from '@/domain/profilePeriodSummary'
import type { AnnualPlan } from '@/domain/annualPlan'
import type { ExerciseCompletion } from '@/domain/exerciseCompletion'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import { getPeriodRefsForDate } from '@/utils/periods'

/**
 * v23 completion-backfill sources — FROZEN at authoring time (2026-07-05).
 * Dexie upgrades must behave identically forever; never edit this list after
 * ship (new exercises log completions live and need no backfill). A unit test
 * cross-checks it against the exercise catalog.
 *
 * Deliberately absent: `ifsParts` (shared parts registry enriched by many IFS
 * exercises — its rows are not completions; parts-mapping backfills from
 * `ifsPartsMaps`). `lifeAreaAssessments` (wheel-of-life, full assessments
 * only) and `assessmentAttempts` (completed attempts only) are special-cased
 * in the upgrade body.
 */
export const V23_BACKFILL_SOURCES: ReadonlyArray<{
  slug: string
  table: string
  /** Timestamp field to use as `completedAt`; defaults to `createdAt`. */
  timestampField?: 'updatedAt'
}> = [
  { slug: 'values', table: 'valuesDiscoveries' },
  { slug: 'value-map', table: 'valueMaps' },
  { slug: 'shadow-beliefs', table: 'shadowBeliefs' },
  { slug: 'purpose', table: 'transformativePurposes' },
  { slug: 'thought-record', table: 'thoughtRecords' },
  { slug: 'cognitive-distortions', table: 'distortionAssessments' },
  { slug: 'worry-tree', table: 'worryTreeEntries' },
  { slug: 'core-beliefs', table: 'coreBeliefsExplorations' },
  { slug: 'compassionate-letter', table: 'compassionateLetters' },
  // Entries accumulate into an existing log via updates, so the last
  // touch — not the log's creation — is the completion signal.
  { slug: 'positive-data-log', table: 'positiveDataLogs', timestampField: 'updatedAt' },
  { slug: 'behavioral-experiment', table: 'behavioralExperiments' },
  { slug: 'behavioral-activation', table: 'behavioralActivations' },
  { slug: 'structured-problem-solving', table: 'structuredProblemSolvings' },
  { slug: 'graded-exposure', table: 'gradedExposureHierarchies' },
  { slug: 'three-pathways', table: 'threePathwaysToMeaning' },
  { slug: 'socratic-dialogue', table: 'socraticSelfDialogues' },
  { slug: 'mountain-range', table: 'mountainRangesOfMeaning' },
  { slug: 'paradoxical-intention', table: 'paradoxicalIntentionLabs' },
  { slug: 'dereflection', table: 'dereflectionPractices' },
  { slug: 'tragic-optimism', table: 'tragicOptimisms' },
  { slug: 'attitudinal-shift', table: 'attitudinalShifts' },
  { slug: 'legacy-letter', table: 'legacyLetters' },
  { slug: 'parts-mapping', table: 'ifsPartsMaps' },
  { slug: 'unblending', table: 'ifsUnblendingSessions' },
  { slug: 'direct-access', table: 'ifsDirectAccessSessions' },
  { slug: 'trailhead', table: 'ifsTrailheadEntries' },
  { slug: 'protector-appreciation', table: 'ifsProtectorAppreciations' },
  { slug: 'exile-witnessing', table: 'ifsExileWitnessings' },
  { slug: 'self-energy', table: 'ifsSelfEnergyCheckIns' },
  { slug: 'parts-dialogue', table: 'ifsPartsDialogues' },
  { slug: 'daily-ifs-checkin', table: 'ifsDailyCheckIns' },
  { slug: 'constellation', table: 'ifsConstellations' },
]

export class UserDatabase extends Dexie {
  journalEntries!: Table<JournalEntry, string>
  peopleTags!: Table<PeopleTag, string>
  contextTags!: Table<ContextTag, string>
  emotionLogs!: Table<EmotionLog, string>
  userSettings!: Table<{ key: string; value: string }, string>

  valuesDiscoveries!: Table<ValuesDiscovery, string>
  valueMaps!: Table<ValueMap, string>
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
  exerciseCompletions!: Table<ExerciseCompletion, string>
  microExerciseEntries!: Table<MicroExerciseEntry, string>

  lifeAreas!: Table<LifeArea, string>
  lifeAreaAssessments!: Table<LifeAreaAssessment, string>
  priorities!: Table<Priority, string>
  goals!: Table<Goal, string>
  keyResults!: Table<KeyResult, string>
  habits!: Table<Habit, string>
  trackers!: Table<Tracker, string>
  weeklyIntentions!: Table<WeeklyIntention, string>
  initiatives!: Table<Initiative, string>
  monthPlans!: Table<MonthPlan, string>
  weekPlans!: Table<WeekPlan, string>
  goalMonthStates!: Table<GoalMonthState, string>
  measurementMonthStates!: Table<MeasurementMonthState, string>
  measurementWeekStates!: Table<MeasurementWeekState, string>
  measurementDayAssignments!: Table<MeasurementDayAssignment, string>
  dailyMeasurementEntries!: Table<DailyMeasurementEntry, string>
  todayHiddenStates!: Table<TodayHiddenState, string>
  initiativePlanStates!: Table<InitiativePlanState, string>
  periodReflections!: Table<PeriodReflection, string>
  periodObjectReflections!: Table<PeriodObjectReflection, string>
  assessmentAttempts!: Table<AssessmentAttempt, string>
  assessmentResponses!: Table<AssessmentResponse, string>
  drafts!: Table<{ key: string; data: string; updatedAt: string }, string>
  weeklyReflections!: Table<WeeklyReflection, string>
  monthlyReflections!: Table<MonthlyReflection, string>
  userProfiles!: Table<UserProfile, string>
  profileBuildLogs!: Table<ProfileBuildLogEntry, string>
  profilePeriodSummaries!: Table<ProfilePeriodSummary, string>
  annualPlans!: Table<AnnualPlan, string>

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
      .upgrade(async trans => {
        const initiatives = await trans.table('initiatives').toArray()

        for (const initiative of initiatives as Array<
          Initiative & { status?: Initiative['status'] }
        >) {
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
      .upgrade(async trans => {
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

    this.version(8).stores({
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
      todayHiddenStates:
        'id, dayRef, subjectType, subjectId, &[dayRef+subjectType+subjectId], [subjectType+subjectId]',
      initiativePlanStates: 'id, &initiativeId, monthRef, weekRef, dayRef',
      periodReflections: 'id, periodType, periodRef, &[periodType+periodRef]',
      periodObjectReflections:
        'id, periodType, periodRef, subjectType, subjectId, &[periodType+periodRef+subjectType+subjectId], [subjectType+subjectId]',
      assessmentAttempts: 'id, assessmentId',
      assessmentResponses: 'id, attemptId, itemId, [attemptId+itemId]',
      drafts: '&key',
    })

    this.version(9)
      .stores({
        journalEntries: 'id',
        peopleTags: 'id',
        contextTags: 'id',
        emotionLogs: 'id',
        userSettings: 'key',
        wheelOfLifeSnapshots: null,
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
      })
      .upgrade(async trans => {
        await trans.table('wheelOfLifeSnapshots').clear()
      })

    this.version(10).stores({
      journalEntries: 'id',
      peopleTags: 'id',
      contextTags: 'id',
      emotionLogs: 'id',
      userSettings: 'key',
      wheelOfLifeSnapshots: null,
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
    })

    this.version(11).stores({
      journalEntries: 'id',
      peopleTags: 'id',
      contextTags: 'id',
      emotionLogs: 'id',
      userSettings: 'key',
      wheelOfLifeSnapshots: null,
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
    })

    this.version(12)
      .stores({
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
      })
      .upgrade(async (trans) => {
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
      })

    this.version(13).stores({
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
      userProfiles: 'id, createdAt',
      profileBuildLogs: 'id, timestamp, success',
    })

    this.version(14)
      .stores({
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
        userProfiles: 'id, createdAt',
        profileBuildLogs: 'id, timestamp, success',
      })
      .upgrade(async (trans) => {
        await trans
          .table('lifeAreas')
          .toCollection()
          .modify((record: Record<string, unknown>) => {
            record.reflectionSignals = Array.isArray(record.reflectionSignals)
              ? record.reflectionSignals.filter(
                  (signal): signal is string => typeof signal === 'string',
                )
              : []

            delete record.purpose
            delete record.maintenanceStandard
            delete record.successPicture
            delete record.measures
            delete record.constraints
            delete record.reviewCadence
          })
      })

    this.version(15)
      .stores({
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
      })
      .upgrade(async (trans) => {
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

        const priorities = await trans.table('priorities').toArray() as Record<string, unknown>[]
        const activeCandidates = priorities
          .filter(record => record.isActive !== false)
          .sort((left, right) =>
            fallbackYear(left).localeCompare(fallbackYear(right)) ||
            String(left.title ?? '').localeCompare(String(right.title ?? '')) ||
            String(left.createdAt ?? '').localeCompare(String(right.createdAt ?? '')),
          )
        const activeIds = new Set(
          activeCandidates
            .slice(0, MAX_ACTIVE_PRIORITIES)
            .map(record => record.id)
            .filter((id): id is string => typeof id === 'string'),
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
      })

    this.version(16).stores({
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
      annualPlans: 'id, &yearRef, status',
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
    })

    this.version(17).stores({
      valueMaps: 'id, createdAt',
    })

    this.version(18).stores({
      goals: 'id, status, isActive, *priorityIds, *lifeAreaIds',
    })

    this.version(19)
      .stores({
        weeklyReflections: 'id, &weekRef',
      })
      .upgrade(async (trans) => {
        // Weekly reflection schema redesigned around demands/actions/state with
        // 4 lifestyle spheres (physical / emotional / tasks / close ones).
        // Old per-dimension fields are dropped and replaced with the new names.
        // Historical ratings are not migrated — user accepted the data loss.
        await trans
          .table('weeklyReflections')
          .toCollection()
          .modify((record: Record<string, unknown>) => {
            delete record.socialIntensityRating
            delete record.engagementRating
            delete record.emotionalRegulationRating
            delete record.selfCareRating

            record.closeOnesNeedsRating = null
            record.physicalCareRating = null
            record.emotionalProcessingRating = null
            record.closeOnesSupportRating = null
          })
      })

    this.version(20)
      .stores({
        shadowBeliefs: 'id',
      })
      .upgrade(async (trans) => {
        // Shadow beliefs restructured: the two flat lists (selfSabotagingBeliefs +
        // reframedBeliefs) become one list of per-belief entries (so a reframe is
        // tied to its belief and each belief can carry an evidence review), and
        // adviceToOthers becomes objects that also capture whether the user
        // follows the advice themselves.
        await trans
          .table('shadowBeliefs')
          .toCollection()
          .modify((record: Record<string, unknown>) => {
            const oldBeliefs = Array.isArray(record.selfSabotagingBeliefs)
              ? (record.selfSabotagingBeliefs as unknown[]).filter(
                  (b): b is string => typeof b === 'string' && b.trim().length > 0,
                )
              : []
            const oldReframes = Array.isArray(record.reframedBeliefs)
              ? (record.reframedBeliefs as unknown[]).filter(
                  (r): r is string => typeof r === 'string' && r.trim().length > 0,
                )
              : []
            // Pair belief↔reframe by position — best-effort, since the old UI
            // presented them as two parallel lists with no explicit link.
            // Surplus reframes (more reframes than beliefs) become their own entries.
            const beliefs: Array<{ belief: string; reframe?: string }> = oldBeliefs.map(
              (belief, i) => (oldReframes[i] ? { belief, reframe: oldReframes[i] } : { belief }),
            )
            for (let i = oldBeliefs.length; i < oldReframes.length; i++) {
              beliefs.push({ belief: '', reframe: oldReframes[i] })
            }
            record.beliefs = beliefs
            delete record.selfSabotagingBeliefs
            delete record.reframedBeliefs

            const oldAdvice = Array.isArray(record.adviceToOthers)
              ? (record.adviceToOthers as unknown[]).filter(
                  (a): a is string => typeof a === 'string' && a.trim().length > 0,
                )
              : []
            // Old advice was plain strings; self-application was never captured.
            record.adviceToOthers = oldAdvice.map((advice) => ({ advice }))
          })
      })

    // Pillar 3: cached per-ISO-period (week/month) profile summaries. New table,
    // no data migration. Unique on [periodRef+kind] for upsert-by-period.
    this.version(21).stores({
      profilePeriodSummaries: 'id, &[periodRef+kind]',
    })

    // Weekly intentions: lightweight week-scoped measurement objects (own table so they
    // never leak into habit listings). New table → no data migration needed.
    this.version(22).stores({
      weeklyIntentions: 'id, weekRef, status, isActive, entryMode',
    })

    // Exercise scheduling Phase 1 (docs/exercise-scheduling-design.md §4.2/§5):
    // unified completion log + micro-exercise entries. The upgrade backfills one
    // completion per historical exercise record so "what was completed when" is
    // a single indexed query instead of loading 30+ stores. Fresh databases
    // (new users, verification seeds) skip the upgrade entirely.
    this.version(23)
      .stores({
        exerciseCompletions: 'id, exerciseSlug, dayRef, completedAt',
        microExerciseEntries: 'id, exerciseSlug, createdAt',
      })
      .upgrade(async (trans) => {
        const rows: ExerciseCompletion[] = []
        const addRow = (slug: string, timestamp: unknown, recordId: unknown) => {
          // Defensive per-record skips: a malformed row must not strand the
          // user at a failed DB open.
          if (typeof timestamp !== 'string' || timestamp.length === 0) return
          const date = new Date(timestamp)
          if (Number.isNaN(date.getTime())) return
          rows.push({
            id: crypto.randomUUID(),
            exerciseSlug: slug,
            dayRef: getPeriodRefsForDate(date).day,
            completedAt: timestamp,
            recordId: typeof recordId === 'string' ? recordId : undefined,
            source: 'standalone',
          })
        }

        for (const source of V23_BACKFILL_SOURCES) {
          for (const record of await trans.table(source.table).toArray()) {
            addRow(source.slug, record[source.timestampField ?? 'createdAt'], record.id)
          }
        }

        // Wheel of Life shares `lifeAreaAssessments` with per-life-area
        // partials — only full assessments count as exercise completions.
        for (const assessment of await trans.table('lifeAreaAssessments').toArray()) {
          if (assessment.scope === 'full') {
            addRow('wheel-of-life', assessment.createdAt, assessment.id)
          }
        }

        // Psychometric assessments: completed attempts only; slug = assessmentId.
        for (const attempt of await trans.table('assessmentAttempts').toArray()) {
          if (attempt.status === 'completed') {
            addRow(attempt.assessmentId, attempt.completedAt ?? attempt.updatedAt, attempt.id)
          }
        }

        await trans.table('exerciseCompletions').bulkAdd(rows)
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
