<template>
  <article
    class="neo-card neo-raised border-primary/10 p-3 transition-shadow duration-200 hover:shadow-neu-raised-lg hover:-translate-y-px"
  >
    <div class="space-y-2">
      <!-- Row 1: Title (full row) + menu -->
      <div class="flex items-start gap-2">
        <button
          type="button"
          class="min-w-0 flex-1 text-left text-sm font-semibold text-on-surface transition-colors hover:text-primary-strong"
          @click="$emit('open-object')"
        >
          {{ title }}
        </button>
        <div ref="menuRootRef" class="relative shrink-0">
          <button
            type="button"
            class="neo-icon-button neo-focus"
            aria-label="More actions"
            @click.stop="menuOpen = !menuOpen"
          >
            <AppIcon name="more_horiz" class="text-base" />
          </button>
          <Teleport to="body">
            <div
              v-if="menuOpen"
              ref="menuDropdownRef"
              class="fixed z-50 min-w-[160px] overflow-hidden rounded-xl border border-white/40 bg-white shadow-lg"
              :style="menuStyle"
              @click.stop
            >
              <button
                type="button"
                class="block w-full px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                @click="handleMenuAction('open-context')"
              >
                {{ t('planning.today.actions.openContext') }}
              </button>
              <button
                type="button"
                class="block w-full px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                @click="handleMenuAction('open-object')"
              >
                {{ t('planning.objects.actions.open') }}
              </button>
              <template v-if="item.isScheduledToday">
                <button
                  type="button"
                  class="block w-full px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                  @click="handleMoveToDay"
                >
                  {{ t('planning.today.actions.moveToDay') }}
                </button>
                <button
                  type="button"
                  class="block w-full px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                  @click="handleMenuAction('clear-schedule')"
                >
                  {{ t('planning.today.actions.clearToday') }}
                </button>
                <button
                  type="button"
                  class="block w-full border-t border-outline/10 px-4 py-2 text-left text-xs font-medium text-error hover:bg-error/5"
                  @click="handleMenuAction('request-delete')"
                >
                  {{ t('common.buttons.delete') }}
                </button>
              </template>
              <template v-else>
                <button
                  v-if="item.canHide"
                  type="button"
                  class="block w-full px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                  @click="handleMenuAction('hide')"
                >
                  {{ t('planning.today.actions.hideForToday') }}
                </button>
              </template>
              <button
                v-if="item.kind === 'measurement' && item.todayEntry"
                type="button"
                class="block w-full border-t border-outline/10 px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                @click="handleMenuAction('clear-entry')"
              >
                {{ t('planning.today.actions.clearEntry') }}
              </button>
            </div>
          </Teleport>
        </div>
      </div>

      <!-- Row 2: Entry controls (left) + status pill + context pill + expand (right) -->
      <div class="flex items-center gap-1.5">
        <!-- Inline entry: completion -->
        <button
          v-if="item.kind === 'measurement' && item.subject.entryMode === 'completion'"
          type="button"
          class="neo-icon-button neo-focus"
          :class="item.todayEntry ? 'neo-icon-button--primary' : ''"
          :disabled="isPending"
          :title="
            item.todayEntry
              ? t('planning.today.actions.undoEntry')
              : t('planning.today.actions.recordEntry')
          "
          @click.stop="$emit('toggle-completion')"
        >
          <AppIcon v-if="item.todayEntry" name="check_circle" class="text-base" />
          <AppIcon v-else name="check_circle" class="text-base" />
        </button>

        <!-- Inline entry: counter stepper -->
        <div
          v-else-if="item.kind === 'measurement' && item.subject.entryMode === 'counter'"
          class="flex items-center gap-0.5"
        >
          <button
            type="button"
            class="neo-icon-button neo-focus text-xs"
            :disabled="isPending"
            :aria-label="t('planning.today.actions.decrease')"
            @click.stop="handleStep(-1)"
          >
            -
          </button>
          <span class="min-w-[1.75rem] text-center text-xs font-semibold tabular-nums text-on-surface">
            {{ displayValue }}
          </span>
          <button
            type="button"
            class="neo-icon-button neo-focus text-xs"
            :disabled="isPending"
            :aria-label="t('planning.today.actions.increase')"
            @click.stop="handleStep(1)"
          >
            +
          </button>
        </div>

        <!-- Inline entry: value/rating input -->
        <input
          v-else-if="
            item.kind === 'measurement' &&
            (item.subject.entryMode === 'value' || item.subject.entryMode === 'rating')
          "
          v-model="draftValue"
          type="number"
          :step="item.subject.entryMode === 'rating' ? 0.1 : 0.1"
          class="neo-input w-16 rounded-xl px-2.5 py-1 text-center text-xs"
          :placeholder="item.subject.entryMode === 'rating' ? '1-5' : '—'"
          :disabled="isPending"
          @click.stop
          @blur="handleSaveOnBlur"
          @keydown.enter.prevent="handleSaveOnBlur"
        />

        <div class="flex-1" />

        <!-- Inline progress indicator (measurements with target) -->
        <div
          v-if="item.kind === 'measurement' && item.measurement.target"
          class="flex items-center gap-1.5"
        >
          <span class="text-[10px] font-semibold tabular-nums" :class="progressTextClass">
            {{ progressLabel }}
          </span>
          <div class="h-1.5 w-10 overflow-hidden rounded-full bg-neu-border/20">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="progressBarClass"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
        </div>

        <!-- Inline actual value (measurements without target) -->
        <span
          v-else-if="item.kind === 'measurement' && !item.measurement.target"
          class="text-[10px] font-semibold tabular-nums text-on-surface-variant"
        >
          {{ formatDisplayValue(item.measurement.actualValue) }}
          · {{ item.measurement.entryCount }}x
        </span>

        <!-- Expand / collapse toggle -->
        <button
          type="button"
          class="neo-icon-button neo-focus"
          :aria-label="expanded ? 'Collapse' : 'Expand'"
          @click="expanded = !expanded"
        >
          <AppIcon v-if="expanded" name="expand_more" class="text-sm" />
          <AppIcon v-else name="chevron_right" class="text-sm" />
        </button>
      </div>
    </div>

    <!-- Expanded detail section -->
    <div
      class="transition-all duration-200 ease-in-out"
      :style="{
        maxHeight: expanded ? '10rem' : '0',
        opacity: expanded ? 1 : 0,
        overflow: expanded ? 'visible' : 'hidden',
      }"
    >
      <div class="mt-2 space-y-0.5 border-t border-neu-border/15 pt-2 text-[11px] text-on-surface-variant">
        <p v-if="item.goalTitle" class="font-medium">
          {{ t('planning.today.details.goal', { title: item.goalTitle }) }}
        </p>
        <template v-if="item.kind === 'measurement'">
          <p v-if="item.measurement.target">{{ formatTarget(item.measurement.target) }}</p>
          <p>
            {{ formatActual(item) }}
            · {{ t('planning.calendar.details.entryCount', { n: item.measurement.entryCount }) }}
            · {{ t('planning.today.details.daysLeft', { n: daysRemaining }) }}
          </p>
        </template>
        <p class="text-on-surface-variant/60">{{ contextLabel }}</p>
      </div>
    </div>

    <!-- Move to day picker (shown when triggered from menu) -->
    <input
      ref="moveDateInputRef"
      type="date"
      class="sr-only"
      @change="handleMoveDateChange"
    />
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import type { DayRef } from '@/domain/period'
import type { MeasurementTarget } from '@/domain/planning'
import { useT } from '@/composables/useT'
import type { TodayItem, TodayMeasurementItem } from '@/services/todayViewQueries'
import { getPeriodBounds } from '@/utils/periods'
import { formatPeriodLabel } from '@/utils/periodLabels'

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

