<template>
  <article
    class="rounded-[1.1rem] border border-outline/10 transition-all duration-200"
    :class="cardClass"
  >
    <!-- Collapsed: name + status dot -->
    <button
      type="button"
      class="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
      @click="$emit('expand')"
    >
      <span
        class="h-2 w-2 shrink-0 rounded-full"
        :class="statusDotClass"
      />
      <span class="min-w-0 flex-1 truncate text-sm font-medium text-on-surface">
        {{ item.title }}
      </span>
      <AppIcon
        name="expand_more"
        class="text-sm shrink-0 text-on-surface-variant transition-transform duration-200"
        :class="isExpanded ? 'rotate-180' : ''"
      />
    </button>

    <!-- Expanded details -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-[300px] opacity-100"
      leave-from-class="max-h-[300px] opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div v-if="isExpanded" class="overflow-hidden border-t border-outline/8 px-3 pb-2.5 pt-2">
        <!-- Inactive state: just toggle -->
        <div v-if="!item.isActive" class="flex items-center gap-2">
          <button
            type="button"
            class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none disabled:opacity-40 bg-outline/30"
            :disabled="!parentEnabled"
            :aria-label="t('planning.calendar.planner.activate')"
            @click="$emit('toggle')"
          >
            <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 translate-x-0.5" />
          </button>
          <span class="text-xs text-on-surface-variant">
            {{ t('planning.calendar.planner.inactive') }}
          </span>
        </div>

        <!-- Active state: compact 2-row layout -->
        <template v-else>
          <!-- Row 1: toggle + target controls inline -->
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="relative inline-flex h-5 w-9 shrink-0 rounded-full bg-primary transition-colors duration-200 focus-visible:outline-none disabled:opacity-40"
              :disabled="!parentEnabled"
              :aria-label="t('planning.calendar.planner.deactivate')"
              @click="$emit('toggle')"
            >
              <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 translate-x-[18px]" />
            </button>

            <span class="rounded-full bg-section px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
              {{ item.cadence === 'monthly' ? t('planning.calendar.scales.month') : t('planning.calendar.scales.week') }}
            </span>

            <!-- Target controls inline (if applicable) -->
            <template v-if="target && item.subjectType !== 'tracker'">
              <PlannerTargetControls
                :target="target"
                :has-override="!!item.targetOverride"
                @operator-change="$emit('targetOperatorChange', $event)"
                @aggregation-change="$emit('targetAggregationChange', $event)"
                @value-change="$emit('targetValueChange', $event)"
                @clear-override="$emit('clearOverride')"
              />
            </template>
          </div>

          <!-- Row 2: assign button, right-aligned -->
          <div class="mt-1.5 flex items-center justify-end">
            <button
              type="button"
              class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200"
              :class="assignBtnClass"
              :disabled="!parentEnabled"
              @click="$emit('startAssigning')"
            >
              <span class="flex items-center gap-1">
                <AppIcon v-if="assigned && !assigning" name="check" class="text-xs" />
                {{ assignLabel }}
              </span>
            </button>
          </div>
        </template>

        <p
          v-if="!parentEnabled && item.isActive"
          class="mt-1 text-[11px] font-medium text-on-surface-variant"
        >
          {{ t('planning.calendar.planner.activateGoalFirst') }}
        </p>

        <p
          v-if="isSaving"
          class="mt-1 text-[11px] text-on-surface-variant"
        >
          {{ t('common.saving') }}
        </p>
      </div>
    </Transition>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import PlannerTargetControls from './PlannerTargetControls.vue'
import type { PlannerMeasurementRow } from './plannerTypes'

const props = defineProps<{
  item: PlannerMeasurementRow
  isExpanded: boolean
  assigning: boolean
  assigned: boolean
  savingKey: string
  parentEnabled: boolean
}>()

defineEmits<{
  expand: []
  toggle: []
  startAssigning: []
  targetOperatorChange: [value: string]
  targetAggregationChange: [value: string]
  targetValueChange: [value: number]
  clearOverride: []
}>()

const { t } = useT()

const target = computed(() => props.item.targetOverride ?? props.item.target)

const isSaving = computed(
  () =>
    props.savingKey.startsWith(`${props.item.subjectType}:${props.item.id}:`) ||
    props.savingKey === `${props.item.subjectType}:${props.item.id}`
)

const statusDotClass = computed(() => {
  if (props.assigned) return 'bg-success'
  if (props.item.isActive) return 'bg-primary'
  return 'bg-outline/40'
})

const cardClass = computed(() => {
  if (!props.parentEnabled) return 'opacity-60'
  if (props.assigning) return 'border-secondary/30 bg-secondary/8 ring-1 ring-secondary/20'
  if (props.assigned) return 'bg-success/5 border-success/15'
  if (props.item.isActive) return 'bg-primary/5'
  return 'bg-section/35'
})

const assignBtnClass = computed(() => {
  if (!props.item.isActive || !props.parentEnabled) {
    return 'bg-section/40 text-on-surface-variant opacity-50'
  }
  if (props.assigning) return 'bg-secondary text-on-primary'
  if (props.assigned) return 'bg-success/15 text-success ring-1 ring-success/25'
  return 'bg-primary text-on-primary'
})

const assignLabel = computed(() => {
  if (props.assigning) return t('planning.calendar.planner.assigning')
  if (props.assigned) return t('planning.calendar.planner.assigned')
  return t('planning.calendar.planner.assign')
})
</script>
