<template>
  <article
    class="neo-card neo-raised overflow-hidden border-primary/10 bg-gradient-to-br from-primary-soft/50 via-white/75 to-section/45 p-3.5"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="inline-flex rounded-full border border-primary/15 bg-white/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-strong"
          >
            {{ resolveLabel(item.eyebrow) }}
          </span>

          <span
            v-for="(badge, index) in visibleBadges"
            :key="badgeKey(badge, index)"
            class="neo-pill px-2.5 py-1 text-[10px] font-semibold"
            :class="badgeToneClass(badge.tone)"
          >
            {{ resolveLabel(badge.label) }}
          </span>
        </div>

        <h3 class="mt-2.5 text-lg font-semibold tracking-[-0.02em] text-on-surface">
          {{ item.title }}
        </h3>

        <p
          v-if="item.description"
          class="mt-1.5 text-sm leading-5 text-on-surface-variant"
        >
          {{ trimmedDescription }}
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          class="neo-icon-button neo-focus"
          :aria-label="editLabel"
          @click="$emit('edit', item.panelType, item.id)"
        >
          <PencilSquareIcon class="h-4 w-4" />
        </button>

        <button
          type="button"
          class="neo-icon-button neo-focus"
          :aria-label="expanded ? collapseLabel : openLabel"
          @click="$emit('toggle', item.panelType, item.id)"
        >
          <ChevronUpIcon v-if="expanded" class="h-4 w-4" />
          <ChevronRightIcon v-else class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div
      v-if="item.details.length > 0"
      class="mt-3 flex flex-wrap gap-2"
    >
      <span
        v-for="(detail, index) in item.details.slice(0, 3)"
        :key="detailKey(detail, index)"
        class="neo-surface rounded-full px-3 py-1.5 text-xs font-medium text-on-surface-variant"
      >
        {{ resolveLabel(detail) }}
      </span>
    </div>

    <div
      v-if="item.linkedEntities.length > 0"
      class="mt-2.5 flex flex-wrap gap-2"
    >
      <span
        v-for="entity in item.linkedEntities.slice(0, 2)"
        :key="entity"
        class="rounded-full border border-white/55 bg-white/45 px-3 py-1.5 text-[11px] font-medium text-on-surface-variant"
      >
        {{ entity }}
      </span>

      <span
        v-if="item.linkedEntities.length > 2"
        class="rounded-full border border-white/55 bg-white/45 px-3 py-1.5 text-[11px] font-medium text-on-surface-variant"
      >
        +{{ item.linkedEntities.length - 2 }}
      </span>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRightIcon, ChevronUpIcon, PencilSquareIcon } from '@heroicons/vue/24/outline'
import { useT } from '@/composables/useT'
import type {
  ObjectsLibraryBadgeTone,
  ObjectsLibraryLabel,
  ObjectsLibraryListItem,
  ObjectsLibraryPanelType,
} from '@/services/objectsLibraryQueries'
import { resolveObjectsLibraryLabel } from '@/utils/objectsLibraryLabels'

const props = defineProps<{
  item: ObjectsLibraryListItem
  openLabel: string
  collapseLabel: string
  editLabel: string
  expanded: boolean
}>()

defineEmits<{
  toggle: [panelType: ObjectsLibraryPanelType, id: string]
  edit: [panelType: ObjectsLibraryPanelType, id: string]
}>()

const { t } = useT()

const visibleBadges = computed(() => props.item.badges.slice(0, 3))
const trimmedDescription = computed(() => {
  if (!props.item.description) {
    return ''
  }

  return props.item.description.length > 96
    ? `${props.item.description.slice(0, 93)}...`
    : props.item.description
})

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
