<template>
  <section class="mg-v2-surface mg-v2-surface--raised-sm pp-card pp-journey" :aria-label="t('programs.ui.journeyTitle')" data-testid="path-journey">
    <header class="pp-card__head"><span>{{ t('programs.ui.journeyTitle') }}</span></header>
    <article
      v-for="group in groups"
      :key="group.key"
      class="wk"
      :class="[`wk--${stateOf(group)}`, { 'wk--open': isOpen(group), 'wk--return': group.isReturn, 'wk--single': groups.length === 1 }]"
      :data-test-path-week="group.key"
    >
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
          :class="{ 'mg-well--done': stateOf(group) === 'done', 'pp-well--current': stateOf(group) === 'current' }"
        >
          <AppIcon v-if="group.isReturn" name="replay" />
          <b v-else-if="stateOf(group) !== 'done'">{{ group.week ?? group.index + 1 }}</b>
        </span>
        <strong class="wk__title">{{ groupTitle(group) }}</strong>
        <span class="wk__marks">
          <i v-for="i in group.stepIndices" :key="i" class="pp-mark" :class="`pp-mark--${stepStateOf(i)}`" />
        </span>
        <AppIcon class="wk__chevron" :name="isOpen(group) ? 'expand_less' : 'expand_more'" />
      </button>

      <div v-if="isOpen(group)" :id="`path-group-${group.key}`" class="wk__body">
        <p v-if="groupWhy(group)" class="wk__why">{{ groupWhy(group) }}</p>
        <ul class="steps">
          <li
            v-for="i in group.stepIndices"
            :key="i"
            class="st"
            :class="`st--${stepStateOf(i)}`"
            :data-test-program-step="i"
          >
            <span class="pp-mark pp-mark--lg" :class="`pp-mark--${stepStateOf(i)}`">
              <AppIcon v-if="stepStateOf(i) === 'done'" name="check" />
            </span>
            <span class="st__copy">
              <strong>{{ stepTitle(i) }}</strong>
              <small v-if="stepStateOf(i) === 'current' && currentNote">{{ currentNote }}</small>
              <small v-else-if="stepStateOf(i) !== 'done' && program.steps[i]!.optional">{{ t('programs.ui.optionalBadge') }}</small>
              <small v-else-if="stepStateOf(i) !== 'done' && minutes(i)">{{ minutes(i) }}</small>
            </span>
            <span v-if="stepStateOf(i) === 'current' && enrollment && !paused" class="st__actions">
              <button type="button" class="pp-chip pp-chip--primary" :disabled="busy" @click="emit('start', i)">
                {{ t('programs.ui.start') }}
              </button>
              <button v-if="program.steps[i]!.optional" type="button" class="pp-chip" :disabled="busy" @click="emit('skip')">
                {{ t('programs.ui.skipOptional') }}
              </button>
            </span>
          </li>
        </ul>

        <template v-if="enrollment && enrollment.status !== 'completed' && stateOf(group) === 'current' && !group.isReturn">
          <PathPracticesRow :program="program" :enrollment="enrollment" />
          <PathWorldRow v-if="program.weeklyTasks?.length" :program="program" :enrollment="enrollment" />
        </template>
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
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'
import type { ProgramStepState } from '@/services/programSchedulerService'
import { programStepTitle } from '@/utils/programStepTitle'
import PathPracticesRow from './PathPracticesRow.vue'
import PathWorldRow from './PathWorldRow.vue'
import { currentGroupIndex, groupState, pathGroups, stepItemState, type PathGroup } from './pathModel'

/**
 * "Twoja droga" — the path as rows: one per week (phase), a well with the
 * number (a check once done), the title and one small mark per step. The
 * current week opens by default: its "why" sentence, the steps with a
 * filled chip only on the current one, then Praktyki and W świecie as two
 * collapsible rows. A path without phases is one open list.
 */
