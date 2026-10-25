<template>
  <section
    class="mg-v2-surface mg-v2-surface--raised-sm pp-card pp-journey"
    :aria-label="t('programs.ui.journeyTitle')"
    data-testid="path-journey"
  >
    <header class="pp-card__head">
      <span>{{ t('programs.ui.journeyTitle') }}</span>
      <button
        v-if="restartable"
        type="button"
        class="pp-link"
        :aria-expanded="restartOpen"
        data-testid="path-restart"
        @click="restartOpen = !restartOpen"
      >
        {{ t('programs.ui.restartInline') }}
      </button>
    </header>
    <div
      v-if="restartOpen"
      class="pp-confirm"
      role="group"
      :aria-label="t('programs.ui.restartConfirmTitle')"
    >
      <span>{{ t('programs.ui.restartInlineQuestion') }}</span>
      <span class="pp-confirm__actions">
        <button
          type="button"
          class="pp-chip pp-chip--primary"
          :disabled="busy"
          @click="confirmRestart"
        >
          {{ t('programs.ui.restartInlineConfirm') }}
        </button>
        <button type="button" class="pp-chip" @click="restartOpen = false">
          {{ t('programs.ui.keep') }}
        </button>
      </span>
    </div>

    <article
      v-for="group in groups"
      :key="group.key"
      class="wk"
      :class="[
        `wk--${stateOf(group)}`,
        {
          'wk--open': isOpen(group),
          'wk--return': group.isReturn,
          'wk--single': groups.length === 1,
        },
      ]"
      :data-test-path-week="group.key"
    >
      <!-- Head row: the number well on the left, the title level with it, ONE state disc on the right. -->
      <button
        v-if="groups.length > 1"
        type="button"
        class="wk__row"
        :aria-expanded="isOpen(group)"
        :aria-controls="`path-group-${group.key}`"
        @click="toggle(group)"
      >
        <span
          class="mg-well pp-well"
          :class="{
            'pp-well--past': stateOf(group) === 'done',
            'pp-well--current': stateOf(group) === 'current',
          }"
        >
          <AppIcon v-if="group.isReturn" name="replay" />
          <b v-else>{{ group.week ?? group.index + 1 }}</b>
        </span>
        <strong class="wk__title">{{ groupTitle(group) }}</strong>
        <span
          class="mg-well pp-well pp-disc"
          :class="{
            'mg-well--done': stateOf(group) === 'done',
            'pp-disc--meter': stateOf(group) === 'current',
          }"
          :style="
            stateOf(group) === 'current'
              ? {
                  '--fill': `${(completion(group).done / Math.max(1, completion(group).total)) * 100}%`,
                }
              : undefined
          "
          :aria-label="
            t('programs.ui.stepsDoneOf', {
              done: completion(group).done,
              total: completion(group).total,
            })
          "
        >
          <b v-if="stateOf(group) === 'current'"
            >{{ completion(group).done }}<i>/{{ completion(group).total }}</i></b
          >
        </span>
      </button>

      <!-- One field holds the week's "why" and its steps as tiles in one row;
           the tiles sit one tone whiter than the field (ladder: card → row → field → tile). -->
      <div v-if="isOpen(group)" :id="`path-group-${group.key}`" class="wk__field">
        <p v-if="groupWhy(group)" class="wk__why">{{ groupWhy(group) }}</p>
        <div class="wk__body" :style="{ '--cols': columnsOf(group) }">
          <article
            v-for="i in group.stepIndices"
            :key="i"
            class="pp-tile"
            :class="[
              `pp-tile--${stepStateOf(i)}`,
              {
                'pp-tile--paused': paused && stepStateOf(i) === 'current',
                'pp-tile--focus': isFocused(group, i),
              },
            ]"
            :data-test-program-step="i"
            @click="onTileClick(group, i, $event)"
          >
            <!-- Head = the title alone, one row in the usual case; the whole
                 tile toggles focus, this button carries it for the keyboard. -->
            <button
              type="button"
              class="pp-tile__head pp-tile__toggle"
              :aria-expanded="isFocused(group, i)"
              @click.stop="toggleFocus(group, i)"
            >
              <span
                v-if="formOf(i)"
                class="pp-tile__form"
                :title="t(`programs.ui.form.${formOf(i)}`)"
                :aria-label="t(`programs.ui.form.${formOf(i)}`)"
                role="img"
              >
                <AppIcon :name="`form-${formOf(i)}`" />
              </span>
              <strong class="pp-tile__title">{{ stepTitle(i) }}</strong>
            </button>
            <p v-if="stepWhat(i)" class="pp-tile__what">
              {{ isFocused(group, i) ? stepWhat(i) : firstSentence(stepWhat(i)) }}
            </p>
            <p v-if="isFocused(group, i) && stepWhy(i)" class="pp-tile__why">
              <b>{{ t('programs.ui.whyLabel') }}:</b> {{ stepWhy(i) }}
            </p>
            <!-- Footer: actions right after the content on the current tile,
                 the one meta slot (minutes · optional · skipped · done date + Cofnij)
                 in the bottom-right corner on every tile. -->
            <footer class="pp-tile__foot">
              <template v-if="stepStateOf(i) === 'current' && enrollment && !paused">
                <button
                  type="button"
                  class="pp-chip pp-chip--primary"
                  :disabled="busy"
                  @click="emit('start', i)"
                >
                  {{ t('programs.ui.start') }}
                </button>
                <button
                  v-if="program.steps[i]!.optional"
                  type="button"
                  class="pp-chip"
                  :disabled="busy"
                  @click="emit('skip')"
                >
                  {{ t('programs.ui.skipOptional') }}
                </button>
              </template>
              <span class="pp-tile__meta">
                <button
                  v-if="rawState(i) === 'done' && canUndo && i === lastDoneIndex"
                  type="button"
                  class="pp-chip pp-chip--ghost pp-tile__undo"
                  :disabled="busy"
                  data-testid="path-undo"
                  @click="emit('undo', i)"
                >
                  {{ t('programs.ui.undo') }}
                </button>
                <i
                  v-if="stepStateOf(i) === 'done' && rawState(i) !== 'skipped'"
                  class="mg-well pp-well pp-well--sm mg-well--done"
                  aria-hidden="true"
                />
                <small :title="rawState(i) === 'done' ? doneLabel(i) : undefined">{{
                  metaOf(i)
                }}</small>
              </span>
            </footer>
          </article>
        </div>
      </div>
    </article>
    <slot />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import { exerciseStepForm, type ExerciseStepForm } from '@/domain/exerciseCatalog'
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'
import type { ProgramStepState } from '@/services/programSchedulerService'
import { formatDayShort } from '@/utils/periodLabels'
import { getPeriodRefsForDate } from '@/utils/periods'
import { programStepTitle } from '@/utils/programStepTitle'
import {
  currentGroupIndex,
  firstSentence,
  groupState,
  pathGroups,
  stepItemState,
  type PathGroup,
} from './pathModel'

