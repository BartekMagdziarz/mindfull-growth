<template>
  <article class="em-card neo-raised flex flex-col gap-[10px] p-3">
    <header class="em-card__head">
      <button
        type="button"
        class="em-card__label"
        @click="router.push('/emotions')"
      >
        {{ t('planning.today.wellness.emotions') }}
      </button>
      <button
        v-if="targetReached"
        type="button"
        class="em-card__addbtn neo-focus"
        :aria-label="t('planning.calendar.wellness.logEmotion')"
        @click.stop="router.push({ name: 'emotions-edit' })"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </header>

    <div class="em-donut">
      <button
        type="button"
        class="em-donut__btn neo-focus"
        :aria-label="logs.length === 0
          ? t('planning.today.wellness.ariaEmotionsDonutEmpty')
          : t('planning.today.wellness.ariaEmotionsDonut', { done: logs.length, target })"
        @click="router.push({ name: 'emotions-edit' })"
      >
        <svg
          class="em-donut__svg"
          :width="DONUT_SIZE"
          :height="DONUT_SIZE"
          :viewBox="`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`"
          aria-hidden="true"
        >
          <defs>
            <filter id="em-arc-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="0.6" stdDeviation="0.5" flood-color="#1e2b40" flood-opacity="0.22" />
            </filter>
          </defs>
          <path
            v-for="track in donutPaths.tracks"
            :key="track.key"
            :d="track.d"
            fill="none"
            stroke="rgb(var(--neo-border))"
            stroke-opacity="0.18"
            :stroke-width="DONUT_STROKE"
            stroke-linecap="butt"
          />
          <g filter="url(#em-arc-shadow)">
            <path
              v-for="arc in donutPaths.arcs"
              :key="arc.key"
              :d="arc.d"
              fill="none"
              :stroke="arc.color"
              :stroke-width="DONUT_STROKE"
              stroke-linecap="butt"
            />
          </g>
        </svg>
        <span
          class="em-donut__center"
          :class="{ 'em-donut__center--empty': logs.length === 0 }"
        >
          {{ logs.length }}/{{ target }}
        </span>
      </button>
    </div>

    <div class="streak-badges">
      <div
        class="streak-badge streak-badge--count"
        :class="{ 'streak-badge--zero': logs7d === 0 }"
        :title="t('planning.today.wellness.ariaLogsCount')"
        role="status"
        :aria-label="`${logs7d} ${t('planning.today.wellness.badgeLogs')}`"
      >
        <span class="streak-badge__num streak-badge__num--big">{{ logs7d }}</span>
        <span class="streak-badge__lbl">{{ t('planning.today.wellness.badgeLogs') }}</span>
      </div>

      <div
        class="streak-badge streak-badge--streak"
        :class="{ 'streak-badge--zero': weekStreak === 0 }"
        :title="t('planning.today.wellness.ariaWeeklyStreak')"
        role="status"
        :aria-label="`${weekStreak} ${t('planning.today.wellness.badgeWeeks')}`"
      >
        <div class="streak-badge__row">
          <span class="streak-badge__icon streak-badge__icon--big">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3c1 4 5 5 5 10a5 5 0 1 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-6 1-9z" />
            </svg>
          </span>
          <span class="streak-badge__num">{{ weekStreak }}</span>
        </div>
        <span class="streak-badge__lbl">{{ t('planning.today.wellness.badgeWeeks') }}</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useT } from '@/composables/useT'
import type { Quadrant } from '@/domain/emotion'

export interface EmotionDonutLog {
  quadrants: Partial<Record<Quadrant, number>>
}

const props = defineProps<{
  target: number
  logs: EmotionDonutLog[]
  logs7d: number
  weekStreak: number
}>()

const router = useRouter()
const { t } = useT()

const DONUT_SIZE = 88
const DONUT_STROKE = 8

const QUADRANT_ORDER: Quadrant[] = [
  'high-energy-high-pleasantness',
  'high-energy-low-pleasantness',
  'low-energy-high-pleasantness',
  'low-energy-low-pleasantness',
]

// Donut arcs use the muted `-bottom` token (same base as selector buttons),
// not the saturated `-selected` accent — keeps the chart in line with the
// rest of the muted aesthetic instead of reading as a vivid Bootstrap-blue
// graph on an otherwise pastel surface.
const QUADRANT_COLOR: Record<Quadrant, string> = {
  'high-energy-high-pleasantness': 'var(--color-quadrant-high-energy-high-pleasantness-bottom)',
  'high-energy-low-pleasantness': 'var(--color-quadrant-high-energy-low-pleasantness-bottom)',
  'low-energy-high-pleasantness': 'var(--color-quadrant-low-energy-high-pleasantness-bottom)',
  'low-energy-low-pleasantness': 'var(--color-quadrant-low-energy-low-pleasantness-bottom)',
}

