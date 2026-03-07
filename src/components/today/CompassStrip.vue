<template>
  <AppCard class="neo-raised w-full">
    <div class="flex items-start justify-between gap-3">
      <div class="space-y-1">
        <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          {{ t('today.compass.title') }}
        </p>
        <p class="text-sm text-on-surface">
          {{ compactSummary }}
        </p>
      </div>
      <button
        type="button"
        class="neo-pill neo-focus px-2.5 py-1 text-xs font-medium"
        @click="isExpanded = !isExpanded"
      >
        {{ isExpanded ? t('today.compass.collapse') : t('today.compass.expand') }}
      </button>
    </div>

    <Transition name="fade">
      <div v-if="isExpanded" class="mt-4 grid gap-3 md:grid-cols-3">
        <div class="neo-surface rounded-xl p-3">
          <p class="text-[11px] uppercase tracking-wide text-on-surface-variant">
            {{ t('today.compass.year') }}
          </p>
          <p class="mt-1 text-sm font-medium text-on-surface">{{ yearLabel || t('today.compass.notSet') }}</p>
          <p class="mt-1 text-xs text-on-surface-variant">
            {{ yearTheme || t('today.compass.noYearTheme') }}
          </p>
        </div>

        <div class="neo-surface rounded-xl p-3">
          <p class="text-[11px] uppercase tracking-wide text-on-surface-variant">
            {{ t('today.compass.month') }}
          </p>
          <p class="mt-1 text-sm font-medium text-on-surface">{{ monthLabel || t('today.compass.notSet') }}</p>
          <p class="mt-1 text-xs text-on-surface-variant">
            {{ monthIntention || t('today.compass.noMonthIntention') }}
          </p>
        </div>

        <div class="neo-surface rounded-xl p-3">
          <p class="text-[11px] uppercase tracking-wide text-on-surface-variant">
            {{ t('today.compass.week') }}
          </p>
          <p class="mt-1 text-sm font-medium text-on-surface">{{ weekLabel || t('today.compass.notSet') }}</p>
          <p class="mt-1 text-xs text-on-surface-variant">
            {{ weekFocusSentence || t('today.compass.noWeekFocus') }}
          </p>
        </div>
      </div>
    </Transition>

    <div v-if="priorityNames.length > 0" class="mt-3 flex flex-wrap gap-2">
      <span
        v-for="name in priorityNames"
        :key="name"
        class="inline-flex items-center rounded-full border border-neu-border/30 bg-section px-3 py-1 text-xs text-on-surface"
      >
        {{ name }}
      </span>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppCard from '@/components/AppCard.vue'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = withDefaults(
  defineProps<{
    yearLabel?: string
    yearTheme?: string
    monthLabel?: string
    monthIntention?: string
    weekLabel?: string
    weekFocusSentence?: string
    priorityNames?: string[]
    expandedByDefault?: boolean
  }>(),
  {
    yearLabel: '',
    yearTheme: '',
    monthLabel: '',
    monthIntention: '',
    weekLabel: '',
    weekFocusSentence: '',
    priorityNames: () => [],
    expandedByDefault: false,
  },
)

const isExpanded = ref(props.expandedByDefault)

const compactSummary = computed(() => {
  const pieces: string[] = []
  if (props.weekFocusSentence?.trim()) {
    pieces.push(`"${props.weekFocusSentence.trim()}"`)
  } else if (props.monthIntention?.trim()) {
    pieces.push(props.monthIntention.trim())
  } else if (props.yearTheme?.trim()) {
    pieces.push(props.yearTheme.trim())
  }

  if (props.priorityNames.length > 0) {
    pieces.push(t('today.compass.priorityCount', { count: props.priorityNames.length }))
  }

  if (pieces.length === 0) {
    return t('today.compass.emptySummary')
  }

  return pieces.join(' · ')
})

const priorityNames = computed(() => props.priorityNames.filter((item) => item.trim().length > 0))
</script>
