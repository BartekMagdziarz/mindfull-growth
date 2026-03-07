<template>
  <div class="relative">
    <svg
      :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
      class="w-full h-auto overflow-visible"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      :aria-label="`Mountain Range timeline with ${peaks.length} peaks and ${valleys.length} valleys`"
    >
      <defs>
        <linearGradient id="peak-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgb(var(--color-primary))" stop-opacity="0.25" />
          <stop offset="100%" stop-color="rgb(var(--color-primary))" stop-opacity="0.05" />
        </linearGradient>
        <linearGradient id="valley-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgb(var(--color-on-surface-variant))" stop-opacity="0.05" />
          <stop offset="100%" stop-color="rgb(var(--color-on-surface-variant))" stop-opacity="0.2" />
        </linearGradient>
      </defs>

      <!-- Centerline -->
      <line
        :x1="padding"
        :y1="centerY"
        :x2="svgWidth - padding"
        :y2="centerY"
        class="stroke-outline/20"
        stroke-width="1"
        stroke-dasharray="4 4"
      />

      <!-- Peak area fill -->
      <path
        v-if="peakPath"
        :d="peakAreaPath"
        fill="url(#peak-fill)"
      />

      <!-- Valley area fill -->
      <path
        v-if="valleyPath"
        :d="valleyAreaPath"
        fill="url(#valley-fill)"
      />

      <!-- Peak curve -->
      <path
        v-if="peakPath"
        :d="peakPath"
        fill="none"
        class="stroke-primary"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />

      <!-- Valley curve -->
      <path
        v-if="valleyPath"
        :d="valleyPath"
        fill="none"
        class="stroke-on-surface-variant/50"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />

      <!-- Time axis labels -->
      <text
        v-for="tick in axisTicks"
        :key="`tick-${tick.value}`"
        :x="tick.x"
        :y="centerY + 14"
        text-anchor="middle"
        class="fill-on-surface-variant select-none"
        style="font-size: 9px"
      >
        {{ tick.value }}
      </text>

      <!-- Event points -->
      <g
        v-for="pt in plotPoints"
        :key="pt.event.id"
        class="cursor-pointer"
        @click="$emit('select', pt.event.id)"
      >
        <circle
          :cx="pt.x"
          :cy="pt.y"
          :r="selectedEventId === pt.event.id ? 7 : 5"
          :fill="pt.color"
          :class="selectedEventId === pt.event.id ? 'stroke-primary' : 'stroke-surface'"
          :stroke-width="selectedEventId === pt.event.id ? 2.5 : 1.5"
        />
        <text
          :x="pt.x"
          :y="pt.event.type === 'peak' ? pt.y - 10 : pt.y + 16"
          text-anchor="middle"
          class="fill-on-surface select-none"
          style="font-size: 9px"
        >
          {{ truncate(pt.event.description, 18) }}
        </text>
      </g>

      <!-- Peak / Valley labels -->
      <text
        :x="padding + 4"
        :y="padding + 12"
        class="fill-primary/60 select-none font-medium"
        style="font-size: 10px"
      >
        {{ t('exerciseWizards.mountainRange.timelineLabels.peaks') }}
      </text>
      <text
        :x="padding + 4"
        :y="svgHeight - padding - 4"
        class="fill-on-surface-variant/50 select-none font-medium"
        style="font-size: 10px"
      >
        {{ t('exerciseWizards.mountainRange.timelineLabels.valleys') }}
      </text>
    </svg>

    <!-- Selected event detail panel -->
    <div
      v-if="selectedEvent"
      class="neo-panel p-4 mt-3"
    >
      <div class="flex items-center gap-2 mb-2">
        <span
          class="neo-pill text-xs"
          :class="selectedEvent.type === 'peak' ? 'text-primary' : 'text-on-surface-variant'"
        >
          {{ selectedEvent.type === 'peak' ? t('exerciseWizards.mountainRange.timelineLabels.peak') : t('exerciseWizards.mountainRange.timelineLabels.valley') }}
        </span>
        <span class="text-xs text-on-surface-variant">{{ t('exerciseWizards.mountainRange.timelineLabels.age', { age: selectedEvent.ageOrYear }) }}</span>
      </div>
      <p class="text-sm text-on-surface">{{ selectedEvent.description }}</p>
      <p v-if="selectedEvent.reflection" class="text-xs text-on-surface-variant mt-2 italic">
        {{ selectedEvent.reflection }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MountainRangeEvent } from '@/domain/exercises'
