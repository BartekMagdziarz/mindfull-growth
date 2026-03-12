<template>
  <AppCard
    padding="lg"
    :variant="item.isScheduledToday ? 'raised-strong' : 'raised'"
    class="h-full"
  >
    <div class="flex h-full flex-col gap-5">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            {{ eyebrow }}
          </p>
          <button
            type="button"
            class="mt-1 text-left text-xl font-semibold tracking-[-0.02em] text-on-surface transition-colors hover:text-primary-strong focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background"
            @click="$emit('open-object')"
          >
            {{ title }}
          </button>
          <p v-if="description" class="mt-2 text-sm leading-6 text-on-surface-variant">
            {{ description }}
          </p>
          <p v-if="goalTitle" class="mt-3 text-sm font-medium text-on-surface-variant">
            {{ t('planning.today.details.goal', { title: goalTitle }) }}
          </p>
        </div>

        <button
          type="button"
          class="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary-strong transition-colors hover:bg-primary/15 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background"
          :disabled="isPending"
          @click="$emit('open-context')"
        >
          {{ contextLabel }}
        </button>
      </div>

      <div v-if="badges.length > 0" class="flex flex-wrap gap-2">
        <span
          v-for="badge in badges"
          :key="`${badge.label}-${badge.tone}`"
          :class="badgeClasses(badge.tone)"
        >
          {{ badge.label }}
        </span>
      </div>

      <div
        v-if="details.length > 0"
        class="grid gap-2 text-sm text-on-surface-variant sm:grid-cols-2"
      >
        <p v-for="detail in details" :key="detail">
          {{ detail }}
        </p>
      </div>

      <section
        v-if="item.kind === 'measurement'"
        class="neo-surface mt-auto rounded-[1.6rem] border border-white/35 p-4"
      >
        <div v-if="item.subject.entryMode === 'completion'" class="flex flex-wrap gap-3">
          <AppButton
            :variant="item.todayEntry ? 'tonal' : 'filled'"
            :disabled="isPending"
            @click="$emit('toggle-completion')"
          >
            {{
              item.todayEntry
                ? t('planning.today.actions.undoEntry')
                : t('planning.today.actions.recordEntry')
            }}
          </AppButton>
        </div>

        <div v-else class="space-y-3">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div class="flex items-center gap-2">
              <AppButton
                v-if="showsStepper"
                variant="tonal"
                :aria-label="t('planning.today.actions.decrease')"
                :disabled="isPending"
                @click="handleStep(-1)"
              >
                -
              </AppButton>

              <input
                v-model="draftValue"
                type="number"
                :step="inputStep"
                :min="inputMin"
                class="neo-input w-full min-w-[8rem] px-4 py-3 text-sm"
                :aria-label="numericInputLabel"
                :disabled="isPending"
                @keydown.enter.prevent="handleSaveNumeric"
              />

              <AppButton
                v-if="showsStepper"
                variant="tonal"
                :aria-label="t('planning.today.actions.increase')"
                :disabled="isPending"
                @click="handleStep(1)"
              >
                +
              </AppButton>
            </div>

            <div class="flex flex-wrap gap-2">
              <AppButton
                variant="filled"
                :disabled="isPending || parsedDraftValue === undefined"
                @click="handleSaveNumeric"
              >
                {{ t('common.buttons.save') }}
              </AppButton>
              <AppButton
                variant="text"
                :disabled="isPending || !item.todayEntry"
                @click="$emit('clear-entry')"
              >
                {{ t('planning.today.actions.clearEntry') }}
              </AppButton>
            </div>
          </div>
        </div>
      </section>

      <div class="flex flex-wrap gap-2 border-t border-white/35 pt-4">
        <template v-if="item.isScheduledToday">
          <input
            v-model="moveDayRef"
            type="date"
            class="neo-input min-w-[10rem] px-4 py-3 text-sm"
            :aria-label="t('planning.today.actions.moveToDay')"
            :disabled="isPending"
          />
          <AppButton variant="outlined" :disabled="isPending || !canMove" @click="handleMove">
            {{ t('planning.today.actions.moveToDay') }}
          </AppButton>
          <AppButton variant="text" :disabled="isPending" @click="$emit('clear-schedule')">
            {{ t('planning.today.actions.clearToday') }}
          </AppButton>
          <AppButton variant="text" :disabled="isPending" @click="$emit('request-delete')">
            {{ t('common.buttons.delete') }}
          </AppButton>
        </template>

        <AppButton
          v-else-if="item.canHide"
          variant="text"
          :disabled="isPending"
          @click="$emit('hide')"
        >
          {{ t('planning.today.actions.hideForToday') }}
        </AppButton>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DayRef } from '@/domain/period'
