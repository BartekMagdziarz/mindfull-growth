<template>
  <div class="pc" :class="{ 'pc--compact': compact }" data-testid="path-parts-chart">
    <div class="pc__legend" :aria-label="t('programs.glance.partsLegend')">
      <small class="pc__legend-head" :class="{ 'is-on': legendHead }">{{ legendHead || ' ' }}</small>
      <div
        v-for="row in legend"
        :key="row.part"
        class="pc__legend-row"
        :class="{ 'is-dominant': row.dominant, 'is-zero': row.count === 0 }"
      >
        <i :style="partStyle(row.part)" /><span class="pc__legend-name">{{ row.label }}</span
        ><span class="pc__legend-n">{{ row.count === null ? '' : row.count || '·' }}<em v-if="row.later"> (+{{ row.later }})</em></span>
      </div>
    </div>
    <div class="pc__plot" @mouseleave="hovered = null">
      <div class="pc__weeks" :style="{ '--cols': columns }" role="img" :aria-label="t('programs.glance.whoTakesWheel')">
        <div
          v-for="(col, i) in weekColumns"
          :key="col.key"
          class="pc__week"
          :class="{ 'is-quiet': col.quiet, 'is-slot': !col.week, 'is-on': hovered === i }"
          :tabindex="col.week ? 0 : -1"
          :aria-label="col.title"
          @mouseenter="hovered = i"
          @focus="hovered = i"
          @blur="hovered = null"
        >
          <span class="pc__col">
            <i v-if="col.unloggedHeight" class="pc__unlogged" :style="{ height: `${col.unloggedHeight * 100}%` }" />
            <i v-for="seg in col.segments" :key="seg.key" class="pc__seg" :class="{ 'is-later': seg.later }" :style="{ ...partStyle(seg.part), flexBasis: `${seg.share * 100}%` }" />
          </span>
        </div>
      </div>
      <i class="pc__pencil" aria-hidden="true" />
      <div class="pc__axis" :style="{ '--cols': columns }" aria-hidden="true">
        <small v-for="(col, i) in weekColumns" :key="col.key" :class="{ 'is-on': hovered === i }">
          {{ i === 0 || i === weekColumns.length - 1 || hovered === i ? col.label : '' }}
        </small>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useT } from '@/composables/useT'
import { momentFamily } from '@/domain/momentFamilies'
import type { MomentsWeekStats, ReactionKey } from '@/domain/momentsProgress'
import { partColor } from './partColors'

/**
 * "Kto przejmuje ster", week by week — a pencil sketch on the sky (Lab
 * /concepts/path-view-v2, rounds 6j–6m, 2026-10-11). One column per week,
 * time running left → right: height = moments that week, stacked segments
 * = which part (or reaction — the anger and anxiety families, 2026-10-18)
 * took the wheel, "Ja" as the ground at the bottom, the inward pair above
 * it, the outward pair on top. The family comes from the stats' `kind`. Pastel fills with a pencil
 * outline, a dashed pencil baseline, a slight tilt per column. The legend
 * is small and sits on the LEFT in the same column as the Pomiar labels
 * below; hovering (or focusing) a week writes that week's counts beside
 * the names and bolds the part(s) that dominated — no floating tooltip.
 */
const props = withDefaults(
  defineProps<{
    /** Oldest first. */
    stats: MomentsWeekStats[]
    /** Columns to draw (future weeks stay as empty slots); defaults to the stats length. */
    slots?: number
    /** 1-based path week of `stats[0]` (the axis labels). */
    firstWeek?: number
    /** The reflection's two-week variant: fixed-width columns, nothing stretched. */
    compact?: boolean
    /** Per weekRef, how many Moments of each part were written down later (drawn hatched). */
    backfilled?: Partial<Record<string, Partial<Record<ReactionKey, number>>>>
  }>(),
  { slots: undefined, firstWeek: 1, compact: false, backfilled: () => ({}) },
)

const { t, tg, tp } = useT()
const family = computed(() => momentFamily(props.stats[0]?.kind))
/** Stacking order bottom → top: the self key first. */
const order = computed<readonly ReactionKey[]>(() => family.value.keys)
const columns = computed(() => Math.max(props.slots ?? props.stats.length, props.stats.length))
const partStyle = (part: ReactionKey) => ({ '--part': partColor(part) })
const label = (part: ReactionKey) =>
  part === family.value.selfKey
    ? t('programs.glance.selfShort')
    : tg(`exerciseWizards.micro.moments.${family.value.reactionStep}.options.${part}`)
const momentsCount = (n: number) =>
  tp(n, 'programs.glance.momentsCount.one', 'programs.glance.momentsCount.few', 'programs.glance.momentsCount.many')

