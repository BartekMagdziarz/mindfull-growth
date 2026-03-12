<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <div class="mb-6">
      <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.title') }}</h1>
      <p class="text-sm text-on-surface-variant">
        {{ t('exercises.subtitle') }}
      </p>
    </div>

    <!-- Tab Navigation -->
    <div class="mb-6">
      <div
        class="neo-segmented"
        role="tablist"
        aria-label="Exercise category tabs"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          class="neo-segmented__item neo-focus"
          :class="{ 'neo-segmented__item--active': activeTab === tab.id }"
          :aria-selected="activeTab === tab.id"
          :aria-controls="`exercises-panel-${tab.id}`"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Self-Discovery Tab -->
    <div
      v-if="activeTab === 'self-discovery'"
      id="exercises-panel-self-discovery"
      role="tabpanel"
      aria-label="Self-discovery exercises"
      class="space-y-3"
    >
      <ExerciseCard
        :title="t('exercises.cards.valuesDiscovery.title')"
        :subtitle="t('exercises.cards.valuesDiscovery.subtitle')"
        :description="t('exercises.cards.valuesDiscovery.description')"
        :icon="HeartIcon"
        icon-bg-class="bg-pink-100"
        icon-class="text-pink-600"
        :last-completed="latestValuesDate"
        @click="router.push('/exercises/values')"
      />

      <ExerciseCard
        :title="t('exercises.cards.wheelOfLife.title')"
        :subtitle="t('exercises.cards.wheelOfLife.subtitle')"
        :description="t('exercises.cards.wheelOfLife.description')"
        :icon="ChartPieIcon"
        icon-bg-class="bg-primary-soft"
        icon-class="text-primary"
        :last-completed="latestWheelDate"
        @click="router.push('/exercises/wheel-of-life')"
      />

      <ExerciseCard
        :title="t('exercises.cards.shadowBeliefs.title')"
        :subtitle="t('exercises.cards.shadowBeliefs.subtitle')"
        :description="t('exercises.cards.shadowBeliefs.description')"
        :icon="EyeIcon"
        icon-bg-class="bg-purple-100"
        icon-class="text-purple-600"
        :last-completed="latestBeliefsDate"
        @click="router.push('/exercises/shadow-beliefs')"
      />

      <ExerciseCard
        :title="t('exercises.cards.transformativePurpose.title')"
        :subtitle="t('exercises.cards.transformativePurpose.subtitle')"
        :description="t('exercises.cards.transformativePurpose.description')"
        :icon="SparklesIcon"
        icon-bg-class="bg-amber-100"
        icon-class="text-amber-600"
        :last-completed="latestPurposeDate"
        @click="router.push('/exercises/purpose')"
      />

      <ExerciseCard
        :title="t('exercises.cards.ipipBfm50.title')"
        :subtitle="t('exercises.cards.ipipBfm50.subtitle')"
        :description="t('exercises.cards.ipipBfm50.description')"
        :icon="ChartBarIcon"
        icon-bg-class="bg-blue-100"
        icon-class="text-blue-600"
        :last-completed="latestIpipBfm50Date"
        @click="router.push('/exercises/assessments/ipip-bfm-50')"
      />

      <ExerciseCard
        :title="t('exercises.cards.ipipNeo120.title')"
        :subtitle="t('exercises.cards.ipipNeo120.subtitle')"
        :description="t('exercises.cards.ipipNeo120.description')"
        :icon="DocumentTextIcon"
        icon-bg-class="bg-indigo-100"
        icon-class="text-indigo-600"
        :last-completed="latestIpipNeo120Date"
        @click="router.push('/exercises/assessments/ipip-neo-120')"
      />

      <ExerciseCard
        :title="t('exercises.cards.hexaco60.title')"
        :subtitle="t('exercises.cards.hexaco60.subtitle')"
        :description="t('exercises.cards.hexaco60.description')"
        :icon="Squares2X2Icon"
        icon-bg-class="bg-teal-100"
        icon-class="text-teal-600"
        :last-completed="latestHexaco60Date"
        @click="router.push('/exercises/assessments/hexaco-60')"
      />

      <ExerciseCard
        :title="t('exercises.cards.pvq40.title')"
        :subtitle="t('exercises.cards.pvq40.subtitle')"
        :description="t('exercises.cards.pvq40.description')"
        :icon="HeartIcon"
        icon-bg-class="bg-rose-100"
        icon-class="text-rose-600"
        :last-completed="latestPvq40Date"
        @click="router.push('/exercises/assessments/pvq-40')"
      />

      <ExerciseCard
        :title="t('exercises.cards.vlq.title')"
        :subtitle="t('exercises.cards.vlq.subtitle')"
        :description="t('exercises.cards.vlq.description')"
        :icon="LightBulbIcon"
        icon-bg-class="bg-emerald-100"
        icon-class="text-emerald-600"
        :last-completed="latestVlqDate"
        @click="router.push('/exercises/assessments/vlq')"
      />
    </div>

    <!-- CBT Tab -->
    <div
      v-if="activeTab === 'cbt'"
      id="exercises-panel-cbt"
      role="tabpanel"
      aria-label="CBT exercises"
      class="space-y-3"
    >
      <ExerciseCard
        :title="t('exercises.cards.worryTree.title')"
        :subtitle="t('exercises.cards.worryTree.subtitle')"
        :description="t('exercises.cards.worryTree.description')"
        :icon="ArrowsPointingOutIcon"
        icon-bg-class="bg-teal-100"
        icon-class="text-teal-600"
        :last-completed="latestWorryTreeDate"
        @click="router.push('/exercises/worry-tree')"
      />

      <ExerciseCard
        :title="t('exercises.cards.cognitiveDistortions.title')"
        :subtitle="t('exercises.cards.cognitiveDistortions.subtitle')"
        :description="t('exercises.cards.cognitiveDistortions.description')"
        :icon="PuzzlePieceIcon"
        icon-bg-class="bg-indigo-100"
        icon-class="text-indigo-600"
        :last-completed="latestDistortionDate"
        ai-assisted
        @click="router.push('/exercises/cognitive-distortions')"
      />

      <ExerciseCard
        :title="t('exercises.cards.thoughtRecord.title')"
        :subtitle="t('exercises.cards.thoughtRecord.subtitle')"
        :description="t('exercises.cards.thoughtRecord.description')"
        :icon="DocumentTextIcon"
        icon-bg-class="bg-sky-100"
        icon-class="text-sky-600"
        :last-completed="latestThoughtRecordDate"
        ai-assisted
        @click="router.push('/exercises/thought-record')"
      />

      <ExerciseCard
        :title="t('exercises.cards.coreBeliefs.title')"
        :subtitle="t('exercises.cards.coreBeliefs.subtitle')"
        :description="t('exercises.cards.coreBeliefs.description')"
        :icon="LightBulbIcon"
        icon-bg-class="bg-amber-100"
        icon-class="text-amber-600"
        :last-completed="latestCoreBeliefsDate"
        ai-assisted
        @click="router.push('/exercises/core-beliefs')"
      />

      <ExerciseCard
        :title="t('exercises.cards.compassionateLetter.title')"
        :subtitle="t('exercises.cards.compassionateLetter.subtitle')"
        :description="t('exercises.cards.compassionateLetter.description')"
        :icon="PencilSquareIcon"
        icon-bg-class="bg-rose-100"
        icon-class="text-rose-600"
        :last-completed="latestCompassionateLetterDate"
        ai-assisted
        @click="router.push('/exercises/compassionate-letter')"
      />

      <ExerciseCard
        :title="t('exercises.cards.positiveDataLog.title')"
        :subtitle="t('exercises.cards.positiveDataLog.subtitle')"
        :description="t('exercises.cards.positiveDataLog.description')"
        :icon="ClipboardDocumentListIcon"
        icon-bg-class="bg-emerald-100"
        icon-class="text-emerald-600"
        :last-completed="latestPositiveDataLogDate"
        ai-assisted
        @click="router.push('/exercises/positive-data-log')"
      />

      <ExerciseCard
        :title="t('exercises.cards.behavioralExperiment.title')"
        :subtitle="t('exercises.cards.behavioralExperiment.subtitle')"
        :description="t('exercises.cards.behavioralExperiment.description')"
        :icon="BeakerIcon"
        icon-bg-class="bg-cyan-100"
        icon-class="text-cyan-600"
        :last-completed="latestBehavioralExperimentDate"
        ai-assisted
        @click="router.push('/exercises/behavioral-experiment')"
      />

      <ExerciseCard
        :title="t('exercises.cards.behavioralActivation.title')"
        :subtitle="t('exercises.cards.behavioralActivation.subtitle')"
        :description="t('exercises.cards.behavioralActivation.description')"
        :icon="CalendarDaysIcon"
        icon-bg-class="bg-lime-100"
        icon-class="text-lime-600"
        :last-completed="latestBehavioralActivationDate"
        ai-assisted
        @click="router.push('/exercises/behavioral-activation')"
      />

      <ExerciseCard
        :title="t('exercises.cards.structuredProblemSolving.title')"
        :subtitle="t('exercises.cards.structuredProblemSolving.subtitle')"
        :description="t('exercises.cards.structuredProblemSolving.description')"
        :icon="WrenchScrewdriverIcon"
        icon-bg-class="bg-orange-100"
        icon-class="text-orange-600"
        :last-completed="latestStructuredProblemSolvingDate"
        ai-assisted
        @click="router.push('/exercises/structured-problem-solving')"
      />

      <ExerciseCard
        :title="t('exercises.cards.gradedExposure.title')"
        :subtitle="t('exercises.cards.gradedExposure.subtitle')"
        :description="t('exercises.cards.gradedExposure.description')"
        :icon="ArrowTrendingUpIcon"
        icon-bg-class="bg-violet-100"
        icon-class="text-violet-600"
        :last-completed="latestGradedExposureDate"
        ai-assisted
        @click="router.push('/exercises/graded-exposure')"
      />
    </div>

    <!-- Logotherapy Tab -->
    <div
      v-if="activeTab === 'logotherapy'"
      id="exercises-panel-logotherapy"
      role="tabpanel"
      aria-label="Logotherapy exercises"
      class="space-y-3"
    >
      <ExerciseCard
        :title="t('exercises.cards.threePathways.title')"
        :subtitle="t('exercises.cards.threePathways.subtitle')"
        :description="t('exercises.cards.threePathways.description')"
        :icon="Squares2X2Icon"
        icon-bg-class="bg-emerald-100"
        icon-class="text-emerald-600"
        :last-completed="latestThreePathwaysDate"
        ai-assisted
        @click="router.push('/exercises/three-pathways')"
      />

      <ExerciseCard
        :title="t('exercises.cards.socraticDialogue.title')"
        :subtitle="t('exercises.cards.socraticDialogue.subtitle')"
        :description="t('exercises.cards.socraticDialogue.description')"
        :icon="ChatBubbleLeftRightIcon"
        icon-bg-class="bg-sky-100"
        icon-class="text-sky-600"
        :last-completed="latestSocraticDialogueDate"
        ai-assisted
        @click="router.push('/exercises/socratic-dialogue')"
      />

      <ExerciseCard
        :title="t('exercises.cards.mountainRange.title')"
        :subtitle="t('exercises.cards.mountainRange.subtitle')"
        :description="t('exercises.cards.mountainRange.description')"
        :icon="ChartBarIcon"
        icon-bg-class="bg-amber-100"
        icon-class="text-amber-600"
        :last-completed="latestMountainRangeDate"
        ai-assisted
        @click="router.push('/exercises/mountain-range')"
      />

      <ExerciseCard
        :title="t('exercises.cards.paradoxicalIntention.title')"
        :subtitle="t('exercises.cards.paradoxicalIntention.subtitle')"
        :description="t('exercises.cards.paradoxicalIntention.description')"
        :icon="FaceSmileIcon"
        icon-bg-class="bg-yellow-100"
        icon-class="text-yellow-600"
        :last-completed="latestParadoxicalIntentionDate"
        ai-assisted
        @click="router.push('/exercises/paradoxical-intention')"
      />

      <ExerciseCard
        :title="t('exercises.cards.dereflection.title')"
        :subtitle="t('exercises.cards.dereflection.subtitle')"
        :description="t('exercises.cards.dereflection.description')"
        :icon="ArrowUturnRightIcon"
        icon-bg-class="bg-teal-100"
        icon-class="text-teal-600"
        :last-completed="latestDereflectionDate"
        @click="router.push('/exercises/dereflection')"
      />

      <ExerciseCard
        :title="t('exercises.cards.tragicOptimism.title')"
        :subtitle="t('exercises.cards.tragicOptimism.subtitle')"
        :description="t('exercises.cards.tragicOptimism.description')"
        :icon="SunIcon"
        icon-bg-class="bg-orange-100"
        icon-class="text-orange-600"
        :last-completed="latestTragicOptimismDate"
        ai-assisted
        @click="router.push('/exercises/tragic-optimism')"
      />

      <ExerciseCard
        :title="t('exercises.cards.attitudinalShift.title')"
        :subtitle="t('exercises.cards.attitudinalShift.subtitle')"
        :description="t('exercises.cards.attitudinalShift.description')"
        :icon="ArrowPathIcon"
        icon-bg-class="bg-indigo-100"
        icon-class="text-indigo-600"
        :last-completed="latestAttitudinalShiftDate"
        ai-assisted
        @click="router.push('/exercises/attitudinal-shift')"
      />

      <ExerciseCard
        :title="t('exercises.cards.legacyLetter.title')"
        :subtitle="t('exercises.cards.legacyLetter.subtitle')"
        :description="t('exercises.cards.legacyLetter.description')"
        :icon="EnvelopeIcon"
        icon-bg-class="bg-rose-100"
        icon-class="text-rose-600"
        :last-completed="latestLegacyLetterDate"
        ai-assisted
        @click="router.push('/exercises/legacy-letter')"
      />
    </div>

    <!-- IFS Tab -->
    <div
      v-if="activeTab === 'ifs'"
      id="exercises-panel-ifs"
      role="tabpanel"
      aria-label="IFS exercises"
      class="space-y-3"
    >
      <ExerciseCard
        :title="t('exercises.cards.partsMapping.title')"
        :subtitle="t('exercises.cards.partsMapping.subtitle')"
        :description="t('exercises.cards.partsMapping.description')"
        :icon="MapIcon"
        icon-bg-class="bg-violet-100"
        icon-class="text-violet-600"
        :last-completed="latestPartsMappingDate"
        ai-assisted
        @click="router.push('/exercises/parts-mapping')"
      />

      <ExerciseCard
        :title="t('exercises.cards.unblending.title')"
        :subtitle="t('exercises.cards.unblending.subtitle')"
        :description="t('exercises.cards.unblending.description')"
        :icon="ArrowsPointingInIcon"
        icon-bg-class="bg-cyan-100"
        icon-class="text-cyan-600"
        :last-completed="latestUnblendingDate"
        @click="router.push('/exercises/unblending')"
      />

      <ExerciseCard
        :title="t('exercises.cards.directAccess.title')"
        :subtitle="t('exercises.cards.directAccess.subtitle')"
        :description="t('exercises.cards.directAccess.description')"
        :icon="ChatBubbleLeftRightIcon"
        icon-bg-class="bg-indigo-100"
        icon-class="text-indigo-600"
        :last-completed="latestDirectAccessDate"
        ai-assisted
        @click="router.push('/exercises/direct-access')"
      />

      <ExerciseCard
        :title="t('exercises.cards.trailhead.title')"
        :subtitle="t('exercises.cards.trailhead.subtitle')"
        :description="t('exercises.cards.trailhead.description')"
        :icon="MapPinIcon"
        icon-bg-class="bg-amber-100"
        icon-class="text-amber-600"
        :last-completed="latestTrailheadDate"
        @click="router.push('/exercises/trailhead')"
      />

      <ExerciseCard
        :title="t('exercises.cards.protectorAppreciation.title')"
        :subtitle="t('exercises.cards.protectorAppreciation.subtitle')"
        :description="t('exercises.cards.protectorAppreciation.description')"
        :icon="ShieldCheckIcon"
        icon-bg-class="bg-emerald-100"
        icon-class="text-emerald-600"
        :last-completed="latestProtectorAppreciationDate"
        ai-assisted
        @click="router.push('/exercises/protector-appreciation')"
      />

      <ExerciseCard
        :title="t('exercises.cards.exileWitnessing.title')"
        :subtitle="t('exercises.cards.exileWitnessing.subtitle')"
        :description="t('exercises.cards.exileWitnessing.description')"
        :icon="HeartIcon"
        icon-bg-class="bg-rose-100"
        icon-class="text-rose-600"
        :last-completed="latestExileWitnessingDate"
        @click="router.push('/exercises/exile-witnessing')"
      />

      <ExerciseCard
        :title="t('exercises.cards.selfEnergy.title')"
        :subtitle="t('exercises.cards.selfEnergy.subtitle')"
        :description="t('exercises.cards.selfEnergy.description')"
        :icon="SunIcon"
        icon-bg-class="bg-yellow-100"
        icon-class="text-yellow-600"
        :last-completed="latestSelfEnergyDate"
        @click="router.push('/exercises/self-energy')"
      />

      <ExerciseCard
        :title="t('exercises.cards.partsDialogue.title')"
        :subtitle="t('exercises.cards.partsDialogue.subtitle')"
        :description="t('exercises.cards.partsDialogue.description')"
        :icon="PencilSquareIcon"
        icon-bg-class="bg-sky-100"
        icon-class="text-sky-600"
        :last-completed="latestPartsDialogueDate"
        ai-assisted
        @click="router.push('/exercises/parts-dialogue')"
      />

      <ExerciseCard
        :title="t('exercises.cards.dailyCheckIn.title')"
        :subtitle="t('exercises.cards.dailyCheckIn.subtitle')"
        :description="t('exercises.cards.dailyCheckIn.description')"
        :icon="ClockIcon"
        icon-bg-class="bg-teal-100"
        icon-class="text-teal-600"
        :last-completed="latestDailyCheckInDate"
        @click="router.push('/exercises/daily-ifs-checkin')"
      />

      <ExerciseCard
        :title="t('exercises.cards.constellation.title')"
        :subtitle="t('exercises.cards.constellation.subtitle')"
        :description="t('exercises.cards.constellation.description')"
        :icon="GlobeAltIcon"
        icon-bg-class="bg-fuchsia-100"
        icon-class="text-fuchsia-600"
        :last-completed="latestConstellationDate"
        ai-assisted
        @click="router.push('/exercises/constellation')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useT } from '@/composables/useT'
