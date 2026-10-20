<template>
  <article
    ref="rootRef"
    class="ndi"
    :class="{
      'ndi--staged': staged,
      'ndi--history': staged && Boolean(history),
      'ndi--settling': settling,
      'ndi--lit': lit,
      'ndi--dim': dim,
    }"
    @click="emit('select')"
  >
    <!-- Row = one object for this day. Clicking the row (or its title) brings it onto
         the stage in one motion: the tray icons fly left and grow their labels under
         the title, the entry disc drops onto the axis of the last seven days, and the
         six history dots fan out of it. Nothing is ever drawn twice: the disc is the
         same element in both states (grid area changes, FLIP animates the move). -->
    <div class="ndi__main">
      <span
        v-if="dragEnabled"
        class="ndi__drag"
        draggable="true"
        :title="t('planning.today.calendarPlan.drag')"
        @dragstart="emit('drag-plan-start', $event)"
        @dragend="emit('drag-plan-end')"
        ><AppIcon name="drag_indicator"
      /></span>
      <span class="ndi__lead" :class="{ 'ndi__lead--active': hasTodayEntry }" aria-hidden="true">
        <AppIcon :name="iconName" />
      </span>

      <div class="ndi__title">
        <button
          type="button"
          class="ndi__label"
          :title="title"
          :aria-pressed="staged"
          :aria-label="`${t('planning.today.actions.stageRow')}: ${title}`"
          @click.stop="emit('select')"
          @keydown.right.prevent="focusTray(0)"
        >
          <strong>{{ title }}</strong>
        </button>

        <!-- Icon tray: an overlay on the title's right edge, quiet until hover or
             keyboard focus, so titles keep their full width. The staged row carries the
             same actions as labelled buttons inside its expansion instead. -->
        <span
          v-if="!staged"
          ref="trayRef"
          class="ndi__tray"
          role="group"
          :aria-label="t('planning.today.stage.actionsLabel', { title })"
          @click.stop
          @keydown.left.prevent="moveTrayFocus(-1)"
          @keydown.right.prevent="moveTrayFocus(1)"
          @keydown.esc.stop.prevent="leaveTray"
        >
          <template v-if="canReschedule">
            <button
              v-if="canTomorrow"
              type="button"
              tabindex="-1"
              class="ndi__action"
              data-flip="tomorrow"
              :title="t('planning.today.actions.moveToTomorrow')"
              :aria-label="`${t('planning.today.actions.moveToTomorrow')}: ${title}`"
              @click="emit('move-tomorrow')"
            >
              <AppIcon name="east" />
            </button>
            <button
              type="button"
              tabindex="-1"
              class="ndi__action"
              data-flip="day"
              :title="t('planning.today.actions.moveToDay')"
              :aria-label="`${t('planning.today.actions.moveToDay')}: ${title}`"
              @click="emit('pick-day')"
            >
              <AppIcon name="calendar_month" />
            </button>
          </template>
          <button
            v-if="item.isScheduledToday"
            type="button"
            tabindex="-1"
            class="ndi__action"
            data-flip="clear-today"
            :title="t('planning.today.actions.clearToday')"
            :aria-label="`${t('planning.today.actions.clearToday')}: ${title}`"
            @click="emit('clear-schedule')"
          >
            <AppIcon name="event_busy" />
          </button>
          <button
            v-else-if="item.canHide"
            type="button"
            tabindex="-1"
            class="ndi__action"
            data-flip="hide"
            :title="t('planning.today.actions.hideForToday')"
            :aria-label="`${t('planning.today.actions.hideForToday')}: ${title}`"
            @click="emit('hide')"
          >
            <AppIcon name="visibility_off" />
          </button>
          <button
            v-if="item.kind === 'measurement' && item.todayEntry"
            type="button"
            tabindex="-1"
            class="ndi__action"
            :title="t('planning.today.actions.clearEntry')"
            :aria-label="`${t('planning.today.actions.clearEntry')}: ${title}`"
            @click="emit('clear-entry')"
          >
            <AppIcon name="ink_eraser" />
          </button>
          <button
            v-if="canOpenObject"
            type="button"
            tabindex="-1"
            class="ndi__action"
            data-flip="open"
            :title="t('planning.objects.actions.open')"
            :aria-label="`${t('planning.objects.actions.open')}: ${title}`"
            @click="emit('open-object')"
          >
            <AppIcon name="open_in_new" />
          </button>
          <button
            v-else
            type="button"
            tabindex="-1"
            class="ndi__action"
            data-flip="context"
            :title="t('planning.today.actions.openContext')"
            :aria-label="`${t('planning.today.actions.openContext')}: ${title}`"
            @click="emit('open-context')"
          >
            <AppIcon name="event" />
          </button>
          <button
            v-if="item.isScheduledToday"
            type="button"
            tabindex="-1"
            class="ndi__action ndi__action--danger"
            :title="t('common.buttons.delete')"
            :aria-label="`${t('common.buttons.delete')}: ${title}`"
            @click="emit('request-delete')"
          >
            <AppIcon name="delete" />
          </button>
        </span>
      </div>
    </div>

    <!-- Staged: the tray's actions as labelled buttons under the title. Same data-flip
         keys as the tray icons, so each icon has a destination to fly to. -->
    <div
      v-if="staged"
      class="ndi__actions"
      role="group"
      :aria-label="t('planning.today.stage.actionsLabel', { title })"
      @click.stop
    >
      <template v-if="canReschedule">
        <button
          v-if="canTomorrow"
          type="button"
          data-flip="tomorrow"
          @click="emit('move-tomorrow')"
        >
          <AppIcon name="east" /><span>{{ t('planning.today.stage.tomorrow') }}</span>
        </button>
        <button
          type="button"
          data-flip="day"
          :class="{ 'is-active': targeting }"
          :aria-pressed="targeting"
          @click="emit('pick-day')"
        >
          <AppIcon name="calendar_month" /><span>{{ t('planning.today.stage.day') }}</span>
        </button>
      </template>
      <button
        v-if="item.isScheduledToday"
        type="button"
        data-flip="clear-today"
        @click="emit('clear-schedule')"
      >
        <AppIcon name="event_busy" /><span>{{ t('planning.today.stage.clearToday') }}</span>
      </button>
      <button v-else-if="item.canHide" type="button" data-flip="hide" @click="emit('hide')">
        <AppIcon name="visibility_off" /><span>{{ t('planning.today.stage.hide') }}</span>
      </button>
      <button v-if="canOpenObject" type="button" data-flip="open" @click="emit('open-object')">
        <AppIcon name="open_in_new" /><span>{{ t('planning.today.stage.open') }}</span>
      </button>
      <button v-else type="button" data-flip="context" @click="emit('open-context')">
        <AppIcon name="event" /><span>{{ t('planning.today.stage.context') }}</span>
      </button>
    </div>

    <!-- Six past days, ending in the live disc: done = filled blob, missed = rose,
         numeric readings fill from the bottom. Weekday initials only; the full date
         sits in the tooltip. -->
    <Transition name="ndi-strip">
      <div
        v-if="staged && history"
        class="ndi__strip"
        role="img"
        :aria-label="`${t('planning.today.recentHistory')}: ${title}`"
        @click.stop
      >
        <span
          v-for="(day, index) in historyDays"
          :key="day.key"
          class="ndi__day"
          :style="{ '--idx': index }"
          :title="day.title"
        >
          <i
            class="mg-well ndi__dot"
            :class="[
              `is-${day.state}`,
              {
                'mg-well--done': day.state === 'done',
                'is-short': day.short,
                'ndi__dot--b': index % 2 === 1,
              },
            ]"
            :style="day.fill !== undefined ? { '--fill': `${day.fill}%` } : undefined"
            ><b v-if="day.reading">{{ day.reading }}</b></i
          >
          <small aria-hidden="true">{{ day.initial }}</small>
        </span>
      </div>
    </Transition>

    <!-- One disc for every entry mode: only what sits inside changes, so the
           right edge of the rail stays a single straight column. Staged with history
           it becomes the seventh, live point of the strip. -->
    <div class="ndi__entry" data-flip="disc" @click.stop>
      <!-- Completion (and the dormant initiative kind): done fills the disc -->
      <button
        v-if="isCompletionToggle"
        type="button"
        class="mg-well ndi__well ndi__well--button"
        :class="{ 'mg-well--done': completionDone }"
        :disabled="isPending"
        :aria-pressed="completionDone"
        :aria-label="
          completionDone
            ? t('planning.today.actions.undoEntry')
            : t('planning.today.actions.recordEntry')
        "
        @click="$emit('toggle-completion')"
      ></button>

      <!-- Multi-completion: at rest one disc carries the fraction (checked/all).
             Hover or keyboard focus splits it into one dot per item, fanning out to
             the left so the rail's right edge never moves. Each dot shows the item's
             icon (or its initial) and names itself in a delayed tooltip. -->
      <span
        v-else-if="viz.entryMode.value === 'multi-completion'"
        ref="multiRef"
        class="ndi__multi"
        :class="{ 'ndi__multi--open': multiOpen }"
        @mouseenter="openMulti()"
        @mouseleave="closeMulti()"
        @focusout="onMultiFocusOut"
        @keydown.esc.stop.prevent="collapseMulti"
      >
        <button
          v-if="!multiOpen"
          type="button"
          class="mg-well ndi__well ndi__well--button ndi__well--fraction"
          :class="{ 'ndi__well--on': multiCheckedCount > 0, 'ndi__well--met': multiMet }"
          :disabled="isPending"
          aria-expanded="false"
          :aria-label="`${t('planning.today.actions.showChecklist')}: ${multiFraction}`"
          @click="openMulti(true)"
        >
          <span class="ndi__reading" :class="fractionSizeClass">
            <b>{{ multiCheckedCount }}</b
            ><i>/{{ multiActiveItems.length }}</i>
          </span>
        </button>
        <template v-else>
          <button
            v-for="(multiItem, index) in multiActiveItems"
            :key="multiItem.id"
            type="button"
            class="mg-well ndi__well ndi__well--dot ndi__well--button"
            :class="{ 'ndi__well--done': multiCheckedIds.has(multiItem.id) }"
            :style="{ '--ndi-i': multiActiveItems.length - 1 - index }"
            :disabled="isPending"
            :aria-label="multiItem.label"
            :aria-pressed="multiCheckedIds.has(multiItem.id)"
            @mouseenter="scheduleTip(multiItem.label, $event)"
            @mouseleave="clearTip"
            @focus="scheduleTip(multiItem.label, $event)"
            @blur="clearTip"
            @click="$emit('toggle-multi-item', multiItem.id)"
          >
            <AppIcon v-if="multiItem.icon" :name="multiItem.icon" />
            <span v-else class="ndi__initial" aria-hidden="true">{{
              initialOf(multiItem.label)
            }}</span>
          </button>
        </template>
        <!-- Teleported past the rail's scroll clipping, but only as far as the
               design root: the product tokens are scoped to it, not to :root. -->
        <Teleport v-if="tip && tipHost" :to="tipHost">
          <span class="ndi-tip" role="tooltip" :style="tip.style">{{ tip.label }}</span>
        </Teleport>
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
          class="mg-well ndi__well"
          :class="{ 'ndi__well--on': hasNumericEntry, 'ndi__well--meter': isRating }"
          :style="isRating ? { '--ndi-fill': ratingFill } : undefined"
        >
          <span class="ndi__reading" :class="readingSizeClass">
            <b>{{ stepperValue }}</b
            ><i v-if="isRating">/{{ viz.ratingScale.value }}</i>
          </span>
        </span>
      </template>

      <!-- Value: the disc holds an edge-to-edge input. Its empty reading is a
             centered ghost, not a native placeholder — Chrome refuses to center
             the placeholder of a field this narrow. -->
      <span
        v-else-if="viz.entryMode.value === 'value'"
        class="mg-well ndi__well"
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
      <small v-if="staged && history" class="ndi__today" aria-hidden="true">{{
        todayInitial
      }}</small>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue'
