<template>
  <article
    class="group/card mg-v2-surface mg-v2-surface--raised-sm p-3"
  >
    <div class="space-y-2">
      <!-- Row 1: Icon + Title + hover tray (links, expand, menu w/ status) -->
      <div class="flex items-center gap-2">
        <IconPicker
          icon-size="lg"
          :model-value="item.icon"
          compact
          minimal
          :allow-clear="true"
          :aria-label="panelType === 'habit' ? 'Habit icon' : 'Tracker icon'"
          @update:model-value="emitFieldChange('icon', $event)"
        />
        <input
          ref="titleRef"
          v-model="title"
          type="text"
          class="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm font-semibold text-on-surface outline-none placeholder:text-on-surface-variant/40"
          :placeholder="t('planning.objects.form.title')"
          @blur="flushTitle"
        />
        <div class="mg-v2-card-tray group-hover/card:opacity-100">
          <button
            type="button"
            class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet shrink-0"
            :aria-label="isExpanded ? t('planning.objects.actions.hideDetails') : t('planning.objects.actions.showDetails')"
            @click="$emit('toggle-expand')"
          >
            <AppIcon v-if="isExpanded" name="expand_less" class="text-base" />
            <AppIcon v-else name="expand_more" class="text-base" />
          </button>
          <div ref="menuRef" class="relative">
            <button
              type="button"
              class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet shrink-0"
              aria-label="More actions"
              @click.stop="menuOpen = !menuOpen"
            >
              <AppIcon name="more_horiz" class="text-base" />
            </button>
            <div
              v-if="menuOpen"
              class="mg-v2-popover absolute right-0 top-full z-20 mt-1 min-w-[150px] overflow-hidden"
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
              </div>
              <div class="mg-v2-menu-section">
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

      <!-- Affiliation glyphs (priorities · life areas); click edits -->
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

      <!-- Row 2: quiet facts. Collapses when expanded — the target sentence
           below then shows cadence + mode + target in editable form. -->
      <div
        class="transition-all duration-200 ease-in-out"
        :style="{ maxHeight: isExpanded ? '0' : '2.5rem', opacity: isExpanded ? 0 : 1, overflow: 'hidden' }"
      >
        <p class="mg-v2-meta px-1">
          <span v-if="statusLabel" class="mg-v2-meta__status">{{ statusLabel }}</span>
          <span v-if="!item.isActive">{{ t('planning.objects.badges.archived') }}</span>
          <span>{{ cadenceLabel }}</span>
          <span>{{ entryModeLabel }}</span>
          <span v-if="panelType === 'habit' && item.target">
            {{ formatMeasurementTargetSummary(item.target, t) }}
          </span>
        </p>
      </div>

      <!-- Expanded section -->
      <div
        class="transition-all duration-200 ease-in-out"
        :style="{ maxHeight: isExpanded ? '700px' : '0', opacity: isExpanded ? 1 : 0, overflow: isExpanded ? 'visible' : 'hidden' }"
      >
        <div class="space-y-3 pt-1">
          <!-- Rating scale (only when rating; cadence + mode live in the sentence below) -->
          <div v-if="item.entryMode === 'rating'" class="space-y-1">
            <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              {{ t('planning.objects.form.ratingScale') }}
            </div>
            <div class="flex items-center gap-1.5">
              <label class="text-[9px] text-on-surface-variant/70">{{ t('planning.objects.form.ratingScaleMin') }}</label>
              <input
                :value="item.ratingScaleMin ?? 1"
                type="number"
                step="1"
                min="0"
                class="mg-v2-field !w-12 !px-1.5 text-center text-xs"
                @change="handleScaleMinChange"
              />
              <label class="text-[9px] text-on-surface-variant/70">{{ t('planning.objects.form.ratingScaleMax') }}</label>
              <input
                :value="item.ratingScale ?? 10"
                type="number"
                step="1"
                min="1"
                class="mg-v2-field !w-12 !px-1.5 text-center text-xs"
                @change="handleScaleMaxChange"
              />
            </div>
          </div>

          <!-- Multi-completion items + daily threshold -->
          <MultiItemsEditor
            v-if="item.entryMode === 'multi-completion'"
            :items="item.multiItems ?? []"
            :threshold="item.multiDailyThreshold"
            @update:config="emitFieldChange('multiConfig', $event)"
          />

          <!-- Periods + Target -->
          <div class="grid gap-3" :class="panelType === 'habit' ? 'grid-cols-2' : 'grid-cols-1'">
            <!-- Periods -->
            <div class="space-y-1">
              <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {{ t('planning.objects.form.periods') }}
              </div>
              <div
                class="mg-v2-surface mg-v2-surface--flat group relative min-h-[60px] p-1.5"
              >
                <PeriodCalendarPicker
                  :model-value="linkedPeriods.map(period => period.periodRef)"
                  :cadence="item.cadence === 'monthly' ? 'monthly' : 'weekly'"
                  :commit="savePeriods"
                />

                <PeriodSelectionSummary :periods="linkedPeriods.map(period => period.periodRef)" :cadence="item.cadence === 'monthly' ? 'monthly' : 'weekly'" />
              </div>
            </div>

            <!-- Target (habits only) -->
            <div v-if="panelType === 'habit' && item.target" class="space-y-1">
              <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {{ t('planning.objects.form.target') }}
              </div>
              <MeasurementTargetSentence
                :entry-mode="item.entryMode ?? 'completion'"
                :target="item.target"
                :cadence="item.cadence === 'monthly' ? 'monthly' : 'weekly'"
                :rating-scale="item.ratingScale"
                :rating-scale-min="item.ratingScaleMin"
                show-cadence
                @update:measurement="onTargetMeasurement"
                @update:cadence="onCadence"
              />
            </div>
          </div>

          <!-- Completion rules -->
          <div class="space-y-1">
            <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              {{ t('planning.objects.form.completionRules') }}
            </div>
            <textarea
              ref="descriptionRef"
              v-model="description"
              class="mg-v2-field w-full resize-y text-xs"
              :placeholder="t('planning.objects.form.completionRulesPlaceholder')"
              @blur="flushDescription"
            />
          </div>
        </div>
      </div>

      <!-- Chart -->
      <MeasurementSparkline
        v-if="item.chartData"
        :points="item.chartData"
        :cadence="item.cadence ?? 'weekly'"
        :entry-mode="item.entryMode ?? 'completion'"
      />

    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import PeriodSelectionSummary from '@/components/objects/PeriodSelectionSummary.vue'
