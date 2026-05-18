<template>
  <article
    class="today-item-card group relative cursor-pointer rounded-xl transition-colors duration-150 hover:bg-white/20"
    @click="handleCardClick"
  >
    <!-- Title row: always visible -->
    <div class="today-item-row">
      <EntityIcon
        :icon="iconName"
        size="sm"
        :circle="false"
        class="today-item-lead-icon"
        :class="hasTodayEntry ? 'today-item-lead-icon--active' : ''"
      />
      <button
        type="button"
        class="today-item-title"
        @click.stop="$emit('open-object')"
      >
        {{ title }}
      </button>

      <!-- Inline today control -->
      <div class="today-item-entry" @click.stop>
        <!-- Initiative: dedicated checkmark -->
        <InitiativeCheckmark
          v-if="viz.vizType.value === 'initiative-check'"
          size="sm"
          :is-complete="item.kind === 'initiative' && !!item.planState.dayRef"
          :day-label="item.kind === 'initiative' && item.planState.dayRef ? todayLabel : undefined"
          :is-pending="isPending"
          @toggle="$emit('toggle-completion')"
        />

        <!-- Completion: 44px circle toggle -->
        <button
          v-else-if="viz.entryMode.value === 'completion'"
          type="button"
          class="today-entry-circle today-entry-circle--btn neo-focus"
          :class="completionTodayDone ? 'today-entry-circle--on' : ''"
          :disabled="isPending"
          :aria-label="completionTodayDone ? t('planning.today.actions.undoEntry') : t('planning.today.actions.recordEntry')"
          @click="$emit('toggle-completion')"
        >
          <AppIcon name="check" class="text-[18px]" />
        </button>

        <!-- Counter: number circle + hover ± pill -->
        <div
          v-else-if="viz.entryMode.value === 'counter'"
          class="today-entry-with-step"
        >
          <div class="today-step-pill">
            <button
              type="button"
              class="today-step-pill__btn neo-focus"
              :disabled="isPending"
              aria-label="Increment"
              @click="handleStep(1)"
            >
              <AppIcon name="add" class="text-[14px]" />
            </button>
            <button
              type="button"
              class="today-step-pill__btn neo-focus"
              :disabled="isPending || !hasPersistedTodayEntry"
              aria-label="Decrement"
              @click="handleStep(-1)"
            >
              <AppIcon name="remove" class="text-[14px]" />
            </button>
          </div>
          <span
            class="today-entry-circle"
            :class="hasNumericEntry ? 'today-entry-circle--on' : ''"
          >
            <span :class="counterDisplaySizeClass">
              {{ hasNumericEntry ? viz.currentValue.value : '0' }}
            </span>
          </span>
        </div>

        <!-- Rating: ring-bordered number circle + hover ± pill -->
        <div
          v-else-if="viz.entryMode.value === 'rating'"
          class="today-entry-with-step"
        >
          <div class="today-step-pill">
            <button
              type="button"
              class="today-step-pill__btn neo-focus"
              :disabled="isPending || (viz.currentValue.value ?? 0) >= viz.ratingScale.value"
              aria-label="Increment"
              @click="handleRatingStep(1)"
            >
              <AppIcon name="add" class="text-[14px]" />
            </button>
            <button
              type="button"
              class="today-step-pill__btn neo-focus"
              :disabled="isPending || !hasPersistedTodayEntry"
              aria-label="Decrement"
              @click="handleRatingStep(-1)"
            >
              <AppIcon name="remove" class="text-[14px]" />
            </button>
          </div>
          <span class="today-entry-circle today-entry-circle--rating">
            <svg class="today-entry-circle__ring" viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="20.5" fill="none" stroke="rgb(var(--neo-border) / 0.45)" stroke-width="2" />
              <circle
                v-if="ratingRingProgress > 0"
                cx="22"
                cy="22"
                r="20.5"
                fill="none"
                stroke="rgb(var(--color-primary-strong))"
                stroke-width="2"
                stroke-linecap="round"
                :stroke-dasharray="RATING_RING_CIRC"
                :stroke-dashoffset="RATING_RING_CIRC * (1 - ratingRingProgress)"
                transform="rotate(-90 22 22)"
              />
            </svg>
            <span class="today-entry-rating-text">
              <span class="today-entry-rating-value">
                {{ hasNumericEntry ? viz.currentValue.value : 0 }}
              </span>
              <span class="today-entry-rating-max">/{{ viz.ratingScale.value }}</span>
            </span>
          </span>
        </div>

        <!-- Value: editable number input -->
        <div v-else-if="viz.entryMode.value === 'value'" class="today-entry-with-step">
          <input
            ref="valueInputRef"
            :value="valueDraft"
            type="number"
            step="0.1"
            inputmode="decimal"
            placeholder="0"
            class="today-entry-circle today-entry-circle--input neo-focus"
            :class="[hasNumericEntry ? 'today-entry-circle--on' : '', valueInputSizeClass]"
            :disabled="isPending"
            @click.stop
            @focus="onValueFocus"
            @input="valueDraft = ($event.target as HTMLInputElement).value"
            @blur="submitValueDraft($event)"
            @keydown.enter="submitValueDraft($event)"
            @keydown.escape.prevent="cancelValueEdit"
          />
        </div>
      </div>
    </div>

    <!-- Expanded section: compact action buttons row -->
    <transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[80px]"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 max-h-[80px]"
      leave-to-class="opacity-0 max-h-0"
    >
      <div v-if="expanded" class="today-item-actions" @click.stop>
        <button
          type="button"
          class="today-action-btn neo-focus"
          :title="t('planning.today.actions.openContext')"
          @click="handleAction('open-context')"
        >
          <AppIcon name="event" class="text-[14px]" />
        </button>
        <button
          type="button"
          class="today-action-btn neo-focus"
          :title="t('planning.objects.actions.open')"
          @click="handleAction('open-object')"
        >
          <AppIcon name="open_in_new" class="text-[14px]" />
        </button>
        <template v-if="item.isScheduledToday">
          <button
            type="button"
            class="today-action-btn neo-focus"
            :title="t('planning.today.actions.moveToDay')"
            @click="handleMoveToDay"
          >
            <AppIcon name="event_repeat" class="text-[14px]" />
          </button>
          <button
            type="button"
            class="today-action-btn neo-focus"
            :title="t('planning.today.actions.clearToday')"
            @click="handleAction('clear-schedule')"
          >
            <AppIcon name="event_busy" class="text-[14px]" />
          </button>
        </template>
        <button
          v-else-if="item.canHide"
          type="button"
          class="today-action-btn neo-focus"
          :title="t('planning.today.actions.hideForToday')"
          @click="handleAction('hide')"
        >
          <AppIcon name="visibility_off" class="text-[14px]" />
        </button>
        <button
          v-if="item.kind === 'measurement' && item.todayEntry"
          type="button"
          class="today-action-btn neo-focus"
          :title="t('planning.today.actions.clearEntry')"
          @click="handleAction('clear-entry')"
        >
          <AppIcon name="ink_eraser" class="text-[14px]" />
        </button>
        <button
          v-if="item.isScheduledToday"
          type="button"
          class="today-action-btn today-action-btn--danger neo-focus"
          :title="t('common.buttons.delete')"
          @click="handleAction('request-delete')"
        >
          <AppIcon name="delete" class="text-[14px]" />
        </button>
      </div>
    </transition>

    <!-- Move to day picker (shown when triggered from action button) -->
    <input
      ref="moveDateInputRef"
      type="date"
      class="sr-only"
      @change="handleMoveDateChange"
    />
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, toRef, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import InitiativeCheckmark from '@/components/today/visualizations/InitiativeCheckmark.vue'
import type { DayRef } from '@/domain/period'
import type { DailyMeasurementEntry, MeasurementDayAssignment } from '@/domain/planningState'
import { useT } from '@/composables/useT'
import { useTodayItemVisualization } from '@/composables/useTodayItemVisualization'
import type { TodayItem } from '@/services/todayViewQueries'
import { periodLabel } from '@/components/objects/sparklines/sparklineUtils'

