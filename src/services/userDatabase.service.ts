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
import type {
  Goal,
  Habit,
  Initiative,
  KeyResult,
  Priority,
  Tracker,
} from '@/domain/planning'

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
