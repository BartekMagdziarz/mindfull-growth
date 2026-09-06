<template>
  <!-- Directions of the month (priorities) and focuses of the week (top-3 items).
       Hover previews, click pins, click again clears. No captions on purpose. -->
  <DsSurface elevation="raised-sm" class="next-day-compass" :aria-label="t('planning.today.compass.title')">
    <header><span>{{ t('planning.today.compass.title') }}</span></header>
    <div class="next-day-compass__tiles" role="group" :aria-label="t('planning.today.compass.title')" @mouseleave="emit('hover', null)">
      <button
        v-for="tile in tiles"
        :key="tile.key"
        type="button"
        class="next-day-compass__tile"
        :class="[`is-${tile.kind}`, tile.tone ? `tone-${tile.tone}` : '', { 'is-selected': selectedKey === tile.key }]"
        :title="tile.title"
        :aria-pressed="selectedKey === tile.key"
        @click="emit('select', tile.key)"
        @mouseenter="emit('hover', tile.key)"
        @focus="emit('hover', tile.key)"
        @blur="emit('hover', null)"
      >
        <span class="next-day-compass__icon"><AppIcon :name="tile.icon" /></span>
        <small>{{ tile.title }}</small>
      </button>
    </div>
    <DsState v-if="!tiles.length" icon="explore" :title="t('planning.today.compass.empty')" />
  </DsSurface>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Priority } from '@/domain/planning'
import type { TodayItem } from '@/services/todayViewQueries'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { DsState, DsSurface } from '@/design-system/components'
import { dayItemIcon, dayItemTitle, objectCompassKey, priorityCompassKey, priorityFallbackIcon, priorityTone, type CompassKey } from './dayViewModels'

interface CompassTile {
  key: CompassKey
  kind: 'priority' | 'focus'
  icon: string
  title: string
  tone?: 'blue' | 'lavender' | 'rose'
}

const props = defineProps<{
  priorities: Priority[]
  focusItems: TodayItem[]
  selectedKey: string | null
}>()
const emit = defineEmits<{ hover: [key: CompassKey | null]; select: [key: CompassKey] }>()
const { t } = useT()

const tiles = computed<CompassTile[]>(() => [
  ...props.priorities.slice(0, 3).map((priority, index) => ({
    key: priorityCompassKey(priority.id),
    kind: 'priority' as const,
    icon: priority.icon || priorityFallbackIcon(index),
    title: priority.title,
    tone: priorityTone(index),
  })),
  ...props.focusItems.slice(0, 3).map(item => ({
    key: objectCompassKey(item.key),
    kind: 'focus' as const,
    icon: dayItemIcon(item),
    title: dayItemTitle(item),
  })),
])
</script>
