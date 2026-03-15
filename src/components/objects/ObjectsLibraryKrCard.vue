<template>
  <div class="neo-surface rounded-lg">
    <div class="space-y-2 p-2.5">
      <!-- Row 1: Title -->
      <div class="flex items-center gap-2">
        <input
          :value="child.title"
          type="text"
          class="neo-input min-w-0 flex-1 px-2.5 py-1.5 text-xs font-medium"
          :placeholder="t('planning.objects.form.title')"
          @input="handleTitleInput"
        />
      </div>

      <!-- Row 2: Summary pills (left) + Status icon + menu + expand (right) -->
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
            {{ child.targetSummary }}
          </span>
        </div>
        <div v-else class="flex-1" />

        <div class="ml-auto flex items-center gap-1.5">
          <StatusIconButton
            :model-value="child.status"
            :options="statusOptions"
            @update:model-value="emitFieldChange('status', $event)"
          />
          <button
            type="button"
            class="neo-icon-button neo-focus"
            :aria-label="isExpanded ? t('planning.objects.actions.hideDetails') : t('planning.objects.actions.showDetails')"
            @click="$emit('toggle-expand')"
          >
            <AppIcon v-if="isExpanded" name="expand_less" class="text-base" />
            <AppIcon v-else name="expand_more" class="text-base" />
          </button>
          <div ref="menuRef" class="relative">
            <button
              type="button"
              class="neo-icon-button neo-focus"
              aria-label="More actions"
              @click.stop="menuOpen = !menuOpen"
            >
              <AppIcon name="more_horiz" class="text-base" />
            </button>
            <div
              v-if="menuOpen"
              class="absolute bottom-full right-0 z-20 mb-1 min-w-[130px] overflow-hidden rounded-xl border border-white/40 bg-white shadow-lg"
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
      </div>

      <!-- Expanded section -->
      <div
        class="transition-all duration-200 ease-in-out"
        :style="{ maxHeight: isExpanded ? '500px' : '0', opacity: isExpanded ? 1 : 0, overflow: isExpanded ? 'visible' : 'hidden' }"
      >
        <div class="space-y-3 pt-1">
          <!-- Cadence + Type dropdowns -->
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {{ t('planning.objects.form.cadence') }}
              </div>
              <KrPillDropdown
                :model-value="child.cadence"
                :options="cadenceOptions"
                @update:model-value="emitFieldChange('cadence', $event)"
              />
            </div>
            <div class="space-y-1">
              <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {{ t('planning.objects.form.entryMode') }}
              </div>
              <KrPillDropdown
                :model-value="child.entryMode"
                :options="entryModeOptions"
                @update:model-value="emitFieldChange('entryMode', $event)"
              />
            </div>
          </div>

          <!-- Periods + Target -->
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
                  class="absolute left-0 top-7 z-20 max-h-[180px] min-w-[140px] overflow-y-auto rounded-xl border border-white/40 bg-white shadow-lg"
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
              <div class="space-y-1.5">
                <!-- Aggregation (only for value/rating) -->
                <div v-if="showTargetAggregation" class="flex items-center gap-2">
                  <span class="text-[8px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70">
                    {{ t('planning.objects.form.targetAggregation') }}
                  </span>
                  <KrPillDropdown
                    :model-value="child.target.kind === 'value' || child.target.kind === 'rating' ? (child.target as any).aggregation : 'sum'"
                    :options="targetAggregationOptions"
                    @update:model-value="emitFieldChange('target.aggregation', $event)"
                  />
                </div>

                <!-- Operator -->
                <div class="flex items-center gap-2">
                  <span class="text-[8px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70">
                    {{ t('planning.objects.form.targetOperator') }}
                  </span>
                  <KrPillDropdown
                    :model-value="child.target.operator"
                    :options="targetOperatorOptions"
                    @update:model-value="emitFieldChange('target.operator', $event)"
                  />
                </div>

                <!-- Value -->
                <div class="flex items-center gap-2">
                  <span class="text-[8px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70">
                    {{ t('planning.objects.form.targetValue') }}
                  </span>
                  <input
                    :value="child.target.value"
                    type="number"
                    step="any"
                    class="neo-input w-16 px-2 py-1 text-xs"
                    @input="handleTargetValueInput"
                  />
                </div>
              </div>
            </div>
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
import KrPillDropdown from '@/components/objects/KrPillDropdown.vue'
import StatusIconButton from '@/components/objects/StatusIconButton.vue'
import MeasurementSparkline from '@/components/objects/MeasurementSparkline.vue'
import type { ObjectsLibraryChildPreview } from '@/services/objectsLibraryQueries'
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

let titleDebounceTimer: ReturnType<typeof setTimeout> | undefined
let targetValueDebounceTimer: ReturnType<typeof setTimeout> | undefined

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

function emitFieldChange(field: string, value: unknown): void {
  emit('field-change', field, value)
}

function handleTitleInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  clearTimeout(titleDebounceTimer)
  titleDebounceTimer = setTimeout(() => {
    emitFieldChange('title', value)
  }, 400)
}

function handleTargetValueInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  const value = Number(raw)
  if (!Number.isFinite(value)) return
  clearTimeout(targetValueDebounceTimer)
  targetValueDebounceTimer = setTimeout(() => {
    emitFieldChange('target.value', value)
  }, 400)
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
  clearTimeout(titleDebounceTimer)
  clearTimeout(targetValueDebounceTimer)
})
</script>
