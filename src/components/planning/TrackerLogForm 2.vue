<template>
  <div class="rounded-xl border border-neu-border/20 bg-section/30 p-3 space-y-2">
    <div class="flex items-center justify-between">
      <p class="text-[11px] uppercase tracking-wide text-on-surface-variant">
        {{ t('planning.components.trackerLogForm.logProgress') }}
      </p>
      <p v-if="errorMessage" class="text-[11px] text-error">{{ errorMessage }}</p>
    </div>

    <div class="flex items-center gap-2">
      <div class="flex-1">
        <label class="sr-only">{{ t('planning.components.trackerLogForm.valuePlaceholder') }}</label>
        <input
          v-if="showsNumericInput"
          v-model.number="value"
          type="number"
          class="neo-input w-full sm:w-36 px-3 py-2 text-on-surface text-sm"
          :placeholder="numericPlaceholder"
          :disabled="disabled || isSaving"
        />

        <div v-else-if="tracker.type === 'rating'" class="flex items-center gap-2">
          <input
            v-model.number="rating"
            type="range"
            :min="ratingMin"
            :max="ratingMax"
            step="1"
            class="w-full sm:w-40 accent-primary"
            :disabled="disabled || isSaving"
          />
          <span class="text-sm font-medium text-on-surface w-8 text-right">
            {{ rating }}
          </span>
        </div>

        <label v-else class="flex items-center gap-2 text-sm text-on-surface-variant">
          <input
            v-model="checked"
            type="checkbox"
            class="neo-checkbox"
            :disabled="disabled || isSaving"
          />
          {{ t('planning.components.trackerLogForm.markComplete') }}
        </label>
      </div>

      <button
        type="button"
        class="neo-icon-button neo-icon-button--primary neo-focus h-9 w-9 shrink-0 p-0"
        :disabled="disabled || isSaving || !isValid"
        :aria-label="t('planning.components.trackerLogForm.logProgressButton')"
        @click="handleLog"
      >
        <PlusIcon class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PlusIcon } from '@heroicons/vue/20/solid'
import { useT } from '@/composables/useT'
import { trackerPeriodDexieRepository } from '@/repositories/planningDexieRepository'

const { t } = useT()
import { getTodayString } from '@/utils/periodUtils'
import type { TrackerType } from '@/domain/planning'

const props = defineProps<{
  tracker: {
    id: string
    type: TrackerType
    ratingScaleMin?: number
    ratingScaleMax?: number
  }
  trackerId: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  logged: []
}>()

const value = ref<number | null>(null)
const rating = ref<number>(props.tracker.ratingScaleMin ?? 1)
const checked = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')

const showsNumericInput = computed(() =>
  props.tracker.type === 'value' ||
  props.tracker.type === 'count' ||
  props.tracker.type === 'adherence'
)

const ratingMin = computed(() => props.tracker.ratingScaleMin ?? 1)
const ratingMax = computed(() => props.tracker.ratingScaleMax ?? 10)

const numericPlaceholder = computed(() => {
  if (props.tracker.type === 'value') return t('planning.components.trackerLogForm.valuePlaceholder')
  if (props.tracker.type === 'count') return t('planning.components.trackerLogForm.countPlaceholder')
  if (props.tracker.type === 'adherence') return t('planning.components.trackerLogForm.completedPlaceholder')
  return t('planning.components.trackerLogForm.valuePlaceholder')
})

const isValid = computed(() => {
  if (props.tracker.type === 'checkin') {
    return checked.value
  }
  if (props.tracker.type === 'rating') {
    return rating.value >= ratingMin.value && rating.value <= ratingMax.value
  }
  if (showsNumericInput.value) {
    return typeof value.value === 'number' && !Number.isNaN(value.value)
  }
  return false
})

watch(
  () => props.tracker.id,
  () => {
    value.value = null
    rating.value = props.tracker.ratingScaleMin ?? 1
    checked.value = false
    errorMessage.value = ''
  }
)

async function handleLog() {
  if (!isValid.value || isSaving.value) return

  isSaving.value = true
  errorMessage.value = ''

  try {
    // Get or create a TrackerPeriod for the current period, then update it
    const today = getTodayString()
    let period = await trackerPeriodDexieRepository.getByTrackerIdAndPeriod(
      props.trackerId,
      today
    )

    if (!period) {
      period = await trackerPeriodDexieRepository.create({
        trackerId: props.trackerId,
        startDate: today,
        endDate: today,
        sourceType: 'manual',
      })
    }

    // Build update based on tracker type
    if (props.tracker.type === 'rating') {
      await trackerPeriodDexieRepository.update(period.id, {
        rating: rating.value,
      })
    } else if (showsNumericInput.value) {
      const newEntry = {
        value: value.value ?? 0,
        date: today,
      }
      const existingEntries = period.entries ?? []
      await trackerPeriodDexieRepository.update(period.id, {
        entries: [...existingEntries, newEntry],
      })
    }

    value.value = null
    checked.value = false
    rating.value = props.tracker.ratingScaleMin ?? 1
    emit('logged')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('planning.components.trackerLogForm.failedToSave')
  } finally {
    isSaving.value = false
  }
}
</script>
