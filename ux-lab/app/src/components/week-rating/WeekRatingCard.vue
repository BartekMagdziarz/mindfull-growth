<template>
  <section class="ps" :class="[`ps--${variant}`, { 'ps--solo': solo }]" :aria-label="`Podsumowanie tygodnia · ${variant}`">
    <div class="ps__grid">
      <!-- stan obecny i A: jeden wiersz, obszary w kolumnach -->
      <div v-if="variant === 'now' || variant === 'a'" class="ps__hero">
        <span class="ps__eyebrow">Ocena tygodnia</span>
        <div class="ps__line">
          <div v-for="area in AREAS" :key="area.key" class="ps__line-cell">
            <span class="ps__area"><AppIcon :name="area.icon" /><span>{{ area.label }}</span></span>
            <LoadStateTrack v-bind="track(area.key)" />
          </div>
        </div>
      </div>

      <!-- B: macierz z miesiąca — wcześniejsze tygodnie, pod nimi ten -->
      <div v-else-if="variant === 'b'" class="ps__hero">
        <span class="ps__eyebrow">Ocena tygodnia</span>
        <div class="ps__hist" role="group" aria-label="Obciążenie i stan w ostatnich tygodniach">
          <span aria-hidden="true" />
          <span v-for="area in AREAS" :key="area.key" class="ps__area ps__area--col"><AppIcon :name="area.icon" /><span>{{ area.label }}</span></span>
          <template v-for="past in week.history" :key="past.label">
            <small class="ps__hist-week">{{ past.label }}</small>
            <span v-for="area in AREAS" :key="area.key" class="ps__hist-cell">
              <LoadStateTrack :load="past.pairs[area.key].load" :state="past.pairs[area.key].state" :subject="`${area.label} · tydzień od ${past.label}`" size="sm" />
            </span>
          </template>
          <div class="ps__hist-now">
            <strong class="ps__hist-week">{{ week.label }}</strong>
            <span v-for="area in AREAS" :key="area.key" class="ps__hist-cell">
              <LoadStateTrack v-bind="track(area.key)" />
            </span>
          </div>
        </div>
      </div>

      <!-- C: obszar = kafel w kolorze pary ocen (runda 2: hover zamiast słów) -->
      <WeekAreaTiles v-else-if="variant === 'c'" :week="week" :hover="hover" :tint="tint" :pin="pin" />

      <!-- D, E: ocena wąsko — obszary w wierszach -->
      <div v-else-if="variant === 'd' || variant === 'e'" class="ps__hero ps__hero--narrow">
        <span class="ps__eyebrow">Ocena tygodnia</span>
        <ul class="ps__rows">
          <li v-for="area in AREAS" :key="area.key">
            <span class="ps__area"><AppIcon :name="area.icon" /><span>{{ area.label }}</span></span>
            <LoadStateTrack v-bind="track(area.key)" />
          </li>
        </ul>
      </div>

      <!-- F: mapa obciążenie × stan -->
      <div v-else class="ps__hero">
        <span class="ps__eyebrow">Ocena tygodnia</span>
        <div class="ps__map-body">
          <div class="ps__map-wrap">
            <small class="ps__map-y">stan</small>
            <div class="ps__map" role="img" :aria-label="mapLabel">
              <span
                v-for="cell in cells"
                :key="`${cell.load}-${cell.state}`"
                class="ps__cell"
                :class="{ 'is-on': cell.areas.length, 'is-many': cell.areas.length > 1 }"
                :style="{ background: cellFill(cell.load, cell.state, cell.areas.length > 0) }"
              >
                <span v-for="area in cell.areas" :key="area.key" class="ps__pin" :title="area.label"><AppIcon :name="area.icon" /></span>
              </span>
            </div>
            <small class="ps__map-x">obciążenie</small>
          </div>
          <ul class="ps__verdicts">
            <li v-for="area in AREAS" :key="area.key">
              <span class="ps__vdisc" :style="{ background: tone(area.key)?.field }"><AppIcon :name="area.icon" /></span>
              <span><strong>{{ area.label }}</strong><small>{{ word(area.key) ?? 'bez oceny' }}</small></span>
            </li>
          </ul>
        </div>
      </div>

      <!-- D: emocje zapisane w trakcie tygodnia -->
      <div v-if="variant === 'd'" class="ps__hero ps__emo">
        <span class="ps__eyebrow">Emocje tygodnia</span>
        <div class="ps__emo-body">
          <ol class="ps__emo-days">
            <li v-for="day in week.days" :key="day.label" :title="`${day.label}: ${day.emotions.length ? `${day.emotions.length} zapisy emocji` : 'bez zapisu'}`">
              <span class="ps__emo-stack">
                <i
                  v-for="(quadrant, i) in day.emotions"
                  :key="i"
                  :style="{ background: `var(--color-quadrant-${quadrant})`, borderColor: `var(--color-quadrant-${quadrant}-border)` }"
                />
              </span>
              <small>{{ day.label }}</small>
            </li>
          </ol>
          <ul class="ps__emo-words">
            <li
              v-for="item in week.words"
              :key="item.label"
              :style="{ background: `var(--color-quadrant-${item.quadrant}-tint)`, color: `var(--color-quadrant-${item.quadrant}-text)` }"
            >
              {{ item.label }}
            </li>
          </ul>
        </div>
      </div>

      <!-- E: kotwice refleksji, po jednym zdaniu -->
      <button v-if="variant === 'e' && week.anchors.length" type="button" class="ps__hero ps__words" title="Pokaż w tabeli: Refleksja">
        <span class="ps__eyebrow">Z refleksji</span>
        <ul>
          <li v-for="anchor in week.anchors" :key="anchor.key" :title="anchor.label">
            <span class="ps__wdisc"><AppIcon :name="anchor.icon" /></span>
            <p>{{ anchor.text }}</p>
          </li>
        </ul>
      </button>

      <!-- wykonanie per rodzina: bez zmian poza A (rząd zamiast 2 × 2) -->
      <ul class="ps__fam" aria-label="Wykonanie w okresie">
        <li v-for="tile in week.tiles" :key="tile.label" class="ps__tile">
          <span class="ps__ring" :style="{ '--fill': `${tile.pct ?? 0}%` }">
            <span class="ps__ring-in"><strong v-if="tile.pct != null">{{ tile.pct }}<span>%</span></strong><strong v-else class="ps__dash">–</strong></span>
          </span>
          <span class="ps__tile-label" :class="{ 'ps__tile-label--none': tile.pct == null }">{{ tile.label }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import LoadStateTrack from '@product/components/shared/charts/LoadStateTrack.vue'
import { loadStateTone } from '@product/domain/loadStateTone'
import WeekAreaTiles from '~lab/components/week-rating/WeekAreaTiles.vue'
import { AREAS, mapCells, type AreaKey, type DirectionId, type TileHover, type TilePin, type TileTint, type WeekSample } from '~lab/lab/weekRatingField'
import type { Rating } from '~lab/lab/weekLoadState'

/**
 * Replika karty podsumowania tygodnia (`RhythmPeriodSummary`, skala tygodnia)
 * w geometrii produktu: 1132 px, pole oceny + kafle wykonania. `variant`
 * wybiera kierunek rundy 1; znak i kolory to komponent i funkcja z produktu.
 */
const props = defineProps<{
  variant: 'now' | DirectionId
  week: WeekSample
  /** Tylko kierunek C: wersja hovera, zasięg koloru i przypięty stan „pod kursorem”. */
  hover?: TileHover
  tint?: TileTint
  pin?: TilePin
}>()

/** Słowa o obszarze: najpierw obciążenie, potem stan — legenda, której sam słupek nie ma. */
const LOAD_WORDS = ['mało', 'mało', 'średnio', 'dużo', 'dużo']
const STATE_WORDS = ['źle', 'źle', 'średnio', 'dobrze', 'dobrze']

const track = (key: AreaKey) => {
  const area = AREAS.find(item => item.key === key)!
  return { load: props.week.pairs[key].load, state: props.week.pairs[key].state, subject: `${area.label} · tydzień od ${props.week.label}` }
}
const tone = (key: AreaKey) => loadStateTone(props.week.pairs[key].load, props.week.pairs[key].state)
function word(key: AreaKey): string | null {
  const { load, state } = props.week.pairs[key]
  if (load == null || state == null) return null
  return load === 3 && state === 3 ? 'zwyczajnie' : `${LOAD_WORDS[load - 1]} · ${STATE_WORDS[state - 1]}`
}

/** E bez refleksji: pole słów znika, ocena zostaje sama. */
const solo = computed(() => props.variant === 'e' && !props.week.anchors.length)

const cells = computed(() => mapCells(props.week))
/** Komórka z obszarem świeci swoim kolorem; pusta jest ledwie zabarwiona. */
function cellFill(load: Rating, state: Rating, on: boolean): string {
  const pair = loadStateTone(load, state)
  if (!pair) return ''
  return on ? pair.mark : `color-mix(in oklab, ${pair.mark} 30%, var(--mg-color-paper))`
}
const mapLabel = computed(() =>
  AREAS.map(area => {
    const { load, state } = props.week.pairs[area.key]
    return load == null || state == null ? `${area.label}: bez oceny` : `${area.label}: obciążenie ${load}, stan ${state}`
  }).join('; '),
)
</script>

<style scoped>
/* karta i pola: wymiary z RhythmPeriodSummary */
.ps { padding: 16px 20px; border: 1px solid var(--cp-line); border-radius: var(--mg-radius-lg); background: var(--cp-card); box-shadow: var(--mg-shadow-rhythm-card); }
.ps__eyebrow { color: var(--cp-mark); font-size: var(--mg-font-size-xs); font-weight: var(--mg-weight-title); letter-spacing: 0.1em; text-transform: uppercase; }
.ps__grid { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 14px; align-items: stretch; }
.ps--d .ps__grid, .ps--e .ps__grid { grid-template-columns: auto minmax(0, 1fr) auto; }
.ps--solo .ps__grid { grid-template-columns: minmax(0, 1fr) auto; }
.ps__hero { display: grid; grid-template-rows: auto 1fr; align-content: start; gap: 10px; min-width: 0; padding: 14px 18px; border: 0; border-radius: var(--mg-radius-md); background: var(--cp-field); box-shadow: var(--mg-shadow-nested); color: inherit; font: inherit; text-align: left; }
.ps__hero > :last-child { align-self: center; }

/* nazwa obszaru: jak nagłówek kolumny macierzy */
.ps__area { display: inline-flex; align-items: center; gap: 8px; min-width: 0; color: var(--mg-color-ink); font-size: var(--mg-font-size-sm); font-weight: var(--mg-weight-strong); }
.ps__area :deep(.app-icon) { color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-icon-md); }

