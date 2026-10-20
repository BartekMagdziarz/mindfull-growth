<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MomentsWeekStats, ShamePartKey } from '@product/domain/momentsProgress'
import { dominantPart, PART_COLOR, PART_LABEL, PART_ORDER } from '~lab/lab/momentsParts'

/**
 * "Kto przejmował ster" for the weekly reflection: last week next to this
 * one. The same pencil-on-sky columns as the path view (round 6j–6m), with
 * three differences for this place:
 * - columns have a FIXED width (2.6 rem) and sit left-aligned — the product's
 *   `repeat(cols, 1fr)` stretched one week across half the card;
 * - a week with no logged Moments still draws the "unlogged" estimate as a
 *   dashed cap (the product returns a quiet column and hides it);
 * - Moments backfilled in the reflection are hatched, never solid: a part
 *   named a week later is a memory, not a catch.
 */
const props = withDefaults(
  defineProps<{
    /** Oldest first (two weeks here). */
    stats: MomentsWeekStats[]
    /** Per week, how many of each part were backfilled (drawn hatched). */
    backfilled?: Partial<Record<string, Partial<Record<ShamePartKey, number>>>>
    /** 1-based path week of `stats[0]`. */
    firstWeek?: number
  }>(),
  { backfilled: () => ({}), firstWeek: 1 },
)

const partStyle = (part: ShamePartKey) => ({ '--part': PART_COLOR[part] })
const plural = (n: number) => (n === 1 ? 'moment' : n >= 2 && n <= 4 ? 'momenty' : 'momentów')
/** Scale: the tallest week including its estimate, never below 4 so two Moments do not fill the whole height. */
const scale = computed(() => Math.max(4, ...props.stats.map(week => week.total + (week.unlogged ?? 0))))

interface Segment { key: string; part: ShamePartKey; count: number; share: number; hatched: boolean }
interface Column { key: string; label: string; week: MomentsWeekStats; quiet: boolean; unloggedHeight: number; segments: Segment[]; title: string }
const columns = computed<Column[]>(() =>
  props.stats.map((week, i) => {
    const label = `T${props.firstWeek + i}`
    const later = props.backfilled[week.weekRef] ?? {}
    const segments: Segment[] = []
    for (const part of PART_ORDER) {
      const hatched = later[part] ?? 0
      const solid = week.byPart[part] - hatched
      if (solid > 0) segments.push({ key: `${part}-solid`, part, count: solid, share: solid / scale.value, hatched: false })
      if (hatched > 0) segments.push({ key: `${part}-later`, part, count: hatched, share: hatched / scale.value, hatched: true })
    }
    const unloggedHeight = (week.unlogged ?? 0) / scale.value
    const quiet = week.total === 0 && !unloggedHeight
    const dominant = dominantPart(week)
    const title = quiet
      ? `${label}: cichy tydzień`
      : `${label}: ${week.total} ${plural(week.total)}${week.unlogged ? ` · ≈ ${week.unlogged} bez zapisu` : ''}${dominant ? ` · ster: ${PART_LABEL[dominant.part]}` : ''}`
    return { key: label, label, week, quiet, unloggedHeight, segments, title }
  }),
)

const hovered = ref<number | null>(null)
const hoveredColumn = computed(() => (hovered.value === null ? null : columns.value[hovered.value] ?? null))
const legend = computed(() => {
  const col = hoveredColumn.value
  const week = col && !col.quiet ? col.week : null
  const dominant = week ? dominantPart(week) : null
  const top = dominant ? new Set([dominant.part, ...dominant.tiedWith]) : new Set<ShamePartKey>()
  return [...PART_ORDER].reverse().map(part => ({
    part,
    label: PART_LABEL[part],
    count: week ? week.byPart[part] : null,
    later: week ? props.backfilled[week.weekRef]?.[part] ?? 0 : 0,
    dominant: top.has(part),
  }))
})
const legendHead = computed(() => {
  const col = hoveredColumn.value
  if (!col) return ''
  if (col.quiet) return `${col.label} · cichy tydzień`
  const parts = [`${col.label} · ${col.week.total} ${plural(col.week.total)}`]
  if (col.week.unlogged) parts.push(`≈ ${col.week.unlogged} bez zapisu`)
  return parts.join(' · ')
})
</script>

