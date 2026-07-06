<template>
  <div class="flex items-center gap-1">
    <input
      v-model="localValue"
      type="number"
      v-bind="valueAttrs"
      :disabled="disabled"
      :aria-label="t('planning.calendar.planner.weekRow.weekTarget')"
      :title="t('planning.calendar.planner.weekRow.weekTarget')"
      class="neo-badge w-14 px-1.5 py-1 text-center text-sm font-semibold transition-colors focus:border-primary/50 focus:bg-white/70 focus:outline-none"
      :class="hasOverride ? 'text-primary-strong' : 'text-on-surface-variant'"
      @click.stop
      @change="commitValue"
      @keydown.enter.prevent="commitValue"
    />
    <template v-if="entryDays">
      <input
        v-model="localEntryDaysValue"
        type="number"
        min="1"
        :max="entryDaysMax"
        step="1"
        inputmode="numeric"
        :disabled="disabled"
        :aria-label="t('planning.calendar.planner.weekRow.entryDaysTarget')"
        :title="t('planning.calendar.planner.weekRow.entryDaysTarget')"
        class="neo-badge w-11 px-1 py-1 text-center text-sm font-semibold transition-colors focus:border-primary/50 focus:bg-white/70 focus:outline-none"
        :class="hasOverride ? 'text-primary-strong' : 'text-on-surface-variant'"
        @click.stop
        @change="commitEntryDaysValue"
        @keydown.enter.prevent="commitEntryDaysValue"
      />
      <span class="text-[10px] text-on-surface-variant">
        {{ entryDays.operator === 'min' ? '≥' : '≤' }}{{ t('planning.objects.targetSentence.entryDaysUnit') }}
      </span>
    </template>
    <button
      v-if="hasOverride"
      type="button"
      class="neo-icon-button h-6 w-6 rounded-lg text-on-surface-variant transition-colors hover:text-on-surface"
      :aria-label="t('planning.calendar.planner.weekRow.clearWeekTarget')"
      :title="t('planning.calendar.planner.weekRow.clearWeekTarget')"
      :disabled="disabled"
      @click.stop="$emit('clear')"
    >
      <AppIcon name="backspace" class="text-sm" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { MeasurementTarget } from '@/domain/planning'

const props = withDefaults(
  defineProps<{
    target: MeasurementTarget
    /** True when this week's value is an explicit sub-target (not inherited). */
    hasOverride: boolean
    disabled?: boolean
    /** Upper bound for the entry-days input (7 for week periods, 31 for months). */
    entryDaysMax?: number
  }>(),
  { entryDaysMax: 7 },
)

const emit = defineEmits<{
  change: [value: number]
  entryDaysChange: [days: number]
  clear: []
}>()

const { t } = useT()

const entryDays = computed(() => props.target.entryDays)

const valueAttrs = computed(() =>
  props.target.kind === 'count'
    ? { min: 0, step: 1, inputmode: 'numeric' as const }
    : { step: 'any', inputmode: 'decimal' as const }
)

// Same local-buffer pattern as MeasurementTargetSentence: typing stays local,
// commits on blur/Enter, re-syncs when the effective target changes externally.
const localValue = ref(String(props.target.value))
watch(
  () => props.target.value,
  value => {
    localValue.value = String(value)
  }
)

function commitValue(): void {
  const parsed = Number(localValue.value)
  if (!Number.isFinite(parsed)) {
    localValue.value = String(props.target.value)
    return
  }
  const value = props.target.kind === 'count' ? Math.max(0, Math.round(parsed)) : parsed
  if (value === props.target.value && props.hasOverride) {
    localValue.value = String(value)
    return
  }
  emit('change', value)
}

// Entry-days sub-input: same local-buffer pattern; the pill only adjusts the
// value — adding/removing the condition lives in the target editors.
const localEntryDaysValue = ref<string | number>(entryDays.value ? String(entryDays.value.value) : '')
watch(entryDays, condition => {
  localEntryDaysValue.value = condition ? String(condition.value) : ''
})

function commitEntryDaysValue(): void {
  const condition = entryDays.value
  if (!condition) return
  const parsed = Number(localEntryDaysValue.value)
  if (!Number.isFinite(parsed)) {
    localEntryDaysValue.value = String(condition.value)
    return
  }
  const days = Math.min(props.entryDaysMax, Math.max(1, Math.round(parsed)))
  if (days === condition.value && props.hasOverride) {
    localEntryDaysValue.value = String(days)
    return
  }
  emit('entryDaysChange', days)
}
</script>
