<script setup lang="ts">
import { computed } from 'vue'
import StreamCard from './StreamCard.vue'
import StreamRing from './StreamRing.vue'
import type { StreamMatrixCellVM, StreamMatrixRowVM, StreamWeekVM } from './streamModel'
import { MATRIX_SECTIONS, composeCellLabel, type MatrixSection } from '@/domain/reflectionMatrix'
import { useT } from '@/composables/useT'

const props = defineProps<{
  week: StreamWeekVM
  weekLabel: string
  rangeLabel: string
  sectionLabels: Record<MatrixSection, string>
  ringLabels: Record<'goals' | 'habits' | 'intentions', string>
  index: number
}>()

defineEmits<{ select: [] }>()

const { t } = useT()

const labelStyle = computed(() => ({
  color: props.week.isCurrent
    ? 'rgb(var(--stream-accent, 112 168 232))'
    : 'rgb(var(--stream-ink, 15 39 69))',
}))

/** Composed cell label + raw rating, e.g. "Wymagania · Zadania: 5/5". */
function cellTitle(row: StreamMatrixRowVM, cell: StreamMatrixCellVM): string {
  const rating = cell.rating === null ? '—' : `${cell.rating}/5`
  return `${composeCellLabel(t, row.areaKey, cell.section)}: ${rating}`
}

function cellStyle(cell: StreamMatrixCellVM) {
  if (cell.color === null) {
    // Unrated: flat achromatic ghost — hue is reserved for actual ratings
    // (a mid rating of 3 is the solid blue-gray pill, see --rating-neutral).
    return {
      background: 'rgb(205 210 218 / 0.45)',
      boxShadow: 'none',
    }
  }
  return {
    background: cell.color,
    boxShadow: '0 1px 3px rgb(var(--neo-shadow-dark, 145 170 205) / 0.35)',
  }
}

function areaIconStyle(row: StreamMatrixRowVM) {
  const hasData = row.cells.some((cell) => cell.rating !== null)
  return {
    fontSize: '13px',
    color: hasData
      ? 'rgb(var(--stream-bar, 86 142 210) / 0.85)'
      : 'rgb(var(--stream-faint, 169 191 220))',
  }
}

</script>

<template>
  <StreamCard
    :current="week.isCurrent"
    :future="week.timeState === 'future'"
    :delay-ms="index * 30"
    @select="$emit('select')"
  >
    <div class="stream-week__head">
      <span class="stream-week__label" :style="labelStyle">{{ weekLabel }}</span>
      <span class="stream-week__range">{{ rangeLabel }}</span>
    </div>

    <!-- 4×3 reflection matrix: life-area rows × Demands/Actions/State columns.
         Rose = strain (Demands inverted), sky = ease/wellbeing. -->
    <div class="stream-week__matrix">
      <template v-for="row in week.matrix" :key="row.areaKey">
        <span class="material-symbols-outlined" :style="areaIconStyle(row)" aria-hidden="true">
          {{ row.icon }}
        </span>
        <span
          v-for="cell in row.cells"
          :key="cell.section"
          class="stream-week__cell"
          :style="cellStyle(cell)"
          :title="cellTitle(row, cell)"
        />
      </template>

      <span />
      <span
        v-for="section in MATRIX_SECTIONS"
        :key="section"
        class="stream-week__section-name"
      >
        {{ sectionLabels[section] }}
      </span>
    </div>

    <div class="stream-divider" />

    <div class="stream-rings">
      <StreamRing
        v-for="ring in week.rings"
        :key="ring.key"
        :pct="ring.pct"
        :plan-only="ring.planOnly"
        :num="ring.num"
        :den="ring.den"
        :size="52"
        :label="ringLabels[ring.key]"
      />
    </div>
  </StreamCard>
</template>

<style scoped>
.stream-week__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
  width: 100%;
}

.stream-week__label {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.stream-week__range {
  font-size: 11px;
  color: rgb(var(--stream-faint, 169 191 220));
  font-weight: 500;
}

.stream-week__matrix {
  display: grid;
  grid-template-columns: auto repeat(3, 1fr);
  align-items: center;
  justify-items: center;
  gap: 7px 10px;
  width: 100%;
}

.stream-week__cell {
  width: 100%;
  max-width: 32px;
  height: 14px;
  border-radius: 5px;
  animation: streamCellIn 0.4s both;
}

.stream-week__section-name {
  padding-top: 2px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: rgb(var(--stream-muted, 95 122 152));
  text-transform: uppercase;
  white-space: nowrap;
}

.stream-divider {
  height: 1px;
  width: 100%;
  background: rgb(var(--stream-track, 185 205 228) / 0.4);
  margin: 18px 0 16px;
}

.stream-rings {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
}

@keyframes streamCellIn {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stream-week__cell {
    animation: none;
  }
}
</style>
