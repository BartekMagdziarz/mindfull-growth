<template>
  <article
    class="group/card neo-card neo-raised border-neu-border/30 bg-gradient-to-br from-neu-top to-neu-bottom p-3"
  >
    <div class="space-y-2">
      <!-- Row 1: Icon + Title + [hover: expand, menu] + Status -->
      <div class="flex items-center gap-2">
        <IconPicker
          icon-size="lg"
          :model-value="item.icon"
          compact
          minimal
          :allow-clear="true"
          :aria-label="panelType === 'habit' ? 'Habit icon' : 'Tracker icon'"
          @update:model-value="emitFieldChange('icon', $event)"
        />
        <input
          ref="titleRef"
          v-model="title"
          type="text"
          class="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm font-semibold text-on-surface outline-none placeholder:text-on-surface-variant/40"
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
                {{ item.isActive ? t('planning.objects.actions.archive') : t('planning.objects.actions.unarchive') }}
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
          :model-value="item.status"
          :options="statusOptions"
          @update:model-value="emitFieldChange('status', $event)"
        />
      </div>

      <!-- Row 2: Links + Summary pills -->
      <div class="flex items-center gap-1.5">
        <GoalLinksDropdown
          icon-only
          :priority-ids="item.priorityIds ?? []"
          :life-area-ids="item.lifeAreaIds ?? []"
          :priority-options="priorityOptions"
          :life-area-options="lifeAreaOptions"
          @toggle-priority="emitFieldChange('togglePriority', $event)"
          @toggle-life-area="emitFieldChange('toggleLifeArea', $event)"
        />
        <div
          class="flex flex-1 flex-wrap gap-1.5 py-0.5 transition-all duration-200 ease-in-out"
          :style="{ maxHeight: isExpanded ? '0' : '2.5rem', opacity: isExpanded ? 0 : 1, overflow: isExpanded ? 'hidden' : 'visible' }"
        >
          <span class="neo-pill px-2 py-0.5 text-[10px] font-semibold">
            {{ cadenceLabel }}
          </span>
          <span class="neo-pill px-2 py-0.5 text-[10px] font-semibold">
            {{ entryModeLabel }}
          </span>
          <span
            v-if="panelType === 'habit' && item.target"
            class="neo-pill px-2 py-0.5 text-[10px] font-semibold"
          >
            {{ formatMeasurementTargetSummary(item.target, t) }}
          </span>
        </div>
      </div>

      <!-- Expanded section -->
      <div
        class="transition-all duration-200 ease-in-out"
        :style="{ maxHeight: isExpanded ? '700px' : '0', opacity: isExpanded ? 1 : 0, overflow: isExpanded ? 'visible' : 'hidden' }"
      >
        <div class="space-y-3 pt-1">
          <!-- Cadence + Type (entryMode) + Rating Scale -->
          <div class="grid gap-3" :class="item.entryMode === 'rating' ? 'grid-cols-3' : 'grid-cols-2'">
            <div class="space-y-1">
              <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {{ t('planning.objects.form.cadence') }}
              </div>
              <KrPillDropdown
                :model-value="item.cadence ?? 'weekly'"
                :options="cadenceOptions"
                @update:model-value="emitFieldChange('cadence', $event)"
              />
            </div>
            <div class="space-y-1">
              <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {{ t('planning.objects.form.entryMode') }}
              </div>
              <KrPillDropdown
                :model-value="item.entryMode ?? 'completion'"
                :options="entryModeOptions"
                @update:model-value="emitFieldChange('entryMode', $event)"
              />
            </div>
            <div v-if="item.entryMode === 'rating'" class="space-y-1">
              <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {{ t('planning.objects.form.ratingScale') }}
              </div>
              <div class="flex items-center gap-1.5">
                <label class="text-[9px] text-on-surface-variant/70">{{ t('planning.objects.form.ratingScaleMin') }}</label>
                <input
                  :value="item.ratingScaleMin ?? 1"
                  type="number"
                  step="1"
                  min="0"
                  class="neo-input w-12 px-1.5 py-1 text-center text-xs"
                  @change="handleScaleMinChange"
                />
                <label class="text-[9px] text-on-surface-variant/70">{{ t('planning.objects.form.ratingScaleMax') }}</label>
                <input
                  :value="item.ratingScale ?? 10"
                  type="number"
                  step="1"
                  min="1"
                  class="neo-input w-12 px-1.5 py-1 text-center text-xs"
                  @change="handleScaleMaxChange"
                />
              </div>
            </div>
          </div>

          <!-- Periods + Target -->
          <div class="grid gap-3" :class="panelType === 'habit' ? 'grid-cols-2' : 'grid-cols-1'">
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
                    :class="period.linked ? 'cursor-default text-primary/50' : 'text-on-surface hover:bg-primary-soft/30'"
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
                      @click.stop="$emit('unlink-period', item.id, period.periodRef)"
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

            <!-- Target (habits only) -->
            <div v-if="panelType === 'habit' && item.target" class="space-y-1">
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
                    :model-value="targetAggregationValue"
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
                    :model-value="item.target.operator"
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
                    ref="targetValueRef"
                    v-model="targetValue"
                    type="number"
                    step="any"
                    class="neo-input w-16 px-2 py-1 text-xs"
                    @blur="flushTargetValue"
                  />
                </div>
              </div>
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
      <MeasurementSparkline
        v-if="item.chartData"
        :points="item.chartData"
        :cadence="item.cadence ?? 'weekly'"
        :entry-mode="item.entryMode ?? 'completion'"
      />

    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import IconPicker from '@/components/shared/IconPicker.vue'
