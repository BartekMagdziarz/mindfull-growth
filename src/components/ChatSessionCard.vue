<template>
  <AppCard class="p-4 space-y-2">
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 space-y-1">
        <div class="flex flex-wrap items-center gap-2">
          <ChatIntentionBadge :intention="chatSession.intention" />
          <span class="text-xs text-on-surface-variant">
            {{ formattedCreatedAt }}
          </span>
        </div>
        <p class="text-sm text-on-surface-variant">
          {{ messageCountLabel }}
        </p>
      </div>
      <div v-if="shouldShowActions" class="flex flex-col sm:flex-row gap-2">
        <AppButton
          variant="text"
          @click="$emit('view')"
          aria-label="View chat session"
        >
          View
        </AppButton>
        <AppButton
          variant="text"
          @click="$emit('delete')"
          aria-label="Delete chat session"
        >
          Delete
        </AppButton>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import ChatIntentionBadge from '@/components/ChatIntentionBadge.vue'
import type { ChatSession } from '@/domain/chatSession'
import { formatChatSessionDate } from '@/utils/dateFormat'

const props = defineProps<{
  chatSession: ChatSession
  showActions?: boolean
}>()

defineEmits<{
  view: []
  delete: []
}>()

const formattedCreatedAt = computed(() => {
  return formatChatSessionDate(props.chatSession.createdAt)
})

const messageCountLabel = computed(() => {
  const count = props.chatSession.messages.length
  if (count === 1) return '1 message'
  return `${count} messages`
})

const shouldShowActions = computed(() => props.showActions ?? true)
</script>