import {
  HeartIcon,
  ChartPieIcon,
  EyeIcon,
  SparklesIcon,
  ArrowsPointingOutIcon,
  PuzzlePieceIcon,
  DocumentTextIcon,
  LightBulbIcon,
  PencilSquareIcon,
  ClipboardDocumentListIcon,
  BeakerIcon,
  CalendarDaysIcon,
  WrenchScrewdriverIcon,
  ArrowTrendingUpIcon,
  Squares2X2Icon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  FaceSmileIcon,
  ArrowUturnRightIcon,
  SunIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  MapIcon,
  ArrowsPointingInIcon,
  MapPinIcon,
  ShieldCheckIcon,
  ClockIcon,
  GlobeAltIcon,
} from '@heroicons/vue/24/outline'
import ExerciseCard from '@/components/exercises/ExerciseCard.vue'
import { useLifeAreaAssessmentStore } from '@/stores/lifeAreaAssessment.store'
import { useValuesDiscoveryStore } from '@/stores/valuesDiscovery.store'
import { useShadowBeliefsStore } from '@/stores/shadowBeliefs.store'
import { useTransformativePurposeStore } from '@/stores/transformativePurpose.store'
import { useThoughtRecordStore } from '@/stores/thoughtRecord.store'
import { useDistortionAssessmentStore } from '@/stores/distortionAssessment.store'
import { useWorryTreeStore } from '@/stores/worryTree.store'
import { useCoreBeliefsStore } from '@/stores/coreBeliefs.store'
import { useCompassionateLetterStore } from '@/stores/compassionateLetter.store'
import { usePositiveDataLogStore } from '@/stores/positiveDataLog.store'
import { useBehavioralExperimentStore } from '@/stores/behavioralExperiment.store'
import { useBehavioralActivationStore } from '@/stores/behavioralActivation.store'
import { useStructuredProblemSolvingStore } from '@/stores/structuredProblemSolving.store'
import { useGradedExposureStore } from '@/stores/gradedExposure.store'
import { useThreePathwaysStore } from '@/stores/threePathways.store'
import { useSocraticDialogueStore } from '@/stores/socraticDialogue.store'
import { useMountainRangeStore } from '@/stores/mountainRange.store'
import { useParadoxicalIntentionStore } from '@/stores/paradoxicalIntention.store'
import { useDereflectionStore } from '@/stores/dereflection.store'
import { useTragicOptimismStore } from '@/stores/tragicOptimism.store'
import { useAttitudinalShiftStore } from '@/stores/attitudinalShift.store'
import { useLegacyLetterStore } from '@/stores/legacyLetter.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useIFSPartsMapStore } from '@/stores/ifsPartsMap.store'
import { useIFSUnblendingStore } from '@/stores/ifsUnblending.store'
import { useIFSDirectAccessStore } from '@/stores/ifsDirectAccess.store'
import { useIFSTrailheadStore } from '@/stores/ifsTrailhead.store'
import { useIFSProtectorAppreciationStore } from '@/stores/ifsProtectorAppreciation.store'
import { useIFSExileWitnessingStore } from '@/stores/ifsExileWitnessing.store'
import { useIFSSelfEnergyStore } from '@/stores/ifsSelfEnergy.store'
import { useIFSPartsDialogueStore } from '@/stores/ifsPartsDialogue.store'
import { useIFSDailyCheckInStore } from '@/stores/ifsDailyCheckIn.store'
import { useIFSConstellationStore } from '@/stores/ifsConstellation.store'
import { useAssessmentStore } from '@/stores/assessment.store'

