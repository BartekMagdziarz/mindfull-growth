<template>
  <div class="cal-matrix">
    <div class="cal-matrix__paper">
      <CalendarLensBar
        :title="title"
        :lens="lens"
        :scale="scale"
        :is-today="isTodayFocused"
        @shift="shift"
        @today="goToday"
        @scale="setScale"
        @lens="lens = $event"
      />

      <div class="mx-body">
        <!-- lewa kolumna: okres w skrócie -->
        <aside class="mx-brief">
          <small>{{ stateLabel }}</small>
          <h2>{{ periodTitle(panelRef) }}</h2>
          <ul class="mx-brief__lines">
            <li v-for="def in LENSES" :key="def.id" :class="{ active: def.id === lens }">
              <span><AppIcon :name="def.icon" /> {{ def.label }}</span>
              <b>{{ lensReading(panelMetrics, def.id).text || '–' }}</b>
            </li>
          </ul>
          <div class="mx-brief__ritual">
            <template v-if="panelMetrics.kind === 'day'">
              <button type="button" class="mx-cta" @click="openDay(panelRef)"><AppIcon name="wb_sunny" /> Otwórz dzień</button>
            </template>
            <template v-else-if="panelMetrics.ritual === 'due' || panelMetrics.ritual === 'missing'">
              <button type="button" class="mx-cta" :class="{ quiet: panelMetrics.ritual === 'missing' }" @click="openRitual(panelRef)">
                <AppIcon :name="panelMetrics.ritual === 'due' ? 'task_alt' : 'history_edu'" /> {{ panelMetrics.ritual === 'due' ? ritualLabel('due', panelMetrics.kind) : 'Otwórz refleksję' }}
              </button>
            </template>
            <template v-else-if="panelMetrics.ritual === 'done'">
              <span class="mx-brief__done"><RitualDot status="done" :kind="panelMetrics.kind" /> {{ ritualLabel('done', panelMetrics.kind) }}</span>
            </template>
          </div>
          <blockquote v-if="panelMetrics.ritual === 'done'" class="mx-brief__journal">
            {{ panelMetrics.kind === 'month' ? fixture.ritual.monthlyJournal : fixture.ritual.weeklyJournal }}
          </blockquote>
          <button v-if="panelMetrics.kind !== 'day' && panelMetrics.ref !== focusRef" type="button" class="mx-enter" @click="drill(panelRef)"><AppIcon name="zoom_in" /> Wejdź</button>
          <p v-if="actionNote" class="mx-note">{{ actionNote }}</p>
        </aside>

        <!-- prawa część: jedna oś czasu, sekcje soczewek jako wiersze -->
        <div class="mx-grid" :style="{ '--cols': units.length }">
          <div class="mx-head">
            <span class="mx-corner" />
            <button
              v-for="unit in units"
              :key="unit.ref"
              type="button"
              class="mx-col"
              :class="{ selected: unit.ref === panelRef, current: unit.state === 'current', future: unit.state === 'future' }"
              @click="select(unit.ref)"
              @dblclick="drill(unit.ref)"
            >
              <strong>{{ scale === 'year' ? monthShort(unit.ref) : unit.label }}</strong>
              <small>{{ scale === 'year' ? '' : unit.sublabel }}</small>
              <RitualDot :status="unit.ritual" :kind="unit.kind" />
            </button>
          </div>

          <template v-for="def in LENSES" :key="def.id">
            <button
              type="button"
              class="mx-section"
              :class="{ open: lens === def.id }"
              :aria-expanded="lens === def.id"
              @click="lens = def.id"
            >
              <span class="mx-section__name"><AppIcon :name="lens === def.id ? 'expand_more' : 'chevron_right'" /> {{ def.label }}</span>
              <span
                v-for="unit in units"
                :key="unit.ref"
                class="mx-cell"
                :class="{ selected: unit.ref === panelRef }"
              >
                <LensMark :reading="lensReading(unit, def.id)" size="sm" />
              </span>
            </button>
            <div v-if="lens === def.id" class="mx-rows">
              <div v-for="row in expandedRows(def.id)" :key="row.name" class="mx-row">
                <span class="mx-row__name" :title="row.name">
                  <i v-if="row.glyph" class="glyph" :class="`glyph--${row.glyph}`" />{{ row.name }}
                </span>
                <span
                  v-for="(cell, index) in row.cells"
                  :key="index"
                  class="mx-cell mx-cell--text"
                  :class="[cell.tone, { selected: units[index].ref === panelRef }]"
                  :title="cell.title"
                >{{ cell.text }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import CalendarLensBar from '~lab/components/calendar/CalendarLensBar.vue'
import LensMark from '~lab/components/calendar/LensMark.vue'
import RitualDot from '~lab/components/calendar/RitualDot.vue'
import {
  AREAS,
  FAMILY_GLYPH,
  LENSES,
  QUADRANTS,
  lensReading,
  monthShort,
  periodTitle,
  ritualLabel,
  type LensId,
  type PeriodMetrics,
} from '~lab/lab/calendarConceptData'
import { useCalendarState } from '~lab/lab/useCalendarState'

const props = defineProps<{ presetId: string }>()
const {
  fixture, scale, focusRef, lens, title, isTodayFocused, units, panelRef, panelMetrics, actionNote,
  shift, goToday, setScale, select, drill, openDay, openRitual,
} = useCalendarState(props.presetId)

const stateLabel = computed(() => panelMetrics.value.state === 'past' ? 'zamknięty' : panelMetrics.value.state === 'current' ? 'w toku' : 'plan')

interface MatrixCell { text: string; tone: 'met' | 'missed' | 'muted' | 'none'; title?: string }
interface MatrixRow { name: string; glyph?: string; cells: MatrixCell[] }

const dash: MatrixCell = { text: '–', tone: 'none' }

function execCell(met: number, total: number, state: PeriodMetrics['state']): MatrixCell {
  if (state === 'future') return { text: String(total), tone: 'muted', title: `Plan: ${total}` }
  return { text: `${met}/${total}`, tone: total && met / total >= 0.7 ? 'met' : 'missed' }
}

/** Rozwinięta sekcja: wiersze obiektów lub składowych soczewki na tej samej osi kolumn. */
function expandedRows(lensId: LensId): MatrixRow[] {
  const list = units.value
  switch (lensId) {
    case 'rytm': {
      if (scale.value === 'week') {
        return [{ name: 'Wykonane / plan', cells: list.map(unit => (unit.state === 'future' ? { text: String(unit.day!.planned), tone: 'muted' } : { text: `${unit.day!.done}/${unit.day!.planned}`, tone: unit.day!.planned && unit.day!.done / unit.day!.planned >= 0.7 ? 'met' : 'missed' })) }]
      }
      const cadence = scale.value === 'year' ? 'monthly' : 'weekly'
      return fixture.value.objects
        .filter(object => object.cadence === cadence && object.status !== 'orphan' && object.family !== 'intention')
        .map(object => ({
          name: object.title,
          glyph: FAMILY_GLYPH[object.family],
          cells: list.map(unit => {
            const point = object.chart.find(item => item.periodRef === unit.ref)
            if (!point || point.value === undefined) return unit.state === 'future' ? { text: '·', tone: 'muted' } : dash
            return { text: point.target !== undefined ? `${point.value}/${point.target}` : String(point.value), tone: point.status === 'met' ? 'met' : point.status === 'missed' ? 'missed' : 'none' }
          }),
        }))
    }
    case 'stan':
      return AREAS.map((area, index) => ({
        name: area,
        cells: list.map(unit => (unit.ratings ? { text: `${unit.ratings.effort[index]} · ${unit.ratings.state[index]}`, tone: 'none', title: `Wysiłek ${unit.ratings.effort[index]} · stan ${unit.ratings.state[index]}` } : dash)),
      }))
    case 'emocje':
      return QUADRANTS.map(quadrant => ({
        name: quadrant.label,
        cells: list.map(unit => (unit.emotions && unit.emotions.count ? { text: String(unit.emotions.quadrants[quadrant.id]), tone: 'none' } : dash)),
      }))
    case 'wpisy':
      return (['journal', 'emotions', 'exercises'] as const).map(key => ({
        name: key === 'journal' ? 'Dziennik' : key === 'emotions' ? 'Emocje' : 'Ćwiczenia',
        cells: list.map(unit => (unit.state === 'future' ? dash : { text: String(unit.entries[key]), tone: unit.entries[key] ? 'none' : 'muted' })),
      }))
    case 'kierunki': {
      if (scale.value === 'week') return [{ name: 'Fokus tygodnia', cells: list.map(() => dash) }]
      if (scale.value === 'month') {
        return [{ name: 'Fokus tygodnia', cells: list.map(unit => (unit.top3 ? execCell(unit.top3.met, 3, unit.state) : dash)) }]
      }
      return fixture.value.priorities.slice(0, 3).map((priority, index) => ({
        name: priority.title,
        cells: list.map(unit => {
          const effort = unit.priorities[index]?.effort ?? null
          return effort === null ? dash : { text: `${effort}/5`, tone: 'none' }
        }),
      }))
    }
  }
}
</script>

<style scoped>
.cal-matrix { box-sizing: border-box; min-height: 100vh; padding: 20px; color: rgb(var(--color-on-surface)); background: rgb(var(--color-background)); font-family: 'Nunito', 'Avenir Next', sans-serif; }
.cal-matrix *, .cal-matrix *::before, .cal-matrix *::after { box-sizing: border-box; }
.cal-matrix__paper { display: grid; gap: 12px; align-content: start; max-width: 1180px; min-height: calc(100vh - 40px); margin: 0 auto; padding: 14px 16px 18px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 34px 27px 32px 25px; background: rgb(var(--color-background)); box-shadow: inset -7px -7px 16px rgb(var(--neo-inset-light) / .6), inset 7px 7px 16px rgb(var(--neo-inset-dark) / .13); }

.mx-body { display: grid; grid-template-columns: clamp(220px, 24%, 280px) minmax(0, 1fr); gap: 16px; align-items: start; }

/* w skrócie */
.mx-brief { display: grid; gap: 10px; align-content: start; padding: 16px 16px 14px; border: 1px solid rgb(var(--neo-border) / .14); border-radius: 24px 20px 22px 18px; background: rgb(var(--neo-surface-base)); box-shadow: -7px -7px 15px rgb(var(--neo-shadow-light) / .76), 7px 7px 15px rgb(var(--neo-shadow-dark) / .22); }
.mx-brief > small { color: rgb(var(--neo-muted)); font-size: 8.5px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
.mx-brief h2 { margin: -6px 0 0; font-size: 16px; font-weight: 800; }
.mx-brief h2::first-letter { text-transform: uppercase; }
.mx-brief__lines { display: grid; gap: 6px; margin: 4px 0 0; padding: 0; list-style: none; }
.mx-brief__lines li { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 8px; border-radius: 10px; color: rgb(var(--color-on-surface-variant)); font-size: 10px; font-weight: 700; }
.mx-brief__lines li.active { color: rgb(var(--color-primary-strong)); background: rgb(var(--sky-100) / .8); }
.mx-brief__lines span { display: inline-flex; align-items: center; gap: 5px; }
.mx-brief__lines .material-symbols-outlined { font-size: 14px; }
.mx-brief__lines b { font-variant-numeric: tabular-nums; color: rgb(var(--color-on-surface)); white-space: nowrap; }
.mx-brief__ritual { min-height: 30px; }
.mx-cta { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border: 1px solid rgb(var(--neo-border) / .2); border-radius: 999px; color: rgb(var(--color-primary-strong)); background: rgb(var(--neo-surface-base)); font-size: 10.5px; font-weight: 800; cursor: pointer; box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .8), 3px 3px 7px rgb(var(--neo-shadow-dark) / .18); }
.mx-cta.quiet { box-shadow: none; background: transparent; color: rgb(var(--color-on-surface-variant)); }
.mx-cta .material-symbols-outlined { font-size: 16px; }
.mx-brief__done { display: inline-flex; align-items: center; gap: 6px; color: rgb(var(--color-on-surface-variant)); font-size: 10px; font-weight: 700; }
.mx-brief__journal { margin: 0; padding: 8px 12px; border-left: 2px solid rgb(var(--sky-300)); color: rgb(var(--color-on-surface-variant)); font-size: 10.5px; line-height: 1.5; font-style: italic; }
.mx-enter { display: inline-flex; align-items: center; gap: 5px; justify-self: start; padding: 4px 8px; border: 0; border-radius: 999px; color: rgb(var(--color-primary-strong)); background: transparent; font-size: 10px; font-weight: 800; cursor: pointer; }
.mx-enter .material-symbols-outlined { font-size: 15px; }
.mx-note { margin: 0; color: rgb(var(--neo-muted)); font-size: 9px; font-weight: 700; }

/* macierz */
.mx-grid { --name: 168px; display: grid; gap: 3px; min-width: 0; }
.mx-head, .mx-section, .mx-row { display: grid; grid-template-columns: var(--name) repeat(var(--cols), minmax(0, 1fr)); gap: 3px; align-items: stretch; }
.mx-head { position: sticky; top: 0; z-index: 2; padding-bottom: 3px; background: rgb(var(--color-background)); }
.mx-col { display: grid; justify-items: center; align-content: center; gap: 2px; min-height: 48px; padding: 6px 4px; border: 1px solid rgb(var(--neo-border) / .14); border-radius: 13px 11px 13px 11px; color: inherit; background: rgb(var(--neo-surface-base)); cursor: pointer; box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .7), 3px 3px 7px rgb(var(--neo-shadow-dark) / .14); }
.mx-col strong { font-size: 10.5px; font-weight: 800; }
.mx-col strong::first-letter { text-transform: uppercase; }
.mx-col small { color: rgb(var(--neo-muted)); font-size: 8px; font-weight: 700; white-space: nowrap; }
.mx-col.selected { background: rgb(var(--sky-100)); border-color: rgb(var(--sky-300)); }
.mx-col.current { outline: 2px solid rgb(var(--sky-400) / .8); outline-offset: -2px; }
.mx-col.future { color: rgb(var(--neo-muted)); box-shadow: none; background: rgb(var(--color-surface-container) / .35); }

