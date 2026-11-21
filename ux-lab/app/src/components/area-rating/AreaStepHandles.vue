<template>
  <section class="arg" :class="{ 'arg--rows': labels === 'row' }">
    <div class="arg__field">
      <header class="arg__head">
        <span class="arg__disc"><AppIcon :name="area.icon" /></span>
        <strong>{{ area.label }}</strong>
      </header>

      <!-- tor stanu nad znakiem, tor obciążenia pod nim: uchwyt stoi przy tym, co przesuwa -->
      <template v-for="axis in LANES" :key="axis">
        <div class="arg__gutter" :class="`arg__gutter--${axis}`">
          <span v-if="labels === 'row'">{{ AXIS_TITLE[axis] }}</span>
          <details class="qr-help">
            <summary :aria-label="`Co oznacza ${AXIS_TITLE[axis]}?`">?</summary>
            <p>{{ area[axis].hint }}</p>
          </details>
        </div>

        <div class="arg__lane" :class="[`arg__lane--${axis}`, { 'is-unset': draft[axis] == null }]" @mouseleave="preview = null">
          <!-- pięć miejsc skali; pod kursorem znak pokazuje, co się zmieni -->
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            class="arg__tick"
            :class="{ 'is-on': draft[axis] === n }"
            :style="{ '--arg-at': n }"
            tabindex="-1"
            :aria-label="`${AXIS_TITLE[axis]}: ${n} z 5`"
            :title="n === 1 ? area[axis].low : n === 5 ? area[axis].high : `${n} z 5`"
            @mouseenter="preview = { axis, value: n }"
            @click="emit('rate', axis, n)"
          >
            <i />
          </button>
          <span class="arg__end arg__end--low" :class="{ 'is-hidden': (draft[axis] ?? 1) <= 1 }" aria-hidden="true">{{ area[axis].low }}</span>
          <span class="arg__end arg__end--high" :class="{ 'is-hidden': draft[axis] === 5 }" aria-hidden="true">{{ area[axis].high }}</span>

          <!-- uchwyt z nazwą: stoi nad kropką / pod końcem słupka i jedzie razem z nimi -->
          <div
            class="arg__chip"
            :style="{ '--arg-at': draft[axis] ?? 1 }"
            role="slider"
            tabindex="0"
            :aria-label="`${area.label} · ${AXIS_TITLE[axis]}`"
            aria-valuemin="1"
            aria-valuemax="5"
            :aria-valuenow="draft[axis] ?? undefined"
            :aria-valuetext="draft[axis] == null ? 'bez oceny' : `${draft[axis]} z 5`"
            @keydown.left.prevent="step(axis, -1)"
            @keydown.right.prevent="step(axis, 1)"
            @keydown.delete.prevent="emit('rate', axis, null)"
            @keydown.backspace.prevent="emit('rate', axis, null)"
          >
            <button type="button" class="arg__nudge" tabindex="-1" :aria-label="`${AXIS_TITLE[axis]}: mniej`" :title="area[axis].low" :disabled="draft[axis] == null" @click="step(axis, -1)">
              <AppIcon name="chevron_left" />
            </button>
            <span class="arg__name" @pointerdown="startDrag(axis, $event)">
              <template v-if="labels === 'chip'">{{ AXIS_TITLE[axis] }}</template>
              <i v-else class="arg__grip" />
            </span>
            <button type="button" class="arg__nudge" tabindex="-1" :aria-label="`${AXIS_TITLE[axis]}: więcej`" :title="area[axis].high" :disabled="draft[axis] === 5" @click="step(axis, 1)">
              <AppIcon name="chevron_right" />
            </button>
          </div>
          <i class="arg__caret" :style="{ '--arg-at': draft[axis] ?? 1 }" />
        </div>

        <div class="arg__tags" :class="`arg__tags--${axis}`">
          <AreaTagLine
            :model-value="draft.tags[axis]"
            :suggestions="suggestions[axis]"
            :label="`${area.label} · ${AXIS_TITLE[axis]}`"
            @update:model-value="emit('tags', axis, $event)"
          />
        </div>
      </template>

      <small class="arg__date">{{ currentLabel }}</small>
      <div ref="markRef" class="arg__mark">
        <AreaHeroMark
          :load="draft.load"
          :state="draft.state"
          :subject="`${area.label} · ten tydzień`"
          :preview-load="preview?.axis === 'load' ? preview.value : null"
          :preview-state="preview?.axis === 'state' ? preview.value : null"
          :grip="draft.load !== draft.state"
        />
        <!-- strefy chwytu na samym znaku: kropka = stan, koniec słupka = obciążenie -->
        <span v-if="draft.state != null" class="arg__grab arg__grab--state" :style="{ '--arg-at': draft.state }" aria-hidden="true" @pointerdown="startDrag('state', $event)" />
        <span v-if="draft.load != null" class="arg__grab arg__grab--load" :style="{ '--arg-at': draft.load }" aria-hidden="true" @pointerdown="startDrag('load', $event)" />
      </div>

      <!-- wcześniejsze tygodnie tym samym znakiem, mniejszym, na tej samej skali -->
      <AreaHistory v-if="past.length" class="arg__past" :weeks="past" :subject="area.label" size="sm" newest-first />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { AXIS_TITLE, stopFromOffset, type AreaDef, type AreaDraft, type AxisKey, type HandleLabels, type PastWeek } from '~lab/lab/areaRatingStep'
