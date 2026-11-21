<template>
  <section class="ast-step">
  <ul class="ast" aria-label="Ocena tygodnia w czterech obszarach">
    <li
      v-for="tile in tiles"
      :key="tile.area.key"
      class="ast__tile"
      :class="{ 'ast__tile--empty': !tile.tone }"
      :style="tile.tone ? { '--ast-tint': tile.tone.field } : undefined"
    >
      <span class="ast__disc"><AppIcon :name="tile.area.icon" /></span>
      <strong class="ast__name">{{ tile.area.label }}</strong>
      <!-- znak kafla; pod kursorem i w fokusie dymek z wcześniejszymi tygodniami -->
      <div class="ast__mark" :class="{ 'is-pinned': pinned === tile.area.key }" tabindex="0" :aria-label="`${tile.area.label}: znak tygodnia, wcześniejsze tygodnie w dymku`">
        <LoadStateTrack :load="tile.draft.load" :state="tile.draft.state" :subject="`${tile.area.label} · ten tydzień`" />
        <div v-if="tile.past.length" class="mg-v2-popover ast__pop">
          <AreaHistory :weeks="tile.past" :subject="tile.area.label" size="xs" newest-first />
        </div>
      </div>
      <div v-for="axis in AXES" :key="axis" class="ast__axis">
        <div
          class="ast__row"
          role="radiogroup"
          :aria-label="`${tile.area.label} · ${AXIS_TITLE[axis]}`"
          @keydown.left.prevent="step(tile.area.key, axis, -1)"
          @keydown.right.prevent="step(tile.area.key, axis, 1)"
          @keydown.delete.prevent="emit('rate', tile.area.key, axis, null)"
          @keydown.backspace.prevent="emit('rate', tile.area.key, axis, null)"
        >
          <small :title="tile.area[axis].hint">{{ AXIS_TITLE[axis].toLocaleLowerCase('pl') }}</small>
          <span class="ast__dots">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              role="radio"
              class="ast__dot"
              :aria-checked="tile.draft[axis] === n"
              :aria-label="`${AXIS_TITLE[axis]}: ${n} z 5`"
              :title="n === 1 ? tile.area[axis].low : n === 5 ? tile.area[axis].high : `${n} z 5`"
              @click="emit('rate', tile.area.key, axis, tile.draft[axis] === n ? null : n)"
            >
              <i class="mg-well" :class="{ 'mg-well--done': n <= (tile.draft[axis] ?? 0) }" />
            </button>
          </span>
        </div>
        <AreaTagLine
          tinted
          :model-value="tile.draft.tags[axis]"
          :suggestions="suggestions(tile.area.key, axis)"
          :label="`${tile.area.label} · ${AXIS_TITLE[axis]}`"
          :limit="3"
          @update:model-value="emit('tags', tile.area.key, axis, $event)"
        />
      </div>
    </li>
  </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import LoadStateTrack from '@product/components/shared/charts/LoadStateTrack.vue'
import { loadStateTone } from '@product/domain/loadStateTone'
import { AREAS, AXES, AXIS_TITLE, type AreaKey, type AxisKey, type Draft, type PastWeek } from '~lab/lab/areaRatingStep'
import AreaHistory from './AreaHistory.vue'
import AreaTagLine from './AreaTagLine.vue'

/**
 * D · „Cztery kafle, jeden krok”. Kafle obszarów z karty tygodnia w kalendarzu
 * (`RhythmAreaTiles`, kierunek C1) w trybie edycji: te same dwa wiersze kropek
 * 1–5, tylko klikalne, a kafel przybiera kolor pary w trakcie oceniania.
 * Historia nie zajmuje miejsca — to dymek pod znakiem.
 */
const props = defineProps<{
  draft: Draft
  past: Record<AreaKey, PastWeek[]>
  suggestions: (area: AreaKey, axis: AxisKey) => string[]
  /** Obszar z dymkiem historii przypiętym na stałe (zrzuty). */
  pinned?: AreaKey | null
}>()
const emit = defineEmits<{
  rate: [area: AreaKey, axis: AxisKey, value: number | null]
  tags: [area: AreaKey, axis: AxisKey, tags: string[]]
}>()

const tiles = computed(() =>
  AREAS.map(area => {
    const draft = props.draft[area.key]
    return { area, draft, past: props.past[area.key], tone: loadStateTone(draft.load, draft.state) }
  })
)
function step(area: AreaKey, axis: AxisKey, delta: number) {
  const next = Math.max(0, Math.min(5, (props.draft[area][axis] ?? 0) + delta))
  emit('rate', area, axis, next || null)
}
</script>

<style scoped>
.ast {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: stretch;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}
/* kafel to pole z kontrolkami, nie kontrolka: cień zagnieżdżenia, bez unoszenia */
.ast__tile {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 8px;
  min-width: 0;
  padding: 18px 16px 16px;
  border-radius: var(--mg-radius-lg);
  background: var(--ast-tint, var(--mg-color-mist));
  box-shadow: var(--mg-shadow-nested);
  transition: background var(--mg-duration-normal) var(--mg-ease-standard);
}
.ast__disc {
  display: grid;
  place-items: center;
  width: 44px;
  height: 43px;
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--mg-color-veil-strong);
  color: var(--mg-color-primary-strong);
}
.ast > li:nth-child(even) .ast__disc {
  border-radius: var(--mg-radius-icon-field-b);
}
.ast__disc :deep(.app-icon) {
  font-size: var(--mg-font-size-icon-lg);
}
.ast__name {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-md);
  font-weight: var(--mg-weight-title);
}
.ast__mark {
  position: relative;
  width: 100%;
  margin: 4px 0 6px;
  border-radius: var(--mg-radius-pill);
}
.ast__pop {
  position: absolute;
  top: calc(100% + 8px);
  right: -4px;
  left: -4px;
  padding: 12px 12px 12px 14px;
  opacity: 0;
  pointer-events: none;
  translate: 0 -4px;
  transition:
    opacity var(--mg-duration-fast) var(--mg-ease-standard),
    translate var(--mg-duration-fast) var(--mg-ease-standard);
}
.ast__mark:hover .ast__pop,
.ast__mark:focus-visible .ast__pop,
.ast__mark.is-pinned .ast__pop {
  opacity: 1;
  translate: none;
}
.ast__axis {
  display: grid;
  gap: 6px;
  width: 100%;
  min-width: 0;
}
.ast__axis + .ast__axis {
  margin-top: 6px;
}
.ast__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}
.ast__row small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-label);
}
/* kropki skali jak pod kursorem w kalendarzu: pełne do oceny, puste dalej */
.ast__dots {
  --mg-well-size: 1.125rem;
  display: inline-flex;
}
.ast .ast__dot {
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.75rem;
  padding: 0;
  border-radius: var(--mg-radius-pill);
  background: transparent;
}
.ast__dot .mg-well:not(.mg-well--done) {
  border-color: transparent;
  background: var(--mg-color-veil-strong);
  box-shadow: none;
}
.ast__dot:hover .mg-well:not(.mg-well--done) {
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-control);
}
@media (prefers-reduced-motion: reduce) {
  .ast__tile,
  .ast__pop {
    transition: none;
  }
}
</style>
