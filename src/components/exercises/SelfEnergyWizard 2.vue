<template>
  <div class="space-y-6">
    <!-- Step Indicator -->
    <div class="flex flex-col items-center gap-2">
      <div class="flex items-center gap-1.5" role="group" aria-label="Wizard progress">
        <button
          v-for="(label, idx) in stepLabels"
          :key="idx"
          type="button"
          :aria-label="`Step ${idx + 1}: ${label}${idx < stepIndex ? ' (completed)' : idx === stepIndex ? ' (current)' : ''}`"
          class="rounded-full transition-all duration-200"
          :class="idx < stepIndex
            ? 'neo-step-completed w-2.5 h-2.5 cursor-pointer'
            : idx === stepIndex
              ? 'neo-step-active w-3.5 h-3.5'
              : 'neo-step-future w-2.5 h-2.5'"
          @click="idx < stepIndex && goToStep(STEPS[idx])"
        />
      </div>
      <span class="text-xs font-medium text-on-surface-variant">
        {{ stepLabels[stepIndex] }}
      </span>
    </div>

    <!-- Step 1: Check-In -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      mode="out-in"
    >
      <template v-if="currentStep === 'check-in'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-lg font-bold text-on-surface">{{ t('exerciseWizards.selfEnergy.checkIn.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.selfEnergy.checkIn.subtitle') }}
            </p>

            <SelfEnergyWheel
              :ratings="ratings"
              :interactive="true"
              size="lg"
              @update:ratings="ratings = $event"
            />

            <!-- Inline ratings summary -->
            <div class="text-xs text-on-surface-variant text-center">
              <span v-for="(q, idx) in allQualities" :key="q">
                <span class="capitalize">{{ q }}</span>: {{ ratings[q] || '—' }}{{ idx < allQualities.length - 1 ? ' · ' : '' }}
              </span>
            </div>
          </AppCard>

          <div class="flex justify-end">
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 2: Identify the Gap -->
      <template v-else-if="currentStep === 'gap'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.selfEnergy.gap.title') }}</h2>

            <!-- Lowest C highlight card -->
            <AppCard variant="inset" padding="md" class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="neo-surface rounded-full p-2">
                  <component :is="qualityIcon(lowestQuality)" class="w-6 h-6" :class="qualityIconColor(lowestQuality)" />
                </div>
                <div>
                  <p class="text-sm font-medium text-on-surface capitalize">{{ lowestQuality }}</p>
                  <div class="flex gap-1 mt-1">
                    <div
                      v-for="n in 5"
                      :key="n"
                      class="w-2.5 h-2.5 rounded-full"
                      :class="n <= ratings[lowestQuality] ? 'bg-primary' : 'bg-neu-border/30'"
                    />
                  </div>
                </div>
              </div>
              <p class="text-sm text-on-surface-variant">
                {{ t('exerciseWizards.selfEnergy.gap.looksLike', { quality: lowestQuality, rating: ratings[lowestQuality] }) }}
              </p>
            </AppCard>

            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.selfEnergy.gap.partQuestion', { quality: lowestQuality }) }}
            </p>

            <PartSelector
              v-model="identifiedPartId"
              :parts="partStore.sortedParts"
              :allow-create="false"
              label=""
            />

            <p v-if="!identifiedPartId" class="text-xs text-on-surface-variant italic">
              {{ t('exerciseWizards.selfEnergy.gap.unsureMessage') }}
            </p>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 3: Micro-Practice -->
      <template v-else-if="currentStep === 'micro-practice'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface capitalize">
              {{ t('exerciseWizards.selfEnergy.microPractice.title', { quality: lowestQuality }) }}
            </h2>

            <!-- Calm: Box Breathing -->
            <template v-if="microPracticeType === 'calm'">
              <div class="neo-surface p-4 rounded-xl space-y-4">
                <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.selfEnergy.microPractice.calm.title') }}</p>
                <div class="flex flex-col items-center gap-4">
                  <div class="relative w-32 h-32">
                    <svg class="w-32 h-32" viewBox="0 0 128 128">
                      <rect x="14" y="14" width="100" height="100" rx="8" fill="none"
                        stroke="currentColor" class="text-neu-border/20" stroke-width="3" />
                      <rect x="14" y="14" width="100" height="100" rx="8" fill="none"
                        stroke="currentColor" class="text-primary" stroke-width="3"
                        stroke-linecap="round"
                        :stroke-dasharray="boxPerimeter"
                        :stroke-dashoffset="boxOffset"
                        style="transition: stroke-dashoffset 1s linear"
                      />
                    </svg>
                    <span class="absolute inset-0 flex items-center justify-center text-sm font-medium text-primary">
                      {{ boxLabel }}
                    </span>
                  </div>
                  <p class="text-sm text-on-surface-variant">{{ boxPhaseText }}</p>
                  <AppButton
                    v-if="!boxActive && !boxDone"
                    variant="tonal"
                    @click="startBoxBreathing()"
                  >
                    {{ t('exerciseWizards.selfEnergy.microPractice.calm.startButton') }}
                  </AppButton>
                  <p v-if="boxDone" class="text-sm text-primary font-medium">{{ t('exerciseWizards.selfEnergy.microPractice.calm.complete') }}</p>
                </div>
              </div>
            </template>

            <!-- Curiosity -->
            <template v-else-if="microPracticeType === 'curiosity'">
              <div class="neo-surface p-4 rounded-xl space-y-3">
                <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.selfEnergy.microPractice.curiosity.title') }}</p>
                <p class="text-sm text-on-surface-variant">
                  {{ t('exerciseWizards.selfEnergy.microPractice.curiosity.description') }}
                </p>
                <textarea
                  v-model="microPracticeNotes"
                  rows="3"
                  :placeholder="t('exerciseWizards.selfEnergy.microPractice.curiosity.placeholder')"
                  class="neo-input w-full p-3 text-sm resize-none"
                />
              </div>
            </template>

            <!-- Compassion -->
            <template v-else-if="microPracticeType === 'compassion'">
              <div class="neo-surface p-4 rounded-xl space-y-3">
                <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.selfEnergy.microPractice.compassion.title') }}</p>
                <p class="text-sm text-on-surface-variant">
                  {{ t('exerciseWizards.selfEnergy.microPractice.compassion.description') }}
                </p>
                <div class="flex justify-center py-4">
                  <HeartIcon class="w-16 h-16 text-pink-400 compassion-pulse" />
                </div>
                <textarea
                  v-model="microPracticeNotes"
                  rows="2"
                  :placeholder="t('exerciseWizards.selfEnergy.microPractice.compassion.placeholder')"
                  class="neo-input w-full p-3 text-sm resize-none"
                />
              </div>
            </template>

            <!-- Clarity -->
            <template v-else-if="microPracticeType === 'clarity'">
              <div class="neo-surface p-4 rounded-xl space-y-3">
                <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.selfEnergy.microPractice.clarity.title') }}</p>
                <p class="text-sm text-on-surface-variant">
                  {{ t('exerciseWizards.selfEnergy.microPractice.clarity.description') }}
                </p>
                <input
                  v-model="microPracticeNotes"
                  type="text"
                  :placeholder="t('exerciseWizards.selfEnergy.microPractice.clarity.placeholder')"
                  class="neo-input w-full p-3 text-sm"
                />
              </div>
            </template>

            <!-- Courage -->
            <template v-else-if="microPracticeType === 'courage'">
              <div class="neo-surface p-4 rounded-xl space-y-3">
                <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.selfEnergy.microPractice.courage.title') }}</p>
                <p class="text-sm text-on-surface-variant">
                  {{ t('exerciseWizards.selfEnergy.microPractice.courage.description') }}
                </p>
                <input
                  v-model="microPracticeNotes"
                  type="text"
                  :placeholder="t('exerciseWizards.selfEnergy.microPractice.courage.placeholder')"
                  class="neo-input w-full p-3 text-sm"
                />
              </div>
            </template>

            <!-- Creativity -->
            <template v-else-if="microPracticeType === 'creativity'">
              <div class="neo-surface p-4 rounded-xl space-y-3">
                <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.selfEnergy.microPractice.creativity.title') }}</p>
                <p class="text-sm text-on-surface-variant">
                  {{ t('exerciseWizards.selfEnergy.microPractice.creativity.description') }}
                </p>
                <textarea
                  v-model="microPracticeNotes"
                  rows="3"
                  :placeholder="t('exerciseWizards.selfEnergy.microPractice.creativity.placeholder')"
                  class="neo-input w-full p-3 text-sm resize-none"
                />
              </div>
            </template>

            <!-- Confidence -->
            <template v-else-if="microPracticeType === 'confidence'">
              <div class="neo-surface p-4 rounded-xl space-y-3">
                <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.selfEnergy.microPractice.confidence.title') }}</p>
                <p class="text-sm text-on-surface-variant">
                  {{ t('exerciseWizards.selfEnergy.microPractice.confidence.description') }}
                </p>
                <textarea
                  v-model="microPracticeNotes"
                  rows="2"
                  :placeholder="t('exerciseWizards.selfEnergy.microPractice.confidence.placeholder')"
                  class="neo-input w-full p-3 text-sm resize-none"
                />
              </div>
            </template>

            <!-- Connection -->
            <template v-else-if="microPracticeType === 'connection'">
              <div class="neo-surface p-4 rounded-xl space-y-3">
                <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.selfEnergy.microPractice.connection.title') }}</p>
                <p class="text-sm text-on-surface-variant">
                  {{ t('exerciseWizards.selfEnergy.microPractice.connection.description') }}
                </p>
                <input
                  v-model="microPracticeNotes"
                  type="text"
                  :placeholder="t('exerciseWizards.selfEnergy.microPractice.connection.placeholder')"
                  class="neo-input w-full p-3 text-sm"
                />
              </div>
            </template>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 4: Save & Review -->
      <template v-else-if="currentStep === 'save'">
        <div class="space-y-6">
          <AppCard variant="raised" padding="lg" class="space-y-5">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.selfEnergy.summary.title') }}</h2>

            <SelfEnergyWheel
              :ratings="ratings"
              :interactive="false"
              size="md"
            />

            <!-- Lowest C summary -->
            <div class="neo-surface p-3 rounded-lg flex items-center justify-between">
              <span class="text-sm text-on-surface-variant capitalize">{{ lowestQuality }}</span>
              <span class="text-sm font-semibold text-primary">{{ ratings[lowestQuality] }}/5</span>
            </div>

            <!-- Identified part -->
            <div v-if="identifiedPartId" class="flex items-center gap-2">
              <span class="text-xs text-on-surface-variant">{{ t('exerciseWizards.selfEnergy.summary.affectingPart') }}</span>
              <span class="text-xs font-medium text-on-surface">{{ getPartName(identifiedPartId) }}</span>
              <PartRoleBadge v-if="getPartRole(identifiedPartId)" :role="getPartRole(identifiedPartId)!" />
            </div>

            <!-- Trend Review -->
            <div v-if="selfEnergyStore.hasEnoughForReview" class="space-y-3">
              <AppButton
                variant="tonal"
                :disabled="isLoadingReview"
                @click="requestTrendReview()"
              >
                <SparklesIcon class="w-4 h-4 mr-1" />
                {{ isLoadingReview ? t('exerciseWizards.selfEnergy.summary.trendReviewLoading') : t('exerciseWizards.selfEnergy.summary.trendReviewButton') }}
              </AppButton>

              <div v-if="trendReview" class="neo-surface p-4 rounded-xl">
                <p class="text-sm text-on-surface whitespace-pre-wrap">{{ trendReview }}</p>
                <p class="text-xs text-on-surface-variant/60 italic mt-3">
                  {{ t('exerciseWizards.selfEnergy.summary.trendDisclaimer') }}
                </p>
              </div>
            </div>
            <p v-else class="text-xs text-on-surface-variant">
              {{ t('exerciseWizards.selfEnergy.summary.unlockTrend', { count: 14 - selfEnergyStore.checkIns.length }) }}
            </p>

            <!-- Trend chart (7+ check-ins) -->
            <div v-if="selfEnergyStore.checkIns.length >= 7" class="neo-surface rounded-2xl p-4">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-3">{{ t('exerciseWizards.selfEnergy.summary.trendLabel') }}</p>
              <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="w-full" style="height: 180px">
                <!-- Grid lines -->
                <line v-for="n in 5" :key="`grid-${n}`"
                  :x1="chartPadding" :y1="yScale(n)" :x2="chartWidth - chartPadding" :y2="yScale(n)"
                  stroke="currentColor" class="text-neu-border/15" stroke-width="0.5"
                />
                <!-- Lines for each C -->
                <polyline
                  v-for="q in allQualities"
                  :key="`line-${q}`"
                  :points="trendPoints(q)"
                  fill="none"
                  :stroke="qualityColor(q)"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <!-- Legend -->
              <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                <div v-for="q in allQualities" :key="`legend-${q}`" class="flex items-center gap-1">
                  <div class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: qualityColor(q) }" />
                  <span class="text-[10px] text-on-surface-variant capitalize">{{ q }}</span>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.selfEnergy.summary.notesLabel') }}</label>
              <textarea
                v-model="notes"
                rows="2"
                :placeholder="t('exerciseWizards.selfEnergy.summary.notesPlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? t('exerciseWizards.selfEnergy.summary.saving') : t('exerciseWizards.selfEnergy.summary.saveButton') }}
            </AppButton>
          </div>
        </div>
      </template>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import {
  CloudIcon,
  MagnifyingGlassIcon,
  HeartIcon,
  EyeIcon,
  ShieldExclamationIcon,
  SparklesIcon,
  StarIcon,
  UserGroupIcon,
} from '@heroicons/vue/24/outline'
import type { SelfEnergyQuality } from '@/domain/exercises'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import SelfEnergyWheel from '@/components/exercises/ifs/SelfEnergyWheel.vue'
import PartSelector from '@/components/exercises/ifs/PartSelector.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import { useSelfEnergyWizard, type SelfEnergyStep } from '@/composables/useSelfEnergyWizard'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useIFSSelfEnergyStore } from '@/stores/ifsSelfEnergy.store'
import { useT } from '@/composables/useT'

