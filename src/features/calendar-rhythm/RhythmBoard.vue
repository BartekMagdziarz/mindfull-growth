<template>
  <div
    class="rb-board"
    :class="`rb-board--${scale}`"
    :style="{ '--cols': units.length, '--sigma': hasSigma ? '84px' : '0px' }"
  >
    <!-- oś: lista spojrzeń w rogu, jednostki jako kapsuła; klik w jednostkę = zoom w podokres (refleksja tygodnia: sama lista) -->
    <div class="rb-row rb-axis" role="row">
      <label class="rb-view" :title="`Co pokazuje tabela: ${currentOption?.label ?? ''}`">
        <AppIcon :name="currentOption?.icon ?? 'view_list'" class="rb-view__icon" />
        <select
          class="rb-view__select"
          :value="view"
          aria-label="Co pokazuje tabela"
          @change="emit('set-view', ($event.target as HTMLSelectElement).value)"
        >
          <optgroup v-for="group in optionGroups" :key="group.label" :label="group.label">
            <option v-for="opt in group.options" :key="opt.id" :value="opt.id">
              {{ opt.label }}
            </option>
          </optgroup>
        </select>
        <AppIcon name="expand_more" class="rb-view__chev" />
      </label>
      <template v-if="!reflectionOwn">
        <span class="rb-axis__track" aria-hidden="true" />
        <button
          v-for="unit in units"
          :key="unit.ref"
          type="button"
          class="rb-axis__unit"
          :class="{
            current: unit.state === 'current',
            future: unit.state === 'future',
            partial: unit.partial,
          }"
          :title="openTitle(unit)"
          :aria-label="`${axisLabel(unit)} · ${openTitle(unit)}`"
          @click="emit('open-unit', unit.ref)"
        >
          <span>{{ unit.label }}</span
          ><strong v-if="unit.sublabel">{{ unit.sublabel }}</strong>
        </button>
        <span v-if="hasSigma" class="rb-sigma rb-sigma--head"
          >Σ {{ scale === 'month' ? 'miesiąc' : 'tydzień' }}</span
        >
      </template>
    </div>

    <!-- jedna karta z wierszami aktualnego spojrzenia -->
    <section class="rb-cloud" :aria-label="`Tabela: ${currentOption?.label ?? ''}`">
      <template v-for="row in rows" :key="row.id">
        <div v-if="row.kind === 'focus-lane'" class="rb-row rb-focus-lane" role="row">
          <span class="rb-name rb-name--focus"
            ><AppIcon :name="row.priority.icon" class="rb-name__icon" />{{
              row.priority.title
            }}</span
          >
          <button
            v-for="(focused, i) in row.focused"
            :key="units[i].ref"
            type="button"
            class="rb-cell"
            :title="openTitle(units[i])"
            :aria-label="`${row.priority.title}, ${unitLabel(units[i].ref)}: ${focused ? 'wybrany fokus' : 'poza fokusem'} · ${openTitle(units[i])}`"
            @click="emit('open-unit', units[i].ref)"
          >
            <span v-if="focused" class="rb-focus-band"><AppIcon name="star" /></span>
            <span v-else class="rb-focus-gap" />
          </button>
          <span v-if="hasSigma" class="rb-sigma" />
        </div>

        <!-- seria -->
        <div
          v-else-if="row.kind === 'series'"
          class="rb-row rb-series"
          :class="[
            `rb-series--${row.series.markKind}`,
            {
              observation: row.series.evidenceRole === 'observation',
              'rb-series--plot': usesLine(row.series),
            },
          ]"
          role="row"
        >
          <span class="rb-name rb-name--series" :title="row.series.label">
            <AppIcon
              v-if="seriesIcon(row.series.objectKey)"
              :name="seriesIcon(row.series.objectKey)!"
              class="rb-name__icon rb-name__icon--small"
            />
            <span class="rb-name__text"
              ><span class="rb-name__title">{{ row.series.label }}</span
              ><small v-if="row.series.sublabel || row.series.unit">{{
                row.series.sublabel ?? row.series.unit
              }}</small></span
            >
          </span>
          <div class="rb-series__cells" :style="{ '--cols': units.length }">
            <button
              v-for="point in row.series.points"
              :key="point.unitRef"
              type="button"
              class="rb-cell rb-cell--series"
              :class="{ future: point.state === 'future' }"
              :title="
                usesLine(row.series)
                  ? undefined
                  : `${row.series.label}, ${unitLabel(point.unitRef)}: ${point.readout}`
              "
              :aria-label="`${row.series.label}, ${unitLabel(point.unitRef)}: ${point.readout} · ${openTitle(unitOf(point.unitRef))}`"
              @click="emit('open-unit', point.unitRef)"
            >
              <template v-if="usesLine(row.series)">
                <span
                  v-if="point.value === null && point.planned && point.state !== 'future'"
                  class="rb-plot-missing"
                  aria-hidden="true"
                  >○</span
                >
                <span class="rb-readout">{{ readoutOf(row.series, point) }}</span>
              </template>
              <RhythmSeriesMark
                v-else
                :series="row.series"
                :point="point"
                :scale-max="row.scaleMax"
                :scale="scale"
              />
            </button>
            <template v-if="usesLine(row.series)">
              <RhythmSeriesLine
                :series="row.series"
                :grain="grainOf(row.series)"
                :unit-labels="units.map(u => unitLabel(u.ref))"
                @select="ref => emit('open-unit', ref)"
              />
              <span class="rb-axis-bounds" aria-hidden="true"
                ><b>{{ boundLabel(row.series, 'max') }}</b
                ><b>{{ boundLabel(row.series, 'min') }}</b></span
              >
            </template>
            <!-- granulacja tego wykresu: mała lupa w rogu wiersza, widoczna po najechaniu (albo gdy włączona) -->
            <button
              v-if="canZoom(row.series)"
              type="button"
              class="rb-zoom"
              :class="{ on: grainOf(row.series) === 'fine' }"
              :title="zoomTitle(row.series)"
              :aria-label="`${row.series.label}: ${zoomTitle(row.series)}`"
              :aria-pressed="grainOf(row.series) === 'fine'"
              @click.stop="emit('toggle-fine', row.series.objectKey)"
            >
              <AppIcon :name="grainOf(row.series) === 'fine' ? 'zoom_out' : 'zoom_in'" />
            </button>
          </div>
          <!-- Σ okresu: suma miesięczna albo plan na cały okres (jedno miejsce na wykonanie wobec celu; pełne zdanie w tooltipie) -->
          <span v-if="hasSigma" class="rb-sigma" :title="sigmaTitle(row.series)">
            <span v-if="row.series.periodTotal" class="rb-sigma__well">{{
              sigmaText(row.series)
            }}</span>
            <span
              v-else-if="row.series.periodPlan"
              class="rb-sigma__well"
              :class="`rb-sigma__well--${row.series.periodPlan.status}`"
              role="img"
              :aria-label="`${row.series.label}: plan na ${row.series.periodPlan.label} · ${row.series.periodPlan.readout}`"
              >{{ planText(row.series.periodPlan) }}</span
            >
          </span>
        </div>

        <div v-else-if="row.kind === 'observations-label'" class="rb-row rb-sublabel" role="row">
          <span class="rb-name rb-name--sub">Obserwacje</span>
        </div>
        <div
          v-else-if="row.kind === 'sublabel'"
          class="rb-row rb-sublabel rb-sublabel--head"
          role="row"
        >
          <span class="rb-name rb-name--sub">{{ row.text }}</span>
        </div>

        <!-- refleksja okresu: treść zamiast wierszy (oceny zostają w podsumowaniu nad tabelą) -->
        <div v-else-if="row.kind === 'reflection-own'" class="rb-refl">
          <template v-if="row.reflection.exists">
            <header class="rb-refl__head">
              <span class="rb-refl__title"
                >{{ scale === 'month' ? 'Refleksja miesiąca' : 'Refleksja tygodnia'
                }}<small v-if="savedLabel">{{ savedLabel }}</small></span
              >
              <button
                type="button"
                class="cp-btn cp-btn--quiet"
                @click="emit('ritual', 'reflection')"
              >
                <AppIcon name="edit" />Edytuj
              </button>
            </header>
            <div v-if="anchors.length" class="rb-refl__anchors">
              <section
                v-for="anchor in anchors"
                :key="anchor.id"
                class="rb-refl__anchor"
                :class="`rb-refl__anchor--${anchor.id}`"
              >
                <span class="rb-refl__eyebrow"
                  ><AppIcon :name="anchor.icon" />{{ anchor.label }}</span
                >
                <p v-for="(line, i) in anchor.lines" :key="i">{{ line }}</p>
              </section>
            </div>
            <!-- miesiąc: werdykty kierunków z rytuału -->
            <section v-if="verdicts.length" class="rb-refl__verdicts">
              <span class="rb-refl__eyebrow"><AppIcon name="star" />Kierunki</span>
              <ul>
                <li v-for="verdict in verdicts" :key="verdict.key">
                  <span>{{ verdict.title }}</span>
                  <small>wysiłek {{ verdict.effort ?? '–' }} / 5</small>
                  <em>{{ verdict.label }}</em>
                </li>
              </ul>
            </section>
            <section v-if="freeform" class="rb-refl__entry">
              <span class="rb-refl__eyebrow">Wpis</span>
              <p>{{ freeform }}</p>
            </section>
            <p v-if="!anchors.length && !freeform && !verdicts.length" class="rb-refl__none">
              Refleksja ma tylko oceny — są w podsumowaniu nad tabelą.
            </p>
          </template>
          <div v-else class="rb-refl__empty">
            <p class="rb-refl__none">
              {{
                row.future
                  ? 'Refleksja pojawi się po zakończeniu okresu.'
                  : 'Refleksja nie została jeszcze zapisana.'
              }}
            </p>
            <button
              v-if="!row.future"
              type="button"
              class="cp-btn"
              @click="emit('ritual', 'reflection')"
            >
              <AppIcon
                :name="scale === 'month' ? 'mg-monthly-reflection' : 'mg-weekly-reflection'"
              />Napisz refleksję
            </button>
          </div>
        </div>

        <!-- obszar: obciążenie i stan jako wstęga; komórki pod nią zostają strefami zoomu -->
        <div
          v-else-if="row.kind === 'reflection-area'"
          class="rb-row rb-series rb-series--plot rb-series--ribbon"
          role="row"
        >
          <span class="rb-name rb-name--series" :title="row.label">
            <AppIcon :name="row.icon" class="rb-name__icon rb-name__icon--small" />
            <span class="rb-name__text">{{ row.label }}</span>
          </span>
          <div class="rb-series__cells" :style="{ '--cols': units.length }">
            <button
              v-for="unit in units"
              :key="unit.ref"
              type="button"
              class="rb-cell rb-cell--series"
              :class="{ future: unit.state === 'future' }"
              :title="openTitle(unit)"
              :aria-label="`${row.label}, ${unitLabel(unit.ref)} · ${openTitle(unit)}`"
              @click="emit('open-unit', unit.ref)"
            />
            <div class="rb-ribbon">
              <LoadStateRibbon
                :points="row.points"
                :label="row.label"
                :height="scale === 'year' ? 110 : 92"
                @select="ref => emit('open-unit', ref)"
              />
            </div>
          </div>
          <span v-if="hasSigma" class="rb-sigma" />
        </div>

        <!-- oceny jednostek (rok: kompas miesięcy) -->
        <div
          v-else-if="row.kind === 'reflection-units'"
          class="rb-row rb-series rb-series--ratings"
          role="row"
        >
          <span class="rb-name rb-name--series"
            >{{ scale === 'month' ? 'Tygodnie' : 'Miesiące'
            }}<small> · {{ scale === 'month' ? 'obciążenie i stan' : 'kompas' }}</small></span
          >
          <div class="rb-series__cells" :style="{ '--cols': units.length }">
            <button
              v-for="r in row.cells"
              :key="r.unitRef"
              type="button"
              class="rb-cell rb-cell--series"
              :title="openTitle(unitOf(r.unitRef))"
              :aria-label="`Refleksja, ${unitLabel(r.unitRef)}${r.exists ? '' : ': brak refleksji'} · ${openTitle(unitOf(r.unitRef))}`"
              @click="emit('open-unit', r.unitRef)"
            >
              <RhythmRatingsMini v-if="r.weekly" :load="r.weekly.load" :state="r.weekly.state" />
              <RhythmCompassMini v-else-if="r.monthly" :values="r.monthly.compass" compact />
              <RhythmEvidenceMark v-else presence="empty" label="Brak refleksji" />
            </button>
          </div>
          <span v-if="hasSigma" class="rb-sigma" />
        </div>

        <!-- wpisy: podwiersze -->
        <div
          v-else-if="row.kind === 'entries-kind'"
          class="rb-row rb-series rb-series--entries"
          role="row"
        >
          <span class="rb-name rb-name--series"
            ><AppIcon :name="row.icon" class="rb-name__icon rb-name__icon--small" /><span
              class="rb-name__text"
              >{{ row.label }}</span
            ></span
          >
          <div class="rb-series__cells" :style="{ '--cols': units.length }">
            <button
              v-for="e in row.cells"
              :key="e.unitRef"
              type="button"
              class="rb-cell rb-cell--series"
              :title="openTitle(unitOf(e.unitRef))"
              :aria-label="`${row.label}, ${unitLabel(e.unitRef)}: ${e.kinds[row.kindId].count} wpisów w ${e.kinds[row.kindId].days} dniach · ${openTitle(unitOf(e.unitRef))}`"
              @click="emit('open-unit', e.unitRef)"
            >
              <RhythmEntrySlots :data="e.kinds[row.kindId]" :kind-label="row.label" />
            </button>
          </div>
          <span v-if="hasSigma" class="rb-sigma" />
        </div>

        <div v-else-if="row.kind === 'more'" class="rb-row rb-more" role="row">
          <button type="button" class="cp-btn cp-btn--quiet" @click="emit('toggle-more', row.id)">
            {{ row.label }}
          </button>
        </div>

        <div v-else-if="row.kind === 'note'" class="rb-row rb-note" role="row">
          <span>{{ row.text }}</span>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import LoadStateRibbon from '@/components/shared/charts/LoadStateRibbon.vue'
