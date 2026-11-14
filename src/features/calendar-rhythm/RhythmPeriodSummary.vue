<template>
  <section class="ps" :class="`ps--${scale}`" :aria-label="`Podsumowanie · ${title}`">
    <!-- tydzień i miesiąc: bez nagłówka — fokus i treść refleksji okresu są spojrzeniami tabeli; rok zostaje przy chipach i motywie -->
    <header v-if="scale === 'year'" class="ps__head">
      <div class="ps__focus">
        <span class="ps__eyebrow">{{ focusLabel }}</span>
        <button
          v-for="item in focusItems"
          :key="item.key"
          type="button"
          class="ps__chip"
          :class="{ 'is-active': view === item.row }"
          :aria-pressed="view === item.row"
          :title="`Pokaż w tabeli: ${item.title}`"
          @click="emit('focus', item.row)"
        >
          <span class="ps__orb"><AppIcon :name="item.icon ?? 'near_me'" /></span>
          <span>{{ item.title }}</span>
        </button>
        <span v-if="!focusItems.length" class="ps__empty">Brak wybranego fokusu</span>
      </div>
      <button
        type="button"
        class="cp-btn cp-btn--quiet ps__toggle"
        :aria-expanded="open"
        @click="emit('toggle')"
      >
        {{ open ? 'Zwiń' : 'Więcej' }}<AppIcon :name="open ? 'expand_less' : 'expand_more'" />
      </button>
    </header>

    <div class="ps__grid">
      <!-- tydzień: ocena własna jako cztery kafle obszarów w kolorze pary ocen; klik = spojrzenie „Refleksja” -->
      <RhythmAreaTiles
        v-if="scale === 'week'"
        :areas="areaRatings"
        :active="view === 'reflection'"
        :draft="rating.status === 'draft'"
        @open="emit('focus', 'reflection')"
      />
      <!-- miesiąc i rok: ocena własna okresu jako pole z kompasem -->
      <div
        v-else
        class="ps__hero"
        :class="{ 'ps__hero--empty': !rating.exists, 'is-active': view === 'ratings' }"
      >
        <span class="ps__eyebrow"
          >{{ scale === 'month' ? 'Ocena miesiąca' : 'Ocena roku'
          }}<small v-if="rating.status === 'draft'"> · szkic</small></span
        >
        <!-- skrót: oceny miesięcy w tabeli (główna droga to lista w rogu tabeli); w miesiącu
             tygodnie są w polu obok, więc skrótu nie ma -->
        <button
          v-if="scale === 'year'"
          type="button"
          class="ps__drill"
          :aria-pressed="view === 'ratings'"
          title="Pokaż w tabeli: oceny miesięcy"
          @click="emit('focus', 'ratings')"
        >
          <AppIcon name="table_rows" />
        </button>
        <div class="ps__hero-cols">
          <div class="ps__own">
            <!-- miesiąc (zawsze, bez refleksji puste) i rok: słupek per oś kompasu (rok = średnia refleksji miesięcy) -->
            <template v-if="rating.exists || scale === 'month'">
              <ul
                class="ps__bars"
                :class="{ 'ps__bars--tall': scale === 'month' }"
                aria-label="Kompas"
              >
                <li v-for="(col, i) in bars" :key="i" :title="col.title">
                  <span class="ps__col" aria-hidden="true">
                    <i
                      v-for="(v, j) in col.values"
                      :key="j"
                      class="s"
                      :class="{ none: v === null }"
                      :style="{ height: `${pct(v)}%` }"
                      ><b v-if="v !== null || scale === 'month'">{{ fmt1(v) }}</b></i
                    >
                  </span>
                  <small>{{ col.label }}</small>
                </li>
              </ul>
              <small v-if="scale === 'year' && rating.months" class="ps__legend"
                >refleksje {{ rating.months.done }} z {{ rating.months.total }} miesięcy</small
              >
            </template>
            <p v-else class="ps__none">
              {{ future ? 'Okres jeszcze się nie zaczął.' : 'Brak refleksji miesięcy.' }}
            </p>
          </div>
        </div>
      </div>

      <!-- miesiąc: obciążenie i stan tygodni jako osobne pole — tygodnie w wierszach, obszary w kolumnach -->
      <div v-if="weekSeries" class="ps__hero ps__ls">
        <span class="ps__eyebrow">Obciążenie i stan</span>
        <LoadStateMatrix
          :series="weekSeries"
          :areas="LOAD_STATE_AREAS"
          @open-week="ref => emit('open-week', ref)"
        />
      </div>

      <!-- wykonanie per rodzina: pełna nazwa i procent w pierścieniu; ułamek i podstawa w podpowiedzi -->
      <ul class="ps__fam" aria-label="Wykonanie w okresie">
        <li
          v-for="tile in tiles"
          :key="tile.id"
          class="ps__tile"
          :class="{ 'ps__tile--none': !tile.total, 'is-active': view === FAMILY_VIEW[tile.id] }"
        >
          <button
            type="button"
            class="ps__tile-hit"
            :aria-pressed="view === FAMILY_VIEW[tile.id]"
            :aria-label="`${tile.label}: ${tile.total ? `${tile.percent}%` : 'brak obiektów'} · pokaż w tabeli`"
            :title="`${tile.title}${tile.total ? ` · ${tile.done} / ${tile.total}` : ''} · pokaż w tabeli`"
            @click="emit('focus', FAMILY_VIEW[tile.id])"
          />
          <!-- pierścień wypełniony zgodnie z procentem, podpis pod nim -->
          <span
            class="ps__ring"
            :style="{ '--fill': `${tile.total ? tile.percent : 0}%` }"
            aria-hidden="true"
          >
            <span class="ps__ring-in">
              <strong v-if="tile.total" class="ps__pct">{{ tile.percent }}<span>%</span></strong>
              <strong v-else class="ps__pct ps__dash">–</strong>
            </span>
          </span>
          <span class="ps__tile-label">{{ tile.label }}</span>
        </li>
      </ul>
    </div>

    <p v-if="yearPlan && !open && scale === 'year'" class="ps__quote">
      <span>Motyw roku</span>{{ yearPlan.motif }}
    </p>

    <div v-if="open && scale === 'year'" class="ps__body">
      <div v-if="yearPlan" class="ps__narrative">
        <h4>{{ yearPlan.motif }}</h4>
        <p>{{ yearPlan.narrative }}</p>
      </div>
      <p v-else class="ps__empty">Brak zapisanego motywu roku.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import LoadStateMatrix from '@/components/shared/charts/LoadStateMatrix.vue'
