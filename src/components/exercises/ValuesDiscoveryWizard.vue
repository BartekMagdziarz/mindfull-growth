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

    <!-- Step 1: Admirable People -->
    <template v-if="step === 0">
      <AppCard padding="lg" class="space-y-4">
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.valuesDiscovery.admirablePeople.title') }}</h2>
        <p class="text-sm text-on-surface-variant">
          {{ t('exerciseWizards.valuesDiscovery.admirablePeople.description') }}
        </p>

        <div v-for="(person, index) in draft.admirablePeople" :key="index" class="space-y-2 border-b border-neu-border/10 pb-4 last:border-0">
          <div class="flex items-center gap-3 group">
            <input
              v-model="person.name"
              type="text"
              :placeholder="t('exerciseWizards.valuesDiscovery.admirablePeople.namePlaceholder')"
              class="neo-input flex-1 p-2"
            />
            <button
              type="button"
              class="p-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-section transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              @click="draft.admirablePeople.splice(index, 1)"
              :aria-label="t('exerciseWizards.valuesDiscovery.admirablePeople.removePerson')"
            >
              <AppIcon name="close" class="text-base" />
            </button>
          </div>
          <div class="ml-4 space-y-1">
            <div v-for="(quality, qi) in person.qualities" :key="qi" class="flex items-center gap-2 group">
              <span class="text-primary text-xs">&#8226;</span>
              <input
                :value="quality"
                type="text"
                :placeholder="t('exerciseWizards.valuesDiscovery.admirablePeople.qualityPlaceholder')"
                class="neo-input flex-1 p-1.5 text-sm"
                @input="person.qualities[qi] = ($event.target as HTMLInputElement).value"
              />
              <button
                type="button"
                class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                @click="person.qualities.splice(qi, 1)"
              >
                <AppIcon name="close" class="text-xs" />
              </button>
            </div>
            <button
              type="button"
              class="flex items-center gap-1 text-xs text-primary hover:text-primary-strong transition-colors ml-3"
              @click="person.qualities.push('')"
            >
              <AppIcon name="add" class="text-xs" />
              {{ t('exerciseWizards.valuesDiscovery.admirablePeople.addQuality') }}
            </button>
          </div>
        </div>

        <button
          v-if="draft.admirablePeople.length < 5"
          type="button"
          class="flex items-center gap-2 text-sm text-primary hover:text-primary-strong transition-colors"
          @click="draft.admirablePeople.push({ name: '', qualities: [''] })"
        >
          <AppIcon name="add" class="text-base" />
          {{ t('exerciseWizards.valuesDiscovery.admirablePeople.addPerson') }}
        </button>
      </AppCard>

      <div class="flex justify-end">
        <AppButton variant="filled" :disabled="!hasAdmirablePeople" @click="step = 1">
          {{ t('exerciseWizards.valuesDiscovery.admirablePeople.nextButton') }}
        </AppButton>
      </div>
    </template>

    <!-- Step 2: Distill Core Values -->
    <template v-if="step === 1">
      <AppCard padding="lg" class="space-y-4">
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.valuesDiscovery.coreValues.title') }}</h2>
        <p class="text-sm text-on-surface-variant">
          {{ t('exerciseWizards.valuesDiscovery.coreValues.description') }}
        </p>

        <!-- Show qualities summary -->
        <div class="p-3 rounded-lg bg-section">
          <p class="text-xs font-medium text-on-surface-variant mb-2">{{ t('exerciseWizards.valuesDiscovery.coreValues.qualitiesSummaryLabel') }}</p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="quality in allQualities"
              :key="quality"
              class="px-2 py-0.5 rounded-full bg-chip text-on-surface text-xs border border-chip-border"
            >
              {{ quality }}
            </span>
          </div>
        </div>

        <!-- Core values input -->
        <div class="space-y-2">
          <div v-for="(value, index) in draft.coreValues" :key="index" class="flex items-center gap-2 group">
            <span class="text-primary">&#8226;</span>
            <input
              :value="value"
              type="text"
              :placeholder="t('exerciseWizards.valuesDiscovery.coreValues.valuePlaceholder')"
              class="neo-input flex-1 p-2"
              @input="draft.coreValues[index] = ($event.target as HTMLInputElement).value"
            />
            <button
              type="button"
              class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
              @click="draft.coreValues.splice(index, 1)"
            >
              <AppIcon name="close" class="text-base" />
            </button>
          </div>
          <button
            type="button"
            class="flex items-center gap-2 text-sm text-primary hover:text-primary-strong transition-colors"
            @click="draft.coreValues.push('')"
          >
            <AppIcon name="add" class="text-base" />
            {{ t('exerciseWizards.valuesDiscovery.coreValues.addValue') }}
          </button>
        </div>
      </AppCard>

      <!-- Notes -->
      <AppCard padding="lg" class="space-y-3">
        <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.valuesDiscovery.coreValues.reflectionTitle') }}</h3>
        <textarea
          v-model="draft.notes"
          rows="3"
          :placeholder="t('exerciseWizards.valuesDiscovery.coreValues.reflectionPlaceholder')"
          class="neo-input w-full p-3 text-sm resize-none"
        />
      </AppCard>

      <div class="flex justify-between">
        <AppButton variant="text" @click="step = 0">{{ t('exerciseWizards.valuesDiscovery.back') }}</AppButton>
        <AppButton variant="filled" :disabled="!canSave" @click="handleSave">
          {{ t('exerciseWizards.valuesDiscovery.saveButton') }}
        </AppButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import type { AdmirablePerson } from '@/domain/exercises'
import { useValuesDiscoveryStore } from '@/stores/valuesDiscovery.store'
import { useT } from '@/composables/useT'

const { t } = useT()

const emit = defineEmits<{
  saved: [id: string]
}>()

const valuesStore = useValuesDiscoveryStore()
const step = ref(0)
const stepLabels = computed(() => [t('exerciseWizards.valuesDiscovery.steps.admirablePeople'), t('exerciseWizards.valuesDiscovery.steps.coreValues')])

const draft = reactive<{
  admirablePeople: AdmirablePerson[]
  coreValues: string[]
  notes: string
}>({
  admirablePeople: [{ name: '', qualities: [''] }],
  coreValues: [''],
  notes: '',
})

const hasAdmirablePeople = computed(() => {
  return draft.admirablePeople.some((p) => p.name.trim().length > 0)
})

const allQualities = computed(() => {
  return draft.admirablePeople
    .flatMap((p) => p.qualities)
    .filter((q) => q.trim().length > 0)
})

const canSave = computed(() => {
  return draft.coreValues.some((v) => v.trim().length > 0)
})

async function handleSave() {
  const discovery = await valuesStore.createDiscovery({
    admirablePeople: draft.admirablePeople
      .filter((p) => p.name.trim().length > 0)
      .map((p) => ({
        name: p.name.trim(),
        qualities: p.qualities.filter((q) => q.trim().length > 0),
      })),
    coreValues: draft.coreValues.filter((v) => v.trim().length > 0),
    notes: draft.notes || undefined,
  })
  emit('saved', discovery.id)
}
</script>
