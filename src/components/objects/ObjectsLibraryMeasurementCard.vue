<template>
  <article
    class="neo-card neo-raised border-primary/10 bg-gradient-to-br from-primary-soft/50 via-white/75 to-section/45 p-3"
  >
    <div class="space-y-2">
      <!-- Row 1: Icon + Title -->
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
          :value="item.title"
          type="text"
          class="neo-input min-w-0 flex-1 px-2.5 py-1.5 text-sm font-semibold"
          :placeholder="t('planning.objects.form.title')"
          @input="handleTitleInput"
        />
      </div>

      <!-- Row 2: Links icon + Description -->
      <div class="flex items-center gap-2">
        <GoalLinksDropdown
          icon-only
          :priority-ids="item.priorityIds ?? []"
          :life-area-ids="item.lifeAreaIds ?? []"
          :priority-options="priorityOptions"
          :life-area-options="lifeAreaOptions"
          @toggle-priority="emitFieldChange('togglePriority', $event)"
          @toggle-life-area="emitFieldChange('toggleLifeArea', $event)"
        />
        <input
          :value="item.description ?? ''"
          type="text"
          class="neo-input min-w-0 flex-1 px-2.5 py-1.5 text-xs"
          :placeholder="t('planning.objects.form.description')"
          @input="handleDescriptionInput"
        />
      </div>

      <!-- Row 3: Summary pills (left) + Status icon + menu + expand (right) -->
      <div class="flex items-center gap-1.5">
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
            {{ describeTargetSummary(item.target) }}
          </span>
        </div>

        <div class="ml-auto flex items-center gap-1.5">
          <StatusIconButton
            :model-value="item.status"
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
      </div>

      <!-- Expanded section -->
      <div
        class="transition-all duration-200 ease-in-out"
        :style="{ maxHeight: isExpanded ? '500px' : '0', opacity: isExpanded ? 1 : 0, overflow: isExpanded ? 'visible' : 'hidden' }"
      >
        <div class="space-y-3 pt-1">
          <!-- Cadence + Type (entryMode) -->
          <div class="grid grid-cols-2 gap-3">
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
                  class="absolute left-0 top-7 z-20 max-h-[180px] min-w-[140px] overflow-y-auto rounded-xl border border-white/40 bg-white shadow-lg"
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
                    :value="item.target.value"
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
      <MeasurementSparkline
        v-if="item.chartData"
        :points="item.chartData"
        :cadence="item.cadence ?? 'weekly'"
        :entry-mode="item.entryMode ?? 'completion'"
        :color-theme="item.panelType === 'habit' ? 'habit' : item.panelType === 'tracker' ? 'tracker' : 'keyResult'"
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
import { describeTargetSummary } from '@/services/objectsLibraryQueries'
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

const titleRef = ref<HTMLInputElement | null>(null)
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
let descriptionDebounceTimer: ReturnType<typeof setTimeout> | undefined
let targetValueDebounceTimer: ReturnType<typeof setTimeout> | undefined

const cadenceLabel = computed(() => {
  const opt = props.cadenceOptions.find((o) => o.value === props.item.cadence)
  return opt?.label ?? props.item.cadence ?? ''
})

const entryModeLabel = computed(() => {
  const opt = props.entryModeOptions.find((o) => o.value === props.item.entryMode)
  return opt?.label ?? props.item.entryMode ?? ''
})

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

function handleTitleInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  clearTimeout(titleDebounceTimer)
  titleDebounceTimer = setTimeout(() => {
    emitFieldChange('title', value)
  }, 400)
}

function handleDescriptionInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  clearTimeout(descriptionDebounceTimer)
  descriptionDebounceTimer = setTimeout(() => {
    emitFieldChange('description', value)
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
  clearTimeout(titleDebounceTimer)
  clearTimeout(descriptionDebounceTimer)
  clearTimeout(targetValueDebounceTimer)
})
</script>