import KrPillDropdown from '@/components/objects/KrPillDropdown.vue'
import GoalLinksDropdown from '@/components/objects/GoalLinksDropdown.vue'
import StatusIconButton from '@/components/objects/StatusIconButton.vue'
import MeasurementSparkline from '@/components/objects/MeasurementSparkline.vue'
import { useEditableField } from '@/composables/useEditableField'
import { formatMeasurementTargetSummary } from '@/utils/measurementTargetFormat'
import type { ObjectsLibraryFilterOption, ObjectsLibraryListItem } from '@/services/objectsLibraryQueries'
import type { MonthRef, WeekRef } from '@/domain/period'
import { getNextPeriod, getPeriodRefsForDate, getPreviousPeriod } from '@/utils/periods'
import type { LinkedPeriod } from '@/components/objects/ObjectsLibraryKrCard.vue'

const props = defineProps<{
  item: ObjectsLibraryListItem
  panelType: 'habit' | 'tracker'
  isExpanded: boolean
  isNew?: boolean
  linkedPeriods: LinkedPeriod[]
  cadenceOptions: Array<{ value: string; label: string }>
  entryModeOptions: Array<{ value: string; label: string }>
  statusOptions: Array<{ value: string; label: string }>
  priorityOptions: ObjectsLibraryFilterOption[]
  lifeAreaOptions: ObjectsLibraryFilterOption[]
}>()

