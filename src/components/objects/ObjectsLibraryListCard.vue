<template>
  <article
    class="neo-card neo-raised overflow-hidden border-primary/10 bg-gradient-to-br from-primary-soft/50 via-white/75 to-section/45 p-3.5"
  >
    <h3 class="text-lg font-semibold tracking-[-0.02em] text-on-surface">
      {{ item.title }}
    </h3>

    <p
      v-if="item.description"
      class="mt-1.5 text-sm leading-5 text-on-surface-variant"
    >
      {{ trimmedDescription }}
    </p>

    <div
      v-if="nonStatusBadges.length > 0"
      class="mt-2.5 flex flex-wrap gap-1.5"
    >
      <span
        v-for="(badge, index) in nonStatusBadges"
        :key="`badge-${index}`"
        class="neo-pill px-2 py-0.5 text-[10px] font-semibold"
        :class="badgeToneClass(badge.tone)"
      >
        {{ resolveLabel(badge.label) }}
      </span>
    </div>

    <section
      v-if="item.childPreviews && item.childPreviews.length > 0"
      class="mt-3.5 space-y-2"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
          {{ t('planning.objects.sections.relatedKeyResults') }}
        </div>
        <button
          v-if="item.panelType === 'goal'"
          type="button"
          class="text-xs font-medium text-primary hover:underline"
          @click="$emit('add-key-result', item.id)"
        >
          {{ t('planning.objects.actions.addKeyResult') }}
        </button>
      </div>

      <div class="space-y-1.5">
        <div
          v-for="child in item.childPreviews"
          :key="child.id"
          class="neo-surface flex items-center gap-2 rounded-lg px-2.5 py-2"
        >
          <button
            type="button"
            class="neo-focus min-w-0 flex-1 text-left"
            @click="$emit('expand-key-result', child.type, child.id)"
          >
            <div class="truncate text-sm font-semibold text-on-surface">
              {{ child.title }}
            </div>
            <div
              v-if="child.badges.length > 0"
              class="mt-1 flex flex-wrap gap-2"
            >
              <span
                v-for="(badge, idx) in child.badges"
                :key="idx"
                class="text-[11px] font-medium text-on-surface-variant"
              >
                {{ resolveLabel(badge.label) }}
              </span>
            </div>
          </button>

          <button
            type="button"
            class="neo-icon-button neo-focus"
            :aria-label="t('planning.objects.actions.editObject')"
            @click="$emit('edit-key-result', item.id, child.id)"
          >
            <PencilSquareIcon class="h-4 w-4" />
          </button>

          <button
            type="button"
            class="neo-icon-button neo-focus"
            :aria-label="t('planning.objects.actions.showDetails')"
            @click="$emit('expand-key-result', child.type, child.id)"
          >
            <ChevronRightIcon class="h-4 w-4 shrink-0 text-on-surface-variant" />
          </button>
        </div>
      </div>
    </section>

    <div class="mt-3 flex items-center gap-2">
      <div class="flex flex-1 flex-wrap gap-1.5">
        <span
          v-for="entity in item.linkedEntities"
          :key="entity"
          class="rounded-full border border-white/55 bg-white/45 px-2.5 py-1 text-[11px] font-medium text-on-surface-variant"
        >
          {{ entity }}
        </span>
      </div>

      <div ref="statusDropdownRef" class="relative">
        <button
          type="button"
          class="neo-pill neo-focus flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold"
          :class="statusPillClass"
          @click.stop="statusDropdownOpen = !statusDropdownOpen"
        >
          {{ currentStatusLabel }}
          <ChevronDownIcon class="h-3 w-3" />
        </button>
        <div
          v-if="statusDropdownOpen"
          class="absolute bottom-full right-0 z-20 mb-1 min-w-[130px] overflow-hidden rounded-xl border border-white/40 bg-white shadow-lg"
          @click.stop
        >
          <button
            v-for="opt in statusOptions"
            :key="opt.value"
            type="button"
            class="block w-full px-4 py-2 text-left text-xs font-medium hover:bg-primary-soft/30"
            :class="opt.value === item.status ? 'font-semibold text-primary' : 'text-on-surface'"
            @click="handleStatusChange(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div ref="menuRef" class="relative">
        <button
          type="button"
          class="neo-icon-button neo-focus"
          aria-label="More actions"
          @click.stop="menuOpen = !menuOpen"
        >
          <EllipsisHorizontalIcon class="h-4 w-4" />
        </button>
        <div
          v-if="menuOpen"
          class="absolute bottom-full right-0 z-20 mb-1 min-w-[130px] overflow-hidden rounded-xl border border-white/40 bg-white shadow-lg"
          @click.stop
        >
          <button
            type="button"
            class="block w-full px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
            @click="handleArchive"
          >
            {{ item.isActive ? t('planning.objects.actions.archive') : t('planning.objects.actions.unarchive') }}
          </button>
          <button
            type="button"
            class="block w-full px-4 py-2 text-left text-xs font-medium text-danger hover:bg-danger/5"
            @click="handleDelete"
          >
            {{ t('common.buttons.delete') }}
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
  PencilSquareIcon,
} from '@heroicons/vue/24/outline'
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
  statusOptions: Array<{ value: string; label: string }>
}>()

const emit = defineEmits<{
  'status-change': [panelType: ObjectsLibraryPanelType, id: string, newStatus: string]
  archive: [panelType: ObjectsLibraryPanelType, id: string, isCurrentlyActive: boolean]
  delete: [panelType: ObjectsLibraryPanelType, id: string, title: string]
  'add-key-result': [goalId: string]
  'expand-key-result': [panelType: ObjectsLibraryPanelType, id: string]
  'edit-key-result': [goalId: string, krId: string]
}>()

const { t } = useT()

const statusDropdownOpen = ref(false)
const menuOpen = ref(false)
const statusDropdownRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)

const nonStatusBadges = computed(() =>
  props.item.badges.filter((badge) => {
    if (typeof badge.label === 'string') return true
    return !badge.label.key.startsWith('planning.objects.badges.status')
  }),
)

const trimmedDescription = computed(() => {
  if (!props.item.description) return ''
  return props.item.description.length > 120
    ? `${props.item.description.slice(0, 117)}...`
    : props.item.description
})

const currentStatusLabel = computed(() => {
  const opt = props.statusOptions.find((o) => o.value === props.item.status)
  return opt?.label ?? props.item.status
})

const statusPillClass = computed(() => {
  switch (props.item.status) {
    case 'completed':
      return 'neo-pill--success'
    case 'dropped':
      return 'neo-pill--danger'
    case 'retired':
      return 'neo-pill--warning'
    default:
      return 'neo-pill--primary'
  }
})

function resolveLabel(label: ObjectsLibraryLabel): string {
  return resolveObjectsLibraryLabel(label, t)
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

function handleStatusChange(newStatus: string): void {
  statusDropdownOpen.value = false
  emit('status-change', props.item.panelType, props.item.id, newStatus)
}

function handleArchive(): void {
  menuOpen.value = false
  emit('archive', props.item.panelType, props.item.id, props.item.isActive)
}

function handleDelete(): void {
  menuOpen.value = false
  emit('delete', props.item.panelType, props.item.id, props.item.title)
}

function handleOutsideClick(event: MouseEvent): void {
  if (statusDropdownRef.value && !statusDropdownRef.value.contains(event.target as Node)) {
    statusDropdownOpen.value = false
  }
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    menuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>
