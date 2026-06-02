<template>
  <!--
    Merged slot (Big Five): while still not started, offer a depth choice
    instead of a single navigation target. Completing either depth satisfies
    the slot, so we never want the user to do both by accident.
  -->
  <div
    v-if="showVariantChooser"
    class="w-full rounded-2xl border p-4 text-left"
    :class="tileClass"
    :data-test-foundation-item="status.id"
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

    <div class="mt-3 grid grid-cols-2 gap-2">
      <button
        v-for="variant in variantOptions"
        :key="variant.assessmentId"
        type="button"
        class="neo-pill flex flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left transition-all duration-200 hover:-translate-y-px active:translate-y-0"
        :aria-label="`${title}: ${variant.label}`"
        @click="emit('navigate', { routeName: variant.routeName, routeParams: variant.routeParams })"
      >
        <span class="text-sm font-medium text-on-surface">{{ variant.label }}</span>
        <span class="text-xs text-on-surface-variant">{{ variant.hint }}</span>
      </button>
    </div>
  </div>

  <!-- Standard tile -->
  <button
    v-else
    type="button"
    class="w-full rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-px active:translate-y-0"
    :class="tileClass"
    :aria-label="title"
    :data-test-foundation-item="status.id"
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
  transformativePurpose: 'auto_awesome',
  threePathways: 'alt_route',
  mountainRange: 'landscape',
  wheelOfLife: 'pie_chart',
  shadowBeliefs: 'visibility',
  ifsPartsMap: 'hub',
  bigFive: 'bar_chart',
  'hexaco-60': 'grid_view',
  'ipip-via': 'star',
  'pvq-40': 'diversity_3',
  vlq: 'lightbulb',
  erq: 'mood',
  rrq: 'replay',
  'ecr-rs': 'diversity_1',
}

/** Maps a Big Five variant assessment id to its locale sub-key (depth). */
const VARIANT_KEY: Record<string, 'quick' | 'deep'> = {
  'ipip-bfm-50': 'quick',
  'ipip-neo-120': 'deep',
}

const showVariantChooser = computed(
  () => Boolean(props.status.variants?.length) && props.status.state === 'not-started',
)

const variantOptions = computed(() =>
  (props.status.variants ?? []).map((variant) => {
    const key = VARIANT_KEY[variant.assessmentId] ?? 'quick'
    return {
      assessmentId: variant.assessmentId,
      routeName: variant.routeName,
      routeParams: variant.routeParams,
      label: t(`profile.psychologicalProfile.foundation.items.${props.status.id}.variants.${key}.label`),
      hint: t(`profile.psychologicalProfile.foundation.items.${props.status.id}.variants.${key}.hint`),
    }
  }),
)

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
      return 'border-status-warn/40 bg-status-warn-soft/40 shadow-neu-raised-sm'
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
      return 'border-status-warn/40 bg-status-warn-soft/70 text-status-warn-on'
    case 'not-started':
    default:
      return 'text-on-surface-variant'
  }
})
</script>
