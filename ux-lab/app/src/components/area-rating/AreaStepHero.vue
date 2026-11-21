<template>
  <section class="arh" :class="`arh--${layout}`">
    <div class="arh__field">
      <header class="arh__head">
        <span class="arh__disc"><AppIcon :name="area.icon" /></span>
        <strong>{{ area.label }}</strong>
      </header>

      <!-- główny element kroku: znak z kalendarza w dużym rozmiarze, rysowany na żywo -->
      <div class="arh__now">
        <small>{{ currentLabel }}</small>
        <AreaHeroMark :load="draft.load" :state="draft.state" :subject="`${area.label} · ten tydzień`" />
      </div>

      <div class="arh__axes">
        <div v-for="axis in AXES" :key="axis" class="arh__axis">
          <div class="arh__axis-head">
            <h2>{{ AXIS_TITLE[axis] }}</h2>
            <details class="qr-help">
              <summary :aria-label="`Co oznacza ${AXIS_TITLE[axis]}?`">?</summary>
              <p>{{ area[axis].hint }}</p>
            </details>
            <!-- kropki 1–5 jak pod kursorem na kaflu w kalendarzu: pełne do oceny, puste dalej -->
            <div
              v-if="controls === 'dots'"
              class="arh__scale"
              role="radiogroup"
              :aria-label="`${area.label} · ${AXIS_TITLE[axis]}`"
              @keydown.left.prevent="step(axis, -1)"
              @keydown.right.prevent="step(axis, 1)"
              @keydown.delete.prevent="emit('rate', axis, null)"
              @keydown.backspace.prevent="emit('rate', axis, null)"
            >
              <span class="arh__dots">
                <button
                  v-for="n in 5"
                  :key="n"
                  type="button"
                  role="radio"
                  class="arh__dot"
                  :aria-checked="draft[axis] === n"
                  :aria-label="`${AXIS_TITLE[axis]}: ${n} z 5`"
                  :title="n === 1 ? area[axis].low : n === 5 ? area[axis].high : `${n} z 5`"
                  @click="emit('rate', axis, draft[axis] === n ? null : n)"
                >
                  <i class="mg-well" :class="{ 'mg-well--done': n <= (draft[axis] ?? 0) }" />
                </button>
              </span>
              <span class="arh__ends" aria-hidden="true"><span>{{ area[axis].low }}</span><span>{{ area[axis].high }}</span></span>
            </div>
            <div v-else class="arh__steps" role="group" :aria-label="`${area.label} · ${AXIS_TITLE[axis]}`">
              <button type="button" class="arh__step" :aria-label="`${AXIS_TITLE[axis]}: mniej`" :title="area[axis].low" :disabled="draft[axis] == null" @click="step(axis, -1)">
                <AppIcon name="remove" />
              </button>
              <button type="button" class="arh__step" :aria-label="`${AXIS_TITLE[axis]}: więcej`" :title="area[axis].high" :disabled="draft[axis] === 5" @click="step(axis, 1)">
                <AppIcon name="add" />
              </button>
            </div>
          </div>
          <AreaTagLine
            :model-value="draft.tags[axis]"
            :suggestions="suggestions[axis]"
            :label="`${area.label} · ${AXIS_TITLE[axis]}`"
            @update:model-value="emit('tags', axis, $event)"
          />
        </div>
      </div>

      <!-- wcześniejsze tygodnie tym samym znakiem, mniejszym, na tej samej skali -->
      <AreaHistory v-if="past.length" class="arh__past" :weeks="past" :subject="area.label" size="sm" newest-first />
    </div>
  </section>
</template>

<script setup lang="ts">
import AppIcon from '@product/components/shared/AppIcon.vue'
import { AXES, AXIS_TITLE, type AreaDef, type AreaDraft, type AxisKey, type ControlStyle, type HeroLayout, type PastWeek } from '~lab/lab/areaRatingStep'
import AreaHeroMark from './AreaHeroMark.vue'
import AreaHistory from './AreaHistory.vue'
import AreaTagLine from './AreaTagLine.vue'

/**
 * Runda 2 · „Duży znak”. Głównym elementem kroku jest ten sam obiekt, który
 * kalendarz pokazuje w karcie tygodnia i w macierzy miesiąca — leżący słupek z
 * kropką — tylko duży i żywy: każda zmiana oceny od razu zmienia jego długość,
 * położenie kropki i kolor. Pod nim (albo obok) dwie ciche skale kropek z
 * tagami, a niżej wcześniejsze tygodnie mniejszym znakiem na tej samej skali.
 *
 * `layout="stack"`: znak → oceny → historia w jednej kolumnie.
 * `layout="side"`: znak i historia jako jedna kolumna wykresów, oceny obok.
 */
const props = withDefaults(
  defineProps<{
    area: AreaDef
    draft: AreaDraft
    past: PastWeek[]
    currentLabel: string
    suggestions: Record<AxisKey, string[]>
    layout?: HeroLayout
    controls?: ControlStyle
  }>(),
  { layout: 'stack', controls: 'dots' }
)
const emit = defineEmits<{ rate: [axis: AxisKey, value: number | null]; tags: [axis: AxisKey, tags: string[]] }>()