const emit = defineEmits<{
  saved: []
}>()

const { t } = useT()
const partStore = useIFSPartStore()
const selfEnergyStore = useIFSSelfEnergyStore()

const STEPS: SelfEnergyStep[] = ['check-in', 'gap', 'micro-practice', 'save']
const stepLabels = [
  t('exerciseWizards.selfEnergy.steps.checkIn'),
  t('exerciseWizards.selfEnergy.steps.growthEdge'),
  t('exerciseWizards.selfEnergy.steps.microPractice'),
  t('exerciseWizards.selfEnergy.steps.saveAndReview'),
]

const allQualities: SelfEnergyQuality[] = [
  'calm', 'curiosity', 'compassion', 'clarity',
  'courage', 'creativity', 'confidence', 'connection',
]

const {
  currentStep,
  stepIndex,
  canAdvance,
  nextStep,
  prevStep,
  goToStep,
  ratings,
  lowestQuality,
  identifiedPartId,
  microPracticeType,
  microPracticeNotes,
  notes,
  trendReview,
  isLoadingReview,
  requestTrendReview,
  isSaving,
  save,
} = useSelfEnergyWizard()

// Quality icon mapping
const qualityIconMap: Record<SelfEnergyQuality, typeof CloudIcon> = {
  calm: CloudIcon,
  curiosity: MagnifyingGlassIcon,
  compassion: HeartIcon,
  clarity: EyeIcon,
  courage: ShieldExclamationIcon,
  creativity: SparklesIcon,
  confidence: StarIcon,
  connection: UserGroupIcon,
}