/* stan obecny: jeden wiersz, 46 rem */
.ps__line { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); max-width: 46rem; }
.ps__line-cell { display: grid; gap: 10px; padding: 0 6px; }

/* A · ciasny pas: niższe pole, kafle w jednym rzędzie */
.ps--a .ps__hero { gap: 8px; padding: 12px 18px; }
.ps--a .ps__line { max-width: none; }
.ps--a .ps__line-cell { gap: 8px; padding: 0 10px 0 0; }
.ps--a .ps__fam { grid-template-columns: repeat(4, 92px); }
.ps--a .ps__tile { min-height: 0; gap: 6px; padding: 10px 6px; }
.ps--a .ps__ring { width: 46px; height: 46px; }
.ps--a .ps__ring-in { width: 35px; height: 35px; }
.ps--a .ps__ring-in strong { font-size: var(--mg-font-size-xs); }

/* B · macierz: tygodnie w wierszach, obszary w kolumnach; ten tydzień na papierze */
.ps__hist { display: grid; grid-template-columns: 52px repeat(4, minmax(0, 1fr)); align-items: center; max-width: 46rem; }
.ps__area--col { padding: 0 6px 6px; }
.ps__hist-week { padding-left: 8px; color: var(--mg-color-muted); font-size: var(--mg-font-size-chart); font-weight: var(--mg-weight-label); font-variant-numeric: tabular-nums; }
.ps__hist-cell { display: grid; padding: 4px 6px; }
.ps__hist-now { display: grid; grid-column: 1 / -1; grid-template-columns: subgrid; align-items: center; margin-top: 4px; border-radius: var(--mg-radius-sm); background: var(--mg-color-paper); }
.ps__hist-now .ps__hist-week { color: var(--mg-color-ink); font-weight: var(--mg-weight-title); }
.ps__hist-now .ps__hist-cell { padding: 6px; }

