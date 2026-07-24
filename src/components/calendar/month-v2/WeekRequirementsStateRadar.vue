<template>
  <figure class="week-radar" role="img" :aria-label="ariaDescription">
    <div v-if="hasValues" class="week-bars" aria-hidden="true">
      <div class="week-bars__plot">
        <div v-for="axis in axes" :key="axis.key" class="week-bar__axis">
          <span class="week-bar__track" />

          <template v-if="axis.isEqual && axis.requirements !== null">
            <span
              class="week-bar__fill week-bar__fill--equal"
              data-series="requirements"
              :style="barStyle(axis.requirements, false)"
            />
            <span class="week-bar__series-marker" data-series="state" />
          </template>

          <template v-else>
            <span
              v-for="series in axis.orderedSeries"
              :key="series.key"
              class="week-bar__fill"
              :class="[
                `week-bar__fill--${series.key}`,
                series.isBack ? 'week-bar__fill--back' : 'week-bar__fill--front',
                { 'week-bar__fill--single': axis.orderedSeries.length === 1 },
              ]"
              :data-series="series.key"
              :style="barStyle(series.value, series.isBack)"
            />
          </template>
        </div>
      </div>

      <div class="week-bars__labels">
        <span
          v-for="axis in axes"
          :key="`label-${axis.key}`"
          class="week-bar__axis-label"
          :title="areaLabel(axis.key)"
        >
          <span v-if="showLabels" class="week-bar__label">{{ areaLabel(axis.key) }}</span>
          <AppIcon v-else :name="areaIcon(axis.key)" />
        </span>
      </div>
    </div>

    <span v-else class="week-radar__empty" aria-hidden="true">—</span>
    <figcaption class="sr-only">{{ ariaDescription }}</figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  REFLECTION_MATRIX_AREAS,
  areaTitleKey,
  sectionTitleKey,
  type LifeAreaKey,
} from '@/domain/reflectionMatrix'
import type { MonthV2WeeklyRadar } from '@/services/monthV2Overview'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

const props = withDefaults(
  defineProps<{
    radar: MonthV2WeeklyRadar | null
    ariaLabel?: string
    showLabels?: boolean
  }>(),
  { ariaLabel: undefined, showLabels: true }
)

const { t } = useT()
const MAX_RATING = 5

const AREA_ICONS: Record<LifeAreaKey, string> = {
  body: 'accessibility_new',
  emotions: 'favorite',
  tasks: 'checklist',
  closeOnes: 'group',
}

interface AxisSeries {
  key: 'requirements' | 'state'
  value: number
  isBack: boolean
}

interface DisplayAxis {
  key: LifeAreaKey
  requirements: number | null
  state: number | null
  isEqual: boolean
  orderedSeries: AxisSeries[]
}

function safeRating(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.max(0, Math.min(MAX_RATING, value))
}

const axes = computed<DisplayAxis[]>(() => {
  const requirementsByArea = new Map(
    (props.radar?.requirements ?? []).map(axis => [axis.key, safeRating(axis.value)])
  )
  const stateByArea = new Map(
    (props.radar?.state ?? []).map(axis => [axis.key, safeRating(axis.value)])
  )

  return REFLECTION_MATRIX_AREAS.map(area => {
    const requirements = requirementsByArea.get(area.key) ?? null
    const state = stateByArea.get(area.key) ?? null
    const isEqual = requirements !== null && state !== null && requirements === state
    const present = [
      requirements === null ? null : { key: 'requirements' as const, value: requirements },
      state === null ? null : { key: 'state' as const, value: state },
    ]
      .filter((series): series is Omit<AxisSeries, 'isBack'> => series !== null)
      .sort((a, b) => b.value - a.value)

    return {
      key: area.key,
      requirements,
      state,
      isEqual,
      orderedSeries: isEqual
        ? []
        : present.map((series, index) => ({
            ...series,
            isBack: present.length > 1 && index === 0,
          })),
    }
  })
})

const hasValues = computed(() =>
  axes.value.some(axis => axis.requirements !== null || axis.state !== null)
)

function barStyle(value: number, isBack: boolean): Record<string, string | number> {
  return {
    height: `${Math.max(8, (value / MAX_RATING) * 100)}%`,
    zIndex: isBack ? 1 : 2,
  }
}

function areaLabel(key: LifeAreaKey): string {
  return t(areaTitleKey(key))
}

function areaIcon(key: LifeAreaKey): string {
  return AREA_ICONS[key]
}

function formatRating(value: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

const seriesDescription = computed(() => {
  const requirementsLabel = t(sectionTitleKey('demands'))
  const stateLabel = t(sectionTitleKey('state'))
  return axes.value
    .map(
      axis =>
        `${areaLabel(axis.key)}: ${requirementsLabel} ${formatRating(axis.requirements)} / ${MAX_RATING}, ${stateLabel} ${formatRating(axis.state)} / ${MAX_RATING}`
    )
    .join(', ')
})

const ariaDescription = computed(() => {
  const content = hasValues.value
    ? seriesDescription.value
    : t('planning.calendar.monthV2.noReflection')
  return props.ariaLabel ? `${props.ariaLabel}. ${content}` : content
})
</script>

<style scoped>
.week-radar {
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 0;
  min-width: 0;
}

.week-bars {
  display: flex;
  flex-direction: column;
  height: 146px;
  width: 100%;
}

.week-bars__plot,
.week-bars__labels {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.week-bars__plot {
  flex: 1;
  gap: 2px;
  min-height: 0;
  padding: 0 3px;
}

.week-bar__axis {
  align-items: flex-end;
  display: flex;
  height: 100%;
  justify-content: center;
  min-width: 0;
  position: relative;
}

.week-bar__track,
.week-bar__fill,
.week-bar__series-marker {
  bottom: 0;
  position: absolute;
}

.week-bar__track {
  background: rgb(var(--neo-border) / 0.1);
  border-radius: 999px;
  height: 100%;
  width: 15px;
}

.week-bar__fill {
  border-radius: 999px 999px 7px 7px;
  box-shadow: 0 2px 5px rgb(var(--neo-shadow-dark) / 0.05);
  transition: height 220ms ease;
}

.week-bar__fill--back,
.week-bar__fill--single {
  width: 16px;
}

.week-bar__fill--front {
  width: 10px;
}

.week-bar__fill--requirements {
  background: linear-gradient(180deg, rgb(var(--rose-300) / 0.74), rgb(var(--rose-100) / 0.25));
  border: 0.75px solid rgb(var(--rose-400) / 0.18);
}

.week-bar__fill--state {
  background: linear-gradient(180deg, rgb(var(--sky-300) / 0.76), rgb(var(--sky-100) / 0.24));
  border: 0.75px solid rgb(var(--sky-400) / 0.18);
}

.week-bar__fill--equal {
  background: linear-gradient(180deg, rgb(190 170 229 / 0.72), rgb(229 220 247 / 0.24));
  border: 0.75px solid rgb(160 132 211 / 0.16);
  width: 13px;
}

.week-bar__series-marker {
  height: 0;
  opacity: 0;
  width: 0;
}

.week-bars__labels {
  align-items: center;
  min-height: 22px;
  padding: 5px 3px 0;
}

.week-bar__axis-label {
  color: rgb(var(--neo-muted) / 0.7);
  display: flex;
  font-size: 13px;
  justify-content: center;
  min-width: 0;
}

.week-bar__label {
  font-size: 8px;
  line-height: 1.1;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
}

.week-radar__empty {
  color: rgb(var(--neo-muted));
  font-size: 18px;
  font-weight: 620;
  opacity: 0.52;
  padding: 56px 0;
}
</style>
