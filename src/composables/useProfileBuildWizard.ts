/**
 * Profile Build Wizard composable.
 *
 * Orchestrates the multi-step wizard for building a psychological profile:
 * - Step 1 (scope): choose data types, date range, optional filters.
 * - Step 2 (preview): live counts and source list for the chosen scope.
 * - Steps 3-5 (generate / review / save) are stubs until Stories 4-6 land.
 *
 * Exposes draft-persistence helpers that mirror the patterns used elsewhere
 * (weekly/monthly reflection wizards) so a refresh during scope-tuning
 * doesn't lose user input.
 */

import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import {
  PROFILE_DATA_TYPES,
  PROFILE_SECTION_IDS,
  createEmptySections,
  type ProfileDataType,
  type ProfileDateRange,
  type ProfileDateRangePreset,
  type ProfileScopeFilters,
  type ProfileSectionId,
  type ProfileSections,
  type UserProfileScope,
} from '@/domain/userProfile'
import {
  clearDraftFromDB,
  loadDraftFromDB,
  saveDraftToDB,
} from '@/services/draftStorage'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import {
  ProfileBuildError,
  type ProfileBuildErrorCode,
  useUserProfileStore,
} from '@/stores/userProfile.store'
import {
  queryScopePreview,
  type ProfilePreviewObjectHeader,
} from '@/services/profileScopeQueries'

export type { ProfilePreviewObjectHeader }

export type ProfileBuildStep = 'scope' | 'preview' | 'generate' | 'review' | 'save'

export const STEP_ORDER: readonly ProfileBuildStep[] = [
  'scope',
  'preview',
  'generate',
  'review',
  'save',
] as const

export const WIZARD_DRAFT_KEY = 'profile-build-wizard'

export type ProfilePreviewCounts = Partial<Record<ProfileDataType, number>>

/**
 * Default set of data types — the "diary-like" records most useful for a
 * first-pass portrait. Planning/questionnaires start unchecked since those
 * tend to be noisier and/or not populated yet.
 */
const DEFAULT_DATA_TYPES: ProfileDataType[] = [
  'journal',
  'emotionLogs',
  'exerciseSessions',
  'weeklyReflections',
  'monthlyReflections',
]

const DEFAULT_DATE_RANGE: ProfileDateRange = { kind: 'preset', preset: 'last90' }

function createEmptyFilters(): ProfileScopeFilters {
  return {
    emotionQuadrants: [],
    peopleTagIds: [],
    contextTagIds: [],
    lifeAreaIds: [],
  }
}

/**
 * Resolve a high-level date range descriptor into an ISO start/end pair.
 * - Presets are measured backwards from `now`.
 * - `all` uses ~20 years backwards, plenty for any realistic user dataset.
 * - `custom` ranges are passed through but normalised to day bounds so the
 *   filter is inclusive of the selected dates.
 */
export function resolveDateRange(range: ProfileDateRange): { start: string; end: string } {
  const now = new Date()
  const end = now.toISOString()

  if (range.kind === 'custom') {
    const startIso = range.start
      ? new Date(range.start + 'T00:00:00.000Z').toISOString()
      : new Date(0).toISOString()
    const endIso = range.end
      ? new Date(range.end + 'T23:59:59.999Z').toISOString()
      : end
    return { start: startIso, end: endIso }
  }

  const daysByPreset: Record<ProfileDateRangePreset, number> = {
    last30: 30,
    last90: 90,
    last12m: 365,
    all: 365 * 20,
  }
  const days = daysByPreset[range.preset] ?? 90
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
  return { start, end }
}

/**
 * Custom ranges must have start <= end; presets are always valid.
 */
export function isValidDateRange(range: ProfileDateRange): boolean {
  if (range.kind === 'preset') return true
  if (!range.start || !range.end) return false
  return range.start <= range.end
}

interface PersistedDraft {
  dataTypes: ProfileDataType[]
  dateRange: ProfileDateRange
  filters: ProfileScopeFilters
}