import type { DayRef } from '@/domain/period'
import type { DailyMeasurementEntry, MeasurementDayAssignment } from '@/domain/planningState'
import type { TodayItem } from '@/services/todayViewQueries'
import {
  multiCompletionDayMet,
  multiCompletionEffectiveThreshold,
} from '@/services/measurementProgress'
import { useT } from '@/composables/useT'
import { useTodayItemVisualization } from '@/composables/useTodayItemVisualization'
import { canMoveToTomorrow, canRescheduleItem } from './dayViewModels'
import type { NextObjectChartPoint } from './nextObjectChart'
import AppIcon from '@/components/shared/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    item: TodayItem
    todayDayRef: DayRef
    rawEntries: DailyMeasurementEntry[]
    allDayAssignments: MeasurementDayAssignment[]
    dragEnabled?: boolean
    isPending?: boolean
    /** This row is the current stage: labelled actions + history strip shown, icon tray hidden. */
    staged?: boolean
    /** The "Dzień" action is armed (calendar waits for a destination). */
    targeting?: boolean
    /** Rolling seven-day points (last = the viewed day); absent = no strip on stage. */
    history?: NextObjectChartPoint[]
    /** Highlighted as related to the hovered/pinned compass tile. */
    lit?: boolean
    /** Muted because another row is highlighted. */
    dim?: boolean
  }>(),
  { isPending: false, staged: false, targeting: false, history: undefined, lit: false, dim: false }
)

