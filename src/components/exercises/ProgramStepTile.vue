<template>
  <div
    class="w-full rounded-2xl border p-4 text-left"
    :class="tileClass"
    :data-test-program-step="index"
  >
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <span class="neo-icon-circle flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <AppIcon :name="icon" class="text-xl" :class="isLocked ? 'text-on-surface-variant' : 'text-primary'" />
        </span>
        <div class="min-w-0">
          <p class="text-xs text-on-surface-variant">
            {{ t('programs.ui.stepLabel', { n: index + 1 }) }}
            <span v-if="step.optional"> · {{ t('programs.ui.optionalBadge') }}</span>
          </p>
          <h3 class="truncate text-base font-semibold" :class="isLocked ? 'text-on-surface-variant' : 'text-on-surface'">
            {{ title }}
          </h3>
        </div>
      </div>
      <span class="neo-pill shrink-0 px-2.5 py-1 text-xs" :class="pillClass">
        {{ pillLabel }}
      </span>
    </div>

    <template v-if="stepState.state === 'current'">
      <p v-if="step.introKey" class="mt-3 text-sm text-on-surface-variant">
        {{ t(step.introKey) }}
      </p>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <button
          v-if="!paused && entry"
          type="button"
          class="neo-pill neo-focus rounded-xl bg-gradient-to-br from-primary to-primary-strong px-4 py-2 text-sm font-medium text-on-primary transition-all duration-200 hover:-translate-y-px active:translate-y-0"
          @click="router.push(entry.route)"
        >
          {{ t('programs.ui.start') }}
        </button>
        <button
          v-if="!paused && step.optional"
          type="button"
          class="neo-pill neo-focus rounded-xl px-4 py-2 text-sm text-on-surface-variant transition-all duration-200 hover:-translate-y-px active:translate-y-0"
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
const { t, locale } = useT()

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

const pillClass = computed(() => {
  switch (props.stepState.state) {
    case 'done':
      return 'neo-pill--success'
    case 'current':
      return isOverdue.value
        ? 'border-status-warn/40 bg-status-warn-soft/70 text-status-warn-on'
        : 'border-primary/30 bg-primary/10 text-primary-strong'
    case 'skipped':
    case 'locked':
    default:
      return 'text-on-surface-variant'
  }
})

const tileClass = computed(() => {
  switch (props.stepState.state) {
    case 'current':
      return 'border-primary/30 bg-primary/10 shadow-neu-raised-sm'
    case 'done':
      return 'border-neu-border/30 bg-neu-base shadow-neu-raised-sm'
    case 'skipped':
      return 'border-neu-border/30 bg-neu-base shadow-neu-flat opacity-80'
    case 'locked':
    default:
      return 'border-neu-border/30 bg-neu-base shadow-neu-flat opacity-60'
  }
})
</script>
