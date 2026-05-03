/**
 * App-state reset coordinator.
 *
 * Eliminates cross-account data leaks: when the active user switches
 * (logout-then-login as a different user, or in-place user swap), the
 * `MindfullGrowthDB_simplify_{userId}` connection is rebound by
 * `connectUserDatabase()` — but the in-memory state of every Pinia
 * store and module-level cache still holds the previous user's data.
 *
 * `resetAppState()` wipes everything that's not tied to the auth
 * session itself, so the next render reads fresh state from the new
 * per-user database.
 *
 * Order matters:
 *   1. Service caches — cleared FIRST so any computed/watch that
 *      re-evaluates during the store resets reads from the empty
 *      cache rather than handing back stale Promises from the
 *      previous user's DB.
 *   2. Pinia stores — synchronous ref mutations.
 *   3. localStorage — last; cheapest and most isolated.
 *
 * Excluded by design:
 *   - `auth.store` — owns the user/session itself; it triggers the
 *     reset and must not reset itself.
 *   - The Dexie connection swap is handled by
 *     `connectUserDatabase()` / `disconnectUserDatabase()` and is
 *     fully `await`-ed before this function fires.
 *
 * Wired up in `src/components/AppShell.vue` via a watcher on
 * `authStore.user?.id`. See plan: `Eliminacja wycieku danych między
 * kontami (Opcja 3 — Hybryda)`.
 */

// --- Service caches ---------------------------------------------------------
import { clearTrendCache } from '@/services/calendarChartData'
import { clearCalendarViewCaches } from '@/services/calendarViewQueries'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'

// --- localStorage cleanup ---------------------------------------------------
import { clearChartScalePreferences } from '@/composables/useChartScale'

// --- Pinia stores (45 — auth.store excluded by design) ----------------------
import { useAssessmentStore } from '@/stores/assessment.store'
import { useAttitudinalShiftStore } from '@/stores/attitudinalShift.store'
import { useBehavioralActivationStore } from '@/stores/behavioralActivation.store'
import { useBehavioralExperimentStore } from '@/stores/behavioralExperiment.store'
import { useChatStore } from '@/stores/chat.store'
import { useCompassionateLetterStore } from '@/stores/compassionateLetter.store'
import { useCoreBeliefsStore } from '@/stores/coreBeliefs.store'
import { useDereflectionStore } from '@/stores/dereflection.store'
import { useDistortionAssessmentStore } from '@/stores/distortionAssessment.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useGradedExposureStore } from '@/stores/gradedExposure.store'
import { useIFSConstellationStore } from '@/stores/ifsConstellation.store'
import { useIFSDailyCheckInStore } from '@/stores/ifsDailyCheckIn.store'
import { useIFSDirectAccessStore } from '@/stores/ifsDirectAccess.store'
import { useIFSExileWitnessingStore } from '@/stores/ifsExileWitnessing.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useIFSPartsDialogueStore } from '@/stores/ifsPartsDialogue.store'
import { useIFSPartsMapStore } from '@/stores/ifsPartsMap.store'
import { useIFSProtectorAppreciationStore } from '@/stores/ifsProtectorAppreciation.store'
import { useIFSSelfEnergyStore } from '@/stores/ifsSelfEnergy.store'
import { useIFSTrailheadStore } from '@/stores/ifsTrailhead.store'
import { useIFSUnblendingStore } from '@/stores/ifsUnblending.store'
import { useJournalStore } from '@/stores/journal.store'
import { useLegacyLetterStore } from '@/stores/legacyLetter.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useLifeAreaAssessmentStore } from '@/stores/lifeAreaAssessment.store'
import { useMountainRangeStore } from '@/stores/mountainRange.store'
import { useObjectsLibraryStore } from '@/stores/objectsLibrary.store'
import { useParadoxicalIntentionStore } from '@/stores/paradoxicalIntention.store'
import { usePositiveDataLogStore } from '@/stores/positiveDataLog.store'
import { useShadowBeliefsStore } from '@/stores/shadowBeliefs.store'
import { useSocraticDialogueStore } from '@/stores/socraticDialogue.store'
import { useStructuredProblemSolvingStore } from '@/stores/structuredProblemSolving.store'
import { useStructuredReflectionStore } from '@/stores/structuredReflection.store'
import { useTagStore } from '@/stores/tag.store'
import { useThoughtRecordStore } from '@/stores/thoughtRecord.store'
import { useThreePathwaysStore } from '@/stores/threePathways.store'
import { useTodayStore } from '@/stores/today.store'
import { useTragicOptimismStore } from '@/stores/tragicOptimism.store'
import { useTransformativePurposeStore } from '@/stores/transformativePurpose.store'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { useUserProfileStore } from '@/stores/userProfile.store'
import { useValuesDiscoveryStore } from '@/stores/valuesDiscovery.store'
import { useWorryTreeStore } from '@/stores/worryTree.store'

/**
 * Wipes every Pinia store, every module-level cache, and every
 * cross-user localStorage key — synchronously.
 *
 * Safe to call any time after Pinia is installed. After it returns,
 * components and watchers will see freshly-defaulted state and
 * trigger their normal `load*()` flows against the (already-rebound)
 * per-user IndexedDB.
 */
export function resetAppState(): void {
  // 1) Service caches FIRST — so any subsequent computed/watch that
  //    re-runs during store resets does not pull stale Promises from
  //    the previous user's DB.
  clearTrendCache()
  clearCalendarViewCaches()
  invalidatePlanningQueryCache()

  // 2) Pinia stores. Order within this block doesn't matter — every
  //    `reset()` is a synchronous ref mutation. Listed alphabetically
  //    for diff stability.
  useAssessmentStore().reset()
  useAttitudinalShiftStore().reset()
  useBehavioralActivationStore().reset()
  useBehavioralExperimentStore().reset()
  useChatStore().reset()
  useCompassionateLetterStore().reset()
  useCoreBeliefsStore().reset()
  useDereflectionStore().reset()
  useDistortionAssessmentStore().reset()
  useEmotionStore().reset()
  useEmotionLogStore().reset()
  useGradedExposureStore().reset()
  useIFSConstellationStore().reset()
  useIFSDailyCheckInStore().reset()
  useIFSDirectAccessStore().reset()
  useIFSExileWitnessingStore().reset()
  useIFSPartStore().reset()
  useIFSPartsDialogueStore().reset()
  useIFSPartsMapStore().reset()
  useIFSProtectorAppreciationStore().reset()
  useIFSSelfEnergyStore().reset()
  useIFSTrailheadStore().reset()
  useIFSUnblendingStore().reset()
  useJournalStore().reset()
  useLegacyLetterStore().reset()
  useLifeAreaStore().reset()
  useLifeAreaAssessmentStore().reset()
  useMountainRangeStore().reset()
  useObjectsLibraryStore().reset()
  useParadoxicalIntentionStore().reset()
  usePositiveDataLogStore().reset()
  useShadowBeliefsStore().reset()
  useSocraticDialogueStore().reset()
  useStructuredProblemSolvingStore().reset()
  useStructuredReflectionStore().reset()
  useTagStore().reset()
  useThoughtRecordStore().reset()
  useThreePathwaysStore().reset()
  useTodayStore().reset()
  useTragicOptimismStore().reset()
  useTransformativePurposeStore().reset()
  useUserPreferencesStore().reset()
  useUserProfileStore().reset()
  useValuesDiscoveryStore().reset()
  useWorryTreeStore().reset()

  // 3) localStorage LAST — independent of every store/cache above.
  clearChartScalePreferences()
}
