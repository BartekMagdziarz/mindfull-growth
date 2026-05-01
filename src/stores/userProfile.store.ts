import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  UserProfile,
  CreateUserProfilePayload,
  UpdateUserProfilePayload,
  UserProfileScope,
  ProfileSections,
  ProfileBuildLogEntry,
} from '@/domain/userProfile'
import { userProfileDexieRepository } from '@/repositories/userProfileDexieRepository'
import { profileBuildLogDexieRepository } from '@/repositories/profileBuildLogDexieRepository'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import {
  getAIProviderSettings,
  hasAIProviderConfigured,
  sendMessage,
} from '@/services/llmService'
import { resolveDateRange } from '@/composables/useProfileBuildWizard'
import {
  getProfilePrompts,
  buildProfilePayload,
  parseProfileResponse,
  type ProfilePayloadEmotionLog,
  type ProfilePayloadExerciseSummary,
  type ProfilePayloadJournalEntry,
  type ProfilePayloadMonthlyReflection,
  type ProfilePayloadWeeklyReflection,
} from '@/services/profileLLMAssists'
import {
  buildPlanningSnapshot,
  extractMonthlyRatings,
  extractWeeklyRatings,
  summariseExerciseSession,
} from '@/services/profileLLMAssistsHelpers'
import { getExerciseSessionBundlesForPeriod } from '@/services/reflectionDataQueries'

// How many completion tokens to reserve for a profile generation. A full
// 9-section portrait (~1800–3000 words) comfortably fits under 5000 tokens;
// 6000 leaves a small buffer for unusually verbose models without risking
// hard truncation.
const PROFILE_MAX_TOKENS = 6000

/**
 * Typed failure modes for `buildProfile`. We keep this deliberately small —
 * anything the UI needs to react to specifically gets a code, everything
 * else falls back to `'unknown'`. Used so the view can decide (e.g.)
 * whether to show the "Go to AI Settings" CTA without substring-matching.
 */
export type ProfileBuildErrorCode =
  | 'missingApiKey'
  | 'contextTooLarge'
  | 'network'
  | 'unknown'

export class ProfileBuildError extends Error {
  constructor(
    public code: ProfileBuildErrorCode,
    message?: string,
    public cause?: unknown,
  ) {
    super(message ?? code)
    this.name = 'ProfileBuildError'
  }
}

export interface BuildProfileResult {
  sections: ProfileSections
  rawResponse: string
  model: string
  /** Unmatched prose from the LLM response (kept for debugging in Story 8). */
  extras: string
}