const targetReached = computed(() => props.logs.length >= props.target)

interface DonutArc {
  key: string
  d: string
  color: string
}

interface DonutTrack {
  key: string
  d: string
}

// Donut split into `target` equal arcs, each filled with the per-log quadrant
// proportions for that segment. Implemented with explicit <path> A-commands
// so the start angle stays at 12 o'clock and the sweep is clockwise.
const donutPaths = computed<{ tracks: DonutTrack[]; arcs: DonutArc[] }>(() => {
  const tracks: DonutTrack[] = []
  const arcs: DonutArc[] = []

  const R = (DONUT_SIZE - DONUT_STROKE) / 2
  const cx = DONUT_SIZE / 2
  const cy = DONUT_SIZE / 2
  const segDeg = 360 / props.target
  const gapDeg = Math.min(10, segDeg * 0.1)
  const usableDeg = segDeg - gapDeg

  const pointAt = (deg: number): [number, number] => {
    const rad = ((deg - 90) * Math.PI) / 180
    return [cx + R * Math.cos(rad), cy + R * Math.sin(rad)]
  }

  const arcPath = (startDeg: number, endDeg: number): string => {
    const [x1, y1] = pointAt(startDeg)
    const [x2, y2] = pointAt(endDeg)
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`
  }

  for (let i = 0; i < props.target; i++) {
    const segStart = i * segDeg + gapDeg / 2
    const segEnd = segStart + usableDeg
    const log = props.logs[i]

    if (!log) {
      tracks.push({ key: `track-${i}`, d: arcPath(segStart, segEnd) })
      continue
    }

    const total = QUADRANT_ORDER.reduce(
      (sum, q) => sum + (log.quadrants[q] ?? 0),
      0,
    ) || 1

    let cursor = segStart
    for (const q of QUADRANT_ORDER) {
      const weight = (log.quadrants[q] ?? 0) / total
      if (weight <= 0) continue
      const subDeg = weight * usableDeg
      arcs.push({
        key: `${i}-${q}`,
        d: arcPath(cursor, cursor + subDeg),
        color: QUADRANT_COLOR[q],
      })
      cursor += subDeg
    }
  }

  return { tracks, arcs }
})
</script>

<style scoped>
.em-card {
  border-radius: 1.4rem;
}

.em-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 22px;
}

.em-card__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: rgb(var(--neo-muted));
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: color 200ms ease;
}
.em-card__label:hover {
  color: rgb(var(--color-primary));
}

.em-card__addbtn {
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.8),
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.33);
  display: grid;
  place-items: center;
  color: rgb(var(--neo-muted) / 0.8);
  opacity: 0.85;
  transition: opacity 200ms ease, color 200ms ease;
  border: none;
  cursor: pointer;
}
.em-card__addbtn:hover {
  opacity: 1;
  color: rgb(var(--color-primary-strong));
}

.em-donut {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 0 2px;
}

.em-donut__btn {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  transition: transform 200ms ease;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}
.em-donut__btn:hover {
  transform: translateY(-1px);
}
.em-donut__btn:active {
  transform: translateY(0);
}

.em-donut__svg {
  position: absolute;
  inset: 0;
}

.em-donut__center {
  position: relative;
  z-index: 1;
  font-size: 20px;
  font-weight: 700;
  color: rgb(var(--neo-text));
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1;
}
.em-donut__center--empty {
  color: rgb(var(--neo-muted) / 0.7);
  font-weight: 500;
}

.streak-badges {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 0 2px;
  margin-top: auto;
}

.streak-badge {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom)));
  box-shadow:
    -2px -2px 4px rgb(var(--neo-shadow-light) / 0.85),
    2px 2px 4px rgb(var(--neo-shadow-dark) / 0.28),
    inset 0 1px 0 rgb(255 255 255 / 0.35);
  border: 1px solid rgb(var(--neo-border) / 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  flex: 0 0 auto;
  transition: opacity 200ms ease;
}
.streak-badge--zero { opacity: 0.45; }

.streak-badge__row {
  display: flex;
  align-items: center;
  gap: 2px;
  line-height: 1;
}

.streak-badge__icon {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.streak-badge__icon--big {
  width: 22px;
  height: 22px;
  color: rgb(217 119 6);
}

.streak-badge__num {
  font-size: 15px;
  font-weight: 700;
  color: rgb(var(--neo-text));
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
  line-height: 1;
}
.streak-badge__num--big {
  font-size: 22px;
  letter-spacing: -0.04em;
}

.streak-badge__lbl {
  font-size: 7.5px;
  font-weight: 500;
  color: rgb(var(--neo-muted));
  letter-spacing: 0.06em;
  text-transform: lowercase;
  line-height: 1;
  margin-top: 1px;
}
</style>