const expanded = ref(false)
const menuOpen = ref(false)
const menuRootRef = ref<HTMLElement | null>(null)
const menuDropdownRef = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({})
const moveDateInputRef = ref<HTMLInputElement | null>(null)
const draftValue = ref('')

const title = computed(() =>
  props.item.kind === 'initiative' ? props.item.initiative.title : props.item.subject.title
)

const displayValue = computed(() => {
  if (props.item.kind !== 'measurement') return '—'
  return props.item.todayEntry?.value !== null && props.item.todayEntry?.value !== undefined
    ? formatMeasurementValue(props.item.todayEntry.value)
    : '0'
})

const contextLabel = computed(() =>
  formatPeriodLabel(props.item.contextPeriodRef, locale.value, t('planning.calendar.scales.week'))
)

const progressPercent = computed(() => {
  if (props.item.kind !== 'measurement' || !props.item.measurement.target) return 0
  const target = props.item.measurement.target.value
  const actual = props.item.measurement.actualValue ?? 0
  if (target <= 0) return 0
  return Math.min(100, Math.round((actual / target) * 100))
})

const progressLabel = computed(() => {
  if (props.item.kind !== 'measurement' || !props.item.measurement.target) return ''
  const actual = props.item.measurement.actualValue ?? 0
  const target = props.item.measurement.target.value
  return `${formatDisplayValue(actual)}/${formatDisplayValue(target)}`
})