const router = useRouter()
const { t } = useT()

// Self-discovery stores
const lifeAreaAssessmentStore = useLifeAreaAssessmentStore()
const valuesStore = useValuesDiscoveryStore()
const beliefsStore = useShadowBeliefsStore()
const purposeStore = useTransformativePurposeStore()

// CBT stores (Phase 1)
const thoughtRecordStore = useThoughtRecordStore()
const distortionStore = useDistortionAssessmentStore()
const worryTreeStore = useWorryTreeStore()

// CBT stores (Phase 2)
const coreBeliefsStore = useCoreBeliefsStore()
const compassionateLetterStore = useCompassionateLetterStore()
const positiveDataLogStore = usePositiveDataLogStore()

// CBT stores (Phase 3)
const behavioralExperimentStore = useBehavioralExperimentStore()
const behavioralActivationStore = useBehavioralActivationStore()
const structuredProblemSolvingStore = useStructuredProblemSolvingStore()

// CBT stores (Phase 4)
const gradedExposureStore = useGradedExposureStore()

// Logotherapy stores
const threePathwaysStore = useThreePathwaysStore()
const socraticDialogueStore = useSocraticDialogueStore()
const mountainRangeStore = useMountainRangeStore()
const paradoxicalIntentionStore = useParadoxicalIntentionStore()
const dereflectionStore = useDereflectionStore()
const tragicOptimismStore = useTragicOptimismStore()
const attitudinalShiftStore = useAttitudinalShiftStore()
const legacyLetterStore = useLegacyLetterStore()

