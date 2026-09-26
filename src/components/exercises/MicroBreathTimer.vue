<template>
  <div class="breath" :class="`breath--${mode}`">
    <!-- Every breath is a square; its bottom wall is the phase being
         breathed. The wall thickens for the phase's length, then the square
         turns 90° clockwise so the next phase lands at the bottom. Breathed
         squares slide left, the coming ones wait on the right. -->
    <div class="breath-stage">
      <div
        v-for="square in squares"
        :key="square.index"
        class="breath-square"
        :class="`breath-square--${square.state}`"
        :style="{ '--breath-offset': square.offset, opacity: square.opacity }"
        aria-hidden="true"
      >
        <svg
          class="breath-square__svg"
          viewBox="0 0 120 120"
          :style="{ transform: `rotate(${square.rotation}deg)` }"
        >
          <rect class="breath-square__track" x="12" y="12" width="96" height="96" :rx="RADIUS" />
          <template v-for="(width, wall) in square.walls" :key="wall">
            <path
              v-if="width > 0"
              class="breath-square__wall"
              :d="WALLS[wall]"
              :style="{ strokeWidth: width }"
            />
          </template>
        </svg>
      </div>

      <!-- Setup lives on the square: each wall carries its phase length,
           the middle carries the session length and the start. −/+ show on
           hover or focus, like the tray on object cards. -->
      <template v-if="mode === 'setup'">
        <div
          v-for="(phase, index) in BREATH_PHASES"
          :key="phase"
          class="breath-wall-label"
          :class="`breath-wall-label--${WALL_SIDES[index]}`"
          @mouseenter="highlightWall = index"
          @mouseleave="highlightWall = null"
          @focusin="highlightWall = index"
          @focusout="highlightWall = null"
        >
          <span class="breath-wall-label__name">{{ t(`${K}.phases.${phase}`) }}</span>
          <span class="breath-stepper">
            <button
              type="button"
              class="breath-stepper__button"
              :aria-label="`${t(`${K}.less`)}: ${t(`${K}.phases.${phase}`)}`"
              :disabled="rhythm[index]! <= PHASE_LIMITS[phase].min"
              @click="setPhase(index, rhythm[index]! - 1)"
            >
              <AppIcon name="remove" />
            </button>
            <span class="breath-stepper__value">{{ t(`${K}.seconds`, { n: rhythm[index]! }) }}</span>
            <button
              type="button"
              class="breath-stepper__button"
              :aria-label="`${t(`${K}.more`)}: ${t(`${K}.phases.${phase}`)}`"
              :disabled="rhythm[index]! >= PHASE_LIMITS[phase].max"
              @click="setPhase(index, rhythm[index]! + 1)"
            >
              <AppIcon name="add" />
            </button>
          </span>
        </div>
      </template>

      <div class="breath-center">
        <template v-if="mode === 'setup'">
          <span class="breath-stepper">
            <button
              type="button"
              class="breath-stepper__button"
              :aria-label="`${t(`${K}.less`)}: ${t(`${K}.duration`)}`"
              :disabled="minutes <= DURATION_MINUTES.min"
              @click="minutes--"
            >
              <AppIcon name="remove" />
            </button>
            <span class="breath-stepper__value">{{ t(`${K}.minutes`, { n: minutes }) }}</span>
            <button
              type="button"
              class="breath-stepper__button"
              :aria-label="`${t(`${K}.more`)}: ${t(`${K}.duration`)}`"
              :disabled="minutes >= DURATION_MINUTES.max"
              @click="minutes++"
            >
              <AppIcon name="add" />
            </button>
          </span>
          <AppButton variant="filled" @click="start()">{{ t(`${K}.start`) }}</AppButton>
        </template>
        <template v-else>
          <span class="breath-center__count">{{ centerCount }}</span>
          <span class="breath-center__phase">{{ centerPhase }}</span>
        </template>
      </div>
    </div>

    <p class="sr-only" aria-live="polite">{{ liveText }}</p>

    <div v-if="mode === 'running'" class="breath-controls">
      <span class="breath-controls__meta">{{ breathOf }} · {{ timeLeft }}</span>
      <AppButton variant="text" @click="togglePause()">
        {{ paused ? t(`${K}.resume`) : t(`${K}.pause`) }}
      </AppButton>
      <AppButton variant="text" @click="finish()">{{ t(`${K}.finish`) }}</AppButton>
    </div>

    <p v-else-if="mode === 'done'" class="breath-complete">{{ t(`${K}.complete`) }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import {
  BREATH_PHASES,
  DURATION_MINUTES,
  PHASE_LIMITS,
  breathCount,
  breathPositionAt,
  normalizeMinutes,
  normalizePhaseSeconds,
  sessionSeconds,
  type BreathPhaseSeconds,
  type BreathSettings,
} from '@/domain/breathPattern'
import { loadBreathSettings, saveBreathSettings } from '@/utils/breathPreferences'

const props = defineProps<{
  /** Default seconds per phase: inhale / hold / exhale / hold. */
  phaseSeconds: [number, number, number, number]
  /** Default session length; the user may change it before starting. */
  totalSeconds: number
  /** Remembers the user's last rhythm under this key (per exercise). */
  storageKey?: string
}>()

const emit = defineEmits<{
  /** The rhythm the user started with (planned session length). */
  started: [settings: { phaseSeconds: BreathPhaseSeconds; totalSeconds: number }]
  /** Fires every elapsed second — the runner gates on progress. */
  progress: [elapsedSeconds: number]
  /** All breaths done, or the user finished early. */
  done: [completedSeconds: number]
}>()

const { t } = useT()
const K = 'exerciseWizards.micro.shared.breath'

// ── Geometry (viewBox 120) ───────────────────────────────────────────
// Walls run corner-middle to corner-middle, so neighbouring walls meet on
// the arcs and a filled square reads as one soft shape.
const LO = 12
const HI = 108
const RADIUS = 22
const ARC = `A ${RADIUS} ${RADIUS} 0 0 1`
const IN = LO + RADIUS
const OUT = HI - RADIUS
const CUT = RADIUS * (1 - Math.SQRT1_2)
const lo = (LO + CUT).toFixed(2)
const hi = (HI - CUT).toFixed(2)

/**
 * Walls in phase order. A clockwise quarter turn brings the right wall to
 * the bottom: inhale (bottom) → right → top → left.
 */
const WALLS = [
  `M ${hi} ${hi} ${ARC} ${OUT} ${HI} L ${IN} ${HI} ${ARC} ${lo} ${hi}`,
  `M ${hi} ${lo} ${ARC} ${HI} ${IN} L ${HI} ${OUT} ${ARC} ${hi} ${hi}`,
  `M ${lo} ${lo} ${ARC} ${IN} ${LO} L ${OUT} ${LO} ${ARC} ${hi} ${lo}`,
  `M ${lo} ${hi} ${ARC} ${LO} ${OUT} L ${LO} ${IN} ${ARC} ${lo} ${lo}`,
]
/** Where each phase's label sits around the setup square. */
const WALL_SIDES = ['bottom', 'right', 'top', 'left'] as const

const WALL_MIN = 3
const WALL_FULL = 8

// ── Settings ─────────────────────────────────────────────────────────
const defaults: BreathSettings = {
  phaseSeconds: normalizePhaseSeconds(props.phaseSeconds, [4, 0, 6, 0]),
  minutes: normalizeMinutes(Math.round(props.totalSeconds / 60), 2),
}
const initial = props.storageKey ? loadBreathSettings(props.storageKey, defaults) : defaults

const rhythm = ref<BreathPhaseSeconds>([...initial.phaseSeconds])
const minutes = ref(initial.minutes)
const highlightWall = ref<number | null>(null)

const settings = computed<BreathSettings>(() => ({
  phaseSeconds: rhythm.value,
  minutes: minutes.value,
}))
const breaths = computed(() => breathCount(settings.value))

function setPhase(index: number, value: number): void {
  const next = [...rhythm.value] as BreathPhaseSeconds
  next[index] = value
  rhythm.value = normalizePhaseSeconds(next, rhythm.value)
}

function clock(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

// ── Clock ────────────────────────────────────────────────────────────
const started = ref(false)
const paused = ref(false)
const done = ref(false)
const elapsedMs = ref(0)
let runStartedAt = 0
let banked = 0
let frame: number | null = null
let reportedSeconds = 0

const mode = computed(() => (done.value ? 'done' : started.value ? 'running' : 'setup'))
const position = computed(() => breathPositionAt(settings.value, elapsedMs.value))

function loop(now: number): void {
  elapsedMs.value = banked + (now - runStartedAt)
  const seconds = Math.floor(elapsedMs.value / 1000)
  if (seconds > reportedSeconds) {
    reportedSeconds = seconds
    emit('progress', seconds)
  }
  if (position.value.done) {
    complete(sessionSeconds(settings.value))
    return
  }
  frame = requestAnimationFrame(loop)
}

function stopFrame(): void {
  if (frame !== null) cancelAnimationFrame(frame)
  frame = null
}

function start(): void {
  if (props.storageKey) saveBreathSettings(props.storageKey, settings.value)
  emit('started', {
    phaseSeconds: [...rhythm.value],
    totalSeconds: sessionSeconds(settings.value),
  })
  highlightWall.value = null
  started.value = true
  runStartedAt = performance.now()
  frame = requestAnimationFrame(loop)
}

function togglePause(): void {
  if (paused.value) {
    paused.value = false
    runStartedAt = performance.now()
    frame = requestAnimationFrame(loop)
    return
  }
  stopFrame()
  banked = elapsedMs.value
  paused.value = true
}

function complete(completedSeconds: number): void {
  stopFrame()
  done.value = true
  paused.value = false
  emit('done', completedSeconds)
}

function finish(): void {
  complete(Math.floor(elapsedMs.value / 1000))
}

onUnmounted(stopFrame)

// ── Squares ──────────────────────────────────────────────────────────
interface SquareView {
  index: number
  /** past = breathed (filled), active = centre, future = empty well. */
  state: 'past' | 'active' | 'future'
  /** Centre offset in active-square widths (CSS multiplies by the size). */
  offset: number
  opacity: number
  rotation: number
  /** Filled stroke width per wall in phase order; 0 = track only. */
  walls: number[]
}

/** Neighbours shrink to small squares this far from the centre. */
const SMALL = 0.3
const GAP = 0.14
const WINDOW = 4

function offsetFor(distance: number): number {
  if (distance === 0) return 0
  const steps = Math.abs(distance)
  return Math.sign(distance) * (0.5 + GAP + SMALL / 2 + (steps - 1) * (SMALL + GAP))
}

const squares = computed<SquareView[]>(() => {
  const total = breaths.value
  const pos = position.value
  // A full session keeps its last square centred; an early finish freezes
  // the square it stopped on.
  const focus = pos.done ? total - 1 : started.value ? pos.breath : 0
  const views: SquareView[] = []

  for (let index = Math.max(0, focus - WINDOW); index <= Math.min(total - 1, focus + WINDOW); index++) {
    const distance = index - focus
    let rotation = 0
    let walls = [0, 0, 0, 0]

    if (distance < 0 || (distance === 0 && pos.done)) {
      // Breathed: the last quarter turn brings the inhale wall back to the
      // bottom, every wall stays filled.
      rotation = 360
      walls = walls.map(() => WALL_FULL)
    } else if (distance === 0 && started.value) {
      rotation = pos.phase * 90
      // Walls already passed (a skipped 0 s hold too) stay filled; the
      // bottom one grows with the phase.
      walls = walls.map((_, wall) => {
        if (wall < pos.phase) return WALL_FULL
        if (wall > pos.phase) return 0
        return WALL_MIN + (WALL_FULL - WALL_MIN) * pos.progress
      })
    } else if (distance === 0 && highlightWall.value !== null) {
      walls = walls.map((_, wall) => (wall === highlightWall.value ? WALL_MIN : 0))
    }

    const steps = Math.abs(distance)
    // Only a running session shows the queue of coming breaths.
    const hidden = steps >= WINDOW || (distance > 0 && mode.value !== 'running')
    views.push({
      index,
      // The finished last square turns into a breathed one in place.
      state: distance < 0 || (distance === 0 && pos.done) ? 'past' : distance === 0 ? 'active' : 'future',
      offset: offsetFor(distance),
      opacity: hidden ? 0 : steps === 0 ? 1 : 1 - steps * 0.26,
      rotation,
      walls,
    })
  }
  return views
})

// ── Labels ───────────────────────────────────────────────────────────
const PHASE_CUES = ['breatheIn', 'hold', 'breatheOut', 'hold'] as const

const centerCount = computed(() =>
  done.value ? t(`${K}.done`) : String(position.value.remaining),
)

const centerPhase = computed(() => {
  if (done.value) return ''
  if (paused.value) return t(`${K}.paused`)
  return t(`${K}.${PHASE_CUES[position.value.phase]}`)
})

const breathOf = computed(
  () => `${Math.min(position.value.breath + 1, breaths.value)}/${breaths.value}`,
)
const timeLeft = computed(() => clock(sessionSeconds(settings.value) - elapsedMs.value / 1000))

/** Screen readers get the phase change, not every countdown second. */
const liveText = computed(() => (mode.value === 'running' ? centerPhase.value : ''))
</script>

<style scoped>
.breath {
  --breath-size: 10.5rem;
  --breath-fill: var(--mg-color-state);
  --breath-track: var(--mg-color-sky-field);
  --breath-turn: 700ms;
  display: grid;
  gap: var(--mg-space-3);
}

/* ── Stage ─────────────────────────────────────────────────────────── */
/* Setup needs room for the wall labels above and below; the session
   gives it back. */
.breath-stage {
  position: relative;
  height: calc(var(--breath-size) + 6.5rem);
  transition: height var(--mg-duration-normal) var(--mg-ease-standard);
}

.breath--running .breath-stage,
.breath--done .breath-stage {
  height: calc(var(--breath-size) + 2rem);
}

.breath--running .breath-stage,
.breath--done .breath-stage {
  -webkit-mask: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
  mask: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
}

.breath-square {
  --breath-scale: 0.3;
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--breath-size);
  height: var(--breath-size);
  transform: translate(-50%, -50%) translateX(calc(var(--breath-offset) * var(--breath-size)))
    scale(var(--breath-scale));
  transition:
    transform var(--breath-turn) var(--mg-ease-standard),
    opacity var(--breath-turn) ease;
}

.breath-square--active {
  --breath-scale: 1;
}

.breath-square__svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  transition: transform var(--breath-turn) var(--mg-ease-standard);
}

