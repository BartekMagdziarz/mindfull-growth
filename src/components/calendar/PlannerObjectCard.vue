<template>
  <article
    class="group relative rounded-2xl border border-neu-border/30 transition-all duration-200"
    :class="cardClass"
  >
    <div class="px-3 py-2.5">
      <div class="flex items-center gap-2.5">
        <!-- Subject icon — colored by active state, shape per subject type -->
        <span
          class="relative inline-flex h-8 w-8 shrink-0 items-center justify-center transition-colors duration-200"
          :class="iconWrapperClass"
        >
          <span class="absolute inset-0" :class="[shapeClass, iconBgClass]" />
          <span
            v-if="resolvedMaterialIcon"
            class="material-symbols-outlined relative leading-none"
            style="font-size: 17px"
          >{{ resolvedMaterialIcon }}</span>
          <span
            v-else-if="row.icon && isEmoji(row.icon)"
            class="relative text-sm leading-none"
          >{{ row.icon }}</span>
          <span
            v-else
            class="relative text-[10px] font-bold leading-none"
          >{{ initials }}</span>
        </span>

        <!-- Title — full, no truncate -->
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold leading-tight text-on-surface">
            {{ row.title }}
          </p>
        </div>

        <!-- Single assign button: idle / assigning / counter -->
        <button
          type="button"
          class="relative inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 transition-all duration-150 neo-focus"
          :class="assignButtonClass"
          :aria-label="assignButtonLabel"
          :title="assignButtonLabel"
          @click="$emit('startAssigning')"
        >
          <AppIcon :name="assignButtonIcon" class="text-base" />
          <span
            v-if="row.placementSummary && !isAssigning"
            class="text-[11px] font-semibold leading-none"
          >{{ row.placementSummary }}</span>
        </button>
      </div>
    </div>

    <!-- Hover/expanded chevron at the bottom of the card -->
    <button
      type="button"
      class="absolute -bottom-2 left-1/2 z-10 inline-flex h-5 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-neu-border/40 bg-neu-base text-on-surface-variant shadow-neu-raised-sm transition-all duration-200 hover:text-primary neo-focus"
      :class="
        expanded
          ? 'opacity-100'
          : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
      "
      :aria-label="expanded ? t('planning.calendar.planner.collapseRow') : t('planning.calendar.planner.expandRow')"
      :title="expanded ? t('planning.calendar.planner.collapseRow') : t('planning.calendar.planner.expandRow')"
      @click="expanded = !expanded"
    >
      <AppIcon
        name="expand_more"
        class="text-xs transition-transform duration-200"
        :class="expanded ? 'rotate-180 text-primary-strong' : ''"
      />
    </button>

    <!-- Expanded panel: target controls + activate toggle + whole-period quick action -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-[260px] opacity-100"
      leave-from-class="max-h-[260px] opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div
        v-if="expanded"
        class="overflow-hidden rounded-b-2xl border-t border-primary/15 bg-primary/4 px-3 pb-3 pt-3"
      >
        <div class="flex items-start justify-between gap-3">
          <div v-if="target" class="min-w-0 flex-1">
            <p class="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              {{ targetLabel }}
            </p>
            <PlannerTargetControls
              v-if="canEditTarget"
              :target="target"
              :has-override="!!row.targetOverride"
              @operator-change="$emit('targetOperatorChange', $event)"
              @aggregation-change="$emit('targetAggregationChange', $event)"
              @value-change="$emit('targetValueChange', $event)"
              @clear-override="$emit('clearOverride')"
            />
            <p v-else class="text-xs text-on-surface-variant">{{ targetReadOnly }}</p>
          </div>
          <div v-else class="min-w-0 flex-1">
            <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              {{ targetLabel }}
            </p>
            <p class="mt-1 text-xs text-on-surface-variant">{{ targetReadOnly }}</p>
          </div>

          <div class="flex shrink-0 flex-col items-end gap-1.5">
            <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              {{ t('planning.calendar.planner.active') }}
            </p>
            <button
              type="button"
              class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none"
              :class="row.isActive ? 'bg-primary' : 'bg-outline/30'"
              :aria-label="row.isActive ? t('planning.calendar.planner.deactivate') : t('planning.calendar.planner.activate')"
              :aria-pressed="row.isActive"
              @click="$emit('toggle')"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
                :class="row.isActive ? 'translate-x-[18px]' : 'translate-x-0.5'"
              />
            </button>
          </div>
        </div>

        <button
          type="button"
          class="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-neu-border/30 px-3 py-2 text-xs font-semibold transition-all duration-150 neo-focus"
          :class="wholeButtonClass"
          @click="$emit('applyWholePeriod')"
        >
          <AppIcon
            :name="row.isWholePeriod ? 'check_circle' : 'event_repeat'"
            class="text-sm"
          />
          {{ row.isWholePeriod ? wholeAppliedLabel : wholeLabel }}
        </button>
      </div>
    </Transition>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import PlannerTargetControls from './PlannerTargetControls.vue'