/* D, E · ocena wąsko: nazwa po lewej, słupek po prawej */
.ps__hero--narrow { width: 318px; }
.ps--solo .ps__hero--narrow { width: auto; }
.ps__rows { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
.ps__rows li { display: grid; grid-template-columns: 98px minmax(0, 1fr); align-items: center; }
.ps--solo .ps__rows { width: 282px; }

/* D · emocje: dzień = kolumna kropek w kolorach ćwiartek, obok najczęstsze słowa */
.ps__emo-body { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: end; gap: 36px; }
.ps__emo-days { display: grid; grid-auto-flow: column; grid-auto-columns: 36px; gap: 4px; margin: 0; padding: 0; list-style: none; }
.ps__emo-days li { display: grid; justify-items: center; gap: 8px; }
.ps__emo-stack { display: flex; flex-direction: column-reverse; align-items: center; gap: 5px; min-height: 70px; }
.ps__emo-stack i { display: block; width: 20px; height: 20px; border: 1px solid transparent; border-radius: var(--mg-radius-organic-a); }
.ps__emo-stack i:nth-child(even) { border-radius: var(--mg-radius-organic-b); }
.ps__emo-days small { color: var(--mg-color-muted); font-size: var(--mg-font-size-chart); font-weight: var(--mg-weight-label); }
.ps__emo-words { display: flex; flex-wrap: wrap; align-content: end; gap: 8px; margin: 0; padding: 0 0 26px; list-style: none; }
.ps__emo-words li { padding: 4px 12px; border-radius: var(--mg-radius-pill); font-size: var(--mg-font-size-sm); font-weight: var(--mg-weight-label); }

/* E · zdania z refleksji: całe pole jest skrótem do spojrzenia „Refleksja” */
.ps__words { cursor: pointer; transition: background var(--mg-duration-fast) var(--mg-ease-standard); }
.ps__words:hover { background: var(--cp-inner); }
.ps__words ul { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.ps__words li { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 12px; }
.ps__words p { display: -webkit-box; margin: 0; overflow: hidden; color: var(--mg-color-ink); font-size: var(--mg-font-size-sm); line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.ps__wdisc { display: grid; place-items: center; width: 34px; height: 33px; border-radius: var(--mg-radius-icon-field-a); background: var(--cp-inner); color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-icon-md); }
.ps__words li:nth-child(even) .ps__wdisc { border-radius: var(--mg-radius-icon-field-b); }

/* F · mapa: 5 × 5, stan w górę, obciążenie w prawo */
.ps__map-body { display: grid; grid-template-columns: auto auto; justify-content: center; align-items: center; gap: 56px; }
.ps__map-wrap { display: grid; grid-template-columns: auto auto; align-items: center; gap: 4px 8px; }
.ps__map { display: grid; grid-template-columns: repeat(5, 29px); grid-auto-rows: 29px; gap: 3px; }
.ps__cell { display: grid; place-items: center; border-radius: var(--mg-radius-xs); }
.ps__cell.is-many { grid-template-columns: repeat(2, auto); gap: 1px; }
.ps__pin { display: grid; place-items: center; width: 22px; height: 22px; border-radius: var(--mg-radius-icon-field-a); background: var(--mg-color-paper); color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-icon-sm); }
.ps__cell.is-many .ps__pin { width: 14px; height: 14px; font-size: var(--mg-font-size-mark); }
.ps__map-y { color: var(--mg-color-muted); font-size: var(--mg-font-size-chart); font-weight: var(--mg-weight-label); writing-mode: vertical-rl; rotate: 180deg; }
.ps__map-x { grid-column: 2; color: var(--mg-color-muted); font-size: var(--mg-font-size-chart); font-weight: var(--mg-weight-label); text-align: center; }
.ps__verdicts { display: grid; grid-template-columns: repeat(2, minmax(150px, auto)); gap: 18px 32px; margin: 0; padding: 0; list-style: none; }
.ps__verdicts li { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 10px; }
.ps__verdicts li > span:last-child { display: grid; gap: 1px; }
.ps__verdicts strong { color: var(--mg-color-ink); font-size: var(--mg-font-size-sm); font-weight: var(--mg-weight-title); }
.ps__verdicts small { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: var(--mg-weight-label); }
.ps__vdisc { display: grid; place-items: center; width: 36px; height: 35px; border-radius: var(--mg-radius-icon-field-a); background: var(--cp-inner); color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-icon-md); }
.ps__verdicts li:nth-child(even) .ps__vdisc { border-radius: var(--mg-radius-icon-field-b); }

