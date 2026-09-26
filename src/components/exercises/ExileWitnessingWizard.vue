<template>
  <div class="space-y-6">
    <!-- Step Indicator -->
    <ExerciseStepper :labels="stepLabels" :current="stepIndex" @go="goToStep(STEPS[$event])" />

    <!-- Emergency exit: always reachable while near the exile -->
    <div v-if="canStopEarly && !showStopPanel" class="flex justify-end">
      <AppButton variant="text" @click="showStopPanel = true">
        <AppIcon name="pause_circle" class="text-base mr-1" />
        {{ t('exerciseWizards.exileWitnessing.stop.button') }}
      </AppButton>
    </div>
    <AppCard v-if="showStopPanel" variant="inset" padding="md" class="space-y-3">
      <p class="text-sm font-semibold text-on-surface">{{ t('exerciseWizards.exileWitnessing.stop.title') }}</p>
      <p class="text-sm text-on-surface">{{ t('exerciseWizards.exileWitnessing.stop.text') }}</p>
      <div class="flex flex-wrap gap-2">
        <AppButton variant="tonal" @click="showStopPanel = false; stopEarly()">
          {{ t('exerciseWizards.exileWitnessing.stop.continueButton') }}
        </AppButton>
        <AppButton variant="text" @click="showStopPanel = false">
          {{ t('exerciseWizards.exileWitnessing.stop.resumeButton') }}
        </AppButton>
      </div>
    </AppCard>

    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      mode="out-in"
    >
      <!-- Step 1: Safety -->
      <template v-if="currentStep === 'safety'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-lg font-bold text-on-surface">{{ t('exerciseWizards.exileWitnessing.safety.title') }}</h2>
            <p class="text-sm text-on-surface-variant" v-html="tg('exerciseWizards.exileWitnessing.safety.description')" />
            <p class="text-sm text-on-surface-variant" v-html="t('exerciseWizards.exileWitnessing.safety.disclaimer')" />

            <IFSSafetyBanner
              :require-acknowledgment="true"
              :acknowledged="safetyAcknowledged"
              @update:acknowledged="safetyAcknowledged = $event"
            />
          </AppCard>

          <div class="flex justify-end">
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('exerciseWizards.exileWitnessing.safety.beginButton') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 2: Protector Check -->
      <template v-else-if="currentStep === 'protector-check'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.exileWitnessing.protectorCheck.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.exileWitnessing.protectorCheck.description') }}
            </p>
            <ExerciseStepWhy :text="tg('exerciseWizards.exileWitnessing.protectorCheck.why')" />

            <!-- Multi-select protectors -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                v-for="part in protectorParts"
                :key="part.id"
                class="neo-focus rounded-xl p-3 text-left transition-all"
                :class="[
                  protectorPartIds.includes(part.id)
                    ? 'neo-selector neo-selector--active border'
                    : 'neo-selector border',
                  roleBorderClass(part.role),
                ]"
                @click="toggleProtector(part.id)"
              >
                <p class="text-sm font-medium text-on-surface truncate">{{ part.name }}</p>
                <PartRoleBadge :role="part.role" class="mt-1" />
              </button>
            </div>

            <!-- Breathing pause -->
            <div class="flex flex-col items-center gap-3 py-4">
              <p class="text-sm text-on-surface-variant text-center">
                {{ t('exerciseWizards.exileWitnessing.protectorCheck.silentQuestion') }}
              </p>
              <div class="breathing-circle breathing-10s w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30" />
              <p class="text-xs text-on-surface-variant">{{ t('exerciseWizards.exileWitnessing.protectorCheck.listenPrompt') }}</p>
            </div>

            <!-- Permission outcome -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-on-surface">{{ t('exerciseWizards.exileWitnessing.protectorCheck.permissionLabel') }}</label>
              <div class="grid grid-cols-1 gap-2">
                <button
                  v-for="option in permissionOptions"
                  :key="option.value"
                  class="neo-focus rounded-xl p-3 text-left transition-all flex items-start gap-3"
                  :class="protectorPermission === option.value
                    ? 'neo-selector neo-selector--active border'
                    : 'neo-selector border'"
                  @click="protectorPermission = option.value"
                >
                  <div class="rounded-full w-8 h-8 flex items-center justify-center shrink-0" :class="option.iconBg">
                    <AppIcon :name="option.icon" class="text-base" :class="option.iconColor" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-on-surface">{{ option.label }}</p>
                    <p class="text-xs text-on-surface-variant">{{ option.description }}</p>
                  </div>
                </button>
              </div>
            </div>

            <!-- Blocking message -->
            <div v-if="isBlocking" class="bg-status-warn-soft p-3 rounded-lg">
              <p class="text-sm text-status-warn-on" v-html="t('exerciseWizards.exileWitnessing.protectorCheck.blockingMessage')" />
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 3: Approach -->
      <template v-else-if="currentStep === 'approach'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.exileWitnessing.approach.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.exileWitnessing.approach.description') }}
            </p>
            <ExerciseStepWhy :text="tg('exerciseWizards.exileWitnessing.approach.why')" />

            <!-- Breathing animation -->
            <div class="flex justify-center py-4">
              <div class="breathing-circle breathing-15s w-20 h-20 rounded-full bg-rose-100 border-2 border-rose-300" />
            </div>

            <!-- Body location -->
            <BodyLocationPicker
              :model-value="bodyLocation ? [bodyLocation] : []"
              :label="t('exerciseWizards.exileWitnessing.approach.bodyLocationLabel')"
              :multiple="false"
              @update:model-value="bodyLocation = $event[0] ?? null"
            />

            <!-- Felt age -->
            <div class="space-y-1">
              <label class="block text-sm font-medium text-on-surface">
                {{ t('exerciseWizards.exileWitnessing.approach.feltAgeLabel') }} <span class="text-on-surface-variant font-normal">({{ t('common.optional') }})</span>
              </label>
              <input
                v-model.number="feltAge"
                type="number"
                min="1"
                max="100"
                :placeholder="t('exerciseWizards.exileWitnessing.approach.feltAgePlaceholder')"
                class="neo-input w-24 p-2 text-sm"
              />
            </div>

            <!-- Emotions -->
            <div class="space-y-2">
              <EmotionSelector
                :label="t('exerciseWizards.exileWitnessing.approach.emotionLabel')"
                v-model="emotionIds"
                v-model:quadrant="activeEmotionQuadrant"
                v-model:families="emotionFamilyIds"
                :allow-family-only="true"
              />
            </div>

            <!-- Exile part selection -->
            <PartSelector
              v-model="exilePartId"
              :parts="partStore.sortedParts"
              :filter-role="'exile'"
              :allow-create="true"
              :label="t('exerciseWizards.exileWitnessing.approach.exileLabel')"
              @create-part="handleCreatePart"
            />
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 4: Self check — who is looking at the exile? -->
      <template v-else-if="currentStep === 'self-check'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.exileWitnessing.selfCheck.title') }}</h2>
            <p class="text-sm text-on-surface-variant">{{ t('exerciseWizards.exileWitnessing.selfCheck.description') }}</p>
            <ExerciseStepWhy :text="tg('exerciseWizards.exileWitnessing.selfCheck.why')" />

            <div class="space-y-3">
              <button
                class="w-full neo-surface shadow-neu-raised-sm rounded-xl p-4 text-left transition-all hover:-translate-y-px neo-focus"
                :class="selfCheckPassed === true ? 'neo-selector--active ring-2 ring-primary' : ''"
                @click="selfCheckPassed = true; selfCheckReactive = false"
              >
                <div class="flex items-center gap-3">
                  <AppIcon name="wb_sunny" class="text-xl text-insight-intention-on shrink-0" />
                  <span class="text-sm text-on-surface">{{ t('exerciseWizards.exileWitnessing.selfCheck.options.selfEnergy') }}</span>
                </div>
              </button>
              <button
                class="w-full neo-surface shadow-neu-raised-sm rounded-xl p-4 text-left transition-all hover:-translate-y-px neo-focus"
                :class="selfCheckReactive ? 'shadow-neu-pressed ring-2 ring-status-warn' : ''"
                @click="selfCheckPassed = false; selfCheckReactive = true"
              >
                <div class="flex items-center gap-3">
                  <AppIcon name="error" class="text-xl text-status-warn shrink-0" />
                  <span class="text-sm text-on-surface">{{ t('exerciseWizards.exileWitnessing.selfCheck.options.notQuite') }}</span>
                </div>
              </button>
            </div>

            <Transition
              enter-active-class="transition-all duration-200"
              enter-from-class="opacity-0 -translate-y-2"
            >
              <div v-if="selfCheckReactive" class="neo-surface p-6 rounded-2xl flex flex-col items-center gap-4">
                <div class="breathing-circle breathing-10s w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30" />
                <p class="text-sm text-on-surface-variant text-center">{{ t('exerciseWizards.exileWitnessing.selfCheck.breathingPrompt') }}</p>
                <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.exileWitnessing.selfCheck.breathingDone') }}</p>
                <div class="w-full space-y-2">
                  <button
                    class="w-full neo-surface shadow-neu-raised-sm rounded-xl p-4 text-left transition-all hover:-translate-y-px neo-focus"
                    @click="selfCheckPassed = true; selfCheckReactive = false; nextStep()"
                  >
                    <div class="flex items-center gap-3">
                      <AppIcon name="wb_sunny" class="text-xl text-insight-intention-on shrink-0" />
                      <span class="text-sm text-on-surface">{{ t('exerciseWizards.exileWitnessing.selfCheck.continueButton') }}</span>
                    </div>
                  </button>
                  <button
                    class="w-full neo-surface shadow-neu-raised-sm rounded-xl p-4 text-left transition-all hover:-translate-y-px neo-focus"
                    @click="leaveForToday()"
                  >
                    <div class="flex items-center gap-3">
                      <AppIcon name="bedtime" class="text-xl text-on-surface-variant shrink-0" />
                      <span class="text-sm text-on-surface">{{ t('exerciseWizards.exileWitnessing.selfCheck.notTodayButton') }}</span>
                    </div>
                  </button>
                </div>
              </div>
            </Transition>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 5: Witnessing -->
      <template v-else-if="currentStep === 'witnessing'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.exileWitnessing.witness.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.exileWitnessing.witness.description') }}
            </p>
            <ExerciseStepWhy :text="tg('exerciseWizards.exileWitnessing.witness.why')" />

            <!-- 30-second breathing circle -->
            <div class="flex justify-center py-6">
              <div class="breathing-circle breathing-30s w-28 h-28 rounded-full bg-rose-100 border-2 border-rose-300" />
            </div>

            <textarea
              v-model="exileMessage"
              rows="3"
              :placeholder="tg('exerciseWizards.exileWitnessing.witness.messagePlaceholder')"
              class="neo-input w-full p-3 text-sm resize-none"
            />

            <textarea
              v-model="exileBelief"
              rows="3"
              :placeholder="t('exerciseWizards.exileWitnessing.witness.beliefPlaceholder')"
              class="neo-input w-full p-3 text-sm resize-none"
            />
            <p class="text-xs text-on-surface-variant">
              {{ t('exerciseWizards.exileWitnessing.witness.beliefNote') }}
            </p>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 5: Compassion -->
      <template v-else-if="currentStep === 'compassion'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.exileWitnessing.compassion.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ tg('exerciseWizards.exileWitnessing.compassion.description') }}
            </p>
            <ExerciseStepWhy :text="tg('exerciseWizards.exileWitnessing.compassion.why')" />

            <!-- Suggestion chips -->
            <div class="flex flex-wrap gap-2">
              <button
                v-for="chip in compassionChips"
                :key="chip"
                class="exercise-pill px-3 py-1.5 text-sm bg-rose-50 text-rose-700 neo-focus shadow-neu-raised-sm hover:-translate-y-px transition-all"
                @click="insertCompassionChip(chip)"
              >
                {{ chip }}
              </button>
            </div>

            <textarea
              v-model="compassionMessage"
              rows="4"
              :placeholder="t('exerciseWizards.exileWitnessing.compassion.placeholder')"
              class="neo-input w-full p-3 text-sm resize-none"
            />

            <!-- Settling pause -->
            <div class="flex flex-col items-center gap-2 py-3">
              <div class="breathing-circle breathing-10s w-12 h-12 rounded-full bg-rose-100 border-2 border-rose-300" />
              <p class="text-xs text-on-surface-variant">{{ t('exerciseWizards.exileWitnessing.compassion.settlePrompt') }}</p>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 6: Closing -->
      <template v-else-if="currentStep === 'closing'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.exileWitnessing.closing.title') }}</h2>
            <p class="text-sm text-on-surface-variant">{{ t('exerciseWizards.exileWitnessing.closing.description') }}</p>

            <div class="grid grid-cols-1 gap-2">
              <button
                v-for="option in postStateOptions"
                :key="option.value"
                class="neo-focus rounded-xl p-3 text-left transition-all"
                :class="postSessionState === option.value
                  ? 'neo-selector neo-selector--active border'
                  : 'neo-selector border'"
                @click="postSessionState = option.value"
              >
                <p class="text-sm font-medium text-on-surface">{{ option.label }}</p>
              </button>
            </div>

            <div v-if="postSessionState === 'more-distressed'" class="bg-status-warn-soft p-3 rounded-lg">
              <p class="text-sm text-status-warn-on">
                {{ t('exerciseWizards.exileWitnessing.closing.distressedWarning') }}
              </p>
            </div>

            <!-- A promise to the exile (IFS: tell the part you'll come back) -->
            <div class="space-y-2">
              <label class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.exileWitnessing.closing.promiseLabel') }}</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="chip in promiseChips"
                  :key="chip"
                  class="exercise-pill px-3 py-1.5 text-sm bg-rose-50 text-rose-700 neo-focus shadow-neu-raised-sm hover:-translate-y-px transition-all"
                  @click="insertPromiseChip(chip)"
                >
                  {{ chip }}
                </button>
              </div>
              <textarea
                v-model="promise"
                rows="2"
                :placeholder="t('exerciseWizards.exileWitnessing.closing.promisePlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>

            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.exileWitnessing.closing.thankProtectors') }}
            </p>

            <!-- Closing animation -->
            <div class="flex justify-center py-2">
              <div class="breathing-circle breathing-10s w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20" />
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 7: Reflection & Save -->
      <template v-else-if="currentStep === 'reflection'">
        <div class="space-y-6">
          <AppCard variant="raised" padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.exileWitnessing.reflection.title') }}</h2>

            <IFSSafetyBanner />

            <!-- Summary -->
            <div class="neo-surface p-4 rounded-xl space-y-3 text-sm">
              <div class="flex items-center gap-2">
                <span class="text-on-surface-variant">{{ t('exerciseWizards.exileWitnessing.reflection.exileLabel') }}</span>
                <span class="font-medium text-on-surface">{{ getPartName(exilePartId!) }}</span>
                <PartRoleBadge role="exile" />
              </div>

              <div v-if="protectorPartIds.length" class="flex items-center gap-2 flex-wrap">
                <span class="text-on-surface-variant">{{ t('exerciseWizards.exileWitnessing.reflection.protectorsLabel') }}</span>
                <span
                  v-for="pid in protectorPartIds"
                  :key="pid"
                  class="exercise-pill text-xs px-2 py-0.5 bg-neu-base text-on-surface-variant"
                >
                  {{ getPartName(pid) }}
                </span>
              </div>

              <div v-if="bodyLocation" class="flex items-center gap-2">
                <span class="text-on-surface-variant">{{ t('exerciseWizards.exileWitnessing.reflection.bodyLabel') }}</span>
                <span class="text-on-surface">{{ formatLocation(bodyLocation) }}</span>
              </div>

              <div v-if="feltAge" class="flex items-center gap-2">
                <span class="text-on-surface-variant">{{ t('exerciseWizards.exileWitnessing.reflection.feltAgeLabel') }}</span>
                <span class="text-on-surface">~{{ feltAge }}</span>
              </div>

              <div class="space-y-1">
                <span class="text-on-surface-variant">{{ t('exerciseWizards.exileWitnessing.reflection.exileMessageLabel') }}</span>
                <p class="text-on-surface italic">"{{ exileMessage }}"</p>
              </div>

              <div v-if="exileBelief.trim()" class="space-y-1">
                <span class="text-on-surface-variant">{{ t('exerciseWizards.exileWitnessing.reflection.beliefLabel') }}</span>
                <p class="text-on-surface italic">"{{ exileBelief }}"</p>
              </div>

              <div class="space-y-1">
                <span class="text-on-surface-variant">{{ t('exerciseWizards.exileWitnessing.reflection.compassionLabel') }}</span>
                <p class="text-on-surface italic">"{{ compassionMessage }}"</p>
              </div>

              <div v-if="promise.trim()" class="space-y-1">
                <span class="text-on-surface-variant">{{ t('exerciseWizards.exileWitnessing.reflection.promiseLabel') }}</span>
                <p class="text-on-surface italic">"{{ promise }}"</p>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-on-surface-variant">{{ t('exerciseWizards.exileWitnessing.reflection.postSessionLabel') }}</span>
                <span class="exercise-pill text-xs px-2 py-0.5" :class="postStateBadgeClass">
                  {{ postStateLabel }}
                </span>
              </div>

              <p v-if="stoppedEarly" class="text-xs text-on-surface-variant italic">
                {{ t('exerciseWizards.exileWitnessing.reflection.stoppedEarly') }}
              </p>
            </div>

            <label class="flex items-start gap-2 cursor-pointer">
              <input v-model="updatePartCard" type="checkbox" class="mt-0.5 neo-focus" />
              <span class="text-xs text-on-surface">
                {{ t('exerciseWizards.exileWitnessing.reflection.updatePartLabel') }}
                <span class="block text-on-surface-variant">{{ t('exerciseWizards.exileWitnessing.reflection.updatePartHint') }}</span>
              </span>
            </label>

            <textarea
              v-model="reflection"
              rows="3"
              :placeholder="t('exerciseWizards.exileWitnessing.reflection.reflectionPlaceholder')"
              class="neo-input w-full p-3 text-sm resize-none"
            />

            <textarea
              v-model="notes"
              rows="2"
              :placeholder="t('exerciseWizards.exileWitnessing.reflection.notesPlaceholder')"
              class="neo-input w-full p-3 text-sm resize-none"
            />
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :loading="isSaving" @click="handleSave">
              {{ isSaving ? t('exerciseWizards.exileWitnessing.summary.saving') : t('exerciseWizards.exileWitnessing.summary.saveButton') }}
            </AppButton>
          </div>
        </div>
      </template>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import ExerciseStepper from './ExerciseStepper.vue'
import ExerciseStepWhy from '@/components/exercises/ExerciseStepWhy.vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import IFSSafetyBanner from '@/components/exercises/ifs/IFSSafetyBanner.vue'
import PartSelector from '@/components/exercises/ifs/PartSelector.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import BodyLocationPicker from '@/components/exercises/ifs/BodyLocationPicker.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import {
  useExileWitnessingWizard,
  type ExileWitnessingStep,
} from '@/composables/useExileWitnessingWizard'
import type { Quadrant } from '@/domain/emotion'
import type { IFSPartRole } from '@/domain/exercises'
import { useT } from '@/composables/useT'
import { useIfsLabels } from '@/composables/useIfsLabels'

const emit = defineEmits<{
  saved: []
}>()

const { t, tg, tList } = useT()

const { formatBodyLocation: formatLocation } = useIfsLabels()
const partStore = useIFSPartStore()

const activeEmotionQuadrant = ref<Quadrant | null>(null)

const STEPS: ExileWitnessingStep[] = [
  'safety', 'protector-check', 'approach', 'self-check', 'witnessing', 'compassion', 'closing', 'reflection',
]
const stepLabels = computed(() => [
  t('exerciseWizards.exileWitnessing.steps.safety'),
  t('exerciseWizards.exileWitnessing.steps.protectorCheck'),
  t('exerciseWizards.exileWitnessing.steps.approach'),
  t('exerciseWizards.exileWitnessing.steps.selfCheck'),
  t('exerciseWizards.exileWitnessing.steps.witness'),
  t('exerciseWizards.exileWitnessing.steps.compassion'),
  t('exerciseWizards.exileWitnessing.steps.closing'),
  t('exerciseWizards.exileWitnessing.steps.reflection'),
])

const {
  currentStep,
  stepIndex,
  canAdvance,
  nextStep,
  prevStep,
  goToStep,
  safetyAcknowledged,
  protectorPartIds,
  protectorPermission,
  isBlocking,
  toggleProtector,
  exilePartId,
  bodyLocation,
  feltAge,
  emotionIds,
  emotionFamilyIds,
  selfCheckPassed,
  exileMessage,
  exileBelief,
  compassionMessage,
  insertCompassionChip,
  postSessionState,
  promise,
  insertPromiseChip,
  canStopEarly,
  stoppedEarly,
  stopEarly,
  updatePartCard,
  reflection,
  notes,
  isSaving,
  save,
} = useExileWitnessingWizard()

const router = useRouter()

/** Self check chose "something else is looking" — show the breathing pause + exits. */
const selfCheckReactive = ref(false)
const showStopPanel = ref(false)
const promiseChips = computed(() => tList('exerciseWizards.exileWitnessing.closing.promiseChips'))

/** Not enough Self today: leave without saving — that restraint is the practice. */
function leaveForToday() {
  void router.push({ name: 'exercises' })
}

const protectorParts = computed(() => {
  return partStore.sortedParts.filter(
    (p) => p.role === 'manager' || p.role === 'firefighter' || p.role === 'unknown',
  )
})

const permissionOptions = computed(() => [
  {
    value: 'okay' as const,
    label: t('exerciseWizards.exileWitnessing.protectorCheck.permissionOptions.yes.label'),
    description: t('exerciseWizards.exileWitnessing.protectorCheck.permissionOptions.yes.description'),
    icon: 'check_circle',
    iconBg: 'bg-status-good-soft',
    iconColor: 'text-status-good-on',
  },
  {
    value: 'nervous-but-willing' as const,
    label: t('exerciseWizards.exileWitnessing.protectorCheck.permissionOptions.hesitant.label'),
    description: t('exerciseWizards.exileWitnessing.protectorCheck.permissionOptions.hesitant.description'),
    icon: 'warning',
    iconBg: 'bg-status-warn-soft',
    iconColor: 'text-status-warn-on',
  },
  {
    value: 'blocking' as const,
    label: t('exerciseWizards.exileWitnessing.protectorCheck.permissionOptions.no.label'),
    description: t('exerciseWizards.exileWitnessing.protectorCheck.permissionOptions.no.description'),
    icon: 'cancel',
    iconBg: 'bg-status-bad-soft',
    iconColor: 'text-status-bad-on',
  },
])

const compassionChips = computed(() => tList('exerciseWizards.exileWitnessing.compassion.chips'))

const postStateOptions = computed(() => [
  { value: 'calmer' as const, label: t('exerciseWizards.exileWitnessing.summary.postState.calmer') },
  { value: 'same' as const, label: t('exerciseWizards.exileWitnessing.summary.postState.same') },
  { value: 'more-distressed' as const, label: t('exerciseWizards.exileWitnessing.summary.postState.moreDistressed') },
])

const postStateLabel = computed(() => {
  const opt = postStateOptions.value.find((o) => o.value === postSessionState.value)
  return opt?.label ?? ''
})

const postStateBadgeClass = computed(() => {
  switch (postSessionState.value) {
    case 'calmer': return 'bg-status-good-soft text-status-good-on'
    case 'same': return 'bg-neu-base text-on-surface-variant'
    case 'more-distressed': return 'bg-status-warn-soft text-status-warn-on'
    default: return 'bg-neu-base text-on-surface-variant'
  }
})

function getPartName(id: string): string {
  return partStore.getPartById(id)?.name ?? t('common.unknown')
}

function roleBorderClass(role: IFSPartRole): string {
  switch (role) {
    case 'manager': return 'border-l-4 border-l-blue-400'
    case 'firefighter': return 'border-l-4 border-l-orange-400'
    case 'exile': return 'border-l-4 border-l-purple-400'
    default: return ''
  }
}


async function handleCreatePart(data: { name: string; role: IFSPartRole }) {
  const part = await partStore.createPart({
    name: data.name,
    role: data.role,
    bodyLocations: [],
    emotionIds: [],
    lifeAreaIds: [],
  })
  exilePartId.value = part.id
}

async function handleSave() {
  try {
    await save()
    emit('saved')
  } catch {
    // Error already logged in composable
  }
}
</script>

<style scoped>
@keyframes breathe-slow {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.15);
    opacity: 1;
  }
}

.breathing-10s {
  animation: breathe-slow 5s ease-in-out infinite;
}

.breathing-15s {
  animation: breathe-slow 7.5s ease-in-out infinite;
}

.breathing-30s {
  animation: breathe-slow 8s ease-in-out infinite;
}
</style>