interface Dominant {
  part: ReactionKey
  count: number
  tiedWith: ReactionKey[]
}
/** Who took the wheel most often this week; ties go to the earlier key in the stacking order ("Ja" first). */
function dominantPart(week: MomentsWeekStats): Dominant | null {
  if (!week.total) return null
  const max = Math.max(...order.value.map((part) => week.byPart[part] ?? 0))
  const winners = order.value.filter((part) => (week.byPart[part] ?? 0) === max)
  return { part: winners[0]!, count: max, tiedWith: winners.slice(1) }
}

/* The compact chart keeps a floor of four, so two Moments do not fill the whole height. */
const maxTotal = computed(() => Math.max(props.compact ? 4 : 1, ...props.stats.map((week) => week.total + (week.unlogged ?? 0))))

interface Segment {
  key: string
  part: ReactionKey
  share: number
  /** Written down later, in the reflection — a memory, not a catch. */
  later: boolean
}
interface WeekColumn {
  key: string
  label: string
  week: MomentsWeekStats | null
  quiet: boolean
  unloggedHeight: number
  segments: Segment[]
  dominant: Dominant | null
  title: string
}
const weekColumns = computed<WeekColumn[]>(() =>
  Array.from({ length: columns.value }, (_, i) => {
    const week = props.stats[i] ?? null
    const label = `T${props.firstWeek + i}`
    // A week without logged Moments still draws the reflection's estimate as a dashed cap.
    if (!week || (week.quiet && !week.unlogged)) {
      return {
        key: label,
        label,
        week,
        quiet: true,
        unloggedHeight: 0,
        segments: [],
        dominant: null,
        title: `${label}: ${week ? t('programs.glance.quietWeekShort') : t('programs.glance.ahead')}`,
      }
    }
    const dominant = dominantPart(week)
    const later = props.backfilled[week.weekRef] ?? {}
    const segments: Segment[] = []
    for (const part of order.value) {
      const count = week.byPart[part] ?? 0
      const hatched = Math.min(count, later[part] ?? 0)
      const solid = count - hatched
      if (solid > 0) segments.push({ key: `${part}-solid`, part, share: solid / maxTotal.value, later: false })
      if (hatched > 0) segments.push({ key: `${part}-later`, part, share: hatched / maxTotal.value, later: true })
    }
    return {
      key: label,
      label,
      week,
      quiet: week.total === 0,
      unloggedHeight: (week.unlogged ?? 0) / maxTotal.value,
      segments,
      dominant,
      title: `${label}: ${momentsCount(week.total)}${week.unlogged ? ` · ${t('programs.glance.unloggedPlus', { n: week.unlogged })}` : ''}`,
    }
  }),
)

/** The hovered / focused week (index into weekColumns), or null. */
const hovered = ref<number | null>(null)
const hoveredWeek = computed(() => (hovered.value === null ? null : (weekColumns.value[hovered.value] ?? null)))
/** The legend on the left: names always; the hovered week's counts when there is one, every part tied for the top in bold. */
const legend = computed(() => {
  const week = hoveredWeek.value?.week && !hoveredWeek.value.quiet ? hoveredWeek.value.week : null
  const dominant = week ? dominantPart(week) : null
  const top = dominant ? new Set([dominant.part, ...dominant.tiedWith]) : new Set<ReactionKey>()
  return [...order.value].reverse().map((part) => ({
    part,
    label: label(part),
    count: week ? (week.byPart[part] ?? 0) : null,
    later: week ? (props.backfilled[week.weekRef]?.[part] ?? 0) : 0,
    dominant: top.has(part),
  }))
})
const legendHead = computed(() => {
  const col = hoveredWeek.value
  if (!col || !col.week) return ''
  if (col.quiet) return `${col.label} · ${t('programs.glance.quietWeekShort')}`
  const unlogged = col.week.unlogged ? ` · ${t('programs.glance.unloggedPlus', { n: col.week.unlogged })}` : ''
  return `${col.label} · ${momentsCount(col.week.total)}${unlogged}`
})
</script>