const emit = defineEmits<{
  'toggle-expand': []
  'field-change': [id: string, field: string, value: unknown]
  'link-period': [id: string, periodRef: string]
  'unlink-period': [id: string, periodRef: string]
  archive: [id: string, isCurrentlyActive: boolean]
  delete: [id: string, title: string]
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

const { value: title, inputRef: titleRef, flush: flushTitle } = useEditableField({
  source: () => props.item.title,
  commit: (value) => emitFieldChange('title', value),
  delay: 400,
})

const { value: description, inputRef: descriptionRef, flush: flushDescription } = useEditableField({
  source: () => props.item.description,
  commit: (value) => emitFieldChange('description', value),
  delay: 400,
})

const { value: targetValue, inputRef: targetValueRef, flush: flushTargetValue } = useEditableField<number | undefined, string>({
  source: () => props.item.target?.value,
  format: (v) => (v == null ? '' : String(v)),
  commit: (raw) => {
    const num = Number(raw)
    if (!Number.isFinite(num)) return
    emitFieldChange('target.value', num)
  },
  delay: 400,
})

const cadenceLabel = computed(() => {
  const opt = props.cadenceOptions.find((o) => o.value === props.item.cadence)
  return opt?.label ?? props.item.cadence ?? ''
})

const entryModeLabel = computed(() => {
  const opt = props.entryModeOptions.find((o) => o.value === props.item.entryMode)
  return opt?.label ?? props.item.entryMode ?? ''
})

const MAX_SCALE_SPAN = 10

function handleScaleMinChange(event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  const parsed = Math.round(Number(raw))
  if (!Number.isFinite(parsed) || parsed < 0) return
  const currentMax = props.item.ratingScale ?? 10
  const clampedMax = Math.max(currentMax, parsed + 1)
  const finalMax = parsed + MAX_SCALE_SPAN - 1 < clampedMax ? parsed + MAX_SCALE_SPAN - 1 : clampedMax
  emitFieldChange('ratingScaleMin', parsed)
  if (finalMax !== currentMax) {
    emitFieldChange('ratingScale', finalMax)
  }
}

function handleScaleMaxChange(event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  const parsed = Math.round(Number(raw))
  if (!Number.isFinite(parsed) || parsed < 1) return
  const currentMin = props.item.ratingScaleMin ?? 1
  const clampedMin = Math.min(currentMin, parsed - 1)
  const finalMin = parsed - MAX_SCALE_SPAN + 1 > clampedMin ? parsed - MAX_SCALE_SPAN + 1 : clampedMin
  emitFieldChange('ratingScale', parsed)
  if (finalMin !== currentMin) {
    emitFieldChange('ratingScaleMin', finalMin)
  }
}

const showTargetAggregation = computed(() => {
  return props.item.entryMode === 'value' || props.item.entryMode === 'rating'
})

const targetOperatorOptions = computed(() => {
  if (props.item.entryMode === 'completion' || props.item.entryMode === 'counter') {
    return [
      { value: 'min', label: t('planning.objects.targetOperators.min') },
      { value: 'max', label: t('planning.objects.targetOperators.max') },
    ]
  }
  return [
    { value: 'gte', label: t('planning.objects.targetOperators.gte') },
    { value: 'lte', label: t('planning.objects.targetOperators.lte') },
  ]
})

const targetAggregationOptions = computed(() => {
  if (props.item.entryMode === 'rating') {
    return [{ value: 'average', label: t('planning.objects.targetAggregations.average') }]
  }
  return [
    { value: 'sum', label: t('planning.objects.targetAggregations.sum') },
    { value: 'average', label: t('planning.objects.targetAggregations.average') },
    { value: 'last', label: t('planning.objects.targetAggregations.last') },
  ]
})

const targetAggregationValue = computed(() => {
  const target = props.item.target
  if (!target) return 'sum'
  if (target.kind === 'value' || target.kind === 'rating') return target.aggregation
  return 'sum'
})

const linkedPeriodRefs = computed(() => new Set(props.linkedPeriods.map((p) => p.periodRef)))

const availablePeriods = computed(() => {
  const now = new Date()
  const refs = getPeriodRefsForDate(now)
  const isWeekly = props.item.cadence !== 'monthly'
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
      label: isWeekly
        ? formatWeekShort(ref as WeekRef)
        : formatMonthShort(ref as MonthRef, locale.value),
      linked: linkedPeriodRefs.value.has(ref),
    })
    ref = getNextPeriod(ref as any) as string
  }

  return periods
})

function formatWeekShort(weekRef: WeekRef): string {
  const week = weekRef.slice(6)
  const year = weekRef.slice(2, 4)
  return `W${week}-${year}`
}

function formatMonthShort(monthRef: MonthRef, loc: string): string {
  const monthIndex = Number(monthRef.slice(5, 7)) - 1
  const year = monthRef.slice(2, 4)
  const monthName = new Intl.DateTimeFormat(loc, { month: 'short' }).format(
    new Date(Number(monthRef.slice(0, 4)), monthIndex, 1),
  )
  return `${monthName} ${year}`
}

function emitFieldChange(field: string, value: unknown): void {
  emit('field-change', props.item.id, field, value)
}

watch(periodPickerOpen, async (isOpen) => {
  if (!isOpen) {
    pastBatchCount.value = 1
    return
  }
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
  emit('link-period', props.item.id, periodRef)
}

function handleArchive(): void {
  menuOpen.value = false
  emit('archive', props.item.id, props.item.isActive)
}

function handleDelete(): void {
  menuOpen.value = false
  emit('delete', props.item.id, props.item.title)
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

watch(
  () => props.isNew,
  (isNew) => {
    if (isNew) {
      void nextTick(() => {
        titleRef.value?.focus()
      })
    }
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideClick)
})
</script>
