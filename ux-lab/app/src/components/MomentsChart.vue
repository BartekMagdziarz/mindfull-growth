<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MomentsWeekStats, ShamePartKey } from '@product/domain/momentsProgress'
import { dominantPart, PART_COLOR, PART_LABEL, PART_ORDER, PART_SKY } from '~lab/lab/momentsParts'
import { weekNumber } from '~lab/lab/shamePath'

/**
 * "Kto przejmuje ster" — Momenty week by week, time running LEFT → RIGHT.
 *
 * Round 6j (2026-10-11): columns per week (the user's pick), drawn like the
 * rest of the app — pastel sky fills with a pencil outline, a dashed pencil
 * baseline, a slight tilt per column. The legend is SMALL and sits on the
 * LEFT in the same 7.4 rem column as the Pomiar labels below, so both tiles
 * put their words in one place. Hovering (or focusing) a week writes that
 * week's counts beside the legend names and bolds the part that dominated —
 * the "mini legend on hover" without a floating tooltip.
 *
 * columns — column per week, height = moments, segments = part, "Ja" at the
 *           bottom as the ground; cloud = Odwracający uwagę drifting on top.
 * tracks · pair · river — round 6h readings, kept only for comparison.
 */
export type MomentsChartVariant = 'columns' | 'tracks' | 'pair' | 'river'

const props = defineProps<{
  variant: MomentsChartVariant
  stats: MomentsWeekStats[]
  /** Reserve this many week slots (future weeks drawn as empty slots). */
  slots?: number
}>()

const format = (n: number) => n.toFixed(1).replace('.', ',')
const columnsCount = computed(() => Math.max(props.slots ?? props.stats.length, props.stats.length))
const partStyle = (part: ShamePartKey) => ({ '--part': PART_COLOR[part] })

/* ---------- week by week: columns ---------- */
const maxTotal = computed(() => Math.max(1, ...props.stats.map(week => week.total + (week.unlogged ?? 0))))

interface Segment { part: ShamePartKey; label: string; count: number; share: number }
interface WeekColumn {
  key: string
  n: number
  label: string
  week: MomentsWeekStats | null
  quiet: boolean
  /** Column height as a fraction of the tallest week. */
  height: number
  unloggedHeight: number
  segments: Segment[]
  dominant: ReturnType<typeof dominantPart>
  title: string
}
const weekColumns = computed<WeekColumn[]>(() =>
  Array.from({ length: columnsCount.value }, (_, i) => {
    const week = props.stats[i] ?? null
    const n = week ? weekNumber(week.weekRef) : (props.stats[0] ? weekNumber(props.stats[0].weekRef) : 1) + i
    const label = `T${n}`
    if (!week || week.quiet) {
      return { key: label, n, label, week, quiet: true, height: 0, unloggedHeight: 0, segments: [], dominant: null, title: week ? `${label}: cichy tydzień` : `${label}: jeszcze przed tobą` }
    }
    const scale = maxTotal.value
    const segments = PART_ORDER.map(part => ({ part, label: PART_LABEL[part], count: week.byPart[part], share: week.byPart[part] / scale })).filter(seg => seg.count > 0)
    const dominant = dominantPart(week)
    const title = `${label}: ${week.total} ${plural(week.total)} · ster: ${dominant ? PART_LABEL[dominant.part] : '—'}`
    return { key: label, n, label, week, quiet: false, height: week.total / scale, unloggedHeight: (week.unlogged ?? 0) / scale, segments, dominant, title }
  }),
)
const plural = (n: number) => (n === 1 ? 'moment' : n >= 2 && n <= 4 ? 'momenty' : 'momentów')
/** The hovered / focused week (index into weekColumns), or null. */
const hovered = ref<number | null>(null)
const hoveredWeek = computed(() => (hovered.value === null ? null : weekColumns.value[hovered.value] ?? null))
/** The legend on the left: names always; counts of the hovered week when there is one, the dominant part bold. */
const legend = computed(() => {
  const week = hoveredWeek.value?.week && !hoveredWeek.value.quiet ? hoveredWeek.value.week : null
  const dominant = week ? dominantPart(week) : null
  // every part tied for the top is bold — a tie is read from the numbers, not from a sentence
  const top = dominant ? new Set([dominant.part, ...dominant.tiedWith]) : new Set<ShamePartKey>()
  return [...PART_ORDER].reverse().map(part => ({
    part,
    label: PART_LABEL[part],
    sky: PART_SKY[part],
    count: week ? week.byPart[part] : null,
    dominant: top.has(part),
  }))
})
const legendHead = computed(() => {
  const col = hoveredWeek.value
  if (!col || !col.week) return ''
  if (col.quiet) return `${col.label} · cichy tydzień`
  return `${col.label} · ${col.week.total} ${plural(col.week.total)}${col.week.unlogged ? ` · +${col.week.unlogged} bez zapisu` : ''}`
})

