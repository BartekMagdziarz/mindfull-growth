<template>
  <article
    class="group/card mg-v2-surface mg-v2-surface--raised-sm p-3.5"
  >
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <IconPicker
          icon-size="lg"
          :model-value="item.icon"
          compact
          minimal
          :allow-clear="true"
          aria-label="Priority icon"
          @update:model-value="emitFieldChange('icon', $event)"
        />
        <input
          ref="titleRef"
          v-model="title"
          type="text"
          class="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm font-semibold text-on-surface outline-none placeholder:text-on-surface-variant/40"
          :placeholder="t('planning.objects.form.priorityTitlePlaceholder')"
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
                  @click="openLinks"
                >
                  {{ t('planning.objects.timeline.links') }}…
                </button>
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                  @click="openYears"
                >
                  {{ t('planning.objects.timeline.years') }}…
                </button>
              </div>
              <div class="mg-v2-menu-section">
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                  @click="handleArchive"
                >
                  {{ item.status === 'active' ? t('planning.objects.actions.pause') : t('planning.objects.actions.activate') }}
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

      <!-- Quiet facts: status (only when not active), order -->
      <p v-if="statusLabel || item.order" class="mg-v2-meta px-1">
        <span v-if="statusLabel" class="mg-v2-meta__status">{{ statusLabel }}</span>
        <span v-if="item.order">#{{ item.order }}</span>
      </p>

      <!-- Affiliation glyphs (life areas); click edits -->
      <div ref="linksRef" class="relative px-1">
        <ObjectCardAffiliation
          :priority-ids="[]"
          :life-area-ids="item.lifeAreaIds ?? []"
          :priority-options="[]"
          :life-area-options="lifeAreaOptions"
          :group-label="t('planning.objects.form.lifeAreas')"
          :empty-label="t('planning.objects.timeline.addLink')"
          @open="openLinks"
        />
            <div
              v-if="linksOpen"
              class="mg-v2-popover absolute left-0 z-20 mt-1 max-h-56 min-w-[190px] overflow-y-auto p-1"
              @click.stop
            >
              <button
                v-for="option in lifeAreaOptions"
                :key="option.id"
                type="button"
                class="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[11px] font-medium text-on-surface hover:bg-primary-soft/30"
                @click="emitFieldChange('toggleLifeArea', option.id)"
              >
                <AppIcon v-if="item.lifeAreaIds?.includes(option.id)" name="check" class="text-xs text-primary" />
                <span v-else class="h-3 w-3" />
                <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
              </button>
              <div v-if="lifeAreaOptions.length === 0" class="px-3 py-2 text-xs text-on-surface-variant">
                {{ t('planning.objects.filters.noOptions') }}
              </div>
            </div>
      </div>

      <!-- Years as stepper dots on a pencil line; click edits linked years -->
      <div class="relative">
        <ObjectCardTimeline
          variant="years"
          :years="yearsWindow"
          interactive
          :label="t('planning.objects.timeline.years')"
          @click="openYears"
        />
        <PriorityYearsDropdown
          ref="yearsRef"
          triggerless
          :linked-years="linkedYears"
          @link-year="$emit('link-year', item.id, $event)"
          @unlink-year="$emit('unlink-year', item.id, $event)"
        />
      </div>

      <label class="mg-v2-field-wrap gap-1">
        <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('planning.objects.form.whyNow') }}</span>
        <textarea
          ref="whyNowRef"
          v-model="whyNow"
          rows="4"
          class="mg-v2-field !min-h-[7rem] w-full resize-y text-xs leading-relaxed"
          @blur="flushWhyNow"
        />
      </label>

      <label class="mg-v2-field-wrap gap-1">
        <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('planning.objects.form.desiredDirection') }}</span>
        <textarea
          ref="desiredDirectionRef"
          v-model="desiredDirection"
          rows="4"
          class="mg-v2-field !min-h-[7rem] w-full resize-y text-xs leading-relaxed"
          @blur="flushDesiredDirection"
        />
      </label>

      <label class="mg-v2-field-wrap gap-1">
        <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('planning.objects.form.tradeoffs') }}</span>
        <textarea
          ref="tradeoffsRef"
          v-model="tradeoffs"
          rows="4"
          class="mg-v2-field !min-h-[7rem] w-full resize-y text-xs leading-relaxed"
          @blur="flushTradeoffs"
        />
      </label>

      <label class="mg-v2-field-wrap gap-1">
        <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('planning.objects.form.progressSignals') }}</span>
        <textarea
          ref="progressSignalsRef"
          v-model="progressSignals"
          rows="4"
          class="mg-v2-field !min-h-[7rem] w-full resize-y text-xs leading-relaxed"
          @change="flushProgressSignals"
          @blur="flushProgressSignals"
        />
      </label>

      <label class="mg-v2-field-wrap gap-1">
        <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('planning.objects.form.riskSignals') }}</span>
        <textarea
          ref="riskSignalsRef"
          v-model="riskSignals"
          rows="4"
          class="mg-v2-field !min-h-[7rem] w-full resize-y text-xs leading-relaxed"
          @change="flushRiskSignals"
          @blur="flushRiskSignals"
        />
      </label>

      <section v-if="item.status === 'closed'" class="mg-v2-surface mg-v2-surface--flat space-y-2 p-2.5">
        <label class="mg-v2-field-wrap gap-1">
          <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('planning.objects.form.closedAt') }}</span>
          <input
            ref="closedAtRef"
            v-model="closedAt"
            type="text"
            class="mg-v2-field w-full text-xs"
            @change="flushClosedAt"
            @blur="flushClosedAt"
          />
        </label>
        <label class="mg-v2-field-wrap gap-1">
          <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('planning.objects.form.closingSummary') }}</span>
          <textarea
            ref="closingSummaryRef"
            v-model="closingSummary"
            rows="2"
            class="mg-v2-field !min-h-[4.25rem] w-full resize-none text-xs leading-relaxed"
            @blur="flushClosingSummary"
          />
        </label>
        <div class="grid gap-2 sm:grid-cols-3">
          <label class="mg-v2-field-wrap gap-1">
            <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('planning.objects.form.workedWell') }}</span>
            <textarea
              ref="workedWellRef"
              v-model="workedWell"
              rows="3"
              class="mg-v2-field !min-h-[5.5rem] w-full resize-none text-xs leading-relaxed"
              @blur="flushWorkedWell"
            />
          </label>
          <label class="mg-v2-field-wrap gap-1">
            <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('planning.objects.form.wasDifficult') }}</span>
            <textarea
              ref="wasDifficultRef"
              v-model="wasDifficult"
              rows="3"
              class="mg-v2-field !min-h-[5.5rem] w-full resize-none text-xs leading-relaxed"
              @blur="flushWasDifficult"
            />
          </label>
          <label class="mg-v2-field-wrap gap-1">
            <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('planning.objects.form.learned') }}</span>
            <textarea
              ref="learnedRef"
              v-model="learned"
              rows="3"
              class="mg-v2-field !min-h-[5.5rem] w-full resize-none text-xs leading-relaxed"
              @blur="flushLearned"
            />
          </label>
        </div>
      </section>

      <div v-if="item.linkedCounts" class="grid grid-cols-4 gap-1.5">
        <div
          v-for="metric in linkedMetrics"
          :key="metric.label"
          class="mg-v2-surface mg-v2-surface--flat px-2 py-1.5 text-center"
        >
          <div class="text-sm font-semibold tabular-nums text-on-surface">{{ metric.value }}</div>
          <div class="truncate text-[9px] font-medium uppercase text-on-surface-variant">{{ metric.label }}</div>
        </div>
      </div>

      <PriorityDraftChecklist
        :priority-id="item.id"
        @changed="$emit('drafts-changed', item.id)"
        @notify="$emit('drafts-notify', $event)"
        @error="$emit('drafts-error', $event)"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import IconPicker from '@/components/shared/IconPicker.vue'