interface Props {
  item: TodayItem
  todayDayRef: DayRef
  rawEntries: DailyMeasurementEntry[]
  allDayAssignments: MeasurementDayAssignment[]
  isPending?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPending: false,
})

const emit = defineEmits<{
  'open-object': []
  'open-context': []
  'toggle-completion': []
  'save-entry': [value: number]
  'clear-entry': []
  hide: []
  move: [dayRef: DayRef]
  'clear-schedule': []
  'request-delete': []
}>()

const { t, locale } = useT()

const expanded = ref(false)
const moveDateInputRef = ref<HTMLInputElement | null>(null)
const valueDraft = ref('')
const valueInputRef = ref<HTMLInputElement | null>(null)
const justSubmittedValue = ref(false)

const viz = useTodayItemVisualization(
  toRef(props, 'item'),
  toRef(props, 'rawEntries'),
  toRef(props, 'allDayAssignments'),
  toRef(props, 'todayDayRef'),
  computed(() => locale.value),
)

const title = computed(() =>
  props.item.kind === 'initiative' ? props.item.initiative.title : props.item.subject.title
)

const PANEL_TYPE_ICONS: Record<string, string> = {
  habit: 'loop',
  tracker: 'monitoring',
  keyResult: 'flag',
  initiative: 'rocket_launch',
}

