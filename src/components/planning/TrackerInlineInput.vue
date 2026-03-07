<template>
  <div class="space-y-3">
    <p v-if="errorMessage" class="text-xs text-error">{{ errorMessage }}</p>

    <template v-if="tracker.type === 'count'">
      <div class="w-full flex flex-wrap items-center justify-center gap-1">
        <button
          v-for="(tick, position) in countTicks"
          :key="tick.index"
          type="button"
          :class="[
            'inline-flex shrink-0 items-center justify-center rounded-md',
            'transition-colors duration-150 hover:bg-section/40',
            'disabled:cursor-not-allowed disabled:opacity-40',
            compact ? 'h-4 w-5' : 'h-5 w-6',
          ]"
          :disabled="isSaving"
          :aria-label="t('planning.components.trackerInlineInput.removeCountItem', { index: position + 1 })"
          :title="t('planning.components.trackerInlineInput.removeCountItem', { index: position + 1 })"
          @click="removeCountTick(tick.index)"
        >
          <span
            :class="[
              'block rounded-full border border-primary/50',
              'bg-gradient-to-br from-primary to-primary-strong shadow-neu-raised-sm',
              compact ? 'h-1.5 w-3' : 'h-1.5 w-4',
            ]"
          />
        </button>

        <button
          type="button"
          :class="[
            'neo-icon-button neo-icon-button--primary neo-focus shrink-0 p-0',
            compact ? 'h-9 w-9' : 'h-10 w-10',
          ]"
          :disabled="isSaving"
          :aria-label="t('planning.components.trackerInlineInput.addCountItem')"
          @click="addCountTick"
        >
          <PlusIcon :class="compact ? 'h-4 w-4' : 'h-5 w-5'" />
        </button>
      </div>
    </template>

    <template v-else-if="tracker.type === 'adherence'">
      <TrackerDisplay
        :target-count="targetCount"
        :completed-ticks="completedTicks"
        :display-count="completedCount"
        :tick-labels="tracker.tickLabels"
        :show-progress-bar="false"
        :compact="compact"
        :disabled="isSaving || targetCount <= 0"
        @toggle="handleTickToggle"
      />
    </template>

    <template v-else-if="tracker.type === 'value'">
      <div class="flex w-full items-center justify-center gap-2">
        <input
          v-model.number="valueDraft"
          type="number"
          class="neo-input w-full px-3 py-2 text-sm sm:w-36"
          :placeholder="tracker.unit ? t('planning.components.trackerInlineInput.valueWithUnit', { unit: tracker.unit }) : t('planning.components.trackerInlineInput.valuePlaceholder')"
          :disabled="isSaving"
        />
        <button
          type="button"
          class="neo-icon-button neo-icon-button--primary neo-focus h-9 w-9 shrink-0 p-0"
          :disabled="isSaving || !isValueDraftValid"
          :aria-label="t('planning.components.trackerInlineInput.logValue')"
          @click="logValue"
        >
          <PlusIcon class="h-4 w-4" />
        </button>
      </div>
    </template>

    <template v-else-if="tracker.type === 'rating'">
      <div class="flex w-full items-center justify-center gap-2">
        <div class="neo-surface flex-1 px-3 py-2">
          <div class="flex items-center gap-3">
            <input
              v-model.number="ratingDraft"
              type="range"
              class="planning-tracker-range w-full"
              :min="ratingMin"
              :max="ratingMax"
              step="1"
              :style="{ '--range-fill': ratingFillPercent + '%' }"
              :disabled="isSaving"
            />
            <span class="w-10 text-right text-sm font-semibold text-on-surface">{{ ratingDraft }}</span>
          </div>
        </div>
        <button
          type="button"
          class="neo-icon-button neo-icon-button--primary neo-focus h-9 w-9 shrink-0 p-0"
          :disabled="isSaving"
          :aria-label="t('planning.components.trackerInlineInput.logRating')"
          @click="logRating"
        >
          <PlusIcon class="h-4 w-4" />
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PlusIcon } from '@heroicons/vue/20/solid'
import { useT } from '@/composables/useT'
import TrackerDisplay from './TrackerDisplay.vue'

const { t } = useT()
import type { Tracker, TrackerPeriod, TrackerPeriodTick } from '@/domain/planning'
import { trackerPeriodDexieRepository } from '@/repositories/planningDexieRepository'
import { resolveEntryDateWithinPeriod } from '@/services/projectTrackerScope.service'

const props = withDefaults(
  defineProps<{
    tracker: Tracker
    periodType: 'weekly' | 'monthly'
    startDate: string
    endDate: string
    compact?: boolean
  }>(),
  {
    compact: false,
  }
)