/* ---------- earlier readings: tracks · pair · river ---------- */
const TRACK_ORDER: ShamePartKey[] = ['withdraw', 'attackSelf', 'attackOthers', 'avoid', 'none']
const lived = computed(() => props.stats.filter(week => !week.quiet))
const firstWeeks = computed(() => lived.value.slice(0, 2))
const lastWeeks = computed(() => lived.value.slice(-2))
const enough = computed(() => lived.value.length >= 3)
function perWeek(weeks: MomentsWeekStats[], part: ShamePartKey) {
  if (!weeks.length) return null
  return weeks.reduce((sum, week) => sum + week.byPart[part], 0) / weeks.length
}
function strength(weeks: MomentsWeekStats[], part: ShamePartKey) {
  const sum = weeks.reduce((acc, week) => acc + week.strength[part].sum, 0)
  const rated = weeks.reduce((acc, week) => acc + week.strength[part].rated, 0)
  return rated ? sum / rated : null
}
const maxPerWeek = computed(() => Math.max(1, ...props.stats.flatMap(week => TRACK_ORDER.map(part => week.byPart[part]))))
const tracks = computed(() =>
  TRACK_ORDER.map(part => {
    const start = perWeek(firstWeeks.value, part)
    const now = enough.value ? perWeek(lastWeeks.value, part) : null
    const sStart = strength(firstWeeks.value, part)
    const sNow = enough.value ? strength(lastWeeks.value, part) : null
    const title = [
      `${PART_LABEL[part]}: ${start === null ? '—' : `${format(start)} na tydzień`} na początku`,
      now === null ? '' : `→ ${format(now)} teraz`,
      part !== 'none' && sStart !== null ? `· siła ${format(sStart)}${sNow !== null ? ` → ${format(sNow)}` : ''}` : '',
    ].filter(Boolean).join(' ')
    return { part, label: PART_LABEL[part], start, now, title, pos: (v: number) => `${(v / maxPerWeek.value) * 100}%` }
  }),
)
function segments(weeks: MomentsWeekStats[]) {
  const total = Math.max(1, weeks.reduce((sum, week) => sum + week.total, 0))
  let offset = 0
  return TRACK_ORDER.map(part => {
    const count = weeks.reduce((sum, week) => sum + week.byPart[part], 0)
    const seg = { part, label: PART_LABEL[part], share: count / total, offset, count, total }
    offset += seg.share
    return seg
  })
}
const pair = computed(() => [
  { key: 'start', label: 'Start', segments: segments(firstWeeks.value), empty: !firstWeeks.value.length },
  { key: 'now', label: 'Teraz', segments: segments(lastWeeks.value), empty: !enough.value },
])
const river = computed(() => props.stats.map((week, i) => ({ key: `T${i + 1}`, label: `T${i + 1}`, segments: segments([week]), empty: week.quiet })))
const rows = computed(() => (props.variant === 'pair' ? pair.value : river.value))
</script>

