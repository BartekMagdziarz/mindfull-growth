<template>
  <div class="space-y-2">
    <p class="text-sm font-medium text-on-surface">
      <template v-if="activeItem">
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
          'repeat-chip--suggested': option.suggested && !activeItem,
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
        v-if="activeItem"
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
/** Id of the plan this prompt created/moved — resolved against the store below. */
const managedItemId = ref<string | null>(null)

const todayRef = computed(() => getPeriodRefsForDate(new Date()).day)
const minCustomDate = computed(() => addDaysToDayRef(todayRef.value, 1))

const effectiveSuggested = computed(
  () => props.suggestedDays ?? getCatalogEntry(props.exerciseSlug)?.suggestedRepeatDays,
)
const chipOptions = computed(() => buildRepeatChipOptions(effectiveSuggested.value))

/**
 * The plan the chips operate on, resolved reactively from the store:
 * the one this prompt created, else the oldest already-pending plan
 * for the exercise (so repeated saves move it instead of stacking).
 * Resolving by id — not holding the object — matters right after a
 * save: the just-recorded completion auto-completes that pending plan
 * a beat after this prompt mounts, and the store update must flip the
 * prompt back to idle instead of leaving chips wired to a done item.
 */
const activeItem = computed<ExercisePlanItem | null>(() => {
  const managed = managedItemId.value
    ? planStore.items.find(
        (item) => item.id === managedItemId.value && item.status === 'pending',
      )
    : undefined
  return managed ?? planStore.oldestPendingForSlug(props.exerciseSlug) ?? null
})

onMounted(() => {
  void planStore.ensureLoaded()
})

watch(
  () => props.exerciseSlug,
  () => {
    managedItemId.value = null
  },
)

function dayRefForDays(days: number): DayRef {
  return addDaysToDayRef(todayRef.value, days)
}

function isSelected(days: number): boolean {
  return activeItem.value?.dayRef === dayRefForDays(days)
}

/** True when the planned day matches no chip — the custom chip shows the date. */
const customSelected = computed(() => {
  if (!activeItem.value) return false
  return !chipOptions.value.some((option) => isSelected(option.days))
})

const plannedDateLabel = computed(() => {
  if (!activeItem.value) return ''
  return new Date(activeItem.value.dayRef).toLocaleDateString(locale.value, {
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
    const item = activeItem.value
      ? await planStore.movePlan(activeItem.value.id, dayRef)
      : await planStore.createPlan(props.exerciseSlug, dayRef, 'repeat')
    managedItemId.value = item.id
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
  if (!activeItem.value) return
  try {
    await planStore.cancelPlan(activeItem.value.id)
    managedItemId.value = null
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
