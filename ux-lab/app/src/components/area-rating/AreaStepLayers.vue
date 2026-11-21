<template>
  <section class="asl">
    <div class="asl__field">
      <div v-for="axis in AXES" :key="axis" class="asl__row">
        <div class="asl__label">
          <h2>{{ AXIS_TITLE[axis] }}</h2>
          <details class="qr-help">
            <summary :aria-label="`Co oznacza ${AXIS_TITLE[axis]}?`">?</summary>
            <p>{{ area[axis].hint }}</p>
          </details>
        </div>
        <div
          class="asl__scale"
          role="radiogroup"
          :aria-label="`${area.label} · ${AXIS_TITLE[axis]}`"
          @keydown.left.prevent="step(axis, -1)"
          @keydown.right.prevent="step(axis, 1)"
          @keydown.delete.prevent="emit('rate', axis, null)"
          @keydown.backspace.prevent="emit('rate', axis, null)"
        >
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            role="radio"
            class="asl__stop"
            :class="{ 'is-filled': axis === 'load' && n <= (draft.load ?? 0), 'is-on': draft[axis] === n }"
            :aria-checked="draft[axis] === n"
            :aria-label="`${AXIS_TITLE[axis]}: ${n} z 5`"
            :title="`${n} z 5`"
            @click="emit('rate', axis, draft[axis] === n ? null : n)"
          >
            <!-- obciążenie = chmurki wypełniane od lewej (długość słupka) -->
            <i v-if="axis === 'load'" class="asl__cloud" />
            <!-- stan = dysk z „Planu dnia”; kleks stoi tam, gdzie kropka znaku -->
            <i v-else class="mg-well asl__well" :class="{ 'mg-well--done': draft.state === n }" />
          </button>
          <span class="asl__ends" aria-hidden="true"><span>{{ area[axis].low }}</span><span>{{ area[axis].high }}</span></span>
        </div>
        <AreaTagLine
          class="asl__tags"
          :model-value="draft.tags[axis]"
          :suggestions="suggestions[axis]"
          :label="`${area.label} · ${AXIS_TITLE[axis]}`"
          @update:model-value="emit('tags', axis, $event)"
        />
      </div>
      <!-- obie warstwy złożone w znak tygodnia; niżej wcześniejsze tygodnie na tej samej skali -->
      <div class="asl__sum">
        <div class="asl__now">
          <small>{{ currentLabel }}</small>
          <LoadStateTrack :load="draft.load" :state="draft.state" :subject="`${area.label} · ten tydzień`" />
        </div>
        <AreaHistory v-if="past.length" class="asl__past" :weeks="past" :subject="area.label" size="xs" newest-first />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LoadStateTrack from '@product/components/shared/charts/LoadStateTrack.vue'
import { loadStateTone } from '@product/domain/loadStateTone'
import { AXES, AXIS_TITLE, type AreaDef, type AreaDraft, type AxisKey, type PastWeek } from '~lab/lab/areaRatingStep'
import AreaHistory from './AreaHistory.vue'
import AreaTagLine from './AreaTagLine.vue'

/**
 * B · „Znak w dwóch warstwach”. Ocena mówi językiem znaku: wiersz leżących
 * chmurek to długość słupka (obciążenie), wiersz dysków to położenie kropki
 * (stan). Pięć stopni obu wierszy, znak tygodnia pod nimi i wcześniejsze
 * tygodnie dzielą jedną skalę, więc historia jest przedłużeniem oceny w dół.
 */
const props = defineProps<{
  area: AreaDef
  draft: AreaDraft
  past: PastWeek[]
  currentLabel: string
  suggestions: Record<AxisKey, string[]>
}>()
const emit = defineEmits<{ rate: [axis: AxisKey, value: number | null]; tags: [axis: AxisKey, tags: string[]] }>()

const tone = computed(() => loadStateTone(props.draft.load, props.draft.state))
/** Przed drugą oceną rysujemy neutralnym błękitem danych; potem kolorem pary. */
const fill = computed(() => tone.value?.mark ?? 'var(--mg-color-data-fill)')
const wellField = computed(() => tone.value?.field ?? 'var(--mg-color-sky-field)')

function step(axis: AxisKey, delta: number) {
  const next = Math.max(0, Math.min(5, (props.draft[axis] ?? 0) + delta))
  emit('rate', axis, next || null)
}
</script>