const emit = defineEmits<{
  'drag-plan-start': [event: DragEvent]
  'drag-plan-end': []
  select: []
  'open-object': []
  'open-context': []
  'toggle-completion': []
  'toggle-multi-item': [itemId: string]
  'save-entry': [value: number]
  'clear-entry': []
  hide: []
  'move-tomorrow': []
  'pick-day': []
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
const valueDraft = ref('')
const valueInputRef = ref<HTMLInputElement | null>(null)
const trayRef = ref<HTMLElement | null>(null)
const justSubmittedValue = ref(false)

const viz = useTodayItemVisualization(
  toRef(props, 'item'),
  toRef(props, 'rawEntries'),
  toRef(props, 'allDayAssignments'),
  toRef(props, 'todayDayRef'),
  computed(() => locale.value)
)

const title = computed(() =>
  props.item.kind === 'initiative' ? props.item.initiative.title : props.item.subject.title
)
const iconName = computed(() => {
  if (props.item.kind === 'initiative')
    return props.item.initiative.icon || PANEL_TYPE_ICONS.initiative
  if (props.item.panelType === 'keyResult' && props.item.goalIcon) return props.item.goalIcon
  const subject = props.item.subject as { icon?: string }
  return subject.icon || PANEL_TYPE_ICONS[props.item.panelType] || 'circle'
})
// Weekly intentions and initiatives have no object page; their tray offers the period context instead.
const canOpenObject = computed(
  () => props.item.kind === 'measurement' && props.item.panelType !== 'weeklyIntention'
)
// Scheduled rows move; week/month measurement rows can be re-homed on another day (hidden here).
const canReschedule = computed(() => canRescheduleItem(props.item))
const canTomorrow = computed(() => canMoveToTomorrow(props.item, props.todayDayRef))
const isCompletionToggle = computed(
  () => props.item.kind === 'initiative' || viz.entryMode.value === 'completion'
)
const completionDone = computed(() =>
  props.item.kind === 'initiative'
    ? Boolean(props.item.planState.dayRef)
    : viz.completionSlots.value.some(slot => slot.state === 'today-done')
)
const isRating = computed(() => viz.entryMode.value === 'rating')
const isStepperMode = computed(() => viz.entryMode.value === 'counter' || isRating.value)
const hasTodayEntry = computed(() => {
  if (props.item.kind === 'initiative') return Boolean(props.item.planState.dayRef)
  const entry = props.item.todayEntry
  if (!entry) return false
  if (props.item.subject.entryMode === 'completion') return true
  if (props.item.subject.entryMode === 'multi-completion')
    return (entry.checkedItemIds?.length ?? 0) > 0
  return typeof entry.value === 'number' && entry.value !== 0
})
const hasNumericEntry = computed(() => {
  if (props.item.kind !== 'measurement') return false
  const entry = props.item.todayEntry
  return typeof entry?.value === 'number' && entry.value !== 0
})
const hasPersistedTodayEntry = computed(
  () => props.item.kind === 'measurement' && Boolean(props.item.todayEntry)
)
const multiActiveItems = computed(() =>
  props.item.kind === 'measurement'
    ? (props.item.subject.multiItems ?? []).filter(entry => !entry.archived)
    : []
)
const multiCheckedIds = computed(
  () =>
    new Set(props.item.kind === 'measurement' ? (props.item.todayEntry?.checkedItemIds ?? []) : [])
)
// The fraction counts items (what the dots show), while "met" follows the
// weighted daily threshold — the same rule the charts and summaries score by.
const multiCheckedCount = computed(
  () => multiActiveItems.value.filter(entry => multiCheckedIds.value.has(entry.id)).length
)
const multiFraction = computed(() => `${multiCheckedCount.value}/${multiActiveItems.value.length}`)
const multiMet = computed(
  () =>
    props.item.kind === 'measurement' &&
    Boolean(props.item.todayEntry) &&
    multiActiveItems.value.length > 0 &&
    multiCompletionDayMet(props.item.subject, props.item.todayEntry!)
)

// Collapsed fraction ⇄ expanded dots. Hover opens and closes; keyboard opens on
// focus/Enter and hands focus to the first dot, Esc folds back to the fraction.
const multiRef = ref<HTMLElement | null>(null)
const multiOpen = ref(false)

function openMulti(focusFirstDot = false): void {
  if (!multiOpen.value) multiOpen.value = true
  if (!focusFirstDot) return
  void nextTick(() => {
    multiRef.value?.querySelector<HTMLButtonElement>('button.ndi__well--dot')?.focus()
  })
}

function closeMulti(): void {
  // Keyboard users keep the dots while one of them holds focus.
  if (multiRef.value?.contains(document.activeElement)) return
  multiOpen.value = false
  clearTip()
}

function collapseMulti(): void {
  multiOpen.value = false
  clearTip()
  void nextTick(() => {
    multiRef.value?.querySelector<HTMLButtonElement>('button.ndi__well--fraction')?.focus()
  })
}

// Swapping the fraction for the dots removes the focused element, which fires a
// focusout with no relatedTarget; the check waits a tick so the first dot has
// already taken focus by then.
function onMultiFocusOut(): void {
  void nextTick(() => {
    if (multiRef.value?.contains(document.activeElement)) return
    if (multiRef.value?.matches(':hover')) return
    multiOpen.value = false
    clearTip()
  })
}

function initialOf(label: string): string {
  return label.trim().charAt(0).toUpperCase()
}

// Item title tooltip: appears half a second after the pointer settles on a dot.
// Teleported to <body> so the rail's scroll clipping cannot cut it off.
const TIP_DELAY_MS = 500
const tip = ref<{ label: string; style: Record<string, string> } | null>(null)
let tipTimer: ReturnType<typeof setTimeout> | null = null
const rootRef = ref<HTMLElement | null>(null)
const tipHost = ref<HTMLElement | null>(null)

onMounted(() => {
  tipHost.value = rootRef.value?.closest<HTMLElement>('.mg-design-v2') ?? document.body
})

function scheduleTip(label: string, event: Event): void {
  clearTip()
  const target = event.currentTarget as HTMLElement | null
  if (!target) return
  tipTimer = setTimeout(() => {
    tipTimer = null
    const rect = target.getBoundingClientRect()
    tip.value = {
      label,
      style: { left: `${rect.left + rect.width / 2}px`, top: `${rect.top}px` },
    }
  }, TIP_DELAY_MS)
}

function clearTip(): void {
  if (tipTimer) {
    clearTimeout(tipTimer)
    tipTimer = null
  }
  tip.value = null
}

onBeforeUnmount(clearTip)

// ---------------------------------------------------------------------------
// Stage transition. Everything marked data-flip (the four actions, the disc) is
// measured before the DOM changes and animated from its old box to its new one
// once it has settled. Tray icon → labelled button are different nodes with the
// same key; the disc is the same node changing grid area.
const FLIP_MS = 300
const FLIP_EASE = 'cubic-bezier(.2, .7, .2, 1)'
const settling = ref(false)
let settleTimer: ReturnType<typeof setTimeout> | null = null

function motionAllowed(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof Element.prototype.animate === 'function' &&
    !(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  )
}

function snapshotFlip(root: HTMLElement): Map<string, DOMRect> {
  const boxes = new Map<string, DOMRect>()
  root
    .querySelectorAll<HTMLElement>('[data-flip]')
    .forEach(el => boxes.set(el.dataset.flip!, el.getBoundingClientRect()))
  return boxes
}

function playFlip(root: HTMLElement, before: Map<string, DOMRect>): void {
  root.querySelectorAll<HTMLElement>('[data-flip]').forEach(el => {
    const from = before.get(el.dataset.flip!)
    if (!from) return
    const to = el.getBoundingClientRect()
    const dx = from.left - to.left
    const dy = from.top - to.top
    if (!dx && !dy) return
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
      duration: FLIP_MS,
      easing: FLIP_EASE,
    })
    // A label that appears mid-flight: the icon leads, the word follows.
    const label = el.matches('.ndi__actions > button')
      ? el.querySelector<HTMLElement>(':scope > span')
      : null
    label?.animate(
      [
        { opacity: 0, transform: 'translateX(-4px)' },
        { opacity: 0, offset: 0.35 },
        { opacity: 1, transform: 'none' },
      ],
      { duration: FLIP_MS + 80, easing: 'ease-out' }
    )
  })
}

