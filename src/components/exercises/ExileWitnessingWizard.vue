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
            <p class="text-sm text-on-surface-variant" v-html="t('exerciseWizards.exileWitnessing.safety.description')" />
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

            <!-- Multi-select protectors -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                v-for="part in protectorParts"
                :key="part.id"
                class="neo-focus rounded-xl p-3 text-left transition-all"
                :class="[
                  protectorPartIds.includes(part.id)
                    ? 'neo-surface shadow-neu-pressed border-2 border-primary'
                    : 'neo-surface shadow-neu-raised-sm hover:-translate-y-px',
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
                    ? 'neo-surface shadow-neu-pressed border-2 border-primary'
                    : 'neo-surface shadow-neu-raised-sm hover:-translate-y-px'"
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
            <div v-if="isBlocking" class="bg-orange-50 p-3 rounded-lg">
              <p class="text-sm text-orange-700" v-html="t('exerciseWizards.exileWitnessing.protectorCheck.blockingMessage')" />
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

            <!-- Breathing animation -->
            <div class="flex justify-center py-4">
              <div class="breathing-circle breathing-15s w-20 h-20 rounded-full bg-rose-100 border-2 border-rose-300" />
            </div>

            <!-- Body location -->
            <BodyLocationPicker
              :model-value="bodyLocation ? [bodyLocation] : []"
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
            <div class="space-y-1">
              <label class="block text-sm font-medium text-on-surface">{{ t('exerciseWizards.exileWitnessing.approach.emotionLabel') }}</label>
              <EmotionSelector v-model="emotionIds" />
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

      <!-- Step 4: Witnessing -->
      <template v-else-if="currentStep === 'witnessing'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.exileWitnessing.witness.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.exileWitnessing.witness.description') }}
            </p>

            <!-- 30-second breathing circle -->
            <div class="flex justify-center py-6">
              <div class="breathing-circle breathing-30s w-28 h-28 rounded-full bg-rose-100 border-2 border-rose-300" />
            </div>

            <textarea
              v-model="exileMessage"
              rows="3"
              :placeholder="t('exerciseWizards.exileWitnessing.witness.messagePlaceholder')"
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
              {{ t('exerciseWizards.exileWitnessing.compassion.description') }}
            </p>

            <!-- Suggestion chips -->
            <div class="flex flex-wrap gap-2">
              <button
                v-for="chip in compassionChips"
                :key="chip"
                class="neo-pill px-3 py-1.5 text-sm bg-rose-50 text-rose-700 neo-focus shadow-neu-raised-sm hover:-translate-y-px transition-all"
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
                  ? 'neo-surface shadow-neu-pressed border-2 border-primary'
                  : 'neo-surface shadow-neu-raised-sm hover:-translate-y-px'"
                @click="postSessionState = option.value"
              >
                <p class="text-sm font-medium text-on-surface">{{ option.label }}</p>
              </button>
            </div>

            <div v-if="postSessionState === 'more-distressed'" class="bg-orange-50 p-3 rounded-lg">
              <p class="text-sm text-orange-700">
                {{ t('exerciseWizards.exileWitnessing.closing.distressedWarning') }}
              </p>
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
                  class="neo-pill text-xs px-2 py-0.5 bg-neu-base text-on-surface-variant"
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

              <div class="flex items-center gap-2">
                <span class="text-on-surface-variant">{{ t('exerciseWizards.exileWitnessing.reflection.postSessionLabel') }}</span>
                <span class="neo-pill text-xs px-2 py-0.5" :class="postStateBadgeClass">
                  {{ postStateLabel }}
                </span>
              </div>
            </div>

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
import { computed } from 'vue'
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
import type { IFSPartRole, IFSBodyLocation } from '@/domain/exercises'
import { useT } from '@/composables/useT'

const emit = defineEmits<{
  saved: []
}>()

const { t } = useT()
const partStore = useIFSPartStore()

const STEPS: ExileWitnessingStep[] = [
  'safety', 'protector-check', 'approach', 'witnessing', 'compassion', 'closing', 'reflection',
]
const stepLabels = computed(() => [
  t('exerciseWizards.exileWitnessing.steps.safety'),
  t('exerciseWizards.exileWitnessing.steps.protectorCheck'),
  t('exerciseWizards.exileWitnessing.steps.approach'),
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
  exileMessage,
  exileBelief,
  compassionMessage,
  insertCompassionChip,
  postSessionState,
  reflection,
  notes,
  isSaving,
  save,
} = useExileWitnessingWizard()

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
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    value: 'nervous-but-willing' as const,
    label: t('exerciseWizards.exileWitnessing.protectorCheck.permissionOptions.hesitant.label'),
    description: t('exerciseWizards.exileWitnessing.protectorCheck.permissionOptions.hesitant.description'),
    icon: 'warning',
    iconBg: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
  },
  {
    value: 'blocking' as const,
    label: t('exerciseWizards.exileWitnessing.protectorCheck.permissionOptions.no.label'),
    description: t('exerciseWizards.exileWitnessing.protectorCheck.permissionOptions.no.description'),
    icon: 'cancel',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
  },
])

const compassionChips = computed(() => [
  t('exerciseWizards.exileWitnessing.compassion.chips.0'),
  t('exerciseWizards.exileWitnessing.compassion.chips.1'),
  t('exerciseWizards.exileWitnessing.compassion.chips.2'),
  t('exerciseWizards.exileWitnessing.compassion.chips.3'),
  t('exerciseWizards.exileWitnessing.compassion.chips.4'),
  t('exerciseWizards.exileWitnessing.compassion.chips.5'),
])

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
    case 'calmer': return 'bg-green-100 text-green-700'
    case 'same': return 'bg-neu-base text-on-surface-variant'
    case 'more-distressed': return 'bg-orange-100 text-orange-700'
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

function formatLocation(location: IFSBodyLocation): string {
  return location
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
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