import ObjectsCardStatusMenu from '@/components/objects/ObjectsCardStatusMenu.vue'
import PriorityDraftChecklist from '@/components/objects/priority-creator/PriorityDraftChecklist.vue'
import PriorityYearsDropdown from '@/components/objects/PriorityYearsDropdown.vue'
import ObjectCardAffiliation from '@/components/objects/ObjectCardAffiliation.vue'
import ObjectCardTimeline from '@/components/objects/ObjectCardTimeline.vue'
import { computeYearsWindow } from '@/utils/objectWindow'
import type { YearRef } from '@/domain/period'
import type { LinkedYear } from '@/components/objects/PriorityYearsDropdown.vue'
import { useEditableField } from '@/composables/useEditableField'
import { useT } from '@/composables/useT'
import type { ObjectsLibraryFilterOption, ObjectsLibraryListItem } from '@/services/objectsLibraryQueries'

const props = defineProps<{
  item: ObjectsLibraryListItem
  statusOptions: Array<{ value: string; label: string }>
  lifeAreaOptions: ObjectsLibraryFilterOption[]
  isNew?: boolean
}>()

const emit = defineEmits<{
  'field-change': [id: string, field: string, value: unknown]
  'link-year': [id: string, yearRef: string]
  'unlink-year': [id: string, yearRef: string]
  archive: [id: string, isCurrentlyActive: boolean]
  delete: [id: string, title: string]
  'drafts-changed': [id: string]
  'drafts-notify': [message: string]
  'drafts-error': [message: string]
}>()

const { t } = useT()

function emitFieldChange(field: string, value: unknown): void {
  emit('field-change', props.item.id, field, value)
}

function signalsToText(signals: string[] | undefined): string {
  return (signals ?? []).join('\n')
}

const TITLE_DELAY_MS = 400
const TEXT_DELAY_MS = 500

