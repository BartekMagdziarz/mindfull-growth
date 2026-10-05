<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MomentsWeekStats } from '@product/domain/momentsProgress'
import { noticedEarlyShare, respondedShare } from '@product/domain/momentsProgress'
import { partKeys, partLabels, noticingKeys, noticingLabels, weekNumber } from '~lab/lab/shamePath'

/**
 * The three pictures read from Momenty, in the app's own chart language:
 * 1. "Kto przejmuje ster" — a matrix heatmap (rows = parts, columns = weeks),
 *    the idiom of the Kalendarz week cards; tone = how often; the row
 *    "Żadna część" is the new pattern and reads in the strong ink.
 * 2. "Odpowiedź zamiast reakcji" — one reading disc per week filled from the
 *    bottom, the idiom of the Dzisiaj 7-day strip; fraction underneath.
 * 3. "Kiedy zauważam" — two stacked bars, the first weeks against the last.
 * No categorical palette, no patterns: sky tones only, strong = more.
 */
const props = defineProps<{
  stats: MomentsWeekStats[]
  /** How many week columns the path has in total; missing ones are empty slots. */
  slots?: number
  compact?: boolean
}>()

const columns = computed(() => Math.max(props.slots ?? props.stats.length, props.stats.length))
const hovered = ref<number | null>(null)
const active = computed(() => (hovered.value === null ? props.stats.at(-1) : props.stats[hovered.value]))
const tableOpen = ref(false)

const rows = computed(() => [
  ...partKeys.map((key, i) => ({ key, label: partLabels[i]!, kind: 'part' as const })),
  { key: 'none' as const, label: 'Żadna część', kind: 'none' as const },
])
const maxCell = computed(() =>
  Math.max(1, ...props.stats.flatMap(week => [...Object.values(week.byPart), week.unlogged ?? 0]))
)
const hasEstimates = computed(() => props.stats.some(week => week.unlogged !== undefined))
const fill = (count: number) => Math.min(1, count / maxCell.value)

const totalMoments = computed(() => props.stats.reduce((sum, week) => sum + week.total, 0))
const totalResponded = computed(() => props.stats.reduce((sum, week) => sum + week.responded, 0))

const withMoments = computed(() => props.stats.filter(week => week.total > 0))
const span = computed(() => (props.compact ? 1 : 2))
const noticedBars = computed(() => {
  const list = withMoments.value
  if (list.length === 0) return []
  const build = (label: string, weeks: MomentsWeekStats[]) => {
    const known = weeks.reduce((sum, week) => sum + week.total - week.noticed.unknown, 0)
    return {
      label,
      known,
      early: noticedEarlyShare(weeks),
      segments: noticingKeys.map(key => ({
        key,
        share: known ? weeks.reduce((sum, week) => sum + week.noticed[key], 0) / known : 0,
      })),
    }
  }
  if (list.length <= span.value) return [build(props.compact ? 'Ten tydzień' : 'Dotąd', list)]
  return [build('Początek', list.slice(0, span.value)), build('Ostatnio', list.slice(-span.value))]
})