// IFS stores
const ifsPartStore = useIFSPartStore()
const ifsPartsMapStore = useIFSPartsMapStore()
const ifsUnblendingStore = useIFSUnblendingStore()
const ifsDirectAccessStore = useIFSDirectAccessStore()
const ifsTrailheadStore = useIFSTrailheadStore()
const ifsProtectorAppreciationStore = useIFSProtectorAppreciationStore()
const ifsExileWitnessingStore = useIFSExileWitnessingStore()
const ifsSelfEnergyStore = useIFSSelfEnergyStore()
const ifsPartsDialogueStore = useIFSPartsDialogueStore()
const ifsDailyCheckInStore = useIFSDailyCheckInStore()
const ifsConstellationStore = useIFSConstellationStore()
const assessmentStore = useAssessmentStore()

// Tab configuration
type TabId = 'self-discovery' | 'cbt' | 'logotherapy' | 'ifs'
const activeTab = ref<TabId>('self-discovery')

const tabs = computed(() => [
  { id: 'self-discovery' as const, label: t('exercises.tabs.selfDiscovery') },
  { id: 'cbt' as const, label: t('exercises.tabs.cbt') },
  { id: 'logotherapy' as const, label: t('exercises.tabs.logotherapy') },
  { id: 'ifs' as const, label: t('exercises.tabs.ifs') },
])

