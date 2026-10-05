<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MomentsWeekStats } from '@product/domain/momentsProgress'
import { noticedEarlyShare, partSummary, respondedShare } from '@product/domain/momentsProgress'
import { partKeys, partLabels, noticingKeys, noticingLabels, weekNumber } from '~lab/lab/shamePath'

/**
 * Momenty, calm version (round 4). First glance = one picture: which part
 * takes the wheel — a bar per part (length = how often in the recent weeks,
 * tone = how strongly, the moment's own 1–5), with a thin tick where the
 * share was in the first weeks. One summary line underneath. Everything
 * else (week-by-week matrix, response discs, noticing bars, two voices,
 * table) sits behind one "Szczegóły" disclosure.
 * Ink = the app's accent (`--mg-color-primary`) and its mixes; the strong
 * end is `--mg-color-primary-fill`, never sky-600 or the navy link tone.
 */
const props = defineProps<{
  stats: MomentsWeekStats[]
  /** Total week columns of the path for the detail matrix; missing ones are empty slots. */
  slots?: number
  /** Reflection block: this week only on the surface, the previous one in the details. */
  compact?: boolean
}>()

const open = ref(false)
const tableOpen = ref(false)
const withMoments = computed(() => props.stats.filter(week => week.total > 0))
const span = computed(() => (props.compact ? 1 : 2))
const recent = computed(() => withMoments.value.slice(-span.value))
const early = computed(() => (withMoments.value.length > span.value ? withMoments.value.slice(0, span.value) : []))
const recentParts = computed(() => partSummary(recent.value))
const earlyParts = computed(() => partSummary(early.value))
const maxShare = computed(() => Math.max(0.2, ...recentParts.value.map(p => p.share), ...earlyParts.value.map(p => p.share)))
const labelOf = (part: string) => (part === 'none' ? 'Żadna część' : partLabels[partKeys.indexOf(part as (typeof partKeys)[number])] ?? part)
const strengthTone = (mean: number | null) => (mean === null ? 'mid' : mean >= 3.5 ? 'strong' : mean >= 2.5 ? 'mid' : 'soft')
const format = (n: number) => n.toFixed(1).replace('.', ',')

