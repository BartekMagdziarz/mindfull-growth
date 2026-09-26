<template>
  <div
    class="mg-v2-surface mg-v2-surface--raised-sm w-full p-4 text-left"
    :class="tileClass"
    :data-test-program-step="index"
  >
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <span class="mg-v2-icon-board mg-v2-icon-board--sm program-step__icon" :class="{ 'is-muted': isLocked }" aria-hidden="true">
          <AppIcon :name="icon" />
        </span>
        <div class="min-w-0">
          <p class="mg-v2-meta">
            <span>{{ t('programs.ui.stepLabel', { n: index + 1 }) }}</span>
            <span v-if="step.optional">{{ t('programs.ui.optionalBadge') }}</span>
          </p>
          <h3 class="program-step__title" :class="{ 'is-muted': isLocked || stepState.state === 'skipped' }">
            {{ title }}
          </h3>
        </div>
      </div>
      <span v-if="stepState.state === 'current' && !isOverdue" class="mg-v2-pill mg-v2-pill--primary mg-v2-pill--selected shrink-0">
        {{ pillLabel }}
      </span>
      <span v-else class="program-step__status" :class="pillClass">
        <AppIcon v-if="stepState.state === 'done'" name="check" class="program-step__check" />{{ pillLabel }}
      </span>
    </div>

    <template v-if="stepState.state === 'current'">
      <p v-if="step.introKey" class="mt-3 text-sm text-on-surface-variant">
        {{ tg(step.introKey) }}
      </p>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <button
          v-if="!paused && entry"
          type="button"
          class="mg-v2-button mg-v2-button--primary"
          @click="router.push(step.continueLatest ? { path: entry.route, query: { continue: 'latest' } } : entry.route)"
        >
          {{ t('programs.ui.start') }}
        </button>
        <button
          v-if="!paused && step.optional"
          type="button"
          class="mg-v2-button"
          @click="emit('skip')"
        >
          {{ t('programs.ui.skipOptional') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import type { DayRef } from '@/domain/period'
import type { ProgramStep } from '@/domain/program'
import type { ProgramStepState } from '@/services/programSchedulerService'
import { getPeriodRefsForDate } from '@/utils/periods'

const props = defineProps<{
  index: number
  step: ProgramStep
  stepState: ProgramStepState
  /** Pending plan item's day when materialized; falls back to eligibleDay. */
  plannedDay?: DayRef
  paused: boolean
}>()

const emit = defineEmits<{
  skip: []
}>()

const router = useRouter()
const { t, tg, locale } = useT()

const entry = computed(() => getCatalogEntry(props.step.exerciseSlug))
const icon = computed(() => entry.value?.icon ?? 'flag')
const title = computed(() =>
  entry.value ? t(`exercises.cards.${entry.value.i18nKey}.title`) : props.step.exerciseSlug,
)

const isLocked = computed(() => props.stepState.state === 'locked')

const currentDay = computed(() => props.plannedDay ?? props.stepState.eligibleDay)
const isOverdue = computed(() => {
  if (props.stepState.state !== 'current' || !currentDay.value) return false
  return currentDay.value < getPeriodRefsForDate(new Date()).day
})

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' }).format(
      new Date(value),
    )
  } catch {
    return value.slice(0, 10)
  }
}

const pillLabel = computed(() => {
  switch (props.stepState.state) {
    case 'done':
      return t('programs.ui.stepDone', {
        date: props.stepState.completedAt ? formatDate(props.stepState.completedAt) : '',
      })
    case 'skipped':
      return t('programs.ui.stepSkipped')
    case 'current':
      if (isOverdue.value) return t('programs.ui.overdue')
      return currentDay.value
        ? t('programs.ui.plannedFor', { date: formatDate(currentDay.value) })
        : t('programs.ui.statusActive')
    case 'locked':
    default:
      return t('programs.ui.stepLocked')
  }
})

/** Quiet status text like the Today rows: overdue in rose, everything else muted. */
const pillClass = computed(() =>
  props.stepState.state === 'current' && isOverdue.value ? 'is-overdue' : '',
)

const tileClass = computed(() =>
  props.stepState.state === 'current' ? 'exercise-program-step--current' : '',
)
</script>

<style scoped>
.program-step__icon.is-muted {
  color: var(--mg-color-muted);
}

.program-step__title {
  margin: 0;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-md);
  font-weight: 800;
}

.program-step__title.is-muted {
  color: var(--mg-color-muted);
  font-weight: 700;
}

.program-step__status {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--mg-space-1);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 600;
  text-align: right;
}

.program-step__status.is-overdue {
  color: var(--mg-color-rose);
  font-weight: 700;
}

.program-step__check {
  color: var(--mg-color-primary-strong);
  font-size: 1rem;
}
</style>
