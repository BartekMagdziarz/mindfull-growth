<template>
  <div class="relative" :style="{ width: '100%', margin: '0 auto' }">
    <svg
      :viewBox="`0 0 ${outerSize} ${outerSize}`"
      class="w-full h-auto overflow-visible"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="wheel-fill-gradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgb(var(--color-primary))" stop-opacity="0.05" />
          <stop offset="100%" stop-color="rgb(var(--color-primary))" stop-opacity="0.25" />
        </radialGradient>
        <radialGradient id="wheel-comparison-gradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgb(var(--color-on-surface-variant))" stop-opacity="0.02" />
          <stop offset="100%" stop-color="rgb(var(--color-on-surface-variant))" stop-opacity="0.1" />
        </radialGradient>
      </defs>

      <!-- Concentric reference circles -->
      <circle
        v-for="level in 10"
        :key="`ring-${level}`"
        :cx="center"
        :cy="center"
        :r="(level / 10) * maxRadius"
        fill="none"
        class="stroke-outline/10"
        stroke-width="0.5"
        :stroke-dasharray="level === 5 || level === 10 ? 'none' : '2 4'"
      />

      <!-- Radial axis lines -->
      <line
        v-for="(_, i) in areas"
        :key="`axis-${i}`"
        :x1="center"
        :y1="center"
        :x2="getPoint(i, 10).x"
        :y2="getPoint(i, 10).y"
        :class="isHighlighted(i) ? 'stroke-primary/40' : 'stroke-outline/15'"
        :stroke-width="isHighlighted(i) ? 1.4 : 0.5"
      />

      <!-- Highlighted slice -->
      <path
        v-if="highlightedIndex !== null"
        :d="getSlicePath(highlightedIndex)"
        fill="rgb(var(--color-primary))"
        fill-opacity="0.05"
      />
      <path
        v-if="highlightedIndex !== null && highlightedRadius > 0"
        :d="getSlicePath(highlightedIndex, highlightedRadius)"
        fill="rgb(var(--color-primary))"
        fill-opacity="0.18"
        stroke="rgb(var(--color-primary))"
        stroke-opacity="0.25"
        stroke-width="1"
      />

      <!-- Comparison shape (behind current) -->
      <polygon
        v-if="comparisonAreas && comparisonAreas.length > 0"
        :points="comparisonPolygonPoints"
        fill="url(#wheel-comparison-gradient)"
        class="stroke-on-surface-variant/30"
        stroke-width="1.5"
        stroke-dasharray="4 3"
        stroke-linejoin="round"
      />

      <!-- Current shape -->
      <polygon
        v-if="areas.length > 0"
        :points="displayPolygonPoints"
        fill="url(#wheel-fill-gradient)"
        class="stroke-primary"
        stroke-width="2"
        stroke-linejoin="round"
      />

      <!-- Rating dots on current shape -->
      <circle
        v-for="(area, i) in areas"
        :key="`dot-${i}`"
        :cx="getAnimatedPoint(i).x"
        :cy="getAnimatedPoint(i).y"
        :r="isHighlighted(i) ? 5 : 4"
        :class="[getDotColor(area.rating), isHighlighted(i) ? 'stroke-primary-strong' : 'stroke-surface']"
        :stroke-width="isHighlighted(i) ? 2 : 1.5"
      />

      <!-- Comparison dots -->
      <circle
        v-for="(_, i) in (comparisonAreas ?? [])"
        :key="`comp-dot-${i}`"
        :cx="getComparisonPoint(i).x"
        :cy="getComparisonPoint(i).y"
        r="3"
        class="fill-on-surface-variant/40 stroke-surface"
        stroke-width="1"
      />

      <!-- Area labels -->
      <text
        v-for="(_area, i) in areas"
        :key="`label-${i}`"
        :x="getLabelPosition(i).x"
        :y="getLabelPosition(i).y"
        :text-anchor="getLabelAnchor(i)"
        :dominant-baseline="getLabelBaselineForIndex(i)"
        :style="{ fontSize: labelFontSize }"
        :class="[
          'select-none',
          isHighlighted(i) ? 'fill-primary-strong font-semibold' : 'fill-on-surface font-medium',
        ]"
      >
        <tspan
          v-for="(line, lineIndex) in labelLines[i]"
          :key="`label-${i}-${lineIndex}`"
          :x="getLabelPosition(i).x"
          :dy="getLabelLineDy(lineIndex, labelLines[i].length)"
        >
          {{ line }}
        </tspan>
      </text>

      <!-- Rating labels -->
      <text
        v-for="(area, i) in areas"
        :key="`rating-${i}`"
        :x="getRatingLabelPosition(i).x"
        :y="getRatingLabelPosition(i).y"
        :text-anchor="getLabelAnchor(i)"
        :dominant-baseline="getLabelBaseline(i)"
        :style="{ fontSize: ratingFontSize }"
        :class="[
          getRatingTextColor(area.rating),
          isHighlighted(i) ? 'font-bold' : 'font-semibold',
          'select-none',
        ]"
      >
        {{ area.rating }}
      </text>
    </svg>

    <!-- Tooltip -->
    <div
      v-if="hoveredArea !== null"
      class="absolute z-10 px-3 py-2 rounded-xl bg-surface border border-neu-border/30 text-xs pointer-events-none"
      :style="tooltipStyle"
    >
      <div class="font-semibold text-on-surface">{{ areas[hoveredArea].name }}</div>
      <div class="text-on-surface-variant">{{ areas[hoveredArea].rating }}/10</div>
      <div v-if="areas[hoveredArea].rating <= 4" class="text-amber-600 mt-1">
        {{ t('exerciseWizards.wheelOfLife.comparison.attentionHint') }}
      </div>
      <div v-if="getComparisonDelta(hoveredArea) !== null" class="mt-1">
        <span v-if="getComparisonDelta(hoveredArea)! > 0" class="text-green-600">
          {{ t('exerciseWizards.wheelOfLife.comparison.fromPrevious', { delta: getComparisonDelta(hoveredArea)! }) }}
        </span>
        <span v-else-if="getComparisonDelta(hoveredArea)! < 0" class="text-error">
          {{ t('exerciseWizards.wheelOfLife.comparison.fromPreviousNegative', { delta: getComparisonDelta(hoveredArea)! }) }}
        </span>
        <span v-else class="text-on-surface-variant">{{ t('exerciseWizards.wheelOfLife.comparison.noChange') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import type { WheelOfLifeArea } from '@/domain/exercises'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = withDefaults(
  defineProps<{
    areas: WheelOfLifeArea[]
    comparisonAreas?: WheelOfLifeArea[]
    animated?: boolean
    size?: number
    padding?: number
    highlightIndex?: number | null
    highlightName?: string
    labelFontSize?: number
    ratingFontSize?: number
  }>(),
  {
    comparisonAreas: undefined,
    animated: false,
    size: 400,
    padding: 0,
    highlightIndex: null,
    highlightName: undefined,
    labelFontSize: 11,
    ratingFontSize: 10,
  },
)

const safePadding = computed(() => Math.max(28, props.padding))
const outerSize = computed(() => props.size + safePadding.value * 2)
const outerRadius = computed(() => outerSize.value / 2)
const center = computed(() => outerRadius.value)
const maxRadius = computed(() => props.size / 2)
const labelGapBase = computed(() => {
  const scaled = props.size * 0.014
  return Math.max(5, Math.min(8, scaled))
})
const labelGapPerLine = 3
const ratingInset = computed(() => {
  const scaled = props.size * 0.055
  return Math.max(16, Math.min(24, scaled))
})
const sliceAngle = computed(() => (props.areas.length > 0 ? (2 * Math.PI) / props.areas.length : 0))
const labelFontSize = computed(() => `${props.labelFontSize}px`)
const ratingFontSize = computed(() => `${props.ratingFontSize}px`)

const highlightedIndex = computed(() => {
  if (props.highlightIndex !== null && props.highlightIndex !== undefined) {
    if (props.highlightIndex < 0 || props.highlightIndex >= props.areas.length) return null
    return props.highlightIndex
  }
  if (props.highlightName) {
    const idx = props.areas.findIndex((a) => a.name === props.highlightName)
    return idx >= 0 ? idx : null
  }
  return null
})

const highlightedRating = computed(() => {
  if (highlightedIndex.value === null) return null
  return props.areas[highlightedIndex.value]?.rating ?? null
})

const highlightedRadius = computed(() => {
  if (highlightedRating.value === null) return 0
  return (highlightedRating.value / 10) * maxRadius.value
})

const labelLines = computed(() => props.areas.map((area) => wrapLabel(area.name)))

const hoveredArea = ref<number | null>(null)
const tooltipStyle = ref({})

// Animation state
const animatedRatings = ref<number[]>([])
const animationFrame = ref<number | null>(null)

function initAnimatedRatings() {
  if (props.animated) {
    animatedRatings.value = props.areas.map(() => 0)
  } else {
    animatedRatings.value = props.areas.map((a) => a.rating)
  }
}

onMounted(() => {
  initAnimatedRatings()
  if (props.animated) {
    animateIn()
  }
})

watch(
  () => props.areas.map((a) => a.rating),
  (newRatings) => {
    if (!props.animated) {
      animatedRatings.value = [...newRatings]
      return
    }
    animateTo(newRatings)
  },
)

function animateIn() {
  const targets = props.areas.map((a) => a.rating)
  animateTo(targets)
}

function animateTo(targets: number[]) {
  if (animationFrame.value) cancelAnimationFrame(animationFrame.value)

  const start = [...animatedRatings.value]
  // Pad start array if areas were added
  while (start.length < targets.length) start.push(0)

  const duration = 600
  const startTime = performance.now()

  function tick(now: number) {
    const elapsed = now - startTime
    const t = Math.min(elapsed / duration, 1)
    const ease = 1 - Math.pow(1 - t, 3) // ease-out cubic

    animatedRatings.value = targets.map((target, i) => {
      const from = start[i] ?? 0
      return from + (target - from) * ease
    })

    if (t < 1) {
      animationFrame.value = requestAnimationFrame(tick)
    }
  }

  animationFrame.value = requestAnimationFrame(tick)
}

function getAngle(index: number): number {
  const count = props.areas.length
  if (count === 0) return 0
  return (2 * Math.PI * index) / count - Math.PI / 2
}

function getPoint(index: number, rating: number): { x: number; y: number } {
  const angle = getAngle(index)
  const r = (rating / 10) * maxRadius.value
  return {
    x: center.value + r * Math.cos(angle),
    y: center.value + r * Math.sin(angle),
  }
}

function getAnimatedPoint(index: number): { x: number; y: number } {
  const rating = animatedRatings.value[index] ?? 0
  return getPoint(index, rating)
}

function getComparisonPoint(index: number): { x: number; y: number } {
  const area = props.comparisonAreas?.[index]
  return getPoint(index, area?.rating ?? 0)
}

function getLabelPosition(index: number): { x: number; y: number } {
  const angle = getAngle(index)
  const lines = labelLines.value[index]?.length ?? 1
  const labelRadius = maxRadius.value + labelGapBase.value + (lines - 1) * labelGapPerLine
  return {
    x: center.value + labelRadius * Math.cos(angle),
    y: center.value + labelRadius * Math.sin(angle),
  }
}

function getRatingLabelPosition(index: number): { x: number; y: number } {
  const angle = getAngle(index)
  const radius = Math.max(0, maxRadius.value - ratingInset.value)
  return {
    x: center.value + radius * Math.cos(angle),
    y: center.value + radius * Math.sin(angle),
  }
}

function getLabelAnchor(index: number): string {
  const angle = getAngle(index)
  const cos = Math.cos(angle)
  if (Math.abs(cos) < 0.1) return 'middle'
  return cos > 0 ? 'start' : 'end'
}

function getLabelBaseline(index: number): string {
  const angle = getAngle(index)
  const sin = Math.sin(angle)
  if (Math.abs(sin) < 0.1) return 'middle'
  return sin > 0 ? 'hanging' : 'auto'
}

function getLabelBaselineForIndex(index: number): string {
  const lines = labelLines.value[index] ?? []
  if (lines.length > 1) return 'middle'
  return getLabelBaseline(index)
}

function getLabelLineDy(lineIndex: number, total: number): string {
  if (total <= 1) return '0'
  const lineHeight = 1.05
  if (lineIndex === 0) return `${-(total - 1) * (lineHeight / 2)}em`
  return `${lineHeight}em`
}

function wrapLabel(label: string): string[] {
  const trimmed = label.trim()
  if (trimmed.length <= 16) return [trimmed]

  const words = trimmed.split(' ')
  if (words.length <= 1) return [trimmed]

  const totalLength = trimmed.length
  const target = totalLength / 2
  let bestIndex = -1
  let bestDistance = Number.POSITIVE_INFINITY

  let running = 0
  for (let i = 0; i < words.length - 1; i += 1) {
    running += words[i].length + (i > 0 ? 1 : 0)
    const distance = Math.abs(running - target)
    if (distance < bestDistance && running > 6 && running < totalLength - 6) {
      bestDistance = distance
      bestIndex = i
    }
  }

  if (bestIndex === -1) return [trimmed]

  const firstLine = words.slice(0, bestIndex + 1).join(' ')
  const secondLine = words.slice(bestIndex + 1).join(' ')
  return [firstLine, secondLine]
}

function getSlicePath(index: number, radius = maxRadius.value): string {
  if (props.areas.length === 0 || sliceAngle.value === 0) return ''
  const angle = getAngle(index)
  const start = angle - sliceAngle.value / 2
  const end = angle + sliceAngle.value / 2
  const startPoint = {
    x: center.value + radius * Math.cos(start),
    y: center.value + radius * Math.sin(start),
  }
  const endPoint = {
    x: center.value + radius * Math.cos(end),
    y: center.value + radius * Math.sin(end),
  }
  const largeArc = sliceAngle.value > Math.PI ? 1 : 0
  return `M ${center.value} ${center.value} L ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y} Z`
}

function isHighlighted(index: number): boolean {
  return highlightedIndex.value === index
}

const displayPolygonPoints = computed(() => {
  return props.areas
    .map((_, i) => {
      const p = getAnimatedPoint(i)
      return `${p.x},${p.y}`
    })
    .join(' ')
})

const comparisonPolygonPoints = computed(() => {
  if (!props.comparisonAreas) return ''
  return props.comparisonAreas
    .map((_, i) => {
      const p = getComparisonPoint(i)
      return `${p.x},${p.y}`
    })
    .join(' ')
})

function getDotColor(rating: number): string {
  if (rating >= 8) return 'fill-green-500'
  if (rating >= 6) return 'fill-primary'
  if (rating >= 4) return 'fill-amber-500'
  return 'fill-error'
}

function getRatingTextColor(rating: number): string {
  if (rating >= 8) return 'fill-green-600'
  if (rating >= 6) return 'fill-primary'
  if (rating >= 4) return 'fill-amber-600'
  return 'fill-error'
}

function getComparisonDelta(index: number): number | null {
  if (!props.comparisonAreas) return null
  const comp = props.comparisonAreas.find((a) => a.name === props.areas[index]?.name)
  if (!comp) return null
  return props.areas[index].rating - comp.rating
}
</script>
