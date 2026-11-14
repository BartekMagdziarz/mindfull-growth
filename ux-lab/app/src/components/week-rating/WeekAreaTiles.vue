<template>
  <ul class="wat" :class="[`wat--${hover}`, `wat--tint-${tint}`]" role="group" aria-label="Ocena tygodnia">
    <li v-for="area in AREAS" :key="area.key">
      <button
        type="button"
        class="wat__tile"
        :class="{ 'is-open': isOpen(area.key), 'is-empty': !tone(area.key) }"
        :style="tileStyle(area.key)"
        :aria-label="label(area)"
      >
        <span class="wat__disc"><AppIcon :name="area.icon" /></span>
        <strong class="wat__name">{{ area.label }}</strong>

        <!-- znak z produktu; w „dwóch torach” ustępuje miejsca rozłożonej wersji -->
        <span class="wat__mark">
          <LoadStateTrack class="wat__track" :load="pair(area.key).load" :state="pair(area.key).state" :subject="area.label" />
          <span v-if="hover === 'split' && tone(area.key)" class="wat__split" aria-hidden="true">
            <small>obciążenie</small>
            <i class="wat__rail"><i class="wat__rail-bar" :style="{ '--to': pair(area.key).load ?? 1, background: tone(area.key)?.fill }" /></i>
            <small>stan</small>
            <i class="wat__rail"><i class="mg-well mg-well--done wat__rail-dot" :style="{ '--at': pair(area.key).state ?? 1 }" /></i>
          </span>
        </span>

        <!-- odsłaniane pod znakiem: kropki 1–5 albo legenda znaku -->
        <span v-if="hover !== 'split' && tone(area.key)" class="wat__more" aria-hidden="true">
          <span class="wat__more-in">
            <template v-if="hover === 'dots'">
              <span class="wat__row">
                <small>obciążenie</small>
                <span class="wat__dots"><i v-for="n in 5" :key="n" :class="{ 'is-on': n <= (pair(area.key).load ?? 0) }" /></span>
              </span>
              <span class="wat__row">
                <small>stan</small>
                <span class="wat__dots"><i v-for="n in 5" :key="n" :class="{ 'is-on': n <= (pair(area.key).state ?? 0) }" /></span>
              </span>
            </template>
            <span v-else class="wat__legend">
              <span><i class="wat__key-bar" /><small>obciążenie</small><b>{{ pair(area.key).load }}</b></span>
              <span><i class="mg-well mg-well--done wat__key-dot" /><small>stan</small><b>{{ pair(area.key).state }}</b></span>
            </span>
          </span>
        </span>
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import AppIcon from '@product/components/shared/AppIcon.vue'
import LoadStateTrack from '@product/components/shared/charts/LoadStateTrack.vue'
import { loadStateTone } from '@product/domain/loadStateTone'
import { AREAS, type AreaKey, type TileHover, type TilePin, type TileTint, type WeekSample } from '~lab/lab/weekRatingField'

/**
 * Kierunek C, runda 2: cztery kafle obszarów w karcie podsumowania tygodnia.
 * W spoczynku ikona, nazwa i znak z produktu (słupek = obciążenie, kropka =
 * stan); pod kursorem kafel wyjaśnia znak na jeden z trzech sposobów. Kafel
 * jest kontrolką jak kafle wykonania: klik = spojrzenie „Refleksja” w tabeli.
 */
const props = withDefaults(
  defineProps<{
    week: WeekSample
    /** Co kafel odsłania pod kursorem. */
    hover?: TileHover
    /** Gdzie siedzi kolor pary ocen: cały kafel albo tylko pole ikony. */
    tint?: TileTint
    /** Stan „pod kursorem” przypięty na stałe — do oglądania bez myszy i do zrzutów. */
    pin?: TilePin
  }>(),
  { hover: 'dots', tint: 'tile', pin: 'none' },
)

/** Przypięty pojedynczy kafel: „Bliscy” — w próbkach to obszar o najciekawszej parze. */
const PINNED: AreaKey = 'closeOnes'

const pair = (key: AreaKey) => props.week.pairs[key]
const tone = (key: AreaKey) => loadStateTone(pair(key).load, pair(key).state)
const isOpen = (key: AreaKey) => props.pin === 'all' || (props.pin === 'one' && key === PINNED)

function tileStyle(key: AreaKey): Record<string, string> {
  const pairTone = tone(key)
  if (!pairTone) return {}
  return {
    '--wat-tint': pairTone.field,
    '--wat-disc': `color-mix(in oklab, ${pairTone.mark} 42%, var(--mg-color-paper))`,
    '--wat-mark': pairTone.mark,
    '--mg-well-field': pairTone.field,
    '--mg-well-mark': pairTone.mark,
  }
}
function label(area: (typeof AREAS)[number]): string {
  const { load, state } = pair(area.key)
  const rating = load == null || state == null ? 'bez oceny' : `obciążenie ${load} z 5, stan ${state} z 5`
  return `${area.label}: ${rating} · pokaż w tabeli: Refleksja`
}
</script>

<style scoped>
.wat { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; min-width: 0; margin: 0; padding: 0; list-style: none; }
.wat > li { display: grid; min-width: 0; }

