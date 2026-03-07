<template>
  <span
    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-soft text-on-primary-soft border border-chip-border"
  >
    {{ intentionLabel }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatIntention } from '@/domain/chatSession'
import { CHAT_INTENTIONS } from '@/domain/chatSession'
import { useT } from '@/composables/useT'

const props = defineProps<{
  intention: ChatIntention
}>()

const { t } = useT()

const intentionLabelMap = computed<Record<ChatIntention, string>>(() => ({
  [CHAT_INTENTIONS.REFLECT]: t('chat.intentions.reflect'),
  [CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY]: t('chat.intentions.helpSeeDifferently'),
  [CHAT_INTENTIONS.PROACTIVE]: t('chat.intentions.proactive'),
  [CHAT_INTENTIONS.THINKING_TRAPS]: t('chat.intentions.thinkingTraps'),
  [CHAT_INTENTIONS.CUSTOM]: t('chat.intentions.custom'),
}))

const intentionLabel = computed(() => {
  return intentionLabelMap.value[props.intention] ?? props.intention
})
</script>


