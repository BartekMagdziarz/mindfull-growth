<template>
  <button
    type="button"
    class="w-full rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-px active:translate-y-0"
    :class="tileClass"
    :aria-label="title"
    @click="emit('navigate', { routeName: status.routeName, routeParams: status.routeParams })"
  >
    <div class="flex items-center justify-between gap-3">
      <span class="neo-icon-circle flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
        <AppIcon :name="iconName" class="text-xl text-primary" />
      </span>
      <span class="neo-pill px-2.5 py-1 text-xs" :class="pillClass">
        {{ pillLabel }}
      </span>
    </div>

    <h3 class="mt-3 text-base font-semibold text-on-surface">
      {{ title }}
    </h3>
    <p class="mt-1 text-sm text-on-surface-variant">
      {{ description }}
    </p>
    <p
      v-if="dateLine"
      class="mt-3 text-xs text-on-surface-variant"
      data-testid="foundation-date-line"
    >
      {{ dateLine }}
    </p>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type {
  FoundationItemId,
  FoundationItemStatus,
} from '@/services/foundationCompleteness'

const props = defineProps<{
  status: FoundationItemStatus
}>()

const emit = defineEmits<{
  navigate: [payload: { routeName: string; routeParams?: Record<string, string> }]
}>()

const { t, locale } = useT()

const iconByItem: Record<FoundationItemId, string> = {
  valuesDiscovery: 'favorite',
  valueMap: 'account_tree',
  wheelOfLife: 'pie_chart',
  shadowBeliefs: 'visibility',
  transformativePurpose: 'auto_awesome',
  'ipip-bfm-50': 'bar_chart',
  'ipip-neo-120': 'description',
  'hexaco-60': 'grid_view',
  'pvq-40': 'favorite',
  vlq: 'lightbulb',
}

const title = computed(() =>
  t(`profile.psychologicalProfile.foundation.items.${props.status.id}.title`),
)

const description = computed(() =>
  t(`profile.psychologicalProfile.foundation.items.${props.status.id}.description`),
)

const iconName = computed(() => iconByItem[props.status.id])

const formattedDate = computed(() => {
  if (!props.status.lastCompletedAt) return ''
  try {
    return new Intl.DateTimeFormat(locale.value, {
      dateStyle: 'medium',
    }).format(new Date(props.status.lastCompletedAt))
  } catch {
    return props.status.lastCompletedAt.slice(0, 10)
  }
})

const pillLabel = computed(() => {
  switch (props.status.state) {
    case 'in-progress':
      return t('profile.psychologicalProfile.foundation.states.inProgress')
    case 'completed':
      return t('profile.psychologicalProfile.foundation.states.completedShort')
    case 'outdated':
      return t('profile.psychologicalProfile.foundation.states.outdatedShort')
    case 'not-started':
    default:
      return t('profile.psychologicalProfile.foundation.states.notStarted')
  }
})

const dateLine = computed(() => {
  if (!props.status.lastCompletedAt || !formattedDate.value) return ''
  if (props.status.state === 'outdated') {
    return t('profile.psychologicalProfile.foundation.states.outdated', {
      date: formattedDate.value,
    })
  }
  return t('profile.psychologicalProfile.foundation.states.completed', {
    date: formattedDate.value,
  })
})

const tileClass = computed(() => {
  switch (props.status.state) {
    case 'not-started':
      return 'border-neu-border/30 bg-neu-base shadow-neu-flat'
    case 'in-progress':
      return 'border-primary/30 bg-primary/10 shadow-neu-raised-sm'
    case 'outdated':
      return 'border-amber-500/40 bg-amber-50/40 shadow-neu-raised-sm'
    case 'completed':
    default:
      return 'border-neu-border/30 bg-neu-base shadow-neu-raised-sm'
  }
})

const pillClass = computed(() => {
  switch (props.status.state) {
    case 'in-progress':
      return 'border-primary/30 bg-primary/10 text-primary-strong'
    case 'completed':
      return 'neo-pill--success'
    case 'outdated':
      return 'border-amber-500/40 bg-amber-100/70 text-amber-800'
    case 'not-started':
    default:
      return 'text-on-surface-variant'
  }
})
</script>