<style scoped>
.pc {
  --ink: color-mix(in srgb, rgb(var(--sky-800)) 38%, transparent);
  --pencil: color-mix(in srgb, var(--mg-color-muted) 58%, transparent);
  --col-h: 5.1rem;
  display: grid;
  grid-template-columns: 7.4rem minmax(0, 1fr);
  gap: var(--mg-space-2);
  align-items: end;
  font-family: var(--mg-font-sans);
}
/* compact (the weekly reflection): fixed-width columns beside the legend — never stretched across the card */
.pc--compact {
  --col-h: 4.2rem;
  --col-w: 2.6rem;
  grid-template-columns: 7.2rem auto;
  gap: var(--mg-space-3);
  width: fit-content;
}
.pc--compact .pc__weeks,
.pc--compact .pc__axis {
  display: flex;
  gap: 10px;
}
.pc--compact .pc__week,
.pc--compact .pc__axis small {
  width: var(--col-w);
}
.pc--compact .pc__pencil {
  margin: 0 -6px;
}
/* legend: the same column as the Pomiar labels; counts appear on hover */
.pc__legend {
  display: grid;
  gap: 2px;
  align-self: start;
  padding-top: 2px;
}
.pc__legend-head {
  min-height: 0.9rem;
  margin-bottom: 2px;
  overflow: hidden;
  color: var(--mg-color-muted);
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
  opacity: 0;
  transition: opacity 120ms ease;
}
.pc__legend-head.is-on {
  opacity: 1;
}
.pc__legend-row {
  display: grid;
  grid-template-columns: 0.6rem minmax(0, 1fr) auto;
  gap: 5px;
  align-items: start;
  min-height: 0.9rem;
  color: var(--mg-color-muted);
  font-size: 0.66rem;
  font-weight: 700;
  line-height: 1.2;
  transition: color 120ms ease;
}
.pc__legend-row i {
  display: block;
  width: 0.55rem;
  height: 0.55rem;
  margin-top: 0.12rem;
  border-radius: var(--mg-radius-organic-a);
  background: var(--part);
  box-shadow: inset 0 0 0 1px var(--ink);
}
.pc__legend-row:nth-child(odd) i {
  border-radius: var(--mg-radius-organic-b);
}
.pc__legend-name {
  overflow-wrap: anywhere;
}
.pc__legend-n {
  min-width: 0.7rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.pc__legend-n em {
  font-style: normal;
  font-weight: 600;
  opacity: 0.8;
}
.pc__legend-row.is-dominant {
  color: var(--mg-color-ink);
  font-weight: 800;
}
.pc__legend-row.is-zero {
  opacity: 0.55;
}
/* plot */
.pc__plot {
  position: relative;
  display: grid;
  gap: 3px;
}
.pc__weeks {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  gap: 7px;
  align-items: end;
  height: var(--col-h);
}
.pc__week {
  display: flex;
  align-items: flex-end;
  height: 100%;
  outline: none;
  transform: rotate(0.35deg);
  transform-origin: bottom center;
}
.pc__week:nth-child(even) {
  transform: rotate(-0.3deg);
}
.pc__col {
  display: flex;
  flex-direction: column-reverse;
  gap: 2px;
  width: 100%;
  height: 100%;
  transition: filter 120ms ease;
}
.pc__seg {
  display: block;
  flex: 0 0 auto;
  min-height: 3px;
  border-radius: 5px 4px 5px 4px;
  background: var(--part);
  box-shadow: inset 0 0 0 1px var(--ink);
}
.pc__col .pc__seg:last-child {
  border-radius: 7px 6px 4px 5px;
}
.pc__col .pc__seg:first-child {
  border-radius: 4px 5px 6px 7px;
}
/* written down later: the part's colour as a hatch — a memory, not a catch */
.pc__seg.is-later {
  background: repeating-linear-gradient(135deg, var(--part) 0 3px, var(--mg-color-paper) 3px 5px);
}
.pc__unlogged {
  display: block;
  flex: 0 0 auto;
  order: 1;
  border: 1px dashed var(--pencil);
  border-bottom: 0;
  border-radius: 7px 6px 0 0;
}
.pc__week.is-slot .pc__col,
.pc__week.is-quiet .pc__col {
  display: none;
}
.pc__week.is-on .pc__col {
  filter: saturate(1.15) brightness(0.98);
}
.pc__week:focus-visible .pc__col {
  border-radius: 6px;
  box-shadow: var(--mg-focus-ring);
}
/* the baseline is a pencil hairline, like the object timeline */
.pc__pencil {
  display: block;
  height: 0;
  border-top: 1.5px dashed var(--pencil);
  transform: rotate(-0.15deg);
}
.pc__axis {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  gap: 7px;
}
.pc__axis small {
  min-height: 0.7rem;
  color: var(--mg-color-muted);
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1;
  text-align: center;
}
.pc__axis small.is-on {
  color: var(--mg-color-ink);
}
@media (forced-colors: active) {
  .pc__seg,
  .pc__legend-row i {
    border: 1px solid CanvasText;
    forced-color-adjust: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .pc__legend-head,
  .pc__legend-row,
  .pc__col {
    transition: none;
  }
}
</style>