import { useT } from '@/composables/useT'
import { getEntityIconOption, isLegacyEmojiIcon } from '@/constants/entityIconCatalog'
import type { PlannerDisplayRow } from './plannerTypes'

const props = defineProps<{
  row: PlannerDisplayRow
  wholeLabel: string
  wholeAppliedLabel: string
}>()

defineEmits<{
  toggle: []
  applyWholePeriod: []
  startAssigning: []
  targetOperatorChange: [value: string]
  targetAggregationChange: [value: string]
  targetValueChange: [value: number]
  clearOverride: []
}>()

const { t } = useT()
const expanded = ref(false)

const isAssigning = computed(() => props.row.placementEditState !== 'idle')

const target = computed(() => props.row.targetOverride ?? props.row.target)
const canEditTarget = computed(() => props.row.subjectType !== 'tracker' && !!target.value)
const targetLabel = computed(() => t('planning.calendar.planner.target'))
const targetReadOnly = computed(() => t('planning.calendar.planner.trackerNoTarget'))

const resolvedMaterialIcon = computed(() => {
  const id = props.row.icon
  if (!id) return undefined
  const opt = getEntityIconOption(id)
  if (opt) return opt.materialIcon
  if (isLegacyEmojiIcon(id)) return undefined
  return id
})

const initials = computed(() => {
  const title = props.row.title.trim()
  if (!title) return '·'
  const parts = title.split(/\s+/)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
})

function isEmoji(value: string): boolean {
  return isLegacyEmojiIcon(value)
}

const shapeClass = computed(() => {
  if (props.row.subjectType === 'keyResult') return 'rounded-full'
  if (props.row.subjectType === 'tracker') return 'rounded-[22%]'
  return 'pentagon-clip'
})

const iconBgClass = computed(() => {
  if (props.row.isActive) return 'bg-primary/15'
  return 'bg-outline/20'
})

const iconWrapperClass = computed(() => {
  if (isAssigning.value) return 'text-primary-strong'
  if (props.row.isActive) return 'text-primary-strong'
  return 'text-on-surface-variant/70'
})

const cardClass = computed(() => {
  if (isAssigning.value) {
    return 'bg-primary/8 shadow-neu-pressed-sm ring-1 ring-primary/30'
  }
  if (props.row.placementStatus === 'planned') {
    return 'bg-success/4 shadow-neu-raised-sm'
  }
  if (props.row.isActive) {
    return 'bg-primary/4 shadow-neu-raised-sm'
  }
  return 'bg-neu-base shadow-neu-raised-sm'
})

const assignButtonClass = computed(() => {
  if (isAssigning.value) {
    return 'border-primary/30 bg-primary/12 text-primary-strong shadow-neu-pressed-sm'
  }
  if (props.row.placementSummary) {
    return 'border-primary/20 bg-primary/8 text-primary-strong shadow-neu-raised-sm hover:text-primary'
  }
  return 'border-neu-border/30 bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:text-primary'
})

const assignButtonIcon = computed(() => {
  if (isAssigning.value) return 'check'
  if (props.row.placementSummary) return 'edit_calendar'
  return 'event_available'
})

const assignButtonLabel = computed(() => {
  if (isAssigning.value) return t('planning.calendar.planner.exitAssigning')
  if (props.row.placementSummary) return t('planning.calendar.planner.editAssignment')
  return t('planning.calendar.planner.assignToCalendar')
})

const wholeButtonClass = computed(() => {
  if (props.row.isWholePeriod) {
    return 'border-success/30 bg-success/10 text-success shadow-neu-pressed-sm'
  }
  return 'border-neu-border/30 bg-neu-base text-on-surface shadow-neu-raised-sm hover:text-primary-strong'
})
</script>

<style scoped>
.pentagon-clip {
  clip-path: polygon(50% 0%, 98% 35%, 79% 90%, 21% 90%, 2% 35%);
}
</style>