<template>
  <div class="mc" :class="`mc--${variant}`">
    <!-- week by week, time left → right: legend on the left, columns on the right -->
    <template v-if="variant === 'columns'">
      <div class="mc__sheet">
        <div class="mc__legend" aria-label="Części">
          <small class="mc__legend-head" :class="{ 'is-on': legendHead }">{{ legendHead || ' ' }}</small>
          <div v-for="row in legend" :key="row.part" class="mc__legend-row" :class="{ 'is-dominant': row.dominant, 'is-zero': row.count === 0 }" :title="row.sky">
            <i :style="partStyle(row.part)" /><span class="mc__legend-name">{{ row.label }}</span><span class="mc__legend-n">{{ row.count === null ? '' : row.count || '·' }}</span>
          </div>
        </div>
        <div class="mc__plot" @mouseleave="hovered = null">
          <div class="mc__weeks" :style="{ '--cols': columnsCount }" role="img" aria-label="Kto przejmuje ster, tydzień po tygodniu">
            <div
              v-for="(col, i) in weekColumns"
              :key="col.key"
              class="mc__week"
              :class="{ 'is-quiet': col.quiet, 'is-slot': !col.week, 'is-on': hovered === i }"
              :tabindex="col.week ? 0 : -1"
              :aria-label="col.title"
              @mouseenter="hovered = i"
              @focus="hovered = i"
              @blur="hovered = null"
            >
              <span class="mc__col">
                <i v-if="col.unloggedHeight" class="mc__unlogged" :style="{ height: `${col.unloggedHeight * 100}%` }" />
                <i v-for="seg in col.segments" :key="seg.part" class="mc__seg" :style="{ ...partStyle(seg.part), flexBasis: `${seg.share * 100}%` }" />
              </span>
            </div>
          </div>
          <i class="mc__pencil" aria-hidden="true" />
          <div class="mc__axis" :style="{ '--cols': columnsCount }" aria-hidden="true">
            <small v-for="(col, i) in weekColumns" :key="col.key" :class="{ 'is-on': hovered === i }">{{ i === 0 || i === weekColumns.length - 1 || hovered === i ? col.label : '' }}</small>
          </div>
        </div>
      </div>
    </template>

    <!-- earlier readings -->
    <template v-else-if="variant === 'tracks'">
      <div v-for="row in tracks" :key="row.part" class="mc__track" :class="{ 'mc__track--self': row.part === 'none' }" :title="row.title">
        <span class="mc__label">{{ row.label }}</span>
        <span class="mc__rail">
          <i
            v-if="row.start !== null && row.now !== null"
            class="mc__trail"
            :style="{ left: `min(${row.pos(row.start)}, ${row.pos(row.now)})`, right: `min(calc(100% - ${row.pos(row.start)}), calc(100% - ${row.pos(row.now)}))` }"
          />
          <i v-if="row.start !== null" class="mc__start" :style="{ left: row.pos(row.start) }" />
          <i v-if="row.now !== null" class="mc__now" :style="{ left: row.pos(row.now) }" />
        </span>
      </div>
    </template>
    <template v-else>
      <div v-for="row in rows" :key="row.key" class="mc__row" :class="{ 'is-empty': row.empty }">
        <span class="mc__label">{{ row.label }}</span>
        <span class="mc__bar">
          <template v-if="!row.empty">
            <i
              v-for="seg in row.segments"
              :key="seg.part"
              class="mc__seg-old"
              :class="`mc__seg-old--${seg.part}`"
              :style="{ left: `${seg.offset * 100}%`, width: `${seg.share * 100}%` }"
              :title="`${row.label} · ${seg.label}: ${seg.count} z ${seg.total}`"
            />
          </template>
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mc { display: grid; gap: 6px; width: 100%; font-family: var(--mg-font-sans); }
.mc__label { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 700; line-height: 1.2; }