import RhythmCompassMini from './RhythmCompassMini.vue'
import RhythmEntrySlots from './RhythmEntrySlots.vue'
import RhythmEvidenceMark from './RhythmEvidenceMark.vue'
import RhythmSeriesLine from './RhythmSeriesLine.vue'
import RhythmRatingsMini from './RhythmRatingsMini.vue'
import RhythmSeriesMark from './RhythmSeriesMark.vue'
import {
  isLineKind,
  rangeLabel,
  periodTitle,
  savedOnLabel,
  seriesAxis,
  supportsFineGrain,
  type Grain,
  type RitualKind,
  type Scale,
  type SeriesPoint,
  type SeriesProjection,
  type TimeUnit,
} from './rhythmProjections'
import type { BoardRow, ViewOption } from './rhythmRows'
import type { RhythmObject, RhythmPriority } from './rhythmScenario'

const props = defineProps<{
  rows: BoardRow[]
  units: TimeUnit[]
  scale: Scale
  objects: RhythmObject[]
  /** Nazwy kierunków dla werdyktów refleksji miesiąca. */ priorities?: RhythmPriority[]
  /** Serie w drobnej granulacji (klucze obiektów). */ fine: string[]
  view: string
  options: ViewOption[]
}>()
const emit = defineEmits<{
  'set-view': [id: string]
  'toggle-more': [id: string]
  /** Przełącz granulację jednego wykresu (dni ↔ tygodnie w miesiącu, tygodnie ↔ miesiące w roku). */
  'toggle-fine': [objectKey: string]
  /** Zoom w podokres: tydzień/miesiąc staje się fokusem swojej skali, dzień otwiera Dzisiaj. */
  'open-unit': [unitRef: string]
  /** Rytuał okresu z treści refleksji tygodnia (napisz / edytuj). */
  ritual: [kind: RitualKind]
}>()