import { useEmotionStore } from '@/stores/emotion.store'
import { getQuadrant } from '@/domain/emotion'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = withDefaults(
  defineProps<{
    events: MountainRangeEvent[]
    selectedEventId?: string
  }>(),
  {
    selectedEventId: undefined,
  },
)

defineEmits<{
  select: [id: string]
}>()

const emotionStore = useEmotionStore()

const svgWidth = 600
const svgHeight = 280
const padding = 40
const centerY = svgHeight / 2

const peaks = computed(() => props.events.filter((e) => e.type === 'peak'))
const valleys = computed(() => props.events.filter((e) => e.type === 'valley'))

const sortedEvents = computed(() => [...props.events].sort((a, b) => a.ageOrYear - b.ageOrYear))

const minAge = computed(() => {
  if (sortedEvents.value.length === 0) return 0
  return Math.min(...sortedEvents.value.map((e) => e.ageOrYear))
})

const maxAge = computed(() => {
  if (sortedEvents.value.length === 0) return 100
  return Math.max(...sortedEvents.value.map((e) => e.ageOrYear))
})

const ageRange = computed(() => Math.max(1, maxAge.value - minAge.value))

function ageToX(age: number): number {
  const usableWidth = svgWidth - padding * 2
  return padding + ((age - minAge.value) / ageRange.value) * usableWidth
}

const peakOffsets = [0.7, 0.9, 0.5, 0.8, 0.6, 0.75, 0.65]
const valleyOffsets = [0.7, 0.9, 0.5, 0.8, 0.6, 0.75, 0.65]

function eventToY(event: MountainRangeEvent, indexInType: number): number {
  const halfHeight = centerY - padding
  if (event.type === 'peak') {
    const offset = peakOffsets[indexInType % peakOffsets.length]
    return centerY - halfHeight * offset
  } else {
    const offset = valleyOffsets[indexInType % valleyOffsets.length]
    return centerY + halfHeight * offset
  }
}

function getEventColor(event: MountainRangeEvent): string {
  if (event.emotionIds && event.emotionIds.length > 0) {
    const emotion = emotionStore.getEmotionById(event.emotionIds[0])
    if (emotion) {
      const quadrant = getQuadrant(emotion)
      return `var(--color-quadrant-${quadrant})`
    }
  }
  return event.type === 'peak'
    ? 'rgb(var(--color-primary))'
    : 'rgb(var(--color-on-surface-variant))'
}

const plotPoints = computed(() => {
  let peakIdx = 0
  let valleyIdx = 0
  return sortedEvents.value.map((event) => {
    const idx = event.type === 'peak' ? peakIdx++ : valleyIdx++
    return {
      event,
      x: ageToX(event.ageOrYear),
      y: eventToY(event, idx),
      color: getEventColor(event),
    }
  })
})

const sortedPeakPoints = computed(() =>
  plotPoints.value.filter((p) => p.event.type === 'peak').sort((a, b) => a.x - b.x),
)

const sortedValleyPoints = computed(() =>
  plotPoints.value.filter((p) => p.event.type === 'valley').sort((a, b) => a.x - b.x),
)

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cpx = (prev.x + curr.x) / 2
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`
  }
  return d
}

const peakPath = computed(() => buildSmoothPath(sortedPeakPoints.value))
const valleyPath = computed(() => buildSmoothPath(sortedValleyPoints.value))

const peakAreaPath = computed(() => {
  if (sortedPeakPoints.value.length === 0) return ''
  const curve = peakPath.value
  const first = sortedPeakPoints.value[0]
  const last = sortedPeakPoints.value[sortedPeakPoints.value.length - 1]
  return `${curve} L ${last.x} ${centerY} L ${first.x} ${centerY} Z`
})

const valleyAreaPath = computed(() => {
  if (sortedValleyPoints.value.length === 0) return ''
  const curve = valleyPath.value
  const first = sortedValleyPoints.value[0]
  const last = sortedValleyPoints.value[sortedValleyPoints.value.length - 1]
  return `${curve} L ${last.x} ${centerY} L ${first.x} ${centerY} Z`
})

const axisTicks = computed(() => {
  if (sortedEvents.value.length === 0) return []
  const ages = [...new Set(sortedEvents.value.map((e) => e.ageOrYear))].sort((a, b) => a - b)
  return ages.map((age) => ({ value: age, x: ageToX(age) }))
})

const selectedEvent = computed(() => {
  if (!props.selectedEventId) return null
  return props.events.find((e) => e.id === props.selectedEventId) ?? null
})

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + '\u2026'
}
</script>
