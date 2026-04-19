export const PROFILE_SECTION_IDS = [
  'summary',
  'values',
  'emotionalPatterns',
  'strengths',
  'challenges',
  'relationships',
  'themes',
  'recentArc',
  'suggestedDirections',
] as const

export type ProfileSectionId = (typeof PROFILE_SECTION_IDS)[number]

export type ProfileSections = Record<ProfileSectionId, string>

export const PROFILE_DATA_TYPES = [
  'journal',
  'emotionLogs',
  'exerciseSessions',
  'weeklyReflections',
  'monthlyReflections',
  'questionnaires',
  'planning',
] as const

export type ProfileDataType = (typeof PROFILE_DATA_TYPES)[number]

export type ProfileDateRangePreset = 'last30' | 'last90' | 'last12m' | 'all'

export type ProfileDateRange =
  | { kind: 'preset'; preset: ProfileDateRangePreset }
  | { kind: 'custom'; start: string; end: string } // ISO date strings

export interface ProfileScopeFilters {
  emotionQuadrants?: Array<'hp-he' | 'hp-le' | 'lp-he' | 'lp-le'>
  peopleTagIds?: string[]
  contextTagIds?: string[]
  lifeAreaIds?: string[]
}

export interface UserProfileScope {
  dataTypes: ProfileDataType[]
  dateRange: ProfileDateRange
  filters?: ProfileScopeFilters
  includedObjectIds: Partial<Record<ProfileDataType, string[]>>
  approxTokenCount: number
  locale: 'en' | 'pl'
  grammaticalGender: 'masculine' | 'feminine'
}

export interface UserProfile {
  id: string
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp (tracked for future in-place edits; V1 always forks)
  note?: string
  scope: UserProfileScope
  sections: ProfileSections
  /**
   * Full raw text of the LLM response. Stored alongside sections for
   * debugging and future re-parsing. Never rendered directly in UI.
   */
  rawResponse: string
  /**
   * Identifier of the model that generated this profile. Stored so later
   * versions can be compared across model upgrades.
   */
  model: string
}

export type CreateUserProfilePayload = Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>

export type UpdateUserProfilePayload = Partial<Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>>

export interface ProfileBuildLogEntry {
  id: string
  timestamp: string // ISO
  scope: UserProfileScope
  model: string
  /**
   * Full JSON string of the request body sent to OpenAI. Not truncated.
   */
  requestBody: string
  /**
   * Full response body. On success this is the parsed JSON as string.
   * On failure this is the error payload (or a synthetic envelope if
   * the error happened before the network).
   */
  responseBody: string
  tokenUsage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  latencyMs: number
  success: boolean
  errorMessage?: string
  /**
   * If the build succeeded, the id of the UserProfile that was saved.
   * If the build succeeded but was discarded (user chose not to save),
   * or failed, this is undefined.
   */
  resultProfileId?: string
}

export type CreateProfileBuildLogPayload = Omit<ProfileBuildLogEntry, 'id' | 'timestamp'>

/**
 * Returns a fresh `ProfileSections` record with every known section id
 * initialised to an empty string. Useful when seeding the review step or
 * when the LLM response is missing a section.
 */
export function createEmptySections(): ProfileSections {
  return PROFILE_SECTION_IDS.reduce((acc, id) => {
    acc[id] = ''
    return acc
  }, {} as ProfileSections)
}
