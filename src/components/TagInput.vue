<template>
  <div class="tag-input">
    <!-- Tags Container -->
    <div
      class="flex flex-wrap gap-2 items-center"
      role="group"
      :aria-label="`${tagTypeLabel} tags`"
    >
      <!-- Add Button (always first) -->
      <button
        v-if="!isCreatingTag"
        type="button"
        class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-chip text-chip-text hover:bg-section focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 active:scale-[0.95]"
        :aria-label="`Add new ${tagTypeLabel.toLowerCase()} tag`"
        @click="startCreateTag"
      >
        <PlusIcon class="w-4 h-4" aria-hidden="true" />
      </button>

      <!-- Creating New Tag (appears after + button position) -->
      <div
        v-if="isCreatingTag"
        class="inline-flex items-center px-3 py-1.5 rounded-full bg-primary-soft ring-2 ring-primary text-on-surface text-xs font-medium transition-all duration-200"
      >
        <input
          ref="createInputRef"
          v-model="newTagName"
          type="text"
          class="bg-transparent border-none outline-none w-20 min-w-0 text-xs"
          placeholder="Tag name"
          :aria-label="`New ${tagTypeLabel.toLowerCase()} tag name`"
          @keydown.enter.prevent="saveNewTag"
          @keydown.escape.prevent="cancelCreate"
          @blur="handleCreateBlur"
        />
      </div>

      <!-- Existing Tags -->
      <template v-for="tag in availableTags" :key="tag.id">
        <!-- Edit Mode -->
        <div
          v-if="editingTagId === tag.id"
          class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-soft ring-2 ring-primary text-on-surface text-xs font-medium transition-all duration-200"
        >
          <input
            ref="editInputRef"
            v-model="editingTagName"
            type="text"
            class="bg-transparent border-none outline-none w-20 min-w-0 text-xs"
            :aria-label="`Edit ${tagTypeLabel.toLowerCase()} tag name`"
            @keydown.enter.prevent="saveEditTag"
            @keydown.escape.prevent="cancelEdit"
            @blur="handleEditBlur"
          />
          <button
            type="button"
            class="p-0.5 rounded-full hover:bg-error/20 text-error transition-colors"
            :aria-label="`Delete ${tag.name}`"
            @mousedown.prevent="deleteTag(tag.id)"
          >
            <XMarkIcon class="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <!-- Normal Display Mode -->
        <button
          v-else
          type="button"
          :aria-label="`${isTagSelected(tag.id) ? 'Deselect' : 'Select'} ${tagTypeLabel.toLowerCase()} tag ${tag.name}`"
          :aria-pressed="isTagSelected(tag.id)"
          :class="getTagClasses(tag.id)"
          @click="handleTagClick(tag.id)"
          @dblclick="startEditTag(tag)"
        >
          {{ tag.name }}
        </button>
      </template>
    </div>

    <!-- Error Message -->
    <p v-if="errorMessage" class="mt-2 text-xs text-error">
      {{ errorMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import type { PeopleTag, ContextTag } from '@/domain/tag'
import { useTagStore } from '@/stores/tag.store'
import { XMarkIcon, PlusIcon } from '@heroicons/vue/24/outline'

interface Props {
  modelValue: string[]
  tagType: 'people' | 'context'
  compact?: boolean
  hideSelectedSection?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  compact: false,
  hideSelectedSection: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const tagStore = useTagStore()

// Selection state
const selectedTagIds = ref<string[]>([])

// Edit mode state
const editingTagId = ref<string | null>(null)
const editingTagName = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

// Create mode state
const isCreatingTag = ref(false)
const newTagName = ref('')
const createInputRef = ref<HTMLInputElement | null>(null)

// Error state
const errorMessage = ref('')

// Click tracking for double-click detection
const lastClickTime = ref(0)
const lastClickedTagId = ref<string | null>(null)
const DOUBLE_CLICK_THRESHOLD = 300

// Computed
const tagTypeLabel = computed(() => {
  return props.tagType === 'people' ? 'People' : 'Context'
})

const availableTags = computed(() => {
  return props.tagType === 'people'
    ? tagStore.peopleTags
    : tagStore.contextTags
})

// Methods
function isTagSelected(tagId: string): boolean {
  return selectedTagIds.value.includes(tagId)
}

function getTagClasses(tagId: string): string {
  const isSelected = isTagSelected(tagId)
  const baseClasses =
    'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background active:scale-[0.95]'

  if (isSelected) {
    return `${baseClasses} bg-primary text-on-primary shadow-elevation-1`
  } else {
    return `${baseClasses} bg-chip text-chip-text hover:bg-section`
  }
}

function handleTagClick(tagId: string) {
  const now = Date.now()
  const timeSinceLastClick = now - lastClickTime.value
  const isSameTag = lastClickedTagId.value === tagId

  // Update click tracking
  lastClickTime.value = now
  lastClickedTagId.value = tagId

  // Check for double-click (but don't toggle on first click of double-click)
  if (isSameTag && timeSinceLastClick < DOUBLE_CLICK_THRESHOLD) {
    // This is a double-click - don't toggle, let @dblclick handle it
    return
  }

  // Single click - toggle selection
  toggleTag(tagId)
}

function toggleTag(tagId: string) {
  const index = selectedTagIds.value.indexOf(tagId)
  if (index > -1) {
    selectedTagIds.value.splice(index, 1)
  } else {
    selectedTagIds.value.push(tagId)
  }
  emit('update:modelValue', [...selectedTagIds.value])
}

// Create tag functions
async function startCreateTag() {
  isCreatingTag.value = true
  newTagName.value = ''
  errorMessage.value = ''
  await nextTick()
  createInputRef.value?.focus()
}

async function saveNewTag() {
  const trimmedName = newTagName.value.trim()
  if (!trimmedName) {
    cancelCreate()
    return
  }

  errorMessage.value = ''
  try {
    let createdTag: PeopleTag | ContextTag
    if (props.tagType === 'people') {
      createdTag = await tagStore.createPeopleTag(trimmedName)
    } else {
      createdTag = await tagStore.createContextTag(trimmedName)
    }

    // Auto-select the newly created tag
    if (!selectedTagIds.value.includes(createdTag.id)) {
      selectedTagIds.value.push(createdTag.id)
      emit('update:modelValue', [...selectedTagIds.value])
    }

    isCreatingTag.value = false
    newTagName.value = ''
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : 'Failed to create tag'
    errorMessage.value = errorMsg
  }
}

function cancelCreate() {
  isCreatingTag.value = false
  newTagName.value = ''
  errorMessage.value = ''
}

function handleCreateBlur() {
  // Small delay to allow clicking elsewhere
  setTimeout(() => {
    if (isCreatingTag.value) {
      if (newTagName.value.trim()) {
        saveNewTag()
      } else {
        cancelCreate()
      }
    }
  }, 150)
}

// Edit tag functions
async function startEditTag(tag: PeopleTag | ContextTag) {
  editingTagId.value = tag.id
  editingTagName.value = tag.name
  errorMessage.value = ''
  await nextTick()
  editInputRef.value?.focus()
  editInputRef.value?.select()
}

async function saveEditTag() {
  if (!editingTagId.value) return

  const trimmedName = editingTagName.value.trim()
  if (!trimmedName) {
    cancelEdit()
    return
  }

  // Find original tag to check if name changed
  const originalTag = availableTags.value.find(t => t.id === editingTagId.value)
  if (originalTag && originalTag.name === trimmedName) {
    cancelEdit()
    return
  }

  errorMessage.value = ''
  try {
    if (props.tagType === 'people') {
      await tagStore.updatePeopleTag(editingTagId.value, trimmedName)
    } else {
      await tagStore.updateContextTag(editingTagId.value, trimmedName)
    }

    editingTagId.value = null
    editingTagName.value = ''
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : 'Failed to update tag'
    errorMessage.value = errorMsg
  }
}

function cancelEdit() {
  editingTagId.value = null
  editingTagName.value = ''
  errorMessage.value = ''
}

function handleEditBlur() {
  // Small delay to allow clicking the delete button
  setTimeout(() => {
    if (editingTagId.value) {
      if (editingTagName.value.trim()) {
        saveEditTag()
      } else {
        cancelEdit()
      }
    }
  }, 150)
}

async function deleteTag(tagId: string) {
  errorMessage.value = ''
  try {
    if (props.tagType === 'people') {
      await tagStore.deletePeopleTag(tagId)
    } else {
      await tagStore.deleteContextTag(tagId)
    }

    // Remove from selection if selected
    const index = selectedTagIds.value.indexOf(tagId)
    if (index > -1) {
      selectedTagIds.value.splice(index, 1)
      emit('update:modelValue', [...selectedTagIds.value])
    }

    editingTagId.value = null
    editingTagName.value = ''
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : 'Failed to delete tag'
    errorMessage.value = errorMsg
  }
}

// Sync with modelValue prop
watch(
  () => props.modelValue,
  (newValue) => {
    // Filter out invalid tag IDs
    const validIds = newValue.filter((id) => {
      const tag =
        props.tagType === 'people'
          ? tagStore.getPeopleTagById(id)
          : tagStore.getContextTagById(id)
      return tag !== undefined
    })
    selectedTagIds.value = validIds
  },
  { immediate: true }
)

// Load tags on mount
onMounted(async () => {
  if (props.tagType === 'people') {
    if (tagStore.peopleTags.length === 0) {
      await tagStore.loadPeopleTags()
    }
  } else {
    if (tagStore.contextTags.length === 0) {
      await tagStore.loadContextTags()
    }
  }
})
</script>

<style scoped>
.tag-input {
  @apply w-full;
}
</style>
