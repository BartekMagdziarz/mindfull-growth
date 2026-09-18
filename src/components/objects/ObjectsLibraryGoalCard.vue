<template>
  <article
    class="group/card mg-v2-surface mg-v2-surface--raised-sm p-3.5"
  >
    <div class="space-y-2">
      <!-- Row 1: Icon + Title + hover tray (menu w/ status) -->
      <div class="flex items-center gap-2">
        <IconPicker
          icon-size="lg"
          :model-value="item.icon"
          compact
          minimal
          :allow-clear="true"
          aria-label="Goal icon"
          @update:model-value="emitFieldChange('icon', $event)"
        />
        <input
          ref="titleRef"
          v-model="title"
          type="text"
          class="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm font-semibold text-on-surface outline-none placeholder:text-on-surface-variant/40"
          :placeholder="t('planning.objects.form.goalTitlePlaceholder')"
          @blur="flushTitle"
        />
        <div class="mg-v2-card-tray group-hover/card:opacity-100">
          <div ref="menuRef" class="relative">
            <button
              type="button"
              class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet"
              aria-label="More actions"
              @click.stop="menuOpen = !menuOpen"
            >
              <AppIcon name="more_horiz" class="text-base" />
            </button>
            <div
              v-if="menuOpen"
              class="mg-v2-popover absolute right-0 top-full z-20 mt-1 min-w-[210px] overflow-hidden"
              @click.stop
            >
              <ObjectsCardStatusMenu
                :model-value="item.status"
                :options="statusOptions"
                @update:model-value="handleStatusChange"
              />
              <div class="mg-v2-menu-section">
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                  @click="openLinks(null)"
                >
                  {{ t('planning.objects.timeline.links') }}…
                </button>
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                  @click="openMonths"
                >
                  {{ t('planning.objects.timeline.months') }}…
                </button>
              </div>
              <div class="mg-v2-menu-section">
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-xs font-medium text-primary hover:bg-primary-soft/30"
                  @click="handleAddKeyResult"
                >
                  {{ t('planning.objects.actions.addKeyResult') }}
                </button>
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                  @click="handleEdit"
                >
                  {{ t('planning.objects.actions.editObject') }}
                </button>
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                  @click="handleArchive"
                >
                  {{ item.isActive ? t('planning.objects.actions.archive') : t('planning.objects.actions.unarchive') }}
                </button>
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-xs font-medium text-danger hover:bg-danger/5"
                  @click="handleDelete"
                >
                  {{ t('common.buttons.delete') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Row 2: status only when it is not the default -->
      <p v-if="statusLabel || !item.isActive" class="mg-v2-meta px-1">
        <span v-if="statusLabel" class="mg-v2-meta__status">{{ statusLabel }}</span>
        <span v-if="!item.isActive">{{ t('planning.objects.badges.archived') }}</span>
      </p>

      <!-- Row 3: affiliation glyphs (priorities · life areas); click edits -->
      <div class="relative px-1">
        <ObjectCardAffiliation
          :priority-ids="item.priorityIds ?? []"
          :life-area-ids="item.lifeAreaIds ?? []"
          :priority-options="priorityOptions"
          :life-area-options="lifeAreaOptions"
          :group-label="t('planning.objects.timeline.links')"
          :empty-label="t('planning.objects.timeline.addLink')"
          @open="openLinks"
        />
        <GoalLinksDropdown
          ref="linksRef"
          triggerless
          :priority-ids="item.priorityIds ?? []"
          :life-area-ids="item.lifeAreaIds ?? []"
          :priority-options="priorityOptions"
          :life-area-options="lifeAreaOptions"
          @toggle-priority="emitFieldChange('togglePriority', $event)"
          @toggle-life-area="emitFieldChange('toggleLifeArea', $event)"
        />
      </div>

      <!-- Row 4: the goal's window in time; click edits linked months -->
      <ObjectCardTimeline
        variant="linear"
        :window="goalWindow"
        :start="startLabel"
        :end="endLabel"
        :open-label="t('planning.objects.timeline.noDeadline')"
        interactive
        :label="t('planning.objects.timeline.months')"
        @click="openMonths"
      />
      <GoalMonthsDropdown
        ref="monthsRef"
        triggerless
        :save-months="saveMonths"
        :linked-months="linkedMonths"
        @link-month="$emit('link-month', item.id, $event)"
        @unlink-month="$emit('unlink-month', item.id, $event)"
      />
    </div>

    <!-- Key Results section -->
    <section
      v-if="item.childPreviews && item.childPreviews.length > 0"
      class="mt-3.5 space-y-1.5"
    >
      <ObjectsLibraryKrCard
        v-for="child in item.childPreviews"
        :key="child.id"
        :child="child"
        :parent-goal-id="item.id"
        :save-periods="saveKrPeriods ? (refs) => saveKrPeriods!(child.id, refs) : undefined"
        :is-expanded="expandedKrId === child.id"
        :linked-periods="expandedKrId === child.id ? expandedKrPeriods : []"
        :goal-linked-month-refs="linkedMonths.map((m) => m.monthRef)"
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
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import IconPicker from '@/components/shared/IconPicker.vue'
import GoalMonthsDropdown from '@/components/objects/GoalMonthsDropdown.vue'
import GoalLinksDropdown from '@/components/objects/GoalLinksDropdown.vue'
import ObjectCardAffiliation from '@/components/objects/ObjectCardAffiliation.vue'
import type { AffiliationKind } from '@/components/objects/ObjectCardAffiliation.vue'
import ObjectCardTimeline from '@/components/objects/ObjectCardTimeline.vue'
import type { TimelineEndLabel } from '@/components/objects/ObjectCardTimeline.vue'
import ObjectsCardStatusMenu from '@/components/objects/ObjectsCardStatusMenu.vue'
import ObjectsLibraryKrCard from '@/components/objects/ObjectsLibraryKrCard.vue'
import type { LinkedPeriod } from '@/components/objects/ObjectsLibraryKrCard.vue'
import type { LinkedMonth } from '@/components/objects/GoalMonthsDropdown.vue'
import { useEditableField } from '@/composables/useEditableField'
import type {
  ObjectsLibraryFilterOption,
  ObjectsLibraryListItem,
} from '@/services/objectsLibraryQueries'
import type { MeasurementEntryMode } from '@/domain/planning'
import type { DayRef, MonthRef } from '@/domain/period'
import { computeGoalWindow } from '@/utils/objectWindow'
import { formatDayShort, formatMonthShort } from '@/utils/periodLabels'

const props = defineProps<{
  item: ObjectsLibraryListItem
  linkedMonths: LinkedMonth[]
  statusOptions: Array<{ value: string; label: string }>
  priorityOptions: ObjectsLibraryFilterOption[]
  lifeAreaOptions: ObjectsLibraryFilterOption[]
  expandedKrId: string | null
  expandedKrPeriods: LinkedPeriod[]
  cadenceOptions: Array<{ value: string; label: string }>
  entryModeOptions: Array<{ value: string; label: string }>
  krStatusOptions: Array<{ value: string; label: string }>
  krTargetOperatorOptions: (entryMode: MeasurementEntryMode) => Array<{ value: string; label: string }>
  krTargetAggregationOptions: (entryMode: MeasurementEntryMode) => Array<{ value: string; label: string }>
  krShowTargetAggregation: (entryMode: MeasurementEntryMode) => boolean
  saveMonths?: (refs: string[]) => Promise<void>
  saveKrPeriods?: (id: string, refs: string[]) => Promise<void>
  isNew?: boolean
}>()

const emit = defineEmits<{
  'field-change': [goalId: string, field: string, value: unknown]
  'link-month': [goalId: string, monthRef: string]
  'unlink-month': [goalId: string, monthRef: string]
  archive: [goalId: string, isCurrentlyActive: boolean]
  delete: [goalId: string, title: string]
  edit: [goalId: string]
  'add-key-result': [goalId: string]
  'kr-toggle-expand': [krId: string]
  'kr-field-change': [krId: string, field: string, value: unknown]
  'kr-link-period': [krId: string, periodRef: string]
  'kr-unlink-period': [krId: string, periodRef: string]
  'kr-delete': [krId: string]
  'kr-archive': [krId: string]
}>()

const { t, locale } = useT()

const menuRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const linksRef = ref<InstanceType<typeof GoalLinksDropdown> | null>(null)
const monthsRef = ref<InstanceType<typeof GoalMonthsDropdown> | null>(null)

function emitFieldChange(field: string, value: unknown): void {
  emit('field-change', props.item.id, field, value)
}

const { value: title, inputRef: titleRef, flush: flushTitle } = useEditableField({
  source: () => props.item.title,
  commit: (value) => emitFieldChange('title', value),
  delay: 400,
})

// --- Window in time -------------------------------------------------------

const goalWindow = computed(() =>
  computeGoalWindow(
    {
      startDate: props.item.startDate,
      targetDate: props.item.targetDate,
      monthRefs: props.linkedMonths.map((month) => month.monthRef),
      createdAt: props.item.createdAt,
    },
    new Date(),
  ),
)

const currentYear = String(new Date().getFullYear())

function dayLabel(day: DayRef): string {
  return formatDayShort(day, locale.value, day.slice(0, 4) !== currentYear)
}

// Start: an explicit start date reads as a day, a derived one as its month.
const startLabel = computed(() => {
  const start = goalWindow.value.start
  if (!start) return null
  const label = props.item.startDate
    ? dayLabel(start)
    : formatMonthShort(start.slice(0, 7) as MonthRef, locale.value)
  return goalWindow.value.state === 'upcoming'
    ? t('planning.objects.timeline.startsIn', { date: label })
    : label
})

const endLabel = computed<TimelineEndLabel | null>(() => {
  const { end, state, daysToEnd } = goalWindow.value
  if (!end || daysToEnd === null) return null
  const label = dayLabel(end)
  if (state === 'due-today') return { label, hint: t('planning.objects.timeline.today') }
  if (state === 'overdue') {
    const count = Math.abs(daysToEnd)
    return {
      label,
      hint:
        count === 1
          ? t('planning.objects.timeline.overdueOne')
          : t('planning.objects.timeline.overdue', { count }),
      tone: 'bad',
    }
  }
  if (daysToEnd === 1) return { label, hint: t('planning.objects.timeline.inOneDay') }
  if (daysToEnd >= 14) {
    return { label, hint: t('planning.objects.timeline.inWeeks', { count: Math.round(daysToEnd / 7) }) }
  }
  return { label, hint: t('planning.objects.timeline.inDays', { count: daysToEnd }) }
})

// --- Inline editing entry points -----------------------------------------

function openLinks(kind: AffiliationKind | null): void {
  menuOpen.value = false
  linksRef.value?.openAt(kind)
}

function openMonths(): void {
  menuOpen.value = false
  void monthsRef.value?.show()
}

// Status is quiet: shown as text only when it is not the default "open".
const statusLabel = computed(() => {
  if (props.item.status === 'open') return null
  const opt = props.statusOptions.find((o) => o.value === props.item.status)
  return opt?.label ?? props.item.status
})

function handleStatusChange(value: string): void {
  menuOpen.value = false
  emitFieldChange('status', value)
}

function handleAddKeyResult(): void {
  menuOpen.value = false
  emit('add-key-result', props.item.id)
}

function handleEdit(): void {
  menuOpen.value = false
  emit('edit', props.item.id)
}

function handleArchive(): void {
  menuOpen.value = false
  emit('archive', props.item.id, props.item.isActive)
}

function handleDelete(): void {
  menuOpen.value = false
  emit('delete', props.item.id, props.item.title)
}

function handleOutsideClick(event: MouseEvent): void {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    menuOpen.value = false
  }
}

// Auto-focus title when new goal is created
watch(
  () => props.isNew,
  (isNew) => {
    if (isNew) {
      void nextTick(() => {
        titleRef.value?.focus()
      })
    }
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideClick)
})
</script>
