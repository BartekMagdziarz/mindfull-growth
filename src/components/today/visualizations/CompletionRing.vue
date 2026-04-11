<template>
  <component
    :is="canToggleToday ? 'button' : 'div'"
    :type="canToggleToday ? 'button' : undefined"
    class="flex items-center justify-center"
    :class="
      canToggleToday
        ? 'neo-focus rounded-full transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60'
        : undefined
    "
    :disabled="canToggleToday ? isPending : undefined"
    :aria-label="canToggleToday ? buttonAriaLabel : undefined"
    @click.stop="handleClick"
  >
    <svg
      :width="SIZE"
      :height="SIZE"
      :viewBox="`0 0 ${SIZE} ${SIZE}`"
      role="img"
      :aria-label="progressAriaLabel"
    >
      <circle
        :cx="CENTER"
        :cy="CENTER"
        :r="RADIUS"
        fill="none"
        stroke="rgb(var(--color-outline))"
        stroke-opacity="0.2"
        :stroke-width="STROKE"
      />
      <circle
        class="completion-ring__progress"
        :cx="CENTER"
        :cy="CENTER"
        :r="RADIUS"
        fill="none"
        :stroke="progressStroke"
        :stroke-width="STROKE"
        stroke-linecap="round"
        :stroke-dasharray="dashArray"
        stroke-dashoffset="0"
        :transform="`rotate(-90 ${CENTER} ${CENTER})`"
      />
      <text
        :x="CENTER"
        :y="CENTER - 2"
        text-anchor="middle"
        font-size="20"
        font-weight="600"
        fill="rgb(var(--color-on-surface))"
      >
        {{ safeDoneCount }}
      </text>
      <text
        :x="CENTER"
        :y="CENTER + 14"
        text-anchor="middle"
        font-size="11"
        fill="rgb(var(--color-on-surface-variant))"
      >
        / {{ safeTargetCount }}
      </text>
    </svg>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  doneCount: number
  targetCount: number
  isPending?: boolean
  hasTodayEntry: boolean
  canToggleToday: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPending: false,
})

const emit = defineEmits<{ toggle: [] }>()

const SIZE = 80
const CENTER = SIZE / 2
const RADIUS = 32
const STROKE = 8
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const safeDoneCount = computed(() => Math.max(0, props.doneCount))
const safeTargetCount = computed(() => Math.max(1, props.targetCount))

const fillRatio = computed(() =>
  Math.min(1, safeDoneCount.value / Math.max(safeTargetCount.value, 1)),
)

const dashArray = computed(() => `${CIRCUMFERENCE * fillRatio.value} ${CIRCUMFERENCE}`)

// Story 4 deliberately caps overflow at 100%; Story 7 can differentiate
// operator-specific overflow visuals for `min` vs `max` targets.
const progressStroke = computed(() => 'rgb(var(--neo-chart-primary-end))')

const progressAriaLabel = computed(
  () => `${safeDoneCount.value} of ${safeTargetCount.value} completed`,
)

const buttonAriaLabel = computed(() =>
  props.hasTodayEntry ? 'Undo today' : 'Record today',
)

function handleClick(): void {
  if (!props.canToggleToday || props.isPending) {
    return
  }

  emit('toggle')
}
</script>
