<template>
  <RouterLink
    v-if="route && sourceType !== 'manual'"
    :to="route"
    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors"
    :class="badgeClass"
  >
    <component :is="iconComponent" class="w-3 h-3" />
    {{ label }}
  </RouterLink>
  <span
    v-else-if="sourceType !== 'manual'"
    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
    :class="badgeClass"
  >
    <component :is="iconComponent" class="w-3 h-3" />
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowPathIcon, RocketLaunchIcon } from '@heroicons/vue/24/outline'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = defineProps<{
  sourceType?: 'manual' | 'habit' | 'project'
  sourceId?: string
  habitId?: string
  sourceName?: string
  tone?: 'contextual' | 'muted'
}>()

const iconComponent = computed(() => {
  const map: Record<string, typeof ArrowPathIcon> = {
    habit: ArrowPathIcon,
    project: RocketLaunchIcon,
  }
  return map[props.sourceType || ''] ?? ArrowPathIcon
})

const badgeClass = computed(() => {
  if (props.tone === 'muted') {
    const mutedMap: Record<string, string> = {
      habit: 'border border-primary/20 bg-primary/10 text-primary-strong shadow-neu-raised-sm hover:shadow-neu-raised',
      project: 'border border-neu-border/25 bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:shadow-neu-raised',
    }
    return mutedMap[props.sourceType || ''] ?? ''
  }

  const map: Record<string, string> = {
    habit: 'border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-neu-raised-sm hover:shadow-neu-raised',
    project: 'border border-amber-200 bg-amber-50 text-amber-700 shadow-neu-raised-sm hover:shadow-neu-raised',
  }
  return map[props.sourceType || ''] ?? ''
})

const label = computed(() => {
  if (props.sourceName) return props.sourceName
  const map: Record<string, string> = {
    habit: t('planning.components.sourceBadge.habit'),
    project: t('planning.components.sourceBadge.project'),
  }
  return map[props.sourceType || ''] ?? ''
})

const route = computed(() => {
  if (props.sourceType === 'habit' && props.habitId) {
    return `/planning/habits/${props.habitId}`
  }
  return undefined
})
</script>