import AreaHeroMark from './AreaHeroMark.vue'
import AreaHistory from './AreaHistory.vue'
import AreaTagLine from './AreaTagLine.vue'

/**
 * Runda 3 · „Uchwyty na znaku”. Kontrolka nie stoi obok wykresu, tylko na nim:
 * uchwyt „Stan” siedzi nad kropką, uchwyt „Obciążenie” pod końcem słupka, oba
 * wskazują swój element i jadą razem z nim. Trzy sposoby na tę samą zmianę:
 * strzałki uchwytu (krok), klik w miejsce skali na torze (skok, z podglądem na
 * znaku), przeciągnięcie uchwytu, kropki albo końca słupka.
 *
 * `labels="chip"`: nazwa osi jest na uchwycie. `labels="row"`: nazwa stoi z
 * lewej jak podpis wiersza, a uchwyt ma same strzałki.
 */
const props = withDefaults(
  defineProps<{
    area: AreaDef
    draft: AreaDraft
    past: PastWeek[]
    currentLabel: string
    suggestions: Record<AxisKey, string[]>
    labels?: HandleLabels
  }>(),
  { labels: 'chip' }
)
const emit = defineEmits<{ rate: [axis: AxisKey, value: number | null]; tags: [axis: AxisKey, tags: string[]] }>()

/** Stan nad znakiem (kropka), obciążenie pod nim (koniec słupka). */
const LANES: readonly AxisKey[] = ['state', 'load']

const preview = ref<{ axis: AxisKey; value: number } | null>(null)
const markRef = ref<HTMLElement | null>(null)

function step(axis: AxisKey, delta: number) {
  const next = Math.max(0, Math.min(5, (props.draft[axis] ?? 0) + delta))
  emit('rate', axis, next || null)
}

/** Przeciąganie: uchwyt, kropka i koniec słupka skaczą po pięciu miejscach skali znaku. */
function startDrag(axis: AxisKey, event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  const mark = markRef.value
  if (!mark) return
  event.preventDefault()
  target.setPointerCapture(event.pointerId)
  target.classList.add('is-dragging')
  const move = (moveEvent: PointerEvent) => {
    const rect = mark.getBoundingClientRect()
    const value = stopFromOffset(moveEvent.clientX - rect.left, rect.width, rect.height)
    if (value !== props.draft[axis]) emit('rate', axis, value)
  }
  const end = () => {
    target.classList.remove('is-dragging')
    target.removeEventListener('pointermove', move)
    target.removeEventListener('pointerup', end)
    target.removeEventListener('pointercancel', end)
  }
  target.addEventListener('pointermove', move)
  target.addEventListener('pointerup', end)
  target.addEventListener('pointercancel', end)
}
</script>

