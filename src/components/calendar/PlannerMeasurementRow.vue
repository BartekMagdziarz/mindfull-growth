<template>
  <article
    class="rounded-[1.15rem] border transition-all duration-200"
    :class="cardClass"
  >
    <div class="flex flex-wrap items-center gap-2.5 px-3 py-2.5">
      <button
        type="button"
        class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none disabled:opacity-40"
        :class="row.isActive ? 'bg-primary' : 'bg-outline/30'"
        :aria-label="row.isActive ? t('planning.calendar.planner.deactivate') : t('planning.calendar.planner.activate')"
        @click="$emit('toggle')"
      >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
          :class="row.isActive ? 'translate-x-[18px]' : 'translate-x-0.5'"
        />
      </button>

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-1.5">
          <p class="min-w-0 truncate text-sm font-semibold text-on-surface">
            {{ row.title }}
          </p>
          <span class="neo-pill px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
            {{ row.contextLabel }}
          </span>
          <span
            v-if="row.placementSummary"
            class="neo-pill px-2 py-0.5 text-[10px] font-semibold"
            :class="row.placementStatus === 'planned' ? 'neo-pill--success' : 'neo-pill--warning'"
          >
            {{ row.placementSummary }}
          </span>
        </div>
      </div>

      <div class="ml-auto flex flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          class="neo-pill px-3 py-1 text-[11px] font-semibold neo-focus"
          :class="wholeChipClass"
          :disabled="!row.isActive"
          @click="$emit('applyWholePeriod')"
        >
          {{ wholeLabel }}
        </button>

        <button
          v-if="showWeekPicker"
          type="button"
          class="neo-pill px-3 py-1 text-[11px] font-semibold neo-focus"
          :class="weekChipClass"
          :disabled="!row.isActive"
          @click="$emit('startAssigning', 'weeks')"
        >
          {{ pickWeeksLabel }}
        </button>

        <button
          type="button"
          class="neo-pill px-3 py-1 text-[11px] font-semibold neo-focus"
          :class="dayChipClass"
          :disabled="!row.isActive"
          @click="$emit('startAssigning', 'days')"
        >
          {{ pickDaysLabel }}
        </button>

        <button
          v-if="showAdvancedToggle"
          type="button"
          class="neo-icon-button neo-focus h-9 w-9 rounded-xl"
          :class="advancedOpen ? 'shadow-neu-pressed text-primary' : ''"
          :aria-label="advancedOpen ? hideAdvancedLabel : showAdvancedLabel"
          @click="advancedOpen = !advancedOpen"
        >
          <AppIcon name="tune" class="text-sm" />
        </button>
      </div>
    </div>

    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-[240px] opacity-100"
      leave-from-class="max-h-[240px] opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div v-if="advancedOpen && showAdvancedToggle && target" class="overflow-hidden border-t border-outline/8 px-3 pb-3 pt-2.5">
        <PlannerTargetControls
          :target="target"
          :has-override="!!row.targetOverride"
          @operator-change="$emit('targetOperatorChange', $event)"
          @aggregation-change="$emit('targetAggregationChange', $event)"
          @value-change="$emit('targetValueChange', $event)"
          @clear-override="$emit('clearOverride')"
        />
      </div>
    </Transition>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import PlannerTargetControls from './PlannerTargetControls.vue'
import { useT } from '@/composables/useT'
import type { PlannerDisplayRow, PlannerPlacementMode } from './plannerTypes'

const props = defineProps<{
  row: PlannerDisplayRow
  wholeLabel: string
  pickWeeksLabel?: string
  pickDaysLabel: string
}>()

defineEmits<{
  toggle: []
  applyWholePeriod: []
  startAssigning: [mode: PlannerPlacementMode]
  targetOperatorChange: [value: string]
  targetAggregationChange: [value: string]
  targetValueChange: [value: number]
  clearOverride: []
}>()

const { t } = useT()
const advancedOpen = ref(false)

const showWeekPicker = computed(() => Boolean(props.pickWeeksLabel))
const showAdvancedToggle = computed(() => props.row.subjectType !== 'tracker' && !!target.value)
const target = computed(() => props.row.targetOverride ?? props.row.target)

const showAdvancedLabel = computed(() => t('planning.calendar.planner.showAdvanced'))
const hideAdvancedLabel = computed(() => t('planning.calendar.planner.hideAdvanced'))

const cardClass = computed(() => {
  if (props.row.placementEditState !== 'idle') return 'border-secondary/25 bg-secondary/7 ring-1 ring-secondary/20'
  if (props.row.placementStatus === 'planned') return 'border-success/18 bg-success/6'
  if (props.row.isActive) return 'border-primary/15 bg-primary/5'
  return 'border-outline/10 bg-section/35'
})

const wholeChipClass = computed(() => {
  if (!props.row.isActive) return 'opacity-50 text-on-surface-variant'
  if (props.row.isWholePeriod && props.row.placementEditState === 'idle') return 'neo-pill--success text-success'
  return props.row.placementStatus === 'planned' ? 'text-on-surface' : 'neo-pill--primary text-primary'
})

const weekChipClass = computed(() => {
  if (!props.row.isActive) return 'opacity-50 text-on-surface-variant'
  if (props.row.placementEditState === 'pick-weeks') return 'neo-pill--primary text-primary shadow-neu-pressed'
  return props.row.placementStatus === 'planned' ? 'text-on-surface' : 'neo-pill--primary text-primary'
})

const dayChipClass = computed(() => {
  if (!props.row.isActive) return 'opacity-50 text-on-surface-variant'
  if (props.row.placementEditState === 'pick-days') return 'neo-pill--primary text-primary shadow-neu-pressed'
  return props.row.placementStatus === 'planned' ? 'text-on-surface' : 'neo-pill--primary text-primary'
})
</script>
