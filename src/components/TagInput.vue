<template>
  <div class="tag-input">
    <!-- Selected Tags Section -->
    <div v-if="selectedTagIds.length > 0" class="mb-6">
      <h3 class="text-sm font-medium text-on-surface-variant mb-3">
        Selected {{ tagTypeLabel }} Tags ({{ selectedTagIds.length }})
      </h3>
      <div
        class="flex flex-wrap gap-2 overflow-x-auto pb-2"
        role="list"
        :aria-label="`Selected ${tagTypeLabel.toLowerCase()} tags`"
      >
        <button
          v-for="tag in selectedTags"
          :key="tag.id"
          type="button"
          :aria-label="`Remove ${tag.name} from selection`"
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-on-primary text-sm font-medium shadow-elevation-1 hover:shadow-elevation-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 active:scale-[0.95]"
          @click="removeTag(tag.id)"
        >
          <span>{{ tag.name }}</span>
          <XMarkIcon class="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
    <div
      v-else
      class="mb-6 p-4 rounded-lg bg-surface-variant/50 text-center text-on-surface-variant text-sm"
    >
      No {{ tagTypeLabel.toLowerCase() }} tags selected
    </div>

    <!-- Tag Creation Input -->
    <div class="mb-6">
      <label
        :for="inputId"
        class="block text-sm font-medium text-on-surface mb-2"
      >
        Add {{ tagTypeLabel.toLowerCase() }} tag
      </label>
      <div class="relative">
        <input
          :id="inputId"
          v-model="inputValue"
          type="text"
          :placeholder="`Type to create or select a ${tagTypeLabel.toLowerCase()} tag...`"
          class="w-full px-4 py-2 rounded-lg border-2 border-outline bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
          :aria-label="`Add ${tagTypeLabel.toLowerCase()} tag`"
          :aria-expanded="showSuggestions"
          :aria-controls="suggestionsId"
          @input="handleInput"
          @keydown="handleKeydown"
          @focus="handleInputFocus"
          @blur="handleInputBlur"
        />
        <!-- Autocomplete Suggestions -->
        <div
          v-if="showSuggestions && filteredSuggestions.length > 0"
          :id="suggestionsId"
          class="absolute z-10 w-full mt-1 bg-surface border-2 border-outline rounded-lg shadow-elevation-3 max-h-60 overflow-y-auto"
          role="listbox"
          :aria-label="`${tagTypeLabel} tag suggestions`"
        >
          <button
            v-for="(tag, index) in filteredSuggestions"
            :key="tag.id"
            type="button"
            :class="[
              'w-full px-4 py-2 text-left text-sm text-on-surface hover:bg-surface-variant focus:bg-surface-variant focus:outline-none transition-colors',
              highlightedIndex === index ? 'bg-surface-variant' : '',
            ]"
            :aria-label="`Select ${tag.name}`"
            :aria-selected="highlightedIndex === index"
            @click="selectSuggestion(tag.id)"
            @mouseenter="highlightedIndex = index"
          >
            {{ tag.name }}
          </button>
        </div>
      </div>
      <p v-if="errorMessage" class="mt-2 text-sm text-red-600">
        {{ errorMessage }}
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="tagStore.isLoading" class="text-center py-8">
      <p class="text-on-surface-variant">Loading tags...</p>
    </div>

    <!-- Existing Tags Display -->
    <div v-else-if="availableTags.length > 0">
      <h2 class="text-lg font-semibold text-on-surface mb-4">
        Select {{ tagTypeLabel }} Tags
      </h2>
      <div
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
        role="list"
        :aria-label="`Available ${tagTypeLabel.toLowerCase()} tags`"
      >
        <button
          v-for="tag in availableTags"
          :key="tag.id"
          type="button"
          :aria-label="`${isTagSelected(tag.id) ? 'Deselect' : 'Select'} ${tagTypeLabel.toLowerCase()} tag ${tag.name}`"
          :aria-pressed="isTagSelected(tag.id)"
          :class="getTagChipClasses(tag.id)"
          @click="toggleTag(tag.id)"
        >
          {{ tag.name }}
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="text-center py-8 rounded-lg bg-surface-variant/50 text-on-surface-variant"
    >
      No {{ tagTypeLabel.toLowerCase() }} tags available. Create one above.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { PeopleTag } from '@/domain/tag'
import type { ContextTag } from '@/domain/tag'
import { useTagStore } from '@/stores/tag.store'
import { XMarkIcon } from '@heroicons/vue/24/outline'

