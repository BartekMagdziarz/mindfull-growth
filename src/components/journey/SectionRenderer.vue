<template>
  <section class="mb-6">
    <!-- Section header -->
    <div class="flex items-center justify-between mb-2">
      <label class="text-sm font-medium text-on-surface">
        {{ section.title }}
        <span v-if="section.isRequired" class="text-error">*</span>
      </label>
      <span v-if="section.type === 'list' && section.maxItems" class="text-xs text-on-surface-variant">
        {{ itemCount }}/{{ section.maxItems }}
      </span>
    </div>

    <!-- Text type -->
    <template v-if="section.type === 'text'">
      <textarea
        :value="modelValue as string"
        @input="handleTextInput"
        :placeholder="section.placeholder"
        rows="3"
        class="w-full px-4 py-3 bg-surface border border-outline/30 rounded-xl text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-focus resize-none"
      />
    </template>

    <!-- List type -->
    <template v-else-if="section.type === 'list'">
      <div class="space-y-2">
        <div
          v-for="(item, index) in listValue"
          :key="index"
          class="flex gap-2"
        >
          <input
            :value="item"
            @input="updateListItem(index, ($event.target as HTMLInputElement).value)"
            type="text"
            :placeholder="section.placeholder"
            class="flex-1 px-4 py-2 bg-surface border border-outline/30 rounded-xl text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-focus"
          />
          <button
            @click="removeListItem(index)"
            class="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
            aria-label="Remove item"
          >
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>

        <button
          v-if="canAddMore"
          @click="addListItem"
          class="flex items-center gap-2 px-4 py-2 text-primary hover:bg-primary/10 rounded-xl transition-colors text-sm"
        >
          <PlusIcon class="w-4 h-4" />
          <span>Add item</span>
        </button>
      </div>
    </template>

    <!-- Scale type -->
    <template v-else-if="section.type === 'scale'">
      <div class="px-2">
        <input
          type="range"
          :value="modelValue as number || 5"
          @input="handleScaleInput"
          min="1"
          max="10"
          class="w-full accent-primary"
        />
        <div class="flex justify-between text-xs text-on-surface-variant mt-1">
          <span>1</span>
          <span class="text-lg font-semibold text-on-surface">{{ modelValue || 5 }}</span>
          <span>10</span>
        </div>
      </div>
    </template>

    <!-- Prompt type (displays prompts as suggestions) -->
    <template v-else-if="section.type === 'prompt'">
      <div class="space-y-3">
        <div
          v-if="section.prompts && section.prompts.length > 0"
          class="flex flex-wrap gap-2 mb-2"
        >
          <button
            v-for="(prompt, index) in section.prompts"
            :key="index"
            @click="handlePromptClick(prompt)"
            class="px-3 py-1 text-xs bg-section text-on-surface-variant rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
          >
            {{ prompt }}
          </button>
        </div>
        <textarea
          :value="modelValue as string"
          @input="handleTextInput"
          :placeholder="section.placeholder"
          rows="3"
          class="w-full px-4 py-3 bg-surface border border-outline/30 rounded-xl text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-focus resize-none"
        />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import type { TemplateSection } from '@/domain/lifeSeasons'

interface Props {
  section: TemplateSection
  modelValue: string | string[] | number | undefined
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string | string[] | number]
}>()

const listValue = computed(() => {
  if (Array.isArray(props.modelValue)) {
    return props.modelValue
  }
  return []
})

const itemCount = computed(() => listValue.value.length)

const canAddMore = computed(() => {
  if (!props.section.maxItems) return true
  return itemCount.value < props.section.maxItems
})

function handleTextInput(event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  emit('update:modelValue', target.value)
}

function handleScaleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', parseInt(target.value, 10))
}

function handlePromptClick(prompt: string) {
  const current = (props.modelValue as string) || ''
  const newValue = current ? `${current}\n\n${prompt}` : prompt
  emit('update:modelValue', newValue)
}

function addListItem() {
  if (!canAddMore.value) return
  const newList = [...listValue.value, '']
  emit('update:modelValue', newList)
}

function removeListItem(index: number) {
  const newList = listValue.value.filter((_, i) => i !== index)
  emit('update:modelValue', newList)
}

function updateListItem(index: number, value: string) {
  const newList = [...listValue.value]
  newList[index] = value
  emit('update:modelValue', newList)
}
</script>
