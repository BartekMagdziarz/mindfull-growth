<template>
  <button
    type="button"
    class="group block w-full text-left neo-focus"
    @click="$emit('click')"
  >
    <AppCard
      padding="lg"
      variant="raised-strong"
      class="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-neu-raised"
    >
      <div class="flex h-full flex-col gap-5">
        <div class="flex items-start justify-between gap-4">
          <h3 class="text-[1.75rem] font-semibold tracking-[-0.02em] text-on-surface">
            {{ title }}
          </h3>

          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-outline/20 bg-section/55 text-on-surface-variant transition-colors duration-200 group-hover:text-primary-strong"
            aria-hidden="true"
          >
            <ArrowTopRightOnSquareIcon class="h-4 w-4" />
          </span>
        </div>

        <div v-if="badges.length > 0" class="flex flex-wrap gap-2">
          <span
            v-for="badge in badges"
            :key="`${badge.label}-${badge.tone ?? 'default'}`"
            :class="badgeClasses(badge.tone)"
          >
            {{ badge.label }}
          </span>
        </div>

        <div class="mt-auto grid grid-cols-2 gap-3">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="neo-surface rounded-2xl px-3 py-3"
          >
            <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              {{ stat.label }}
            </p>
            <p class="mt-2 text-2xl font-semibold text-on-surface">
              {{ stat.value }}
            </p>
          </div>
        </div>
      </div>
    </AppCard>
  </button>
</template>

<script setup lang="ts">
import AppCard from '@/components/AppCard.vue'
import { ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline'

type BadgeTone = 'default' | 'accent' | 'success' | 'warning' | 'danger'

interface Badge {
  label: string
  tone?: BadgeTone
}

interface Stat {
  label: string
  value: string
}

interface Props {
  title: string
  badges?: Badge[]
  stats: Stat[]
}

withDefaults(defineProps<Props>(), {
  badges: () => [],
})

defineEmits<{
  click: []
}>()

function badgeClasses(tone: BadgeTone = 'default'): string {
  switch (tone) {
    case 'accent':
      return 'rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-strong'
    case 'success':
      return 'rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-semibold text-success'
    case 'warning':
      return 'rounded-full border border-warning/20 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning'
    case 'danger':
      return 'rounded-full border border-error/20 bg-error/10 px-3 py-1 text-xs font-semibold text-error'
    default:
      return 'rounded-full border border-outline/25 bg-section/70 px-3 py-1 text-xs font-semibold text-on-surface-variant'
  }
}
</script>