/* Read like the Today checks: a coming breath is an empty well, the
   current one fills wall by wall, a breathed one is a filled square — the
   same sky-600 as a done check. Small squares draw a heavier track so it
   survives the shrink. */
.breath-square__track {
  fill: transparent;
  stroke: var(--breath-track);
  stroke-width: 3;
  transition:
    fill var(--breath-turn) ease,
    stroke var(--breath-turn) ease,
    stroke-width var(--breath-turn) ease;
}

.breath-square--future .breath-square__track {
  stroke-width: 8;
}

.breath-square--past .breath-square__track {
  fill: var(--breath-fill);
  stroke: var(--breath-fill);
  stroke-width: 8;
}

.breath-square__wall {
  fill: none;
  stroke: var(--breath-fill);
  stroke-linecap: round;
}

/* ── Wall labels (setup) ───────────────────────────────────────────── */
.breath-wall-label {
  --breath-label-gap: calc(var(--breath-size) / 2 + var(--mg-space-3));
  position: absolute;
  display: grid;
  justify-items: center;
}

.breath-wall-label--bottom {
  top: calc(50% + var(--breath-label-gap));
  left: 50%;
  transform: translateX(-50%);
}

.breath-wall-label--top {
  bottom: calc(50% + var(--breath-label-gap));
  left: 50%;
  transform: translateX(-50%);
}