onMounted(() => {
  lifeAreaAssessmentStore.loadAssessments()
  valuesStore.loadDiscoveries()
  beliefsStore.loadBeliefs()
  purposeStore.loadPurposes()
  thoughtRecordStore.loadRecords()
  distortionStore.loadAssessments()
  worryTreeStore.loadEntries()
  coreBeliefsStore.loadExplorations()
  compassionateLetterStore.loadLetters()
  positiveDataLogStore.loadLogs()
  behavioralExperimentStore.loadExperiments()
  behavioralActivationStore.loadActivations()
  structuredProblemSolvingStore.loadSessions()
  gradedExposureStore.loadHierarchies()
  threePathwaysStore.loadExplorations()
  socraticDialogueStore.loadDialogues()
  mountainRangeStore.loadExplorations()
  paradoxicalIntentionStore.loadLabs()
  dereflectionStore.loadPractices()
  tragicOptimismStore.loadEntries()
  attitudinalShiftStore.loadShifts()
  legacyLetterStore.loadLetters()
  ifsPartStore.loadParts()
  ifsPartsMapStore.loadMaps()
  ifsUnblendingStore.loadSessions()
  ifsDirectAccessStore.loadSessions()
  ifsTrailheadStore.loadEntries()
  ifsProtectorAppreciationStore.loadAppreciations()
  ifsExileWitnessingStore.loadWitnessings()
  ifsSelfEnergyStore.loadCheckIns()
  ifsPartsDialogueStore.loadDialogues()
  ifsDailyCheckInStore.loadCheckIns()
  ifsConstellationStore.loadConstellations()
  assessmentStore.loadAttempts('ipip-bfm-50')
  assessmentStore.loadAttempts('ipip-neo-120')
  assessmentStore.loadAttempts('hexaco-60')
  assessmentStore.loadAttempts('pvq-40')
  assessmentStore.loadAttempts('vlq')
})

