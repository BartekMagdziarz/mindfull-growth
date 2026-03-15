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

    <!-- Step 1: Trigger Capture -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      mode="out-in"
    >
      <template v-if="currentStep === 'trigger'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-lg font-bold text-on-surface">{{ t('exerciseWizards.trailhead.trigger.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.trailhead.trigger.subtitle') }}
            </p>

            <div class="neo-surface p-3 rounded-xl">
              <p class="text-sm text-on-surface-variant leading-relaxed">
                {{ t('exerciseWizards.trailhead.trigger.description') }}
              </p>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.trailhead.trigger.questionLabel') }}</label>
              <textarea
                v-model="triggerDescription"
                rows="3"
                :placeholder="t('exerciseWizards.trailhead.trigger.questionPlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>

            <EmotionSelector
              v-model="emotionIds"
              :label="t('exerciseWizards.trailhead.trigger.emotionsLabel')"
            />

            <RatingSlider
              v-model="intensity"
              :label="t('exerciseWizards.trailhead.trigger.intensityLabel')"
              :min="1"
              :max="10"
            />
            <div class="flex justify-between text-xs text-on-surface-variant -mt-1">
              <span>{{ t('exerciseWizards.trailhead.trigger.intensityMin') }}</span>
              <span>{{ t('exerciseWizards.trailhead.trigger.intensityMax') }}</span>
            </div>

            <BodyLocationPicker
              v-model="bodyLocations"
              :label="t('exerciseWizards.trailhead.trigger.bodyLocationLabel')"
              :multiple="false"
            />
          </AppCard>

          <div class="flex justify-end">
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 2: Thoughts (T) -->
      <template v-else-if="currentStep === 'thoughts'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <div class="flex items-center gap-2">
              <AppIcon name="chat_bubble" class="text-xl text-on-surface-variant" />
              <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.trailhead.thoughts.title') }}</h2>
            </div>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.trailhead.thoughts.description') }}
            </p>
            <textarea
              v-model="thoughts"
              rows="4"
              :placeholder="t('exerciseWizards.trailhead.thoughts.placeholder')"
              class="neo-input w-full p-3 text-sm resize-none"
            />

            <!-- TSIBP indicator -->
            <TSIBPIndicator :current-index="0" />
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 3: Sensations (S) -->
      <template v-else-if="currentStep === 'sensations'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <div class="flex items-center gap-2">
              <AppIcon name="pan_tool" class="text-xl text-on-surface-variant" />
              <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.trailhead.sensations.title') }}</h2>
            </div>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.trailhead.sensations.description') }}
            </p>
            <textarea
              v-model="sensations"
              rows="3"
              :placeholder="t('exerciseWizards.trailhead.sensations.placeholder')"
              class="neo-input w-full p-3 text-sm resize-none"
            />

            <TSIBPIndicator :current-index="1" />
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 4: Images (I) -->
      <template v-else-if="currentStep === 'images'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <div class="flex items-center gap-2">
              <AppIcon name="image" class="text-xl text-on-surface-variant" />
              <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.trailhead.images.title') }}</h2>
            </div>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.trailhead.images.description') }}
            </p>
            <p class="text-xs text-on-surface-variant">
              {{ t('exerciseWizards.trailhead.images.optionalNote') }}
            </p>
            <textarea
              v-model="images"
              rows="3"
              :placeholder="t('exerciseWizards.trailhead.images.placeholder')"
              class="neo-input w-full p-3 text-sm resize-none"
            />

            <TSIBPIndicator :current-index="2" />
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 5: Behaviors (B) -->
      <template v-else-if="currentStep === 'behaviors'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <div class="flex items-center gap-2">
              <AppIcon name="bolt" class="text-xl text-on-surface-variant" />
              <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.trailhead.behaviors.title') }}</h2>
            </div>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.trailhead.behaviors.description') }}
            </p>
            <textarea
              v-model="behaviors"
              rows="3"
              :placeholder="t('exerciseWizards.trailhead.behaviors.placeholder')"
              class="neo-input w-full p-3 text-sm resize-none"
            />

            <TSIBPIndicator :current-index="3" />
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 6: Perception (P) -->
      <template v-else-if="currentStep === 'perception'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <div class="flex items-center gap-2">
              <AppIcon name="visibility" class="text-xl text-on-surface-variant" />
              <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.trailhead.perception.title') }}</h2>
            </div>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.trailhead.perception.description') }}
            </p>

            <RatingSlider
              v-model="perception"
              :label="t('exerciseWizards.trailhead.perception.tensionLabel')"
              :min="1"
              :max="10"
            />
            <div class="flex justify-between text-xs text-on-surface-variant -mt-1">
              <span>{{ t('exerciseWizards.trailhead.perception.tensionMin') }}</span>
              <span>{{ t('exerciseWizards.trailhead.perception.tensionMax') }}</span>
            </div>

            <TSIBPIndicator :current-index="4" />
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 7: Part Link -->
      <template v-else-if="currentStep === 'part-link'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.trailhead.partLink.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.trailhead.partLink.description') }}
            </p>

            <PartSelector
              v-model="linkedPartId"
              :parts="partStore.sortedParts"
              :allow-create="true"
              @create-part="handleCreatePart"
            />

            <p v-if="!linkedPartId" class="text-xs text-on-surface-variant italic">
              {{ t('exerciseWizards.trailhead.partLink.unsureMessage') }}
            </p>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 8: Reflection -->
      <template v-else-if="currentStep === 'reflection'">
        <div class="space-y-6">
          <AppCard variant="raised" padding="lg" class="space-y-5">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.trailhead.reflection.title') }}</h2>

            <!-- Summary -->
            <div class="neo-surface p-4 rounded-xl space-y-3">
              <div class="space-y-1">
                <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.trailhead.reflection.sections.trigger') }}</p>
                <p class="text-sm text-on-surface">{{ triggerDescription }}</p>
              </div>
              <div class="flex items-center gap-4">
                <div>
                  <p class="text-xs text-on-surface-variant">{{ t('exerciseWizards.trailhead.reflection.sections.intensity') }}</p>
                  <p class="text-sm font-semibold text-primary">{{ intensity }}/10</p>
                </div>
                <div v-if="bodyLocations.length">
                  <p class="text-xs text-on-surface-variant">{{ t('exerciseWizards.trailhead.reflection.sections.body') }}</p>
                  <p class="text-sm text-on-surface">{{ bodyLocations.map(formatLocation).join(', ') }}</p>
                </div>
              </div>
              <div v-if="emotionIds.length" class="flex flex-wrap gap-1">
                <span
                  v-for="eid in emotionIds"
                  :key="eid"
                  class="neo-pill text-xs px-2 py-0.5 bg-primary/10 text-primary"
                >
                  {{ getEmotionName(eid) }}
                </span>
              </div>
              <div v-if="linkedPartId" class="flex items-center gap-2">
                <span class="text-xs text-on-surface-variant">{{ t('exerciseWizards.trailhead.reflection.linkedPart') }}</span>
                <span class="text-xs font-medium text-on-surface">{{ getPartName(linkedPartId) }}</span>
                <PartRoleBadge v-if="getPartRole(linkedPartId)" :role="getPartRole(linkedPartId)!" />
              </div>
            </div>

            <!-- Reflection textarea -->
            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.trailhead.reflection.reflectionLabel') }}</label>
              <textarea
                v-model="reflection"
                rows="3"
                :placeholder="t('exerciseWizards.trailhead.reflection.reflectionPlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>

            <!-- Pattern Analysis -->
            <div v-if="trailheadStore.hasEnoughForAnalysis" class="space-y-3">
              <AppButton
                variant="tonal"
                :disabled="isLoadingAnalysis"
                @click="requestPatternAnalysis()"
              >
                <AppIcon name="auto_awesome" class="text-base mr-1" />
                {{ isLoadingAnalysis ? t('exerciseWizards.trailhead.reflection.analyzingPatterns') : t('exerciseWizards.trailhead.reflection.analyzeButton') }}
              </AppButton>

              <div v-if="patternAnalysis" class="neo-surface p-4 rounded-xl">
                <p class="text-sm text-on-surface whitespace-pre-wrap">{{ patternAnalysis }}</p>
                <p class="text-xs text-on-surface-variant/60 italic mt-3">
                  {{ t('exerciseWizards.trailhead.reflection.analysisDisclaimer') }}
                </p>
              </div>
            </div>
            <p v-else class="text-xs text-on-surface-variant">
              {{ t('exerciseWizards.trailhead.reflection.unlockAnalysis', { count: 3 - trailheadStore.entries.length }) }}
            </p>

            <!-- Notes -->
            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.trailhead.reflection.notesLabel') }}</label>
              <textarea
                v-model="notes"
                rows="2"
                :placeholder="t('exerciseWizards.trailhead.reflection.notesPlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? t('exerciseWizards.trailhead.reflection.saving') : t('exerciseWizards.trailhead.reflection.saveButton') }}
            </AppButton>
          </div>
        </div>
      </template>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import RatingSlider from '@/components/exercises/RatingSlider.vue'