const currentOption = computed(() => props.options.find(o => o.id === props.view))
const optionGroups = computed(() => {
  const groups: { label: string; options: ViewOption[] }[] = []
  for (const opt of props.options) {
    let group = groups.find(g => g.label === opt.group)
    if (!group) {
      group = { label: opt.group, options: [] }
      groups.push(group)
    }
    group.options.push(opt)
  }
  return groups
})

/** Spojrzenie „Refleksja” (tydzień / miesiąc): jeden blok treści, bez osi jednostek. */
const reflectionOwn = computed(() => {
  const row = props.rows.find(r => r.kind === 'reflection-own')
  return row?.kind === 'reflection-own' ? row : null
})
const savedLabel = computed(() => {
  const r = reflectionOwn.value?.reflection
  const saved = r?.weekly?.savedAt ?? r?.monthly?.savedAt
  return r && saved ? savedOnLabel(saved, r.unitRef) : null
})
const freeform = computed(() => {
  const r = reflectionOwn.value?.reflection
  return (r?.weekly?.freeform ?? r?.monthly?.freeform ?? '').trim()
})
/**
 * Kotwice jak w rytuale refleksji: tydzień = dobrze / trudne / lekcje, miesiąc = duma / wyzwania / rozwój.
 * Każda linia odpowiedzi osobno, puste kotwice znikają; „trudna” kotwica ma różową kreskę.
 */