const total = computed(() => props.stats.reduce((sum, week) => sum + week.total, 0))
const responded = computed(() => props.stats.reduce((sum, week) => sum + week.responded, 0))
const earlyShare = computed(() => noticedEarlyShare(early.value.length ? early.value : recent.value))
const recentShare = computed(() => noticedEarlyShare(recent.value))
const percent = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)} %`)
const summaryLine = computed(() => {
  if (total.value === 0) return props.compact ? 'Cichy tydzień — bez zapisanych momentów.' : 'Jeszcze bez zapisanych momentów.'
  const parts = [`${total.value} ${total.value === 1 ? 'moment' : total.value < 5 ? 'momenty' : 'momentów'}`, `${responded.value} z odpowiedzią`]
  if (recentShare.value !== null) {
    parts.push(
      early.value.length && earlyShare.value !== null
        ? `zauważone od razu ${percent(earlyShare.value)} → ${percent(recentShare.value)}`
        : `zauważone od razu ${percent(recentShare.value)}`
    )
  }
  return parts.join(' · ')
})
const periodLabel = computed(() => {
  if (props.compact) return 'ten tydzień'
  if (recent.value.length === 0) return ''
  const weeks = recent.value.map(w => `T${weekNumber(w.weekRef)}`)
  return weeks.length === 1 ? weeks[0]! : `${weeks[0]}–${weeks.at(-1)}`
})

// details
const columns = computed(() => Math.max(props.slots ?? props.stats.length, props.stats.length))
const colLabel = (n: number) => {
  const week = props.stats[n - 1]
  if (week) return weekNumber(week.weekRef)
  const first = props.stats[0]
  return first ? weekNumber(first.weekRef) + n - 1 : n
}
const rows = computed(() => [
  ...partKeys.map((key, i) => ({ key, label: partLabels[i]!, kind: 'part' as const })),
  { key: 'none' as const, label: 'Żadna część', kind: 'none' as const },
])
const maxCell = computed(() => Math.max(1, ...props.stats.flatMap(week => [...Object.values(week.byPart), week.unlogged ?? 0])))
const hasEstimates = computed(() => props.stats.some(week => week.unlogged !== undefined))
const fill = (count: number) => Math.min(1, count / maxCell.value)
const noticedBars = computed(() => {
  const build = (label: string, weeks: MomentsWeekStats[]) => {
    const known = weeks.reduce((sum, week) => sum + week.total - week.noticed.unknown, 0)
    return {
      label,
      known,
      early: noticedEarlyShare(weeks),
      segments: noticingKeys.map(key => ({ key, share: known ? weeks.reduce((sum, week) => sum + week.noticed[key], 0) / known : 0 })),
    }
  }
  if (withMoments.value.length === 0) return []
  if (early.value.length === 0) return [build(props.compact ? 'Ten tydzień' : 'Dotąd', recent.value)]
  return [build('Początek', early.value), build('Ostatnio', recent.value)]
})
</script>

<template>
  <div class="smg" :class="{ 'smg--compact': compact }">
    <header class="smg__head">
      <h4>Kto przejmuje ster</h4>
      <small v-if="periodLabel">{{ periodLabel }}</small>
    </header>
    <ul v-if="total" class="smg__parts">
      <li v-for="(part, i) in recentParts" :key="part.part" class="smg__part" :class="{ 'smg__part--none': part.part === 'none' }">
        <span class="smg__part-label">{{ labelOf(part.part) }}</span>
        <span
          class="smg__bar"
          :title="`${labelOf(part.part)}: ${part.count}× (${percent(part.share)}) ${periodLabel}${part.meanStrength !== null ? `, siła ${format(part.meanStrength)} z 5` : ''}${earlyParts[i] && early.length ? `; na początku ${percent(earlyParts[i]!.share)}` : ''}`"
        >
          <i class="smg__fill" :class="`is-${strengthTone(part.meanStrength)}`" :style="{ width: `${(part.share / maxShare) * 100}%` }" />
          <b v-if="early.length && earlyParts[i]" class="smg__tick" :style="{ left: `${(earlyParts[i]!.share / maxShare) * 100}%` }" />
        </span>
        <small class="smg__part-meta">{{ part.count }}×<template v-if="part.meanStrength !== null"> · siła {{ format(part.meanStrength) }}</template></small>
      </li>
    </ul>
    <p class="smg__line">{{ summaryLine }}</p>
    <p v-if="total && early.length" class="smg__legend">pasek = ostatnio · kreska = na początku · ciemniej = mocniej</p>

    <details v-if="total" class="smg__more" :open="open" @toggle="open = ($event.target as HTMLDetailsElement).open">
      <summary>{{ open ? 'Mniej' : 'Szczegóły' }}</summary>
      <div class="smg__details">
        <p class="smg__how">
          Długość paska to udział części w momentach, ciemność — jak mocno przejmowała ster (Twoja ocena 1–5). Na początku więcej
          wpisów zwykle znaczy, że częściej zauważasz. Z czasem patrz na ostatni wiersz: momenty bez żadnej części przy sterze.
        </p>

        <section class="smg__picture">
          <h5>Tydzień po tygodniu</h5>
          <div class="smg__matrix" :style="{ '--cols': columns }" role="img" aria-label="Momenty według części i tygodnia">
            <span class="smg__corner" />
            <small v-for="n in columns" :key="`h${n}`" class="smg__col-head">T{{ colLabel(n) }}</small>
            <template v-for="row in rows" :key="row.key">
              <span class="smg__row-label" :class="{ 'smg__row-label--none': row.kind === 'none' }">{{ row.label }}</span>
              <template v-for="n in columns" :key="`${row.key}${n}`">
                <span
                  v-if="stats[n - 1]"
                  class="smg__cell"
                  :class="{ 'is-quiet': stats[n - 1]!.quiet }"
                  :style="{ '--fill': fill(stats[n - 1]!.byPart[row.key]) }"
                  :title="`${row.label}, T${colLabel(n)}: ${stats[n - 1]!.byPart[row.key]}`"
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
        </section>

        <section class="smg__picture">
          <h5>Odpowiedź zamiast reakcji <small>{{ responded }} z {{ total }}</small></h5>
          <div class="smg__discs" :style="{ '--cols': columns }">
            <template v-for="n in columns" :key="`d${n}`">
              <span v-if="stats[n - 1]" class="smg__disc-col" :title="`T${colLabel(n)}: ${stats[n - 1]!.total ? percent(respondedShare([stats[n - 1]!])) : 'cichy tydzień'}`">
                <i class="smg__disc" :class="{ 'is-quiet': stats[n - 1]!.quiet }" :style="{ '--fill': stats[n - 1]!.total ? `${(stats[n - 1]!.responded / stats[n - 1]!.total) * 100}%` : '0%' }"><b v-if="stats[n - 1]!.quiet">—</b></i>
                <small>{{ stats[n - 1]!.total ? `${stats[n - 1]!.responded}/${stats[n - 1]!.total}` : '' }}</small>
                <small class="smg__disc-week">T{{ colLabel(n) }}</small>
              </span>
              <span v-else class="smg__disc-col" aria-hidden="true"><i class="smg__disc smg__disc--slot" /><small /><small class="smg__disc-week">T{{ colLabel(n) }}</small></span>
            </template>
          </div>
          <p class="smg__how">Dysk wypełnia się od dołu: jaka część momentów tygodnia miała jakąkolwiek odpowiedź. Każda próba się liczy, także spóźniona.</p>
        </section>

        <section class="smg__picture">
          <h5>Kiedy zauważam</h5>
          <div v-for="bar in noticedBars" :key="bar.label" class="smg__bar-row">
            <span class="smg__bar-label">{{ bar.label }}</span>
            <span class="smg__stack" :title="`${bar.label}: w trakcie lub po chwili ${percent(bar.early)} z ${bar.known} momentów`">
              <i v-for="(segment, i) in bar.segments" :key="segment.key" :class="`smg__seg-${i}`" :style="{ flexBasis: `${segment.share * 100}%` }" />
            </span>
            <small class="smg__bar-value">{{ percent(bar.early) }}</small>
          </div>
          <p class="smg__legend smg__legend--row">
            <span v-for="(label, i) in noticingLabels" :key="label"><i :class="`smg__seg-${i}`" />{{ label }}</span>
          </p>
          <p class="smg__how">Im więcej ciemnego po lewej, tym wcześniej zauważasz — i tym więcej czasu masz na odpowiedź.</p>
        </section>

        <section class="smg__picture smg__picture--row">
          <h5>Dwa głosy</h5>
          <p class="smg__how">
            Głos krytyka zapisany {{ stats.reduce((s, w) => s + w.criticLogged, 0) }}×, głos życzliwy {{ stats.reduce((s, w) => s + w.kindVoiceLogged, 0) }}×.
          </p>
          <button type="button" class="smg__link" :aria-expanded="tableOpen" @click="tableOpen = !tableOpen">{{ tableOpen ? 'Ukryj tabelę' : 'Dane w tabeli' }}</button>
        </section>

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
                <th>Głosy k·ż</th>
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
                <td>{{ week.criticLogged }} · {{ week.kindVoiceLogged }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </details>
  </div>
</template>

<style scoped>
.smg {
  /* Chart ink ladder = the quiet ritual's: accent and its mixes, strong = primary fill. */
  --ink: var(--mg-color-primary);
  --ink-strong: var(--mg-color-primary-fill);
  --ink-mid: color-mix(in srgb, var(--mg-color-primary) 62%, var(--mg-color-paper));
  --ink-soft: color-mix(in srgb, var(--mg-color-primary) 34%, var(--mg-color-paper));
  --ink-faint: color-mix(in srgb, var(--mg-color-primary) 16%, var(--mg-color-paper));
  --smg-cell: 1.1rem;
  display: grid;
  gap: var(--mg-space-2);
  color: var(--mg-color-ink);
}
.smg__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--mg-space-2);
}
.smg__head h4,
.smg__picture h5 {
  margin: 0;
  font-size: var(--mg-font-size-sm);
  font-weight: 800;
}
.smg__head small,
.smg__picture h5 small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}

/* first glance: one bar per part */
.smg__parts {
  display: grid;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.smg__part {
  display: grid;
  grid-template-columns: 6.2rem minmax(0, 1fr) auto;
  gap: var(--mg-space-2);
  align-items: center;
}
.smg__part--none {
  margin-top: 3px;
  padding-top: 5px;
  border-top: 1.5px dashed color-mix(in srgb, var(--mg-color-muted) 30%, transparent);
}
.smg__part-label {
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
  line-height: 1.2;
}
.smg__part--none .smg__part-label {
  color: var(--mg-color-primary-strong);
}
.smg__bar {
  position: relative;
  display: block;
  height: 0.75rem;
  border-radius: 6px 5px 6px 5px;
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-inset-sm);
}
.smg__fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: var(--ink);
  transition: width var(--mg-duration-normal) var(--mg-ease-standard);
}
.smg__fill.is-soft {
  background: var(--ink-soft);
}
.smg__fill.is-strong {
  background: var(--ink-strong);
}
.smg__part--none .smg__fill {
  background: var(--ink-strong);
}
.smg__tick {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  border-radius: 1px;
  background: var(--mg-color-primary-strong);
  transform: translateX(-50%);
}
.smg__part-meta {
  min-width: 5.4rem;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
}
.smg__line {
  margin: 2px 0 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
  line-height: 1.4;
}
.smg__legend {
  margin: 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  line-height: 1.4;
}
.smg__legend--row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-weight: 700;
}
.smg__legend--row > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.smg__legend--row i {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 3px;
}

/* details disclosure */
.smg__more {
  margin-top: 2px;
}
.smg__more > summary {
  width: fit-content;
  cursor: pointer;
  list-style: none;
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-xs);
  font-weight: 800;
}
.smg__more > summary::-webkit-details-marker {
  display: none;
}
.smg__details {
  display: grid;
  gap: var(--mg-space-4);
  margin-top: var(--mg-space-3);
  padding-top: var(--mg-space-3);
  border-top: 1.5px dashed color-mix(in srgb, var(--mg-color-muted) 38%, transparent);
}
.smg__picture {
  display: grid;
  gap: var(--mg-space-2);
}
.smg__picture--row {
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: baseline;
  gap: var(--mg-space-3);
}
.smg__how {
  margin: 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  line-height: 1.5;
}

/* matrix */
.smg__matrix {
  display: grid;
  grid-template-columns: minmax(6.2rem, auto) repeat(var(--cols), var(--smg-cell));
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
.smg__cell {
  width: var(--smg-cell);
  height: var(--smg-cell);
  border: 1px solid var(--mg-color-border);
  border-radius: 5px 4px 5px 4px;
  background: color-mix(in srgb, var(--ink-strong) calc(var(--fill, 0) * 100%), var(--mg-color-paper));
}
.smg__cell.is-quiet {
  border-style: dotted;
  background: transparent;
}
.smg__cell--est {
  border: 1px dashed var(--mg-color-muted);
  background: color-mix(in srgb, var(--ink-soft) calc(var(--fill, 0) * 100%), transparent);
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

/* discs */
.smg__discs {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 2.3rem));
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
  width: 1.6rem;
  height: 1.6rem;
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-organic-a);
  background: linear-gradient(to top, var(--ink) var(--fill, 0%), var(--mg-color-paper) var(--fill, 0%));
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

/* stacked bars */
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
.smg__stack {
  display: flex;
  height: 0.7rem;
  overflow: hidden;
  border-radius: 6px 5px 6px 5px;
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-inset-sm);
}
.smg__stack i {
  flex: 0 0 auto;
}
.smg__bar-value {
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-xs);
  font-weight: 800;
  text-align: right;
}
.smg__seg-0 { background: var(--ink-strong); }
.smg__seg-1 { background: var(--ink); }
.smg__seg-2 { background: var(--ink-mid); }
.smg__seg-3 { background: var(--ink-faint); }

.smg__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--mg-color-primary-strong);
  font: inherit;
  font-size: var(--mg-font-size-xs);
  font-weight: 800;
  cursor: pointer;
}
.smg__table-wrap {
  overflow: auto;
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
  .smg__fill,
  .smg__cell,
  .smg__disc,
  .smg__stack i {
    forced-color-adjust: none;
    border: 1px solid CanvasText;
  }
}
</style>
