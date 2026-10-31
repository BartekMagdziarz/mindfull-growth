<template>
  <!-- One object library card under a field rule. Header classes mirror
       ObjectsLibraryGoalCard / ObjectsLibraryMeasurementCard; the meta line
       (periods · priorities · life areas, one quiet line since 866cac10 — it
       replaced the affiliation glyphs of the 11.10.2026 round) and the
       timeline are the live presentational components. data-depth marks each
       surface level for the "Pokaż poziomy" overlay. -->
  <article class="mg-v2-surface mg-v2-surface--raised-sm fc" :class="`fc--${rule}`" data-depth="1">
    <header class="fc__head">
      <span class="fc__icon"><AppIcon v-if="card.icon" :name="card.icon" /></span>
      <strong class="fc__title">{{ card.title }}</strong>
    </header>

    <!-- Under the title: the meta line (+ goal timeline) -->
    <div class="fc__under" :class="{ 'fc-field fc-field--strip': metaField }" :data-depth="metaField ? 2 : undefined">
      <ObjectCardMetaLine
        :periods="card.periods"
        cadence="weekly"
        :is-permanent="card.isPermanent"
        :priority-ids="card.priorityIds"
        :life-area-ids="card.lifeAreaIds"
        :priority-options="PRIORITY_OPTIONS"
        :life-area-options="LIFE_AREA_OPTIONS"
        empty-links-label="Dodaj powiązanie"
      />
      <ObjectCardTimeline
        v-if="card.kind === 'goal' && card.window"
        variant="linear"
        :window="card.window"
        :start="card.start"
        :end="card.end"
        open-label="bez terminu"
      />
    </div>

    <!-- Habit / tracker: its own measurement -->
    <template v-if="card.kind !== 'goal' && card.chart">
      <div v-if="rule === 'measure'" class="fc-field fc-field--measure" data-depth="2">
        <p class="mg-v2-meta fc__meta"><span v-for="fact in card.meta" :key="fact">{{ fact }}</span></p>
        <FieldChart v-bind="card.chart" />
      </div>
      <template v-else>
        <p class="mg-v2-meta fc__meta fc__meta--card"><span v-for="fact in card.meta" :key="fact">{{ fact }}</span></p>
        <div v-if="rule === 'chart' || rule === 'chart-only'" class="fc-field fc-field--chart" data-depth="2">
          <FieldChart v-bind="card.chart" />
        </div>
        <FieldChart v-else v-bind="card.chart" class="fc__bare-chart" />
      </template>
    </template>

    <!-- Goal: key results -->
    <section v-else-if="card.krs" class="fc__krs" :class="{ 'fc__krs--bare': rule === 'chart-only' }">
      <div
        v-for="kr in card.krs"
        :key="kr.id"
        class="fc-kr"
        :class="rule === 'chart-only' ? 'fc-kr--bare' : 'fc-field fc-field--kr'"
        :data-depth="rule === 'chart-only' ? undefined : 2"
      >
        <strong class="fc-kr__title">{{ kr.title }}</strong>
        <p class="mg-v2-meta fc__meta"><span v-for="fact in kr.meta" :key="fact">{{ fact }}</span></p>
        <div v-if="rule === 'chart'" class="fc-field fc-field--inner" data-depth="3">
          <FieldChart v-bind="kr.chart" />
        </div>
        <div v-else-if="rule === 'chart-only'" class="fc-field fc-field--chart" data-depth="2">
          <FieldChart v-bind="kr.chart" />
        </div>
        <FieldChart v-else v-bind="kr.chart" class="fc__bare-chart" />
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import AppIcon from '@product/components/shared/AppIcon.vue'
import ObjectCardMetaLine from '@product/components/objects/ObjectCardMetaLine.vue'
import ObjectCardTimeline from '@product/components/objects/ObjectCardTimeline.vue'
import FieldChart from './FieldChart.vue'
import { LIFE_AREA_OPTIONS, PRIORITY_OPTIONS, type FieldCardSample } from './objectFieldSamples'

/**
 * now        — product today: chart straight on the card, KRs in mist fields.
 * measure    — the measurement (facts + chart) is ONE mist field; a habit
 *              reads like a goal with a single KR. Goals unchanged.
 * chart      — every chart gets its own field; inside a KR that is a third
 *              level (paper on mist).
 * chart-only — the chart is the only field; KRs drop their field and are
 *              separated by space, so the depth stays at two everywhere.
 */
export type FieldRule = 'now' | 'measure' | 'chart' | 'chart-only'

defineProps<{
  card: FieldCardSample
  rule: FieldRule
  metaField?: boolean
}>()
</script>

<style scoped>
.fc {
  display: grid;
  align-content: start;
  gap: var(--mg-space-2);
  padding: 0.75rem;
}
.fc:has(.fc__krs) { padding: 0.875rem; }

.fc__head { display: flex; align-items: center; gap: var(--mg-space-2); min-height: 2.75rem; }
.fc__icon {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 2.75rem;
  height: 2.75rem;
  border: 1px solid var(--mg-color-border);
  border-radius: 999px;
  color: var(--mg-color-ink);
}
.fc__icon :deep(.material-symbols-outlined), .fc__icon :deep(svg) { font-size: 1.25rem; width: 1.25rem; height: 1.25rem; }
.fc__title { min-width: 0; padding: 0.375rem 0.25rem; color: var(--mg-color-ink); font-size: var(--mg-font-size-sm); font-weight: 600; }

.fc__under { display: grid; gap: var(--mg-space-2); padding: 0 0.25rem; }
.fc__meta { padding: 0 0.25rem; }

/* ─── Fields ─── */
.fc-field {
  position: relative;
  border: 1px solid var(--mg-color-border);
  background: var(--mg-color-mist);
}
/* KR / measurement field = mg-v2-surface--flat (radius lg, p-2.5, space-y-2). */
.fc-field--kr, .fc-field--measure { display: grid; gap: var(--mg-space-2); padding: 0.625rem; border-radius: var(--mg-radius-lg); }
.fc-field--measure { padding-top: 0.75rem; }
/* Chart-only field: one step smaller radius, tight padding. */
.fc-field--chart { padding: 0.5rem 0.25rem 0.25rem; border-radius: var(--mg-radius-md); }
/* Third level: paper inside mist (deeper = whiter). */
.fc-field--inner { padding: 0.5rem 0.25rem 0.25rem; border-radius: var(--mg-radius-md); background: var(--mg-color-paper); }
/* The strip under the title as a field. */
.fc-field--strip { padding: 0.5rem 0.625rem; border-radius: var(--mg-radius-md); }

.fc__krs { display: grid; gap: 0.375rem; margin-top: 0.375rem; }
.fc__krs--bare { gap: var(--mg-space-4); margin-top: var(--mg-space-3); }
.fc-kr__title { padding: 0.375rem 0.25rem 0; color: var(--mg-color-ink); font-size: var(--mg-font-size-xs); font-weight: 600; }
.fc-kr--bare { display: grid; gap: var(--mg-space-2); }
</style>
