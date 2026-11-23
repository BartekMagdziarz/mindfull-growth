<template>
  <div class="qr-tile">
    <header class="qr-tile__head">
      <span class="qr-tile__disc"><AppIcon :name="icon" /></span>
      <strong>{{ title }}</strong>
      <button
        v-if="past.length"
        type="button"
        class="qr-tile__fold"
        :class="{ 'is-open': open }"
        :aria-expanded="open"
        @click="emit('update:open', !open)"
      >
        <span>Minione tygodnie</span>
        <AppIcon name="expand_more" />
      </button>
    </header>

    <div ref="markRef" class="qr-tile__now">
      <small v-if="open && past.length" class="qr-tile__date">{{ currentLabel }}</small>
      <LoadStateTrack
        :load="load"
        :state="state"
        :subject="`${title} · ten tydzień`"
        size="lg"
        live
        :preview-load="preview?.axis === 'load' ? preview.value : null"
        :preview-state="preview?.axis === 'state' ? preview.value : null"
        :active="active"
      />
      <!-- the mark can be grabbed too: the dot is the state, the bar's end is the load -->
      <span
        v-if="state != null"
        class="qr-tile__grab qr-tile__grab--state"
        :style="{ '--qr-tile-at': state }"
        aria-hidden="true"
        @pointerenter="emit('active', 'state')"
        @pointerleave="emit('active', null)"
        @pointerdown="startDrag('state', $event)"
      />
      <span
        v-if="load != null"
        class="qr-tile__grab qr-tile__grab--load"
        :style="{ '--qr-tile-at': load }"
        aria-hidden="true"
        @pointerenter="emit('active', 'load')"
        @pointerleave="emit('active', null)"
        @pointerdown="startDrag('load', $event)"
      />
    </div>

    <!-- earlier weeks with the same mark, smaller, on the scale of the big one -->
    <ol v-if="open && past.length" class="qr-tile__past" :aria-label="`${title}: minione tygodnie`">
      <li v-for="week in past" :key="week.weekRef">
        <small>{{ week.label }}</small>
        <LoadStateTrack
          :load="week.load"
          :state="week.state"
          :subject="`${title} · tydzień od ${week.label}`"
          size="sm"
        />
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import LoadStateTrack from '@/components/shared/charts/LoadStateTrack.vue'
import type { MaybeRating } from '@/domain/loadState'
import type { WeekPoint } from '@/domain/loadStateSeries'
import { ratingStopFromOffset, type RatingAxis } from './quietRitualModel'

/**
 * Result tile of an area step in the weekly reflection (decision 2026-11-22):
 * the calendar's area tile at a large size — icon, area name and the load &
 * state mark of this week, drawn live while the two counters below change.
 * „Minione tygodnie” unfolds earlier weeks inside the tile, right under the
 * mark and on its scale; dates hang in the tile's margin.
 *
 * `preview` and `active` come from the counters (a rating about to be set, the
 * axis under the cursor). The dot and the bar's end can also be dragged on the
 * mark itself.
 */
const props = defineProps<{
  icon: string
  title: string
  load: MaybeRating
  state: MaybeRating
  /** Earlier rated weeks of this area, newest first. */
  past: WeekPoint[]
  /** Monday of the week being rated, as the calendar's matrix labels it. */
  currentLabel: string
  open: boolean
  preview: { axis: RatingAxis; value: number } | null
  active: RatingAxis | null
}>()
const emit = defineEmits<{
  rate: [axis: RatingAxis, value: number]
  'update:open': [open: boolean]
  active: [axis: RatingAxis | null]
}>()

const markRef = ref<HTMLElement | null>(null)

function startDrag(axis: RatingAxis, event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  const mark = markRef.value
  if (!mark || event.button !== 0) return
  event.preventDefault()
  target.setPointerCapture(event.pointerId)
  target.classList.add('is-dragging')
  const move = (moveEvent: PointerEvent) => {
    const rect = mark.getBoundingClientRect()
    const value = ratingStopFromOffset(moveEvent.clientX - rect.left, rect.width, rect.height)
    if (value !== props[axis]) emit('rate', axis, value)
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
/* Two classes in button selectors: `.quiet-ritual button` beats a single one. */
.qr-tile {
  --qr-tile-pad: 2.5rem;
  --qr-tile-mark: 3rem;
  display: grid;
  min-width: 0;
  padding: 16px var(--qr-tile-pad) 20px;
  border-radius: var(--mg-radius-lg);
  background: var(--mg-color-mist);
  box-shadow: var(--mg-shadow-nested);
}
.qr-tile__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.qr-tile__head strong {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-md);
  font-weight: var(--mg-weight-title);
}
.qr-tile__disc {
  display: grid;
  place-items: center;
  width: 40px;
  height: 39px;
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--mg-color-veil-strong);
  color: var(--mg-color-primary-strong);
}
.qr-tile__disc :deep(.app-icon) {
  font-size: var(--mg-font-size-icon-lg);
}

/* the way to history: a word with a chevron, like the row actions in Today */
.qr-tile .qr-tile__fold {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-height: 1.75rem;
  margin-left: auto;
  padding: 0 var(--mg-space-1) 0 var(--mg-space-2);
  border-radius: var(--mg-radius-pill);
  background: transparent;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-strong);
  white-space: nowrap;
  cursor: pointer;
}
.qr-tile .qr-tile__fold:hover,
.qr-tile .qr-tile__fold.is-open {
  color: var(--mg-color-primary-strong);
}
.qr-tile .qr-tile__fold:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 2px;
}
.qr-tile__fold :deep(.app-icon) {
  font-size: var(--mg-font-size-icon-sm);
  transition: rotate var(--mg-duration-fast) var(--mg-ease-standard);
}
.qr-tile__fold.is-open :deep(.app-icon) {
  rotate: 180deg;
}

.qr-tile__now {
  position: relative;
}
/* the date of the week being rated appears with the history, in the tile's margin */
.qr-tile__date {
  position: absolute;
  top: 50%;
  right: calc(100% + 6px);
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-chart);
  font-weight: var(--mg-weight-title);
  font-variant-numeric: tabular-nums;
  translate: 0 -50%;
  white-space: nowrap;
}
.qr-tile__grab {
  --qr-tile-x: calc(
    var(--qr-tile-mark) / 2 + (var(--qr-tile-at) - 1) * (100% - var(--qr-tile-mark)) / 4
  );
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--qr-tile-x);
  z-index: 1;
  width: 2.5rem;
  border-radius: var(--mg-radius-pill);
  translate: -50% 0;
  cursor: grab;
  touch-action: none;
}
.qr-tile__grab--load {
  left: calc(var(--qr-tile-x) + 1rem);
  width: 1.25rem;
  cursor: ew-resize;
}
.qr-tile__grab.is-dragging {
  cursor: grabbing;
}

/* history: the small marks' places stand under the big mark's places */
.qr-tile__past {
  display: grid;
  gap: 9px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
}
.qr-tile__past > li {
  position: relative;
  min-width: 0;
}
.qr-tile__past small {
  position: absolute;
  top: 50%;
  right: calc(100% - 1rem + 6px);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-chart);
  font-weight: var(--mg-weight-label);
  font-variant-numeric: tabular-nums;
  translate: 0 -50%;
  white-space: nowrap;
}
.qr-tile__past :deep(.ls-track) {
  width: auto;
  margin-inline: 1rem;
}
</style>