const anchors = computed(() => {
  const r = reflectionOwn.value?.reflection
  const lines = (text: string) =>
    text
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
  const list = r?.weekly
    ? [
        {
          id: 'good',
          label: 'Co poszło dobrze',
          icon: 'thumb_up',
          lines: lines(r.weekly.anchors.good),
        },
        { id: 'hard', label: 'Co było trudne', icon: 'cloud', lines: lines(r.weekly.anchors.hard) },
        {
          id: 'lessons',
          label: 'Czego się uczę',
          icon: 'lightbulb',
          lines: lines(r.weekly.anchors.lessons),
        },
      ]
    : r?.monthly
      ? [
          {
            id: 'good',
            label: 'Z czego jestem dumny',
            icon: 'thumb_up',
            lines: lines(r.monthly.anchors.proud),
          },
          {
            id: 'hard',
            label: 'Największe wyzwania',
            icon: 'cloud',
            lines: lines(r.monthly.anchors.challenges),
          },
          {
            id: 'lessons',
            label: 'Jak się rozwinąłem',
            icon: 'lightbulb',
            lines: lines(r.monthly.anchors.growth),
          },
        ]
      : []
  return list.filter(anchor => anchor.lines.length)
})
const VERDICT: Record<string, string> = {
  continue: 'kontynuuj',
  adjust: 'dostosuj',
  pause: 'wstrzymaj',
  drop: 'porzuć',
  '': 'bez decyzji',
}
const verdicts = computed(() =>
  (reflectionOwn.value?.reflection.monthly?.priorityVerdicts ?? []).map(v => ({
    key: v.priorityKey,
    title: props.priorities?.find(p => p.key === v.priorityKey)?.title ?? v.priorityKey,
    effort: v.effort,
    label: VERDICT[v.verdict] ?? v.verdict,
  }))
)

