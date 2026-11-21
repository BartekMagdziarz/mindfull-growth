<template>
  <section class="asm">
    <div class="asm__field">
      <div class="asm__y" aria-hidden="true">
        <span>{{ area.state.high }}</span>
        <strong>Stan</strong>
        <span>{{ area.state.low }}</span>
      </div>
      <div class="asm__grid" role="group" :aria-label="`${area.label}: obciążenie i stan`">
        <button
          v-for="cell in cells"
          :key="`${cell.load}-${cell.state}`"
          type="button"
          class="asm__cell"
          :class="{ 'is-on': cell.on }"
          :style="{ '--asm-tint': cell.tone.field, '--asm-fill': cell.tone.fill, '--mg-well-field': cell.tone.field, '--mg-well-mark': cell.tone.mark }"
          :aria-pressed="cell.on"
          :aria-label="`Obciążenie ${cell.load}, stan ${cell.state}`"
          :title="cell.title"
          @click="emit('pick', cell.on ? null : cell.load, cell.on ? null : cell.state)"
        >
          <i v-if="cell.on" class="mg-well mg-well--done asm__dot" />
          <!-- wcześniejsze tygodnie, które wypadły w tym polu -->
          <span v-else-if="cell.past.length" class="asm__past">
            <i v-for="week in cell.past.slice(-2)" :key="week.label" class="mg-well mg-well--done" />
          </span>
        </button>
      </div>
      <div class="asm__x" aria-hidden="true">
        <span>{{ area.load.low }}</span>
        <strong>Obciążenie</strong>
        <span>{{ area.load.high }}</span>
      </div>
    </div>

    <div class="asm__side">
      <!-- kafel obszaru z karty tygodnia: ikona, nazwa, znak w kolorze pary -->
      <div class="asm__tile" :style="tone ? { '--asm-tile': tone.field } : undefined">
        <span class="asm__disc"><AppIcon :name="area.icon" /></span>
        <strong>{{ area.label }}</strong>
        <LoadStateTrack :load="draft.load" :state="draft.state" :subject="`${area.label} · ten tydzień`" />
      </div>
      <div v-for="axis in AXES" :key="axis" class="asm__tags">
        <div class="asm__tags-head">
          <small>{{ AXIS_TITLE[axis] }}</small>
          <details class="qr-help">
            <summary :aria-label="`Co oznacza ${AXIS_TITLE[axis]}?`">?</summary>
            <p>{{ area[axis].hint }}</p>
          </details>
        </div>
        <AreaTagLine
          :model-value="draft.tags[axis]"
          :suggestions="suggestions[axis]"
          :label="`${area.label} · ${AXIS_TITLE[axis]}`"
          @update:model-value="emit('tags', axis, $event)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import LoadStateTrack from '@product/components/shared/charts/LoadStateTrack.vue'
import { loadStateTone, type LoadStateTone } from '@product/domain/loadStateTone'
import { AXES, AXIS_TITLE, mapCells, type AreaDef, type AreaDraft, type AxisKey, type PastWeek } from '~lab/lab/areaRatingStep'
import AreaTagLine from './AreaTagLine.vue'

/**
 * C · „Mapa tygodnia”. Jedno pole 5 × 5 zamiast dwóch skal: w prawo
 * obciążenie, w górę stan, każde pole w kolorze swojej pary. Klik ustawia obie
 * oceny naraz; wcześniejsze tygodnie leżą w polach jako małe kropki.
 */
const props = defineProps<{
  area: AreaDef
  draft: AreaDraft
  past: PastWeek[]
  suggestions: Record<AxisKey, string[]>
}>()
const emit = defineEmits<{ pick: [load: number | null, state: number | null]; tags: [axis: AxisKey, tags: string[]] }>()

const tone = computed(() => loadStateTone(props.draft.load, props.draft.state))
const cells = computed(() =>
  mapCells(props.past).map(cell => {
    const on = props.draft.load === cell.load && props.draft.state === cell.state
    const weeks = cell.past.map(week => week.label).join(', ')
    return {
      ...cell,
      on,
      // para 1–5 zawsze ma kolor
      tone: loadStateTone(cell.load, cell.state) as LoadStateTone,
      title: `Obciążenie ${cell.load}, stan ${cell.state}${weeks ? ` · tak było w tygodniu od ${weeks}` : ''}`,
    }
  })
)
</script>

<style scoped>
.asm {
  display: grid;
  grid-template-columns: auto minmax(0, 18rem);
  justify-content: center;
  align-items: center;
  align-content: start;
  gap: 34px;
  width: min(100%, 900px);
  margin: 0 auto;
}
.asm__field {
  display: grid;
  grid-template-columns: auto auto;
  gap: 10px 14px;
  padding: 24px 28px 18px 22px;
  border-radius: var(--mg-radius-lg);
  background: var(--mg-color-mist);
  box-shadow: var(--mg-shadow-nested);
}
.asm__y,
.asm__x {
  display: flex;
  justify-content: space-between;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  line-height: 1.4;
}
.asm__y {
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}
.asm__x {
  grid-column: 2;
  align-items: baseline;
}
.asm__y strong,
.asm__x strong {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-sm);
  font-weight: var(--mg-weight-strong);
}
.asm__grid {
  display: grid;
  grid-template-columns: repeat(5, 4.25rem);
  grid-auto-rows: 2.75rem;
  gap: 6px;
}
/* pole mapy: chmurka w barwie swojej pary; płaska jak stopień skali, wypukła dopiero wybrana */
.asm .asm__cell {
  display: grid;
  place-items: center;
  padding: 0;
  border-radius: var(--mg-radius-cloud-a);
  background: var(--asm-tint);
  transition:
    box-shadow var(--mg-duration-fast) var(--mg-ease-standard),
    translate var(--mg-duration-fast) var(--mg-ease-standard);
}
.asm .asm__cell:nth-child(2n) {
  border-radius: var(--mg-radius-cloud-b);
}
.asm .asm__cell:hover {
  box-shadow: var(--mg-shadow-control-hover);
  translate: 0 var(--mg-lift-hover);
}
.asm .asm__cell.is-on {
  background: var(--asm-fill);
  box-shadow: var(--mg-shadow-control);
}
.asm__dot {
  --mg-well-size: 1.5rem;
}
.asm__past {
  --mg-well-size: 1rem;
  display: inline-flex;
  gap: 3px;
}
.asm__side {
  display: grid;
  gap: var(--mg-space-4);
  min-width: 0;
}
.asm__tile {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px 12px;
  padding: 14px 16px;
  border-radius: var(--mg-radius-md);
  background: var(--asm-tile, var(--mg-color-mist));
  box-shadow: var(--mg-shadow-nested);
}
.asm__tile strong {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-md);
  font-weight: var(--mg-weight-title);
}
.asm__tile :deep(.ls-track) {
  grid-column: 1 / -1;
}
.asm__disc {
  display: grid;
  place-items: center;
  width: 44px;
  height: 43px;
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--mg-color-veil-strong);
  color: var(--mg-color-primary-strong);
}
.asm__disc :deep(.app-icon) {
  font-size: var(--mg-font-size-icon-lg);
}
.asm__tags {
  display: grid;
  gap: 6px;
}
.asm__tags-head {
  display: flex;
  align-items: center;
  gap: var(--mg-space-2);
}
.asm__tags-head small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-label);
}
.asm__tags-head .qr-help > p {
  right: auto;
  left: 0;
}
</style>
