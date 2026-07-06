<template>
  <span class="context-chip" :data-status="data.status ?? 'none'" :aria-label="chipText">
    <span>{{ chipText }}</span>
    <span v-if="data.status === 'met'" class="context-chip__glyph" aria-hidden="true">✓</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'
import type { ContextChipData } from '@/services/weeklySliceChartData'

/**
 * Compact single-line target + performance readout shown beside an object
 * tile's title (weekly + monthly scale). Symbol-based (Σ sum, ⌀ average) so it
 * stays short and language-neutral; coloured by evaluation status.
 */
const props = defineProps<{ data: ContextChipData }>()

const { t } = useT()

/** Compact number: 1-decimal for fractions, "k" suffix from 1000 up. */
function fmt(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1000) {
    const k = value / 1000
    return `${Number.isInteger(k) ? k : k.toFixed(1).replace(/\.0$/, '')}k`
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

const baseChipText = computed<string>(() => {
  const d = props.data
  switch (d.variant) {
    case 'count-progress':
      return `${fmt(d.current)}/${fmt(d.target ?? 0)}`
    case 'value-progress':
      return `Σ ${fmt(d.current)}/${fmt(d.target ?? 0)}`
    case 'avg-marker':
      return d.target !== undefined
        ? `⌀${fmt(d.current)} · ${fmt(d.target)}`
        : `⌀${fmt(d.current)}`
    case 'value-label':
      switch (d.aggregationLabel) {
        case 'sum':
          return `Σ ${fmt(d.current)}`
        case 'avg':
          return `⌀${fmt(d.current)}`
        case 'days':
          return String(d.entryCount)
        default:
          return fmt(d.current)
      }
  }
  return fmt(props.data.current)
})

// Entry-days condition readout ("3/5 dni") appended after the primary aggregate.
const chipText = computed<string>(() => {
  const ed = props.data.entryDays
  if (!ed) return baseChipText.value
  const unit = t('planning.objects.targetSentence.entryDaysUnit')
  return `${baseChipText.value} · ${fmt(ed.current)}/${fmt(ed.target)} ${unit}`
})
</script>

<style scoped>
.context-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
  color: rgb(var(--neo-muted));
}

/* Met = the same blue as the "done" chart accent; missed = error. In-progress
   and target-less aggregates stay muted. */
.context-chip[data-status='met'] {
  color: rgb(var(--color-primary));
}

.context-chip[data-status='missed'] {
  color: rgb(var(--color-error));
}

.context-chip__glyph {
  font-size: 9px;
}
</style>