const hasSigma = computed(() =>
  props.rows.some(r => r.kind === 'series' && (r.series.periodTotal || r.series.periodPlan))
)

/** Drobniejsza granulacja ma sens tylko dla linii/słupków i tylko, gdy kolumna ma podjednostki (nie w tygodniu). */
function canZoom(series: SeriesProjection): boolean {
  return props.scale !== 'week' && supportsFineGrain(series.markKind)
}
function grainOf(series: SeriesProjection): Grain {
  return canZoom(series) && props.fine.includes(series.objectKey) ? 'fine' : 'unit'
}
function zoomTitle(series: SeriesProjection): string {
  const fine = grainOf(series) === 'fine'
  if (props.scale === 'month') return fine ? 'Wykres w tygodniach' : 'Wykres w dniach'
  return fine ? 'Wykres w miesiącach' : 'Wykres w tygodniach'
}
/** Linia zawsze dla punktów; słupki przechodzą na warstwę wiersza tylko w granulacji drobnej. */
function usesLine(series: SeriesProjection): boolean {
  return (
    isLineKind(series.markKind) || (series.markKind === 'bar-target' && grainOf(series) === 'fine')
  )
}
function readoutOf(series: SeriesProjection, point: SeriesPoint): string {
  const prefix =
    series.aggregation === 'average' ? 'śr. ' : series.aggregation === 'last' ? 'ost. ' : ''
  return point.value === null ? point.readout : `${prefix}${point.readout}`
}
function boundLabel(series: SeriesProjection, which: 'min' | 'max'): string {
  const v = seriesAxis(series, grainOf(series))[which]
  const rounded =
    series.markKind === 'rating-point' || series.markKind === 'bar-target'
      ? Math.round(v)
      : Math.round(v * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',')
}

function unitOf(unitRef: string): TimeUnit | undefined {
  return props.units.find(u => u.ref === unitRef)
}
function unitLabel(unitRef: string): string {
  const unit = unitOf(unitRef)
  if (!unit) return unitRef
  return unit.kind === 'month'
    ? periodTitle('month', unit.ref)
    : unit.partial
      ? `${rangeLabel(unit.visibleBounds)} (część tygodnia)`
      : rangeLabel(unit.fullBounds)
}
function axisLabel(unit: TimeUnit): string {
  return unit.kind === 'month' ? periodTitle('month', unit.ref) : rangeLabel(unit.fullBounds)
}
function openTitle(unit: TimeUnit | undefined): string {
  if (!unit) return 'Otwórz'
  return unit.kind === 'day'
    ? 'Otwórz dzień'
    : unit.kind === 'week'
      ? 'Otwórz tydzień'
      : 'Otwórz miesiąc'
}
function seriesIcon(objectKey: string): string | undefined {
  return props.objects.find(o => o.key === objectKey)?.icon
}
function fmtSigma(value: number | null): string {
  return value === null
    ? '–'
    : Number.isInteger(value)
      ? String(value)
      : value.toFixed(1).replace('.', ',')
}
function sigmaText(series: SeriesProjection): string {
  const t = series.periodTotal!
  return t.target === null ? fmtSigma(t.value) : `${fmtSigma(t.value)} / ${t.target}`
}
/** Sam ułamek: „2 / 5”, limit z „≤”; przyszły plan bez zapisu = „plan”, przeszły = „–”. Reszta zdania w tooltipie. */
function planText(plan: NonNullable<SeriesProjection['periodPlan']>): string {
  if (plan.value === null) return plan.status === 'planned' ? 'plan' : '–'
  if (plan.target === null) return fmtSigma(plan.value)
  const limit = plan.readout.includes('(limit)')
  return `${fmtSigma(plan.value)} / ${limit ? '≤' : ''}${fmtSigma(plan.target)}`
}
function sigmaTitle(series: SeriesProjection): string | undefined {
  if (series.periodTotal) return series.periodTotal.readout
  if (series.periodPlan) return `Plan na ${series.periodPlan.label} · ${series.periodPlan.readout}`
  return undefined
}
</script>

