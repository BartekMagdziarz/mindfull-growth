<template>
  <div :class="['flex flex-col gap-1', compact ? '' : 'gap-2']">
    <!-- Progress text -->
    <div
      v-if="showProgress"
      :class="['text-on-surface-variant', compact ? 'text-xs' : 'text-sm']"
    >
      <span class="font-medium" :class="progressTextClass">{{ displayedCompletedCount }}</span>
      <span class="mx-0.5">/</span>
      <span>{{ targetCount }}</span>
      <span v-if="label" class="ml-1 text-on-surface-variant/70">{{ label }}</span>
    </div>

    <!-- Tick boxes -->
    <div class="flex flex-wrap justify-center gap-1.5">
      <button
        v-for="tickIndex in targetCount"
        :key="tickIndex - 1"
        type="button"
        :disabled="readonly || disabled"
        :class="[
          'transition-all duration-150 flex items-center justify-center border shadow-neu-raised-sm',
          compact ? 'w-8 h-8 rounded-full' : 'w-10 h-10 rounded-full',
          getTickClass(tickIndex - 1),
          readonly || disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        ]"
        :aria-label="getTickLabel(tickIndex - 1)"
        :title="getTickLabel(tickIndex - 1)"
        @click="handleTickClick(tickIndex - 1)"
      >
        <CheckIcon
          v-if="isTickCompleted(tickIndex - 1)"
          :class="compact ? 'w-5 h-5' : 'w-6 h-6'"
        />
        <span
          v-else-if="tickLabels && tickLabels[tickIndex - 1]"
          :class="['font-medium', compact ? 'text-sm' : 'text-base']"
        >
          {{ getShortLabel(tickLabels[tickIndex - 1]) }}
        </span>
      </button>
    </div>

    <!-- Progress bar (optional) -->
    <div
      v-if="showProgressBar"
      class="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden"
    >
      <div
        class="h-full transition-all duration-300 rounded-full"
        :class="progressBarClass"
        :style="{ width: `${progressPercentage}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckIcon } from '@heroicons/vue/24/solid'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = withDefaults(
  defineProps<{
    /** Total number of ticks to display */
    targetCount: number
    /** Array of completed tick indices (0-based) */
    completedTicks: number[]
    /** Optional explicit completed count (supports overflow beyond rendered ticks) */
    displayCount?: number
    /** Optional labels for each tick (e.g., ["Mon", "Tue", "Wed"]) */
    tickLabels?: string[]
    /** Optional label to show next to progress (e.g., "sessions") */
    label?: string
    /** Use compact mode for inline display */
    compact?: boolean
    /** Show progress text (X/Y) */
    showProgress?: boolean
    /** Show progress bar below ticks */
    showProgressBar?: boolean
    /** Readonly mode - no interactions */
    readonly?: boolean
    /** Disabled state */
    disabled?: boolean
  }>(),
  {
    compact: false,
    showProgress: false,
    showProgressBar: false,
    readonly: false,
    disabled: false,
    tickLabels: undefined,
    label: undefined,
  }
)

const emit = defineEmits<{
  /** Emitted when a tick is toggled */
  toggle: [tickIndex: number, isCompleted: boolean]
}>()

// ============================================================================
// Computed Properties
// ============================================================================

const completedCount = computed(() => props.completedTicks.length)
const displayedCompletedCount = computed(() => props.displayCount ?? completedCount.value)

const progressPercentage = computed(() => {
  if (props.targetCount === 0) return 0
  return Math.min((displayedCompletedCount.value / props.targetCount) * 100, 100)
})

const progressTextClass = computed(() => {
  if (displayedCompletedCount.value >= props.targetCount) {
    return 'text-success'
  }
  if (displayedCompletedCount.value > 0) {
    return 'text-primary'
  }
  return ''
})

const progressBarClass = computed(() => {
  if (displayedCompletedCount.value >= props.targetCount) {
    return 'bg-success'
  }
  if (displayedCompletedCount.value > 0) {
    return 'bg-primary'
  }
  return 'bg-primary/30'
})

// ============================================================================
// Methods
// ============================================================================

function isTickCompleted(index: number): boolean {
  return props.completedTicks.includes(index)
}

function getTickClass(index: number): string {
  const isCompleted = isTickCompleted(index)
  const isInteractive = !props.readonly && !props.disabled

  if (isCompleted) {
    return `border-primary/50 bg-gradient-to-br from-primary to-primary-strong text-on-primary ${isInteractive ? 'hover:shadow-neu-raised' : ''}`
  }

  return `border-chip-border bg-primary-soft text-on-surface-variant ${isInteractive ? 'hover:bg-section hover:text-primary hover:shadow-neu-raised' : ''}`
}

function getTickLabel(index: number): string {
  const label = props.tickLabels?.[index] || t('planning.components.trackerDisplay.tickLabel', { index: index + 1 })
  const status = isTickCompleted(index)
    ? t('planning.components.trackerDisplay.completed')
    : t('planning.components.trackerDisplay.incomplete')
  return `${label} (${status})`
}

function getShortLabel(label: string): string {
  // Abbreviate day names to first letter
  const dayAbbreviations: Record<string, string> = {
    Monday: 'M',
    Tuesday: 'T',
    Wednesday: 'W',
    Thursday: 'T',
    Friday: 'F',
    Saturday: 'S',
    Sunday: 'S',
    Mon: 'M',
    Tue: 'T',
    Wed: 'W',
    Thu: 'T',
    Fri: 'F',
    Sat: 'S',
    Sun: 'S',
  }

  if (dayAbbreviations[label]) {
    return dayAbbreviations[label]
  }

  // If label is already short (1-2 chars), use as is
  if (label.length <= 2) {
    return label
  }

  // Otherwise, take first character
  return label[0].toUpperCase()
}

function handleTickClick(index: number): void {
  if (props.readonly || props.disabled) return

  const willBeCompleted = !isTickCompleted(index)
  emit('toggle', index, willBeCompleted)
}
</script>
