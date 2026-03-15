<template>
  <div class="flex flex-wrap items-center gap-1">
    <select
      class="neo-inset min-w-0 flex-none rounded-xl py-0.5 pl-1.5 pr-4 text-[11px] text-on-surface"
      :value="target.operator"
      :disabled="disabled"
      @change="$emit('operatorChange', ($event.target as HTMLSelectElement).value)"
    >
      <option
        v-for="op in operatorOpts"
        :key="op"
        :value="op"
      >
        {{ op }}
      </option>
    </select>

    <select
      v-if="aggregationOpts.length > 0"
      class="neo-inset min-w-0 flex-none rounded-xl py-0.5 pl-1.5 pr-4 text-[11px] text-on-surface"
      :value="aggValue"
      :disabled="disabled"
      @change="$emit('aggregationChange', ($event.target as HTMLSelectElement).value)"
    >
      <option
        v-for="agg in aggregationOpts"
        :key="agg"
        :value="agg"
      >
        {{ agg }}
      </option>
    </select>

    <input
      class="neo-inset w-12 min-w-0 flex-none rounded-xl py-0.5 px-1.5 text-[11px] text-on-surface"
      type="number"
      step="0.1"
      :value="target.value"
      :disabled="disabled"
      @change="$emit('valueChange', Number(($event.target as HTMLInputElement).value))"
    />

    <button
      v-if="hasOverride"
      type="button"
      class="rounded-full p-0.5 text-on-surface-variant transition-colors hover:bg-section hover:text-primary"
      :title="t('planning.calendar.planner.clearOverride')"
      @click="$emit('clearOverride')"
    >
      <AppIcon name="undo" class="text-xs" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { MeasurementTarget } from '@/domain/planning'

const props = defineProps<{
  target: MeasurementTarget
  hasOverride: boolean
  disabled?: boolean
}>()

defineEmits<{
  operatorChange: [value: string]
  aggregationChange: [value: string]
  valueChange: [value: number]
  clearOverride: []
}>()

const { t } = useT()

const operatorOpts = computed(() =>
  props.target.kind === 'count' ? ['min', 'max'] : ['gte', 'lte']
)

const aggregationOpts = computed(() => {
  if (props.target.kind === 'count') return []
  return props.target.kind === 'rating' ? ['average'] : ['sum', 'average', 'last']
})

const aggValue = computed(() => {
  switch (props.target.kind) {
    case 'count':
      return ''
    case 'rating':
      return 'average'
    case 'value':
      return props.target.aggregation
  }
})
</script>
