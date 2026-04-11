<template>
  <span
    role="img"
    class="inline-block h-3 w-[1.875rem] rounded-full"
    :style="pillStyle"
    :aria-label="accessibilityLabel"
    :title="accessibilityLabel"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  cadence: 'weekly' | 'monthly'
  monthlyStatus?: 'met' | 'missed' | 'no-data'
  weeksMet?: number
  weeksTotal?: number
  label?: string
}

const props = defineProps<Props>()

const MISSED_COLOR = '#fda4af' // rose-300
const NO_DATA_COLOR = '#cbd5e1' // slate-300

const metColor = computed(() => {
  const rgb = getComputedStyle(document.documentElement)
    .getPropertyValue('--neo-chart-primary-end')
    .trim()
  return rgb ? `rgb(${rgb})` : '#38bdf8'
})

const pillStyle = computed(() => {
  if (props.cadence === 'monthly') {
    const status = props.monthlyStatus ?? 'no-data'
    switch (status) {
      case 'met':
        return { backgroundColor: metColor.value }
      case 'missed':
        return { backgroundColor: MISSED_COLOR }
      default:
        return { backgroundColor: NO_DATA_COLOR }
    }
  }

  // Weekly cadence — proportional gradient
  const total = props.weeksTotal ?? 0
  const met = props.weeksMet ?? 0

  if (total === 0) {
    return { backgroundColor: NO_DATA_COLOR }
  }

  if (met === total) {
    return { backgroundColor: metColor.value }
  }

  if (met === 0) {
    return { backgroundColor: MISSED_COLOR }
  }

  const pct = Math.round((met / total) * 100)
  return {
    background: `linear-gradient(to right, ${metColor.value} ${pct}%, ${MISSED_COLOR} ${pct}%)`,
  }
})

const accessibilityLabel = computed(() => {
  const name = props.label ?? ''
  if (props.cadence === 'monthly') {
    const status = props.monthlyStatus ?? 'no-data'
    return name ? `${name}: ${status}` : status
  }

  const met = props.weeksMet ?? 0
  const total = props.weeksTotal ?? 0
  const desc = `${met}/${total} weeks met`
  return name ? `${name}: ${desc}` : desc
})
</script>