interface Props {
  modelValue: string[]
  tagType: 'people' | 'context'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const tagStore = useTagStore()
const selectedTagIds = ref<string[]>([])
const inputValue = ref('')
const showSuggestions = ref(false)
const highlightedIndex = ref(-1)
const errorMessage = ref('')
const inputId = `tag-input-${Math.random().toString(36).substr(2, 9)}`
const suggestionsId = `tag-suggestions-${Math.random().toString(36).substr(2, 9)}`

// Computed properties
const tagTypeLabel = computed(() => {
  return props.tagType === 'people' ? 'People' : 'Context'
})

const availableTags = computed(() => {
  return props.tagType === 'people'
    ? tagStore.peopleTags
    : tagStore.contextTags
})

const selectedTags = computed(() => {
  return selectedTagIds.value
    .map((id) => {
      if (props.tagType === 'people') {
        return tagStore.getPeopleTagById(id)
      } else {
        return tagStore.getContextTagById(id)
      }
    })
    .filter((tag): tag is PeopleTag | ContextTag => tag !== undefined)
})

const filteredSuggestions = computed(() => {
  if (!inputValue.value.trim()) {
    return []
  }

  const searchTerm = inputValue.value.toLowerCase().trim()
  const matchingTags = availableTags.value.filter((tag) =>
    tag.name.toLowerCase().includes(searchTerm)
  )

  // Filter out already selected tags
  const unselectedMatchingTags = matchingTags.filter(
    (tag) => !selectedTagIds.value.includes(tag.id)
  )

  // Limit to 10 suggestions
  return unselectedMatchingTags.slice(0, 10)
})

// Methods
function toggleTag(tagId: string) {
  const index = selectedTagIds.value.indexOf(tagId)
  if (index > -1) {
    selectedTagIds.value.splice(index, 1)
  } else {
    selectedTagIds.value.push(tagId)
  }
  emit('update:modelValue', [...selectedTagIds.value])
}

function removeTag(tagId: string) {
  const index = selectedTagIds.value.indexOf(tagId)
  if (index > -1) {
    selectedTagIds.value.splice(index, 1)
    emit('update:modelValue', [...selectedTagIds.value])
  }
}

function isTagSelected(tagId: string): boolean {
  return selectedTagIds.value.includes(tagId)
}

function getTagChipClasses(tagId: string): string {
  const isSelected = isTagSelected(tagId)
  const baseClasses =
    'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.95]'

  if (isSelected) {
    return `${baseClasses} bg-primary text-on-primary shadow-elevation-1 hover:shadow-elevation-2`
  } else {
    return `${baseClasses} bg-surface border-2 border-outline text-on-surface hover:bg-surface-variant`
  }
}

async function handleInput() {
  errorMessage.value = ''
  showSuggestions.value = inputValue.value.trim().length > 0
  highlightedIndex.value = -1
}

function handleInputFocus() {
  if (inputValue.value.trim().length > 0) {
    showSuggestions.value = true
  }
}

function handleInputBlur() {
  // Delay hiding suggestions to allow click events on suggestions
  setTimeout(() => {
    showSuggestions.value = false
    highlightedIndex.value = -1
  }, 200)
}

function selectSuggestion(tagId: string) {
  if (!selectedTagIds.value.includes(tagId)) {
    selectedTagIds.value.push(tagId)
    emit('update:modelValue', [...selectedTagIds.value])
  }
  inputValue.value = ''
  showSuggestions.value = false
  highlightedIndex.value = -1
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    if (highlightedIndex.value >= 0 && filteredSuggestions.value.length > 0) {
      // Select highlighted suggestion
      const highlightedTag = filteredSuggestions.value[highlightedIndex.value]
      selectSuggestion(highlightedTag.id)
    } else {
      // Create new tag or select existing
      handleCreateTag()
    }
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (filteredSuggestions.value.length > 0) {
      highlightedIndex.value = Math.min(
        highlightedIndex.value + 1,
        filteredSuggestions.value.length - 1
      )
      showSuggestions.value = true
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (filteredSuggestions.value.length > 0) {
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1)
      showSuggestions.value = true
    }
  } else if (event.key === 'Escape') {
    showSuggestions.value = false
    highlightedIndex.value = -1
  }
}

async function handleCreateTag() {
  const trimmedValue = inputValue.value.trim()
  if (!trimmedValue) {
    errorMessage.value = 'Tag name cannot be empty'
    return
  }

  errorMessage.value = ''
  try {
    let createdTag: PeopleTag | ContextTag
    if (props.tagType === 'people') {
      createdTag = await tagStore.createPeopleTag(trimmedValue)
    } else {
      createdTag = await tagStore.createContextTag(trimmedValue)
    }

    // Add to selection if not already selected
    if (!selectedTagIds.value.includes(createdTag.id)) {
      selectedTagIds.value.push(createdTag.id)
      emit('update:modelValue', [...selectedTagIds.value])
    }

    inputValue.value = ''
    showSuggestions.value = false
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : 'Failed to create tag'
    errorMessage.value = errorMsg
    console.error('Error creating tag:', err)
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
      if (!tag && import.meta.env.DEV) {
        console.warn(`Invalid ${props.tagType} tag ID in modelValue: ${id}`)
      }
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