<template>
  <div class="wpc">
    <div class="wpc__legend" aria-label="Części">
      <small class="wpc__legend-head" :class="{ 'is-on': legendHead }">{{ legendHead || ' ' }}</small>
      <div v-for="row in legend" :key="row.part" class="wpc__legend-row" :class="{ 'is-dominant': row.dominant, 'is-zero': row.count === 0 }">
        <i :style="partStyle(row.part)" /><span class="wpc__legend-name">{{ row.label }}</span
        ><span class="wpc__legend-n">{{ row.count === null ? '' : row.count || '·' }}<em v-if="row.later"> (+{{ row.later }})</em></span>
      </div>
    </div>
    <div class="wpc__plot" @mouseleave="hovered = null">
      <div class="wpc__weeks" role="img" aria-label="Kto przejmował ster: poprzedni tydzień i ten">
        <div
          v-for="(col, i) in columns"
          :key="col.key"
          class="wpc__week"
          :class="{ 'is-quiet': col.quiet, 'is-on': hovered === i }"
          tabindex="0"
          :aria-label="col.title"
          @mouseenter="hovered = i"
          @focus="hovered = i"
          @blur="hovered = null"
        >
          <span class="wpc__col">
            <i v-if="col.unloggedHeight" class="wpc__unlogged" :style="{ height: `${col.unloggedHeight * 100}%` }" />
            <i v-for="seg in col.segments" :key="seg.key" class="wpc__seg" :class="{ 'is-later': seg.hatched }" :style="{ ...partStyle(seg.part), flexBasis: `${seg.share * 100}%` }" />
          </span>
          <small class="wpc__axis" :class="{ 'is-on': hovered === i }">{{ col.label }}</small>
        </div>
      </div>
      <i class="wpc__pencil" aria-hidden="true" />
    </div>
  </div>
</template>

<style scoped>
.wpc {
  --ink: color-mix(in srgb, rgb(var(--sky-800)) 38%, transparent);
  --pencil: color-mix(in srgb, var(--mg-color-muted) 58%, transparent);
  --col-h: 4.2rem;
  --col-w: 2.6rem;
  display: grid;
  grid-template-columns: 7.2rem auto;
  gap: var(--mg-space-3);
  align-items: end;
  width: fit-content;
  font-family: var(--mg-font-sans);
}
.wpc__legend { display: grid; gap: 2px; align-self: start; padding-top: 2px; }
.wpc__legend-head { min-height: 0.9rem; margin-bottom: 2px; color: var(--mg-color-muted); font-size: 0.62rem; font-weight: 700; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0; transition: opacity 120ms ease; }
.wpc__legend-head.is-on { opacity: 1; }
.wpc__legend-row { display: grid; grid-template-columns: 0.6rem minmax(0, 1fr) auto; gap: 5px; align-items: start; min-height: 0.9rem; color: var(--mg-color-muted); font-size: 0.66rem; font-weight: 700; line-height: 1.2; transition: color 120ms ease; }
.wpc__legend-row i { display: block; width: 0.55rem; height: 0.55rem; margin-top: 0.12rem; border-radius: var(--mg-radius-organic-a); background: var(--part); box-shadow: inset 0 0 0 1px var(--ink); }
.wpc__legend-row:nth-child(odd) i { border-radius: var(--mg-radius-organic-b); }
.wpc__legend-n { min-width: 0.7rem; text-align: right; font-variant-numeric: tabular-nums; }
.wpc__legend-n em { font-style: normal; font-weight: 600; opacity: 0.8; }
.wpc__legend-row.is-dominant { color: var(--mg-color-ink); font-weight: 800; }
.wpc__legend-row.is-zero { opacity: 0.55; }

.wpc__plot { position: relative; display: grid; }
.wpc__weeks { display: flex; gap: 10px; align-items: end; }
.wpc__week { display: grid; grid-template-rows: var(--col-h) auto; gap: 4px; width: var(--col-w); outline: none; transform: rotate(0.35deg); transform-origin: bottom center; }
.wpc__week:nth-child(even) { transform: rotate(-0.3deg); }
.wpc__col { display: flex; flex-direction: column-reverse; gap: 2px; width: 100%; height: 100%; transition: filter 120ms ease; }
.wpc__seg { display: block; flex: 0 0 auto; min-height: 3px; border-radius: 5px 4px 5px 4px; background: var(--part); box-shadow: inset 0 0 0 1px var(--ink); }
.wpc__col .wpc__seg:last-child { border-radius: 7px 6px 4px 5px; }
.wpc__col .wpc__seg:first-child { border-radius: 4px 5px 6px 7px; }
/* backfilled in the reflection: the part's colour, but drawn as a hatch — a memory, not a catch */
.wpc__seg.is-later { background: repeating-linear-gradient(135deg, var(--part) 0 3px, var(--mg-color-paper) 3px 5px); }
.wpc__unlogged { order: 1; display: block; flex: 0 0 auto; border: 1px dashed var(--pencil); border-bottom: 0; border-radius: 7px 6px 0 0; }
.wpc__week.is-on .wpc__col { filter: saturate(1.15) brightness(0.98); }
.wpc__week:focus-visible .wpc__col { box-shadow: var(--mg-focus-ring); border-radius: 6px; }
/* the baseline under the columns only, not across the whole card */
.wpc__pencil { position: absolute; right: -6px; bottom: calc(0.62rem + 4px); left: -6px; z-index: 0; display: block; height: 0; border-top: 1.5px dashed var(--pencil); transform: rotate(-0.15deg); }
.wpc__week { position: relative; z-index: 1; }
.wpc__axis { color: var(--mg-color-muted); font-size: 0.62rem; font-weight: 700; line-height: 1; text-align: center; }
.wpc__axis.is-on { color: var(--mg-color-ink); }

@media (forced-colors: active) {
  .wpc__seg, .wpc__legend-row i { forced-color-adjust: none; border: 1px solid CanvasText; }
}
</style>
