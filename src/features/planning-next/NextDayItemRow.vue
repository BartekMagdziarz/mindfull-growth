<template>
  <article class="ndi" :class="{ 'ndi--open': expanded }" @click="expanded = !expanded">
    <div class="ndi__main">
      <span class="ndi__lead" :class="{ 'ndi__lead--active': hasTodayEntry }" aria-hidden="true">
        <AppIcon :name="iconName" />
      </span>

      <button type="button" class="ndi__label" :title="title" @click.stop="$emit('open-object')">
        <strong>{{ title }}</strong>
      </button>

      <!-- One disc for every entry mode: only what sits inside changes, so the
           right edge of the rail stays a single straight column. -->
      <div class="ndi__entry" @click.stop>
        <!-- Completion (and the dormant initiative kind): done fills the disc -->
        <button
          v-if="isCompletionToggle"
          type="button"
          class="ndi__well ndi__well--button"
          :class="{ 'ndi__well--done': completionDone }"
          :disabled="isPending"
          :aria-pressed="completionDone"
          :aria-label="completionDone ? t('planning.today.actions.undoEntry') : t('planning.today.actions.recordEntry')"
          @click="$emit('toggle-completion')"
        ></button>

        <!-- Multi-completion: one disc per item, like a row of chart dots -->
        <span v-else-if="viz.entryMode.value === 'multi-completion'" class="ndi__dots">
          <button
            v-for="multiItem in multiActiveItems"
            :key="multiItem.id"
            type="button"
            class="ndi__well ndi__well--dot ndi__well--button"
            :class="{ 'ndi__well--done': multiCheckedIds.has(multiItem.id) }"
            :disabled="isPending"
            :title="multiItem.label"
            :aria-label="multiItem.label"
            :aria-pressed="multiCheckedIds.has(multiItem.id)"
            @click="$emit('toggle-multi-item', multiItem.id)"
          ></button>
        </span>

        <!-- Counter and rating: same disc, ± tucked beside it until hover/focus -->
        <template v-else-if="isStepperMode">
          <button
            type="button"
            class="ndi__step ndi__step--plus"
            :disabled="isPending || atRatingCeiling"
            :aria-label="t('planning.today.actions.increase')"
            @click="handleStep(1)"
          >
            <AppIcon name="add" />
          </button>
          <button
            type="button"
            class="ndi__step ndi__step--minus"
            :disabled="isPending || !hasPersistedTodayEntry"
            :aria-label="t('planning.today.actions.decrease')"
            @click="handleStep(-1)"
          >
            <AppIcon name="remove" />
          </button>

          <span
            class="ndi__well"
            :class="{ 'ndi__well--on': hasNumericEntry, 'ndi__well--meter': isRating }"
            :style="isRating ? { '--ndi-fill': ratingFill } : undefined"
          >
            <span class="ndi__reading" :class="readingSizeClass">
              <b>{{ stepperValue }}</b><i v-if="isRating">/{{ viz.ratingScale.value }}</i>
            </span>
          </span>
        </template>

        <!-- Value: the disc holds an edge-to-edge input. Its empty reading is a
             centered ghost, not a native placeholder — Chrome refuses to center
             the placeholder of a field this narrow. -->
        <span
          v-else-if="viz.entryMode.value === 'value'"
          class="ndi__well"
          :class="{ 'ndi__well--on': hasNumericEntry }"
        >
          <input
            ref="valueInputRef"
            class="ndi__input"
            :class="inputSizeClass"
            :value="valueDraft"
            type="text"
            inputmode="decimal"
            :disabled="isPending"
            :aria-label="t('planning.today.actions.input.value')"
            @click.stop
            @focus="onValueFocus"
            @input="valueDraft = ($event.target as HTMLInputElement).value"
            @blur="submitValueDraft($event)"
            @keydown.enter="submitValueDraft($event)"
            @keydown.escape.prevent="cancelValueEdit"
          />
          <span v-if="!valueDraft" class="ndi__ghost" aria-hidden="true">0</span>
        </span>
      </div>
    </div>

    <div v-if="expanded" class="ndi__actions" @click.stop>
      <button
        type="button"
        class="ndi__action"
        :title="t('planning.today.actions.openContext')"
        @click="$emit('open-context')"
      >
        <AppIcon name="event" />
      </button>
      <button
        type="button"
        class="ndi__action"
        :title="t('planning.objects.actions.open')"
        @click="$emit('open-object')"
      >
        <AppIcon name="open_in_new" />
      </button>
      <template v-if="item.isScheduledToday">
        <button
          type="button"
          class="ndi__action"
          :title="t('planning.today.actions.moveToDay')"
          @click="moveDateInputRef?.showPicker()"
        >
          <AppIcon name="event_repeat" />
        </button>
        <button
          type="button"
          class="ndi__action"
          :title="t('planning.today.actions.clearToday')"
          @click="$emit('clear-schedule')"
        >
          <AppIcon name="event_busy" />
        </button>
      </template>
      <button
        v-else-if="item.canHide"
        type="button"
        class="ndi__action"
        :title="t('planning.today.actions.hideForToday')"
        @click="$emit('hide')"
      >
        <AppIcon name="visibility_off" />
      </button>
      <button
        v-if="item.kind === 'measurement' && item.todayEntry"
        type="button"
        class="ndi__action"
        :title="t('planning.today.actions.clearEntry')"
        @click="$emit('clear-entry')"
      >
        <AppIcon name="ink_eraser" />
      </button>
      <button
        v-if="item.isScheduledToday"
        type="button"
        class="ndi__action ndi__action--danger"
        :title="t('common.buttons.delete')"
        @click="$emit('request-delete')"
      >
        <AppIcon name="delete" />
      </button>
    </div>

    <input ref="moveDateInputRef" class="ndi__picker" type="date" @change="handleMoveDateChange" />
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, toRef, watch } from 'vue'
import type { DayRef } from '@/domain/period'
import type { DailyMeasurementEntry, MeasurementDayAssignment } from '@/domain/planningState'
import type { TodayItem } from '@/services/todayViewQueries'
import { useT } from '@/composables/useT'
import { useTodayItemVisualization } from '@/composables/useTodayItemVisualization'
import AppIcon from '@/components/shared/AppIcon.vue'