// flush: 'pre' runs before this component re-renders, so the old boxes are still there.
watch(
  () => props.staged,
  (next, previous) => {
    if (next === previous) return
    const root = rootRef.value
    if (!root || !motionAllowed()) return
    const before = snapshotFlip(root)
    if (!next) {
      // Folding: keep the tray visible while the labelled buttons fly back into it.
      settling.value = true
      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = setTimeout(() => {
        settling.value = false
        settleTimer = null
      }, FLIP_MS + 120)
    }
    void nextTick(() => playFlip(root, before))
  },
  { flush: 'pre' }
)

onBeforeUnmount(() => {
  if (settleTimer) clearTimeout(settleTimer)
})

// ---------------------------------------------------------------------------
// History strip: the six days before the viewed one, drawn in the row's own
// entry language. A "short" reading is one below target (rose fill, number kept).
interface HistoryDay {
  key: string
  initial: string
  title: string
  state: 'done' | 'missed' | 'empty' | 'reading'
  short?: boolean
  fill?: number
  reading?: string
}

const initialFormatter = computed(
  () => new Intl.DateTimeFormat(locale.value, { weekday: 'narrow' })
)
const dayTitleFormatter = computed(
  () => new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long' })
)
function dayInitial(dayRef: string): string {
  return initialFormatter.value
    .format(new Date(`${dayRef}T12:00:00`))
    .toLocaleLowerCase(locale.value)
}
const todayInitial = computed(() => dayInitial(props.todayDayRef))