/* ---------- week by week: a pencil sketch on the sky ---------- */
.mc--columns {
  --ink: color-mix(in srgb, rgb(var(--sky-800)) 38%, transparent);
  --pencil: color-mix(in srgb, var(--mg-color-muted) 58%, transparent);
  --col-h: 5.1rem;
  --gap: 2px;
}
.mc__sheet { display: grid; grid-template-columns: 7.4rem minmax(0, 1fr); gap: var(--mg-space-2); align-items: end; }
/* legend: the same column as the Pomiar labels; counts appear on hover */
.mc__legend { display: grid; gap: 2px; align-self: start; padding-top: 2px; }
.mc__legend-head { min-height: 0.9rem; margin-bottom: 2px; color: var(--mg-color-muted); font-size: 0.62rem; font-weight: 700; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0; transition: opacity 120ms ease; }
.mc__legend-head.is-on { opacity: 1; }
.mc__legend-row { display: grid; grid-template-columns: 0.6rem minmax(0, 1fr) auto; gap: 5px; align-items: start; min-height: 0.9rem; color: var(--mg-color-muted); font-size: 0.66rem; font-weight: 700; line-height: 1.2; transition: color 120ms ease; }
.mc__legend-row i { display: block; width: 0.55rem; height: 0.55rem; margin-top: 0.12rem; border-radius: var(--mg-radius-organic-a); background: var(--part); box-shadow: inset 0 0 0 1px var(--ink); }
.mc__legend-row:nth-child(odd) i { border-radius: var(--mg-radius-organic-b); }
.mc__legend-name { overflow-wrap: anywhere; }
.mc__legend-n { min-width: 0.7rem; text-align: right; font-variant-numeric: tabular-nums; }
.mc__legend-row.is-dominant { color: var(--mg-color-ink); font-weight: 800; }
.mc__legend-row.is-zero { opacity: 0.55; }
/* plot */
.mc__plot { position: relative; display: grid; gap: 3px; }
.mc__weeks { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 7px; align-items: end; height: var(--col-h); }
.mc__week { display: flex; align-items: flex-end; height: 100%; outline: none; transform: rotate(0.35deg); transform-origin: bottom center; }
.mc__week:nth-child(even) { transform: rotate(-0.3deg); }
.mc__col { display: flex; flex-direction: column-reverse; gap: var(--gap); width: 100%; height: 100%; transition: filter 120ms ease; }
.mc__seg { display: block; flex: 0 0 auto; min-height: 3px; border-radius: 5px 4px 5px 4px; background: var(--part); box-shadow: inset 0 0 0 1px var(--ink); }
.mc__col .mc__seg:last-child { border-radius: 7px 6px 4px 5px; }
.mc__col .mc__seg:first-child { border-radius: 4px 5px 6px 7px; }
.mc__unlogged { order: 1; display: block; flex: 0 0 auto; border: 1px dashed var(--pencil); border-bottom: 0; border-radius: 7px 6px 0 0; }
.mc__week.is-slot .mc__col, .mc__week.is-quiet .mc__col { display: none; }
.mc__week.is-on .mc__col { filter: saturate(1.15) brightness(0.98); }
.mc__week:focus-visible .mc__col { box-shadow: var(--mg-focus-ring); border-radius: 6px; }
/* the baseline is a pencil hairline, like the object timeline */
.mc__pencil { display: block; height: 0; border-top: 1.5px dashed var(--pencil); transform: rotate(-0.15deg); }
.mc__axis { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 7px; }
.mc__axis small { min-height: 0.7rem; color: var(--mg-color-muted); font-size: 0.62rem; font-weight: 700; line-height: 1; text-align: center; }
.mc__axis small.is-on { color: var(--mg-color-ink); }

/* ---------- earlier readings ---------- */
.mc__track { display: grid; grid-template-columns: 7.4rem minmax(0, 1fr); gap: var(--mg-space-2); align-items: center; min-height: 1.3rem; }
.mc__track--self { margin-top: 4px; }
.mc__track--self .mc__label { color: var(--mg-color-primary-strong); }
.mc__rail { position: relative; display: block; height: 0.45rem; border-radius: 4px; background: var(--mg-color-paper); box-shadow: var(--mg-shadow-inset-sm); }
.mc__trail { position: absolute; top: 0; bottom: 0; border-radius: inherit; background: color-mix(in srgb, var(--mg-color-primary) 34%, var(--mg-color-paper)); }
.mc__start, .mc__now { position: absolute; top: 50%; width: 0.7rem; height: 0.7rem; border: 1.5px solid var(--mg-color-primary-fill); border-radius: var(--mg-radius-organic-a); background: var(--mg-color-paper); transform: translate(-50%, -50%); }
.mc__now { z-index: 1; background: var(--mg-color-primary-fill); }
.mc__row { display: grid; grid-template-columns: 2.4rem minmax(0, 1fr); gap: var(--mg-space-2); align-items: center; }
.mc--river .mc__row { grid-template-columns: 1.6rem minmax(0, 1fr); }
.mc__bar { position: relative; display: block; height: 0.9rem; overflow: hidden; border-radius: 4px; background: var(--mg-color-paper); }
.mc__row.is-empty .mc__bar { background: transparent; border: 1px dashed color-mix(in srgb, var(--mg-color-muted) 40%, transparent); }
.mc__seg-old { position: absolute; top: 0; bottom: 0; }
.mc__seg-old--withdraw { background: color-mix(in srgb, var(--mg-color-primary-fill) 92%, var(--mg-color-paper)); }
.mc__seg-old--attackSelf { background: color-mix(in srgb, var(--mg-color-primary-fill) 72%, var(--mg-color-paper)); }
.mc__seg-old--attackOthers { background: color-mix(in srgb, var(--mg-color-primary-fill) 52%, var(--mg-color-paper)); }
.mc__seg-old--avoid { background: color-mix(in srgb, var(--mg-color-primary-fill) 32%, var(--mg-color-paper)); }
.mc__seg-old--none { background: var(--mg-color-paper); box-shadow: inset 2px 0 0 var(--mg-color-primary-strong); }

@media (forced-colors: active) {
  .mc__seg, .mc__legend-row i { forced-color-adjust: none; border: 1px solid CanvasText; }
}
</style>