import { toRating } from '@/domain/loadState'
import {
  COMPASS,
  FAMILY_GROUPS,
  LOAD_STATE_AREAS,
  areaSeriesFor,
  directionsForPeriod,
  periodRating,
  periodStats,
  periodTitle,
  unitWeekRefs,
  type CompletionBasis,
  type Scale,
  type TimeUnit,
} from './rhythmProjections'
import type { RhythmScenario } from './rhythmScenario'
import RhythmAreaTiles, { type AreaRating } from './RhythmAreaTiles.vue'
import { FAMILY_VIEW } from './rhythmRows'
import type { PeriodRef, WeekRef } from '@/domain/period'
import { getPeriodBounds } from '@/utils/periods'

/**
 * Podsumowanie okresu: ocena własna i wykonanie per rodzina. W tygodniu ocena to cztery kafle
 * obszarów (`RhythmAreaTiles`), w miesiącu i roku — pole z kompasem. Rytuały (plan / refleksja) są w nagłówku kalendarza.
 * Tydzień i miesiąc nie mają nagłówka karty ani „Więcej” — fokus i treść refleksji okresu to spojrzenia tabeli.
 * Rok zostaje przy chipach fokusu i motywie roku (rozwijany „Więcej”).
 */
const props = defineProps<{
  scenario: RhythmScenario
  scale: Scale
  periodRef: string
  units: TimeUnit[]
  open: boolean
  /** Aktualne spojrzenie tabeli — kafle i chipy są skrótami do listy w rogu tabeli. */
  view?: string
}>()
const emit = defineEmits<{
  toggle: []
  focus: [row: string]
  /** Klik w komórkę pola „Obciążenie i stan”: zoom w ten tydzień. */ 'open-week': [
    weekRef: WeekRef,
  ]
}>()