function qualityIcon(q: SelfEnergyQuality) {
  return qualityIconMap[q]
}

const qualityIconColors: Record<SelfEnergyQuality, string> = {
  calm: 'text-blue-500',
  curiosity: 'text-violet-500',
  compassion: 'text-pink-500',
  clarity: 'text-cyan-500',
  courage: 'text-orange-500',
  creativity: 'text-yellow-500',
  confidence: 'text-green-500',
  connection: 'text-teal-500',
}

function qualityIconColor(q: SelfEnergyQuality): string {
  return qualityIconColors[q]
}

const qualityColors: Record<SelfEnergyQuality, string> = {
  calm: '#3b82f6',
  curiosity: '#8b5cf6',
  compassion: '#ec4899',
  clarity: '#06b6d4',
  courage: '#f97316',
  creativity: '#eab308',
  confidence: '#22c55e',
  connection: '#14b8a6',
}

function qualityColor(q: SelfEnergyQuality): string {
  return qualityColors[q]
}

// Box Breathing state
const boxActive = ref(false)
const boxDone = ref(false)
const boxLabel = ref(t('exerciseWizards.selfEnergy.microPractice.calm.ready'))
const boxPhaseText = ref(t('exerciseWizards.selfEnergy.microPractice.calm.tapToBegin'))
const boxPerimeter = 400
const boxOffset = ref(boxPerimeter)
let boxTimer: ReturnType<typeof setTimeout> | null = null

