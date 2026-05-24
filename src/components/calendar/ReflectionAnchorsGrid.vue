<template>
  <div class="grid grid-cols-3 gap-3">
    <div v-for="cat in categories" :key="cat.key">
      <!-- Expanded: raised card with inset bullet lines -->
      <div
        v-if="expandedKeys.has(cat.key)"
        class="neo-card flex min-h-[12rem] flex-col rounded-3xl px-3 py-3"
      >
        <div class="flex items-center justify-between pb-2">
          <span class="flex items-center gap-1.5 text-[rgb(var(--neo-accent-start))]">
            <AppIcon :name="cat.icon" class="text-2xl" />
            <span class="text-sm font-semibold text-on-surface">{{ cat.label }}</span>
          </span>
          <button
            type="button"
            class="neo-control neo-focus h-6 w-6 shrink-0"
            @click="clearAndCollapse(cat.key)"
          >
            <AppIcon name="close" class="text-sm" />
          </button>
        </div>
        <div class="flex-1 space-y-1.5 overflow-y-auto">
          <div
            v-for="(line, idx) in getLines(cat.key)"
            :key="idx"
            class="flex items-start gap-1.5"
          >
            <span class="shrink-0 pt-1 text-xs text-on-surface-variant">&#x2022;</span>
            <textarea
              :ref="(el) => setLineRef(cat.key, idx, el as HTMLTextAreaElement | null)"
              :value="line"
              rows="1"
              class="neo-input block w-full resize-none rounded-lg px-2 py-1 text-sm leading-snug text-on-surface"
              @input="updateLine(cat.key, idx, ($event.target as HTMLTextAreaElement).value)"
              @keydown.enter.prevent="addLine(cat.key)"
            />
          </div>
        </div>
        <button
          type="button"
          class="mt-1 flex items-center gap-1 self-start text-xs text-on-surface-variant transition-colors hover:text-on-surface"
          @click="addLine(cat.key)"
        >
          <AppIcon name="add" class="text-sm" />
        </button>
      </div>

      <!-- Collapsed: raised button with large icon + label -->
      <button
        v-else
        type="button"
        class="neo-card flex min-h-[12rem] w-full flex-col items-center justify-center gap-2 rounded-3xl transition-shadow hover:shadow-neu-raised"
        @click="expand(cat.key)"
      >
        <AppIcon :name="cat.icon" class="text-[rgb(var(--neo-accent-start))]" style="font-size: 4rem;" />
        <span class="text-sm font-semibold text-on-surface">{{ cat.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, nextTick } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'

export interface AnchorCategory {
  key: string
  label: string
  icon: string
}

const props = defineProps<{
  categories: AnchorCategory[]
  modelValue: Record<string, string>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, string>]
}>()

const expandedKeys = reactive(new Set<string>())
const lineRefs = new Map<string, HTMLTextAreaElement>()

function lineRefKey(catKey: string, idx: number): string {
  return `${catKey}-${idx}`
}

function setLineRef(catKey: string, idx: number, el: HTMLTextAreaElement | null) {
  const k = lineRefKey(catKey, idx)
  if (el) lineRefs.set(k, el)
  else lineRefs.delete(k)
}

function getLines(catKey: string): string[] {
  const raw = props.modelValue[catKey]
  if (!raw) return ['']
  const lines = raw.split('\n')
  return lines.length === 0 ? [''] : lines
}

function emitLines(catKey: string, lines: string[]) {
  const value = lines.join('\n')
  emit('update:modelValue', { ...props.modelValue, [catKey]: value })
}

function updateLine(catKey: string, idx: number, value: string) {
  const lines = [...getLines(catKey)]
  lines[idx] = value
  emitLines(catKey, lines)
}

function addLine(catKey: string) {
  const lines = [...getLines(catKey)]
  lines.push('')
  emitLines(catKey, lines)
  nextTick(() => {
    lineRefs.get(lineRefKey(catKey, lines.length - 1))?.focus()
  })
}

function expand(catKey: string) {
  expandedKeys.add(catKey)
  nextTick(() => {
    lineRefs.get(lineRefKey(catKey, 0))?.focus()
  })
}

function clearAndCollapse(catKey: string) {
  expandedKeys.delete(catKey)
  const updated = { ...props.modelValue }
  delete updated[catKey]
  emit('update:modelValue', updated)
}

onMounted(() => {
  for (const cat of props.categories) {
    if (props.modelValue[cat.key]?.trim()) {
      expandedKeys.add(cat.key)
    }
  }
})
</script>
