<template>
  <div class="group/card neo-surface rounded-lg">
    <div class="space-y-2 p-2.5">
      <!-- Row 1: Title + [hover: expand, menu] + Status -->
      <div class="flex items-center gap-2">
        <input
          ref="titleRef"
          v-model="title"
          type="text"
          class="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-xs font-medium text-on-surface outline-none placeholder:text-on-surface-variant/40"
          :placeholder="t('planning.objects.form.title')"
          @blur="flushTitle"
        />
        <div class="-mr-[76px] flex shrink-0 items-center gap-1.5 opacity-0 transition-all duration-200 ease-in-out group-hover/card:mr-0 group-hover/card:opacity-100">
          <button
            type="button"
            class="neo-icon-button neo-focus shrink-0"
            :aria-label="isExpanded ? t('planning.objects.actions.hideDetails') : t('planning.objects.actions.showDetails')"
            @click="$emit('toggle-expand')"
          >
            <AppIcon v-if="isExpanded" name="expand_less" class="text-base" />
            <AppIcon v-else name="expand_more" class="text-base" />
          </button>
          <div ref="menuRef" class="relative">
            <button
              type="button"
              class="neo-icon-button neo-focus shrink-0"
              aria-label="More actions"
              @click.stop="menuOpen = !menuOpen"
            >
              <AppIcon name="more_horiz" class="text-base" />
            </button>
            <div
              v-if="menuOpen"
              class="absolute bottom-full right-0 z-20 mb-1 min-w-[130px] overflow-hidden rounded-xl border border-outline/30 bg-surface shadow-lg"
              @click.stop
            >
              <button
                type="button"
                class="block w-full px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                @click="handleArchive"
              >
                {{ child.isActive ? t('planning.objects.actions.archive') : t('planning.objects.actions.unarchive') }}
              </button>
              <button
                type="button"
                class="block w-full px-4 py-2 text-left text-xs font-medium text-danger hover:bg-danger/5"
                @click="handleDelete"
              >
                {{ t('common.buttons.delete') }}
              </button>
            </div>
          </div>
        </div>
        <StatusIconButton
          :model-value="child.status"
          :options="statusOptions"
          @update:model-value="emitFieldChange('status', $event)"
        />
      </div>

      <!-- Row 2: Summary pills -->
      <div class="flex items-center gap-1.5">
        <div
          v-if="!isExpanded"
          class="flex flex-1 flex-wrap gap-1.5"
        >
          <span class="neo-pill px-2 py-0.5 text-[10px] font-semibold">
            {{ cadenceLabel }}
          </span>
          <span class="neo-pill px-2 py-0.5 text-[10px] font-semibold">
            {{ entryModeLabel }}
          </span>
          <span class="neo-pill px-2 py-0.5 text-[10px] font-semibold">
            {{ formatMeasurementTargetSummary(child.target, t) }}
          </span>
        </div>
      </div>

      <!-- Expanded section -->
      <div
        class="transition-all duration-200 ease-in-out"
        :style="{ maxHeight: isExpanded ? '700px' : '0', opacity: isExpanded ? 1 : 0, overflow: isExpanded ? 'visible' : 'hidden' }"
      >
        <div class="space-y-3 pt-1">
          <!-- Periods + Target (cadence + mode live in the sentence) -->
          <div class="grid grid-cols-2 gap-3">
            <!-- Periods -->
            <div class="space-y-1">
              <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {{ t('planning.objects.form.periods') }}
              </div>
              <div
                ref="periodsAreaRef"
                class="group relative min-h-[60px] rounded-lg border border-white/40 bg-white/30 p-1.5"
              >
                <!-- (+) button on hover -->
                <button
                  type="button"
                  class="absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white/50 bg-white/80 text-on-surface-variant opacity-0 shadow-sm transition-opacity duration-150 hover:bg-primary-soft hover:text-primary group-hover:opacity-100"
                  @click.stop="periodPickerOpen = !periodPickerOpen"
                >
                  <AppIcon name="add" class="text-xs" />
                </button>

                <!-- Period picker dropdown -->
                <div
                  v-if="periodPickerOpen"
                  ref="periodPickerRef"
                  class="absolute left-0 top-7 z-20 max-h-[180px] min-w-[140px] overflow-y-auto rounded-xl border border-outline/30 bg-surface shadow-lg"
                  @click.stop
                  @scroll="onPickerScroll"
                >
                  <button
                    v-for="period in availablePeriods"
                    :key="period.ref"
                    type="button"
                    class="block w-full px-3 py-1.5 text-left text-[11px] font-medium"
                    :class="period.linked ? 'text-primary/50 cursor-default' : 'text-on-surface hover:bg-primary-soft/30'"
                    :disabled="period.linked"
                    @click="handleLinkPeriod(period.ref)"
                  >
                    {{ period.label }}
                  </button>
                </div>

                <!-- Linked period pills -->
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="period in linkedPeriods"
                    :key="period.periodRef"
                    class="inline-flex items-center gap-0.5 rounded-full border border-white/55 bg-white/45 px-2 py-0.5 text-[10px] font-medium text-on-surface-variant"
                  >
                    {{ period.displayLabel }}
                    <button
                      type="button"
                      class="ml-0.5 flex h-3 w-3 items-center justify-center rounded-full hover:bg-danger/10 hover:text-danger"
                      @click.stop="$emit('unlink-period', period.periodRef)"
                    >
                      <AppIcon name="close" class="text-xs" />
                    </button>
                  </span>
                  <span
                    v-if="linkedPeriods.length === 0"
                    class="py-1 text-[10px] italic text-on-surface-variant/50"
                  >
                    {{ t('planning.objects.form.noneSelected') }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Target -->
            <div class="space-y-1">
              <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {{ t('planning.objects.form.target') }}
              </div>
              <MeasurementTargetSentence
                :entry-mode="child.entryMode ?? 'completion'"
                :target="child.target"
                :cadence="child.cadence === 'monthly' ? 'monthly' : 'weekly'"
                show-cadence
                @update:measurement="onTargetMeasurement"
                @update:cadence="onCadence"
              />
            </div>
          </div>

          <!-- Completion rules -->
          <div class="space-y-1">
            <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              {{ t('planning.objects.form.completionRules') }}
            </div>
            <textarea
              ref="descriptionRef"
              v-model="description"
              class="neo-input min-h-[2.5rem] w-full resize-y px-2 py-1 text-xs"
              :placeholder="t('planning.objects.form.completionRulesPlaceholder')"
              @blur="flushDescription"
            />
          </div>
        </div>
      </div>

      <!-- Chart -->
      <MeasurementSparkline :points="child.chartData" :cadence="child.cadence" :entry-mode="child.entryMode" />

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import MeasurementTargetSentence from '@/components/objects/MeasurementTargetSentence.vue'
import StatusIconButton from '@/components/objects/StatusIconButton.vue'
import MeasurementSparkline from '@/components/objects/MeasurementSparkline.vue'
import { useEditableField } from '@/composables/useEditableField'
import { formatMeasurementTargetSummary } from '@/utils/measurementTargetFormat'
import type { ObjectsLibraryChildPreview } from '@/services/objectsLibraryQueries'
import type { MeasurementEntryMode, MeasurementTarget, PlanningCadence } from '@/domain/planning'
import type { MonthRef, WeekRef } from '@/domain/period'
import {
  getChildPeriods,
  getNextPeriod,
  getPeriodRefsForDate,
  getPreviousPeriod,
} from '@/utils/periods'

export interface LinkedPeriod {
  periodRef: string
  displayLabel: string
}

const props = defineProps<{
  child: ObjectsLibraryChildPreview
  parentGoalId: string
  isExpanded: boolean
  linkedPeriods: LinkedPeriod[]
  goalLinkedMonthRefs: string[]
  cadenceOptions: Array<{ value: string; label: string }>
  entryModeOptions: Array<{ value: string; label: string }>
  statusOptions: Array<{ value: string; label: string }>
  targetOperatorOptions: Array<{ value: string; label: string }>
  targetAggregationOptions: Array<{ value: string; label: string }>
  showTargetAggregation: boolean
}>()

const emit = defineEmits<{
  'toggle-expand': []
  'field-change': [field: string, value: unknown]
  'link-period': [periodRef: string]
  'unlink-period': [periodRef: string]
  delete: []
  archive: []
}>()

const { t, locale } = useT()

const menuRef = ref<HTMLElement | null>(null)
const periodsAreaRef = ref<HTMLElement | null>(null)
const periodPickerRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const periodPickerOpen = ref(false)
const pastBatchCount = ref(1)
const isLoadingPast = ref(false)

const BATCH_SIZE = 4
const FUTURE_COUNT = 7

function emitFieldChange(field: string, value: unknown): void {
  emit('field-change', field, value)
}

const { value: title, inputRef: titleRef, flush: flushTitle } = useEditableField({
  source: () => props.child.title,
  commit: (value) => emitFieldChange('title', value),
  delay: 400,
})

const { value: description, inputRef: descriptionRef, flush: flushDescription } = useEditableField({
  source: () => props.child.description,
  commit: (value) => emitFieldChange('description', value),
  delay: 400,
})

// Map the sentence's {entryMode, target} update to granular field-change autosave.
function onCadence(value: PlanningCadence): void {
  emitFieldChange('cadence', value)
}

function onTargetMeasurement(measurement: {
  entryMode: MeasurementEntryMode
  target: MeasurementTarget
}): void {
  // Mode change: emit entryMode alone — the store rebuilds the matching target.
  if (measurement.entryMode !== (props.child.entryMode ?? 'completion')) {
    emitFieldChange('entryMode', measurement.entryMode)
    return
  }
  const current = props.child.target
  const next = measurement.target
  if (next.operator !== current.operator) emitFieldChange('target.operator', next.operator)
  const nextAggregation = 'aggregation' in next ? next.aggregation : undefined
  const currentAggregation = 'aggregation' in current ? current.aggregation : undefined
  if (nextAggregation !== undefined && nextAggregation !== currentAggregation) {
    emitFieldChange('target.aggregation', nextAggregation)
  }
  if (next.value !== current.value) emitFieldChange('target.value', next.value)
}

const cadenceLabel = computed(() => {
  const opt = props.cadenceOptions.find((o) => o.value === props.child.cadence)
  return opt?.label ?? props.child.cadence
})

const entryModeLabel = computed(() => {
  const opt = props.entryModeOptions.find((o) => o.value === props.child.entryMode)
  return opt?.label ?? props.child.entryMode
})

const linkedPeriodRefs = computed(() => new Set(props.linkedPeriods.map((p) => p.periodRef)))

const availablePeriods = computed(() => {
  const isWeekly = props.child.cadence === 'weekly'
  const goalMonthRefs = props.goalLinkedMonthRefs

  // If the parent goal has linked months, constrain periods to those months
  if (goalMonthRefs.length > 0) {
    const goalMonthSet = new Set(goalMonthRefs)

    if (isWeekly) {
      // Show weeks that overlap with any of the goal's linked months
      const weekSet = new Set<string>()
      for (const monthRef of goalMonthRefs) {
        const weeks = getChildPeriods(monthRef as MonthRef)
        for (const week of weeks) {
          weekSet.add(week)
        }
      }
      return [...weekSet]
        .sort()
        .map((ref) => ({
          ref,
          label: formatWeekShort(ref as WeekRef),
          linked: linkedPeriodRefs.value.has(ref),
        }))
    } else {
      // Show only months that are in the goal's linked months
      return [...goalMonthSet]
        .sort()
        .map((ref) => ({
          ref,
          label: formatMonthShort(ref as MonthRef, locale.value),
          linked: linkedPeriodRefs.value.has(ref),
        }))
    }
  }

  // No goal months constraint — fallback: sliding window with lazy past loading
  const now = new Date()
  const refs = getPeriodRefsForDate(now)
  const currentRef = (isWeekly ? refs.week : refs.month) as string
  const pastCount = pastBatchCount.value * BATCH_SIZE

  let ref = currentRef
  for (let i = 0; i < pastCount; i++) {
    ref = getPreviousPeriod(ref as any) as string
  }

  const periods: Array<{ ref: string; label: string; linked: boolean }> = []
  for (let i = 0; i < pastCount + 1 + FUTURE_COUNT; i++) {
    periods.push({
      ref,
      label: isWeekly ? formatWeekShort(ref as WeekRef) : formatMonthShort(ref as MonthRef, locale.value),
      linked: linkedPeriodRefs.value.has(ref),
    })
    ref = getNextPeriod(ref as any) as string
  }

  return periods
})

function formatWeekShort(weekRef: WeekRef): string {
  // "2026-W10" → "W10-26"
  const week = weekRef.slice(6) // "10"
  const year = weekRef.slice(2, 4) // "26"
  return `W${week}-${year}`
}

function formatMonthShort(monthRef: MonthRef, loc: string): string {
  // "2026-03" → "Mar 26"
  const monthIndex = Number(monthRef.slice(5, 7)) - 1
  const year = monthRef.slice(2, 4)
  const monthName = new Intl.DateTimeFormat(loc, { month: 'short' }).format(
    new Date(Number(monthRef.slice(0, 4)), monthIndex, 1),
  )
  return `${monthName} ${year}`
}

watch(periodPickerOpen, async (isOpen) => {
  if (!isOpen) {
    pastBatchCount.value = 1
    return
  }
  // Only scroll to current in the unconstrained fallback path
  if (props.goalLinkedMonthRefs.length > 0) return
  pastBatchCount.value = 1
  await nextTick()
  if (periodPickerRef.value) {
    const items = periodPickerRef.value.querySelectorAll('button')
    const currentEl = items[BATCH_SIZE] as HTMLElement | undefined
    if (currentEl) {
      periodPickerRef.value.scrollTop = currentEl.offsetTop
    }
  }
})

async function onPickerScroll(e: Event): Promise<void> {
  if (props.goalLinkedMonthRefs.length > 0) return
  const el = e.target as HTMLElement
  if (el.scrollTop > 20 || isLoadingPast.value) return
  isLoadingPast.value = true
  const prevScrollHeight = el.scrollHeight
  pastBatchCount.value++
  await nextTick()
  el.scrollTop = el.scrollHeight - prevScrollHeight
  isLoadingPast.value = false
}

function handleLinkPeriod(periodRef: string): void {
  periodPickerOpen.value = false
  emit('link-period', periodRef)
}

function handleArchive(): void {
  menuOpen.value = false
  emit('archive')
}

function handleDelete(): void {
  menuOpen.value = false
  emit('delete')
}

function handleOutsideClick(event: MouseEvent): void {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    menuOpen.value = false
  }
  if (
    periodPickerOpen.value &&
    periodsAreaRef.value &&
    !periodsAreaRef.value.contains(event.target as Node)
  ) {
    periodPickerOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideClick)
})
</script>