import PeriodCalendarPicker from '@/components/objects/PeriodCalendarPicker.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import IconPicker from '@/components/shared/IconPicker.vue'
import MeasurementTargetSentence from '@/components/objects/MeasurementTargetSentence.vue'
import MultiItemsEditor from '@/components/objects/MultiItemsEditor.vue'
import GoalLinksDropdown from '@/components/objects/GoalLinksDropdown.vue'
import ObjectCardAffiliation from '@/components/objects/ObjectCardAffiliation.vue'
import type { AffiliationKind } from '@/components/objects/ObjectCardAffiliation.vue'
import ObjectsCardStatusMenu from '@/components/objects/ObjectsCardStatusMenu.vue'
import MeasurementSparkline from '@/components/objects/MeasurementSparkline.vue'
import { useEditableField } from '@/composables/useEditableField'
import { formatMeasurementTargetSummary } from '@/utils/measurementTargetFormat'
import type { ObjectsLibraryFilterOption, ObjectsLibraryListItem } from '@/services/objectsLibraryQueries'
import type { MeasurementEntryMode, MeasurementTarget, PlanningCadence } from '@/domain/planning'
import type { LinkedPeriod } from '@/components/objects/ObjectsLibraryKrCard.vue'

const props = defineProps<{
  item: ObjectsLibraryListItem
  panelType: 'habit' | 'tracker'
  isExpanded: boolean
  isNew?: boolean
  linkedPeriods: LinkedPeriod[]
  savePeriods?: (periods: string[]) => Promise<void>
  cadenceOptions: Array<{ value: string; label: string }>
  entryModeOptions: Array<{ value: string; label: string }>
  statusOptions: Array<{ value: string; label: string }>
  priorityOptions: ObjectsLibraryFilterOption[]
  lifeAreaOptions: ObjectsLibraryFilterOption[]
}>()

