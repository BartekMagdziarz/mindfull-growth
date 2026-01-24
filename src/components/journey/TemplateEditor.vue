<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-on-surface">{{ title }}</h2>
        <p class="text-sm text-on-surface-variant">Customize the sections for this template</p>
      </div>
      <button
        @click="addSection"
        class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary-strong transition-colors"
      >
        <PlusIcon class="w-4 h-4" />
        Add Section
      </button>
    </div>

    <!-- Sections list -->
    <div class="space-y-4">
      <div
        v-for="(section, index) in sections"
        :key="section.id"
        class="p-4 bg-surface border border-outline/30 rounded-xl"
      >
        <div class="flex items-start gap-4">
          <!-- Drag handle -->
          <div class="flex flex-col gap-1 pt-2 cursor-move text-on-surface-variant">
            <button
              @click="moveUp(index)"
              :disabled="index === 0"
              :class="[
                'p-1 rounded hover:bg-section transition-colors',
                index === 0 && 'opacity-30 cursor-not-allowed'
              ]"
            >
              <ChevronUpIcon class="w-4 h-4" />
            </button>
            <button
              @click="moveDown(index)"
              :disabled="index === sections.length - 1"
              :class="[
                'p-1 rounded hover:bg-section transition-colors',
                index === sections.length - 1 && 'opacity-30 cursor-not-allowed'
              ]"
            >
              <ChevronDownIcon class="w-4 h-4" />
            </button>
          </div>

          <!-- Section form -->
          <div class="flex-1 space-y-3">
            <!-- Title -->
            <div>
              <label class="block text-xs text-on-surface-variant mb-1">Section Title</label>
              <input
                v-model="section.title"
                type="text"
                placeholder="Enter section title"
                class="w-full px-3 py-2 bg-section border border-outline/30 rounded-lg text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-focus text-sm"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <!-- Type -->
              <div>
                <label class="block text-xs text-on-surface-variant mb-1">Type</label>
                <select
                  v-model="section.type"
                  class="w-full px-3 py-2 bg-section border border-outline/30 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-focus text-sm"
                >
                  <option value="text">Text</option>
                  <option value="list">List</option>
                  <option value="scale">Scale (1-10)</option>
                  <option value="prompt">Prompt with suggestions</option>
                </select>
              </div>

              <!-- Max items (for list type) -->
              <div v-if="section.type === 'list'">
                <label class="block text-xs text-on-surface-variant mb-1">Max Items</label>
                <input
                  v-model.number="section.maxItems"
                  type="number"
                  min="1"
                  max="20"
                  class="w-full px-3 py-2 bg-section border border-outline/30 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-focus text-sm"
                />
              </div>

              <!-- Required toggle -->
              <div v-if="section.type !== 'list'" class="flex items-center gap-2">
                <input
                  :id="`required-${section.id}`"
                  v-model="section.isRequired"
                  type="checkbox"
                  class="w-4 h-4 accent-primary"
                />
                <label :for="`required-${section.id}`" class="text-xs text-on-surface-variant">
                  Required
                </label>
              </div>
            </div>

            <!-- Placeholder -->
            <div>
              <label class="block text-xs text-on-surface-variant mb-1">Placeholder / Hint</label>
              <input
                v-model="section.placeholder"
                type="text"
                placeholder="Enter placeholder text"
                class="w-full px-3 py-2 bg-section border border-outline/30 rounded-lg text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-focus text-sm"
              />
            </div>

            <!-- Prompts (for prompt type) -->
            <div v-if="section.type === 'prompt'">
              <label class="block text-xs text-on-surface-variant mb-1">Suggested Prompts</label>
              <div class="space-y-2">
                <div
                  v-for="(prompt, promptIndex) in (section.prompts || [])"
                  :key="promptIndex"
                  class="flex gap-2"
                >
                  <input
                    :value="prompt"
                    @input="updatePrompt(index, promptIndex, ($event.target as HTMLInputElement).value)"
                    type="text"
                    placeholder="Enter a prompt suggestion"
                    class="flex-1 px-3 py-2 bg-section border border-outline/30 rounded-lg text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-focus text-sm"
                  />
                  <button
                    @click="removePrompt(index, promptIndex)"
                    class="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                  >
                    <XMarkIcon class="w-4 h-4" />
                  </button>
                </div>
                <button
                  @click="addPrompt(index)"
                  class="text-xs text-primary hover:underline"
                >
                  + Add prompt suggestion
                </button>
              </div>
            </div>
          </div>

          <!-- Delete button -->
          <button
            @click="removeSection(index)"
            class="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
            aria-label="Remove section"
          >
            <TrashIcon class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="sections.length === 0"
        class="text-center py-8 text-on-surface-variant"
      >
        <DocumentTextIcon class="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No sections yet</p>
        <p class="text-sm">Add a section to get started</p>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-3 pt-4 border-t border-outline/20">
      <button
        @click="resetToDefault"
        class="px-4 py-2 border border-outline/30 text-on-surface rounded-xl hover:bg-section transition-colors text-sm"
      >
        Reset to Default
      </button>
      <div class="flex-1"></div>
      <button
        @click="handleCancel"
        class="px-4 py-2 border border-outline/30 text-on-surface rounded-xl hover:bg-section transition-colors text-sm"
      >
        Cancel
      </button>
      <button
        @click="handleSave"
        class="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-strong transition-colors text-sm"
      >
        Save Template
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  DocumentTextIcon,
} from '@heroicons/vue/24/outline'
import type { TemplateSection } from '@/domain/lifeSeasons'