// Daily points carry no target of their own (status is 'no-target' whenever an
// entry exists), so "done" means an entry, and "missed" means an assigned day
// without one — the same reading the old dots chart used. Checklists compare
// the day's points with the subject's daily threshold.
const historyDays = computed<HistoryDay[]>(() => {
  const points = (props.history ?? []).filter(point => !point.current).slice(-6)
  if (!points.length) return []
  const mode = viz.entryMode.value
  const numericScale = isRating.value
    ? viz.ratingScale.value
    : Math.max(1, ...points.map(point => Math.max(point.target ?? 0, point.value ?? 0)))
  const multiThreshold =
    props.item.kind === 'measurement' && mode === 'multi-completion'
      ? multiCompletionEffectiveThreshold(props.item.subject)
      : 0
  return points.map(point => {
    const base = {
      key: point.key,
      initial: dayInitial(point.key),
      title: dayTitleFormatter.value.format(new Date(`${point.key}T12:00:00`)),
    }
    const hasEntry =
      point.value !== undefined || (point.status !== 'no-data' && point.status !== 'missed')
    const missed = point.status === 'missed' || (!hasEntry && Boolean(point.assigned))
    if (!hasEntry) return { ...base, state: missed ? 'missed' : 'empty' }
    if (mode === 'completion') return { ...base, state: missed ? 'missed' : 'done' }
    const value = point.value ?? 0
    if (mode === 'multi-completion') {
      if (multiThreshold > 0 && value >= multiThreshold) return { ...base, state: 'done' }
      if (value <= 0) return { ...base, state: missed ? 'missed' : 'empty' }
      const share = Math.min(100, Math.round((value / Math.max(multiThreshold, value)) * 100))
      return { ...base, state: 'reading', short: missed, fill: share }
    }
    if (value === 0) return { ...base, state: missed ? 'missed' : 'empty' }
    const fill = Math.max(8, Math.min(100, Math.round((value / numericScale) * 100)))
    return { ...base, state: 'reading', short: missed, fill, reading: String(value) }
  })
})