import type { MeasurementTarget } from '@/domain/planning'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import { useT } from '@/composables/useT'
import type { TodayItem, TodayMeasurementItem } from '@/services/todayViewQueries'
import { getPeriodBounds } from '@/utils/periods'
import { formatPeriodLabel } from '@/utils/periodLabels'

type BadgeTone = 'default' | 'accent' | 'success' | 'warning' | 'danger'

interface BadgeModel {
  label: string
  tone: BadgeTone
}

interface Props {
  item: TodayItem
  todayDayRef: DayRef
  isPending?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPending: false,
})

const emit = defineEmits<{
  'open-object': []
  'open-context': []
  'toggle-completion': []
  'save-entry': [value: number]
  'clear-entry': []
  hide: []
  move: [dayRef: DayRef]
  'clear-schedule': []
  'request-delete': []
}>()

const { t, locale } = useT()
const draftValue = ref('')
const moveDayRef = ref(props.todayDayRef)

const title = computed(() =>
  props.item.kind === 'initiative' ? props.item.initiative.title : props.item.subject.title
)
const description = computed(() =>
  props.item.kind === 'initiative'
    ? props.item.initiative.description
    : props.item.subject.description
)
const goalTitle = computed(() => props.item.goalTitle)
const eyebrow = computed(() => {
  if (props.item.kind === 'initiative') {
    return t('planning.objects.labels.initiative')
  }

  return t(`planning.objects.labels.${props.item.panelType}`)
})
const contextLabel = computed(() =>
  formatPeriodLabel(props.item.contextPeriodRef, locale.value, t('planning.calendar.scales.week'))
)

const badges = computed<BadgeModel[]>(() => {
  if (props.item.kind === 'initiative') {
    return props.item.isScheduledToday
      ? [{ label: t('planning.calendar.details.scheduledDay'), tone: 'accent' }]
      : []
  }

  const nextBadges: BadgeModel[] = [
    {
      label: t(`planning.objects.badges.cadence.${props.item.subject.cadence}`),
      tone: 'default',
    },
    {
      label: t(`planning.objects.badges.entryMode.${props.item.subject.entryMode}`),
      tone: 'default',
    },
  ]

  if (props.item.measurement.evaluationStatus) {
    nextBadges.push({
      label: t(`planning.calendar.badges.${props.item.measurement.evaluationStatus}`),
      tone:
        props.item.measurement.evaluationStatus === 'met'
          ? 'success'
          : props.item.measurement.evaluationStatus === 'missed'
            ? 'warning'
            : 'default',
    })
  }

  if (props.item.todayEntry) {
    nextBadges.push({
      label: t('planning.calendar.details.recordedToday'),
      tone: 'accent',
    })
  }

  return nextBadges
})

const details = computed(() => {
  if (props.item.kind === 'initiative') {
    return [t(`planning.today.details.section.${props.item.sectionId}`)]
  }

  const nextDetails: string[] = []
  if (props.item.measurement.target) {
    nextDetails.push(formatMeasurementTarget(props.item.measurement.target))
  }
  nextDetails.push(formatMeasurementActual(props.item))
  nextDetails.push(
    t('planning.calendar.details.entryCount', { n: props.item.measurement.entryCount })
  )
  nextDetails.push(t('planning.today.details.daysLeft', { n: daysRemaining(props.item) }))

  if (props.item.planning.successNote) {
    nextDetails.push(
      t('planning.calendar.details.successNote', { note: props.item.planning.successNote })
    )
  }

  if (props.item.sourceMonthRef && props.item.sectionId !== 'month') {
    nextDetails.push(
      t('planning.calendar.details.sourceMonth', {
        month: formatPeriodLabel(
          props.item.sourceMonthRef,
          locale.value,
          t('planning.calendar.scales.week')
        ),
      })
    )
  }

  return nextDetails
})

const numericInputLabel = computed(() => {
  if (props.item.kind !== 'measurement') {
    return ''
  }

  return t(`planning.today.actions.input.${props.item.subject.entryMode}`)
})

