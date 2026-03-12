<template>
  <AppCard
    padding="lg"
    variant="raised-strong"
    class="h-full border-primary/10 bg-gradient-to-br from-primary-soft/70 via-white/50 to-section/70"
  >
    <div class="flex h-full flex-col gap-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-strong">
            {{ t('planning.calendar.labels.goal') }}
          </p>
          <h3 class="mt-1 text-xl font-semibold text-on-surface">
            {{ title }}
          </h3>
          <p v-if="description" class="mt-2 text-sm leading-6 text-on-surface-variant">
            {{ description }}
          </p>
        </div>

        <div class="neo-inset min-w-[112px] rounded-3xl px-4 py-3 text-center">
          <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
            {{ linkedLabel }}
          </p>
          <p class="mt-2 text-2xl font-semibold text-on-surface">
            {{ linkedCount }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <span
          v-for="badge in badges"
          :key="badge"
          class="rounded-full border border-primary/15 bg-white/60 px-3 py-1 text-xs font-semibold text-primary-strong"
        >
          {{ badge }}
        </span>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import AppCard from '@/components/AppCard.vue'
import { useT } from '@/composables/useT'

interface Props {
  title: string
  description?: string
  linkedLabel: string
  linkedCount: number
  badges?: string[]
}

withDefaults(defineProps<Props>(), {
  description: undefined,
  badges: () => [],
})

const { t } = useT()
</script>
