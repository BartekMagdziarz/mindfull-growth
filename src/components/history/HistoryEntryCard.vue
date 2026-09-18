<template>
  <AppCard
    padding="none"
    class="group/card py-3 px-4 cursor-pointer transition-all duration-200"
    @click="$emit('click')"
  >
    <div class="space-y-2">
      <!-- Type Badge + Date Row -->
      <div class="flex items-center justify-between gap-2">
        <!-- Quiet facts line: type · date -->
        <p class="mg-v2-meta">
          <span class="mg-v2-meta__status">
            <AppIcon :name="typeIcon" class="text-sm history-card__type-icon" />
            {{ typeLabel }}
          </span>
          <span>{{ formatEntryDate(entry.createdAt) }}</span>
        </p>
        <!-- Actions tray: visible on hover / focus -->
        <div class="mg-v2-card-tray group-hover/card:opacity-100">
          <button
            type="button"
            :disabled="isDeleting"
            :aria-label="deleteAriaLabel"
            class="mg-v2-button mg-v2-button--quiet mg-v2-button--icon mg-v2-button--icon-sm"
            @click.stop="$emit('delete')"
          >
            <AppIcon v-if="!isDeleting" name="delete" class="text-base" />
            <span v-else class="text-sm">...</span>
          </button>
        </div>
      </div>

      <!-- Title (journal only) -->
      <h3
        v-if="entry.type === 'journal' && entry.title"
        class="text-base font-extrabold text-on-surface"
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
          class="mg-v2-pill mg-v2-pill--primary mg-v2-pill--selected history-card__chats"
          @click.stop="$emit('viewChats')"
          :aria-label="t('history.card.viewChats', { count: entry.chatSessions.length })"
        >
          <AppIcon name="chat_bubble" class="text-sm" />
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
          class="mg-v2-badge text-on-surface"
        >
          {{ getEmotionName(emotionId) }}
        </span>
      </div>

      <!-- Family Chips (rodzina-only) — bez rodzin „wchłoniętych" przez wybraną emocję -->
      <div
        v-if="displayedFamilyIds.length > 0"
        class="flex flex-wrap gap-2"
      >
        <span
          v-for="familyId in displayedFamilyIds"
          :key="`family-${familyId}`"
          :style="getFamilyChipStyle(familyId)"
          class="mg-v2-badge text-on-surface"
        >
          <AppIcon name="category" class="text-sm opacity-80" />
          {{ getFamilyName(familyId) }}
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
          class="mg-v2-badge"
        >
          {{ getPeopleTagName(peopleTagId) }}
        </span>

        <!-- Context Tags -->
        <span
          v-for="contextTagId in entry.contextTagIds"
          :key="`context-${contextTagId}`"
          v-show="getContextTagName(contextTagId)"
          class="mg-v2-badge history-card__context"
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
import { getDisplayTitle } from '@/domain/journal'
import type { UnifiedEntry } from '@/domain/unifiedEntry'
import { getQuadrant, getQuadrantChipStyle } from '@/domain/emotion'
import { getFamilyById, familyOfEmotionId } from '@/domain/emotionFamily'

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

const typeIcon = computed<string>(() => {
  return props.entry.type === 'journal' ? 'edit' : 'favorite'
})

const typeLabel = computed(() => {
  return props.entry.type === 'journal' ? t('history.card.journal') : t('history.card.emotion')
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
    const title = getDisplayTitle(props.entry)
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
  return getQuadrantChipStyle(getQuadrant(emotion))
}

function getFamilyName(id: string): string {
  return t(`emotionFamilies.${id}.name`)
}

function getFamilyChipStyle(id: string): Record<string, string> {
  const family = getFamilyById(id)
  if (!family) return {}
  return getQuadrantChipStyle(family.quadrant)
}

// Reguła „wchłonięcia": nie pokazuj rodziny, jeśli wpis ma już konkretną emocję
// z tej rodziny (emocja ją reprezentuje) — spójnie z pickerem.
const displayedFamilyIds = computed(() => {
  const families = props.entry.emotionFamilyIds ?? []
  if (families.length === 0) return []
  const emotionFamilies = new Set(
    (props.entry.emotionIds ?? []).map((id) => familyOfEmotionId(id)).filter(Boolean)
  )
  return families.filter((fid) => !emotionFamilies.has(fid))
})

function getPeopleTagName(id: string): string | undefined {
  return tagStore.getPeopleTagById(id)?.name
}

function getContextTagName(id: string): string | undefined {
  return tagStore.getContextTagById(id)?.name
}
</script>

<style scoped>
.history-card__type-icon {
  color: var(--mg-color-primary);
}

.history-card__chats {
  cursor: pointer;
}

.history-card__context {
  color: var(--mg-color-primary-strong);
}
</style>