const title = computed(() => periodTitle(props.scale, props.periodRef))
const yearPlan = computed(() => props.scenario.yearPlans?.find(p => p.yearRef === props.periodRef))
const bounds = computed(() => getPeriodBounds(props.periodRef as PeriodRef))
const future = computed(() => bounds.value.start > props.scenario.clock)
const stats = computed(() => periodStats(props.scenario, props.scale, props.periodRef, props.units))
const rating = computed(() =>
  periodRating(props.scenario, props.scale, props.periodRef, props.units)
)
const focusLabel = 'Fokus roku'

const BASIS_LABEL: Record<CompletionBasis, string> = {
  targets: 'spełnione cele zamkniętych okresów',
  actions: 'zapisane działania z planu do dziś',
  presence: 'jednostki czasu z zapisem',
  none: 'nic do sprawdzenia',
}

const tiles = computed(() =>
  FAMILY_GROUPS.map(g => {
    const stat = stats.value.families[g.id]
    return {
      id: g.id,
      label: g.label,
      icon: g.icon,
      done: stat.done,
      total: stat.total,
      objects: stat.objects,
      percent: stat.total ? Math.round((stat.done / stat.total) * 100) : 0,
      title: `${g.label}: ${stat.objects} w okresie · ${(stat.bases.length ? stat.bases : ['none' as const]).map(b => BASIS_LABEL[b]).join(' + ')}`,
    }
  })
)

/** Chipy fokusu roku: motyw roku albo suma fokusu miesięcy. */
const focusItems = computed(() => {
  const keys = yearPlan.value?.topPriorityKeys
  const priorities = keys
    ? keys.flatMap(key => props.scenario.priorities.filter(p => p.key === key))
    : directionsForPeriod(props.scenario, props.scale, props.periodRef, props.units).focus
  return priorities.map(p => ({ ...p, row: `dir:${p.key}` }))
})

/** Kolumny kompasu: miesiąc — ocena własna, rok — średnia refleksji miesięcy. */
const bars = computed(() =>
  COMPASS.map((axis, i) => ({
    label: axis,
    values: [rating.value.compass?.[i] ?? null],
    title: `${axis} ${fmt1(rating.value.compass?.[i] ?? null)} / 5`,
  }))
)

/** Tydzień: własne oceny obciążenia i stanu per obszar — kafle `RhythmAreaTiles`. */
const areaRatings = computed<AreaRating[]>(() =>
  LOAD_STATE_AREAS.map((area, i) => ({
    ...area,
    load: toRating(rating.value.load?.[i] ?? null),
    state: toRating(rating.value.state?.[i] ?? null),
  }))
)

/** Obciążenie i stan tygodni miesiąca dla pola obok oceny; tydzień pokazuje wyłącznie siebie, rok ma tygodnie w tabeli. */
const weekSeries = computed(() => {
  if (props.scale !== 'month') return null
  const weekRefs = unitWeekRefs(props.units)
  return weekRefs.length ? areaSeriesFor(props.scenario, weekRefs) : null
})
function fmt1(value: number | null): string {
  return value === null
    ? '–'
    : Number.isInteger(value)
      ? String(value)
      : value.toFixed(1).replace('.', ',')
}
function pct(value: number | null): number {
  return value === null ? 0 : (value / 5) * 100
}
</script>

<style scoped>
.ps {
  display: grid;
  gap: 14px;
  padding: 16px 20px;
  border: 1px solid var(--cp-line);
  border-radius: var(--mg-radius-lg);
  background: var(--cp-card);
  box-shadow: var(--mg-shadow-rhythm-card);
}
.ps__eyebrow {
  color: var(--cp-mark);
  font-size: var(--mg-font-size-xs);
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.ps__eyebrow small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  letter-spacing: 0;
  text-transform: none;
}