const props = withDefaults(defineProps<{
  item: TodayItem
  todayDayRef: DayRef
  rawEntries: DailyMeasurementEntry[]
  allDayAssignments: MeasurementDayAssignment[]
  isPending?: boolean
}>(), { isPending: false })

const emit = defineEmits<{
  'open-object': []
  'open-context': []
  'toggle-completion': []
  'toggle-multi-item': [itemId: string]
  'save-entry': [value: number]
  'clear-entry': []
  hide: []
  move: [dayRef: DayRef]
  'clear-schedule': []
  'request-delete': []
}>()

const PANEL_TYPE_ICONS: Record<string, string> = {
  habit: 'loop',
  tracker: 'monitoring',
  keyResult: 'flag',
  weeklyIntention: 'target',
  initiative: 'rocket_launch',
}

const { t, locale } = useT()
const expanded = ref(false)
const valueDraft = ref('')
const valueInputRef = ref<HTMLInputElement | null>(null)
const moveDateInputRef = ref<HTMLInputElement | null>(null)
const justSubmittedValue = ref(false)

const viz = useTodayItemVisualization(
  toRef(props, 'item'),
  toRef(props, 'rawEntries'),
  toRef(props, 'allDayAssignments'),
  toRef(props, 'todayDayRef'),
  computed(() => locale.value),
)

const title = computed(() =>
  props.item.kind === 'initiative' ? props.item.initiative.title : props.item.subject.title,
)
const iconName = computed(() => {
  if (props.item.kind === 'initiative') return props.item.initiative.icon || PANEL_TYPE_ICONS.initiative
  if (props.item.panelType === 'keyResult' && props.item.goalIcon) return props.item.goalIcon
  const subject = props.item.subject as { icon?: string }
  return subject.icon || PANEL_TYPE_ICONS[props.item.panelType] || 'circle'
})
const isCompletionToggle = computed(() =>
  props.item.kind === 'initiative' || viz.entryMode.value === 'completion',
)
const completionDone = computed(() => props.item.kind === 'initiative'
  ? Boolean(props.item.planState.dayRef)
  : viz.completionSlots.value.some(slot => slot.state === 'today-done'))
const isRating = computed(() => viz.entryMode.value === 'rating')
const isStepperMode = computed(() => viz.entryMode.value === 'counter' || isRating.value)
const hasTodayEntry = computed(() => {
  if (props.item.kind === 'initiative') return Boolean(props.item.planState.dayRef)
  const entry = props.item.todayEntry
  if (!entry) return false
  if (props.item.subject.entryMode === 'completion') return true
  if (props.item.subject.entryMode === 'multi-completion') return (entry.checkedItemIds?.length ?? 0) > 0
  return typeof entry.value === 'number' && entry.value !== 0
})
const hasNumericEntry = computed(() => {
  if (props.item.kind !== 'measurement') return false
  const entry = props.item.todayEntry
  return typeof entry?.value === 'number' && entry.value !== 0
})
const hasPersistedTodayEntry = computed(
  () => props.item.kind === 'measurement' && Boolean(props.item.todayEntry),
)
const multiActiveItems = computed(() => props.item.kind === 'measurement'
  ? (props.item.subject.multiItems ?? []).filter(entry => !entry.archived)
  : [])
