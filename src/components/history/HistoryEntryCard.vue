<template>
  <DsSurface
    tag="article"
    elevation="flat"
    class="history-card group/card min-w-0"
    :data-size="cardSize"
  >
    <RouterLink
      :to="{ name: isJournal ? 'journal-edit-id' : 'emotions-edit-id', params: { id: entry.id } }"
      class="history-card__entry block space-y-2 p-4"
    >
      <p class="mg-v2-meta pr-8">
        <span class="mg-v2-meta__status">
          <AppIcon :name="isJournal ? 'menu_book' : 'favorite'" class="history-card__type-icon" />
          {{ isJournal ? t('history.card.journal') : t('history.card.emotion') }}
        </span>
        <time :datetime="entry.createdAt">{{ formatEntryDate(entry.createdAt, locale) }}</time>
      </p>
      <h3 v-if="isJournal && entry.title" class="text-base font-extrabold text-on-surface">
        {{ entry.title }}
      </h3>
      <p v-if="contentPreview" class="text-on-surface-variant line-clamp-2">
        {{ contentPreview }}
      </p>

      <div v-if="emotionBadges.length" class="flex flex-wrap gap-2">
        <span
          v-for="badge in emotionBadges"
          :key="badge.slug"
          class="mg-v2-badge history-card__emotion"
          :style="{ color: badge.ink, background: badge.fill }"
          :title="badge.description"
        >
          <span
            class="history-card__face"
            :style="{ maskImage: groupFaceMask(badge.slug) }"
            aria-hidden="true"
          ></span>
          <span aria-hidden="true">{{ badge.name }}</span>
          <span v-if="badge.intensity" class="inline-flex gap-0.5" aria-hidden="true">
            <i v-for="n in badge.intensity" :key="n" class="mg-pip mg-pip--xs"></i>
          </span>
          <span class="sr-only">{{ badge.description }}</span>
        </span>
      </div>

      <div v-if="peopleTags.length || contextTags.length" class="flex flex-wrap gap-2">
        <span v-for="tag in peopleTags" :key="tag.id" class="mg-v2-badge">{{ tag.name }}</span>
        <span v-for="tag in contextTags" :key="tag.id" class="mg-v2-badge history-card__context">
          {{ tag.name }}
        </span>
      </div>
    </RouterLink>

    <div class="mg-v2-card-tray absolute right-2 top-2 group-hover/card:opacity-100">
      <button
        type="button"
        :disabled="isDeleting"
        :aria-label="deleteAriaLabel"
        class="mg-v2-button mg-v2-button--quiet mg-v2-button--icon mg-v2-button--icon-sm"
        @click="$emit('delete')"
      >
        <AppIcon v-if="!isDeleting" name="delete" class="text-base" />
        <span v-else class="text-sm">...</span>
      </button>
    </div>
    <button
      v-if="isJournal && chatCount"
      type="button"
      class="mg-v2-button history-card__chats"
      :aria-label="t('history.card.viewChats', { count: chatCount })"
      @click="$emit('viewChats')"
    >
      <AppIcon name="chat_bubble" />
      {{
        t(chatCount > 1 ? 'history.card.chatCountPlural' : 'history.card.chatCount', {
          count: chatCount,
        })
      }}
    </button>
  </DsSurface>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { DsSurface } from '@/design-system/components'
import AppIcon from '@/components/shared/AppIcon.vue'
import { groupFaceMask } from '@/components/emotion/groupFaceMask'
import { useTagStore } from '@/stores/tag.store'
import { useT } from '@/composables/useT'
import { formatEntryDate } from '@/utils/dateFormat'
import { getDisplayTitle } from '@/domain/journal'
import { getGroup } from '@/domain/emotionGroups'
import type { UnifiedEntry } from '@/domain/unifiedEntry'

const props = defineProps<{ entry: UnifiedEntry; isDeleting?: boolean }>()
defineEmits<{ delete: []; viewChats: [] }>()

const tagStore = useTagStore()
const { t, locale } = useT()
const isJournal = computed(() => props.entry.type === 'journal')
const contentPreview = computed(() => (isJournal.value ? props.entry.body : props.entry.note))
const chatCount = computed(() => props.entry.chatSessions?.length ?? 0)
const peopleTags = computed(() =>
  props.entry.peopleTagIds.map(tagStore.getPeopleTagById).filter(tag => !!tag)
)
const contextTags = computed(() =>
  props.entry.contextTagIds.map(tagStore.getContextTagById).filter(tag => !!tag)
)

// Width reflects the visible preview and badges. Longer prose is capped at two lines.
const cardSize = computed(() => {
  const entry = props.entry
  const badgeCount = entry.emotions.length + peopleTags.value.length + contextTags.value.length
  if (!isJournal.value) {
    return (entry.note?.trim().length ?? 0) > 90 || badgeCount >= 4 ? 'detailed-log' : 'log'
  }
  const textLength = (entry.title?.trim().length ?? 0) + (entry.body?.trim().length ?? 0)
  return textLength > 160 || badgeCount >= 4 ? 'long-journal' : 'journal'
})

const emotionBadges = computed(() =>
  props.entry.emotions.flatMap(({ emotionId, intensity }) => {
    const group = getGroup(emotionId)
    if (!group) return []
    const name = t(`emotionGroups.groups.${emotionId}.name`)
    return [
      {
        slug: emotionId,
        name: name.split(' · ')[0],
        intensity,
        description: intensity
          ? t('emotionGroups.ui.intensityOf', { name, level: intensity })
          : name,
        ink: `var(--color-quadrant-${group.quadrant}-text)`,
        fill: `var(--color-quadrant-${group.quadrant}-tint)`,
      },
    ]
  })
)

const deleteAriaLabel = computed(() => {
  if (isJournal.value) {
    const title = getDisplayTitle(props.entry)
    return title ? t('history.card.deleteJournal', { title }) : t('history.card.deleteUntitled')
  }
  return t('history.card.deleteEmotion', {
    date: formatEntryDate(props.entry.createdAt, locale.value),
  })
})
</script>

<style scoped>
.history-card {
  display: flex;
  flex-direction: column;
  overflow-wrap: anywhere;
}
.history-card__entry {
  flex: 1;
  border-radius: inherit;
}
.history-card[data-size$='log'] .history-card__entry {
  padding: var(--mg-space-3);
}
.history-card__entry:hover {
  background: var(--mg-color-paper);
}
.history-card__type-icon,
.history-card__context {
  color: var(--mg-color-primary-strong);
}
.history-card__emotion {
  border: 0;
  padding-block: var(--mg-space-1);
}
.history-card__face {
  width: 1.3rem;
  height: 1.3rem;
  background: currentColor;
  mask: center / contain no-repeat;
}
.history-card__chats {
  align-self: flex-start;
  margin: 0 var(--mg-space-4) var(--mg-space-3);
}
@media (hover: none) {
  .history-card .mg-v2-card-tray {
    opacity: 1;
  }
}
</style>
