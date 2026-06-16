<template>
  <article
    class="group/card neo-card neo-raised border-neu-border/30 bg-gradient-to-br from-neu-top to-neu-bottom p-3.5"
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
        <div class="-mr-10 flex shrink-0 items-center gap-1.5 opacity-0 transition-all duration-200 ease-in-out group-hover/card:mr-0 group-hover/card:opacity-100">
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
              class="absolute bottom-full right-0 z-20 mb-1 min-w-[130px] overflow-hidden rounded-xl border border-outline/30 bg-surface shadow-lg"
              @click.stop
            >
              <button
                type="button"
                class="block w-full px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                @click="handleArchive"
              >
                {{ item.status === 'active' ? t('planning.objects.actions.pause') : t('planning.objects.actions.activate') }}
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
        <StatusIconButton
          :model-value="item.status"
          :options="statusOptions"
          @update:model-value="emitFieldChange('status', $event)"
        />
      </div>

      <div class="flex flex-wrap items-center gap-1.5">
        <PriorityYearsDropdown
          :linked-years="linkedYears"
          @link-year="$emit('link-year', item.id, $event)"
          @unlink-year="$emit('unlink-year', item.id, $event)"
        />

        <div ref="linksRef" class="relative">
          <button
            type="button"
            class="neo-icon-button neo-focus"
            :title="t('planning.objects.form.lifeAreas')"
            :aria-label="t('planning.objects.form.lifeAreas')"
            @click.stop="linksOpen = !linksOpen"
          >
            <AppIcon name="link" class="text-base" />
          </button>
          <span
            v-if="(item.lifeAreaIds ?? []).length > 0"
            class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-on-primary"
          >
            {{ item.lifeAreaIds?.length }}
          </span>
          <div
            v-if="linksOpen"
            class="absolute left-0 z-20 mt-1 max-h-56 min-w-[190px] overflow-y-auto rounded-xl border border-outline/30 bg-surface p-1 shadow-lg"
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

        <span
          v-if="item.order"
          class="neo-badge px-2.5 py-1 text-[11px]"
        >
          #{{ item.order }}
        </span>
      </div>

      <textarea
        ref="whyNowRef"
        v-model="whyNow"
        rows="4"
        class="neo-input min-h-[7rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
        :placeholder="t('planning.objects.form.whyNow')"
        @blur="flushWhyNow"
      />

      <textarea
        ref="desiredDirectionRef"
        v-model="desiredDirection"
        rows="4"
        class="neo-input min-h-[7rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
        :placeholder="t('planning.objects.form.desiredDirection')"
        @blur="flushDesiredDirection"
      />

      <textarea
        ref="tradeoffsRef"
        v-model="tradeoffs"
        rows="4"
        class="neo-input min-h-[7rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
        :placeholder="t('planning.objects.form.tradeoffs')"
        @blur="flushTradeoffs"
      />

      <textarea
        ref="progressSignalsRef"
        v-model="progressSignals"
        rows="4"
        class="neo-input min-h-[7rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
        :placeholder="t('planning.objects.form.progressSignals')"
        @change="flushProgressSignals"
        @blur="flushProgressSignals"
      />

      <textarea
        ref="riskSignalsRef"
        v-model="riskSignals"
        rows="4"
        class="neo-input min-h-[7rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
        :placeholder="t('planning.objects.form.riskSignals')"
        @change="flushRiskSignals"
        @blur="flushRiskSignals"
      />

      <section v-if="item.status === 'closed'" class="space-y-2 rounded-xl border border-white/45 bg-white/35 p-2.5">
        <input
          ref="closedAtRef"
          v-model="closedAt"
          type="text"
          class="neo-input w-full px-3 py-2 text-xs"
          :placeholder="t('planning.objects.form.closedAt')"
          @change="flushClosedAt"
          @blur="flushClosedAt"
        />
        <textarea
          ref="closingSummaryRef"
          v-model="closingSummary"
          rows="2"
          class="neo-input min-h-[4.25rem] w-full resize-none px-3 py-2 text-xs leading-relaxed"
          :placeholder="t('planning.objects.form.closingSummary')"
          @blur="flushClosingSummary"
        />
        <div class="grid gap-2 sm:grid-cols-3">
          <textarea
            ref="workedWellRef"
            v-model="workedWell"
            rows="3"
            class="neo-input min-h-[5.5rem] w-full resize-none px-3 py-2 text-xs leading-relaxed"
            :placeholder="t('planning.objects.form.workedWell')"
            @blur="flushWorkedWell"
          />
          <textarea
            ref="wasDifficultRef"
            v-model="wasDifficult"
            rows="3"
            class="neo-input min-h-[5.5rem] w-full resize-none px-3 py-2 text-xs leading-relaxed"
            :placeholder="t('planning.objects.form.wasDifficult')"
            @blur="flushWasDifficult"
          />
          <textarea
            ref="learnedRef"
            v-model="learned"
            rows="3"
            class="neo-input min-h-[5.5rem] w-full resize-none px-3 py-2 text-xs leading-relaxed"
            :placeholder="t('planning.objects.form.learned')"
            @blur="flushLearned"
          />
        </div>
      </section>

      <div v-if="item.linkedCounts" class="grid grid-cols-4 gap-1.5">
        <div
          v-for="metric in linkedMetrics"
          :key="metric.label"
          class="rounded-xl border border-white/45 bg-white/40 px-2 py-1.5 text-center"
        >
          <div class="text-sm font-semibold tabular-nums text-on-surface">{{ metric.value }}</div>
          <div class="truncate text-[9px] font-medium uppercase text-on-surface-variant">{{ metric.label }}</div>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import IconPicker from '@/components/shared/IconPicker.vue'
import StatusIconButton from '@/components/objects/StatusIconButton.vue'
import PriorityYearsDropdown from '@/components/objects/PriorityYearsDropdown.vue'
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

const linkedMetrics = computed(() => [
  { label: t('planning.objects.families.goals'), value: props.item.linkedCounts?.goals ?? 0 },
  { label: t('planning.objects.families.habits'), value: props.item.linkedCounts?.habits ?? 0 },
  { label: t('planning.objects.families.trackers'), value: props.item.linkedCounts?.trackers ?? 0 },
  { label: t('planning.objects.families.initiatives'), value: props.item.linkedCounts?.initiatives ?? 0 },
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