.mx-section { min-height: 38px; padding: 0; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 12px; color: inherit; background: rgb(var(--color-surface) / .6); text-align: left; cursor: pointer; }
.mx-section:hover { background: rgb(var(--sky-50)); }
.mx-section.open { background: rgb(var(--neo-surface-base)); border-color: rgb(var(--neo-border) / .2); }
.mx-section__name { display: inline-flex; align-items: center; gap: 4px; padding: 0 8px 0 6px; color: rgb(var(--color-primary-strong)); font-size: 9px; font-weight: 850; letter-spacing: .14em; text-transform: uppercase; }
.mx-section__name .material-symbols-outlined { font-size: 15px; }
.mx-cell { display: grid; place-items: center; min-height: 100%; border-radius: 8px; }
.mx-cell.selected { background: rgb(var(--sky-100) / .8); }

.mx-rows { display: grid; gap: 2px; padding: 2px 0 6px; }
.mx-row { min-height: 26px; }
.mx-row__name { display: flex; align-items: center; gap: 6px; padding-left: 26px; color: rgb(var(--color-on-surface-variant)); font-size: 9.5px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mx-cell--text { color: rgb(var(--color-on-surface-variant)); font-size: 9.5px; font-weight: 700; font-variant-numeric: tabular-nums; }
.mx-cell--text.met { color: rgb(var(--sky-700)); }
.mx-cell--text.missed { color: rgb(var(--rose-600)); }
.mx-cell--text.muted, .mx-cell--text.none { color: rgb(var(--neo-muted)); }
.glyph { display: inline-block; flex: none; width: 8px; height: 8px; background: rgb(var(--sky-400)); }
.glyph--circle { border-radius: 999px; }
.glyph--pentagon { clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%); }
.glyph--square { border-radius: 2px; }
</style>
