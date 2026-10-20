<template>
  <div v-if="series.length" class="measure" data-testid="path-measure">
    <header class="measure__head">
      <span class="measure__title">{{ t('programs.ui.measureTitle') }}</span>
      <button type="button" class="pp-link" :aria-expanded="open" @click="open = !open">
        {{ open ? t('programs.ui.less') : t('programs.ui.details') }}
      </button>
    </header>
    <template v-for="instrument in series" :key="instrument.id">
      <div
        v-for="track in instrument.tracks"
        :key="`${instrument.id}-${track.scaleId}`"
        class="sk"
        :title="trackTitle(instrument, track)"
      >
        <span class="sk__label">{{ track.label }}</span>
        <span class="sk__track">
          <i v-if="lastIndex(track) > 0 && span(track)" class="sk__trail" :style="span(track)!" />
          <i v-if="first(track) !== null" class="sk__start" :style="{ left: pos(track, first(track) as number) }" />
          <i v-if="lastIndex(track) > 0 && last(track) !== null" class="sk__now" :style="{ left: pos(track, last(track) as number) }" />
        </span>
      </div>
    </template>
    <div v-if="open" class="sk__tables">
      <div
        v-for="instrument in series"
        :key="`table-${instrument.id}`"
        class="sk__table"
        role="table"
        :aria-label="instrument.title"
      >
        <div class="sk__tr sk__tr--head" role="row">
          <span role="columnheader">{{ instrument.title }}</span>
          <span v-for="point in instrument.points" :key="point.key" role="columnheader" :class="{ 'is-pending': !point.attempt }">
            {{ point.label }}
            <small v-if="point.date">{{ point.date }}</small>
          </span>
        </div>
        <div v-for="track in instrument.tracks" :key="track.scaleId" class="sk__tr" role="row">
          <span role="rowheader">{{ track.label }}</span>
          <span
            v-for="(text, i) in track.texts"
            :key="i"
            role="cell"
            class="sk__td"
            :class="{ 'is-pending': track.values[i] === null }"
          >
            {{ text }}
          </span>
        </div>
      </div>
      <p class="pp-muted">{{ t('programs.ui.measureNote') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useT } from '@/composables/useT'
import type { AssessmentId } from '@/domain/assessments'
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'
import { useAssessmentStore } from '@/stores/assessment.store'
import { buildOutcomeSeries, type OutcomeSeries, type OutcomeTrack } from './outcomeSeries'

/**
 * "Pomiar": the path's instruments as quiet tracks — one per scale, an
 * empty disc for the first measurement, a filled one for the latest, the
 * trail between them. Hover tells the values; "Szczegóły" opens one grid
 * per instrument (start · połowa · koniec · powrót) and one sentence.
 * No reversed axes: a track reads the same way as its questionnaire.
 */
const props = defineProps<{
  program: ProgramDefinition
  enrollment: ProgramEnrollment
}>()

const { t, locale } = useT()
const assessmentStore = useAssessmentStore()
const open = ref(false)

const instrumentIds = computed<AssessmentId[]>(
  () => (props.program.outcomeSlugs ?? (props.program.outcomeSlug ? [props.program.outcomeSlug] : [])) as AssessmentId[],
)
onMounted(() => instrumentIds.value.forEach((id) => void assessmentStore.loadAttempts(id)))
watch(instrumentIds, (ids) => ids.forEach((id) => void assessmentStore.loadAttempts(id)))

const series = computed<OutcomeSeries[]>(() =>
  buildOutcomeSeries({
    program: props.program,
    enrollment: props.enrollment,
    attemptsFor: (id) => assessmentStore.getAttemptsByAssessment(id),
    t,
    locale: locale.value,
  }),
)

const first = (track: OutcomeTrack): number | null => track.values[0] ?? null
const lastIndex = (track: OutcomeTrack): number => track.values.reduce<number>((last, value, i) => (value === null ? last : i), -1)
const last = (track: OutcomeTrack): number | null => {
  const index = lastIndex(track)
  return index >= 0 ? (track.values[index] ?? null) : null
}
/** Where a value sits on the track, for the trail and the two discs. */
const span = (track: OutcomeTrack) => {
  const a = first(track)
  const b = last(track)
  if (a === null || b === null) return null
  return { left: `min(${pos(track, a)}, ${pos(track, b)})`, right: `min(calc(100% - ${pos(track, a)}), calc(100% - ${pos(track, b)}))` }
}
const pos = (track: OutcomeTrack, value: number) =>
  `${Math.max(0, Math.min(100, ((value - track.min) / Math.max(1e-6, track.max - track.min)) * 100))}%`
const trackTitle = (instrument: OutcomeSeries, track: OutcomeTrack) =>
  `${track.label} (${instrument.title}): ${instrument.points.map((point, i) => `${point.label} ${track.texts[i]}`).join(' · ')}`
</script>

<style scoped>
.measure {
  display: grid;
  gap: 6px;
}
.measure__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 2px;
}
.measure__title {
  color: var(--mg-color-muted);
  font-size: 0.66rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.sk {
  display: grid;
  grid-template-columns: 7.4rem minmax(0, 1fr);
  gap: var(--mg-space-2);
  align-items: center;
  min-height: 1.3rem;
}
.sk__label {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
  line-height: 1.2;
}
.sk__track {
  position: relative;
  display: block;
  height: 0.45rem;
  border-radius: 4px;
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-inset-sm);
}
.sk__trail {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: inherit;
  background: color-mix(in srgb, var(--mg-color-primary) 34%, var(--mg-color-paper));
}
.sk__start,
.sk__now {
  position: absolute;
  top: 50%;
  width: 0.7rem;
  height: 0.7rem;
  border: 1.5px solid var(--mg-color-primary-fill);
  border-radius: var(--mg-radius-organic-a);
  background: var(--mg-color-paper);
  transform: translate(-50%, -50%);
}
.sk__now {
  z-index: 1;
  background: var(--mg-color-primary-fill);
}
.sk__tables {
  display: grid;
  gap: var(--mg-space-3);
  margin-top: var(--mg-space-2);
}
.sk__table {
  display: grid;
  gap: 4px;
}
.sk__tr {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) repeat(auto-fit, minmax(0, 1fr));
  gap: 4px;
  align-items: center;
  font-size: var(--mg-font-size-xs);
}
.sk__tr--head span {
  display: grid;
  color: var(--mg-color-muted);
  font-weight: 800;
  text-align: center;
}
.sk__tr--head span:first-child {
  text-align: left;
}
.sk__tr--head small {
  font-weight: 500;
}
.sk__tr--head .is-pending {
  opacity: 0.6;
}
.sk__tr [role='rowheader'] {
  font-weight: 700;
}
.sk__td {
  padding: 4px 0;
  border-radius: var(--mg-radius-sm);
  background: var(--mg-color-paper);
  color: var(--mg-color-ink);
  font-weight: 800;
  text-align: center;
}
.sk__td.is-pending {
  border: 1px dashed var(--mg-color-border);
  background: transparent;
  color: var(--mg-color-muted);
}
</style>