const { value: title, inputRef: titleRef, flush: flushTitle } = useEditableField({
  source: () => props.item.title,
  commit: (value) => emitFieldChange('title', value),
  delay: TITLE_DELAY_MS,
})

const { value: whyNow, inputRef: whyNowRef, flush: flushWhyNow } = useEditableField({
  source: () => props.item.whyNow,
  commit: (value) => emitFieldChange('whyNow', value),
  delay: TEXT_DELAY_MS,
})

const { value: desiredDirection, inputRef: desiredDirectionRef, flush: flushDesiredDirection } = useEditableField({
  source: () => props.item.desiredDirection,
  commit: (value) => emitFieldChange('desiredDirection', value),
  delay: TEXT_DELAY_MS,
})

const { value: tradeoffs, inputRef: tradeoffsRef, flush: flushTradeoffs } = useEditableField({
  source: () => props.item.tradeoffs,
  commit: (value) => emitFieldChange('tradeoffs', value),
  delay: TEXT_DELAY_MS,
})

const { value: progressSignals, inputRef: progressSignalsRef, flush: flushProgressSignals } = useEditableField<string[], string>({
  source: () => props.item.progressSignals,
  format: signalsToText,
  commit: (value) => emitFieldChange('progressSignals', value),
})

const { value: riskSignals, inputRef: riskSignalsRef, flush: flushRiskSignals } = useEditableField<string[], string>({
  source: () => props.item.riskSignals,
  format: signalsToText,
  commit: (value) => emitFieldChange('riskSignals', value),
})

const { value: closedAt, inputRef: closedAtRef, flush: flushClosedAt } = useEditableField({
  source: () => props.item.closingReflection?.closedAt,
  commit: (value) => emitFieldChange('closingReflection.closedAt', value),
})

const { value: closingSummary, inputRef: closingSummaryRef, flush: flushClosingSummary } = useEditableField({
  source: () => props.item.closingReflection?.summary,
  commit: (value) => emitFieldChange('closingReflection.summary', value),
  delay: TEXT_DELAY_MS,
})

const { value: workedWell, inputRef: workedWellRef, flush: flushWorkedWell } = useEditableField({
  source: () => props.item.closingReflection?.workedWell,
  commit: (value) => emitFieldChange('closingReflection.workedWell', value),
  delay: TEXT_DELAY_MS,
})

const { value: wasDifficult, inputRef: wasDifficultRef, flush: flushWasDifficult } = useEditableField({
  source: () => props.item.closingReflection?.wasDifficult,
  commit: (value) => emitFieldChange('closingReflection.wasDifficult', value),
  delay: TEXT_DELAY_MS,
})

const { value: learned, inputRef: learnedRef, flush: flushLearned } = useEditableField({
  source: () => props.item.closingReflection?.learned,
  commit: (value) => emitFieldChange('closingReflection.learned', value),
  delay: TEXT_DELAY_MS,
})

const menuRef = ref<HTMLElement | null>(null)
const linksRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const linksOpen = ref(false)

const linkedYears = computed<LinkedYear[]>(() =>
  (props.item.years ?? []).map((year) => ({ yearRef: year, displayLabel: year })),
)

const yearsWindow = computed(() =>
  computeYearsWindow((props.item.years ?? []) as YearRef[], new Date()),
)

const yearsRef = ref<InstanceType<typeof PriorityYearsDropdown> | null>(null)

function openLinks(): void {
  menuOpen.value = false
  linksOpen.value = true
}

function openYears(): void {
  menuOpen.value = false
  yearsRef.value?.openList()
}

// Status is quiet: shown as text only when it is not the default "active".
const statusLabel = computed(() => {
  if (props.item.status === 'active') return null
  const opt = props.statusOptions.find((o) => o.value === props.item.status)
  return opt?.label ?? props.item.status
})

function handleStatusChange(value: string): void {
  menuOpen.value = false
  emitFieldChange('status', value)
}

const linkedMetrics = computed(() => [
  { label: t('planning.objects.families.goals'), value: props.item.linkedCounts?.goals ?? 0 },
  { label: t('planning.objects.families.habits'), value: props.item.linkedCounts?.habits ?? 0 },
  { label: t('planning.objects.families.trackers'), value: props.item.linkedCounts?.trackers ?? 0 },
  { label: t('planning.objects.families.intentions'), value: props.item.linkedCounts?.intentions ?? 0 },
])

function handleArchive(): void {
  menuOpen.value = false
  emit('archive', props.item.id, props.item.status === 'active')
}

function handleDelete(): void {
  menuOpen.value = false
  emit('delete', props.item.id, props.item.title)
}

function handleOutsideClick(event: MouseEvent): void {
  const target = event.target as Node
  if (menuRef.value && !menuRef.value.contains(target)) {
    menuOpen.value = false
  }
  if (linksRef.value && !linksRef.value.contains(target)) {
    linksOpen.value = false
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