const multiCheckedIds = computed(() => new Set(
  props.item.kind === 'measurement' ? props.item.todayEntry?.checkedItemIds ?? [] : [],
))
const stepperValue = computed(() => hasNumericEntry.value ? String(viz.currentValue.value ?? 0) : '0')
// A 34px circle is a tight frame, so longer readings step down a size instead of
// being clipped.
function sizeSuffix(length: number): '' | '--sm' | '--xs' {
  if (length >= 5) return '--xs'
  if (length >= 3) return '--sm'
  return ''
}
const readingSizeClass = computed(() => {
  const suffix = sizeSuffix(stepperValue.value.length + (isRating.value ? 2 : 0))
  return suffix ? `ndi__reading${suffix}` : ''
})
const inputSizeClass = computed(() => {
  const suffix = sizeSuffix(valueDraft.value.length)
  return suffix ? `ndi__input${suffix}` : ''
})
// Share of the scale, not of the min..max span: on a 1–5 scale a recorded 1 must
// still read as filled, otherwise it looks identical to "no entry yet".
const ratingProgress = computed(() => {
  if (!isRating.value || !hasNumericEntry.value) return 0
  const max = viz.ratingScale.value
  if (max <= 0) return 0
  return Math.max(0, Math.min(1, (viz.currentValue.value ?? 0) / max))
})
const ratingFill = computed(() => `${Math.round(ratingProgress.value * 100)}%`)
const atRatingCeiling = computed(
  () => isRating.value && (viz.currentValue.value ?? 0) >= viz.ratingScale.value,
)

// The rest of the feature renders decimals with a comma (see NextObjectChartCard),
// so the editable well both accepts and shows the Polish separator.
function formatDraft(value: number | undefined): string {
  return value ? String(value).replace('.', ',') : ''
}

watch(() => viz.currentValue.value, (next) => {
  if (document.activeElement === valueInputRef.value) return
  valueDraft.value = formatDraft(next)
}, { immediate: true })

// Counter and rating share one stepper; the floor differs (0 vs the rating min)
// and stepping below it clears the entry instead of persisting the floor.
function handleStep(delta: number): void {
  if (props.item.kind !== 'measurement') return
  const current = props.item.todayEntry?.value ?? 0
  const min = isRating.value ? viz.ratingScaleMin.value : 0
  if (delta < 0 && props.item.todayEntry && current <= min) {
    emit('clear-entry')
    return
  }
  const raised = Math.max(min, current + delta)
  emit('save-entry', isRating.value ? Math.min(viz.ratingScale.value, raised) : raised)
}

function onValueFocus(): void {
  void nextTick(() => valueInputRef.value?.select())
}

function cancelValueEdit(): void {
  valueDraft.value = formatDraft(viz.currentValue.value)
  valueInputRef.value?.blur()
}

function submitValueDraft(event: Event): void {
  if (justSubmittedValue.value) {
    justSubmittedValue.value = false
    return
  }
  const input = event.target as HTMLInputElement
  const raw = input.value.trim()
  if (!raw) {
    if (props.item.kind === 'measurement' && props.item.todayEntry) emit('clear-entry')
    else valueDraft.value = formatDraft(viz.currentValue.value)
    if (event.type === 'keydown') {
      justSubmittedValue.value = true
      input.blur()
    }
    return
  }
  // The field is a text input (a number input refuses to center its placeholder),
  // so a Polish decimal comma has to be normalized here.
  const parsed = Number(raw.replace(',', '.'))
  if (!Number.isFinite(parsed)) return
  emit('save-entry', parsed)
  if (event.type === 'keydown') {
    justSubmittedValue.value = true
    input.blur()
  }
}

function handleMoveDateChange(event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.value && input.value !== props.todayDayRef) emit('move', input.value as DayRef)
}
</script>

<style scoped>
.ndi {
  position: relative;
  display: grid;
  gap: var(--mg-space-2);
  padding: var(--mg-space-1) var(--mg-space-2);
  border-radius: var(--mg-radius-sm);
  cursor: pointer;
  transition: background var(--mg-duration-fast) var(--mg-ease-standard);
}

.ndi:hover,
.ndi--open {
  background: var(--mg-color-mist);
}

.ndi__main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--mg-space-2);
  min-width: 0;
}

.ndi__lead {
  display: grid;
  place-items: center;
  width: 1.85rem;
  height: 1.85rem;
  border-radius: var(--mg-radius-icon-field-a);
  color: var(--mg-color-primary-strong);
  background: var(--mg-color-sky-well);
}

.ndi__lead--active {
  background: var(--mg-color-sky-field);
}

.ndi__lead .material-symbols-outlined {
  font-size: var(--mg-font-size-md);
}