function startBoxBreathing() {
  boxActive.value = true
  let elapsed = 0
  const totalSeconds = 60
  const cycleLength = 16 // 4+4+4+4

  function tick() {
    if (elapsed >= totalSeconds) {
      boxActive.value = false
      boxDone.value = true
      boxLabel.value = t('exerciseWizards.selfEnergy.microPractice.calm.done')
      boxPhaseText.value = t('exerciseWizards.selfEnergy.microPractice.calm.complete')
      boxOffset.value = 0
      return
    }

    const phase = elapsed % cycleLength
    if (phase < 4) {
      boxLabel.value = `${4 - phase}`
      boxPhaseText.value = t('exerciseWizards.selfEnergy.microPractice.calm.breatheIn')
    } else if (phase < 8) {
      boxLabel.value = `${8 - phase}`
      boxPhaseText.value = t('exerciseWizards.selfEnergy.microPractice.calm.hold')
    } else if (phase < 12) {
      boxLabel.value = `${12 - phase}`
      boxPhaseText.value = t('exerciseWizards.selfEnergy.microPractice.calm.breatheOut')
    } else {
      boxLabel.value = `${16 - phase}`
      boxPhaseText.value = t('exerciseWizards.selfEnergy.microPractice.calm.hold')
    }

    boxOffset.value = boxPerimeter * (1 - elapsed / totalSeconds)
    elapsed++
    boxTimer = setTimeout(tick, 1000)
  }

  tick()
}

// Trend chart
const chartWidth = 300
const chartHeight = 160
const chartPadding = 20

function yScale(rating: number): number {
  return chartHeight - chartPadding - ((rating - 1) / 4) * (chartHeight - 2 * chartPadding)
}

function trendPoints(quality: SelfEnergyQuality): string {
  const sorted = [...selfEnergyStore.sortedCheckIns].reverse().slice(-14)
  if (sorted.length < 2) return ''
  const xStep = (chartWidth - 2 * chartPadding) / Math.max(sorted.length - 1, 1)
  return sorted
    .map((ci, i) => `${chartPadding + i * xStep},${yScale(ci.ratings[quality] ?? 3)}`)
    .join(' ')
}

// Part helpers
function getPartName(id: string): string {
  return partStore.getPartById(id)?.name ?? 'Unknown'
}

function getPartRole(id: string) {
  return partStore.getPartById(id)?.role ?? null
}

// Save
async function handleSave() {
  await save()
  emit('saved')
}

onUnmounted(() => {
  if (boxTimer) clearTimeout(boxTimer)
})
</script>

<style scoped>
.compassion-pulse {
  animation: pulse-heart 2s ease-in-out infinite;
}

@keyframes pulse-heart {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
}
</style>