const emit = defineEmits<{
  logged: [trackerId: string]
}>()

const period = ref<TrackerPeriod | null>(null)
const isSaving = ref(false)
const errorMessage = ref('')

const valueDraft = ref<number | null>(null)
const ratingDraft = ref(1)

const ratingMin = computed(() => props.tracker.ratingScaleMin ?? 1)
const ratingMax = computed(() => props.tracker.ratingScaleMax ?? 10)
const ratingFillPercent = computed(() => {
  const range = ratingMax.value - ratingMin.value
  if (range <= 0) return 0
  return ((ratingDraft.value - ratingMin.value) / range) * 100
})

const targetCount = computed(() => {
  if (period.value?.periodTarget && period.value.periodTarget > 0) return period.value.periodTarget
  if (props.tracker.targetCount && props.tracker.targetCount > 0) return props.tracker.targetCount
  return period.value?.ticks?.length ?? 0
})

const completedCount = computed(() => {
  return (period.value?.ticks ?? []).filter((tick) => tick.completed).length
})

const countTicks = computed(() => {
  return [...(period.value?.ticks ?? [])]
    .filter((tick) => tick.completed)
    .sort((a, b) => a.index - b.index)
})

const completedTicks = computed(() => {
  return (period.value?.ticks ?? [])
    .filter((tick) => tick.completed && tick.index < targetCount.value)
    .map((tick) => tick.index)
})

const isValueDraftValid = computed(() => typeof valueDraft.value === 'number' && !Number.isNaN(valueDraft.value))

let loadToken = 0
let periodCreationPromise: Promise<TrackerPeriod> | null = null

async function loadState() {
  const token = ++loadToken
  errorMessage.value = ''

  try {
    const foundPeriod = await trackerPeriodDexieRepository.getByTrackerIdAndPeriod(
      props.tracker.id,
      props.startDate
    )

    if (token !== loadToken) return

    period.value = foundPeriod ?? null

    if (props.tracker.type === 'rating') {
      ratingDraft.value = foundPeriod?.rating ?? ratingMin.value
    }
  } catch (error) {
    if (token !== loadToken) return
    errorMessage.value =
      error instanceof Error ? error.message : t('planning.components.trackerInlineInput.failedToLoadPeriod')
  }
}

function buildInitialTicks(count: number): TrackerPeriodTick[] {
  return Array.from({ length: count }, (_, index) => ({
    index,
    completed: false,
  }))
}

async function ensurePeriod(
  options?: {
    sourceType?: 'manual' | 'planning'
    periodTarget?: number
    tickCount?: number
  }
): Promise<TrackerPeriod> {
  if (period.value) return period.value
  if (periodCreationPromise) return periodCreationPromise

  periodCreationPromise = (async () => {
    const existing = await trackerPeriodDexieRepository.getByTrackerIdAndPeriod(
      props.tracker.id,
      props.startDate
    )
    if (existing) {
      period.value = existing
      return existing
    }

    const initialTickCount =
      options?.tickCount ??
      (options?.periodTarget && options.periodTarget > 0
        ? options.periodTarget
        : targetCount.value)
    const initialTicks =
      props.tracker.type === 'adherence'
        ? buildInitialTicks(initialTickCount)
        : undefined

    const created = await trackerPeriodDexieRepository.create({
      trackerId: props.tracker.id,
      startDate: props.startDate,
      endDate: props.endDate,
      sourceType: options?.sourceType ?? 'manual',
      periodTarget: options?.periodTarget,
      ticks: initialTicks,
    })

    period.value = created
    return created
  })()

  try {
    return await periodCreationPromise
  } finally {
    periodCreationPromise = null
  }
}

async function persistPeriodUpdate(
  update: Partial<Pick<TrackerPeriod, 'ticks' | 'entries' | 'rating' | 'periodTarget'>>
) {
  isSaving.value = true
  errorMessage.value = ''

  try {
    const current = await ensurePeriod()
    const updated = await trackerPeriodDexieRepository.update(current.id, update)
    period.value = updated
    await loadState()
    emit('logged', props.tracker.id)
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t('planning.components.trackerInlineInput.failedToSaveUpdate')
  } finally {
    isSaving.value = false
  }
}

