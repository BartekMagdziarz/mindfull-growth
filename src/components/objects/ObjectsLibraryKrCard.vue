<template>
  <div class="group/kr mg-v2-surface mg-v2-surface--flat">
    <div class="space-y-2 p-2.5">
      <!-- Row 1: Title + hover tray (expand, menu w/ status) -->
      <div class="flex items-center gap-2">
        <input
          ref="titleRef"
          v-model="title"
          type="text"
          class="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-xs font-medium text-on-surface outline-none placeholder:text-on-surface-variant/40"
          :placeholder="t('planning.objects.form.title')"
          @blur="flushTitle"
        />
        <div class="mg-v2-card-tray group-hover/kr:opacity-100">
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
                :model-value="child.status"
                :options="statusOptions"
                @update:model-value="handleStatusChange"
              />
              <div class="mg-v2-menu-section">
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                  @click="handleArchive"
                >
                  {{ child.isActive ? t('planning.objects.actions.archive') : t('planning.objects.actions.unarchive') }}
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

      <!-- Row 2: quiet facts (hidden while the editable sentence is open) -->
      <p v-if="!isExpanded" class="mg-v2-meta px-1">
        <span v-if="statusLabel" class="mg-v2-meta__status">{{ statusLabel }}</span>
        <span v-if="!child.isActive">{{ t('planning.objects.badges.archived') }}</span>
        <span>{{ cadenceLabel }}</span>
        <span>{{ entryModeLabel }}</span>
        <span>{{ formatMeasurementTargetSummary(child.target, t) }}</span>
      </p>

      <!-- Expanded section -->
      <div
        class="transition-all duration-200 ease-in-out"
        :style="{ maxHeight: isExpanded ? '700px' : '0', opacity: isExpanded ? 1 : 0, overflow: isExpanded ? 'visible' : 'hidden' }"
      >
        <div class="space-y-3 pt-1">
          <!-- Periods + Target (cadence + mode live in the sentence) -->
          <div class="grid grid-cols-2 gap-3">
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
                  :cadence="child.cadence === 'monthly' ? 'monthly' : 'weekly'"
                  :commit="savePeriods"
                />

                <PeriodSelectionSummary :periods="linkedPeriods.map(period => period.periodRef)" :cadence="child.cadence === 'monthly' ? 'monthly' : 'weekly'" />
              </div>
            </div>

            <!-- Target -->
            <div class="space-y-1">
              <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {{ t('planning.objects.form.target') }}
              </div>
              <MeasurementTargetSentence
                :entry-mode="child.entryMode ?? 'completion'"
                :target="child.target"
                :cadence="child.cadence === 'monthly' ? 'monthly' : 'weekly'"
                show-cadence
                @update:measurement="onTargetMeasurement"
                @update:cadence="onCadence"
              />
            </div>
          </div>

          <!-- Multi-completion items + daily threshold -->
          <MultiItemsEditor
            v-if="child.entryMode === 'multi-completion'"
            :items="child.multiItems ?? []"
            :threshold="child.multiDailyThreshold"
            @update:config="emitFieldChange('multiConfig', $event)"
          />

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
      <MeasurementSparkline :points="child.chartData" :cadence="child.cadence" :entry-mode="child.entryMode" />

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import PeriodSelectionSummary from '@/components/objects/PeriodSelectionSummary.vue'
import PeriodCalendarPicker from '@/components/objects/PeriodCalendarPicker.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import MeasurementTargetSentence from '@/components/objects/MeasurementTargetSentence.vue'
import MultiItemsEditor from '@/components/objects/MultiItemsEditor.vue'
import ObjectsCardStatusMenu from '@/components/objects/ObjectsCardStatusMenu.vue'
import MeasurementSparkline from '@/components/objects/MeasurementSparkline.vue'
import { useEditableField } from '@/composables/useEditableField'
import { formatMeasurementTargetSummary } from '@/utils/measurementTargetFormat'
import type { ObjectsLibraryChildPreview } from '@/services/objectsLibraryQueries'
import type { MeasurementEntryMode, MeasurementTarget, PlanningCadence } from '@/domain/planning'

export interface LinkedPeriod {
  periodRef: string
  displayLabel: string
}

const props = defineProps<{
  child: ObjectsLibraryChildPreview
  parentGoalId: string
  isExpanded: boolean
  linkedPeriods: LinkedPeriod[]
  savePeriods?: (periods: string[]) => Promise<void>
  goalLinkedMonthRefs: string[]
  cadenceOptions: Array<{ value: string; label: string }>
  entryModeOptions: Array<{ value: string; label: string }>
  statusOptions: Array<{ value: string; label: string }>
  targetOperatorOptions: Array<{ value: string; label: string }>
  targetAggregationOptions: Array<{ value: string; label: string }>
  showTargetAggregation: boolean
}>()

const emit = defineEmits<{
  'toggle-expand': []
  'field-change': [field: string, value: unknown]
  'link-period': [periodRef: string]
  'unlink-period': [periodRef: string]
  delete: []
  archive: []
}>()

const { t } = useT()

const menuRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)


function emitFieldChange(field: string, value: unknown): void {
  emit('field-change', field, value)
}

const { value: title, inputRef: titleRef, flush: flushTitle } = useEditableField({
  source: () => props.child.title,
  commit: (value) => emitFieldChange('title', value),
  delay: 400,
})

const { value: description, inputRef: descriptionRef, flush: flushDescription } = useEditableField({
  source: () => props.child.description,
  commit: (value) => emitFieldChange('description', value),
  delay: 400,
})

// Map the sentence's {entryMode, target} update to granular field-change autosave.
function onCadence(value: PlanningCadence): void {
  emitFieldChange('cadence', value)
}

function onTargetMeasurement(measurement: {
  entryMode: MeasurementEntryMode
  target: MeasurementTarget
}): void {
  // Mode change: emit entryMode alone — the store rebuilds the matching target.
  if (measurement.entryMode !== (props.child.entryMode ?? 'completion')) {
    emitFieldChange('entryMode', measurement.entryMode)
    return
  }
  const current = props.child.target
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

const cadenceLabel = computed(() => {
  const opt = props.cadenceOptions.find((o) => o.value === props.child.cadence)
  return opt?.label ?? props.child.cadence
})

const entryModeLabel = computed(() => {
  const opt = props.entryModeOptions.find((o) => o.value === props.child.entryMode)
  return opt?.label ?? props.child.entryMode
})

// Status is quiet: shown as text only when it is not the default "open".
const statusLabel = computed(() => {
  if (props.child.status === 'open') return null
  const opt = props.statusOptions.find((o) => o.value === props.child.status)
  return opt?.label ?? props.child.status
})

function handleStatusChange(value: string): void {
  menuOpen.value = false
  emitFieldChange('status', value)
}

function handleArchive(): void {
  menuOpen.value = false
  emit('archive')
}

function handleDelete(): void {
  menuOpen.value = false
  emit('delete')
}

function handleOutsideClick(event: MouseEvent): void {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    menuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideClick)
})
</script>