.ps__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.ps__focus {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
}
.ps__chip {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  max-width: 260px;
  padding: 3px 12px 3px 4px;
  border: 1px solid var(--cp-line);
  border-radius: var(--mg-radius-md);
  background: var(--cp-inner);
  color: var(--mg-color-ink);
  font: inherit;
  font-size: var(--mg-font-size-sm);
  font-weight: 800;
  text-align: left;
  cursor: pointer;
  box-shadow: var(--mg-shadow-rhythm-card);
}
.ps__chip:hover {
  background: var(--cp-inner);
}
.ps__chip.is-active {
  background: var(--cp-inner);
}
.ps__chip:hover .ps__orb {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 29px;
  border-radius: var(--mg-radius-organic-a);
  color: var(--cp-mark);
  background: var(--cp-inner);
}
.ps__orb {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 29px;
  border-radius: var(--mg-radius-organic-b);
  color: var(--cp-mark);
  background: var(--cp-inner);
}
.ps__orb .material-symbols-outlined {
  font-size: var(--mg-font-size-icon-md);
}
.ps__toggle {
  flex: none;
}
.ps__empty {
  font-size: var(--mg-font-size-sm);
  color: var(--mg-color-muted);
  margin: 0;
}

/* ocena bierze resztę szerokości (rating-first); rodziny to wąska siatka 2 × 2 po prawej */
.ps__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: stretch;
}
/* miesiąc: trzy pola — kompas (szerokość z treści), obciążenie i stan (reszta), wykonanie */
.ps--month .ps__grid {
  grid-template-columns: auto minmax(0, 1fr) auto;
}
/* miesiąc: pola mają nagłówek u góry, a treść wyśrodkowaną w pionie */
.ps--month .ps__hero {
  grid-template-rows: auto 1fr;
}
.ps--month .ps__hero-cols,
.ps__ls > .ls-matrix {
  align-self: center;
}
.ps__ls {
  gap: 8px;
}
/* rok: ocena bierze całą resztę karty, ale wykres nie rozjeżdża się na jej szerokość */
.ps--year .ps__bars {
  max-width: 38rem;
}

/* ocena: blok zagnieżdżony w karcie podsumowania — mgła z połową cienia karty */
.ps__hero {
  position: relative;
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 14px 18px;
  border-radius: var(--mg-radius-md);
  background: var(--cp-field);
  box-shadow: var(--mg-shadow-nested);
}
.ps__hero.is-active,
.ps__tile.is-active {
  background: var(--cp-inner);
}
.ps__drill {
  position: absolute;
  top: 10px;
  right: 10px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 29px;
  border: 0;
  border-radius: var(--mg-radius-organic-c);
  background: transparent;
  color: var(--mg-color-muted);
  cursor: pointer;
}
.ps__drill:hover,
.ps__drill[aria-pressed='true'] {
  background: var(--cp-inner);
  color: var(--mg-color-ink);
}
.ps__drill .material-symbols-outlined {
  font-size: var(--mg-font-size-icon-md);
}
.ps__bars {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 8px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}
.ps__bars li {
  display: grid;
  justify-items: center;
  gap: 6px;
  min-width: 0;
}
.ps__col {
  display: inline-flex;
  gap: 5px;
  align-items: flex-end;
  height: 74px;
}
.ps__col i {
  position: relative;
  display: inline-block;
  width: 22px;
  min-height: 3px;
  border-radius: var(--mg-radius-sketch-a);
  background: var(--cp-accent);
  transform: rotate(-1.2deg);
}
.ps__col i:nth-child(even) {
  transform: rotate(1deg);
  border-radius: var(--mg-radius-sketch-b);
}
/* miesiąc: wyższy kompas obok pola obciążenia i stanu */
.ps__bars--tall {
  margin-top: 14px;
}
.ps__bars--tall li {
  gap: 8px;
}
.ps__bars--tall .ps__col {
  height: 104px;
}
.ps__bars--tall .ps__col i.none b {
  color: var(--mg-color-muted);
}
.ps__bars.ps__bars--tall small {
  font-size: var(--mg-font-size-xs);
}
.ps__col .s,
.ps__legend .s {
  background: var(--cp-accent);
}
.ps__hero-cols {
  display: grid;
  gap: 10px 26px;
  align-items: start;
}
.ps__col i.none {
  background: var(--cp-inner);
  min-height: 3px;
}
.ps__col i b {
  position: absolute;
  left: 50%;
  bottom: 100%;
  transform: translate(-50%, -2px);
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-xs);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.ps__bars small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-chart);
  font-weight: 800;
  text-align: center;
}
.ps__legend {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-chart);
  font-weight: 800;
}
.ps__legend i {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: var(--mg-radius-sketch-c);
}
.ps__none {
  margin: 4px 0 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
}
.ps__hero--empty {
  align-content: start;
}