function isProfileDataType(value: unknown): value is ProfileDataType {
  return (
    typeof value === 'string' &&
    (PROFILE_DATA_TYPES as readonly string[]).includes(value)
  )
}

function sanitiseDraft(raw: unknown): PersistedDraft | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const dataTypes = Array.isArray(obj.dataTypes)
    ? (obj.dataTypes.filter(isProfileDataType) as ProfileDataType[])
    : null
  const dateRange = obj.dateRange as ProfileDateRange | undefined
  const filters = obj.filters as ProfileScopeFilters | undefined
  if (!dataTypes || !dateRange || typeof dateRange !== 'object') return null
  if (dateRange.kind !== 'preset' && dateRange.kind !== 'custom') return null
  return {
    dataTypes,
    dateRange,
    filters: {
      emotionQuadrants: Array.isArray(filters?.emotionQuadrants)
        ? [...filters!.emotionQuadrants]
        : [],
      peopleTagIds: Array.isArray(filters?.peopleTagIds) ? [...filters!.peopleTagIds] : [],
      contextTagIds: Array.isArray(filters?.contextTagIds) ? [...filters!.contextTagIds] : [],
      lifeAreaIds: Array.isArray(filters?.lifeAreaIds) ? [...filters!.lifeAreaIds] : [],
    },
  }
}

