import { createStoreSessionScope } from '@/services/userSessionScope'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  UserProfile,
  CreateUserProfilePayload,
  UpdateUserProfilePayload,
  UserProfileScope,
  ProfileSections,
  ProfileBuildLogEntry,
  ProfileEstimateBreakdown,
} from '@/domain/userProfile'
import { PROFILE_MAX_TOKENS } from '@/domain/userProfile'
import { userProfileDexieRepository } from '@/repositories/userProfileDexieRepository'
import { profileBuildLogDexieRepository } from '@/repositories/profileBuildLogDexieRepository'
import {
  getAIProviderSettings,
  hasAIProviderConfigured,
  resolveTaskModel,
  sendMessage,
  type LLMUsage,
} from '@/services/llmService'
import { withProfileContextSystemPrompt } from '@/services/userContext'
import { resolveDateRange } from '@/composables/useProfileBuildWizard'
import { getProfilePrompts, parseProfileResponse } from '@/services/profileLLMAssists'
import {
  assembleProfilePayload,
  ProfilePayloadTooLargeError,
} from '@/services/profilePayloadAssembler'
import { reportError } from '@/utils/reportError'

/**
 * Typed failure modes for `buildProfile`. We keep this deliberately small —
 * anything the UI needs to react to specifically gets a code, everything
 * else falls back to `'unknown'`. Used so the view can decide (e.g.)
 * whether to show the "Go to AI Settings" CTA without substring-matching.
 */
export type ProfileBuildErrorCode =
  'missingApiKey' | 'contextTooLarge' | 'emptyResponse' | 'network' | 'unknown'

