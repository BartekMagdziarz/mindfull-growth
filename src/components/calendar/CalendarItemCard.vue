<template>
  <AppCard
    padding="lg"
    :variant="highlight ? 'raised-strong' : 'raised'"
    :class="[
      'group h-full transition-all duration-200',
      interactive ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-neu-raised' : '',
    ]"
    @click="handleClick"
  >
    <div class="flex h-full flex-col gap-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p v-if="eyebrow" class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            {{ eyebrow }}
          </p>
          <h3 class="mt-1 text-lg font-semibold text-on-surface">
            {{ title }}
          </h3>
          <p v-if="description" class="mt-2 text-sm leading-6 text-on-surface-variant">
            {{ description }}
          </p>
        </div>

        <ArrowTopRightOnSquareIcon
          v-if="interactive"
          class="mt-1 h-4 w-4 shrink-0 text-on-surface-variant transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
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

      <div v-if="details.length > 0" class="mt-auto space-y-1.5 text-sm text-on-surface-variant">
        <p v-for="detail in details" :key="detail">
          {{ detail }}
        </p>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import AppCard from '@/components/AppCard.vue'
import { ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline'

type BadgeTone = 'default' | 'accent' | 'success' | 'warning' | 'danger'

interface Badge {
  label: string
  tone?: BadgeTone
}

interface Props {
  title: string
  eyebrow?: string
  description?: string
  badges?: Badge[]
  details?: string[]
  interactive?: boolean
  highlight?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  eyebrow: undefined,
  description: undefined,
  badges: () => [],
  details: () => [],
  interactive: false,
  highlight: false,
})

const emit = defineEmits<{
  click: []
}>()

function handleClick() {
  if (!props.interactive) {
    return
  }

  emit('click')
}

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