const parsedDraftValue = computed(() => {
  if (props.item.kind !== 'measurement' || props.item.subject.entryMode === 'completion') {
    return undefined
  }

  const trimmed = draftValue.value.trim()
  if (!trimmed) {
    return undefined
  }

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) {
    return undefined
  }

  if (props.item.subject.entryMode === 'counter') {
    if (!Number.isInteger(parsed) || parsed < 0) {
      return undefined
    }
    return parsed
  }

  return parsed
})

const showsStepper = computed(
  () => props.item.kind === 'measurement' && props.item.subject.entryMode === 'counter'
)
const inputStep = computed(() =>
  props.item.kind === 'measurement' && props.item.subject.entryMode === 'counter' ? 1 : 0.1
)
const inputMin = computed(() =>
  props.item.kind === 'measurement' && props.item.subject.entryMode === 'counter' ? 0 : undefined
)
const canMove = computed(() => Boolean(moveDayRef.value) && moveDayRef.value !== props.todayDayRef)

watch(
  () => props.item,
  () => {
    moveDayRef.value = props.todayDayRef
    draftValue.value =
      props.item.kind === 'measurement' &&
      props.item.todayEntry?.value !== null &&
      props.item.todayEntry?.value !== undefined
        ? formatMeasurementValue(props.item.todayEntry.value)
        : ''
  },
  { immediate: true, deep: true }
)

function daysRemaining(item: TodayMeasurementItem): number {
  const bounds = getPeriodBounds(item.measurement.periodRef)
  const endDate = new Date(`${bounds.end}T00:00:00Z`)
  const todayDate = new Date(`${props.todayDayRef}T00:00:00Z`)
  return Math.max(0, Math.round((endDate.getTime() - todayDate.getTime()) / 86400000))
}

function handleSaveNumeric(): void {
  if (parsedDraftValue.value === undefined) {
    return
  }

  emit('save-entry', parsedDraftValue.value)
}

function handleStep(delta: number): void {
  if (props.item.kind !== 'measurement' || props.item.subject.entryMode !== 'counter') {
    return
  }

  const currentValue = parsedDraftValue.value ?? props.item.todayEntry?.value ?? 0
  const nextValue = Math.max(0, currentValue + delta)
  draftValue.value = String(nextValue)
  emit('save-entry', nextValue)
}

function handleMove(): void {
  if (!canMove.value) {
    return
  }

  emit('move', moveDayRef.value as DayRef)
}

function formatMeasurementTarget(target: MeasurementTarget): string {
  switch (target.kind) {
    case 'count':
      return t(
        target.operator === 'min'
          ? 'planning.calendar.details.targetCountMin'
          : 'planning.calendar.details.targetCountMax',
        { n: target.value }
      )
    case 'value':
      return t('planning.calendar.details.targetRule', {
        aggregation: t(`planning.calendar.labels.aggregation.${target.aggregation}`),
        operator: formatComparisonOperator(target.operator),
        value: formatMeasurementValue(target.value),
      })
    case 'rating':
      return t('planning.calendar.details.targetRule', {
        aggregation: t('planning.calendar.labels.aggregation.average'),
        operator: formatComparisonOperator(target.operator),
        value: formatMeasurementValue(target.value),
      })
  }
}

function formatMeasurementActual(item: TodayMeasurementItem): string {
  if (item.measurement.actualValue === undefined) {
    return t('planning.calendar.details.actualNoData')
  }

  return t('planning.calendar.details.actual', {
    value: formatMeasurementValue(item.measurement.actualValue),
  })
}

function formatComparisonOperator(operator: 'gte' | 'lte'): string {
  return operator === 'gte' ? '>=' : '<='
}

function formatMeasurementValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

function badgeClasses(tone: BadgeTone): string {
  switch (tone) {
    case 'accent':
      return 'rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-strong'
    case 'success':
      return 'rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-semibold text-success'
    case 'warning':
      return 'rounded-full border border-warning/20 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning'
    case 'danger':
      return 'rounded-full border border-error/20 bg-error/10 px-3 py-1 text-xs font-semibold text-error'
    default:
      return 'rounded-full border border-outline/25 bg-section/70 px-3 py-1 text-xs font-semibold text-on-surface-variant'
  }
}
</script>
