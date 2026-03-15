<template>
  <article
    class="neo-card neo-raised border-primary/10 bg-gradient-to-br from-primary-soft/50 via-white/75 to-section/45 p-3.5"
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

    <!-- Entities + status + menu -->
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

      <StatusIconButton
        :model-value="item.status"
        :options="statusOptions"
        @update:model-value="(v: string) => handleStatusChange(v)"
      />

      <div ref="menuRef" class="relative">
        <button
          type="button"
          class="neo-icon-button neo-focus"
          aria-label="More actions"
          @click.stop="menuOpen = !menuOpen"
        >
          <AppIcon name="more_horiz" class="text-base" />
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

    <!-- Key Results section -->
    <section
      v-if="item.panelType === 'goal'"
      class="mt-3.5 space-y-2"
    >
      <div class="flex items-center justify-between gap-2">
        <div
          v-if="item.childPreviews && item.childPreviews.length > 0"
          class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant"
        >
          {{ t('planning.objects.sections.relatedKeyResults') }}
        </div>
        <button
          type="button"
          class="text-xs font-medium text-primary hover:underline"
          @click="$emit('add-key-result', item.id)"
        >
          {{ t('planning.objects.actions.addKeyResult') }}
        </button>
      </div>

      <div v-if="item.childPreviews && item.childPreviews.length > 0" class="space-y-1.5">
        <ObjectsLibraryKrCard
          v-for="child in item.childPreviews"
          :key="child.id"
          :child="child"
          :parent-goal-id="item.id"
          :is-expanded="expandedKrId === child.id"
          :linked-periods="expandedKrId === child.id ? expandedKrPeriods : []"
          :goal-linked-month-refs="item.goalMonthRefs ?? []"
          :cadence-options="cadenceOptions"
          :entry-mode-options="entryModeOptions"
          :status-options="krStatusOptions"
          :target-operator-options="krTargetOperatorOptions(child.entryMode)"
          :target-aggregation-options="krTargetAggregationOptions(child.entryMode)"
          :show-target-aggregation="krShowTargetAggregation(child.entryMode)"
          @toggle-expand="$emit('kr-toggle-expand', child.id)"
          @field-change="(f: string, v: unknown) => $emit('kr-field-change', child.id, f, v)"
          @link-period="(ref: string) => $emit('kr-link-period', child.id, ref)"
          @unlink-period="(ref: string) => $emit('kr-unlink-period', child.id, ref)"
          @delete="$emit('kr-delete', child.id)"
          @archive="$emit('kr-archive', child.id)"
        />
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import StatusIconButton from '@/components/objects/StatusIconButton.vue'
import ObjectsLibraryKrCard from '@/components/objects/ObjectsLibraryKrCard.vue'
import type { LinkedPeriod } from '@/components/objects/ObjectsLibraryKrCard.vue'
import type {
  ObjectsLibraryBadgeTone,
  ObjectsLibraryLabel,
  ObjectsLibraryListItem,
  ObjectsLibraryPanelType,
} from '@/services/objectsLibraryQueries'
import { resolveObjectsLibraryLabel } from '@/utils/objectsLibraryLabels'
import type { MeasurementEntryMode } from '@/domain/planning'

const props = defineProps<{
  item: ObjectsLibraryListItem
  statusOptions: Array<{ value: string; label: string }>
  expandedKrId: string | null
  expandedKrPeriods: LinkedPeriod[]
  cadenceOptions: Array<{ value: string; label: string }>
  entryModeOptions: Array<{ value: string; label: string }>
  krTargetOperatorOptions: (entryMode: MeasurementEntryMode) => Array<{ value: string; label: string }>
  krTargetAggregationOptions: (entryMode: MeasurementEntryMode) => Array<{ value: string; label: string }>
  krShowTargetAggregation: (entryMode: MeasurementEntryMode) => boolean
  krStatusOptions: Array<{ value: string; label: string }>
}>()

const emit = defineEmits<{
  'status-change': [panelType: ObjectsLibraryPanelType, id: string, newStatus: string]
  archive: [panelType: ObjectsLibraryPanelType, id: string, isCurrentlyActive: boolean]
  delete: [panelType: ObjectsLibraryPanelType, id: string, title: string]
  'add-key-result': [goalId: string]
  'expand-key-result': [panelType: ObjectsLibraryPanelType, id: string]
  'kr-toggle-expand': [krId: string]
  'kr-field-change': [krId: string, field: string, value: unknown]
  'kr-link-period': [krId: string, periodRef: string]
  'kr-unlink-period': [krId: string, periodRef: string]
  'kr-delete': [krId: string]
  'kr-archive': [krId: string]
}>()

const { t } = useT()

const menuOpen = ref(false)
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