const stepperValue = computed(() =>
  hasNumericEntry.value ? String(viz.currentValue.value ?? 0) : '0'
)
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
const fractionSizeClass = computed(() => {
  const suffix = sizeSuffix(multiFraction.value.length)
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
  () => isRating.value && (viz.currentValue.value ?? 0) >= viz.ratingScale.value
)

// The rest of the feature renders decimals with a comma (see NextObjectChartCard),
// so the editable well both accepts and shows the Polish separator.
function formatDraft(value: number | undefined): string {
  return value ? String(value).replace('.', ',') : ''
}

watch(
  () => viz.currentValue.value,
  next => {
    if (document.activeElement === valueInputRef.value) return
    valueDraft.value = formatDraft(next)
  },
  { immediate: true }
)

// Tray keyboard: the title is the row's tab stop; → enters the tray, ←/→ roam
// inside it, Esc returns to the title. Tray buttons are not in the tab order.
function trayButtons(): HTMLButtonElement[] {
  return Array.from(trayRef.value?.querySelectorAll<HTMLButtonElement>('button') ?? [])
}

function focusTray(index: number): void {
  const buttons = trayButtons()
  if (!buttons.length) return
  buttons[Math.max(0, Math.min(buttons.length - 1, index))]?.focus()
}

function moveTrayFocus(delta: number): void {
  const buttons = trayButtons()
  const current = buttons.findIndex(button => button === document.activeElement)
  if (current === -1) return
  const next = current + delta
  if (next < 0) {
    leaveTray()
    return
  }
  buttons[Math.min(buttons.length - 1, next)]?.focus()
}

function leaveTray(): void {
  trayRef.value?.closest('.ndi')?.querySelector<HTMLButtonElement>('button.ndi__label')?.focus()
}

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
</script>

<style scoped>
.ndi {
  --ndi-cell: 3.2rem;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: 'main entry';
  align-items: center;
  gap: var(--mg-space-2);
  padding: var(--mg-space-1) var(--mg-space-2);
  border-radius: var(--mg-radius-sm);
  cursor: pointer;
  transition: background var(--mg-duration-fast) var(--mg-ease-standard);
}

.ndi:hover {
  background: var(--mg-color-mist);
}

/* Expanded row: one step whiter than the hover tone (card → hover → expanded),
   nothing else — no tint back toward blue, no left rule (user decision 2026-09-10). */
.ndi--staged,
.ndi--staged:hover {
  background: var(--mg-color-paper);
}

/* Compass highlight: related rows glow, the rest step back. */
.ndi--lit {
  background: var(--mg-color-sky-field);
}

.ndi--dim {
  opacity: 0.5;
}

.ndi__main {
  grid-area: main;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--mg-space-2);
  min-width: 0;
  min-height: 2.1rem;
}

/* Staged: actions take a second row under the title. With history the strip
   spans both rows on the right and the disc joins it as the last cell, so it
   lands lower than in the collapsed row — the intended drop. */
.ndi--staged {
  grid-template-areas: 'main entry' 'actions actions';
  row-gap: var(--mg-space-2);
  padding-bottom: var(--mg-space-2);
  cursor: default;
}

