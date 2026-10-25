<template>
  <article class="group/card mg-v2-surface mg-v2-surface--raised-sm p-4">
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
          class="mg-v2-inline-field min-w-0 flex-1 text-sm font-bold"
          :placeholder="t('planning.objects.form.title')"
          @blur="flushTitle"
        />
        <div class="mg-v2-card-tray group-hover/card:opacity-100">
          <button
            type="button"
            class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet shrink-0"
            :aria-label="
              isExpanded
                ? t('planning.objects.actions.hideDetails')
                : t('planning.objects.actions.showDetails')
            "
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
                  {{
                    item.isActive
                      ? t('planning.objects.actions.archive')
                      : t('planning.objects.actions.unarchive')
                  }}
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

      <!-- Affiliation glyphs (priorities · life areas) on the left, the
           periods line on the right of the same row; both click to edit. -->
      <div class="relative flex items-center justify-between gap-3 px-1">
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
        <!-- Periods load with the expanded card, so the line shows only then. -->
        <div v-if="isExpanded" class="relative shrink-0">
          <ObjectCardPeriods
            :periods="linkedPeriods.map(period => period.periodRef)"
            :cadence="item.cadence === 'monthly' ? 'monthly' : 'weekly'"
            :is-permanent="panelType === 'habit' && Boolean(item.isPermanent)"
            @open="openPeriods"
          />
          <PeriodCalendarPicker
            ref="periodsRef"
            triggerless
            :model-value="linkedPeriods.map(period => period.periodRef)"
            :cadence="item.cadence === 'monthly' ? 'monthly' : 'weekly'"
            :commit="savePeriods"
            :allow-permanent="panelType === 'habit'"
            :is-permanent="item.isPermanent"
            :commit-schedule="saveSchedule"
          />
        </div>
      </div>

      <!-- Expanded section -->
      <div
        class="transition-all duration-200 ease-in-out"
        :style="{
          maxHeight: isExpanded ? '700px' : '0',
          opacity: isExpanded ? 1 : 0,
          overflow: isExpanded ? 'visible' : 'hidden',
        }"
      >
        <div class="space-y-3 pt-1">
          <!-- The sentence: what counts, how often (a tracker: mode, scale, cadence) -->
          <section class="mg-v2-group">
            <MeasurementTargetSentence
              :entry-mode="item.entryMode ?? 'completion'"
              :target="item.target"
              :cadence="item.cadence === 'monthly' ? 'monthly' : 'weekly'"
              :rating-scale="item.ratingScale ?? 10"
              :rating-scale-min="item.ratingScaleMin ?? 1"
              :multi="multiFacts"
              editable-scale
              show-cadence
              @update:measurement="onTargetMeasurement"
              @update:cadence="onCadence"
              @update:scale="onScale"
              @update:threshold="onThreshold"
            />
          </section>

          <!-- Checklist items (threshold lives in the sentence) -->
          <section v-if="item.entryMode === 'multi-completion'" class="mg-v2-group">
            <p class="mg-v2-group__label">{{ t('planning.objects.form.multiItems.heading') }}</p>
            <MultiItemsEditor
              :items="item.multiItems ?? []"
              :threshold="item.multiDailyThreshold"
              @update:config="emitFieldChange('multiConfig', $event)"
            />
          </section>

          <!-- Completion rules: the placeholder is the label -->
          <textarea
            ref="descriptionRef"
            v-model="description"
            class="mg-v2-field w-full resize-y text-sm"
            :aria-label="t('planning.objects.form.completionRules')"
            :placeholder="t('planning.objects.form.completionRulesPlaceholder')"
            @blur="flushDescription"
          />
        </div>
      </div>

      <!-- Measurement field: quiet facts + chart as ONE thing, the same
           anatomy as a KR inside a goal card (a habit reads like a goal with
           a single KR). Facts collapse when expanded — the target sentence
           above then shows cadence + mode + target in editable form. -->
      <div :class="item.chartData ? 'mg-v2-group' : ''" data-testid="measurement-field">
        <div
          class="transition-all duration-200 ease-in-out"
          :class="isExpanded || !item.chartData ? '' : 'mb-2'"
          :style="{
            maxHeight: isExpanded ? '0' : '2.5rem',
            opacity: isExpanded ? 0 : 1,
            overflow: 'hidden',
          }"
        >
          <p class="mg-v2-meta px-1">
            <span v-if="statusLabel" class="mg-v2-meta__status">{{ statusLabel }}</span>
            <span v-if="!item.isActive">{{ t('planning.objects.badges.archived') }}</span>
            <span v-if="sentence">{{ sentence }}</span>
            <template v-else>
              <span>{{ cadenceLabel }}</span>
              <span>{{ entryModeLabel }}</span>
            </template>
          </p>
        </div>

        <MeasurementSparkline
          v-if="item.chartData"
          :points="item.chartData"
          :cadence="item.cadence ?? 'weekly'"
          :entry-mode="item.entryMode ?? 'completion'"
        />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ObjectCardPeriods from '@/components/objects/ObjectCardPeriods.vue'
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
import { checklistSentenceFacts, formatMeasurementSentence } from '@/utils/measurementTargetFormat'
import type {
  ObjectsLibraryFilterOption,
  ObjectsLibraryListItem,
} from '@/services/objectsLibraryQueries'
import type { MeasurementEntryMode, MeasurementTarget, PlanningCadence } from '@/domain/planning'
import type { LinkedPeriod } from '@/components/objects/ObjectsLibraryKrCard.vue'