<style scoped>
/* Język widoku Dzisiaj: oś jako kapsuła-kontrolka z listą spojrzeń w rogu, jedna kartka z wierszami,
   wykresy bez własnej powierzchni; kolumny trzymają jedną siatkę dzięki wspólnemu poziomemu paddingowi. */
.rb-board {
  --name: 246px;
  --pad: 12px;
  display: grid;
  gap: 10px;
  min-width: 0;
}
.rb-board--year {
  --name: 206px;
}
.rb-row {
  display: grid;
  grid-template-columns: var(--name) repeat(var(--cols), minmax(0, 1fr)) var(--sigma);
  align-items: center;
  column-gap: 2px;
  padding: 0 var(--pad);
}

/* oś */
.rb-axis {
  position: relative;
  margin: 2px 0 4px;
}
.rb-view {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-self: start;
  max-width: calc(var(--name) - 12px);
  min-height: 40px;
  padding: 0 10px 0 6px;
  border: 1px solid var(--cp-line);
  border-radius: 15px 12px 16px 13px;
  background: var(--cp-inner);
  color: var(--mg-color-ink);
  box-shadow: var(--mg-shadow-rhythm-card);
  cursor: pointer;
}
.rb-view:hover {
  background: var(--cp-inner);
}
.rb-view__icon {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 27px;
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  color: var(--cp-mark);
  background: var(--cp-field);
  font-size: 17px;
}
.rb-view__select {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  text-overflow: ellipsis;
}
.rb-view__select:focus-visible {
  outline: none;
}
.rb-view:has(.rb-view__select:focus-visible) {
  outline: 2px solid var(--cp-mark);
  outline-offset: 3px;
}
.rb-view__chev {
  flex: none;
  font-size: 18px;
  color: var(--mg-color-muted);
}
.rb-axis__track {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(var(--pad) + var(--name) - 2px);
  right: calc(var(--pad) - 4px);
  border-radius: 18px 15px 19px 16px;
  background: var(--cp-card);
  box-shadow: var(--mg-shadow-inset-sm);
}
.rb-axis__unit,
.rb-sigma--head {
  position: relative;
  z-index: 1;
}
.rb-axis__unit {
  display: grid;
  place-items: center;
  min-height: 36px;
  margin: 4px 0;
  padding: 3px 4px;
  border: 1px solid transparent;
  border-radius: 13px 16px 11px 17px;
  background: transparent;
  color: var(--mg-color-muted);
  font-size: 12.5px;
  font-weight: 800;
  cursor: pointer;
}
.rb-axis__unit:nth-child(even) {
  border-radius: 16px 12px 17px 13px;
}
.rb-board--year .rb-axis__unit {
  font-size: 12px;
}
.rb-axis__unit:hover {
  background: var(--cp-field);
}
.rb-axis__unit.current {
  background: var(--cp-inner);
  color: var(--mg-color-ink);
  border-color: var(--cp-line);
  box-shadow: var(--mg-shadow-rhythm-card);
  transform: rotate(-0.5deg);
}
.rb-axis__unit.current:hover {
  background: var(--cp-inner);
}
.rb-axis__unit.future {
  color: var(--mg-color-muted);
}
.rb-axis__unit strong {
  font-size: 17px;
  color: var(--mg-color-ink);
}
.rb-sigma {
  display: grid;
  place-items: center;
  color: var(--mg-color-muted);
  font-size: 12.5px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
}
.rb-sigma--head {
  color: var(--mg-color-muted);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
}
.rb-sigma__well {
  padding: 4px 9px;
  border-radius: 11px 14px 10px 13px;
  background: var(--cp-field);
  white-space: nowrap;
}
.rb-sigma__well--done {
  color: var(--mg-color-ink);
}
.rb-sigma__well--short,
.rb-sigma__well--unrecorded,
.rb-sigma__well--planned {
  color: var(--mg-color-muted);
}