.ndi--history {
  grid-template-columns: minmax(0, 1fr) auto auto;
  grid-template-areas: 'main strip entry' 'actions strip entry';
  column-gap: var(--mg-space-1);
}

.ndi__actions {
  grid-area: actions;
  display: grid;
  grid-template-columns: repeat(4, max-content);
  gap: var(--mg-space-1);
  justify-content: start;
  padding-left: calc(1.85rem + var(--mg-space-2));
}

.ndi--history .ndi__actions {
  padding-right: var(--mg-space-3);
}

.ndi__actions > button {
  display: inline-flex;
  gap: var(--mg-space-1);
  align-items: center;
  padding: 3px var(--mg-space-2);
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-organic-b);
  color: var(--mg-color-muted);
  background: var(--mg-color-paper);
  font-size: var(--mg-font-size-xs);
  font-weight: 800;
  cursor: pointer;
}

.ndi__actions > button:hover,
.ndi__actions > button.is-active {
  color: var(--mg-color-primary-strong);
  background: var(--mg-color-sky-well);
}

.ndi__actions .material-symbols-outlined {
  font-size: var(--mg-font-size-sm);
}

/* The strip: fixed cells, never stretched with the row. */
.ndi__strip {
  grid-area: strip;
  align-self: center;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: var(--ndi-cell);
  gap: var(--mg-space-1);
  align-items: end;
}

.ndi__day {
  display: grid;
  justify-items: center;
  align-items: center;
  gap: 3px;
}

.ndi__day small,
.ndi__today {
  color: var(--mg-color-muted);
  font-size: 0.66rem;
  font-weight: 700;
  line-height: 1;
}

.ndi__today {
  color: var(--mg-color-primary-strong);
}

.ndi__dot {
  overflow: hidden;
  border-color: transparent;
  background: var(--mg-color-border);
  box-shadow: none;
  font-style: normal;
}

.ndi__dot--b {
  border-radius: var(--mg-radius-organic-b);
}

.ndi__dot.is-done {
  box-shadow: var(--mg-shadow-inset-sm);
}

/* Missed days are rose — the same effort tone the week charts use. */
.ndi__dot.is-missed {
  background: var(--mg-color-effort-soft);
}

.ndi__dot.is-reading {
  background: linear-gradient(
    to top,
    var(--mg-color-state-soft) var(--fill, 0%),
    var(--mg-color-border) var(--fill, 0%)
  );
  box-shadow: var(--mg-shadow-inset-sm);
}

.ndi__dot.is-reading.is-short {
  background: linear-gradient(
    to top,
    var(--mg-color-effort-soft) var(--fill, 0%),
    var(--mg-color-border) var(--fill, 0%)
  );
}

.ndi__dot b {
  position: relative;
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-xs);
  font-weight: 800;
}

/* Fan: dots leave the disc to the left, nearest day first, in the same beat as
   the FLIP of the buttons and the disc. Folding runs the same path back while
   the strip is pinned to the collapsed disc line. */
.ndi__day {
  --dx: calc((6 - var(--idx, 0)) * (var(--ndi-cell) + var(--mg-space-1)));
  animation: ndi-fan var(--mg-duration-base, 0.3s) var(--mg-ease-standard) both;
  animation-delay: calc((5 - var(--idx, 0)) * 22ms);
}

@keyframes ndi-fan {
  from {
    opacity: 0;
    transform: translateX(var(--dx)) scale(0.55);
  }
}

@keyframes ndi-fold {
  to {
    opacity: 0;
    transform: translateX(var(--dx)) scale(0.55);
  }
}

@keyframes ndi-hold {
  from {
    opacity: 1;
  }
  to {
    opacity: 1;
  }
}

/* grid-area: auto matters — an absolutely positioned grid child keeps its named
   area as containing block, and 'strip' no longer exists once the row folds. */
.ndi-strip-leave-active {
  position: absolute;
  grid-area: auto;
  top: var(--mg-space-1);
  right: calc(var(--mg-space-2) + 2.1rem + var(--mg-space-1));
  animation: ndi-hold 0.32s both;
  pointer-events: none;
}

.ndi-strip-leave-active .ndi__day {
  animation: ndi-fold 0.22s var(--mg-ease-standard) both;
  animation-delay: calc(var(--idx, 0) * 24ms);
}

/* Folding in flight: the tray stays visible while the labelled buttons fly back. */
.ndi--settling .ndi__tray {
  opacity: 1;
  pointer-events: auto;
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .ndi__day,
  .ndi-strip-leave-active .ndi__day {
    animation: none;
  }

  .ndi-strip-leave-active {
    display: none;
  }
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

.ndi__title {
  position: relative;
  display: grid;
  min-width: 0;
}

.ndi__label {
  display: grid;
  width: 100%;
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
  grid-area: entry;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--mg-space-1);
}

