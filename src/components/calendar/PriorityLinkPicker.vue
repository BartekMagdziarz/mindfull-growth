<script setup lang="ts">
import { useT } from '@/composables/useT'
import type { WeekPlanPriorityOption } from './weekPlanCandidate'

// Optional, lightweight multi-select that links a weekly intention to the month's active
// priorities (M5) so it maps in the monthly focus confrontation instead of always drifting.
const props = defineProps<{ options: WeekPlanPriorityOption[]; modelValue: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [string[]] }>()

const { t } = useT()

function toggle(id: string): void {
  const next = props.modelValue.includes(id)
    ? props.modelValue.filter((value) => value !== id)
    : [...props.modelValue, id]
  emit('update:modelValue', next)
}
</script>

<template>
  <div v-if="options.length > 0" class="space-y-1.5">
    <span class="block text-[11px] font-medium text-on-surface-variant">
      {{ t('planning.weekPlanning.priorityLink.label') }}
    </span>
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="option in options"
        :key="option.id"
        type="button"
        role="checkbox"
        :aria-checked="modelValue.includes(option.id)"
        class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
        :class="
          modelValue.includes(option.id)
            ? 'border-primary/50 bg-primary/10 text-primary'
            : 'border-neu-border/40 text-on-surface-variant hover:text-on-surface'
        "
        @click="toggle(option.id)"
      >
        {{ option.title }}
      </button>
    </div>
  </div>
</template>