const props = defineProps<{
  item: ObjectsLibraryListItem
  panelType: 'habit' | 'tracker'
  isExpanded: boolean
  isNew?: boolean
  linkedPeriods: LinkedPeriod[]
  savePeriods?: (periods: string[]) => Promise<void>
  saveSchedule?: (periods: string[], isPermanent: boolean) => Promise<void>
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
const periodsRef = ref<InstanceType<typeof PeriodCalendarPicker> | null>(null)

function openPeriods(): void {
  void periodsRef.value?.show()
}

const {
  value: title,
  inputRef: titleRef,
  flush: flushTitle,
} = useEditableField({
  source: () => props.item.title,
  commit: value => emitFieldChange('title', value),
  delay: 400,
})

const {
  value: description,
  inputRef: descriptionRef,
  flush: flushDescription,
} = useEditableField({
  source: () => props.item.description,
  commit: value => emitFieldChange('description', value),
  delay: 400,
})

const cadenceLabel = computed(() => {
  const opt = props.cadenceOptions.find(o => o.value === props.item.cadence)
  return opt?.label ?? props.item.cadence ?? ''
})

const entryModeLabel = computed(() => {
  const opt = props.entryModeOptions.find(o => o.value === props.item.entryMode)
  return opt?.label ?? props.item.entryMode ?? ''
})

// Status is quiet: shown as text only when it is not the default "open".
const statusLabel = computed(() => {
  if (props.item.status === 'open') return null
  const opt = props.statusOptions.find(o => o.value === props.item.status)
  return opt?.label ?? props.item.status
})

function handleStatusChange(value: string): void {
  menuOpen.value = false
  emitFieldChange('status', value)
}

// Checklist facts for the threshold clause; undefined outside multi-completion.
const multiFacts = computed(() =>
  props.item.entryMode === 'multi-completion'
    ? checklistSentenceFacts(props.item.multiItems ?? [], props.item.multiDailyThreshold)
    : undefined
)

// Reading form of the sentence the expanded card edits; a tracker has no target.
const sentence = computed(() => {
  if (!props.item.target) return ''
  return formatMeasurementSentence(
    {
      entryMode: props.item.entryMode ?? 'completion',
      target: props.item.target,
      cadence: props.item.cadence === 'monthly' ? 'monthly' : 'weekly',
      ratingScale: props.item.ratingScale ?? 10,
      multi: multiFacts.value,
    },
    t
  )
})

function onScale(scale: { min: number; max: number }): void {
  if (scale.min !== (props.item.ratingScaleMin ?? 1)) emitFieldChange('ratingScaleMin', scale.min)
  if (scale.max !== (props.item.ratingScale ?? 10)) emitFieldChange('ratingScale', scale.max)
}

function onThreshold(threshold: number | undefined): void {
  emitFieldChange('multiConfig', { items: props.item.multiItems ?? [], threshold })
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
  isNew => {
    if (isNew) {
      void nextTick(() => {
        titleRef.value?.focus()
      })
    }
  },
  { immediate: true }
)

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideClick)
})
</script>