const iconName = computed(() => {
  if (props.item.kind === 'initiative') {
    return props.item.initiative.icon || PANEL_TYPE_ICONS.initiative
  }
  if (props.item.panelType === 'keyResult' && props.item.goalIcon) {
    return props.item.goalIcon
  }
  const subject = props.item.subject as { icon?: string }
  if (subject.icon) return subject.icon
  return PANEL_TYPE_ICONS[props.item.panelType] ?? 'circle'
})

const hasTodayEntry = computed(() => {
  if (props.item.kind === 'initiative') {
    return !!props.item.planState.dayRef
  }
  const entry = props.item.todayEntry
  if (!entry) return false
  if (props.item.subject.entryMode === 'completion') return true
  return typeof entry.value === 'number' && entry.value !== 0
})

const todayLabel = computed(() => periodLabel(props.todayDayRef, 'daily', locale.value))

const completionTodayDone = computed(() =>
  viz.completionSlots.value.some(s => s.state === 'today-done'),
)

const hasNumericEntry = computed(() => {
  if (props.item.kind !== 'measurement') return false
  const entry = props.item.todayEntry
  return typeof entry?.value === 'number' && entry.value !== 0
})

const hasPersistedTodayEntry = computed(
  () => props.item.kind === 'measurement' && Boolean(props.item.todayEntry),
)

// Choose a smaller text size when the counter value is 4+ characters long so it
// stays inside the 44px circle.
const counterDisplaySizeClass = computed(() => {
  const value = hasNumericEntry.value ? String(viz.currentValue.value ?? 0) : '0'
  if (value.length >= 4) return 'today-entry-value today-entry-value--xs'
  if (value.length === 3) return 'today-entry-value today-entry-value--sm'
  return 'today-entry-value'
})

const valueInputSizeClass = computed(() => {
  const draft = valueDraft.value || (hasNumericEntry.value ? String(viz.currentValue.value ?? 0) : '0')
  if (draft.length >= 4) return 'today-entry-circle--input-xs'
  if (draft.length === 3) return 'today-entry-circle--input-sm'
  return ''
})

const RATING_RING_RADIUS = 20.5
const RATING_RING_CIRC = 2 * Math.PI * RATING_RING_RADIUS
const ratingRingProgress = computed(() => {
  if (!hasNumericEntry.value) return 0
  const value = viz.currentValue.value ?? 0
  const min = viz.ratingScaleMin.value
  const max = viz.ratingScale.value
  if (max <= min) return 0
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
})

function handleStep(delta: number): void {
  if (props.item.kind !== 'measurement' || props.item.subject.entryMode !== 'counter') return
  const currentValue = props.item.todayEntry?.value ?? 0
  if (delta < 0 && props.item.todayEntry && currentValue <= 0) {
    emit('clear-entry')
    return
  }
  const nextValue = Math.max(0, currentValue + delta)
  emit('save-entry', nextValue)
}

