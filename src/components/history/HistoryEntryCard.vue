<template>
  <AppCard
    :elevation="1"
    padding="none"
    class="py-3 px-4 cursor-pointer transition-all duration-200 hover:shadow-elevation-2"
    @click="$emit('click')"
  >
    <div class="space-y-2">
      <!-- Type Badge + Date Row -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <!-- Type Badge -->
          <span :class="typeBadgeClasses">
            <component :is="typeIcon" class="w-3.5 h-3.5" aria-hidden="true" />
            <span>{{ typeLabel }}</span>
          </span>
          <span class="text-sm text-on-surface-variant">
            {{ formatEntryDate(entry.createdAt) }}
          </span>
        </div>
        <!-- Delete Button -->
        <button
          type="button"
          :disabled="isDeleting"
          :aria-label="deleteAriaLabel"
          class="flex-shrink-0 p-2 rounded-xl text-on-surface-variant hover:bg-section hover:text-error transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
          @click.stop="$emit('delete')"
        >
          <TrashIcon v-if="!isDeleting" class="w-5 h-5" />
          <span v-else class="text-sm">...</span>
        </button>
      </div>

      <!-- Title (journal only) -->
      <h3
        v-if="entry.type === 'journal' && entry.title"
        class="text-lg font-semibold text-on-surface"
      >
        {{ entry.title }}
      </h3>

      <!-- Body/Note Preview -->
      <p
        v-if="contentPreview"
        class="text-on-surface-variant line-clamp-2"
      >
        {{ contentPreview }}
      </p>

      <!-- Chat indicator (journal only) -->
      <div
        v-if="entry.type === 'journal' && entry.chatSessions && entry.chatSessions.length > 0"
        class="flex items-center"
      >
        <button
          type="button"
          class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary-soft text-primary-strong text-xs font-medium hover:bg-primary-soft/80 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background"
          @click.stop="$emit('viewChats')"
          :aria-label="`View ${entry.chatSessions.length} chat session(s)`"
        >
          <span class="text-base leading-none">💬</span>
          <span>
            {{ entry.chatSessions.length }}
            chat{{ entry.chatSessions.length > 1 ? 's' : '' }}
          </span>
        </button>
      </div>

      <!-- Emotion Chips -->
      <div
        v-if="entry.emotionIds.length > 0"
        class="flex flex-wrap gap-2"
      >
        <span
          v-for="emotionId in entry.emotionIds"
          :key="`emotion-${emotionId}`"
          v-show="getEmotionName(emotionId)"
          class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-section-strong text-primary-strong border border-chip-border shadow-elevation-1"
        >
          {{ getEmotionName(emotionId) }}
        </span>
      </div>

      <!-- People & Context Tags -->
      <div
        v-if="hasTags"
        class="flex flex-wrap gap-2"
      >
        <!-- People Tags -->
        <span
          v-for="peopleTagId in entry.peopleTagIds"
          :key="`people-${peopleTagId}`"
          v-show="getPeopleTagName(peopleTagId)"
          class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-chip text-chip-text border border-chip-border shadow-elevation-1"
        >
          {{ getPeopleTagName(peopleTagId) }}
        </span>

        <!-- Context Tags -->
        <span
          v-for="contextTagId in entry.contextTagIds"
          :key="`context-${contextTagId}`"
          v-show="getContextTagName(contextTagId)"
          class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-soft text-primary-strong border border-chip-border shadow-elevation-1"
        >
          {{ getContextTagName(contextTagId) }}
        </span>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import AppCard from '@/components/AppCard.vue'
import { PencilIcon, HeartIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import { formatEntryDate } from '@/utils/dateFormat'
import type { UnifiedEntry } from '@/domain/unifiedEntry'

interface Props {
  entry: UnifiedEntry
  isDeleting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isDeleting: false,
})

defineEmits<{
  click: []
  delete: []
  viewChats: []
}>()

const emotionStore = useEmotionStore()
const tagStore = useTagStore()

const typeIcon = computed<Component>(() => {
  return props.entry.type === 'journal' ? PencilIcon : HeartIcon
})

const typeLabel = computed(() => {
  return props.entry.type === 'journal' ? 'Journal' : 'Emotion'
})

const typeBadgeClasses = computed(() => {
  const base =
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium'
  if (props.entry.type === 'journal') {
    return `${base} bg-primary-soft text-primary-strong`
  }
  return `${base} bg-section-strong text-on-surface`
})

const contentPreview = computed(() => {
  if (props.entry.type === 'journal') {
    return props.entry.body
  }
  return props.entry.note
})

const hasTags = computed(() => {
  return props.entry.peopleTagIds.length > 0 || props.entry.contextTagIds.length > 0
})

const deleteAriaLabel = computed(() => {
  if (props.entry.type === 'journal') {
    return `Delete journal entry: ${props.entry.title || 'Untitled entry'}`
  }
  return `Delete emotion log from ${formatEntryDate(props.entry.createdAt)}`
})

function getEmotionName(id: string): string | undefined {
  return emotionStore.getEmotionById(id)?.name
}

function getPeopleTagName(id: string): string | undefined {
  return tagStore.getPeopleTagById(id)?.name
}

function getContextTagName(id: string): string | undefined {
  return tagStore.getContextTagById(id)?.name
}
</script>
