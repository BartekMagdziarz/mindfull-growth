<template>
  <div class="space-y-3">
    <label v-if="label" class="block text-sm font-medium text-on-surface">{{ label }}</label>
    <div class="neo-surface rounded-2xl p-4 flex justify-center">
      <svg
        width="160"
        height="320"
        viewBox="0 0 160 320"
        class="block"
        role="img"
        :aria-label="t('exerciseWizards.shared.ifs.bodyLocationPicker.ariaLabel')"
      >
        <!-- Simple body silhouette -->
        <!-- Head -->
        <ellipse cx="80" cy="30" rx="20" ry="22" class="fill-neu-border/10 stroke-neu-border/40" stroke-width="1.5" />
        <!-- Neck/Throat -->
        <rect x="72" y="52" width="16" height="12" rx="4" class="fill-neu-border/10 stroke-neu-border/40" stroke-width="1.5" />
        <!-- Shoulders -->
        <path d="M40 72 Q50 64 72 64 L88 64 Q110 64 120 72 L120 82 Q110 76 80 76 Q50 76 40 82 Z" class="fill-neu-border/10 stroke-neu-border/40" stroke-width="1.5" />
        <!-- Torso -->
        <rect x="52" y="76" width="56" height="80" rx="8" class="fill-neu-border/10 stroke-neu-border/40" stroke-width="1.5" />
        <!-- Hips -->
        <rect x="48" y="148" width="64" height="24" rx="8" class="fill-neu-border/10 stroke-neu-border/40" stroke-width="1.5" />
        <!-- Arms -->
        <rect x="24" y="76" width="20" height="70" rx="8" class="fill-neu-border/10 stroke-neu-border/40" stroke-width="1.5" />
        <rect x="116" y="76" width="20" height="70" rx="8" class="fill-neu-border/10 stroke-neu-border/40" stroke-width="1.5" />
        <!-- Hands -->
        <ellipse cx="34" cy="156" rx="12" ry="10" class="fill-neu-border/10 stroke-neu-border/40" stroke-width="1.5" />
        <ellipse cx="126" cy="156" rx="12" ry="10" class="fill-neu-border/10 stroke-neu-border/40" stroke-width="1.5" />
        <!-- Legs -->
        <rect x="50" y="172" width="24" height="100" rx="8" class="fill-neu-border/10 stroke-neu-border/40" stroke-width="1.5" />
        <rect x="86" y="172" width="24" height="100" rx="8" class="fill-neu-border/10 stroke-neu-border/40" stroke-width="1.5" />
        <!-- Feet -->
        <ellipse cx="62" cy="282" rx="16" ry="8" class="fill-neu-border/10 stroke-neu-border/40" stroke-width="1.5" />
        <ellipse cx="98" cy="282" rx="16" ry="8" class="fill-neu-border/10 stroke-neu-border/40" stroke-width="1.5" />

        <!-- Tappable regions (invisible hit areas with highlights) -->
        <ellipse
          v-for="region in regions"
          :key="region.location"
          :cx="region.cx"
          :cy="region.cy"
          :rx="region.rx"
          :ry="region.ry"
          :class="[
            'cursor-pointer transition-all',
            isSelected(region.location)
              ? 'fill-primary/30 stroke-primary stroke-2 animate-pulse'
              : 'fill-transparent stroke-transparent hover:fill-primary/10 hover:stroke-primary/30',
          ]"
          stroke-width="2"
          @click="toggleLocation(region.location)"
        />
      </svg>
    </div>

    <!-- Selected locations as chips -->
    <div v-if="modelValue.length" class="flex flex-wrap gap-2">
      <span
        v-for="loc in modelValue"
        :key="loc"
        class="neo-pill text-xs px-2.5 py-1 flex items-center gap-1 bg-primary/10 text-primary"
      >
        {{ formatLocation(loc) }}
        <button
          class="hover:text-error transition-colors neo-focus rounded-full"
          @click="removeLocation(loc)"
        >
          <XMarkIcon class="w-3.5 h-3.5" />
        </button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useT } from '@/composables/useT'
import type { IFSBodyLocation } from '@/domain/exercises'

const { t } = useT()

const props = withDefaults(
  defineProps<{
    modelValue: IFSBodyLocation[]
    multiple?: boolean
    label?: string
  }>(),
  {
    multiple: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: IFSBodyLocation[]]
}>()

interface BodyRegion {
  location: IFSBodyLocation
  cx: number
  cy: number
  rx: number
  ry: number
}

const regions: BodyRegion[] = [
  { location: 'head', cx: 80, cy: 20, rx: 16, ry: 10 },
  { location: 'forehead', cx: 80, cy: 18, rx: 14, ry: 8 },
  { location: 'eyes', cx: 80, cy: 28, rx: 14, ry: 6 },
  { location: 'jaw', cx: 80, cy: 42, rx: 12, ry: 8 },
  { location: 'throat', cx: 80, cy: 58, rx: 8, ry: 6 },
  { location: 'shoulders', cx: 80, cy: 72, rx: 36, ry: 8 },
  { location: 'chest', cx: 80, cy: 90, rx: 22, ry: 12 },
  { location: 'heart', cx: 70, cy: 92, rx: 10, ry: 10 },
  { location: 'upper-back', cx: 80, cy: 100, rx: 22, ry: 10 },
  { location: 'stomach', cx: 80, cy: 120, rx: 20, ry: 12 },
  { location: 'gut', cx: 80, cy: 140, rx: 18, ry: 10 },
  { location: 'lower-back', cx: 80, cy: 145, rx: 22, ry: 10 },
  { location: 'hips', cx: 80, cy: 158, rx: 26, ry: 10 },
  { location: 'hands', cx: 34, cy: 156, rx: 12, ry: 10 },
  { location: 'legs', cx: 80, cy: 220, rx: 30, ry: 40 },
  { location: 'feet', cx: 80, cy: 282, rx: 30, ry: 10 },
  { location: 'whole-body', cx: 80, cy: 160, rx: 50, ry: 120 },
]

function isSelected(location: IFSBodyLocation): boolean {
  return props.modelValue.includes(location)
}

function toggleLocation(location: IFSBodyLocation) {
  if (isSelected(location)) {
    emit('update:modelValue', props.modelValue.filter((l) => l !== location))
  } else if (props.multiple) {
    emit('update:modelValue', [...props.modelValue, location])
  } else {
    emit('update:modelValue', [location])
  }
}

function removeLocation(location: IFSBodyLocation) {
  emit('update:modelValue', props.modelValue.filter((l) => l !== location))
}

function formatLocation(location: IFSBodyLocation): string {
  return location
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
</script>