/**
 * "Twoja droga" (Lab /concepts/path-view-v2, round 6, 2026-10-11): one row
 * per week — the number well on the left, the title level with it, ONE
 * state disc on the right (fill + "done/total" while current, the done
 * well once closed, an empty well before). The open week's row keeps the
 * card tone; below it ONE mist field holds its "why" sentence AND the steps
 * as paper tiles in one row (decision 2026-10-17): the head is the title
 * alone, with a small glyph of the step's form before it (pomiar from the
 * catalog kind, wyobraźnia/namysł/działanie from `form`); ONE tile per week
 * is in focus (two columns wide, the whole intro,
 * "po co") — the current step by default, any tile on click; the others
 * show the first sentence of their intro. The current tile is lit (ring)
 * and holds the only filled button on the page. Every tile keeps one meta
 * slot in the bottom-right corner (minutes · opcjonalny · pominięto · the
 * done well + date, with Cofnij sliding in on hover). "Od nowa" is a link
 * in the head with an inline confirm. No dashed lines.
 */
const props = defineProps<{
  program: ProgramDefinition
  enrollment?: ProgramEnrollment
  stepStates: ProgramStepState[]
  /** Text under the current step: "dziś", "jutro", a date, "zaległe", "czeka na Twój powrót". */
  currentNote?: string
  paused?: boolean
  busy?: boolean
  /** "Cofnij" on the last completed tile (the step before the current one was completed, enrollment active). */
  canUndo?: boolean
  /** "Od nowa" in the head (an open enrollment). */
  restartable?: boolean
}>()
const emit = defineEmits<{
  start: [stepIndex: number]
  skip: []
  undo: [stepIndex: number]
  restart: []
}>()

const { t, tg, locale } = useT()
const groups = computed(() => pathGroups(props.program))
const open = ref<string[]>([])
const restartOpen = ref(false)