.ndi__label {
  display: grid;
  justify-items: start;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.ndi__label strong {
  max-width: 100%;
  overflow: hidden;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ndi__label:hover strong {
  color: var(--mg-color-primary-strong);
}

.ndi__entry {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--mg-space-1);
}

/* THE well: one circle for every entry mode — the same organic disc the
   completion charts draw, so a done task reads identically in both places. */
.ndi__well {
  position: relative;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 2.1rem;
  height: 2.1rem;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-organic-a);
  color: var(--mg-color-muted);
  background: var(--mg-color-canvas);
  box-shadow: var(--mg-shadow-inset-sm);
  font-size: var(--mg-font-size-sm);
  font-weight: 800;
}

.ndi__well--button {
  cursor: pointer;
}

/* "Has a reading today" is a soft tint; "done" is the chart's filled dot. A
   recorded number must not look like a finished task. */
.ndi__well--on {
  color: var(--mg-color-primary-strong);
  background: var(--mg-color-sky-field);
}

.ndi__well--done {
  border-color: transparent;
  background: var(--mg-color-sky-field);
  box-shadow: var(--mg-shadow-inset-sm);
}

.ndi__well--done::after {
  width: 62%;
  aspect-ratio: 1;
  border-radius: var(--mg-radius-organic-c);
  background: var(--mg-color-state);
  content: '';
  transform: rotate(-2deg);
}

/* Rating: the disc fills to the recorded share of the scale. */
.ndi__well--meter {
  background: linear-gradient(
    to right,
    var(--mg-color-sky-field) var(--ndi-fill, 0%),
    var(--mg-color-canvas) var(--ndi-fill, 0%)
  );
}

/* Multi-completion: one disc per item, echoing a row of chart dots. */
.ndi__dots {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--mg-space-1);
}

.ndi__well--dot {
  width: 1.6rem;
  height: 1.6rem;
}

.ndi__dots > .ndi__well:nth-child(even) {
  border-radius: var(--mg-radius-organic-b);
}

.ndi__reading {
  display: flex;
  align-items: baseline;
  gap: 1px;
  color: inherit;
}

.ndi__reading--sm,
.ndi__reading--xs,
.ndi__input--sm,
.ndi__input--xs {
  font-size: var(--mg-font-size-xs);
}

.ndi__reading--xs,
.ndi__input--xs {
  letter-spacing: -0.04em;
}

.ndi__reading i {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-style: normal;
  font-weight: 700;
}

/* ± sit beside the disc — a circle has no room inside — and only surface on
   hover or keyboard focus. Absolute, so the disc never moves. */
.ndi__step {
  position: absolute;
  right: calc(100% + var(--mg-space-1));
  display: grid;
  place-items: center;
  width: 1.25rem;
  height: 1.05rem;
  padding: 0;
  border: 0;
  border-radius: var(--mg-radius-organic-b);
  color: var(--mg-color-primary-strong);
  background: transparent;
  opacity: 0;
  cursor: pointer;
}

.ndi__step--plus {
  top: 0;
}

.ndi__step--minus {
  bottom: 0;
}

.ndi__step .material-symbols-outlined {
  font-size: var(--mg-font-size-sm);
}

.ndi:hover .ndi__step,
.ndi__step:focus-visible {
  opacity: 1;
}

.ndi:hover .ndi__step:disabled,
.ndi__step:disabled:focus-visible {
  opacity: 0.36;
  cursor: not-allowed;
}

.ndi:hover .ndi__step:not(:disabled):hover {
  background: var(--mg-color-sky-well);
}

.ndi__input {
  position: absolute;
  inset: 0;
  width: 100%;
  padding: 0 2px;
  border: 0;
  color: inherit;
  background: transparent;
  font-size: inherit;
  font-weight: inherit;
  text-align: center;
}

.ndi__input:disabled {
  opacity: 0.46;
  cursor: not-allowed;
}

.ndi__ghost {
  pointer-events: none;
}

.ndi__well:focus-within .ndi__ghost {
  opacity: 0;
}

.ndi__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--mg-space-1);
}

.ndi__action {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid transparent;
  border-radius: var(--mg-radius-organic-a);
  color: var(--mg-color-muted);
  background: transparent;
  cursor: pointer;
}

.ndi__action .material-symbols-outlined {
  font-size: var(--mg-font-size-sm);
}

.ndi__action:hover {
  color: var(--mg-color-primary-strong);
  background: var(--mg-color-surface);
  box-shadow: var(--mg-shadow-raised-sm);
}

.ndi__action--danger,
.ndi__action--danger:hover {
  color: var(--mg-color-rose);
}

.ndi__well:disabled,
.ndi__segment:disabled {
  opacity: 0.46;
  cursor: not-allowed;
}

.ndi__picker {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}
</style>