interface Props {
  title: string
  initialSections: TemplateSection[]
  defaultSections: TemplateSection[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  save: [sections: TemplateSection[]]
  cancel: []
}>()

// Local mutable copy of sections
const sections = ref<TemplateSection[]>([])

// Initialize with a deep copy of initial sections
watch(
  () => props.initialSections,
  (newSections) => {
    sections.value = JSON.parse(JSON.stringify(newSections))
  },
  { immediate: true }
)

function addSection() {
  const newSection: TemplateSection = {
    id: crypto.randomUUID(),
    type: 'text',
    title: '',
    placeholder: '',
    isRequired: false,
    order: sections.value.length + 1,
  }
  sections.value.push(newSection)
}

function removeSection(index: number) {
  sections.value.splice(index, 1)
  updateOrders()
}

function moveUp(index: number) {
  if (index === 0) return
  const temp = sections.value[index]
  sections.value[index] = sections.value[index - 1]
  sections.value[index - 1] = temp
  updateOrders()
}

function moveDown(index: number) {
  if (index === sections.value.length - 1) return
  const temp = sections.value[index]
  sections.value[index] = sections.value[index + 1]
  sections.value[index + 1] = temp
  updateOrders()
}

function updateOrders() {
  sections.value.forEach((section, index) => {
    section.order = index + 1
  })
}

function addPrompt(sectionIndex: number) {
  const section = sections.value[sectionIndex]
  if (!section.prompts) {
    section.prompts = []
  }
  section.prompts.push('')
}

function removePrompt(sectionIndex: number, promptIndex: number) {
  const section = sections.value[sectionIndex]
  if (section.prompts) {
    section.prompts.splice(promptIndex, 1)
  }
}

function updatePrompt(sectionIndex: number, promptIndex: number, value: string) {
  const section = sections.value[sectionIndex]
  if (section.prompts) {
    section.prompts[promptIndex] = value
  }
}

function resetToDefault() {
  sections.value = JSON.parse(JSON.stringify(props.defaultSections))
}

function handleSave() {
  // Filter out empty prompts and validate
  const cleanedSections = sections.value.map(section => ({
    ...section,
    prompts: section.prompts?.filter(p => p.trim() !== ''),
  }))
  emit('save', cleanedSections)
}

function handleCancel() {
  emit('cancel')
}
</script>