function defaultOpen(): string[] {
  const current = currentGroupIndex(groups.value, props.stepStates)
  if (current >= 0) return [groups.value[current]!.key]
  // Not enrolled: the first week; everything done: nothing.
  return props.enrollment ? [] : [groups.value[0]!.key]
}
watch(
  () => [
    props.program.slug,
    props.enrollment?.id,
    currentGroupIndex(groups.value, props.stepStates),
  ],
  () => {
    open.value = defaultOpen()
  },
  { immediate: true }
)

const isOpen = (group: PathGroup) => groups.value.length === 1 || open.value.includes(group.key)
function toggle(group: PathGroup) {
  open.value = open.value.includes(group.key)
    ? open.value.filter(key => key !== group.key)
    : [...open.value, group.key]
}
/**
 * The tile in focus (decision 2026-10-17): one wide tile per open week with
 * the whole intro and "po co"; the others show one sentence. By default the
 * current step is in focus; a click on another tile moves the focus there
 * (the current tile keeps its ring and button), a click on the focused tile
 * — or on the current one — restores the default.
 */
const focused = ref<number | null>(null)
watch(
  () => [props.program.slug, props.enrollment?.id, props.enrollment?.currentStepIndex],
  () => {
    focused.value = null
  }
)
function focusedIndex(group: PathGroup): number | null {
  if (focused.value !== null && group.stepIndices.includes(focused.value)) return focused.value
  const current = group.stepIndices.find(index => stepStateOf(index) === 'current')
  return current ?? null
}
const isFocused = (group: PathGroup, index: number) => focusedIndex(group) === index
function toggleFocus(group: PathGroup, index: number): void {
  if (isFocused(group, index)) {
    focused.value = null
    // The current tile is the default focus: a click on it stays put. Another
    // focused tile returns to the default (the current one, if the week has it).
    return
  }
  const current = group.stepIndices.find(i => stepStateOf(i) === 'current')
  focused.value = index === current ? null : index
}
function onTileClick(group: PathGroup, index: number, event: MouseEvent): void {
  if ((event.target as HTMLElement | null)?.closest('button')) return
  toggleFocus(group, index)
}
/** Columns of the week's row: one per step, plus one for the wide focused tile. */
function columnsOf(group: PathGroup): number {
  return group.stepIndices.length + (focusedIndex(group) === null ? 0 : 1)
}
/** The bottom-right slot: "pominięto", the completion date, or "opcjonalny · 4 min". */
function metaOf(index: number): string {
  if (rawState(index) === 'skipped') return t('programs.ui.stepSkipped')
  if (stepStateOf(index) === 'done') return doneDate(index)
  const parts: string[] = []
  if (stepStateOf(index) === 'current' && props.currentNote) parts.push(props.currentNote)
  else if (props.program.steps[index]!.optional) parts.push(t('programs.ui.optionalBadge'))
  const min = minutes(index)
  if (min) parts.push(min)
  return parts.join(' · ')
}
const stateOf = (group: PathGroup) => groupState(group, props.stepStates)
const rawState = (index: number) => props.stepStates[index]?.state ?? 'locked'
const stepStateOf = (index: number) => stepItemState(props.stepStates[index])
const completion = (group: PathGroup) => ({
  done: group.stepIndices.filter(index => stepStateOf(index) === 'done').length,
  total: group.stepIndices.length,
})
const lastDoneIndex = computed(() =>
  props.enrollment ? props.enrollment.currentStepIndex - 1 : -1
)

