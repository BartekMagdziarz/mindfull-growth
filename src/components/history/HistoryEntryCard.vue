<template>
  <AppCard
    padding="none"
    class="py-3 px-4 cursor-pointer transition-all duration-200"
    @click="$emit('click')"
  >
    <div class="space-y-2">
      <!-- Type Badge + Date Row -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <!-- Type Badge -->
          <span :class="typeBadgeClasses">
            <AppIcon :name="typeIcon" class="text-sm" />
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
          <AppIcon v-if="!isDeleting" name="delete" class="text-xl" />
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
          class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary-soft text-on-primary-soft text-xs font-medium hover:bg-primary-soft/80 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background"
          @click.stop="$emit('viewChats')"
          :aria-label="t('history.card.viewChats', { count: entry.chatSessions.length })"
        >
          <span class="text-base leading-none">💬</span>
          <span>
            {{ entry.chatSessions.length > 1
              ? t('history.card.chatCountPlural', { count: entry.chatSessions.length })
              : t('history.card.chatCount', { count: entry.chatSessions.length }) }}
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
          :style="getEmotionChipStyle(emotionId)"
          class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-on-surface"
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
          class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-chip text-chip-text border border-chip-border"
        >
          {{ getPeopleTagName(peopleTagId) }}
        </span>

        <!-- Context Tags -->
        <span
          v-for="contextTagId in entry.contextTagIds"
          :key="`context-${contextTagId}`"
          v-show="getContextTagName(contextTagId)"
          class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-soft text-on-primary-soft border border-chip-border"
        >
          {{ getContextTagName(contextTagId) }}
        </span>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import { useT } from '@/composables/useT'
import { formatEntryDate } from '@/utils/dateFormat'
import type { UnifiedEntry } from '@/domain/unifiedEntry'
import { getQuadrant, type Quadrant } from '@/domain/emotion'

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
const { t } = useT()

const quadrantColors: Record<Quadrant, string> = {
  'high-energy-high-pleasantness': 'var(--color-quadrant-high-energy-high-pleasantness)',
  'high-energy-low-pleasantness': 'var(--color-quadrant-high-energy-low-pleasantness)',
  'low-energy-high-pleasantness': 'var(--color-quadrant-low-energy-high-pleasantness)',
  'low-energy-low-pleasantness': 'var(--color-quadrant-low-energy-low-pleasantness)',
}

const typeIcon = computed<string>(() => {
  return props.entry.type === 'journal' ? 'edit' : 'favorite'
})

const typeLabel = computed(() => {
  return props.entry.type === 'journal' ? t('history.card.journal') : t('history.card.emotion')
})

const typeBadgeClasses = computed(() => {
  const base =
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium'
  if (props.entry.type === 'journal') {
    return `${base} bg-primary-soft text-on-primary-soft`
  }
  return `${base} bg-section-strong text-on-section`
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
    const title = props.entry.title
    return title
      ? t('history.card.deleteJournal', { title })
      : t('history.card.deleteUntitled')
  }
  return t('history.card.deleteEmotion', { date: formatEntryDate(props.entry.createdAt) })
})

function getEmotionName(id: string): string | undefined {
  return emotionStore.getEmotionById(id)?.name
}

function getEmotionChipStyle(id: string): Record<string, string> {
  const emotion = emotionStore.getEmotionById(id)
  if (!emotion) return {}
  const quadrant = getQuadrant(emotion)
  return { backgroundColor: quadrantColors[quadrant] }
}

function getPeopleTagName(id: string): string | undefined {
  return tagStore.getPeopleTagById(id)?.name
}

function getContextTagName(id: string): string | undefined {
  return tagStore.getContextTagById(id)?.name
}
</script>