export class ProfileBuildError extends Error {
  constructor(
    public code: ProfileBuildErrorCode,
    message?: string,
    public cause?: unknown
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
  const sessionScope = createStoreSessionScope()
  // ---- State ----
  const profiles = ref<UserProfile[]>([])
  const buildLogs = ref<ProfileBuildLogEntry[]>([])
  const isLoading = ref(false)
  const isBuilding = ref(false)
  const error = ref<string | null>(null)

  // ---- Computed ----
  const sortedProfiles = computed(() =>
    [...profiles.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  )

  const currentProfile = computed<UserProfile | undefined>(() => sortedProfiles.value[0])

  const getById = computed(() => {
    return (id: string): UserProfile | undefined => profiles.value.find(p => p.id === id)
  })

  const hasProfiles = computed(() => profiles.value.length > 0)

  // ---- Actions ----

  async function loadProfiles(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        profiles.value = await operation.wait(userProfileDexieRepository.list())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load profiles'
        reportError('userProfileStore.loadProfiles', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function loadBuildLogs(limit = 100): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      try {
        buildLogs.value = await operation.wait(profileBuildLogDexieRepository.list(limit))
      } catch (err) {
        if (!operation.isCurrent()) return
        console.warn('Failed to load profile build logs:', err)
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createProfile(payload: CreateUserProfilePayload): Promise<UserProfile> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    const created = await operation.wait(userProfileDexieRepository.create(payload))
    profiles.value = [created, ...profiles.value]
    return created
  }

  async function updateProfile(
    id: string,
    payload: UpdateUserProfilePayload
  ): Promise<UserProfile> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    const updated = await operation.wait(userProfileDexieRepository.update(id, payload))
    const idx = profiles.value.findIndex(p => p.id === id)
    if (idx !== -1) profiles.value[idx] = updated
    return updated
  }

  async function deleteProfile(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    // Protection rule: cannot delete the currently-latest profile
    // if other profiles exist. Story 6 will surface this in UI.
    try {
      const sorted = sortedProfiles.value
      if (sorted.length > 1 && sorted[0].id === id) {
        throw new Error(
          'Cannot delete the current (most recent) profile while older versions exist'
        )
      }
      await operation.wait(userProfileDexieRepository.delete(id))
      profiles.value = profiles.value.filter(p => p.id !== id)
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function clearBuildLogs(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      await operation.wait(profileBuildLogDexieRepository.clearAll())
      buildLogs.value = []
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
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
  async function buildProfile(scope: UserProfileScope): Promise<BuildProfileResult> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
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
    // Real token usage reported by the provider. The diagnostics callback fires
    // more than once on a non-streaming call (once before usage is known, once
    // after) — keep the last non-undefined snapshot.
    let lastUsage: LLMUsage | undefined
    // Per-type × age token-estimate breakdown, captured at assembly time so the
    // build-log can show estimate-vs-actual. Undefined if we throw before assembling.
    let estimateBreakdown: ProfileEstimateBreakdown | undefined
    // Per-type counts of records the budget-aware assembler trimmed to fit.
    let droppedByType: ProfileBuildLogEntry['droppedByType']
    // Count of summarized-history periods dropped to fit the budget (Pillar 3).
    let droppedSummarizedPeriods: ProfileBuildLogEntry['droppedSummarizedPeriods']

    try {
      if (!(await operation.wait(hasAIProviderConfigured()))) {
        throw new ProfileBuildError('missingApiKey', 'AI provider is not configured.')
      }
      const aiSettings = await operation.wait(getAIProviderSettings())
      // The build is the heaviest call in the app: it runs on the long-form model.
      model = resolveTaskModel(aiSettings, 'heavy')

      // Gather, name-resolve, format, budget-trim, and estimate the payload in
      // one place — the same assembler the wizard preview uses, so "preview ==
      // build minus the LLM". The assembler fills to the model's context budget
      // (dropping oldest records, recording droppedByType) and throws only when
      // the mandatory snapshot blocks alone can't fit. Resolve the window here
      // and pass it in (the assembler must not import resolveDateRange — cycle).
      const { start, end } = resolveDateRange(scope.dateRange)
      const assembled = await operation.wait(
        assembleProfilePayload({
          dataTypes: scope.dataTypes,
          start,
          end,
          dateRange: scope.dateRange,
          includedObjectIds: scope.includedObjectIds ?? {},
          locale: scope.locale,
        })
      )
      payload = assembled.text
      droppedByType = assembled.droppedByType
      droppedSummarizedPeriods = assembled.droppedSummarizedPeriods
      estimateBreakdown = {
        approxTokens: assembled.approxTokens,
        tokensByType: assembled.tokensByType,
        tokensByAge: assembled.tokensByAge,
        summarizedHistoryTokens: assembled.summarizedHistoryTokens,
        summarizedPeriods: assembled.summarizedPeriods,
      }

      // Profile build is the single LLM call site that must NEVER include
      // the user's psychological profile in its system prompt — using a
      // profile to generate a profile would conflate prior output with new
      // input. Hard-coded false; asserted by test.
      const finalSystemPrompt = await operation.wait(
        withProfileContextSystemPrompt(promptModule.systemPrompt, { useProfile: false })
      )

      rawResponse = await operation.wait(
        sendMessage([{ role: 'user', content: payload }], finalSystemPrompt, {
          maxTokens: PROFILE_MAX_TOKENS,
          model,
          task: 'heavy',
          onDiagnostics: d => {
            if (d.usage) lastUsage = d.usage
          },
        })
      )

      const parsed = parseProfileResponse(rawResponse, promptModule)

      // A non-empty response whose every section is blank means the model
      // produced nothing the parser could place (wrong format, thinking-only,
      // or truncated). Surface it as a real error rather than a "successful"
      // empty profile.
      const allSectionsEmpty = Object.values(parsed.sections).every(
        text => text.trim().length === 0
      )
      if (allSectionsEmpty) {
        throw new ProfileBuildError(
          'emptyResponse',
          'The model returned no recognisable profile sections.'
        )
      }

      success = true
      return {
        sections: parsed.sections,
        rawResponse,
        model,
        extras: parsed.extras,
      }
    } catch (err) {
      operation.assertCurrent()
      // Classify the error before re-throwing so callers can react to
      // typed failure modes without substring matching.
      if (err instanceof ProfileBuildError) {
        errorMessage = err.message
        throw err
      }
      // The budget-aware assembler throws when mandatory snapshots alone can't
      // fit — map it to the typed contextTooLarge code the UI already handles.
      if (err instanceof ProfilePayloadTooLargeError) {
        errorMessage = err.message
        throw new ProfileBuildError('contextTooLarge', err.message, err)
      }
      const message = err instanceof Error ? err.message : String(err)
      errorMessage = message
      const code: ProfileBuildErrorCode = /api\s*key/i.test(message)
        ? 'missingApiKey'
        : /empty response|pust/i.test(message)
          ? 'emptyResponse'
          : /network|fetch|timed? out/i.test(message)
            ? 'network'
            : 'unknown'
      throw new ProfileBuildError(code, message, err)
    } finally {
      if (operation.isCurrent()) {
        isBuilding.value = false
        const latencyMs = Math.round(performance.now() - startedAt)

        // Map the provider's snake_case usage into the build-log's camelCase
        // shape. For Ollama, `completion_tokens` (eval_count) includes thinking
        // tokens; `promptTokens` is the calibration gold signal for the estimator.
        const tokenUsage = lastUsage
          ? {
              promptTokens: lastUsage.prompt_tokens ?? 0,
              completionTokens: lastUsage.completion_tokens ?? 0,
              totalTokens:
                lastUsage.total_tokens ??
                (lastUsage.prompt_tokens ?? 0) + (lastUsage.completion_tokens ?? 0),
            }
          : undefined

        // Best-effort log write — we never let a logging failure mask the
        // real outcome of the build.
        try {
          await operation.wait(
            profileBuildLogDexieRepository.add({
              scope,
              model,
              requestBody: JSON.stringify({
                systemPrompt: promptModule.systemPrompt,
                messages: [{ role: 'user', content: payload }],
                model,
                maxTokens: PROFILE_MAX_TOKENS,
              }),
              responseBody: success ? rawResponse : (errorMessage ?? 'unknown error'),
              tokenUsage,
              estimateBreakdown,
              droppedByType,
              droppedSummarizedPeriods,
              latencyMs,
              success,
              errorMessage,
            })
          )
        } catch (logErr) {
          operation.assertCurrent()
          console.warn('Failed to record profile build log entry:', logErr)
        }
      }
    }
  }

  /**
   * Resets all in-memory state to initial values. Called on user
   * logout/login by `appStateReset` so that user B does not see user A's
   * profile portraits or build history.
   */
  function reset(): void {
    sessionScope.reset()
    profiles.value = []
    buildLogs.value = []
    isLoading.value = false
    isBuilding.value = false
    error.value = null
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
    reset,
  }
})