/* rodziny: cztery wąskie kafle 2 × 2 — procent w organicznym pierścieniu u góry, nazwa pod nim
   (jak kafle kompasu w „Dzisiaj”) */
.ps__fam {
  display: grid;
  grid-template-columns: repeat(2, 106px);
  grid-auto-rows: 1fr;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ps__tile-hit {
  position: absolute;
  inset: 0;
  border: 0;
  border-radius: inherit;
  background: transparent;
  cursor: pointer;
}
/* kafel to kontrolka (przełącza widok tabeli): chmura w spoczynku, wyżej pod
   kursorem, wklęsła, gdy jej widok jest wybrany */
.ps__tile {
  position: relative;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 8px;
  min-width: 0;
  min-height: 104px;
  padding: 12px 6px;
  border-radius: var(--mg-radius-md);
  background: var(--cp-field);
  box-shadow: var(--mg-shadow-control);
  transition:
    background var(--mg-duration-fast) var(--mg-ease-standard),
    box-shadow var(--mg-duration-fast) var(--mg-ease-standard),
    translate var(--mg-duration-fast) var(--mg-ease-standard);
}
.ps__tile:hover {
  background: var(--cp-inner);
  box-shadow: var(--mg-shadow-control-hover);
  translate: 0 var(--mg-lift-hover);
}
.ps__tile.is-active,
.ps__tile.is-active:hover,
.ps__tile:has(> .ps__tile-hit:active) {
  box-shadow: var(--mg-shadow-inset-sm);
  translate: none;
}
.ps__tile:nth-child(even) {
  border-radius: var(--mg-radius-md);
}
.ps__tile--none .ps__tile-label {
  color: var(--mg-color-muted);
}
.ps__tile-label {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-sm);
  font-weight: 800;
  letter-spacing: 0.01em;
}
.ps__ring {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border-radius: var(--mg-radius-organic-a);
  background: conic-gradient(var(--cp-accent) var(--fill), var(--cp-inner) 0);
  transform: rotate(-4deg);
}
.ps__ring-in {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: inherit;
  background: var(--cp-field);
  transform: rotate(4deg);
}
.ps__tile:nth-child(even) .ps__ring {
  border-radius: var(--mg-radius-organic-b);
  transform: rotate(3deg);
}
.ps__tile:nth-child(even) .ps__ring-in {
  transform: rotate(-3deg);
}
.ps__tile:hover .ps__ring-in,
.ps__tile.is-active .ps__ring-in {
  background: var(--cp-inner);
}
.ps__pct {
  display: inline-flex;
  align-items: baseline;
  white-space: nowrap;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-sm);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}
.ps__pct span {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
}
.ps__dash {
  color: var(--mg-color-muted);
}
.ps__quote {
  display: flex;
  gap: 10px;
  align-items: baseline;
  margin: 0;
  padding-left: 12px;
  border-left: 2px solid var(--mg-color-state-soft);
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-sm);
  line-height: 1.5;
}
.ps__quote span {
  flex: none;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}

.ps__body {
  display: grid;
  justify-items: stretch;
  gap: 16px;
  padding: 16px 4px 4px;
  border-top: 1px solid var(--cp-line);
}
h4 {
  margin: 0 0 6px;
  font-size: var(--mg-font-size-lg);
}
.ps__narrative p {
  margin: 0;
  max-width: 70ch;
  font-size: var(--mg-font-size-sm);
  line-height: 1.7;
}
</style>