const progressTextClass = computed(() => {
  if (props.item.kind !== 'measurement') return 'text-on-surface-variant'
  switch (props.item.measurement.evaluationStatus) {
    case 'met':
      return 'text-primary'
    case 'missed':
      return 'text-error'
    default:
      return 'text-on-surface-variant'
  }
})

const progressBarClass = computed(() => {
  if (props.item.kind !== 'measurement') return 'bg-neu-border/40'
  switch (props.item.measurement.evaluationStatus) {
    case 'met':
      return 'bg-primary/50'
    case 'missed':
      return 'bg-error/45'
    default:
      return 'bg-primary/30'
  }
})

const daysRemaining = computed(() => {
  if (props.item.kind !== 'measurement') return 0
  const bounds = getPeriodBounds(props.item.measurement.periodRef)
  const endDate = new Date(`${bounds.end}T00:00:00Z`)
  const todayDate = new Date(`${props.todayDayRef}T00:00:00Z`)
  return Math.max(0, Math.round((endDate.getTime() - todayDate.getTime()) / 86400000))
})

watch(
  () => props.item,
  () => {
    draftValue.value =
      props.item.kind === 'measurement' &&
      props.item.todayEntry?.value !== null &&
      props.item.todayEntry?.value !== undefined
        ? formatMeasurementValue(props.item.todayEntry.value)
        : ''
  },
  { immediate: true, deep: true }
)

watch(menuOpen, async (isOpen) => {
  if (isOpen && menuRootRef.value) {
    await nextTick()
    const rect = menuRootRef.value.getBoundingClientRect()
    menuStyle.value = {
      top: `${rect.bottom + 4}px`,
      left: `${Math.max(0, rect.right - 160)}px`,
    }
  }
})

function handleStep(delta: number): void {
  if (props.item.kind !== 'measurement' || props.item.subject.entryMode !== 'counter') return

  const currentValue = props.item.todayEntry?.value ?? 0
  const nextValue = Math.max(0, currentValue + delta)
  emit('save-entry', nextValue)
}

function handleSaveOnBlur(): void {
  const trimmed = draftValue.value.trim()
  if (!trimmed) return
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return
  emit('save-entry', parsed)
}

function handleMenuAction(action: string): void {
  menuOpen.value = false
  switch (action) {
    case 'open-object':
      emit('open-object')
      break
    case 'open-context':
      emit('open-context')
      break
    case 'clear-schedule':
      emit('clear-schedule')
      break
    case 'request-delete':
      emit('request-delete')
      break
    case 'hide':
      emit('hide')
      break
    case 'clear-entry':
      emit('clear-entry')
      break
  }
}

function handleMoveToDay(): void {
  menuOpen.value = false
  moveDateInputRef.value?.showPicker()
}

function handleMoveDateChange(event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.value && input.value !== props.todayDayRef) {
    emit('move', input.value as DayRef)
  }
}

function handleOutsideClick(event: MouseEvent): void {
  if (
    menuOpen.value &&
    menuRootRef.value &&
    !menuRootRef.value.contains(event.target as Node) &&
    menuDropdownRef.value &&
    !menuDropdownRef.value.contains(event.target as Node)
  ) {
    menuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideClick)
})

function formatTarget(target: MeasurementTarget): string {
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
        operator: target.operator === 'gte' ? '>=' : '<=',
        value: formatMeasurementValue(target.value),
      })
    case 'rating':
      return t('planning.calendar.details.targetRule', {
        aggregation: t('planning.calendar.labels.aggregation.average'),
        operator: target.operator === 'gte' ? '>=' : '<=',
        value: formatMeasurementValue(target.value),
      })
  }
}

function formatActual(item: TodayMeasurementItem): string {
  if (item.measurement.actualValue === undefined) {
    return t('planning.calendar.details.actualNoData')
  }
  return t('planning.calendar.details.actual', {
    value: formatMeasurementValue(item.measurement.actualValue),
  })
}

function formatMeasurementValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

function formatDisplayValue(value: number | undefined): string {
  if (value === undefined) return '0'
  return formatMeasurementValue(value)
}
</script>
