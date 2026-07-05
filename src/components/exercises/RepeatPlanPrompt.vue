<template>
  <div class="space-y-2">
    <p class="text-sm font-medium text-on-surface">
      <template v-if="createdItem">
        {{ t('exercises.repeatPrompt.plannedFor', { date: plannedDateLabel }) }}
      </template>
      <template v-else>{{ t('exercises.repeatPrompt.title') }}</template>
    </p>

    <div class="flex flex-wrap items-center justify-center gap-2">
      <button
        v-for="option in chipOptions"
        :key="option.days"
        type="button"
        class="neo-pill neo-focus px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
        :class="{
          'neo-pill--primary': isSelected(option.days),
          'repeat-chip--suggested': option.suggested && !createdItem,
        }"
        :title="option.suggested ? t('exercises.repeatPrompt.suggested') : undefined"
        @click="pickDays(option.days)"
      >
        {{ chipLabel(option) }}
      </button>

      <button
        type="button"
        class="neo-pill neo-focus px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
        :class="{ 'neo-pill--primary': customSelected }"
        @click="openDatePicker"
      >
        {{ customSelected ? plannedDateLabel : t('exercises.repeatPrompt.chips.customDate') }}
      </button>

      <button
        v-if="createdItem"
        type="button"
        class="neo-focus px-2 py-1 text-xs font-medium text-on-surface-variant transition-colors hover:text-on-surface"
        @click="undo"
      >
        {{ t('exercises.repeatPrompt.undo') }}
      </button>
    </div>

    <input
      ref="dateInputRef"
      type="date"
      class="sr-only"
      :min="minCustomDate"
      tabindex="-1"
      aria-hidden="true"
      @change="handleDateChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useT } from '@/composables/useT'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import type { ExercisePlanItem } from '@/domain/exercisePlan'
import type { DayRef } from '@/domain/period'
import {
  buildRepeatChipOptions,
  type RepeatChipOption,
} from '@/services/exercisePlanService'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'
import { addDaysToDayRef, getPeriodRefsForDate } from '@/utils/periods'

const props = defineProps<{
  exerciseSlug: string
  /** Overrides the catalog's suggestedRepeatDays (assessments derive it from retakeEligibleAt). */
  suggestedDays?: number
}>()

const { t, tp, locale } = useT()
const planStore = useExercisePlanStore()

const dateInputRef = ref<HTMLInputElement | null>(null)
const createdItem = ref<ExercisePlanItem | null>(null)

const todayRef = computed(() => getPeriodRefsForDate(new Date()).day)
const minCustomDate = computed(() => addDaysToDayRef(todayRef.value, 1))

const effectiveSuggested = computed(
  () => props.suggestedDays ?? getCatalogEntry(props.exerciseSlug)?.suggestedRepeatDays,
)
const chipOptions = computed(() => buildRepeatChipOptions(effectiveSuggested.value))

/**
 * Adopt an already-pending plan for this exercise so repeated saves
 * (or a revisit of the results view) move the existing item instead
 * of stacking a new one.
 */
function adoptExistingPlan(): void {
  createdItem.value = planStore.oldestPendingForSlug(props.exerciseSlug) ?? null
}

onMounted(async () => {
  await planStore.ensureLoaded()
  adoptExistingPlan()
})

watch(
  () => props.exerciseSlug,
  () => {
    if (planStore.isLoaded) adoptExistingPlan()
  },
)

function dayRefForDays(days: number): DayRef {
  return addDaysToDayRef(todayRef.value, days)
}

function isSelected(days: number): boolean {
  return createdItem.value?.dayRef === dayRefForDays(days)
}

/** True when the planned day matches no chip — the custom chip shows the date. */
const customSelected = computed(() => {
  if (!createdItem.value) return false
  return !chipOptions.value.some((option) => isSelected(option.days))
})

const plannedDateLabel = computed(() => {
  if (!createdItem.value) return ''
  return new Date(createdItem.value.dayRef).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'long',
  })
})

function chipLabel(option: RepeatChipOption): string {
  if (option.labelKey === 'exercises.repeatPrompt.chips.inDays') {
    return tp(
      option.days,
      'exercises.repeatPrompt.chips.inDays.one',
      'exercises.repeatPrompt.chips.inDays.few',
      'exercises.repeatPrompt.chips.inDays.many',
    )
  }
  return t(option.labelKey)
}

async function planFor(dayRef: DayRef): Promise<void> {
  try {
    createdItem.value = createdItem.value
      ? await planStore.movePlan(createdItem.value.id, dayRef)
      : await planStore.createPlan(props.exerciseSlug, dayRef, 'repeat')
  } catch (err) {
    // Planning is auxiliary — never break the saved state over it.
    console.error('Failed to plan exercise repeat:', err)
  }
}

function pickDays(days: number): void {
  void planFor(dayRefForDays(days))
}

function openDatePicker(): void {
  dateInputRef.value?.showPicker()
}

function handleDateChange(event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.value) void planFor(input.value as DayRef)
  input.value = ''
}

async function undo(): Promise<void> {
  if (!createdItem.value) return
  try {
    await planStore.cancelPlan(createdItem.value.id)
    createdItem.value = null
  } catch (err) {
    console.error('Failed to cancel exercise repeat:', err)
  }
}
</script>

<style scoped>
.repeat-chip--suggested {
  border-color: rgb(var(--color-primary) / 0.55);
  border-style: dashed;
}
</style>
