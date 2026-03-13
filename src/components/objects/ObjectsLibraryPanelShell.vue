<template>
  <aside class="neo-panel sticky top-24 flex min-h-[32rem] flex-col gap-5 p-5">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0 space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <span
            v-if="modeLabel"
            class="rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-strong"
          >
            {{ modeLabel }}
          </span>
          <slot name="eyebrow" />
        </div>

        <div>
          <h2 class="text-xl font-semibold text-on-surface">
            {{ title }}
          </h2>
          <p
            v-if="description"
            class="mt-2 text-sm leading-6 text-on-surface-variant"
          >
            {{ description }}
          </p>
        </div>
      </div>

      <button
        type="button"
        class="neo-icon-button neo-focus"
        :aria-label="closeLabel"
        @click="$emit('close')"
      >
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>

    <div
      v-if="badges.length > 0"
      class="flex flex-wrap gap-2"
    >
      <span
        v-for="(badge, index) in badges"
        :key="badgeKey(badge, index)"
        class="neo-pill"
        :class="badgeToneClass(badge.tone)"
      >
        {{ resolveLabel(badge.label) }}
      </span>
    </div>

    <div class="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
      <slot />
    </div>

    <div
      v-if="$slots.actions"
      class="mt-auto flex flex-wrap justify-end gap-3"
    >
      <slot name="actions" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useT } from '@/composables/useT'
import type {
  ObjectsLibraryBadge,
  ObjectsLibraryBadgeTone,
  ObjectsLibraryLabel,
} from '@/services/objectsLibraryQueries'
import { resolveObjectsLibraryLabel } from '@/utils/objectsLibraryLabels'

defineProps<{
  title: string
  description?: string
  modeLabel?: string
  badges: ObjectsLibraryBadge[]
  closeLabel: string
}>()

defineEmits<{
  close: []
}>()

const { t } = useT()

function resolveLabel(label: ObjectsLibraryLabel): string {
  return resolveObjectsLibraryLabel(label, t)
}

function badgeKey(badge: ObjectsLibraryBadge, index: number): string {
  return `${resolveLabel(badge.label)}-${badge.tone ?? 'default'}-${index}`
}

function badgeToneClass(tone?: ObjectsLibraryBadgeTone): string {
  switch (tone) {
    case 'accent':
      return 'neo-pill--primary'
    case 'success':
      return 'neo-pill--success'
    case 'warning':
      return 'neo-pill--warning'
    case 'danger':
      return 'neo-pill--danger'
    default:
      return ''
  }
}
</script>
