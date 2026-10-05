<template>
  <div class="smg" :class="{ 'smg--compact': compact }" data-testid="path-moments-glance">
    <div
      v-if="total"
      class="smg__grid"
      :style="{ '--cols': columns }"
      role="img"
      :aria-label="t('programs.glance.whoTakesWheel')"
    >
      <template v-for="row in rows" :key="row.key">
        <span class="smg__label" :class="{ 'smg__label--none': row.key === 'none' }">{{ row.label }}</span>
        <span class="smg__cells">
          <template v-for="n in columns" :key="n">
            <i
              v-if="stats[n - 1]"
              class="smg__bar"
              :class="[
                `is-${tone(stats[n - 1]!, row.key)}`,
                { 'is-zero': !stats[n - 1]!.byPart[row.key], 'is-quiet': stats[n - 1]!.quiet },
              ]"
              :style="{ '--h': stats[n - 1]!.byPart[row.key] / maxCount }"
              :title="cellTitle(stats[n - 1]!, row.key, row.label)"
            />
            <i v-else class="smg__bar smg__bar--slot" aria-hidden="true" />
          </template>
        </span>
      </template>
      <span class="smg__label" aria-hidden="true" />
      <span class="smg__cells smg__cells--axis" aria-hidden="true">
        <small v-for="n in columns" :key="n">{{ n === 1 || n === columns ? `T${colLabel(n)}` : '' }}</small>
      </span>
    </div>
    <p v-else class="smg__empty">{{ compact ? t('programs.glance.quietWeek') : t('programs.glance.noMoments') }}</p>

    <details v-if="total" class="smg__more" :open="open" @toggle="open = ($event.target as HTMLDetailsElement).open">
      <summary>{{ open ? t('programs.ui.less') : t('programs.ui.details') }}</summary>
      <div class="smg__details">
        <section class="smg__picture">
          <h5>{{ t('programs.glance.responseInstead') }}</h5>
          <div class="smg__discs" :style="{ '--cols': columns }">
            <template v-for="n in columns" :key="`d${n}`">
              <i
                v-if="stats[n - 1]"
                class="smg__disc"
                :class="{ 'is-quiet': stats[n - 1]!.quiet }"
                :style="{ '--fill': stats[n - 1]!.total ? `${(stats[n - 1]!.responded / stats[n - 1]!.total) * 100}%` : '0%' }"
                :title="discTitle(n)"
              />
              <i v-else class="smg__disc smg__disc--slot" aria-hidden="true" />
            </template>
          </div>
        </section>
        <section v-if="noticedBars.length" class="smg__picture">
          <h5>{{ t('programs.glance.whenNotice') }}</h5>
          <div v-for="bar in noticedBars" :key="bar.label" class="smg__bar-row">
            <span class="smg__bar-label">{{ bar.label }}</span>
            <span class="smg__stack" :title="`${bar.label}: ${t('programs.glance.earlyShare', { pct: percent(bar.early) })}`">
              <i
                v-for="(segment, i) in bar.segments"
                :key="segment.key"
                :class="`smg__seg-${i}`"
                :style="{ flexBasis: `${segment.share * 100}%` }"
              />
            </span>
          </div>
        </section>
        <button type="button" class="smg__link" :aria-expanded="tableOpen" @click="tableOpen = !tableOpen">
          {{ tableOpen ? t('programs.glance.hideNumbers') : t('programs.glance.numbers') }}
        </button>
        <div v-if="tableOpen" class="smg__table-wrap">
          <table>
            <thead>
              <tr>
                <th>{{ t('programs.glance.week') }}</th>
                <th v-for="row in rows" :key="row.key">{{ row.key === 'none' ? t('programs.glance.noneShort') : row.label }}</th>
                <th>{{ t('programs.glance.unloggedShort') }}</th>
                <th>{{ t('programs.glance.response') }}</th>
                <th>{{ t('programs.glance.early') }}</th>
                <th>{{ t('programs.glance.voices') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(week, i) in stats" :key="week.weekRef">
                <th>T{{ colLabel(i + 1) }}</th>
                <td v-for="row in rows" :key="row.key">{{ week.byPart[row.key] }}</td>
                <td>{{ week.unlogged ?? '—' }}</td>
                <td>{{ week.responded }} / {{ week.total }}</td>
                <td>{{ week.noticed.during + week.noticed.soon }} / {{ week.total - week.noticed.unknown }}</td>
                <td>{{ week.criticLogged }} · {{ week.kindVoiceLogged }}</td>
              </tr>
              <tr class="smg__sum">
                <th>{{ t('programs.glance.total') }}</th>
                <td v-for="row in rows" :key="row.key">{{ stats.reduce((s, w) => s + w.byPart[row.key], 0) }}</td>
                <td />
                <td>{{ responded }} / {{ total }}</td>
                <td />
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useT } from '@/composables/useT'
import type { MomentsWeekStats, ShamePartKey } from '@/domain/momentsProgress'
import { noticedEarlyShare, SHAME_PART_KEYS } from '@/domain/momentsProgress'

/**
 * "Kto przejmuje ster", week by week — small multiples. One row per part
 * (the compass order, "Żadna część" last), one small bar per week: height =
 * how many moments that part took that week, tone = how strongly (the
 * moment's own 1–5). No numbers, legend or reading rules on the surface;
 * hover tells. "Szczegóły": response discs per week, the two "kiedy
 * zauważam" bars and the numbers table. Lab: /concepts/shame-path round 5.
 */
const props = withDefaults(
  defineProps<{
    /** Oldest first. */
    stats: MomentsWeekStats[]
    /** Columns to draw (future weeks stay as dashed slots); defaults to the stats length. */
    slots?: number
    /** 1-based path week of `stats[0]` (the axis labels). */
    firstWeek?: number
    compact?: boolean
  }>(),
  { slots: undefined, firstWeek: 1, compact: false },
)

const { t, tg } = useT()
const open = ref(false)
const tableOpen = ref(false)

const NOTICING_KEYS = ['during', 'soon', 'hours', 'later'] as const
const columns = computed(() => Math.max(props.slots ?? props.stats.length, props.stats.length))
const rows = computed(() =>
  SHAME_PART_KEYS.map((key) => ({
    key,
    label: key === 'none' ? t('programs.glance.nonePart') : tg(`exerciseWizards.micro.moments.compass.options.${key}`),
  })),
)
const maxCount = computed(() => Math.max(1, ...props.stats.flatMap((week) => Object.values(week.byPart))))
const total = computed(() => props.stats.reduce((sum, week) => sum + week.total, 0))
const responded = computed(() => props.stats.reduce((sum, week) => sum + week.responded, 0))
const colLabel = (n: number) => props.firstWeek + n - 1

function tone(week: MomentsWeekStats, part: ShamePartKey): 'soft' | 'mid' | 'strong' {
  const s = week.strength[part]
  if (!s.rated) return 'mid'
  const mean = s.sum / s.rated
  return mean >= 3.5 ? 'strong' : mean >= 2.5 ? 'mid' : 'soft'
}
function cellTitle(week: MomentsWeekStats, part: ShamePartKey, label: string): string {
  const s = week.strength[part]
  const count = week.byPart[part]
  const strength = s.rated ? ` · ${t('programs.glance.strength')} ${(s.sum / s.rated).toFixed(1).replace('.', ',')}` : ''
  return `${label} · T${colLabel(props.stats.indexOf(week) + 1)}: ${count}×${count ? strength : ''}`
}
function discTitle(n: number): string {
  const week = props.stats[n - 1]!
  return `T${colLabel(n)}: ${week.total ? t('programs.glance.outOf', { a: week.responded, b: week.total }) : t('programs.glance.quietWeekShort')}`
}
const percent = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)} %`)
const withMoments = computed(() => props.stats.filter((week) => week.total > 0))
const noticedBars = computed(() => {
  const build = (label: string, weeks: MomentsWeekStats[]) => {
    const known = weeks.reduce((sum, week) => sum + week.total - week.noticed.unknown, 0)
    return {
      label,
      early: noticedEarlyShare(weeks),
      segments: NOTICING_KEYS.map((key) => ({
        key,
        share: known ? weeks.reduce((sum, week) => sum + week.noticed[key], 0) / known : 0,
      })),
    }
  }
  const list = withMoments.value
  if (list.length === 0) return []
  if (list.length < 3) return [build(t('programs.glance.soFar'), list)]
  return [build(t('programs.glance.beginning'), list.slice(0, 2)), build(t('programs.glance.lately'), list.slice(-2))]
})
</script>

<style scoped>
.smg {
  --ink: var(--mg-color-primary);
  --ink-strong: var(--mg-color-primary-fill);
  --ink-mid: color-mix(in srgb, var(--mg-color-primary) 62%, var(--mg-color-paper));
  --ink-soft: color-mix(in srgb, var(--mg-color-primary) 34%, var(--mg-color-paper));
  --ink-faint: color-mix(in srgb, var(--mg-color-primary) 16%, var(--mg-color-paper));
  --bar-h: 1.7rem;
  display: grid;
  gap: var(--mg-space-2);
  color: var(--mg-color-ink);
}
.smg--compact {
  --bar-h: 1.3rem;
}
.smg__grid {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr);
  gap: 6px var(--mg-space-2);
  align-items: end;
}
.smg__label {
  padding-bottom: 2px;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
  line-height: 1.2;
}
.smg__label--none {
  color: var(--mg-color-primary-strong);
}
.smg__cells {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  gap: 4px;
  align-items: end;
  justify-items: center;
  height: var(--bar-h);
}
.smg__bar {
  display: block;
  width: min(100%, 0.6rem);
  height: max(2px, calc(var(--h, 0) * var(--bar-h)));
  border-radius: 3px 3px 2px 2px;
  background: var(--ink);
}
.smg__bar.is-soft {
  background: var(--ink-soft);
}
.smg__bar.is-strong {
  background: var(--ink-strong);
}
.smg__label--none + .smg__cells .smg__bar:not(.is-zero) {
  background: var(--ink-strong);
}
.smg__bar.is-zero {
  background: var(--ink-faint);
}
.smg__bar.is-quiet {
  height: 2px;
  border-bottom: 1px dotted var(--mg-color-muted);
  background: transparent;
}
.smg__bar--slot {
  height: 2px;
  border-bottom: 1px dashed color-mix(in srgb, var(--mg-color-border) 80%, transparent);
  background: transparent;
}
.smg__cells--axis {
  height: auto;
  margin-top: -2px;
}
.smg__cells--axis small {
  justify-self: center;
  min-height: 0.7rem;
  color: var(--mg-color-muted);
  font-size: 0.66rem;
  font-weight: 700;
  line-height: 1;
  text-align: center;
}
.smg__empty {
  margin: 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
}

.smg__more > summary {
  width: fit-content;
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-xs);
  font-weight: 800;
  list-style: none;
  cursor: pointer;
}
.smg__more > summary::-webkit-details-marker {
  display: none;
}
.smg__details {
  display: grid;
  gap: var(--mg-space-3);
  margin-top: var(--mg-space-3);
  padding-top: var(--mg-space-3);
  border-top: 1.5px dashed color-mix(in srgb, var(--mg-color-muted) 38%, transparent);
}
.smg__picture {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr);
  gap: 6px var(--mg-space-2);
  align-items: center;
}
.smg__picture h5 {
  grid-column: 1 / -1;
  margin: 0;
  font-size: var(--mg-font-size-xs);
  font-weight: 800;
}
.smg__discs {
  display: grid;
  grid-column: 2;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  gap: 4px;
  justify-items: center;
}
.smg__disc {
  display: block;
  width: 1.15rem;
  height: 1.15rem;
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-organic-a);
  background: linear-gradient(to top, var(--ink) var(--fill, 0%), var(--mg-color-paper) var(--fill, 0%));
  box-shadow: var(--mg-shadow-inset-sm);
}
.smg__disc:nth-child(even) {
  border-radius: var(--mg-radius-organic-b);
}
.smg__disc.is-quiet {
  border-style: dotted;
  background: var(--mg-color-paper);
}
.smg__disc--slot {
  border-style: dashed;
  background: transparent;
  box-shadow: none;
}
.smg__bar-row {
  display: contents;
}
.smg__bar-label {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}
.smg__stack {
  display: flex;
  height: 0.6rem;
  overflow: hidden;
  border-radius: 5px 4px 5px 4px;
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-inset-sm);
}
.smg__stack i {
  flex: 0 0 auto;
}
.smg__seg-0 {
  background: var(--ink-strong);
}
.smg__seg-1 {
  background: var(--ink);
}
.smg__seg-2 {
  background: var(--ink-mid);
}
.smg__seg-3 {
  background: var(--ink-faint);
}
.smg__link {
  width: fit-content;
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
  min-width: 34rem;
  border-collapse: collapse;
  font-size: var(--mg-font-size-xs);
}
.smg th,
.smg td {
  padding: 5px 8px;
  border-bottom: 1px solid var(--mg-color-border);
  text-align: left;
}
.smg__sum th,
.smg__sum td {
  border-bottom: 0;
  font-weight: 800;
}
@media (forced-colors: active) {
  .smg__bar,
  .smg__disc,
  .smg__stack i {
    border: 1px solid CanvasText;
    forced-color-adjust: none;
  }
}
</style>
