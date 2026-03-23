<template>
  <article
    class="rounded-[1.15rem] border border-neu-border/30 transition-all duration-200"
    :class="cardClass"
  >
    <div class="px-3 py-2.5">
      <div class="flex items-center gap-2.5">
        <div class="flex shrink-0 flex-col items-center gap-1">
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

          <button
            v-if="showAdvancedToggle"
            type="button"
            class="flex h-5 w-5 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-primary neo-focus"
            :class="advancedOpen ? 'text-primary' : ''"
            :aria-label="advancedOpen ? hideAdvancedLabel : showAdvancedLabel"
            @click="advancedOpen = !advancedOpen"
          >
            <AppIcon
              name="expand_more"
              class="text-xs transition-transform duration-200"
              :class="advancedOpen ? 'rotate-180' : ''"
            />
          </button>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <p class="min-w-0 truncate text-sm font-semibold text-on-surface">
              {{ row.title }}
            </p>
            <span
              v-if="row.placementSummary"
              class="shrink-0 neo-pill px-2 py-0.5 text-[10px] font-semibold"
              :class="row.placementStatus === 'planned' ? 'neo-pill--success' : 'neo-pill--warning'"
            >
              {{ row.placementSummary }}
            </span>
          </div>
        </div>
      </div>

      <div class="mt-2 flex flex-wrap items-center gap-1.5 pl-[46px]">
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
  if (props.row.placementEditState !== 'idle') return 'bg-secondary/7 shadow-neu-pressed ring-1 ring-secondary/20'
  if (props.row.placementStatus === 'planned') return 'bg-success/5 shadow-neu-raised-sm'
  if (props.row.isActive) return 'bg-primary/4 shadow-neu-raised-sm'
  return 'bg-neu-base shadow-neu-raised-sm'
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