<style scoped>
.arg {
  --arg-gutter: 3.25rem;
  --arg-track: 35rem;
  --arg-tags: 15rem;
  --arg-size: 3rem;
  display: grid;
  justify-content: center;
  align-content: start;
}
.arg--rows {
  --arg-gutter: 7.75rem;
}
/* środek miejsca skali n na torze o szerokości znaku — ta sama geometria co w znaku */
.arg__tick,
.arg__chip,
.arg__caret,
.arg__grab {
  --arg-x: calc(var(--arg-size) / 2 + (var(--arg-at) - 1) * (100% - var(--arg-size)) / 4);
}
.arg__field {
  display: grid;
  grid-template-columns: var(--arg-gutter) var(--arg-track) var(--arg-tags);
  grid-template-rows: auto 2.5rem var(--arg-size) 2.5rem auto;
  column-gap: 0;
  padding: 26px 30px 28px 34px;
  border-radius: var(--mg-radius-lg);
  background: var(--mg-color-mist);
  box-shadow: var(--mg-shadow-nested);
}
.arg__head {
  grid-area: 1 / 2;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.arg__head strong {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-md);
  font-weight: var(--mg-weight-title);
}
.arg__disc {
  display: grid;
  place-items: center;
  width: 40px;
  height: 39px;
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--mg-color-veil-strong);
  color: var(--mg-color-primary-strong);
}
.arg__disc :deep(.app-icon) {
  font-size: var(--mg-font-size-icon-lg);
}

/* wiersze: stan (2) · znak (3) · obciążenie (4) */
.arg__gutter--state,
.arg__lane--state,
.arg__tags--state {
  grid-row: 2;
}
.arg__gutter--load,
.arg__lane--load,
.arg__tags--load {
  grid-row: 4;
}
.arg__gutter {
  grid-column: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--mg-space-2);
  padding-right: 12px;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-md);
  font-weight: var(--mg-weight-strong);
}
.arg__gutter .qr-help > p {
  right: auto;
  left: 0;
}
.arg__date {
  grid-area: 3 / 1;
  align-self: center;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-chart);
  font-weight: var(--mg-weight-title);
  font-variant-numeric: tabular-nums;
}
.arg--rows .arg__date {
  padding-right: 12px;
  text-align: right;
}
.arg__mark {
  grid-area: 3 / 2;
  position: relative;
}

/* tor: pięć cichych miejsc skali, na nich uchwyt */
.arg__lane {
  grid-column: 2;
  position: relative;
}
.arg .arg__tick {
  position: absolute;
  top: 50%;
  left: var(--arg-x);
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border-radius: var(--mg-radius-pill);
  background: transparent;
  translate: -50% -50%;
}
.arg__lane--state .arg__tick {
  top: calc(50% - 4px);
}
.arg__lane--load .arg__tick {
  top: calc(50% + 4px);
}
.arg__tick i {
  width: 6px;
  height: 6px;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-veil-strong);
  transition:
    background var(--mg-duration-fast) ease,
    scale var(--mg-duration-fast) ease;
}
.arg__lane:hover .arg__tick i,
.arg__lane.is-unset .arg__tick i {
  background: var(--mg-color-data-ink-soft);
}
.arg__tick:hover i {
  background: var(--mg-color-primary);
  scale: 1.6;
}
.arg__tick.is-on {
  visibility: hidden;
}
/* słowa końców skali zastępują skrajne miejsca, gdy tor jest pod kursorem */
.arg__end {
  position: absolute;
  top: calc(50% - 4px);
  padding: 2px 6px;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-mist);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  line-height: 1.4;
  white-space: nowrap;
  translate: 0 -50%;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--mg-duration-fast) ease;
}
.arg__lane--load .arg__end {
  top: calc(50% + 4px);
}
.arg__end--low {
  left: 0;
}
.arg__end--high {
  right: 0;
}
.arg__lane:hover .arg__end:not(.is-hidden),
.arg__lane:focus-within .arg__end:not(.is-hidden) {
  opacity: 1;
}