function handleRatingStep(delta: number): void {
  if (props.item.kind !== 'measurement' || props.item.subject.entryMode !== 'rating') return
  const currentValue = props.item.todayEntry?.value ?? 0
  const min = viz.ratingScaleMin.value
  const max = viz.ratingScale.value
  if (delta < 0 && props.item.todayEntry && currentValue <= min) {
    emit('clear-entry')
    return
  }
  const nextValue = Math.min(max, Math.max(min, currentValue + delta))
  emit('save-entry', nextValue)
}

watch(
  () => viz.currentValue.value,
  (next) => {
    if (document.activeElement === valueInputRef.value) return
    valueDraft.value = next ? String(next) : ''
  },
  { immediate: true },
)

function onValueFocus(): void {
  void nextTick(() => valueInputRef.value?.select())
}

function cancelValueEdit(): void {
  valueDraft.value = viz.currentValue.value ? String(viz.currentValue.value) : ''
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
    if (props.item.kind === 'measurement' && props.item.todayEntry) {
      emit('clear-entry')
    } else {
      valueDraft.value = viz.currentValue.value ? String(viz.currentValue.value) : ''
    }
    if (event.type === 'keydown') {
      justSubmittedValue.value = true
      input.blur()
    }
    return
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return

  emit('save-entry', parsed)

  if (event.type === 'keydown') {
    justSubmittedValue.value = true
    input.blur()
  }
}

function handleCardClick(): void {
  expanded.value = !expanded.value
}

function handleAction(action: string): void {
  switch (action) {
    case 'open-object': emit('open-object'); break
    case 'open-context': emit('open-context'); break
    case 'clear-schedule': emit('clear-schedule'); break
    case 'request-delete': emit('request-delete'); break
    case 'hide': emit('hide'); break
    case 'clear-entry': emit('clear-entry'); break
  }
}

function handleMoveToDay(): void {
  moveDateInputRef.value?.showPicker()
}

function handleMoveDateChange(event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.value && input.value !== props.todayDayRef) {
    emit('move', input.value as DayRef)
  }
}
</script>

<style scoped>
.today-item-card {
  border-radius: 0.75rem;
  padding: 0;
}

/* Compact day-row: 15% smaller right-side controls (44px → 37px) let the row
   drop ~7px without crowding the title. */
.today-item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 48px;
  padding: 0 2px;
}

/* Lead icon for goal/habit/tracker rows. Larger so it reads at-a-glance like
   the design — no background chip; the icon sits directly on the section. */
.today-item-lead-icon {
  flex: 0 0 22px;
  font-size: 20px;
  color: rgb(var(--color-primary-strong) / 0.78);
  transition: color 200ms ease;
}

.today-item-lead-icon--active {
  color: rgb(var(--color-primary-strong));
}

.today-item-title {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 500;
  color: rgb(var(--neo-text));
  text-align: left;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 200ms ease;
}

.today-item-title:hover {
  color: rgb(var(--color-primary-strong));
}

.today-item-entry {
  flex: 0 0 37px;
  height: 37px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  position: relative;
}

/* Unified 37px circle entry cell — 15% smaller than the original 44px so
   the row reads tighter without shrinking the title font. Every entryMode
   (completion / counter / rating / value) lives inside this same shape. */
.today-entry-circle {
  width: 37px;
  height: 37px;
  flex: 0 0 37px;
  border-radius: 9999px;
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -2px -2px 5px rgb(var(--neo-inset-light) / 0.85),
    inset 2px 2px 5px rgb(var(--neo-inset-dark) / 0.33);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--neo-muted));
  user-select: none;
  position: relative;
}

.today-entry-circle--btn {
  border: 0;
  cursor: pointer;
  transition: transform 200ms ease, box-shadow 200ms ease, color 200ms ease;
}

.today-entry-circle--btn:hover:not(:disabled) {
  color: rgb(var(--neo-text));
}

.today-entry-circle--btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.today-entry-circle--on {
  background: linear-gradient(
    145deg,
    rgb(var(--color-primary) / 0.96),
    rgb(var(--color-primary-strong) / 0.96)
  );
  box-shadow:
    -2px -2px 5px rgb(255 255 255 / 0.6),
    2.5px 2.5px 6px rgb(var(--color-primary-strong) / 0.42);
  color: #fff;
}

