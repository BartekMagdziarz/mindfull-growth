<template>
  <div class="space-y-4">
    <template v-if="isVlq">
      <AppCard
        v-for="(group, index) in vlqGroups"
        :key="group.scale.id"
        padding="lg"
        class="space-y-4"
      >
        <div class="space-y-1">
          <p class="text-xs text-on-surface-variant">#{{ pageStartIndex + index + 1 }}</p>
          <h3 class="text-base font-semibold text-on-surface">{{ t(group.scale.labelKey) }}</h3>
        </div>

        <div
          v-for="item in group.items"
          :key="item.id"
          class="space-y-2"
        >
          <label class="text-sm text-on-surface">{{ t(item.textKey) }}</label>
          <div class="flex items-center gap-3">
            <input
              type="range"
              :min="item.responseMin"
              :max="item.responseMax"
              :value="responseValue(item.id, item.responseMin)"
              class="w-full"
              @input="onSliderInput(item, $event)"
            >
            <input
              type="number"
              :min="item.responseMin"
              :max="item.responseMax"
              :value="responseValue(item.id, item.responseMin)"
              class="neo-input w-20 p-2 text-center"
              @input="onNumberInput(item, $event)"
            >
          </div>
          <div class="flex items-center justify-between text-xs text-on-surface-variant">
            <span>{{ t(anchorKey(item.responseMin)) }}</span>
            <span>{{ t(anchorKey(item.responseMax)) }}</span>
          </div>
        </div>
      </AppCard>
    </template>

    <template v-else>
      <AppCard
        v-for="(item, index) in items"
        :key="item.id"
        padding="lg"
        class="space-y-3"
      >
        <p class="text-xs text-on-surface-variant">#{{ pageStartIndex + index + 1 }}</p>
        <p class="text-sm font-medium text-on-surface">
          {{ t(item.textKey) }}
        </p>

        <div class="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap sm:gap-2">
          <button
            v-for="value in responseValues(item.responseMin, item.responseMax)"
            :key="value"
            type="button"
            class="neo-pill px-3 py-1.5 text-xs font-semibold"
            :class="{ 'neo-pill--primary': responses[item.id] === value }"
            @click="$emit('update-response', item.id, value)"
          >
            {{ value }}
          </button>
        </div>

        <div class="flex items-center justify-between text-xs text-on-surface-variant">
          <span>{{ t(anchorKey(item.responseMin)) }}</span>
          <span>{{ t(anchorKey(item.responseMax)) }}</span>
        </div>
      </AppCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/AppCard.vue'
import { useT } from '@/composables/useT'
import type { AssessmentDefinition, AssessmentItemDefinition } from '@/domain/assessments'

interface VlqGroup {
  scale: AssessmentDefinition['scales'][number]
  items: AssessmentItemDefinition[]
}

const props = defineProps<{
  definition: AssessmentDefinition
  items: AssessmentItemDefinition[]
  responses: Record<string, number>
  pageStartIndex: number
}>()

const emit = defineEmits<{
  'update-response': [itemId: string, value: number]
}>()

const { t } = useT()

const isVlq = computed(() => props.definition.id === 'vlq')

const vlqGroups = computed<VlqGroup[]>(() => {
  if (!isVlq.value) return []

  const byScale = new Map<string, AssessmentItemDefinition[]>()
  for (const item of props.items) {
    if (!item.scaleId) continue
    const current = byScale.get(item.scaleId) ?? []
    current.push(item)
    byScale.set(item.scaleId, current)
  }

  return props.definition.scales
    .filter((scale) => byScale.has(scale.id))
    .map((scale) => ({
      scale,
      items: (byScale.get(scale.id) ?? []).sort((a, b) => {
        if (a.metric === b.metric) return a.id.localeCompare(b.id)
        return a.metric === 'importance' ? -1 : 1
      }),
    }))
})

function responseValues(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index)
}

function anchorKey(value: number): string {
  return props.definition.responseScale.anchors[String(value)] ?? ''
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

function responseValue(itemId: string, fallback: number): number {
  return props.responses[itemId] ?? fallback
}

function onSliderInput(item: AssessmentItemDefinition, event: Event): void {
  const target = event.target as HTMLInputElement
  const raw = Number(target.value)
  const value = clamp(raw, item.responseMin, item.responseMax)
  target.value = String(value)
  emitResponse(item.id, value)
}

function onNumberInput(item: AssessmentItemDefinition, event: Event): void {
  const input = event.target as HTMLInputElement
  const raw = Number(input.value)

  if (!Number.isFinite(raw)) {
    return
  }

  const value = clamp(raw, item.responseMin, item.responseMax)
  input.value = String(value)
  emitResponse(item.id, value)
}

function emitResponse(itemId: string, value: number): void {
  emit('update-response', itemId, value)
}
</script>
