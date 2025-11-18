<template>
  <span
    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-soft text-primary-strong border border-chip-border"
  >
    {{ intentionLabel }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatIntention } from '@/domain/chatSession'
import { CHAT_INTENTIONS } from '@/domain/chatSession'

const props = defineProps<{
  intention: ChatIntention
}>()

const intentionLabelMap: Record<ChatIntention, string> = {
  [CHAT_INTENTIONS.REFLECT]: 'Reflect',
  [CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY]: 'Help see differently',
  [CHAT_INTENTIONS.PROACTIVE]: 'Help to be proactive',
  [CHAT_INTENTIONS.THINKING_TRAPS]: 'Thinking traps',
  [CHAT_INTENTIONS.CUSTOM]: 'Custom',
}

const intentionLabel = computed(() => {
  return intentionLabelMap[props.intention] ?? props.intention
})
</script>