.today-entry-value {
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.today-entry-value--sm {
  font-size: 13px;
}

.today-entry-value--xs {
  font-size: 11px;
}

/* Editable value input — same shape as the circle */
.today-entry-circle--input {
  border: 0;
  padding: 0;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  outline: none;
  cursor: text;
  -moz-appearance: textfield;
  appearance: textfield;
  color: rgb(var(--neo-muted));
}

.today-entry-circle--input.today-entry-circle--on {
  color: #fff;
}

.today-entry-circle--input::-webkit-outer-spin-button,
.today-entry-circle--input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.today-entry-circle--input::placeholder {
  color: rgb(var(--neo-muted) / 0.7);
  font-weight: 600;
}

.today-entry-circle--input.today-entry-circle--on::placeholder {
  color: rgb(255 255 255 / 0.6);
}

.today-entry-circle--input-sm {
  font-size: 13px;
}

.today-entry-circle--input-xs {
  font-size: 11px;
}

/* Rating circle: ring around the edge shows progress */
.today-entry-circle--rating {
  background: rgb(var(--neo-surface-base));
}

.today-entry-circle__ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  border-radius: 9999px;
}

.today-entry-rating-text {
  display: flex;
  align-items: baseline;
  gap: 1px;
  line-height: 1;
  z-index: 1;
}

.today-entry-rating-value {
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
  color: rgb(var(--color-primary-strong));
}

.today-entry-rating-max {
  font-size: 9.5px;
  font-weight: 500;
  line-height: 1;
  color: rgb(var(--neo-muted));
}

/* Counter / rating: ± pill appears on hover to the left of the circle */
.today-entry-with-step {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.today-step-pill {
  position: absolute;
  right: calc(100% + 6px);
  top: 50%;
  transform: translate(8px, -50%);
  width: 20px;
  height: 36px;
  border-radius: 12px;
  background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom)));
  box-shadow:
    -2px -2px 5px rgb(var(--neo-shadow-light) / 0.85),
    2px 2px 5px rgb(var(--neo-shadow-dark) / 0.30);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: 0;
  transition: opacity 140ms ease, transform 140ms ease;
  pointer-events: none;
  z-index: 2;
}

.today-step-pill__btn {
  flex: 1;
  border: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--neo-text));
  cursor: pointer;
  padding: 0;
  transition: color 150ms ease, background-color 150ms ease;
}

.today-step-pill__btn:hover:not(:disabled) {
  color: rgb(var(--color-primary-strong));
  background: rgb(var(--neo-surface-base) / 0.5);
}

.today-step-pill__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.today-step-pill > button + button {
  border-top: 1px solid rgb(var(--neo-border) / 0.5);
}

.today-item-card:hover .today-step-pill,
.today-entry-with-step:focus-within .today-step-pill {
  opacity: 1;
  transform: translate(0, -50%);
  pointer-events: auto;
}

/* Expanded action buttons row */
.today-item-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding: 0 2px 6px;
  flex-wrap: wrap;
  overflow: hidden;
}

.today-action-btn {
  width: 30px;
  height: 30px;
  border-radius: 9999px;
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--neo-muted));
  background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom)));
  box-shadow:
    -2px -2px 5px rgb(var(--neo-shadow-light) / 0.85),
    2px 2px 5px rgb(var(--neo-shadow-dark) / 0.28);
  cursor: pointer;
  transition: transform 180ms ease, box-shadow 180ms ease, color 180ms ease;
}

.today-action-btn:hover {
  transform: translateY(-1px);
  color: rgb(var(--color-primary-strong));
  box-shadow:
    -3px -3px 6px rgb(var(--neo-shadow-light) / 0.9),
    3px 3px 6px rgb(var(--neo-shadow-dark) / 0.32);
}

.today-action-btn:active {
  transform: translateY(0);
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -2px -2px 4px rgb(var(--neo-inset-light) / 0.7),
    inset 2px 2px 4px rgb(var(--neo-inset-dark) / 0.3);
}

.today-action-btn--danger:hover {
  color: rgb(var(--color-error));
}
</style>
