<template>
  <ol ref="root" class="mg-v2-thread likert-thread">
    <template v-if="isVlq">
      <li
        v-for="(group, index) in vlqGroups"
        :key="group.scale.id"
        class="mg-v2-thread__item"
        :class="threadClass(group.items, index === currentGroupIndex)"
      >
        <span class="mg-v2-thread__dot" aria-hidden="true" />
        <AppCard padding="lg" class="space-y-4">
          <h3 class="likert-question likert-question--title">{{ t(group.scale.labelKey) }}</h3>

          <div v-for="item in group.items" :key="item.id" class="space-y-2">
            <label class="text-sm text-on-surface">{{ tg(item.textKey) }}</label>
            <div class="flex items-center gap-3">
              <input
                type="range"
                :min="item.responseMin"
                :max="item.responseMax"
                :value="responseValue(item.id, item.responseMin)"
                class="w-full"
                @input="onSliderInput(item, $event)"
              />
              <input
                type="number"
                :min="item.responseMin"
                :max="item.responseMax"
                :value="responseValue(item.id, item.responseMin)"
                class="neo-input w-20 p-2 text-center"
                @input="onNumberInput(item, $event)"
              />
            </div>
            <div class="flex items-center justify-between text-xs text-on-surface-variant">
              <span>{{ t(anchorKey(item.responseMin)) }}</span>
              <span>{{ t(anchorKey(item.responseMax)) }}</span>
            </div>
          </div>
        </AppCard>
      </li>
    </template>

    <template v-else>
      <li
        v-for="item in items"
        :key="item.id"
        class="mg-v2-thread__item"
        :class="threadClass([item], item.id === currentItemId)"
        :data-item-id="item.id"
      >
        <span class="mg-v2-thread__dot" aria-hidden="true" />
        <AppCard padding="lg" class="space-y-4">
          <p class="likert-question">{{ tg(item.textKey) }}</p>

          <div class="flex flex-wrap gap-2" role="radiogroup" :aria-label="tg(item.textKey)">
            <button
              v-for="value in responseValues(item.responseMin, item.responseMax)"
              :key="value"
              type="button"
              role="radio"
              class="exercise-chip"
              :class="{ 'is-on': responses[item.id] === value }"
              :aria-checked="responses[item.id] === value"
              @click="pick(item.id, value)"
            >
              {{ definition.labelledResponses ? t(anchorKey(value)) : value }}
            </button>
          </div>

          <div
            v-if="!definition.labelledResponses"
            class="flex items-center justify-between text-xs text-on-surface-variant"
          >
            <span>{{ t(anchorKey(item.responseMin)) }}</span>
            <span>{{ t(anchorKey(item.responseMax)) }}</span>
          </div>
        </AppCard>
      </li>
    </template>
  </ol>
</template>

<script setup lang="ts">
import { computed, nextTick, useTemplateRef } from 'vue'
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
  'page-complete': []
}>()

const { t, tg } = useT()

const root = useTemplateRef<HTMLOListElement>('root')

const isVlq = computed(() => props.definition.id === 'vlq')

const isAnswered = (item: AssessmentItemDefinition) => props.responses[item.id] !== undefined

// The first unanswered card carries the current dot of the thread.
const currentItemId = computed(() => props.items.find(item => !isAnswered(item))?.id)

const currentGroupIndex = computed(() =>
  vlqGroups.value.findIndex(group => !group.items.every(isAnswered))
)

function threadClass(items: AssessmentItemDefinition[], current: boolean) {
  return {
    'mg-v2-thread__item--done': items.every(isAnswered),
    'mg-v2-thread__item--current': current,
  }
}

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
    .filter(scale => byScale.has(scale.id))
    .map(scale => ({
      scale,
      items: (byScale.get(scale.id) ?? []).sort((a, b) => {
        if (a.metric === b.metric) return a.id.localeCompare(b.id)
        return a.metric === 'importance' ? -1 : 1
      }),
    }))
})

// Picks the answer; a first answer walks the page down to the next open
// card (or the page actions), so the questionnaire reads card by card.
function pick(itemId: string, value: number): void {
  const firstAnswer = props.responses[itemId] === undefined
  emit('update-response', itemId, value)
  if (!firstAnswer) return

  const index = props.items.findIndex(item => item.id === itemId)
  const next = props.items.slice(index + 1).find(item => !isAnswered(item))
  const nextId = next?.id
  const remaining = props.items.some(item => item.id !== itemId && !isAnswered(item))
  void nextTick(() => {
    window.setTimeout(() => {
      if (nextId) {
        scrollToCard(nextId)
      } else if (!remaining) {
        emit('page-complete')
      }
    }, ADVANCE_DELAY_MS)
  })
}

// Long enough to see the picked chip fill before the page moves.
const ADVANCE_DELAY_MS = 220

function scrollToCard(itemId: string): void {
  const card = root.value?.querySelector<HTMLElement>(`[data-item-id="${itemId}"]`)
  card?.scrollIntoView({ block: 'center', behavior: scrollBehavior() })
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

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

<style scoped>
/* The question reads first; the dot of the thread sits on its first line. */
.likert-thread {
  --mg-thread-dot-top: calc(var(--mg-space-6) + 0.7rem);
}

.likert-question {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-md);
  font-weight: var(--mg-weight-label);
  line-height: 1.5;
}

.likert-question--title {
  font-weight: var(--mg-weight-strong);
}
</style>