async function handleTickToggle(tickIndex: number, isCompleted: boolean) {
  const current = await ensurePeriod()
  const entryDate = resolveEntryDateWithinPeriod(props.startDate, props.endDate)

  const ticks = [...(current.ticks ?? buildInitialTicks(targetCount.value))]
  const existing = ticks.find((tick) => tick.index === tickIndex)

  if (existing) {
    existing.completed = isCompleted
    existing.date = entryDate
  } else {
    ticks.push({ index: tickIndex, completed: isCompleted, date: entryDate })
  }

  ticks.sort((a, b) => a.index - b.index)

  await persistPeriodUpdate({ ticks })
}

async function addCountTick() {
  const current = await ensurePeriod()
  const entryDate = resolveEntryDateWithinPeriod(props.startDate, props.endDate)
  const ticks = [...(current.ticks ?? [])]
  const nextIndex = ticks.reduce((max, tick) => Math.max(max, tick.index), -1) + 1
  ticks.push({ index: nextIndex, completed: true, date: entryDate })
  ticks.sort((a, b) => a.index - b.index)
  await persistPeriodUpdate({ ticks })
}

async function removeCountTick(tickIndex: number) {
  const current = await ensurePeriod()
  const ticks = (current.ticks ?? []).filter(
    (tick) => !(tick.completed && tick.index === tickIndex)
  )
  await persistPeriodUpdate({ ticks })
}

async function logValue() {
  if (!isValueDraftValid.value) return

  const current = await ensurePeriod()
  const entryDate = resolveEntryDateWithinPeriod(props.startDate, props.endDate)
  const entries = [...(current.entries ?? [])]
  entries.push({
    value: valueDraft.value as number,
    date: entryDate,
  })

  await persistPeriodUpdate({ entries })
  valueDraft.value = null
}

async function logRating() {
  await persistPeriodUpdate({
    rating: ratingDraft.value,
  })
}

watch(
  () => [props.tracker.id, props.startDate, props.endDate],
  () => {
    periodCreationPromise = null
    valueDraft.value = null
    ratingDraft.value = ratingMin.value
    void loadState()
  },
  { immediate: true }
)
</script>

<style scoped>
.planning-tracker-range {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  height: 1rem;
}

.planning-tracker-range::-webkit-slider-runnable-track {
  height: 0.45rem;
  border-radius: 9999px;
  border: 1px solid rgb(var(--neo-border) / 0.32);
  background:
    linear-gradient(
      to right,
      rgb(var(--color-primary) / 0.35) 0%,
      rgb(var(--color-primary) / 0.35) var(--range-fill, 0%),
      rgb(var(--neo-surface-base)) var(--range-fill, 0%),
      rgb(var(--neo-surface-base)) 100%
    );
  box-shadow:
    inset -2px -2px 4px rgb(var(--neo-inset-light) / 0.8),
    inset 2px 2px 4px rgb(var(--neo-inset-dark) / 0.33);
}

.planning-tracker-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 1.3rem;
  height: 1.3rem;
  margin-top: -0.46rem;
  border-radius: 9999px;
  border: 1px solid rgb(var(--color-primary) / 0.25);
  background: linear-gradient(
    145deg,
    rgb(var(--color-primary) / 0.75),
    rgb(var(--color-primary-strong) / 0.75)
  );
  box-shadow:
    -2px -2px 4px rgb(var(--neo-shadow-light) / 0.8),
    2px 2px 4px rgb(var(--neo-shadow-dark) / 0.33);
  cursor: pointer;
}

.planning-tracker-range::-moz-range-track {
  height: 0.45rem;
  border-radius: 9999px;
  border: 1px solid rgb(var(--neo-border) / 0.32);
  background:
    linear-gradient(
      to right,
      rgb(var(--color-primary) / 0.35) 0%,
      rgb(var(--color-primary) / 0.35) var(--range-fill, 0%),
      rgb(var(--neo-surface-base)) var(--range-fill, 0%),
      rgb(var(--neo-surface-base)) 100%
    );
  box-shadow:
    inset -2px -2px 4px rgb(var(--neo-inset-light) / 0.8),
    inset 2px 2px 4px rgb(var(--neo-inset-dark) / 0.33);
}

.planning-tracker-range::-moz-range-thumb {
  width: 1.3rem;
  height: 1.3rem;
  border-radius: 9999px;
  border: 1px solid rgb(var(--color-primary) / 0.25);
  background: linear-gradient(
    145deg,
    rgb(var(--color-primary) / 0.75),
    rgb(var(--color-primary-strong) / 0.75)
  );
  box-shadow:
    -2px -2px 4px rgb(var(--neo-shadow-light) / 0.8),
    2px 2px 4px rgb(var(--neo-shadow-dark) / 0.33);
  cursor: pointer;
}

.planning-tracker-range:focus-visible {
  outline: none;
}
</style>
