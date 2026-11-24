<template>
  <ul class="rat" aria-label="Ocena tygodnia">
    <li v-for="tile in tiles" :key="tile.key">
      <button
        type="button"
        class="rat__tile"
        :class="{ 'rat__tile--empty': !tile.tone, 'is-active': active }"
        :style="tile.tone ? { '--rat-tint': tile.tone.field } : undefined"
        :aria-pressed="active"
        :aria-label="tile.title"
        :title="tile.title"
        @click="emit('open')"
      >
        <span class="rat__disc"><AppIcon :name="tile.icon" /></span>
        <strong class="rat__name">{{ tile.label }}</strong>
        <LoadStateTrack
          class="rat__track"
          :load="tile.load"
          :state="tile.state"
          :subject="tile.label"
        />
        <!-- pod kursorem: obie oceny jako kropki 1–5; kafel bez oceny nic nie odsłania -->
        <span v-if="tile.tone" class="rat__more" aria-hidden="true">
          <span class="rat__more-in">
            <span v-for="row in tile.rows" :key="row.label" class="rat__row">
              <small>{{ row.label }}</small>
              <span class="rat__dots">
                <i
                  v-for="n in 5"
                  :key="n"
                  class="mg-well mg-well--data mg-well--xs"
                  :class="{ 'mg-well--done': n <= row.value }"
                />
              </span>
            </span>
          </span>
        </span>
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import LoadStateTrack from '@/components/shared/charts/LoadStateTrack.vue'
import type { MaybeRating } from '@/domain/loadState'
import { loadStateTone } from '@/domain/loadStateTone'

/**
 * The week's own rating as four area tiles (decision 2026-11-14, UX Lab
 * `/concepts/week-rating-field`, direction C1). A tile carries the icon, the
 * name and the shared load & state mark, and takes the colour of its pair;
 * under the cursor it spells the two ratings out as dots on the 1–5 scale.
 * Like the completion tiles beside it, a tile is a shortcut to a table lens —
 * here the reflection of the week.
 */
export interface AreaRating {
  key: string
  label: string
  icon: string
  load: MaybeRating
  state: MaybeRating
}

const props = defineProps<{
  areas: AreaRating[]
  /** The reflection lens is the current view of the table. */
  active?: boolean
  /** The reflection is still a draft — said in the tile's description only. */
  draft?: boolean
}>()
const emit = defineEmits<{ open: [] }>()

const tiles = computed(() =>
  props.areas.map(area => {
    const rated = area.load != null && area.state != null
    return {
      ...area,
      tone: loadStateTone(area.load, area.state),
      rows: [
        { label: 'obciążenie', value: area.load ?? 0 },
        { label: 'stan', value: area.state ?? 0 },
      ],
      title: `${area.label}: ${
        rated ? `obciążenie ${area.load} z 5, stan ${area.state} z 5` : 'bez oceny'
      }${props.draft ? ' · szkic' : ''} · pokaż w tabeli: Refleksja`,
    }
  })
)
</script>

<style scoped>
.rat {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}
.rat > li {
  display: grid;
  min-width: 0;
}
/* kafel to kontrolka (przełącza widok tabeli) w kolorze swojej pary ocen: chmura w
   spoczynku, wyżej pod kursorem, wklęsła, gdy jej widok jest wybrany */
.rat__tile {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 8px;
  min-width: 0;
  padding: 14px 16px;
  border: 0;
  border-radius: var(--mg-radius-md);
  background: var(--rat-tint, var(--cp-field));
  box-shadow: var(--mg-shadow-control);
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition:
    box-shadow var(--mg-duration-fast) var(--mg-ease-standard),
    translate var(--mg-duration-fast) var(--mg-ease-standard);
}
.rat__tile:hover,
.rat__tile:focus-visible {
  box-shadow: var(--mg-shadow-control-hover);
  translate: 0 var(--mg-lift-hover);
}
.rat__tile.is-active,
.rat__tile.is-active:hover,
.rat__tile:active {
  box-shadow: var(--mg-shadow-inset-sm);
  translate: none;
}
.rat__disc {
  display: grid;
  place-items: center;
  width: 44px;
  height: 43px;
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--mg-color-veil-strong);
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-icon-lg);
}
.rat > li:nth-child(even) .rat__disc {
  border-radius: var(--mg-radius-icon-field-b);
}
.rat__tile--empty .rat__disc {
  background: var(--cp-inner);
}
.rat__name {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-sm);
  font-weight: var(--mg-weight-title);
  letter-spacing: 0.01em;
}
.rat__tile--empty .rat__name {
  color: var(--mg-color-muted);
}
.rat__track {
  margin-top: 4px;
}
/* odsłaniany blok rośnie od zera, więc treść kafla sama się centruje na nowo */
.rat__more {
  display: grid;
  grid-template-rows: 0fr;
  width: 100%;
  opacity: 0;
  transition:
    grid-template-rows var(--mg-duration-normal) var(--mg-ease-standard),
    opacity var(--mg-duration-normal) var(--mg-ease-standard);
}
.rat__more-in {
  display: grid;
  gap: 6px;
  min-height: 0;
  overflow: hidden;
}
.rat__more-in > :first-child {
  margin-top: 4px;
}
.rat__tile:hover .rat__more,
.rat__tile:focus-visible .rat__more {
  grid-template-rows: 1fr;
  opacity: 1;
}
.rat__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  text-align: left;
}
.rat__row small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-label);
}
/* kropki skali: kropka aplikacji jako dane (xs) — pełna do oceny, dalej płaski welon kafla */
.rat__dots {
  --mg-well-ground: var(--mg-color-veil-strong);
  display: inline-flex;
  gap: 4px;
}
@media (prefers-reduced-motion: reduce) {
  .rat__tile,
  .rat__more {
    transition: none;
  }
}
</style>