const props = defineProps<{
  program: ProgramDefinition
  enrollment?: ProgramEnrollment
  stepStates: ProgramStepState[]
  /** Text under the current step: "dziś", "jutro", a date, "zaległe", "czeka na Twój powrót". */
  currentNote?: string
  paused?: boolean
  busy?: boolean
}>()
const emit = defineEmits<{ start: [stepIndex: number]; skip: [] }>()

const { t, tg } = useT()
const groups = computed(() => pathGroups(props.program))
const open = ref<string[]>([])

function defaultOpen(): string[] {
  const current = currentGroupIndex(groups.value, props.stepStates)
  if (current >= 0) return [groups.value[current]!.key]
  // Not enrolled: the first week; everything done: nothing.
  return props.enrollment ? [] : [groups.value[0]!.key]
}
watch(
  () => [props.program.slug, props.enrollment?.id, currentGroupIndex(groups.value, props.stepStates)],
  () => {
    open.value = defaultOpen()
  },
  { immediate: true },
)

const isOpen = (group: PathGroup) => groups.value.length === 1 || open.value.includes(group.key)
function toggle(group: PathGroup) {
  open.value = open.value.includes(group.key) ? open.value.filter((key) => key !== group.key) : [...open.value, group.key]
}
const stateOf = (group: PathGroup) => groupState(group, props.stepStates)
const stepStateOf = (index: number) => stepItemState(props.stepStates[index])

function groupTitle(group: PathGroup): string {
  return group.phase ? t(`${props.program.i18nKey}.phases.${group.phase.key}.title`) : t('programs.ui.journeyTitle')
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
  return programStepTitle(t, props.program.i18nKey, index, entry ? t(`exercises.cards.${entry.i18nKey}.title`) : step.exerciseSlug)
}
function minutes(index: number): string {
  const entry = getCatalogEntry(props.program.steps[index]!.exerciseSlug)
  return entry?.estimatedMinutes ? t('programs.ui.minutes', { n: entry.estimatedMinutes }) : ''
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
  border-radius: var(--mg-radius-sm);
  transition: background var(--mg-duration-fast) var(--mg-ease-standard);
}
.wk:not(.wk--single):hover {
  background: var(--mg-color-mist);
}
.wk--open:not(.wk--single),
.wk--open:not(.wk--single):hover {
  background: var(--mg-color-paper);
}
.wk--return {
  margin-top: var(--mg-space-2);
  padding-top: var(--mg-space-2);
  border-top: 1.5px dashed color-mix(in srgb, var(--mg-color-muted) 38%, transparent);
  border-radius: 0 0 var(--mg-radius-sm) var(--mg-radius-sm);
}
.wk__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto 18px;
  gap: var(--mg-space-2);
  align-items: center;
  width: 100%;
  min-height: 2.9rem;
  padding: var(--mg-space-1) var(--mg-space-2);
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
.wk__marks {
  display: inline-flex;
  gap: 4px;
}
.wk__chevron {
  color: var(--mg-color-primary-strong);
  font-size: 18px;
}
.wk__body {
  display: grid;
  gap: var(--mg-space-2);
  padding: 0 var(--mg-space-2) var(--mg-space-3) calc(1.85rem + var(--mg-space-2) * 2);
}
.wk--single .wk__body {
  padding: 0;
}
.wk__why {
  margin: 0 0 var(--mg-space-1);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
  line-height: 1.5;
}
.steps {
  display: grid;
  gap: 2px;
  margin: 0 0 var(--mg-space-1);
  padding: 0;
  list-style: none;
}
.st {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--mg-space-2);
  align-items: center;
  min-height: 2.3rem;
}
.st__copy {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  align-items: baseline;
  min-width: 0;
}
.st__copy strong {
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
}
.st--current .st__copy strong {
  color: var(--mg-color-primary-strong);
  font-weight: 800;
}
.st--later .st__copy strong {
  color: color-mix(in srgb, var(--mg-color-ink) 75%, var(--mg-color-muted));
  font-weight: 600;
}
.st__copy small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 600;
}
.st__actions {
  display: inline-flex;
  gap: 6px;
}
@media (max-width: 900px) {
  .wk__marks {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .wk {
    transition: none;
  }
}
</style>