export const useUserProfileStore = defineStore('userProfile', () => {
  // ---- State ----
  const profiles = ref<UserProfile[]>([])
  const buildLogs = ref<ProfileBuildLogEntry[]>([])
  const isLoading = ref(false)
  const isBuilding = ref(false)
  const error = ref<string | null>(null)

  // ---- Computed ----
  const sortedProfiles = computed(() =>
    [...profiles.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  )

  const currentProfile = computed<UserProfile | undefined>(
    () => sortedProfiles.value[0],
  )

  const getById = computed(() => {
    return (id: string): UserProfile | undefined =>
      profiles.value.find((p) => p.id === id)
  })

  const hasProfiles = computed(() => profiles.value.length > 0)

  // ---- Actions ----

  async function loadProfiles(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      profiles.value = await userProfileDexieRepository.list()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load profiles'
      console.error('Error loading user profiles:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function loadBuildLogs(limit = 100): Promise<void> {
    try {
      buildLogs.value = await profileBuildLogDexieRepository.list(limit)
    } catch (err) {
      console.warn('Failed to load profile build logs:', err)
    }
  }

  async function createProfile(
    payload: CreateUserProfilePayload,
  ): Promise<UserProfile> {
    const created = await userProfileDexieRepository.create(payload)
    profiles.value = [created, ...profiles.value]
    return created
  }

  async function updateProfile(
    id: string,
    payload: UpdateUserProfilePayload,
  ): Promise<UserProfile> {
    const updated = await userProfileDexieRepository.update(id, payload)
    const idx = profiles.value.findIndex((p) => p.id === id)
    if (idx !== -1) profiles.value[idx] = updated
    return updated
  }

  async function deleteProfile(id: string): Promise<void> {
    // Protection rule: cannot delete the currently-latest profile
    // if other profiles exist. Story 6 will surface this in UI.
    const sorted = sortedProfiles.value
    if (sorted.length > 1 && sorted[0].id === id) {
      throw new Error(
        'Cannot delete the current (most recent) profile while older versions exist',
      )
    }
    await userProfileDexieRepository.delete(id)
    profiles.value = profiles.value.filter((p) => p.id !== id)
  }

  async function clearBuildLogs(): Promise<void> {
    await profileBuildLogDexieRepository.clearAll()
    buildLogs.value = []
  }

  /**
   * Runs the full build pipeline:
   *   1. Validate scope and API key.
   *   2. Resolve date range.
   *   3. Collect journal / emotion / exercise / reflection / planning data
   *      respecting `scope.includedObjectIds` (the preview step's filtered
   *      list of ids) so the user sees exactly what was selected.
   *   4. Build prompts and payload.
   *   5. Call OpenAI, parse response.
   *   6. Log the full request/response regardless of outcome.
   *   7. Return the parsed sections + raw response.
   *
   * Does NOT persist a `UserProfile`. That is Story 6's job.
   */
  async function buildProfile(
    scope: UserProfileScope,
  ): Promise<BuildProfileResult> {
    if (!scope || !Array.isArray(scope.dataTypes) || scope.dataTypes.length === 0) {
      throw new Error('Scope must include at least one data type')
    }

    isBuilding.value = true
    const startedAt = performance.now()
    const promptModule = getProfilePrompts(scope.locale, scope.grammaticalGender)

    let payload = ''
    let rawResponse = ''
    let success = false
    let errorMessage: string | undefined
    let model = ''

    try {
      if (!(await hasAIProviderConfigured())) {
        throw new ProfileBuildError(
          'missingApiKey',
          'AI provider is not configured.',
        )
      }
      const aiSettings = await getAIProviderSettings()
      model = aiSettings.model

      const { start, end } = resolveDateRange(scope.dateRange)
      const included = scope.includedObjectIds ?? {}

      // Lazy store handles — only touch the stores we actually need.
      const enabled = new Set(scope.dataTypes)

      // ---- Journal ----------------------------------------------------------
      let journalEntries: ProfilePayloadJournalEntry[] | undefined
      if (enabled.has('journal')) {
        const journalStore = useJournalStore()
        const emotionStore = useEmotionStore()
        const tagStore = useTagStore()
        const lifeAreaStore = useLifeAreaStore()
        const ids = new Set(included.journal ?? [])
        journalEntries = journalStore.sortedEntries
          .filter(
            (e) =>
              e.createdAt >= start &&
              e.createdAt <= end &&
              (ids.size === 0 || ids.has(e.id)),
          )
          .map((e) => ({
            id: e.id,
            createdAt: e.createdAt,
            title: e.title,
            body: e.body ?? '',
            emotionNames: (e.emotionIds ?? [])
              .map((id) => emotionStore.getEmotionById(id)?.name)
              .filter((n): n is string => typeof n === 'string'),
            peopleNames: (e.peopleTagIds ?? [])
              .map((id) => tagStore.getPeopleTagById(id)?.name)
              .filter((n): n is string => typeof n === 'string'),
            contextNames: (e.contextTagIds ?? [])
              .map((id) => tagStore.getContextTagById(id)?.name)
              .filter((n): n is string => typeof n === 'string'),
            // JournalEntry doesn't store lifeAreaIds directly; derived link resolution
            // happens client-side in the UI. For now we leave this empty.
            lifeAreaNames: Array.isArray(
              (e as unknown as { lifeAreaIds?: string[] }).lifeAreaIds,
            )
              ? ((e as unknown as { lifeAreaIds?: string[] }).lifeAreaIds ?? [])
                  .map((id) => lifeAreaStore.getLifeAreaById(id)?.name)
                  .filter((n): n is string => typeof n === 'string')
              : [],
          }))
      }

      // ---- Emotion logs -----------------------------------------------------
      let emotionLogs: ProfilePayloadEmotionLog[] | undefined
      if (enabled.has('emotionLogs')) {
        const emotionLogStore = useEmotionLogStore()
        const emotionStore = useEmotionStore()
        const tagStore = useTagStore()
        const ids = new Set(included.emotionLogs ?? [])
        emotionLogs = emotionLogStore.sortedLogs
          .filter(
            (l) =>
              l.createdAt >= start &&
              l.createdAt <= end &&
              (ids.size === 0 || ids.has(l.id)),
          )
          .map((l) => ({
            id: l.id,
            createdAt: l.createdAt,
            emotionNames: l.emotionIds
              .map((id) => emotionStore.getEmotionById(id)?.name)
              .filter((n): n is string => typeof n === 'string'),
            note: l.note ?? '',
            peopleNames: (l.peopleTagIds ?? [])
              .map((id) => tagStore.getPeopleTagById(id)?.name)
              .filter((n): n is string => typeof n === 'string'),
            contextNames: (l.contextTagIds ?? [])
              .map((id) => tagStore.getContextTagById(id)?.name)
              .filter((n): n is string => typeof n === 'string'),
          }))
      }

      // ---- Exercise sessions ------------------------------------------------
      let exerciseSessions: ProfilePayloadExerciseSummary[] | undefined
      if (enabled.has('exerciseSessions')) {
        const bundles = await getExerciseSessionBundlesForPeriod(start, end)
        const ids = new Set(included.exerciseSessions ?? [])
        exerciseSessions = bundles
          .filter((b) => ids.size === 0 || ids.has(b.id))
          .map((b) => ({
            id: b.id,
            type: b.type,
            createdAt: b.createdAt,
            summary: summariseExerciseSession(b),
          }))
      }

      // ---- Weekly reflections -----------------------------------------------
      let weeklyReflections: ProfilePayloadWeeklyReflection[] | undefined
      if (enabled.has('weeklyReflections')) {
        const all = await structuredReflectionDexieRepository.listWeekly()
        const ids = new Set(included.weeklyReflections ?? [])
        weeklyReflections = all
          .filter(
            (r) =>
              r.createdAt >= start &&
              r.createdAt <= end &&
              (ids.size === 0 || ids.has(r.id)),
          )
          .map((r) => ({
            weekRef: r.weekRef,
            ratings: extractWeeklyRatings(r),
            promptResponses: r.promptResponses,
            freeformReflection: r.freeformReflection,
          }))
      }

      // ---- Monthly reflections ----------------------------------------------
      let monthlyReflections: ProfilePayloadMonthlyReflection[] | undefined
      if (enabled.has('monthlyReflections')) {
        const all = await structuredReflectionDexieRepository.listMonthly()
        const ids = new Set(included.monthlyReflections ?? [])
        monthlyReflections = all
          .filter(
            (r) =>
              r.createdAt >= start &&
              r.createdAt <= end &&
              (ids.size === 0 || ids.has(r.id)),
          )
          .map((r) => ({
            monthRef: r.monthRef,
            ratings: extractMonthlyRatings(r),
            promptResponses: r.promptResponses,
            freeformReflection: r.freeformReflection,
          }))
      }

      // ---- Planning ---------------------------------------------------------
      let planning: { snapshot: string } | undefined
      if (enabled.has('planning')) {
        const snapshot = await buildPlanningSnapshot()
        planning = { snapshot: snapshot.snapshot }
      }

      // ---- Payload + LLM call ----------------------------------------------
      payload = buildProfilePayload(
        {
          dataTypes: scope.dataTypes,
          dateRange: scope.dateRange,
          journalEntries,
          emotionLogs,
          exerciseSessions,
          weeklyReflections,
          monthlyReflections,
          planning,
        },
        scope.locale,
      )

      rawResponse = await sendMessage(
        [{ role: 'user', content: payload }],
        promptModule.systemPrompt,
        { maxTokens: PROFILE_MAX_TOKENS, model },
      )

      const parsed = parseProfileResponse(rawResponse, promptModule)
      success = true
      return {
        sections: parsed.sections,
        rawResponse,
        model,
        extras: parsed.extras,
      }
    } catch (err) {
      // Classify the error before re-throwing so callers can react to
      // typed failure modes without substring matching.
      if (err instanceof ProfileBuildError) {
        errorMessage = err.message
        throw err
      }
      const message = err instanceof Error ? err.message : String(err)
      errorMessage = message
      const code: ProfileBuildErrorCode = /api\s*key/i.test(message)
        ? 'missingApiKey'
        : /network|fetch|timed? out/i.test(message)
          ? 'network'
          : 'unknown'
      throw new ProfileBuildError(code, message, err)
    } finally {
      isBuilding.value = false
      const latencyMs = Math.round(performance.now() - startedAt)

      // Best-effort log write — we never let a logging failure mask the
      // real outcome of the build.
      try {
        await profileBuildLogDexieRepository.add({
          scope,
          model,
          requestBody: JSON.stringify({
            systemPrompt: promptModule.systemPrompt,
            messages: [{ role: 'user', content: payload }],
            model,
            maxTokens: PROFILE_MAX_TOKENS,
          }),
          responseBody: success ? rawResponse : (errorMessage ?? 'unknown error'),
          latencyMs,
          success,
          errorMessage,
        })
      } catch (logErr) {
        console.warn('Failed to record profile build log entry:', logErr)
      }
    }
  }

  return {
    // state
    profiles,
    buildLogs,
    isLoading,
    isBuilding,
    error,
    // computed
    sortedProfiles,
    currentProfile,
    getById,
    hasProfiles,
    // actions
    loadProfiles,
    loadBuildLogs,
    createProfile,
    updateProfile,
    deleteProfile,
    clearBuildLogs,
    buildProfile,
  }
})