// Self-discovery dates
const latestWheelDate = computed(() => lifeAreaAssessmentStore.latestFullAssessment?.createdAt)
const latestValuesDate = computed(() => valuesStore.latestDiscovery?.createdAt)
const latestBeliefsDate = computed(() => beliefsStore.latestBeliefs?.createdAt)
const latestPurposeDate = computed(() => purposeStore.latestPurpose?.createdAt)
const latestIpipBfm50Date = computed(
  () => assessmentStore.getLatestCompletedAttemptFromState('ipip-bfm-50')?.completedAt,
)
const latestIpipNeo120Date = computed(
  () => assessmentStore.getLatestCompletedAttemptFromState('ipip-neo-120')?.completedAt,
)
const latestHexaco60Date = computed(
  () => assessmentStore.getLatestCompletedAttemptFromState('hexaco-60')?.completedAt,
)
const latestPvq40Date = computed(
  () => assessmentStore.getLatestCompletedAttemptFromState('pvq-40')?.completedAt,
)
const latestVlqDate = computed(
  () => assessmentStore.getLatestCompletedAttemptFromState('vlq')?.completedAt,
)

// CBT dates (Phase 1)
const latestThoughtRecordDate = computed(() => thoughtRecordStore.latestRecord?.createdAt)
const latestDistortionDate = computed(() => distortionStore.latestAssessment?.createdAt)
const latestWorryTreeDate = computed(() => worryTreeStore.latestEntry?.createdAt)

