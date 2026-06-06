/**
 * Profile-build payload assembler.
 *
 * The single place that turns a resolved scope into the exact free-text payload
 * the profile build sends to the LLM — plus its estimated token-cost breakdown.
 * Shared by the build (`userProfile.store.buildProfile`) and the wizard preview
 * (`profileScopeQueries.queryScopePreview`) so the preview equals the build
 * minus the LLM call. The data-gather + name resolution moved here verbatim from
 * the store; the actual string formatting + estimation lives in the pure
 * `assembleFromInput` (`profileLLMAssists.ts`).
 *
 * Takes an already-resolved `{ start, end }` (callers resolve `dateRange` first)
 * to avoid an import cycle through `useProfileBuildWizard.resolveDateRange`.
 */

import type { LocaleId } from '@/services/locale.service'
import {
  assembleFromInput,
  selectPayloadWithinBudget,
  type AssembledPayloadBreakdown,
  type ProfilePayloadEmotionLog,
  type ProfilePayloadExerciseSummary,
  type ProfilePayloadInput,
  type ProfilePayloadJournalEntry,
  type ProfilePayloadMonthlyReflection,
  type ProfilePayloadWeeklyReflection,
} from '@/services/profileLLMAssists'
import {
  buildFoundationSnapshot,
  buildLifeAreasSnapshot,
  buildPlanningSnapshot,
  extractMonthlyRatings,
  extractWeeklyRatings,
  summariseExerciseSession,
} from '@/services/profileLLMAssistsHelpers'
import { getExerciseSessionBundlesForPeriod } from '@/services/reflectionDataQueries'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { getAIProviderSettings, computeMaxPromptTokens } from '@/services/llmService'
import { useEmotionStore } from '@/stores/emotion.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useJournalStore } from '@/stores/journal.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useTagStore } from '@/stores/tag.store'
import {
  PROFILE_MAX_TOKENS,
  type ProfileDataType,
  type ProfileDateRange,
} from '@/domain/userProfile'

/**
 * Thrown when the always-included blocks (foundation/planning/life-area
 * snapshots) alone exceed the model's prompt budget — the only case the
 * budget-aware assembler cannot resolve by trimming. The store maps this to
 * `ProfileBuildError('contextTooLarge')`. A dedicated class (not the store's
 * error) keeps the store → assembler dependency one-directional (no cycle).
 */
export class ProfilePayloadTooLargeError extends Error {
  constructor(
    public readonly mandatoryTokens: number,
    public readonly budget: number,
  ) {
    super(
      `Mandatory profile blocks (~${mandatoryTokens} tok) exceed the model budget (~${budget} tok).`,
    )
    this.name = 'ProfilePayloadTooLargeError'
  }
}

export interface ProfileAssemblyScope {
  dataTypes: ProfileDataType[]
  /** Resolved window bounds (ISO). Callers resolve `dateRange` before calling. */
  start: string
  end: string
  /** Descriptor — so the [SCOPE] line prints the preset label, matching the build. */
  dateRange: ProfileDateRange
  includedObjectIds: Partial<Record<ProfileDataType, string[]>>
  locale: LocaleId
  /**
   * Prompt-token budget. `undefined` → auto-resolve from the active AI provider
   * settings (so preview and build agree); `null` → no budgeting (send all);
   * a number → an explicit budget (tests). Hosted providers resolve to `null`.
   */
  maxPromptTokens?: number | null
}

export interface AssembledProfilePayload extends AssembledPayloadBreakdown {
  /** Per-type counts of records dropped to fit the budget (empty when nothing trimmed). */
  droppedByType: Partial<Record<ProfileDataType, number>>
}

/**
 * Resolve the prompt-token budget from the active provider/effort, mirroring
 * what `sendMessage` reserves. Returns `null` (no budgeting) for hosted
 * providers and when AI isn't configured — so the preview never crashes; the
 * build still fails later at its api-key gate.
 */
async function resolveBudget(): Promise<number | null> {
  try {
    const settings = await getAIProviderSettings()
    return computeMaxPromptTokens(
      settings.provider,
      settings.reasoningEffort ?? 'low',
      PROFILE_MAX_TOKENS,
    )
  } catch {
    return null
  }
}

/**
 * Gather in-scope records (honoring the date window AND `includedObjectIds`),
 * resolve their human-readable names + snapshots, then assemble the payload and
 * its per-type × age token breakdown.
 */
export async function assembleProfilePayload(
  scope: ProfileAssemblyScope,
  nowMs: number = Date.now(),
): Promise<AssembledProfilePayload> {
  const { dataTypes, start, end, dateRange, includedObjectIds, locale } = scope
  const included = includedObjectIds ?? {}
  const enabled = new Set(dataTypes)

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
        // JournalEntry doesn't store lifeAreaIds directly; derived link
        // resolution happens client-side in the UI. Left empty for now.
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
        createdAt: r.createdAt,
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
        createdAt: r.createdAt,
      }))
  }

  // ---- Foundation -------------------------------------------------------
  let foundation: { snapshot: string } | undefined
  if (enabled.has('foundation')) {
    const snapshot = await buildFoundationSnapshot()
    if (snapshot.snapshot.trim().length > 0) {
      foundation = { snapshot: snapshot.snapshot }
    }
  }

  // ---- Planning ---------------------------------------------------------
  let lifeAreas: { snapshot: string } | undefined
  let planning: { snapshot: string } | undefined
  if (enabled.has('planning')) {
    const planningSnapshot = await buildPlanningSnapshot()
    if (planningSnapshot.snapshot.trim().length > 0) {
      planning = { snapshot: planningSnapshot.snapshot }
    }

    const lifeAreasSnapshot = buildLifeAreasSnapshot()
    if (lifeAreasSnapshot.snapshot.trim().length > 0) {
      lifeAreas = { snapshot: lifeAreasSnapshot.snapshot }
    }
  }

  const input: ProfilePayloadInput = {
    dataTypes,
    dateRange,
    journalEntries,
    emotionLogs,
    exerciseSessions,
    weeklyReflections,
    monthlyReflections,
    foundation,
    lifeAreas,
    planning,
  }

  // Fill-to-budget: trim oldest records to fit the model's window. `undefined`
  // → resolve from settings (preview == build); `null` → no budgeting (hosted /
  // unconfigured). Throw only when the mandatory snapshots alone can't fit.
  const budget =
    scope.maxPromptTokens === undefined ? await resolveBudget() : scope.maxPromptTokens

  let finalInput = input
  let droppedByType: Partial<Record<ProfileDataType, number>> = {}
  if (budget != null) {
    const selection = selectPayloadWithinBudget(input, budget)
    if (!selection.fits) {
      throw new ProfilePayloadTooLargeError(selection.mandatoryTokens, budget)
    }
    finalInput = selection.input
    droppedByType = selection.droppedByType
  }

  const breakdown = assembleFromInput(finalInput, locale, nowMs)
  return { ...breakdown, droppedByType }
}