.breath-wall-label--left {
  top: 50%;
  right: calc(50% + var(--breath-label-gap));
  transform: translateY(-50%);
}

.breath-wall-label--right {
  top: 50%;
  left: calc(50% + var(--breath-label-gap));
  transform: translateY(-50%);
}

.breath-wall-label__name {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
  white-space: nowrap;
}

/* ── Stepper: just the value; −/+ appear on hover or focus ─────────── */
.breath-stepper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.breath-stepper__value {
  padding: 0 var(--mg-space-1);
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-md);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.breath-stepper__button {
  position: absolute;
  top: 50%;
  display: inline-grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 0;
  border-radius: var(--mg-radius-pill);
  color: var(--mg-color-primary);
  background: transparent;
  font-size: var(--mg-font-size-md);
  opacity: 0;
  cursor: pointer;
  transform: translateY(-50%);
  transition:
    opacity var(--mg-duration-fast) ease,
    background var(--mg-duration-fast) ease;
}

.breath-stepper__button:first-child {
  right: 100%;
}

.breath-stepper__button:last-child {
  left: 100%;
}

.breath-wall-label:hover .breath-stepper__button,
.breath-stepper:hover .breath-stepper__button,
.breath-stepper:focus-within .breath-stepper__button {
  opacity: 1;
}

.breath-stepper__button:hover:not(:disabled) {
  background: var(--mg-color-paper);
}

.breath-stepper__button:focus-visible {
  outline: none;
  box-shadow: var(--mg-focus-ring);
}

.breath-stepper .breath-stepper__button:disabled {
  opacity: 0;
  cursor: default;
}

/* ── Centre (never turns with the square) ──────────────────────────── */
.breath-center {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: var(--mg-space-2);
  pointer-events: none;
  text-align: center;
}

.breath-center > * {
  pointer-events: auto;
}

.breath-center__count {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-2xl);
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.breath--done .breath-center__count {
  font-size: var(--mg-font-size-lg);
}

.breath-center__phase {
  min-height: 1.2em;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
}

/* ── Running / done ────────────────────────────────────────────────── */
.breath-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--mg-space-1);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.breath-controls__meta {
  margin-right: var(--mg-space-3);
}

.breath-complete {
  margin: 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .breath-square,
  .breath-square__svg,
  .breath-square__track {
    transition: none;
  }
}
</style>
