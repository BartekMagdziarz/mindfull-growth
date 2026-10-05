<template>
  <div class="history-source-content">
    <p v-if="source.emotions?.length">
      <strong>Emocje:</strong> {{ source.emotions.map(e => e.name).join(', ') }}
    </p>
    <p v-if="!source.emotions?.length && source.emotionFamilies?.length">
      <strong>Emocje:</strong> {{ source.emotionFamilies.map(e => e.name).join(', ') }}
    </p>
    <p v-if="source.contextTags?.length">
      <strong>Kontekst:</strong> {{ source.contextTags.map(e => e.name).join(', ') }}
    </p>
    <p v-if="source.peopleTags?.length">
      <strong>Osoby:</strong> {{ source.peopleTags.map(e => e.name).join(', ') }}
    </p>
    <article v-for="(block, i) in readableSourceBlocks(source.blocks)" :key="i">
      <strong>{{ block.label }}</strong>
      <p class="source-text">{{ block.text }}</p>
    </article>
  </div>
</template>
<script setup lang="ts">
import type { ContentBlock } from '@/services/ai/history/contracts'
import { readableSourceBlocks } from './sourcePresentation'
defineProps<{
  source: {
    blocks: ContentBlock[]
    emotionFamilies?: { name: string }[]
    emotions?: { name: string }[]
    contextTags?: { name: string }[]
    peopleTags?: { name: string }[]
  }
}>()
</script>
<style scoped>
.source-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
article {
  margin-block: 0.75rem;
}
</style>