// CBT dates (Phase 2)
const latestCoreBeliefsDate = computed(() => coreBeliefsStore.latestExploration?.createdAt)
const latestCompassionateLetterDate = computed(() => compassionateLetterStore.latestLetter?.createdAt)
const latestPositiveDataLogDate = computed(() => positiveDataLogStore.latestLog?.updatedAt)

// CBT dates (Phase 3)
const latestBehavioralExperimentDate = computed(() => behavioralExperimentStore.latestExperiment?.createdAt)
const latestBehavioralActivationDate = computed(() => behavioralActivationStore.latestActivation?.createdAt)
const latestStructuredProblemSolvingDate = computed(() => structuredProblemSolvingStore.latestSession?.createdAt)

// CBT dates (Phase 4)
const latestGradedExposureDate = computed(() => gradedExposureStore.latestHierarchy?.createdAt)

// Logotherapy dates
const latestThreePathwaysDate = computed(() => threePathwaysStore.latestExploration?.createdAt)
const latestSocraticDialogueDate = computed(() => socraticDialogueStore.latestDialogue?.createdAt)
const latestMountainRangeDate = computed(() => mountainRangeStore.latestExploration?.createdAt)
const latestParadoxicalIntentionDate = computed(() => paradoxicalIntentionStore.latestLab?.createdAt)
const latestDereflectionDate = computed(() => dereflectionStore.latestPractice?.createdAt)
const latestTragicOptimismDate = computed(() => tragicOptimismStore.latestEntry?.createdAt)
const latestAttitudinalShiftDate = computed(() => attitudinalShiftStore.latestShift?.createdAt)
const latestLegacyLetterDate = computed(() => legacyLetterStore.latestLetter?.createdAt)

// IFS dates
const latestPartsMappingDate = computed(() => ifsPartsMapStore.latestMap?.createdAt)
const latestUnblendingDate = computed(() => ifsUnblendingStore.latestSession?.createdAt)
const latestDirectAccessDate = computed(() => ifsDirectAccessStore.latestSession?.createdAt)
const latestTrailheadDate = computed(() => ifsTrailheadStore.latestEntry?.createdAt)
const latestProtectorAppreciationDate = computed(() => ifsProtectorAppreciationStore.latestAppreciation?.createdAt)
const latestExileWitnessingDate = computed(() => ifsExileWitnessingStore.latestWitnessing?.createdAt)
const latestSelfEnergyDate = computed(() => ifsSelfEnergyStore.latestCheckIn?.createdAt)
const latestPartsDialogueDate = computed(() => ifsPartsDialogueStore.latestDialogue?.createdAt)
const latestDailyCheckInDate = computed(() => ifsDailyCheckInStore.latestCheckIn?.createdAt)
const latestConstellationDate = computed(() => ifsConstellationStore.latestConstellation?.createdAt)
</script>
