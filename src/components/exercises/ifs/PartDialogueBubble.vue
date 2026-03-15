<template>
  <div
    :class="[
      'flex',
      speaker === 'self' ? 'justify-end' : 'justify-start',
    ]"
  >
    <div
      :class="[
        'relative max-w-[85%] rounded-2xl px-4 py-3 group',
        speaker === 'self'
          ? 'neo-surface shadow-neu-raised-sm bg-primary/10'
          : 'neo-surface shadow-neu-pressed',
        speaker === 'part' && partColor ? `border-l-4` : '',
      ]"
      :style="speaker === 'part' && partColor ? { borderLeftColor: partColor } : {}"
    >
      <p class="text-xs font-medium text-on-surface-variant mb-1">
        {{ speaker === 'self' ? t('exerciseWizards.shared.ifs.dialogueBubble.self') : partName ?? t('exerciseWizards.shared.ifs.dialogueBubble.partFallback') }}
      </p>
      <p class="text-sm text-on-surface whitespace-pre-wrap">{{ message.content }}</p>
      <p class="text-[10px] text-on-surface-variant/60 mt-1.5">
        {{ formatTime(message.timestamp) }}
      </p>
      <button
        v-if="speaker === 'part'"
        class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity neo-focus rounded-full p-1"
        :class="isBookmarked ? 'text-primary' : 'text-on-surface-variant/40 hover:text-on-surface-variant'"
        @click="$emit('bookmark')"
      >
        <AppIcon name="bookmark" class="text-base" :class="isBookmarked ? 'fill-current' : ''" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { IFSDialogueMessage } from '@/domain/exercises'

const { t } = useT()

defineProps<{
  message: IFSDialogueMessage
  speaker: 'self' | 'part'
  partName?: string
  partColor?: string
  isBookmarked?: boolean
}>()

defineEmits<{
  bookmark: []
}>()

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
</script>