/** Column n (1-based) → the path week number it stands for, also for empty slots. */
const colLabel = (n: number) => {
  const week = props.stats[n - 1]
  if (week) return weekNumber(week.weekRef)
  const first = props.stats[0]
  return first ? weekNumber(first.weekRef) + n - 1 : n
}
const percent = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)} %`)
const columnTitle = (week: MomentsWeekStats) =>
  week.quiet
    ? `Tydzień ${weekNumber(week.weekRef)}: cichy tydzień, bez zapisanych momentów`
    : `Tydzień ${weekNumber(week.weekRef)}: ${week.total} momentów · ${partLabels
        .map((label, j) => `${label} ${week.byPart[partKeys[j]!]}`)
        .join(', ')}, żadna ${week.byPart.none}${week.unlogged !== undefined ? ` · niezapisane ≈ ${week.unlogged}` : ''}`
const readout = computed(() => {
  const week = active.value
  if (!week) return 'Jeszcze bez zapisów.'
  const n = weekNumber(week.weekRef)
  if (week.quiet) return `T${n} · cichy tydzień${week.unlogged ? ` · około ${week.unlogged} niezapisanych` : ''}`
  const top = [...partKeys].sort((a, b) => week.byPart[b] - week.byPart[a])[0]!
  const topLabel = week.byPart[top] > 0 ? partLabels[partKeys.indexOf(top)] : null
  return `T${n} · ${week.total} momentów${topLabel ? ` · najczęściej ${topLabel}` : ''}${
    week.byPart.none ? ` · ${week.byPart.none}× żadna część` : ''
  }${week.unlogged ? ` · ≈ ${week.unlogged} niezapisanych` : ''}`
})
</script>

<template>
  <div class="smg" :class="{ 'smg--compact': compact }">
    <!-- 1 · matrix -->
    <section class="smg__picture">
      <header class="smg__head">
        <h4>Kto przejmuje ster</h4>
        <details class="smg__how">
          <summary>Jak czytać</summary>
          <p>
            Ciemniej = częściej. Na początku więcej wpisów zwykle znaczy, że częściej zauważasz. Później patrz na
            ostatni wiersz: momenty, w których żadna część nie przejęła steru.
          </p>
        </details>
      </header>
      <div class="smg__matrix" :style="{ '--cols': columns }" role="img" :aria-label="`Momenty według części i tygodnia. ${readout}`">
        <span class="smg__corner" />
        <small v-for="n in columns" :key="`h${n}`" class="smg__col-head" :class="{ 'is-active': active && weekNumber(active.weekRef) === colLabel(n) }">T{{ colLabel(n) }}</small>
        <template v-for="row in rows" :key="row.key">
          <span class="smg__row-label" :class="{ 'smg__row-label--none': row.kind === 'none' }">{{ row.label }}</span>
          <template v-for="n in columns" :key="`${row.key}${n}`">
            <button
              v-if="stats[n - 1]"
              type="button"
              class="smg__cell"
              :class="{ 'smg__cell--none': row.kind === 'none', 'is-quiet': stats[n - 1]!.quiet }"
              :style="{ '--fill': fill(stats[n - 1]!.byPart[row.key]) }"
              :title="columnTitle(stats[n - 1]!)"
              :aria-label="`${row.label}, tydzień ${colLabel(n)}: ${stats[n - 1]!.byPart[row.key]}`"
              @mouseenter="hovered = n - 1"
              @mouseleave="hovered = null"
              @focus="hovered = n - 1"
              @blur="hovered = null"
            />
            <span v-else class="smg__cell smg__cell--slot" aria-hidden="true" />
          </template>
        </template>
        <template v-if="hasEstimates">
          <span class="smg__row-label smg__row-label--est">Niezapisane ≈</span>
          <template v-for="n in columns" :key="`est${n}`">
            <span
              v-if="stats[n - 1]"
              class="smg__cell smg__cell--est"
              :class="{ 'is-empty': !stats[n - 1]!.unlogged }"
              :style="{ '--fill': fill(stats[n - 1]!.unlogged ?? 0) }"
              :title="stats[n - 1]!.unlogged === undefined ? 'Bez oszacowania' : `Około ${stats[n - 1]!.unlogged} niezapisanych`"
            />
            <span v-else class="smg__cell smg__cell--slot" aria-hidden="true" />
          </template>
        </template>
      </div>
      <p class="smg__readout" aria-live="polite">{{ readout }}</p>
    </section>

    <!-- 2 · reading discs -->
    <section class="smg__picture">
      <header class="smg__head">
        <h4>Odpowiedź zamiast reakcji</h4>
        <strong v-if="totalMoments" class="smg__sum">{{ totalResponded }} z {{ totalMoments }}</strong>
        <details class="smg__how">
          <summary>Jak czytać</summary>
          <p>Dysk wypełnia się od dołu: jaka część momentów tygodnia miała jakąkolwiek odpowiedź. Każda próba się liczy, także spóźniona. Pusty dysk z kreską to cichy tydzień.</p>
        </details>
      </header>
      <div class="smg__discs" :style="{ '--cols': columns }">
        <template v-for="n in columns" :key="`d${n}`">
          <span v-if="stats[n - 1]" class="smg__disc-col" :title="`T${colLabel(n)}: ${stats[n - 1]!.total ? percent(respondedShare([stats[n - 1]!])) : 'cichy tydzień'}`">
            <i
              class="smg__disc"
              :class="{ 'is-quiet': stats[n - 1]!.quiet }"
              :style="{ '--fill': stats[n - 1]!.total ? `${(stats[n - 1]!.responded / stats[n - 1]!.total) * 100}%` : '0%' }"
            ><b v-if="stats[n - 1]!.quiet">—</b></i>
            <small>{{ stats[n - 1]!.total ? `${stats[n - 1]!.responded}/${stats[n - 1]!.total}` : '' }}</small>
            <small class="smg__disc-week">T{{ colLabel(n) }}</small>
          </span>
          <span v-else class="smg__disc-col smg__disc-col--slot" aria-hidden="true">
            <i class="smg__disc smg__disc--slot" /><small /><small class="smg__disc-week">T{{ colLabel(n) }}</small>
          </span>
        </template>
      </div>
    </section>

    <!-- 3 · stacked bars -->
    <section class="smg__picture">
      <header class="smg__head">
        <h4>Kiedy zauważam</h4>
        <details class="smg__how">
          <summary>Jak czytać</summary>
          <p>Im więcej ciemnego po lewej, tym wcześniej zauważasz — i tym więcej czasu masz na odpowiedź. Wpisy bez odpowiedzi „kiedy” są poza paskiem.</p>
        </details>
      </header>
      <p v-if="!noticedBars.length" class="smg__empty">Pojawi się po pierwszych momentach.</p>
      <div v-for="bar in noticedBars" :key="bar.label" class="smg__bar-row">
        <span class="smg__bar-label">{{ bar.label }}</span>
        <span class="smg__bar" :title="`${bar.label}: w trakcie lub po chwili ${percent(bar.early)} z ${bar.known} momentów`">
          <i v-for="(segment, i) in bar.segments" :key="segment.key" :class="`smg__seg-${i}`" :style="{ flexBasis: `${segment.share * 100}%` }" />
        </span>
        <small class="smg__bar-value">{{ percent(bar.early) }}</small>
      </div>
      <p v-if="noticedBars.length" class="smg__legend">
        <span v-for="(label, i) in noticingLabels" :key="label"><i :class="`smg__seg-${i}`" />{{ label }}</span>
        <span class="smg__legend-note">liczba = w trakcie lub po chwili</span>
      </p>
    </section>

    <footer v-if="!compact" class="smg__foot">
      <details class="smg__how smg__how--voices">
        <summary>Dwa głosy</summary>
        <p>
          Głos krytyka zapisany {{ stats.reduce((s, w) => s + w.criticLogged, 0) }}×, głos życzliwy
          {{ stats.reduce((s, w) => s + w.kindVoiceLogged, 0) }}×.
          <span v-for="week in stats" :key="week.weekRef" class="smg__voice">T{{ weekNumber(week.weekRef) }} {{ week.criticLogged }}·{{ week.kindVoiceLogged }}</span>
        </p>
      </details>
      <button type="button" class="smg__link" :aria-expanded="tableOpen" @click="tableOpen = !tableOpen">
        {{ tableOpen ? 'Ukryj tabelę' : 'Dane w tabeli' }}
      </button>
    </footer>
    <div v-if="tableOpen" class="smg__table-wrap">
      <table>
        <caption>Momenty · liczby zapisów, nie ocena</caption>
        <thead>
          <tr>
            <th>Tydzień</th>
            <th v-for="label in partLabels" :key="label">{{ label }}</th>
            <th>Żadna</th>
            <th>Niezapisane ≈</th>
            <th>Odpowiedź</th>
            <th>Wcześnie</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="week in stats" :key="week.weekRef">
            <th>T{{ weekNumber(week.weekRef) }}</th>
            <td v-for="key in partKeys" :key="key">{{ week.byPart[key] }}</td>
            <td>{{ week.byPart.none }}</td>
            <td>{{ week.unlogged ?? '—' }}</td>
            <td>{{ week.responded }} / {{ week.total }}</td>
            <td>{{ week.noticed.during + week.noticed.soon }} / {{ week.total - week.noticed.unknown }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.smg {
  --smg-cell: 1.15rem;
  display: grid;
  gap: var(--mg-space-4);
  color: var(--mg-color-ink);
}
.smg--compact {
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: var(--mg-space-5);
}
.smg__picture {
  display: grid;
  gap: var(--mg-space-2);
  align-content: start;
}
.smg__head {
  display: flex;
  align-items: baseline;
  gap: var(--mg-space-2);
}
.smg__head h4 {
  margin: 0;
  font-size: var(--mg-font-size-sm);
  font-weight: 800;
}
.smg__sum {
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-sm);
  font-weight: 800;
}
.smg__how {
  margin-left: auto;
  position: relative;
  font-size: var(--mg-font-size-xs);
  color: var(--mg-color-muted);
}
.smg__how summary {
  cursor: pointer;
  list-style: none;
  font-weight: 700;
  color: var(--mg-color-primary-strong);
}
.smg__how summary::-webkit-details-marker {
  display: none;
}
.smg__how p {
  margin: var(--mg-space-2) 0 0;
  line-height: 1.5;
}
.smg__how:not(.smg__how--voices)[open] p {
  position: absolute;
  right: 0;
  z-index: 3;
  width: 19rem;
  padding: var(--mg-space-3);
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-raised-sm);
}

/* 1 · matrix: the week-card heatmap grammar — square organic cells, tone = count. */
.smg__matrix {
  display: grid;
  grid-template-columns: minmax(6.5rem, auto) repeat(var(--cols), var(--smg-cell));
  gap: 4px 5px;
  align-items: center;
  justify-content: start;
}
.smg__col-head {
  justify-self: center;
  color: var(--mg-color-muted);
  font-size: 0.66rem;
  font-weight: 800;
  line-height: 1;
}
.smg__col-head.is-active {
  color: var(--mg-color-primary-strong);
}
.smg__row-label {
  padding-right: var(--mg-space-2);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
  line-height: 1.2;
}
.smg__row-label--none {
  color: var(--mg-color-primary-strong);
}
.smg__row-label--none,
.smg__row-label--none ~ .smg__cell {
  margin-top: 4px;
}
.smg__row-label--est {
  font-weight: 600;
}
.smg__cell {
  width: var(--smg-cell);
  height: var(--smg-cell);
  padding: 0;
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-organic-b);
  background: color-mix(in srgb, var(--mg-color-state) calc(var(--fill, 0) * 100%), var(--mg-color-paper));
  cursor: default;
}
.smg__cell:nth-of-type(odd) {
  border-radius: var(--mg-radius-organic-c);
}
.smg__cell[style*='--fill: 0'] {
  background: var(--mg-color-paper);
}
.smg__cell--none {
  background: color-mix(in srgb, var(--mg-color-primary-strong) calc(var(--fill, 0) * 100%), var(--mg-color-paper));
}
.smg__cell.is-quiet {
  border-style: dotted;
  background: transparent;
}
.smg__cell--est {
  border: 1px dashed var(--mg-color-muted);
  background: color-mix(in srgb, var(--mg-color-state-soft) calc(var(--fill, 0) * 100%), transparent);
}
.smg__cell--est.is-empty {
  border-color: var(--mg-color-border);
  background: transparent;
}
.smg__cell--slot {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--mg-color-border) 70%, transparent);
  background: transparent;
}
.smg__cell:hover,
.smg__cell:focus-visible {
  outline: 2px solid var(--mg-color-primary-strong);
  outline-offset: 1px;
}
.smg__readout {
  margin: 0;
  min-height: 1.2em;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  line-height: 1.4;
}

/* 2 · reading discs: the Dzisiaj strip — organic well, fills from the bottom. */
.smg__discs {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 2.4rem));
  gap: var(--mg-space-1);
  justify-content: start;
}
.smg__disc-col {
  display: grid;
  justify-items: center;
  gap: 3px;
}
.smg__disc {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-organic-a);
  /* Paper well, filled from the bottom with the state ink — the done tone of Dzisiaj. */
  background: linear-gradient(to top, var(--mg-color-state) var(--fill, 0%), var(--mg-color-paper) var(--fill, 0%));
  box-shadow: var(--mg-shadow-inset-sm);
  font-style: normal;
}
.smg__disc-col:nth-child(even) .smg__disc {
  border-radius: var(--mg-radius-organic-b);
}
.smg__disc.is-quiet {
  background: var(--mg-color-paper);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
}
.smg__disc--slot {
  border-style: dashed;
  background: transparent;
  box-shadow: none;
}
.smg__disc-col small {
  min-height: 0.8rem;
  color: var(--mg-color-primary-strong);
  font-size: 0.66rem;
  font-weight: 800;
  line-height: 1;
}
.smg__disc-col .smg__disc-week {
  color: var(--mg-color-muted);
  font-weight: 700;
}

/* 3 · stacked bars: sky tones from strong (as it happened) to faint (much later). */
.smg__bar-row {
  display: grid;
  grid-template-columns: 4.6rem minmax(0, 1fr) 2.8rem;
  gap: var(--mg-space-2);
  align-items: center;
}
.smg__bar-label {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}
.smg__bar {
  display: flex;
  height: 0.7rem;
  overflow: hidden;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-canvas);
  box-shadow: var(--mg-shadow-inset-sm);
}
.smg__bar i {
  flex: 0 0 auto;
  min-width: 0;
}
.smg__bar-value {
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-xs);
  font-weight: 800;
  text-align: right;
}
.smg__seg-0 { background: var(--mg-color-primary-strong); }
.smg__seg-1 { background: var(--mg-color-state); }
.smg__seg-2 { background: var(--mg-color-state-soft); }
.smg__seg-3 { background: var(--mg-color-sky-well); }
.smg__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin: 0;
  color: var(--mg-color-muted);
  font-size: 0.66rem;
  font-weight: 700;
}
.smg__legend > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.smg__legend i {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: var(--mg-radius-organic-b);
}
.smg__legend-note {
  margin-left: auto;
  font-weight: 600;
}
.smg__empty {
  margin: 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
}

.smg__foot {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--mg-space-3);
}
.smg__how--voices {
  margin-left: 0;
}
.smg__voice {
  display: inline-block;
  margin-left: 6px;
  color: var(--mg-color-muted);
}
.smg__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--mg-color-primary-strong);
  font: inherit;
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
  cursor: pointer;
}
.smg__table-wrap {
  overflow: auto;
}
.smg--compact .smg__table-wrap {
  grid-column: 1 / -1;
}
.smg table {
  min-width: 36rem;
  border-collapse: collapse;
  font-size: var(--mg-font-size-xs);
}
.smg th,
.smg td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--mg-color-border);
  text-align: left;
}
.smg caption {
  padding-bottom: 6px;
  color: var(--mg-color-muted);
  text-align: left;
}
@media (forced-colors: active) {
  .smg__cell,
  .smg__disc,
  .smg__bar i {
    forced-color-adjust: none;
    border: 1px solid CanvasText;
  }
}
</style>