const emit = defineEmits<{
  'toggle-expand': []
  'field-change': [id: string, field: string, value: unknown]
  'link-period': [id: string, periodRef: string]
  'unlink-period': [id: string, periodRef: string]
  archive: [id: string, isCurrentlyActive: boolean]
  delete: [id: string, title: string]
}>()

const { t } = useT()

const menuRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)


const { value: title, inputRef: titleRef, flush: flushTitle } = useEditableField({
  source: () => props.item.title,
  commit: (value) => emitFieldChange('title', value),
  delay: 400,
})

const { value: description, inputRef: descriptionRef, flush: flushDescription } = useEditableField({
  source: () => props.item.description,
  commit: (value) => emitFieldChange('description', value),
  delay: 400,
})

const cadenceLabel = computed(() => {
  const opt = props.cadenceOptions.find((o) => o.value === props.item.cadence)
  return opt?.label ?? props.item.cadence ?? ''
})

const entryModeLabel = computed(() => {
  const opt = props.entryModeOptions.find((o) => o.value === props.item.entryMode)
  return opt?.label ?? props.item.entryMode ?? ''
})

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

const MAX_SCALE_SPAN = 10

function handleScaleMinChange(event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  const parsed = Math.round(Number(raw))
  if (!Number.isFinite(parsed) || parsed < 0) return
  const currentMax = props.item.ratingScale ?? 10
  const clampedMax = Math.max(currentMax, parsed + 1)
  const finalMax = parsed + MAX_SCALE_SPAN - 1 < clampedMax ? parsed + MAX_SCALE_SPAN - 1 : clampedMax
  emitFieldChange('ratingScaleMin', parsed)
  if (finalMax !== currentMax) {
    emitFieldChange('ratingScale', finalMax)
  }
}

function handleScaleMaxChange(event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  const parsed = Math.round(Number(raw))
  if (!Number.isFinite(parsed) || parsed < 1) return
  const currentMin = props.item.ratingScaleMin ?? 1
  const clampedMin = Math.min(currentMin, parsed - 1)
  const finalMin = parsed - MAX_SCALE_SPAN + 1 > clampedMin ? parsed - MAX_SCALE_SPAN + 1 : clampedMin
  emitFieldChange('ratingScale', parsed)
  if (finalMin !== currentMin) {
    emitFieldChange('ratingScaleMin', finalMin)
  }
}

// Map the sentence's full {entryMode, target} update back to the card's granular
// field-change autosave (target.kind is fixed here — the mode pill lives in Row A).
function onCadence(value: PlanningCadence): void {
  emitFieldChange('cadence', value)
}

function onTargetMeasurement(measurement: {
  entryMode: MeasurementEntryMode
  target: MeasurementTarget
}): void {
  // Mode change: emit entryMode alone — the store rebuilds the matching target
  // (buildTargetForEntryMode), so emitting target fields here would race it.
  if (measurement.entryMode !== (props.item.entryMode ?? 'completion')) {
    emitFieldChange('entryMode', measurement.entryMode)
    return
  }
  const current = props.item.target
  if (!current) return
  const next = measurement.target
  if (next.operator !== current.operator) emitFieldChange('target.operator', next.operator)
  const nextAggregation = 'aggregation' in next ? next.aggregation : undefined
  const currentAggregation = 'aggregation' in current ? current.aggregation : undefined
  if (nextAggregation !== undefined && nextAggregation !== currentAggregation) {
    emitFieldChange('target.aggregation', nextAggregation)
  }
  if (next.value !== current.value) emitFieldChange('target.value', next.value)
  if (
    next.entryDays?.operator !== current.entryDays?.operator ||
    next.entryDays?.value !== current.entryDays?.value
  ) {
    emitFieldChange('target.entryDays', next.entryDays)
  }
}

function emitFieldChange(field: string, value: unknown): void {
  emit('field-change', props.item.id, field, value)
}

const linksRef = ref<InstanceType<typeof GoalLinksDropdown> | null>(null)

function openLinks(kind: AffiliationKind | null): void {
  menuOpen.value = false
  linksRef.value?.openAt(kind)
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