function step(axis: AxisKey, delta: number) {
  const next = Math.max(0, Math.min(5, (props.draft[axis] ?? 0) + delta))
  emit('rate', axis, next || null)
}
</script>

<style scoped>
.arh {
  --arh-gutter: 3.25rem;
  --arh-track: 38.75rem;
  --arh-side: 19rem;
  display: grid;
  justify-content: center;
  align-content: start;
}
.arh--side {
  --arh-track: 30rem;
}
.arh__field {
  display: grid;
  grid-template-columns: calc(var(--arh-gutter) + var(--arh-track));
  grid-template-areas: 'head' 'now' 'axes' 'past';
  padding: 26px 34px 28px;
  border-radius: var(--mg-radius-lg);
  background: var(--mg-color-mist);
  box-shadow: var(--mg-shadow-nested);
}
.arh--side .arh__field {
  grid-template-columns: calc(var(--arh-gutter) + var(--arh-track)) var(--arh-side);
  grid-template-areas: 'head axes' 'now axes' 'past axes';
  grid-template-rows: auto auto 1fr;
  column-gap: 44px;
}
/* nagłówek jak na kaflu w kalendarzu: pole ikony i nazwa obszaru */
.arh__head {
  grid-area: head;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 14px var(--arh-gutter);
}
.arh__head strong {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-md);
  font-weight: var(--mg-weight-title);
}
.arh__disc {
  display: grid;
  place-items: center;
  width: 40px;
  height: 39px;
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--mg-color-veil-strong);
  color: var(--mg-color-primary-strong);
}
.arh__disc :deep(.app-icon) {
  font-size: var(--mg-font-size-icon-lg);
}
.arh__now {
  grid-area: now;
  display: grid;
  grid-template-columns: var(--arh-gutter) minmax(0, 1fr);
  align-items: center;
}
.arh__now small {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-chart);
  font-weight: var(--mg-weight-title);
  font-variant-numeric: tabular-nums;
}
/* historia: stopnie małych torów stoją pod stopniami dużego znaku (3 rem − 1 rem) / 2 */
.arh__past {
  grid-area: past;
  --ah-date: var(--arh-gutter);
  --ah-gap: 9px;
  align-self: start;
  margin-top: 22px;
}
.arh--side .arh__past {
  margin-top: 12px;
}
.arh__past :deep(.ls-track) {
  width: auto;
  margin-inline: 1rem;
}

/* oceny: dwie ciche skale z tagami */
.arh__axes {
  grid-area: axes;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin: 18px 0 0 var(--arh-gutter);
}
.arh--side .arh__axes {
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: 22px;
  margin: 0;
  padding-top: 4px;
}
.arh__axis {
  display: grid;
  align-content: start;
  gap: 6px;
  min-width: 0;
}
.arh__axis-head {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: start;
  column-gap: var(--mg-space-2);
}
.arh__axis-head h2 {
  font-size: var(--mg-font-size-md);
  font-weight: var(--mg-weight-strong);
  line-height: 2rem;
}
.arh__axis-head .qr-help {
  margin-top: 4px;
}
.arh__axis-head .qr-help > p {
  right: auto;
  left: 0;
}
.arh__scale {
  display: grid;
  justify-self: end;
  justify-items: end;
}
.arh__dots {
  --mg-well-size: 1.25rem;
  display: inline-flex;
}
.arh .arh__dot {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border-radius: var(--mg-radius-pill);
  background: transparent;
}
.arh__dot .mg-well:not(.mg-well--done) {
  border-color: transparent;
  background: var(--mg-color-veil-strong);
  box-shadow: none;
}
.arh__dot:hover .mg-well:not(.mg-well--done) {
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-control);
}
/* podpisy końców skali: miejsce zarezerwowane, widoczne w użyciu osi */
.arh__ends {
  display: flex;
  justify-content: space-between;
  gap: var(--mg-space-3);
  min-width: 10rem;
  padding: 0 6px;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  line-height: 1.4;
  white-space: nowrap;
  opacity: 0;
  transition: opacity var(--mg-duration-fast) ease;
}
.arh__axis:hover .arh__ends,
.arh__axis:focus-within .arh__ends {
  opacity: 1;
}
.arh__steps {
  display: inline-flex;
  justify-self: end;
  gap: var(--mg-space-2);
}
.arh .arh__step {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-paper);
  color: var(--mg-color-primary);
  box-shadow: var(--mg-shadow-control);
}
.arh .arh__step:hover:not(:disabled) {
  box-shadow: var(--mg-shadow-control-hover);
  translate: 0 var(--mg-lift-hover);
}
.arh__step :deep(.app-icon) {
  color: var(--mg-color-primary);
  font-size: var(--mg-font-size-icon-md);
}
</style>
