/** The only source collections exposed by the history tools. No settings, credentials or build logs. */
export const SOURCE_COLLECTIONS = {
  journalEntries: 'journal',
  emotionLogs: 'emotion',
  weeklyReflections: 'reflection',
  monthlyReflections: 'reflection',
  conversations: 'conversation',
  companionConversations: 'conversation',
  companionIntroductions: 'conversation',
  assessmentAttempts: 'assessment',
  assessmentResponses: 'assessment',
  goals: 'planning',
  priorities: 'planning',
  habits: 'planning',
  keyResults: 'planning',
  trackers: 'planning',
  weeklyIntentions: 'planning',
  initiatives: 'planning',
  monthPlans: 'planning',
  weekPlans: 'planning',
  goalMonthStates: 'planning',
  measurementMonthStates: 'planning',
  measurementWeekStates: 'planning',
  measurementDayAssignments: 'planning',
  dailyMeasurementEntries: 'measurement',
  thoughtRecords: 'exercise',
  distortionAssessments: 'exercise',
  worryTreeEntries: 'exercise',
  coreBeliefsExplorations: 'exercise',
  compassionateLetters: 'exercise',
  positiveDataLogs: 'exercise',
  behavioralExperiments: 'exercise',
  behavioralActivations: 'exercise',
  structuredProblemSolvings: 'exercise',
  gradedExposureHierarchies: 'exercise',
  threePathwaysToMeaning: 'exercise',
  socraticSelfDialogues: 'exercise',
  mountainRangesOfMeaning: 'exercise',
  paradoxicalIntentionLabs: 'exercise',
  dereflectionPractices: 'exercise',
  tragicOptimisms: 'exercise',
  attitudinalShifts: 'exercise',
  legacyLetters: 'exercise',
  ifsParts: 'exercise',
  ifsPartsMaps: 'exercise',
  ifsUnblendingSessions: 'exercise',
  ifsDirectAccessSessions: 'exercise',
  ifsTrailheadEntries: 'exercise',
  ifsProtectorAppreciations: 'exercise',
  ifsExileWitnessings: 'exercise',
  ifsSelfEnergyCheckIns: 'exercise',
  ifsPartsDialogues: 'exercise',
  ifsDailyCheckIns: 'exercise',
  ifsConstellations: 'exercise',
  valueMaps: 'exercise',
  valuesDiscoveries: 'exercise',
  shadowBeliefs: 'exercise',
  transformativePurposes: 'exercise',
  microExerciseEntries: 'exercise',
  lifeAreaAssessments: 'exercise',
} as const
export type SourceCollection = keyof typeof SOURCE_COLLECTIONS
export type SourceKind = (typeof SOURCE_COLLECTIONS)[SourceCollection]
export const SOURCE_KINDS = [
  'journal',
  'emotion',
  'reflection',
  'conversation',
  'planning',
  'measurement',
  'exercise',
  'assessment',
] as const
export interface SourceRef {
  collection: SourceCollection
  id: string
}
export const sourceKey = (ref: SourceRef) => JSON.stringify([ref.collection, ref.id])
export interface ContentBlock {
  label: string
  author: 'recorded' | 'user' | 'assistant'
  text: string
  timestamp?: string
}
export interface HistorySource {
  ref: SourceRef
  kind: SourceKind
  title: string
  occurredAt: string
  eventDay?: string // canonical day of a measurement/assignment; timestamps still identify when recorded
  updatedAt: string
  version: string
  blocks: ContentBlock[]
  contextTags: Array<{ id: string; name: string }>
  peopleTags: Array<{ id: string; name: string }>
  emotions: Array<{ id: string; name: string }>
  emotionFamilies: Array<{ id: string; name: string }>
  relatedRefs: SourceRef[]
}
export interface HistoryFilter {
  from?: string // inclusive ISO instant with offset, or YYYY-MM-DD in the configured timezone
  to?: string // inclusive; a day includes that full calendar day
  kinds?: SourceKind[]
  collections?: SourceCollection[]
  contextTagIds?: string[]
  peopleTagIds?: string[]
  emotionIds?: string[]
  emotionFamilyIds?: string[]
  relatedRefs?: SourceRef[]
}
export interface SearchHistoryInput extends HistoryFilter {
  query?: string // whitespace-separated words AND; quoted phrases; accent-insensitive substring matching
  limit?: number
  cursor?: string
  sort?: 'newest' | 'oldest'
}
export interface ReadSourcesInput {
  requests: Array<{ ref: SourceRef; offset?: number; expectedVersion?: string }>
  maxCharsPerSource?: number
}
export interface HistoryAccessPolicy {
  schemaVersion: 1
  revision: string
  excludedKinds: SourceKind[]
  excludedSources: SourceRef[]
}
export class HistoryToolError extends Error {
  constructor(
    public code: 'invalid-input' | 'access-policy-invalid' | 'session-changed' | 'stale-cursor',
    message: string
  ) {
    super(message)
    this.name = 'HistoryToolError'
  }
}
export const LIMITS = {
  search: 50,
  defaultSearch: 10,
  facets: 100,
  reads: 8,
  readChars: 8000,
  totalReadChars: 24000,
  terms: 12,
  filterValues: 30,
  executionSubjects: 10,
} as const