<style scoped>
.asl {
  --asl-label: 9.25rem;
  --asl-cell: 4.75rem;
  --asl-gap: 8px;
  --asl-col-gap: 24px;
  --asl-scale: calc(5 * var(--asl-cell) + 4 * var(--asl-gap));
  --asl-fill: v-bind(fill);
  --mg-well-mark: v-bind(fill);
  --mg-well-field: v-bind(wellField);
  width: min(100%, 940px);
  margin: 0 auto;
}
.asl__field {
  display: grid;
  gap: var(--mg-space-2);
  padding: 26px 30px 24px;
  border-radius: var(--mg-radius-lg);
  background: var(--mg-color-mist);
  box-shadow: var(--mg-shadow-nested);
}
.asl__row {
  display: grid;
  grid-template-columns: var(--asl-label) var(--asl-scale) minmax(0, 1fr);
  column-gap: var(--asl-col-gap);
  align-items: start;
}
.asl__label {
  display: flex;
  align-items: center;
  gap: var(--mg-space-2);
  min-height: 2.75rem;
}
.asl__label h2 {
  font-size: var(--mg-font-size-lg);
  font-weight: var(--mg-weight-strong);
}
.asl__label .qr-help > p {
  right: auto;
  left: 0;
}
.asl__scale {
  display: grid;
  grid-template-columns: repeat(5, var(--asl-cell));
  column-gap: var(--asl-gap);
}
.asl .asl__stop {
  display: grid;
  place-items: center;
  height: 2.75rem;
  padding: 0;
  border-radius: var(--mg-radius-sm);
  background: transparent;
}
/* chmurka: ten sam kształt i przekręcenie co w słupku ocen, tylko leży */
.asl__cloud {
  width: 100%;
  height: 2.25rem;
  border-radius: var(--mg-radius-cloud-a);
  background: var(--mg-color-veil);
  rotate: -0.9deg;
  transition:
    background var(--mg-duration-fast) ease,
    opacity var(--mg-duration-fast) ease;
}
.asl__stop:nth-child(2n) .asl__cloud {
  border-radius: var(--mg-radius-cloud-b);
  rotate: 0.9deg;
}
.asl__stop:hover .asl__cloud {
  background: var(--mg-color-veil-strong);
}
.asl__stop.is-filled .asl__cloud {
  background: var(--asl-fill);
}
.asl__stop.is-filled:nth-child(1) .asl__cloud {
  opacity: 0.5;
}
.asl__stop.is-filled:nth-child(2) .asl__cloud {
  opacity: 0.62;
}
.asl__stop.is-filled:nth-child(3) .asl__cloud {
  opacity: 0.74;
}
.asl__stop.is-filled:nth-child(4) .asl__cloud {
  opacity: 0.87;
}
.asl__stop.is-filled.is-on .asl__cloud {
  opacity: 1;
}
.asl__well {
  --mg-well-size: 2.25rem;
  transition: background var(--mg-duration-fast) ease;
}
/* pusty stopień stanu to welon, nie studnia „do zrobienia”: wybrany dysk jest jedynym kolorem w wierszu */
.asl__well:not(.mg-well--done) {
  border-color: transparent;
  background: var(--mg-color-veil);
  box-shadow: none;
}
.asl__stop:hover .asl__well:not(.mg-well--done) {
  background: var(--mg-color-veil-strong);
}
/* podpisy końców skali: miejsce zarezerwowane, widoczne w użyciu wiersza */
.asl__ends {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  min-height: 1.125rem;
  padding: 0 2px;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  line-height: 1.5;
  opacity: 0;
  transition: opacity var(--mg-duration-fast) ease;
}
.asl__row:hover .asl__ends,
.asl__row:focus-within .asl__ends {
  opacity: 1;
}
.asl__tags {
  padding-top: 8px;
}
/* znak tygodnia i wcześniejsze tygodnie: stopnie torów stoją pod środkami chmurek */
.asl__sum {
  display: grid;
  gap: 10px;
  width: calc(var(--asl-label) + var(--asl-col-gap) + var(--asl-scale));
  margin-top: var(--mg-space-1);
}
.asl__now {
  display: grid;
  grid-template-columns: calc(var(--asl-label) + var(--asl-col-gap)) minmax(0, 1fr);
  align-items: center;
}
.asl__now small {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-chart);
  font-weight: var(--mg-weight-title);
  font-variant-numeric: tabular-nums;
}
.asl__now :deep(.ls-track) {
  width: auto;
  margin-inline: calc(var(--asl-cell) / 2 - 11px);
}
.asl__past {
  --ah-date: calc(var(--asl-label) + var(--asl-col-gap));
}
.asl__past :deep(.ls-track) {
  width: auto;
  margin-inline: calc(var(--asl-cell) / 2 - 5px);
}
</style>
