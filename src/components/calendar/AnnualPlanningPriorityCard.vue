<template>
  <article
    class="neo-card border-neu-border/30 bg-gradient-to-br from-neu-top to-neu-bottom p-3.5"
  >
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <IconPicker
          icon-size="lg"
          :model-value="priority.icon"
          compact
          minimal
          :allow-clear="true"
          :aria-label="iconAriaLabel"
          @update:model-value="emit('field-change', 'icon', $event)"
        />
        <input
          ref="titleRef"
          v-model="title"
          class="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm font-semibold text-on-surface outline-none"
          :placeholder="titlePlaceholder"
          @blur="flushTitle"
        />
        <StatusIconButton
          :model-value="priority.status"
          :options="statusOptions"
          @update:model-value="emit('field-change', 'status', $event)"
        />
      </div>

      <ObjectsLibraryPillSelect
        :model-value="priority.lifeAreaIds"
        :options="lifeAreaOptions"
        :label="lifeAreasLabel"
        :empty-label="lifeAreasEmptyLabel"
        :clear-label="lifeAreasClearLabel"
        :add-label="lifeAreasAddLabel"
        @update:model-value="emit('field-change', 'lifeAreaIds', $event)"
      />

      <label class="block space-y-1">
        <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
          {{ yearsLabel }}
        </span>
        <input
          ref="yearsRef"
          v-model="years"
          class="neo-input min-h-10 w-full px-3 py-2 text-xs"
          placeholder="2026"
          @change="flushYears"
          @blur="flushYears"
        />
      </label>

      <textarea
        ref="whyNowRef"
        v-model="whyNow"
        rows="4"
        class="neo-input min-h-[7rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
        :placeholder="whyNowPlaceholder"
        @blur="flushWhyNow"
      />
      <textarea
        ref="desiredDirectionRef"
        v-model="desiredDirection"
        rows="4"
        class="neo-input min-h-[7rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
        :placeholder="desiredDirectionPlaceholder"
        @blur="flushDesiredDirection"
      />
      <textarea
        ref="tradeoffsRef"
        v-model="tradeoffs"
        rows="4"
        class="neo-input min-h-[7rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
        :placeholder="tradeoffsPlaceholder"
        @blur="flushTradeoffs"
      />
      <textarea
        ref="progressSignalsRef"
        v-model="progressSignals"
        rows="4"
        class="neo-input min-h-[7rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
        :placeholder="progressSignalsPlaceholder"
        @change="flushProgressSignals"
        @blur="flushProgressSignals"
      />
      <textarea
        ref="riskSignalsRef"
        v-model="riskSignals"
        rows="4"
        class="neo-input min-h-[7rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
        :placeholder="riskSignalsPlaceholder"
        @change="flushRiskSignals"
        @blur="flushRiskSignals"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import IconPicker from '@/components/shared/IconPicker.vue'
import ObjectsLibraryPillSelect from '@/components/objects/ObjectsLibraryPillSelect.vue'
import StatusIconButton from '@/components/objects/StatusIconButton.vue'
import { useEditableField } from '@/composables/useEditableField'
import type { Priority } from '@/domain/planning'
import type { ObjectsLibraryFilterOption } from '@/services/objectsLibraryQueries'

const props = defineProps<{
  priority: Priority
  statusOptions: Array<{ value: string; label: string }>
  lifeAreaOptions: ObjectsLibraryFilterOption[]
  iconAriaLabel: string
  titlePlaceholder: string
  lifeAreasLabel: string
  lifeAreasEmptyLabel: string
  lifeAreasClearLabel: string
  lifeAreasAddLabel: string
  yearsLabel: string
  whyNowPlaceholder: string
  desiredDirectionPlaceholder: string
  tradeoffsPlaceholder: string
  progressSignalsPlaceholder: string
  riskSignalsPlaceholder: string
}>()

const emit = defineEmits<{
  'field-change': [field: string, value: unknown]
}>()

const DEBOUNCE_MS = 450

const { value: title, inputRef: titleRef, flush: flushTitle } = useEditableField({
  source: () => props.priority.title,
  commit: (value) => emit('field-change', 'title', value),
  delay: DEBOUNCE_MS,
})

const { value: whyNow, inputRef: whyNowRef, flush: flushWhyNow } = useEditableField({
  source: () => props.priority.whyNow,
  commit: (value) => emit('field-change', 'whyNow', value),
  delay: DEBOUNCE_MS,
})

const { value: desiredDirection, inputRef: desiredDirectionRef, flush: flushDesiredDirection } = useEditableField({
  source: () => props.priority.desiredDirection,
  commit: (value) => emit('field-change', 'desiredDirection', value),
  delay: DEBOUNCE_MS,
})

const { value: tradeoffs, inputRef: tradeoffsRef, flush: flushTradeoffs } = useEditableField({
  source: () => props.priority.tradeoffs,
  commit: (value) => emit('field-change', 'tradeoffs', value),
  delay: DEBOUNCE_MS,
})

const { value: years, inputRef: yearsRef, flush: flushYears } = useEditableField<string[], string>({
  source: () => props.priority.years,
  format: (list) => (list ?? []).join(', '),
  commit: (value) => emit('field-change', 'years', value),
})

const { value: progressSignals, inputRef: progressSignalsRef, flush: flushProgressSignals } = useEditableField<string[], string>({
  source: () => props.priority.progressSignals,
  format: (list) => (list ?? []).join('\n'),
  commit: (value) => emit('field-change', 'progressSignals', value),
})

const { value: riskSignals, inputRef: riskSignalsRef, flush: flushRiskSignals } = useEditableField<string[], string>({
  source: () => props.priority.riskSignals,
  format: (list) => (list ?? []).join('\n'),
  commit: (value) => emit('field-change', 'riskSignals', value),
})
</script>