/* As the strip's last cell the disc gets its initial underneath and the ± move
   above and below it — the left side is taken by history. */
.ndi--history .ndi__entry {
  align-self: center;
  display: grid;
  justify-items: center;
  gap: 3px;
}

.ndi--history .ndi__step {
  right: auto;
  left: 50%;
  z-index: 2;
  transform: translateX(-50%);
}

.ndi--history .ndi__step--plus {
  top: auto;
  bottom: calc(100% + 2px);
}

.ndi--history .ndi__step--minus {
  top: calc(2.1rem + 2px);
  bottom: auto;
}

.ndi--history .ndi__entry:hover .ndi__today,
.ndi--history .ndi__entry:focus-within .ndi__today {
  opacity: 0;
}

.ndi--history .ndi__multi {
  position: relative;
  z-index: 2;
}

/* THE well: one circle for every entry mode. The disc itself (and its done
   state) is the shared .mg-well from the design system, so a done task reads
   identically here and in the calendar's completion marks. */
.ndi__well {
  overflow: hidden;
  color: var(--mg-color-muted);
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

/* Rating: the disc fills to the recorded share of the scale. */
.ndi__well--meter {
  background: linear-gradient(
    to right,
    var(--mg-color-sky-field) var(--ndi-fill, 0%),
    var(--mg-color-canvas) var(--ndi-fill, 0%)
  );
}

/* Multi-completion: the fraction disc at rest, a row of item dots on hover.
   Right-aligned, so the disc and the last dot share the rail's right edge. */
.ndi__multi {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--mg-space-1);
  min-height: 2.1rem;
}

/* Threshold met: a firmer tint than "has a reading", but the fraction stays
   legible — the filled chart blob is reserved for single-completion rows. */
.ndi__well--met {
  border-color: transparent;
  color: var(--mg-color-primary-strong);
  background: var(--mg-color-state-soft);
}

.ndi__well--dot {
  width: 1.7rem;
  height: 1.7rem;
  color: var(--mg-color-muted);
  animation: ndi-dot-in var(--mg-duration-fast) var(--mg-ease-standard) both;
  animation-delay: calc(var(--ndi-i, 0) * 28ms);
}

.ndi__multi > .ndi__well--dot:nth-child(even) {
  border-radius: var(--mg-radius-organic-b);
}

.ndi__well--dot .material-symbols-outlined {
  font-size: 1rem;
  line-height: 1;
}

.ndi__initial {
  font-size: var(--mg-font-size-xs);
  font-weight: 800;
  line-height: 1;
}

/* A checked item's dot fills solid: the glyph inverts instead of hiding
   behind the completion blob. */
.ndi__well--dot.ndi__well--done {
  border-color: transparent;
  color: var(--mg-color-on-primary);
  background: var(--mg-color-state);
  box-shadow: none;
}

.ndi__well--dot:not(:disabled):hover {
  color: var(--mg-color-primary-strong);
  background: var(--mg-color-sky-well);
}

.ndi__well--dot.ndi__well--done:not(:disabled):hover {
  color: var(--mg-color-on-primary);
  background: var(--mg-color-primary-fill-hover);
}

@keyframes ndi-dot-in {
  from {
    opacity: 0;
    transform: translateX(0.4rem) scale(0.7);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ndi__well--dot {
    animation: none;
  }
}

/* Item tooltip lives in <body> (teleported), so it is styled globally. */
:global(.ndi-tip) {
  position: fixed;
  z-index: var(--mg-layer-dialog);
  max-width: 16rem;
  padding: 0.2rem 0.55rem;
  border-radius: var(--mg-radius-pill);
  color: var(--mg-color-inverse-ink);
  background: var(--mg-color-inverse);
  box-shadow: var(--mg-shadow-raised-sm);
  font-family: var(--mg-font-sans);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  transform: translate(-50%, calc(-100% - 0.35rem));
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

/* Tray: overlays the tail of the title (masked by the row background) so the
   title column never shrinks for buttons nobody sees yet. */
.ndi__tray {
  position: absolute;
  top: 50%;
  right: 0;
  display: inline-flex;
  gap: 2px;
  padding-left: var(--mg-space-3);
  background: linear-gradient(to right, transparent, var(--mg-color-mist) var(--mg-space-3));
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%);
  transition: opacity var(--mg-duration-fast) var(--mg-ease-standard);
}

.ndi:hover .ndi__tray,
.ndi__tray:focus-within {
  opacity: 1;
  pointer-events: auto;
}

.ndi--lit .ndi__tray {
  background: linear-gradient(to right, transparent, var(--mg-color-sky-field) var(--mg-space-3));
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
</style>