export function useProfileBuildWizard() {
  const prefs = useUserPreferencesStore()

  // --- Step state --------------------------------------------------------
  const ready = ref(false)
  const currentStep = ref<ProfileBuildStep>('scope')
  const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))

  // --- Scope state -------------------------------------------------------
  const dataTypes = ref<ProfileDataType[]>([...DEFAULT_DATA_TYPES])
  const dateRange = ref<ProfileDateRange>({ ...DEFAULT_DATE_RANGE })
  const filters = reactive<ProfileScopeFilters>(createEmptyFilters())

  // --- Preview state -----------------------------------------------------
  const previewCountsByType = ref<ProfilePreviewCounts>({})
  const previewObjectIdsByType = ref<Partial<Record<ProfileDataType, string[]>>>({})
  const previewObjectHeaders = ref<ProfilePreviewObjectHeader[]>([])
  const previewApproxTokens = ref(0)
  const isPreviewLoading = ref(false)
  const previewError = ref<string | null>(null)

  const previewTotalCount = computed(() =>
    Object.values(previewCountsByType.value).reduce((sum, n) => sum + (n ?? 0), 0),
  )

  // --- Scope snapshot ----------------------------------------------------
  const currentScope = computed<UserProfileScope>(() => ({
    dataTypes: [...dataTypes.value],
    dateRange: JSON.parse(JSON.stringify(dateRange.value)) as ProfileDateRange,
    filters: {
      emotionQuadrants: filters.emotionQuadrants ? [...filters.emotionQuadrants] : [],
      peopleTagIds: filters.peopleTagIds ? [...filters.peopleTagIds] : [],
      contextTagIds: filters.contextTagIds ? [...filters.contextTagIds] : [],
      lifeAreaIds: filters.lifeAreaIds ? [...filters.lifeAreaIds] : [],
    },
    includedObjectIds: JSON.parse(
      JSON.stringify(previewObjectIdsByType.value),
    ) as Partial<Record<ProfileDataType, string[]>>,
    approxTokenCount: previewApproxTokens.value,
    locale: prefs.locale,
    grammaticalGender: prefs.grammaticalGender,
  }))

  // --- Step gating -------------------------------------------------------
  const canAdvance = computed(() => {
    switch (currentStep.value) {
      case 'scope':
        return dataTypes.value.length > 0 && isValidDateRange(dateRange.value)
      case 'preview':
        return previewTotalCount.value > 0 && !isPreviewLoading.value
      case 'review':
        // Always allowed to advance to Save from review — the user decides
        // when their edits are ready.
        return true
      default:
        return false
    }
  })

  // --- Generate state ----------------------------------------------------
  /**
   * `idle` is the pre-run state. `in-flight` shows the loading panel.
   * `success` flips after we auto-advance to review (the step itself does
   * not linger on 'success' unless the view wants a brief confirmation).
   * `error` stays until the user retries.
   */
  const generateState = ref<'idle' | 'in-flight' | 'success' | 'error'>('idle')
  const generateError = ref<string | null>(null)
  const generateErrorCode = ref<ProfileBuildErrorCode | null>(null)
  const generatedSections = ref<ProfileSections | null>(null)
  const generatedRawResponse = ref<string>('')
  const generatedModel = ref<string>('')

  // --- Review state (Story 5) -------------------------------------------
  /**
   * Editable copy of the AI-generated sections. Starts empty and is
   * (re)seeded from `generatedSections` whenever `generate()` succeeds via
   * `syncEditedFromGenerated`. Stays in memory until the wizard unmounts or
   * the save step (Story 6) persists it.
   */
  const editedSections = ref<ProfileSections>(createEmptySections())
  /**
   * Anything the LLM produced that did not match one of the known section
   * headers (plus any prelude text before the first header). Read-only in
   * the review UI; never edited or saved — kept for transparency.
   */
  const extras = ref<string>('')
  /** Global "Edit all" toggle — flips every per-section editor open. */
  const editingAll = ref<boolean>(false)
  /**
   * Per-section edit mode. A single object, keyed by `ProfileSectionId`, so
   * the review component can render either the read or edit view without
   * extra state. `reactive` (not `ref`) so the individual boolean fields
   * are themselves reactive without `.value` gymnastics in the template.
   */
  const editingPerSection = reactive<Record<ProfileSectionId, boolean>>(
    PROFILE_SECTION_IDS.reduce(
      (acc, id) => {
        acc[id] = false
        return acc
      },
      {} as Record<ProfileSectionId, boolean>,
    ),
  )

  /**
   * Copies `generatedSections` into `editedSections` so the review UI can
   * start from the AI output and apply edits without mutating the original.
   * Called automatically after every successful `generate()` (including
   * `regenerate({ force: true })`).
   */
  function syncEditedFromGenerated(): void {
    if (!generatedSections.value) {
      editedSections.value = createEmptySections()
      return
    }
    editedSections.value = { ...generatedSections.value }
  }

  /**
   * True iff at least one section in `editedSections` differs from
   * `generatedSections`. V1 uses strict string equality — editing a
   * section and then typing the exact AI text back correctly reports
   * "no unsaved edits".
   */
  const hasUnsavedEdits = computed(() => {
    if (!generatedSections.value) return false
    for (const id of PROFILE_SECTION_IDS) {
      if (editedSections.value[id] !== generatedSections.value[id]) return true
    }
    return false
  })

  function setSectionValue(id: ProfileSectionId, value: string): void {
    editedSections.value = { ...editedSections.value, [id]: value }
  }

  function toggleEditSection(id: ProfileSectionId): void {
    editingPerSection[id] = !editingPerSection[id]
  }

  function enterEditAllMode(): void {
    editingAll.value = true
    for (const id of PROFILE_SECTION_IDS) editingPerSection[id] = true
  }

  function exitEditAllMode(): void {
    editingAll.value = false
    for (const id of PROFILE_SECTION_IDS) editingPerSection[id] = false
  }

  function revertEdits(): void {
    if (!generatedSections.value) return
    editedSections.value = { ...generatedSections.value }
    exitEditAllMode()
  }

  /**
   * Kicks off the actual LLM-driven profile build. We flip to the
   * `generate` step *before* awaiting so the UI can immediately render
   * the in-flight panel (spinner + hint) instead of waiting with a
   * frozen Next button on the preview step.
   */
  async function generate(): Promise<void> {
    currentStep.value = 'generate'
    generateState.value = 'in-flight'
    generateError.value = null
    generateErrorCode.value = null

    const userProfileStore = useUserProfileStore()
    try {
      const result = await userProfileStore.buildProfile(currentScope.value)
      generatedSections.value = result.sections
      generatedRawResponse.value = result.rawResponse
      generatedModel.value = result.model
      extras.value = result.extras
      syncEditedFromGenerated()
      generateState.value = 'success'
      currentStep.value = 'review'
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to build profile.'
      generateError.value = message
      generateErrorCode.value =
        err instanceof ProfileBuildError ? err.code : null
      generateState.value = 'error'
    }
  }

  /** Re-runs generation with the same scope. Safe to call from the UI. */
  async function retryGenerate(): Promise<void> {
    await generate()
  }

  /**
   * Re-runs `generate()` from the review step. Two-phase so the review UI
   * can ask the user before discarding unsaved manual edits:
   *   - If edits exist and `options.force` is not set, returns early with
   *     `{ confirmationNeeded: true }` so the caller shows a dialog.
   *   - Once confirmed (or there were no edits), wipes review state and
   *     delegates to `generate()`, which moves the wizard back to
   *     'generate' and then to 'review' on success.
   */
  async function regenerate(
    options: { force?: boolean } = {},
  ): Promise<{ confirmationNeeded: boolean }> {
    if (hasUnsavedEdits.value && !options.force) {
      return { confirmationNeeded: true }
    }
    exitEditAllMode()
    editedSections.value = createEmptySections()
    extras.value = ''
    await generate()
    return { confirmationNeeded: false }
  }

  // --- Navigation --------------------------------------------------------
  async function nextStep(): Promise<void> {
    if (!canAdvance.value) return
    if (currentStep.value === 'scope') {
      await computePreview()
      currentStep.value = 'preview'
      return
    }
    if (currentStep.value === 'preview') {
      await generate()
      return
    }
    if (currentStep.value === 'review') {
      // Story 5 leaves 'save' as a placeholder; Story 6 adds the real UI
      // and wires the actual createProfile() persistence.
      currentStep.value = 'save'
      return
    }
  }

  function previousStep(): void {
    const idx = stepIndex.value
    if (idx <= 0) return
    // The 'generate' step is transient — it runs the LLM call and auto-advances
    // to 'review'. Navigating back from 'review' should skip it and land on
    // 'preview' so the user returns to a stable, editable step.
    if (currentStep.value === 'review') {
      currentStep.value = 'preview'
      return
    }
    currentStep.value = STEP_ORDER[idx - 1]
  }

  function goToStep(step: ProfileBuildStep): void {
    const target = STEP_ORDER.indexOf(step)
    if (target === -1) return
    // Only allow navigating backward via step dots; forward requires nextStep().
    if (target > stepIndex.value) return
    currentStep.value = step
  }

  // --- Preview computation ----------------------------------------------
  async function computePreview(): Promise<void> {
    isPreviewLoading.value = true
    previewError.value = null
    try {
      const { start, end } = resolveDateRange(dateRange.value)
      const result = await queryScopePreview({
        dataTypes: [...dataTypes.value],
        start,
        end,
        filters: {
          emotionQuadrants: filters.emotionQuadrants ? [...filters.emotionQuadrants] : [],
          peopleTagIds: filters.peopleTagIds ? [...filters.peopleTagIds] : [],
          contextTagIds: filters.contextTagIds ? [...filters.contextTagIds] : [],
          lifeAreaIds: filters.lifeAreaIds ? [...filters.lifeAreaIds] : [],
        },
      })
      previewCountsByType.value = result.countsByType
      previewObjectIdsByType.value = result.objectIdsByType
      previewObjectHeaders.value = result.headers
      previewApproxTokens.value = result.approxTokens
    } catch (err) {
      previewError.value = err instanceof Error ? err.message : 'Preview failed.'
      previewCountsByType.value = {}
      previewObjectIdsByType.value = {}
      previewObjectHeaders.value = []
      previewApproxTokens.value = 0
    } finally {
      isPreviewLoading.value = false
    }
  }

  // --- Draft persistence -------------------------------------------------
  let draftSaveTimer: ReturnType<typeof setTimeout> | null = null
  let hydrating = false

  function serializeDraft(): string {
    const payload: PersistedDraft = {
      dataTypes: [...dataTypes.value],
      dateRange: JSON.parse(JSON.stringify(dateRange.value)) as ProfileDateRange,
      filters: {
        emotionQuadrants: filters.emotionQuadrants ? [...filters.emotionQuadrants] : [],
        peopleTagIds: filters.peopleTagIds ? [...filters.peopleTagIds] : [],
        contextTagIds: filters.contextTagIds ? [...filters.contextTagIds] : [],
        lifeAreaIds: filters.lifeAreaIds ? [...filters.lifeAreaIds] : [],
      },
    }
    return JSON.stringify(payload)
  }

  async function loadDraft(): Promise<void> {
    try {
      const raw = await loadDraftFromDB(WIZARD_DRAFT_KEY)
      if (!raw) {
        ready.value = true
        return
      }
      const parsed = sanitiseDraft(JSON.parse(raw))
      if (parsed) {
        hydrating = true
        dataTypes.value = parsed.dataTypes
        dateRange.value = parsed.dateRange
        filters.emotionQuadrants = parsed.filters.emotionQuadrants ?? []
        filters.peopleTagIds = parsed.filters.peopleTagIds ?? []
        filters.contextTagIds = parsed.filters.contextTagIds ?? []
        filters.lifeAreaIds = parsed.filters.lifeAreaIds ?? []
        // Give Vue a tick to flush the watcher triggered by hydration before
        // we allow scheduleSave to actually fire again.
        Promise.resolve().then(() => {
          hydrating = false
        })
      }
    } catch (err) {
      console.warn('Failed to load profile-build-wizard draft:', err)
    } finally {
      ready.value = true
    }
  }

  function scheduleSave(): void {
    if (hydrating) return
    if (draftSaveTimer) clearTimeout(draftSaveTimer)
    draftSaveTimer = setTimeout(() => {
      void saveDraftToDB(WIZARD_DRAFT_KEY, serializeDraft())
      draftSaveTimer = null
    }, 300)
  }

  function flushDraft(): void {
    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer)
      draftSaveTimer = null
      void saveDraftToDB(WIZARD_DRAFT_KEY, serializeDraft())
    }
  }

  async function resetDraft(): Promise<void> {
    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer)
      draftSaveTimer = null
    }
    await clearDraftFromDB(WIZARD_DRAFT_KEY)
  }

  // Watch scope fields and schedule a debounced save whenever they change.
  watch(
    () => [dataTypes.value, dateRange.value, filters] as const,
    () => {
      if (!ready.value) return
      scheduleSave()
    },
    { deep: true },
  )

  onMounted(() => {
    void loadDraft()
  })

  onUnmounted(() => {
    flushDraft()
  })

  return {
    // State
    ready,
    currentStep,
    stepIndex,
    dataTypes,
    dateRange,
    filters,
    // Preview
    previewCountsByType,
    previewObjectIdsByType,
    previewObjectHeaders,
    previewApproxTokens,
    previewTotalCount,
    isPreviewLoading,
    previewError,
    // Generate
    generateState,
    generateError,
    generateErrorCode,
    generatedSections,
    generatedRawResponse,
    generatedModel,
    // Review
    editedSections,
    extras,
    editingAll,
    editingPerSection,
    hasUnsavedEdits,
    // Derived
    currentScope,
    canAdvance,
    // Actions
    nextStep,
    previousStep,
    goToStep,
    computePreview,
    generate,
    retryGenerate,
    regenerate,
    setSectionValue,
    toggleEditSection,
    enterEditAllMode,
    exitEditAllMode,
    revertEdits,
    syncEditedFromGenerated,
    // Draft API
    loadDraft,
    scheduleSave,
    flushDraft,
    resetDraft,
  }
}