/* kartka z wierszami */
.rb-cloud {
  padding: 8px 0 8px;
  border: 1px solid var(--cp-line);
  border-radius: 25px 30px 24px 28px;
  background: var(--cp-card);
  box-shadow: var(--mg-shadow-rhythm-card);
}
.rb-name {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 8px 8px;
  border: 0;
  border-radius: 13px 17px 12px 16px;
  background: transparent;
  color: var(--mg-color-ink);
  font: inherit;
  text-align: left;
}
.rb-name--series {
  padding-left: 14px;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--mg-color-ink);
}
.rb-name--series small {
  color: var(--mg-color-muted);
  font-size: 11px;
  font-weight: 600;
}
.rb-name--sub {
  padding: 6px 8px 0 14px;
  color: var(--mg-color-muted);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.rb-sublabel--head {
  min-height: 26px;
}
.rb-sublabel--head .rb-name--sub {
  color: var(--cp-mark);
}
.rb-sublabel--head:not(:first-child) {
  margin-top: 6px;
}
/* nazwa zawija się zamiast ucinać; podtytuł (typ, cel, jednostka) pod nią */
.rb-name__text {
  display: grid;
  min-width: 0;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
.rb-name__icon {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 31px;
  height: 30px;
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  color: var(--cp-mark);
  background: var(--cp-inner);
  font-size: 19px;
}
.rb-name__icon--small {
  width: 25px;
  height: 24px;
  font-size: 15px;
}

.rb-cell {
  display: grid;
  place-items: center;
  min-height: 46px;
  border: 0;
  border-radius: 12px 16px 10px 14px;
  background: transparent;
  color: var(--mg-color-ink);
  cursor: pointer;
}
.rb-cell:nth-child(even) {
  border-radius: 15px 11px 14px 12px;
}
.rb-cell:hover {
  background: var(--cp-field);
}
.rb-cell.future {
  opacity: 0.7;
}
.rb-focus-lane {
  min-height: 46px;
}
.rb-name--focus {
  padding-left: 14px;
  font-size: 14px;
  font-weight: 800;
}
.rb-focus-band {
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(100% - 18px);
  max-width: 170px;
  height: 22px;
  border: 1px solid var(--cp-edge-strong);
  border-radius: 9px 13px 8px 11px;
  background: var(--cp-inner);
  box-shadow: var(--mg-shadow-raised-sm);
}
.rb-focus-band .material-symbols-outlined {
  font-size: 14px;
}
.rb-focus-gap {
  width: calc(100% - 18px);
  max-width: 170px;
  height: 1px;
  background: var(--cp-hairline);
}

/* serie: wiersze ~20% wyższe niż komórki fokusu, żeby wykresy miały pion */
.rb-series {
  min-height: 70px;
}
.rb-series + .rb-series,
.rb-series + .rb-sublabel {
  border-top: 1px dashed var(--cp-line);
}
.rb-series.observation .rb-name--series {
  color: var(--mg-color-muted);
}
.rb-series__cells {
  position: relative;
  grid-column: 2 / span var(--cols);
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  column-gap: 2px;
}
.rb-cell--series {
  min-height: 65px;
}
/* tydzień: dyski dni jak w „Plan dnia”; przyszłe dni przygasza sam dysk, nie komórka */
.rb-board--week .rb-series:not(.rb-series--plot) .rb-cell--series {
  min-height: 60px;
}
.rb-board--week .rb-series:not(.rb-series--plot) .rb-cell--series.future {
  opacity: 1;
}
.rb-series--plot .rb-series__cells {
  column-gap: 0;
  margin: 6px 0;
}
.rb-series--plot .rb-cell--series {
  position: relative;
  min-height: 104px;
  border-radius: 10px;
}
.rb-series--plot .rb-cell--series:hover {
  background: var(--cp-field);
}
/* wstęga nad komórkami: własne strefy hover (tooltip + zoom), komórki pod spodem dają tło i fokus klawiatury */
.rb-series--ribbon .rb-series__cells {
  grid-template-rows: 1fr;
}
.rb-series--ribbon .rb-cell--series {
  grid-row: 1;
  min-height: 116px;
}
.rb-series--ribbon .rb-ribbon {
  grid-row: 1;
  grid-column: 1 / -1;
  align-self: center;
  padding: 0 2px;
  pointer-events: none;
}
.rb-series--ribbon .rb-ribbon :deep(.ls-ribbon__hit) {
  pointer-events: auto;
}
.rb-series--ribbon .rb-ribbon :deep(.ls-ribbon__tip) {
  pointer-events: none;
}
.rb-plot-missing {
  position: absolute;
  left: 50%;
  bottom: 8px;
  transform: translateX(-50%);
  color: var(--cp-accent-strong);
  font-size: 16px;
  line-height: 1;
}
.rb-readout {
  visibility: hidden;
  position: absolute;
  z-index: 3;
  left: 50%;
  bottom: 4px;
  transform: translate(-50%, 0);
  padding: 3px 8px;
  border-radius: 8px 10px 7px 11px;
  background: var(--mg-color-ink);
  color: var(--mg-color-on-primary);
  white-space: nowrap;
  font-size: 11.5px;
  font-weight: 700;
  pointer-events: none;
  box-shadow: var(--mg-shadow-raised-sm);
}
.rb-cell--series:hover .rb-readout,
.rb-cell--series:focus-visible .rb-readout {
  visibility: visible;
}
.rb-axis-bounds {
  visibility: hidden;
  position: absolute;
  right: 100%;
  top: 8px;
  bottom: 8px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-right: 8px;
  color: var(--mg-color-muted);
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
  pointer-events: none;
}
.rb-series:hover .rb-axis-bounds,
.rb-series:focus-within .rb-axis-bounds {
  visibility: visible;
}
.rb-sublabel {
  min-height: 22px;
}

/* lupa granulacji: mały wypukły guzik w prawym górnym rogu wiersza, widoczny po najechaniu albo gdy włączony */
.rb-zoom {
  position: absolute;
  z-index: 4;
  top: 2px;
  right: 4px;
  display: grid;
  place-items: center;
  width: 25px;
  height: 24px;
  border: 1px solid var(--cp-line);
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  background: var(--cp-inner);
  color: var(--cp-mark);
  opacity: 0;
  cursor: pointer;
  box-shadow: var(--mg-shadow-rhythm-card);
  transition: opacity 0.12s;
}
.rb-zoom .material-symbols-outlined {
  font-size: 15px;
}
.rb-series:hover .rb-zoom,
.rb-zoom:focus-visible,
.rb-zoom.on {
  opacity: 1;
}
.rb-zoom:hover {
  background: var(--cp-inner);
}
.rb-zoom.on {
  color: var(--mg-color-ink);
  background: var(--cp-inner);
}

.rb-more {
  min-height: 36px;
}
.rb-more .cp-btn {
  grid-column: 1 / 2;
  justify-self: start;
  margin-left: 6px;
}
.rb-note {
  min-height: 44px;
  color: var(--mg-color-muted);
  font-size: 13.5px;
}
.rb-note span {
  grid-column: 1 / -1;
  padding-left: 14px;
}

/* refleksja okresu w karcie tabeli */
.rb-refl {
  display: grid;
  gap: 14px;
  padding: 8px 20px 12px;
}
.rb-refl__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.rb-refl__title {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  color: var(--mg-color-ink);
  font-size: 15px;
  font-weight: 800;
}
.rb-refl__title small {
  color: var(--mg-color-muted);
  font-size: 12.5px;
  font-weight: 700;
}
.rb-refl__anchors {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.rb-refl__anchor {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 12px 16px 14px;
  border-radius: var(--mg-radius-md);
  background: var(--cp-field);
}
.rb-refl__anchor:nth-child(2) {
  border-radius: 14px 18px 15px 17px;
}
.rb-refl__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--cp-mark);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.rb-refl__eyebrow .material-symbols-outlined {
  font-size: 16px;
}
.rb-refl__anchor p {
  margin: 0;
  padding-left: 12px;
  border-left: 2px solid var(--mg-color-state-soft);
  color: var(--mg-color-ink);
  font-size: 13.5px;
  line-height: 1.5;
}
.rb-refl__anchor--hard p {
  border-left-color: rgb(var(--rose-400) / 0.6);
}
.rb-refl__entry {
  display: grid;
  gap: 8px;
  padding: 14px 18px 16px;
  border: 1px solid var(--cp-line);
  border-radius: var(--mg-radius-md);
  background: var(--cp-inner);
}
.rb-refl__entry p {
  margin: 0;
  max-width: 78ch;
  color: var(--mg-color-ink);
  font-size: 14.5px;
  line-height: 1.7;
  white-space: pre-line;
}
.rb-refl__verdicts {
  display: grid;
  gap: 6px;
  padding: 12px 16px 12px;
  border-radius: 14px 18px 15px 17px;
  background: var(--cp-field);
}
.rb-refl__verdicts ul {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}
.rb-refl__verdicts li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 110px;
  gap: 14px;
  align-items: baseline;
  padding: 6px 0;
  font-size: 13.5px;
}
.rb-refl__verdicts li + li {
  border-top: 1px dashed var(--cp-line);
}
.rb-refl__verdicts small {
  color: var(--mg-color-muted);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.rb-refl__verdicts em {
  color: var(--cp-mark);
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
  text-align: right;
}
.rb-refl__empty {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
}
.rb-refl__none {
  margin: 0;
  color: var(--mg-color-muted);
  font-size: 13.5px;
}
</style>