/* kafel = kontrolka: chmura w spoczynku, wyżej pod kursorem, wklęsła pod palcem */
.wat__tile { display: grid; justify-items: center; align-content: center; gap: 8px; min-width: 0; padding: 14px 16px; border: 0; border-radius: var(--mg-radius-md); background: var(--cp-field); box-shadow: var(--mg-shadow-control); color: inherit; font: inherit; cursor: pointer; transition: background var(--mg-duration-fast) var(--mg-ease-standard), box-shadow var(--mg-duration-fast) var(--mg-ease-standard), translate var(--mg-duration-fast) var(--mg-ease-standard); }
.wat__tile:hover, .wat__tile:focus-visible, .wat__tile.is-open { box-shadow: var(--mg-shadow-control-hover); translate: 0 var(--mg-lift-hover); }
.wat__tile:active { box-shadow: var(--mg-shadow-inset-sm); translate: none; }
.wat__name { color: var(--mg-color-ink); font-size: var(--mg-font-size-sm); font-weight: var(--mg-weight-title); }
.wat__disc { display: grid; place-items: center; width: 44px; height: 43px; border-radius: var(--mg-radius-icon-field-a); background: var(--cp-inner); color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-icon-lg); transition: background var(--mg-duration-fast) var(--mg-ease-standard); }
.wat > li:nth-child(even) .wat__disc { border-radius: var(--mg-radius-icon-field-b); }

/* kolor: cały kafel w barwie pary ocen… */
.wat--tint-tile .wat__tile:not(.is-empty) { background: var(--wat-tint); }
.wat--tint-tile .wat__tile:not(.is-empty) .wat__disc { background: var(--mg-color-veil-strong); }
/* …albo kafel w mgle jak kafle wykonania, a barwa tylko w polu ikony. Pod kursorem kafel
   zostaje w mgle: na papierze zniknąłby tor znaku i puste kropki. */
.wat--tint-disc .wat__tile:not(.is-empty) .wat__disc { background: var(--wat-disc); }

.wat__mark { display: grid; width: 100%; margin-top: 4px; }
.wat__mark > * { grid-area: 1 / 1; align-self: center; }

/* odsłaniany blok: rośnie od zera, więc treść kafla sama się centruje na nowo */
.wat__more { display: grid; grid-template-rows: 0fr; width: 100%; opacity: 0; transition: grid-template-rows var(--mg-duration-normal) var(--mg-ease-standard), opacity var(--mg-duration-normal) var(--mg-ease-standard); }
.wat__more-in { display: grid; gap: 6px; min-height: 0; overflow: hidden; }
.wat__more-in > :first-child { margin-top: 4px; }
.wat__tile:hover .wat__more, .wat__tile:focus-visible .wat__more, .wat__tile.is-open .wat__more { grid-template-rows: 1fr; opacity: 1; }
.wat small { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: var(--mg-weight-label); }

/* 1 · kropki: dwie skale 1–5 w języku kropek natężenia z pickera emocji */
.wat__row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; text-align: left; }
.wat__dots { display: inline-flex; gap: 4px; }
.wat__dots i { display: grid; place-items: center; width: 12px; height: 12px; border-radius: var(--mg-radius-organic-a); background: var(--mg-color-veil-strong); }
.wat__dots i:nth-child(even) { border-radius: var(--mg-radius-organic-b); }
.wat__dots i.is-on::after { width: 58%; aspect-ratio: 1; border-radius: var(--mg-radius-organic-c); background: var(--mg-color-state); content: ''; }

/* 2 · legenda: kształt znaku, słowo, ocena */
.wat__legend { display: flex; justify-content: space-between; gap: 8px; }
.wat__legend > span { display: inline-flex; align-items: center; gap: 5px; }
.wat__legend b { color: var(--mg-color-ink); font-size: var(--mg-font-size-xs); font-weight: var(--mg-weight-title); font-variant-numeric: tabular-nums; }
.wat__key-bar { display: block; width: 14px; height: 8px; border-radius: var(--mg-radius-pill); background: var(--wat-mark); }
.wat__key-dot { --mg-well-size: 10px; }

/* 3 · dwa tory: znak rozłożony na słupek obciążenia i kropkę stanu */
.wat--split .wat__mark { min-height: 34px; }
.wat__track, .wat__split { transition: opacity var(--mg-duration-normal) var(--mg-ease-standard); }
.wat__split { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 8px 10px; opacity: 0; text-align: left; }
.wat--split .wat__tile:not(.is-empty):hover .wat__track, .wat--split .wat__tile:not(.is-empty):focus-visible .wat__track, .wat--split .wat__tile:not(.is-empty).is-open .wat__track { opacity: 0; }
.wat__tile:hover .wat__split, .wat__tile:focus-visible .wat__split, .wat__tile.is-open .wat__split { opacity: 1; }
.wat__rail { --size: 12px; --step: calc((100% - var(--size)) / 4); position: relative; display: block; height: var(--size); border-radius: var(--mg-radius-pill); background: var(--mg-color-veil-strong); }
.wat__rail-bar { position: absolute; inset: 0 auto 0 0; width: calc((var(--to) - 1) * var(--step) + var(--size)); border-radius: var(--mg-radius-pill); }
.wat__rail-dot { --mg-well-size: 10px; position: absolute; top: 1px; left: calc((var(--at) - 1) * var(--step) + 1px); }
</style>