/* kafle wykonania: pierścień u góry, podpis pod nim */
.ps__fam { display: grid; grid-template-columns: repeat(2, 106px); grid-auto-rows: 1fr; gap: 10px; margin: 0; padding: 0; list-style: none; }
.ps__tile { display: grid; justify-items: center; align-content: center; gap: 8px; min-height: 111px; padding: 12px 6px; border-radius: var(--mg-radius-md); background: var(--cp-field); box-shadow: var(--mg-shadow-control); }
.ps__tile-label { color: var(--mg-color-ink); font-size: var(--mg-font-size-sm); font-weight: var(--mg-weight-title); }
.ps__tile-label--none { color: var(--mg-color-muted); }
.ps__ring { display: grid; place-items: center; width: 60px; height: 60px; border-radius: var(--mg-radius-organic-a); background: conic-gradient(var(--cp-accent) var(--fill), var(--cp-inner) 0); transform: rotate(-4deg); }
.ps__tile:nth-child(even) .ps__ring { border-radius: var(--mg-radius-organic-b); }
.ps__ring-in { display: grid; place-items: center; width: 46px; height: 46px; border-radius: inherit; background: var(--cp-field); transform: rotate(4deg); }
.ps__ring-in strong { display: inline-flex; align-items: baseline; color: var(--mg-color-ink); font-size: var(--mg-font-size-sm); font-weight: var(--mg-weight-title); font-variant-numeric: tabular-nums; }
.ps__ring-in strong span { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); }
.ps__ring-in .ps__dash { color: var(--mg-color-muted); }
</style>
