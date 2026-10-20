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
      <!-- główny element: ocena własna okresu -->
      <div
        class="ps__hero"
        :class="{ 'ps__hero--empty': !rating.exists, 'is-active': view === 'ratings' }"
      >
        <span class="ps__eyebrow"
          >{{
            scale === 'week'
              ? 'Ocena tygodnia'
              : scale === 'month'
                ? 'Ocena miesiąca'
                : 'Ocena roku'
          }}<small v-if="rating.status === 'draft'"> · szkic</small></span
        >
        <!-- skrót: oceny podokresów w tabeli (główna droga to lista w rogu tabeli) -->
        <button
          v-if="scale !== 'week'"
          type="button"
          class="ps__drill"
          :aria-pressed="view === 'ratings'"
          :title="`Pokaż w tabeli: ${scale === 'month' ? 'oceny tygodni' : 'oceny miesięcy'}`"
          @click="emit('focus', 'ratings')"
        >
          <AppIcon name="table_rows" />
        </button>
        <div class="ps__hero-cols" :class="{ 'ps__hero-cols--split': !!multiples }">
          <div class="ps__own">
            <!-- tydzień: zawsze 4 pary słupków Obciążenie/Stan per obszar (stan w kolorze ćwiartki; bez refleksji puste) -->
            <template v-if="scale === 'week'">
              <ul class="ps__bars ps__bars--pairs" aria-label="Obciążenie i Stan per obszar">
                <li v-for="(col, i) in bars" :key="i" :title="col.title">
                  <span class="ps__col" aria-hidden="true">
                    <i
                      v-for="(v, j) in col.values"
                      :key="j"
                      :class="[j === 0 ? 'l' : 's', { none: v === null }]"
                      :style="{
                        height: `${pct(v)}%`,
                        background: j === 1 && v !== null ? col.stateColor : undefined,
                      }"
                      ><b>{{ fmt1(v) }}</b></i
                    >
                  </span>
                  <small>{{ col.label }}</small>
                </li>
              </ul>
            </template>
            <!-- miesiąc (zawsze, bez refleksji puste) i rok: słupek per oś kompasu (rok = średnia refleksji miesięcy) -->
            <template v-else-if="rating.exists || scale === 'month'">
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
          <!-- miesiąc: tygodnie miesiąca jako wstęgi obszarów, 2 × 2 -->
          <div v-if="multiples" class="ps__multiples" :aria-label="multiples.caption">
            <span class="ps__eyebrow ps__multiples-cap">{{ multiples.caption }}</span>
            <div v-for="cell in multiples.cells" :key="cell.area" class="ps__multiple">
              <span><AppIcon :name="cell.icon" />{{ cell.label }}</span>
              <LoadStateRibbon
                :points="cell.points"
                :label="cell.label"
                :height="58"
                :show-axis="cell.axis"
                :tick-every="cell.points.length > 4 ? 2 : 1"
                quiet
                @select="ref => emit('open-week', ref)"
              />
            </div>
          </div>
        </div>
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
          <span class="ps__tile-label">{{ tile.label }}</span>
          <!-- pierścień wypełniony zgodnie z procentem -->
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
import LoadStateRibbon from '@/components/shared/charts/LoadStateRibbon.vue'
import { pairColor, toRating } from '@/domain/loadState'
import {
  AREAS,
  AREA_ICONS,
  AREA_KEYS,
  COMPASS,
  FAMILY_GROUPS,
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
import { FAMILY_VIEW } from './rhythmRows'
import type { PeriodRef, WeekRef } from '@/domain/period'
import { getPeriodBounds } from '@/utils/periods'

/**
 * Podsumowanie okresu: ocena własna i wykonanie per rodzina. Rytuały (plan / refleksja) są w nagłówku kalendarza.
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
  /** Klik w tydzień wstęgi: zoom w ten tydzień. */ 'open-week': [weekRef: WeekRef]
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

/** Kolumny wykresu oceny: tydzień = 4 obszary × [Obciążenie, Stan] (stan w kolorze ćwiartki pary; bez refleksji puste); miesiąc/rok = 5 osi kompasu. */
const bars = computed(() => {
  const r = rating.value
  if (props.scale === 'week') {
    return AREAS.map((area, i) => {
      const load = r.load?.[i] ?? null
      const state = r.state?.[i] ?? null
      return {
        label: area,
        values: [load, state],
        stateColor: pairColor(toRating(load), toRating(state)),
        title: `${area}: obciążenie ${load ?? '–'}, stan ${state ?? '–'}`,
      }
    })
  }
  return COMPASS.map((axis, i) => ({
    label: axis,
    values: [r.compass?.[i] ?? null],
    stateColor: undefined,
    title: `${axis} ${fmt1(r.compass?.[i] ?? null)} / 5`,
  }))
})

/** Wstęgi obszarów w karcie oceny: tylko miesiąc (tygodnie miesiąca); tydzień pokazuje wyłącznie siebie, rok ma wstęgi w tabeli. */
const multiples = computed(() => {
  if (props.scale !== 'month') return null
  const weekRefs = unitWeekRefs(props.units)
  if (!weekRefs.length) return null
  const series = areaSeriesFor(props.scenario, weekRefs)
  const anyRated = AREA_KEYS.some(area => series[area].some(p => p.load != null && p.state != null))
  if (!anyRated) return null
  return {
    caption: 'Tygodnie · obciążenie i stan',
    cells: AREA_KEYS.map((area, i) => ({
      area,
      label: AREAS[i],
      icon: AREA_ICONS[i],
      points: series[area],
      axis: i >= 2,
    })),
  }
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
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.ps__eyebrow small {
  color: var(--mg-color-muted);
  font-size: 11px;
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
  border-radius: 17px 14px 18px 15px;
  background: var(--cp-inner);
  color: var(--mg-color-ink);
  font: inherit;
  font-size: 13.5px;
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
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  color: var(--cp-mark);
  background: var(--cp-inner);
}
.ps__orb {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 29px;
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  color: var(--cp-mark);
  background: var(--cp-inner);
}
.ps__orb .material-symbols-outlined {
  font-size: 18px;
}
.ps__toggle {
  flex: none;
}
.ps__empty {
  font-size: 13px;
  color: var(--mg-color-muted);
  margin: 0;
}

/* ocena bierze szerszą kolumnę (rating-first); rodziny mieszczą się w węższej jako 2 × 2 */
.ps__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(300px, 1fr);
  gap: 14px;
  align-items: stretch;
}
/* tydzień: bez wstęg obok oceny, więc ocena zwęża się na rzecz kafli wykonania */
.ps--week .ps__grid {
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
}

/* ocena: wgłębienie w papierze, jak dołek w widoku Dzisiaj */
.ps__hero {
  position: relative;
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 14px 18px;
  border-radius: var(--mg-radius-md);
  background: var(--cp-field);
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
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
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
  font-size: 17px;
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
  border-radius: 9px 7px 3px 4px / 8px 9px 3px 3px;
  background: var(--cp-accent);
  transform: rotate(-1.2deg);
}
.ps__col i:nth-child(even) {
  transform: rotate(1deg);
  border-radius: 7px 9px 4px 3px / 9px 8px 3px 3px;
}
.ps__bars--pairs {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-flow: row;
  margin-top: 14px;
}
.ps__bars--pairs li {
  gap: 8px;
}
.ps__bars--pairs .ps__col {
  gap: 7px;
  height: 104px;
}
.ps__bars--pairs .ps__col i {
  width: 26px;
}
.ps__bars--pairs .ps__col i.none b {
  color: var(--mg-color-muted);
}
.ps__bars.ps__bars--pairs small {
  font-size: 11.5px;
}
/* miesiąc: kompas w tej samej wysokości co pary tygodnia */
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
  font-size: 11.5px;
}
.ps__col .l {
  background: rgb(var(--sky-800));
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
.ps__hero-cols--split {
  grid-template-columns: auto minmax(0, 1fr);
}
.ps__hero-cols--split .ps__own {
  padding-top: 18px;
}
.ps__multiples {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 18px;
  min-width: 0;
}
.ps__multiples-cap {
  grid-column: 1 / -1;
}
.ps__multiple {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.ps__multiple > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--mg-color-muted);
  font-size: 11.5px;
  font-weight: 800;
}
.ps__multiple > span .material-symbols-outlined {
  font-size: 15px;
  color: var(--cp-mark);
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
  font-size: 10.5px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.ps__bars small {
  color: var(--mg-color-muted);
  font-size: 10.5px;
  font-weight: 800;
  text-align: center;
}
.ps__legend {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--mg-color-muted);
  font-size: 11px;
  font-weight: 800;
}
.ps__legend i {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 3px 2px 3px 2px;
}
.ps__none {
  margin: 4px 0 0;
  color: var(--mg-color-muted);
  font-size: 14px;
}
.ps__hero--empty {
  align-content: start;
}

/* rodziny: cztery kafle 2 × 2 — pełna nazwa i procent w organicznym pierścieniu */
.ps__fam {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
.ps__tile:hover {
  background: var(--cp-inner);
}
.ps__tile {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 12px;
  min-width: 0;
  min-height: 74px;
  padding: 10px 14px 10px 18px;
  border-radius: var(--mg-radius-md);
  background: var(--cp-field);
}
.ps__tile:nth-child(even) {
  border-radius: 14px 18px 15px 17px;
}
.ps__tile--none .ps__tile-label {
  color: var(--mg-color-muted);
}
.ps__tile-label {
  color: var(--mg-color-ink);
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.01em;
}
.ps__ring {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: var(--mg-radius-organic-a);
  background: conic-gradient(var(--cp-accent) var(--fill), var(--cp-inner) 0);
  transform: rotate(-4deg);
}
.ps__ring-in {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
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
  font-size: 12px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}
.ps__pct span {
  color: var(--mg-color-muted);
  font-size: 8px;
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
  font-size: 14px;
  line-height: 1.5;
}
.ps__quote span {
  flex: none;
  color: var(--mg-color-muted);
  font-size: 12px;
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
  font-size: 18px;
}
.ps__narrative p {
  margin: 0;
  max-width: 70ch;
  font-size: 14px;
  line-height: 1.7;
}
</style>
