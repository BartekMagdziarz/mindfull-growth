<template>
  <div class="flex flex-col items-center gap-4">
    <div class="neo-surface rounded-2xl p-4">
      <svg
        :width="svgSize"
        :height="svgSize"
        :viewBox="`0 0 ${svgSize} ${svgSize}`"
        class="block"
      >
        <!-- Background segments -->
        <path
          v-for="(quality, index) in qualities"
          :key="quality"
          :d="segmentPath(index, 5)"
          :fill="segmentColor(quality, 0.15)"
          :stroke="segmentColor(quality, 0.3)"
          stroke-width="1"
        />
        <!-- Filled segments based on rating -->
        <path
          v-for="(quality, index) in qualities"
          :key="`fill-${quality}`"
          :d="segmentPath(index, ratings[quality] ?? 0)"
          :fill="segmentColor(quality, 0.5)"
          :stroke="segmentColor(quality, 0.7)"
          stroke-width="1.5"
          :class="interactive ? 'cursor-pointer' : ''"
          @click="interactive && selectQuality(quality)"
        />
        <!-- Labels -->
        <text
          v-for="(quality, index) in qualities"
          :key="`label-${quality}`"
          :x="labelPosition(index).x"
          :y="labelPosition(index).y"
          text-anchor="middle"
          dominant-baseline="middle"
          class="fill-on-surface text-[10px] font-medium pointer-events-none select-none"
        >
          {{ qualityLabels[quality] }}
        </text>
        <!-- Center circle -->
        <circle
          :cx="center"
          :cy="center"
          r="18"
          class="fill-primary/20 stroke-primary"
          stroke-width="1.5"
        />
        <text
          :x="center"
          :y="center"
          text-anchor="middle"
          dominant-baseline="middle"
          class="fill-primary text-[9px] font-bold pointer-events-none select-none"
        >
          {{ t('exerciseWizards.shared.ifs.selfEnergyWheel.center') }}
        </text>
      </svg>
    </div>

    <!-- Rating dots for selected quality -->
    <div v-if="interactive && selectedQuality" class="flex flex-col items-center gap-2">
      <p class="text-sm font-medium text-on-surface capitalize">{{ selectedQuality }}</p>
      <div class="flex gap-2">
        <button
          v-for="n in 5"
          :key="n"
          class="w-8 h-8 rounded-full neo-focus transition-all"
          :class="[
            (ratings[selectedQuality] ?? 0) >= n
              ? 'neo-surface shadow-neu-raised-sm bg-primary/30 text-primary'
              : 'neo-surface shadow-neu-pressed text-on-surface-variant/40',
          ]"
          @click="setRating(selectedQuality, n)"
        >
          {{ n }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useT } from '@/composables/useT'
import type { SelfEnergyQuality } from '@/domain/exercises'

const { t } = useT()

const props = withDefaults(
  defineProps<{
    ratings: Record<SelfEnergyQuality, number>
    interactive?: boolean
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    interactive: false,
    size: 'md',
  },
)

const emit = defineEmits<{
  'update:ratings': [ratings: Record<SelfEnergyQuality, number>]
}>()

const qualities: SelfEnergyQuality[] = [
  'calm', 'curiosity', 'compassion', 'clarity',
  'courage', 'creativity', 'confidence', 'connection',
]

const qualityLabels = computed(() => ({
  calm: t('exerciseWizards.shared.ifs.selfEnergyWheel.qualities.calm'),
  curiosity: t('exerciseWizards.shared.ifs.selfEnergyWheel.qualities.curiosity'),
  compassion: t('exerciseWizards.shared.ifs.selfEnergyWheel.qualities.compassion'),
  clarity: t('exerciseWizards.shared.ifs.selfEnergyWheel.qualities.clarity'),
  courage: t('exerciseWizards.shared.ifs.selfEnergyWheel.qualities.courage'),
  creativity: t('exerciseWizards.shared.ifs.selfEnergyWheel.qualities.creativity'),
  confidence: t('exerciseWizards.shared.ifs.selfEnergyWheel.qualities.confidence'),
  connection: t('exerciseWizards.shared.ifs.selfEnergyWheel.qualities.connection'),
}))

const qualityColors: Record<SelfEnergyQuality, string> = {
  calm: '#3b82f6',       // blue
  curiosity: '#8b5cf6',  // violet
  compassion: '#ec4899', // pink
  clarity: '#06b6d4',    // cyan
  courage: '#f97316',    // orange
  creativity: '#eab308', // yellow
  confidence: '#22c55e', // green
  connection: '#14b8a6', // teal
}

const svgSize = computed(() => {
  switch (props.size) {
    case 'sm': return 200
    case 'lg': return 320
    default: return 260
  }
})

const center = computed(() => svgSize.value / 2)
const maxRadius = computed(() => svgSize.value / 2 - 30)

const selectedQuality = ref<SelfEnergyQuality | null>(null)

function segmentColor(quality: SelfEnergyQuality, opacity: number): string {
  const hex = qualityColors[quality]
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

function segmentPath(index: number, rating: number): string {
  const anglePerSegment = (2 * Math.PI) / 8
  const startAngle = index * anglePerSegment - Math.PI / 2
  const endAngle = startAngle + anglePerSegment
  const radius = (rating / 5) * maxRadius.value
  if (radius <= 0) return ''

  const cx = center.value
  const cy = center.value
  const x1 = cx + radius * Math.cos(startAngle)
  const y1 = cy + radius * Math.sin(startAngle)
  const x2 = cx + radius * Math.cos(endAngle)
  const y2 = cy + radius * Math.sin(endAngle)

  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`
}

function labelPosition(index: number): { x: number; y: number } {
  const anglePerSegment = (2 * Math.PI) / 8
  const angle = index * anglePerSegment - Math.PI / 2 + anglePerSegment / 2
  const r = maxRadius.value + 18
  return {
    x: center.value + r * Math.cos(angle),
    y: center.value + r * Math.sin(angle),
  }
}

function selectQuality(quality: SelfEnergyQuality) {
  selectedQuality.value = selectedQuality.value === quality ? null : quality
}

function setRating(quality: SelfEnergyQuality, value: number) {
  const newRatings = { ...props.ratings, [quality]: value }
  emit('update:ratings', newRatings)
}
</script>