/* uchwyt: mała chmura z nazwą osi i strzałkami, przypięta do swojego elementu znaku */
.arg__chip {
  --arg-chip: 8.25rem;
  position: absolute;
  left: clamp(calc(var(--arg-chip) / 2), var(--arg-x), calc(100% - var(--arg-chip) / 2));
  z-index: 1;
  display: grid;
  grid-template-columns: 1.625rem minmax(0, 1fr) 1.625rem;
  align-items: center;
  width: var(--arg-chip);
  height: 1.75rem;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-control);
  translate: -50% 0;
  transition:
    left var(--mg-duration-normal) var(--mg-ease-standard),
    box-shadow var(--mg-duration-fast) var(--mg-ease-standard),
    opacity var(--mg-duration-fast) var(--mg-ease-standard);
}
.arg__lane--state .arg__chip {
  --arg-chip: 6.25rem;
  top: 0;
}
.arg__lane--load .arg__chip {
  bottom: 0;
}
.arg--rows .arg__chip {
  --arg-chip: 4.75rem;
}
.arg__chip:hover {
  box-shadow: var(--mg-shadow-control-hover);
}
.arg__chip:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 2px;
}
/* bez oceny uchwyt czeka na początku toru jako duch */
.arg__lane.is-unset .arg__chip {
  box-shadow: none;
  opacity: 0.7;
}
.arg__name {
  display: grid;
  place-items: center;
  height: 100%;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-strong);
  line-height: 1;
  white-space: nowrap;
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.arg__name.is-dragging,
.arg__grab.is-dragging {
  cursor: grabbing;
}
.arg__grip {
  width: 1rem;
  height: 4px;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-data-ink-soft);
}
.arg .arg__nudge {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 0;
  border-radius: var(--mg-radius-pill);
  background: transparent;
  color: var(--mg-color-primary);
}
.arg .arg__nudge:hover:not(:disabled) {
  background: var(--mg-color-sky-well);
}
.arg .arg__nudge:disabled {
  opacity: 0.25;
}
.arg__nudge :deep(.app-icon) {
  color: var(--mg-color-primary);
  font-size: var(--mg-font-size-icon-sm);
}
/* dzióbek: wskazuje dokładnie kropkę (z góry) albo koniec słupka (z dołu) */
.arg__caret {
  position: absolute;
  left: var(--arg-x);
  width: 12px;
  height: 7px;
  background: var(--mg-color-paper);
  translate: -50% 0;
  transition:
    left var(--mg-duration-normal) var(--mg-ease-standard),
    opacity var(--mg-duration-fast) var(--mg-ease-standard);
}
.arg__lane--state .arg__caret {
  top: calc(1.75rem - 1px);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}
.arg__lane--load .arg__caret {
  bottom: calc(1.75rem - 1px);
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
}
.arg__lane.is-unset .arg__caret {
  opacity: 0;
}

.arg__mark:hover :deep(.ahm__grip) {
  opacity: 1;
}
/* strefy chwytu na znaku */
.arg__grab {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--arg-x);
  z-index: 1;
  width: 2.5rem;
  border-radius: var(--mg-radius-pill);
  translate: -50% 0;
  cursor: grab;
  touch-action: none;
}
.arg__grab--load {
  left: calc(var(--arg-x) + 1rem);
  width: 1.25rem;
  cursor: ew-resize;
}

/* tagi: w wierszu swojej osi, po prawej; druga linia chipów nie rozpycha torów */
.arg__tags {
  grid-column: 3;
  height: 2.5rem;
  padding-left: 22px;
  overflow: visible;
}
.arg__tags :deep(.atl__hints) {
  max-width: 13.5rem;
}
.arg__tags--state {
  padding-top: 0;
}
.arg__tags--load {
  padding-top: 12px;
}

/* historia: stopnie małych torów stoją pod stopniami dużego znaku */
.arg__past {
  grid-area: 5 / 1 / auto / 3;
  --ah-date: var(--arg-gutter);
  --ah-gap: 9px;
  margin-top: 22px;
}
.arg--rows .arg__past :deep(small) {
  padding-right: 12px;
  text-align: right;
}
.arg__past :deep(.ls-track) {
  width: auto;
  margin-inline: 1rem;
}
@media (prefers-reduced-motion: reduce) {
  .arg__chip,
  .arg__caret {
    transition: none;
  }
}
</style>
