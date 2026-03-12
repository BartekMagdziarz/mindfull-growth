<template>
  <article
    class="neo-card neo-raised-strong overflow-hidden border-primary/10 bg-gradient-to-br from-primary-soft/55 via-white/65 to-section/60 p-6"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0 flex-1 p-1">
        <span
          class="inline-flex rounded-full border border-primary/15 bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-strong"
        >
          {{ resolveLabel(item.eyebrow) }}
        </span>
        <h3 class="mt-3 text-xl font-semibold tracking-[-0.02em] text-on-surface">
          {{ item.title }}
        </h3>
        <p
          v-if="item.description"
          class="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant"
        >
          {{ item.description }}
        </p>
      </div>

      <button
        type="button"
        class="neo-icon-button neo-focus"
        :aria-label="expanded ? collapseLabel : openLabel"
        @click="$emit('toggle', item.panelType, item.id)"
      >
        <ChevronUpIcon v-if="expanded" class="h-4 w-4" />
        <ArrowTopRightOnSquareIcon v-else class="h-4 w-4" />
      </button>
    </div>

    <div
      v-if="item.badges.length > 0"
      class="mt-4 flex flex-wrap gap-2"
    >
      <span
        v-for="(badge, index) in item.badges"
        :key="badgeKey(badge, index)"
        class="neo-pill"
        :class="badgeToneClass(badge.tone)"
      >
        {{ resolveLabel(badge.label) }}
      </span>
    </div>

    <div
      v-if="item.details.length > 0"
      class="mt-5 grid gap-3 text-sm text-on-surface-variant sm:grid-cols-2"
    >
      <div
        v-for="(detail, index) in item.details"
        :key="detailKey(detail, index)"
        class="neo-surface rounded-[1.25rem] px-4 py-3"
      >
        {{ resolveLabel(detail) }}
      </div>
    </div>

    <div
      v-if="item.linkedEntities.length > 0"
      class="mt-5 flex flex-wrap gap-2"
    >
      <span
        v-for="entity in item.linkedEntities"
        :key="entity"
        class="rounded-full border border-white/55 bg-white/45 px-3 py-1.5 text-xs font-medium text-on-surface-variant"
      >
        {{ entity }}
      </span>
    </div>

    <div
      v-if="!expanded && item.childPreviews && item.childPreviews.length > 0"
      class="mt-6 space-y-3"
    >
      <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-strong">
        {{ childLabel }}
      </div>

      <button
        v-for="child in item.childPreviews"
        :key="child.id"
        type="button"
        class="neo-surface neo-focus flex w-full items-center justify-between gap-3 rounded-[1.35rem] px-4 py-3 text-left"
        @click="$emit('open', child.type, child.id)"
      >
        <div class="min-w-0">
          <div class="truncate text-sm font-semibold text-on-surface">
            {{ child.title }}
          </div>
          <div class="mt-1 flex flex-wrap gap-2">
            <span
              v-for="(badge, index) in child.badges"
              :key="`${child.id}-${badgeKey(badge, index)}`"
              class="text-[11px] font-medium text-on-surface-variant"
            >
              {{ resolveLabel(badge.label) }}
            </span>
          </div>
        </div>
        <ChevronRightIcon class="h-4 w-4 shrink-0 text-on-surface-variant" />
      </button>
    </div>

    <div class="mt-6 flex items-center justify-between gap-3 border-t border-white/45 pt-4">
      <div />
      <button
        type="button"
        class="text-sm font-medium text-primary hover:underline"
        @click="$emit('toggle', item.panelType, item.id)"
      >
        {{ expanded ? collapseLabel : openLabel }}
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ArrowTopRightOnSquareIcon, ChevronRightIcon, ChevronUpIcon } from '@heroicons/vue/24/outline'
import { useT } from '@/composables/useT'
import type {
  ObjectsLibraryBadgeTone,
  ObjectsLibraryLabel,
  ObjectsLibraryListItem,
  ObjectsLibraryPanelType,
} from '@/services/objectsLibraryQueries'
import { resolveObjectsLibraryLabel } from '@/utils/objectsLibraryLabels'

defineProps<{
  item: ObjectsLibraryListItem
  openLabel: string
  collapseLabel: string
  childLabel: string
  expanded: boolean
}>()

defineEmits<{
  toggle: [panelType: ObjectsLibraryPanelType, id: string]
  open: [panelType: ObjectsLibraryPanelType, id: string]
}>()

const { t } = useT()

function resolveLabel(label: ObjectsLibraryLabel): string {
  return resolveObjectsLibraryLabel(label, t)
}

function badgeKey(
  badge: { label: ObjectsLibraryLabel; tone?: ObjectsLibraryBadgeTone },
  index: number,
): string {
  return `${resolveLabel(badge.label)}-${badge.tone ?? 'default'}-${index}`
}

function detailKey(detail: ObjectsLibraryLabel, index: number): string {
  return `${resolveLabel(detail)}-${index}`
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