function groupTitle(group: PathGroup): string {
  return group.phase
    ? t(`${props.program.i18nKey}.phases.${group.phase.key}.title`)
    : t('programs.ui.journeyTitle')
}
function groupWhy(group: PathGroup): string {
  if (!group.phase) return ''
  const key = `${props.program.i18nKey}.phases.${group.phase.key}.why`
  const value = tg(key)
  return value === key ? '' : value
}
function stepTitle(index: number): string {
  const step = props.program.steps[index]!
  const entry = getCatalogEntry(step.exerciseSlug)
  return programStepTitle(
    t,
    props.program.i18nKey,
    index,
    entry ? t(`exercises.cards.${entry.i18nKey}.title`) : step.exerciseSlug
  )
}
/** "Co robisz": the step's intro sentence. */
function stepWhat(index: number): string {
  const key = props.program.steps[index]!.introKey
  return key ? tg(key) : ''
}
/** "Po co": `programs.<slug>.steps.step<n>.why`, when the program has it. */
function stepWhy(index: number): string {
  const key = `${props.program.i18nKey}.steps.step${index + 1}.why`
  const value = tg(key)
  return value === key ? '' : value
}
/** The step's form of work (pomiar · wyobraźnia · namysł · działanie), for the glyph before the title. */
function formOf(index: number): ExerciseStepForm | undefined {
  return exerciseStepForm(getCatalogEntry(props.program.steps[index]!.exerciseSlug))
}
function minutes(index: number): string {
  const entry = getCatalogEntry(props.program.steps[index]!.exerciseSlug)
  return entry?.estimatedMinutes ? t('programs.ui.minutes', { n: entry.estimatedMinutes }) : ''
}
function doneDate(index: number): string {
  const state = props.stepStates[index]
  if (!state || state.state !== 'done' || !state.completedAt) return ''
  return formatDayShort(getPeriodRefsForDate(new Date(state.completedAt)).day, locale.value)
}
function doneLabel(index: number): string {
  const date = doneDate(index)
  return date ? t('programs.ui.stepDone', { date }) : ''
}
function confirmRestart(): void {
  restartOpen.value = false
  emit('restart')
}
</script>

<style scoped>
.pp-journey {
  gap: 2px;
}
.pp-journey > .pp-card__head {
  margin-bottom: var(--mg-space-2);
}
.wk {
  border-radius: var(--mg-radius-md);
  transition: background var(--mg-duration-fast) var(--mg-ease-standard);
}
/* A closed row lifts to mist on hover; the open week is marked by its field
   below, so its row stays in the card tone (the ladder has three steps:
   card → field (mist) → tiles (paper)). */
.wk:not(.wk--open) > .wk__row:hover {
  background: var(--mg-color-mist);
}
/* The open week is ONE mist surface from its head row down: number, title,
   state disc, "why" and tiles read as one block. The field inside drops its
   own tone so the ladder stays card → mist → paper tiles. */
.wk--open:not(.wk--single) {
  margin-bottom: var(--mg-space-2);
  background: var(--mg-color-mist);
}
.wk--open:not(.wk--single) > .wk__field {
  margin: 0;
  padding-top: 0;
  background: transparent;
}
.wk--return {
  margin-top: var(--mg-space-3);
}
.wk__row {
  border-radius: var(--mg-radius-md);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--mg-space-3);
  align-items: center;
  width: 100%;
  min-height: 3rem;
  padding: var(--mg-space-2) var(--mg-space-3) var(--mg-space-2) var(--mg-space-2);
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.wk__title {
  font-size: var(--mg-font-size-md);
  font-weight: 700;
  line-height: 1.3;
}
.wk--later .wk__title {
  color: color-mix(in srgb, var(--mg-color-ink) 70%, var(--mg-color-muted));
  font-weight: 600;
}
.wk--current .wk__title {
  font-weight: 800;
}
.pp-well--past {
  border-color: transparent;
  background: var(--mg-color-sky-field);
  color: var(--mg-color-primary-strong);
  box-shadow: none;
}
/* The open week's field: ONE mist surface that holds the "why" sentence and
   the step tiles, so the tiles read as the content of the week rather than
   as a second row beside the sentence. Tiles inside are paper (the tile
   default), one full step whiter than the field. */
.wk__field {
  display: flex;
  flex-direction: column;
  gap: var(--mg-space-2);
  margin: 0 0 var(--mg-space-2);
  padding: var(--mg-space-2);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-mist);
}
.wk__why {
  margin: 0;
  padding: 2px 6px 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
  font-weight: 500;
  line-height: 1.45;
}
.wk__body {
  display: grid;
  grid-template-columns: repeat(var(--cols, 4), minmax(0, 1fr));
  gap: var(--mg-space-2);
  align-items: stretch;
}
/* A path without weeks: the field sits straight on the card, so it takes the
   mist tone and its tiles the plain paper one. */
.wk--single .wk__field {
  margin: 0;
}
/* The focused tile takes two columns; its neighbours show one sentence. */
.wk__body .pp-tile--focus {
  grid-column: span 2;
}
.wk__body .pp-tile:not(.pp-tile--focus) {
  cursor: pointer;
}
/* One sentence, whole where it fits; three lines is the safety net. */
.wk__body .pp-tile:not(.pp-tile--focus) .pp-tile__what {
  -webkit-line-clamp: 3;
}
@media (max-width: 900px) {
  .wk__body {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (prefers-reduced-motion: reduce) {
  .wk {
    transition: none;
  }
}
</style>
