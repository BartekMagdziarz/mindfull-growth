import type { JournalDraft } from '@/domain/journalDraft'
import Dexie, { type Table } from 'dexie'
import { invalidateUserSession, UserSessionChangedError } from './userSessionScope'
import type { CompanionIntroduction } from '@/domain/companionIntroduction'
import type { HistoryDigest } from '@/domain/historyDigest'
import type {
  ApprovedProfileItem,
  ProfileProposal,
  ProfileChange,
  ProfileTask,
} from '@/domain/approvedProfile'
import type { CompanionConversation } from '@/domain/companionConversation'
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
import type { Initiative, InitiativePlanState } from '@/domain/legacy/initiative'
import type { LifeArea } from '@/domain/lifeArea'
import type { LifeAreaAssessment } from '@/domain/lifeAreaAssessment'
import type { AssessmentAttempt, AssessmentResponse } from '@/domain/assessments'
import type {
  Goal,
  Habit,
  KeyResult,
  Priority,
  PriorityLink,
  Tracker,
  WeeklyIntention,
} from '@/domain/planning'
import type {
  DailyMeasurementEntry,
  GoalMonthState,
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
import type { ExercisePlanItem } from '@/domain/exercisePlan'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import type { ProgramEnrollment } from '@/domain/program'
import { USER_DATABASE_MIGRATIONS } from '@/services/migrations/versions'

export { V23_BACKFILL_SOURCES } from '@/services/migrations/versions'

export class UserDatabase extends Dexie {
  dataRepairArchives!: Table<
    { id: string; collection: string; record: Record<string, unknown>; archivedAt: string },
    string
  >
  journalEntries!: Table<JournalEntry, string>
  peopleTags!: Table<PeopleTag, string>
  contextTags!: Table<ContextTag, string>
  emotionLogs!: Table<EmotionLog, string>
  userSettings!: Table<{ key: string; value: string }, string>
  companionConversations!: Table<CompanionConversation, string>

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
  exercisePlanItems!: Table<ExercisePlanItem, string>
  programEnrollments!: Table<ProgramEnrollment, string>

  lifeAreas!: Table<LifeArea, string>
  lifeAreaAssessments!: Table<LifeAreaAssessment, string>
  priorities!: Table<Priority, string>
  priorityLinks!: Table<PriorityLink, string>
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

  approvedProfileItems!: Table<ApprovedProfileItem, string>
  profileProposals!: Table<ProfileProposal, string>
  profileChanges!: Table<ProfileChange, string>
  profileTasks!: Table<ProfileTask, string>

  journalDrafts!: Table<JournalDraft, string>
  companionIntroductions!: Table<CompanionIntroduction, string>
  historyDigests!: Table<HistoryDigest, string>

  constructor(databaseName: string) {
    super(databaseName)

    // Schema versions live one per file in src/services/migrations/versions/
    // (append-only — never edit a shipped version).
    for (const migration of USER_DATABASE_MIGRATIONS) {
      const version = this.version(migration.version).stores(migration.stores)
      if (migration.upgrade) version.upgrade(migration.upgrade)
    }
  }
}

let currentDb: UserDatabase | null = null
let currentUserId: string | null = null
let connectionRevision = 0
let opening: { userId: string; promise: Promise<UserDatabase> } | null = null

export function getUserDatabase(): UserDatabase {
  if (!currentDb) {
    throw new Error('No user database connected. User must be logged in.')
  }
  if (Dexie.currentTransaction && Dexie.currentTransaction.db !== currentDb) {
    throw new UserSessionChangedError()
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
  if (opening?.userId === userId) return opening.promise

  const revision = ++connectionRevision
  invalidateUserSession()

  if (currentDb) {
    currentDb.close()
    currentDb = null
    currentUserId = null
  }

  const promise = (async () => {
    const db = new UserDatabase(`MindfullGrowthDB_simplify_${userId}`)
    try {
      await db.open()
      if (revision !== connectionRevision) throw new UserSessionChangedError()
      currentDb = db
      currentUserId = userId
      return db
    } catch (error) {
      db.close()
      throw error
    } finally {
      if (revision === connectionRevision) opening = null
    }
  })()
  opening = { userId, promise }
  return promise
}

export async function disconnectUserDatabase(): Promise<void> {
  connectionRevision++
  opening = null
  invalidateUserSession()
  if (currentDb) {
    currentDb.close()
    currentDb = null
    currentUserId = null
  }
}

export function getCurrentUserId(): string | null {
  return currentUserId
}