import PartSelector from '@/components/exercises/ifs/PartSelector.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import BodyLocationPicker from '@/components/exercises/ifs/BodyLocationPicker.vue'
import TSIBPIndicator from '@/components/exercises/ifs/TSIBPIndicator.vue'
import { useTrailheadWizard, type TrailheadStep } from '@/composables/useTrailheadWizard'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useIFSTrailheadStore } from '@/stores/ifsTrailhead.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useT } from '@/composables/useT'
import type { IFSPartRole } from '@/domain/exercises'

const emit = defineEmits<{
  saved: []
}>()

const { t } = useT()
const partStore = useIFSPartStore()
const trailheadStore = useIFSTrailheadStore()
const emotionStore = useEmotionStore()

const STEPS: TrailheadStep[] = [
  'trigger', 'thoughts', 'sensations', 'images',
  'behaviors', 'perception', 'part-link', 'reflection',
]

const stepLabels = [
  t('exerciseWizards.trailhead.steps.trigger'),
  t('exerciseWizards.trailhead.steps.thoughts'),
  t('exerciseWizards.trailhead.steps.sensations'),
  t('exerciseWizards.trailhead.steps.images'),
  t('exerciseWizards.trailhead.steps.behaviors'),
  t('exerciseWizards.trailhead.steps.perception'),
  t('exerciseWizards.trailhead.steps.partLink'),
  t('exerciseWizards.trailhead.steps.reflection'),
]

const {
  currentStep,
  stepIndex,
  canAdvance,
  nextStep,
  prevStep,
  goToStep,
  triggerDescription,
  emotionIds,
  intensity,
  bodyLocations,
  thoughts,
  sensations,
  images,
  behaviors,
  perception,
  linkedPartId,
  createAndLinkPart,
  reflection,
  notes,
  patternAnalysis,
  isLoadingAnalysis,
  requestPatternAnalysis,
  isSaving,
  save,
} = useTrailheadWizard()

function handleCreatePart(data: { name: string; role: IFSPartRole }) {
  createAndLinkPart(data)
}

function getEmotionName(id: string): string {
  return emotionStore.getEmotionById(id)?.name ?? id
}

function getPartName(id: string): string {
  return partStore.getPartById(id)?.name ?? 'Unknown'
}

function getPartRole(id: string) {
  return partStore.getPartById(id)?.role ?? null
}

function formatLocation(location: string): string {
  return location
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

async function handleSave() {
  await save()
  emit('saved')
}
</script>
