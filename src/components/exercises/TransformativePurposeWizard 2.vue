<template>
  <div class="space-y-6">
    <!-- Step indicator -->
    <div class="flex items-center gap-2 mb-4">
      <button
        v-for="(stepLabel, idx) in stepLabels"
        :key="idx"
        class="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors"
        :class="idx === step
          ? 'shadow-neu-pressed bg-neu-base text-primary border border-neu-border/40'
          : idx < step
            ? 'bg-primary/15 text-primary'
            : 'bg-outline/10 text-on-surface-variant'"
        @click="idx < step && (step = idx)"
      >
        {{ stepLabel }}
      </button>
    </div>

    <!-- Step 1: Curiosities -->
    <template v-if="step === 0">
      <AppCard padding="lg" class="space-y-4">
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.transformativePurpose.curiosities.title') }}</h2>
        <p class="text-sm text-on-surface-variant">
          {{ t('exerciseWizards.transformativePurpose.curiosities.description') }}
        </p>
        <div class="space-y-2">
          <div v-for="(item, index) in draft.curiosities" :key="index" class="flex items-center gap-2">
            <span class="text-primary text-sm font-semibold">{{ index + 1 }}.</span>
            <input
              :value="item"
              type="text"
              :placeholder="t('exerciseWizards.transformativePurpose.curiosities.placeholder')"
              class="neo-input flex-1 p-2"
              @input="draft.curiosities[index] = ($event.target as HTMLInputElement).value"
            />
          </div>
        </div>
      </AppCard>
      <div class="flex justify-end">
        <AppButton variant="filled" :disabled="!hasCuriosities" @click="step = 1">
          {{ t('exerciseWizards.transformativePurpose.curiosities.nextButton') }}
        </AppButton>
      </div>
    </template>

    <!-- Step 2: Intersection -->
    <template v-if="step === 1">
      <AppCard padding="lg" class="space-y-4">
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.transformativePurpose.intersection.title') }}</h2>
        <p class="text-sm text-on-surface-variant">
          {{ t('exerciseWizards.transformativePurpose.intersection.description') }}
        </p>
        <div class="p-3 rounded-lg bg-section">
          <p class="text-xs font-medium text-on-surface-variant mb-2">{{ t('exerciseWizards.transformativePurpose.intersection.curiositiesLabel') }}</p>
          <ul class="space-y-1">
            <li v-for="c in filledCuriosities" :key="c" class="text-sm text-on-surface">
              &#8226; {{ c }}
            </li>
          </ul>
        </div>
        <textarea
          v-model="draft.intersection"
          rows="3"
          :placeholder="t('exerciseWizards.transformativePurpose.intersection.placeholder')"
          class="neo-input w-full p-3 text-sm resize-none"
        />
      </AppCard>
      <div class="flex justify-between">
        <AppButton variant="text" @click="step = 0">{{ t('exerciseWizards.transformativePurpose.back') }}</AppButton>
        <AppButton variant="filled" @click="step = 2">{{ t('exerciseWizards.transformativePurpose.intersection.nextButton') }}</AppButton>
      </div>
    </template>

    <!-- Step 3: Problems -->
    <template v-if="step === 2">
      <AppCard padding="lg" class="space-y-4">
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.transformativePurpose.problems.title') }}</h2>
        <p class="text-sm text-on-surface-variant">
          {{ t('exerciseWizards.transformativePurpose.problems.description') }}
        </p>
        <div class="space-y-2">
          <div v-for="(item, index) in draft.problems" :key="index" class="flex items-center gap-2">
            <span class="text-primary text-sm font-semibold">{{ index + 1 }}.</span>
            <input
              :value="item"
              type="text"
              :placeholder="t('exerciseWizards.transformativePurpose.problems.placeholder')"
              class="neo-input flex-1 p-2"
              @input="draft.problems[index] = ($event.target as HTMLInputElement).value"
            />
          </div>
        </div>
      </AppCard>
      <div class="flex justify-between">
        <AppButton variant="text" @click="step = 1">{{ t('exerciseWizards.transformativePurpose.back') }}</AppButton>
        <AppButton variant="filled" @click="step = 3">{{ t('exerciseWizards.transformativePurpose.problems.nextButton') }}</AppButton>
      </div>
    </template>

    <!-- Step 4: Purpose Statement -->
    <template v-if="step === 3">
      <AppCard padding="lg" class="space-y-4">
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.transformativePurpose.purpose.title') }}</h2>
        <p class="text-sm text-on-surface-variant">
          {{ t('exerciseWizards.transformativePurpose.purpose.description') }}
        </p>
        <textarea
          v-model="draft.purposeStatement"
          rows="3"
          :placeholder="t('exerciseWizards.transformativePurpose.purpose.placeholder')"
          class="neo-input w-full p-3 text-sm resize-none"
        />
      </AppCard>

      <AppCard padding="lg" class="space-y-3">
        <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.transformativePurpose.purpose.reflectionTitle') }}</h3>
        <textarea
          v-model="draft.notes"
          rows="3"
          :placeholder="t('exerciseWizards.transformativePurpose.purpose.reflectionPlaceholder')"
          class="neo-input w-full p-3 text-sm resize-none"
        />
      </AppCard>

      <div class="flex justify-between">
        <AppButton variant="text" @click="step = 2">{{ t('exerciseWizards.transformativePurpose.back') }}</AppButton>
        <AppButton variant="filled" :disabled="!canSave" @click="handleSave">
          {{ t('exerciseWizards.transformativePurpose.saveButton') }}
        </AppButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { useTransformativePurposeStore } from '@/stores/transformativePurpose.store'
import { useT } from '@/composables/useT'

const { t } = useT()

const emit = defineEmits<{
  saved: [id: string]
}>()

const purposeStore = useTransformativePurposeStore()
const step = ref(0)
const stepLabels = computed(() => [t('exerciseWizards.transformativePurpose.steps.curiosities'), t('exerciseWizards.transformativePurpose.steps.intersection'), t('exerciseWizards.transformativePurpose.steps.problems'), t('exerciseWizards.transformativePurpose.steps.purpose')])

const draft = reactive({
  curiosities: ['', '', '', '', ''] as string[],
  intersection: '',
  problems: ['', '', '', '', ''] as string[],
  purposeStatement: '',
  notes: '',
})

const hasCuriosities = computed(() => {
  return draft.curiosities.some((c) => c.trim().length > 0)
})

const filledCuriosities = computed(() => {
  return draft.curiosities.filter((c) => c.trim().length > 0)
})

const canSave = computed(() => {
  return hasCuriosities.value
})

async function handleSave() {
  const purpose = await purposeStore.createPurpose({
    curiosities: draft.curiosities.filter((c) => c.trim().length > 0),
    intersection: draft.intersection || undefined,
    problems: draft.problems.filter((p) => p.trim().length > 0),
    purposeStatement: draft.purposeStatement || undefined,
    notes: draft.notes || undefined,
  })
  emit('saved', purpose.id)
}
</script>
