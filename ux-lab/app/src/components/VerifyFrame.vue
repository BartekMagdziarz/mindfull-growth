<template>
  <div class="surface-frame" :class="[`surface-frame--${viewport}`, { 'surface-frame--loading': !loaded }]">
    <div class="surface-frame__viewport">
      <iframe
        ref="frame"
        :src="url"
        :title="title"
        @load="handleLoad"
      />
    </div>
    <div v-if="!loaded" class="surface-frame__loading">
      <AppIcon name="progress_activity" />
      <span>Ładowanie verify…</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'

defineProps<{ url: string; title: string; viewport: 'fluid' | 'desktop' | 'mobile' }>()
const emit = defineEmits<{ loaded: [frame: HTMLIFrameElement] }>()
const frame = ref<HTMLIFrameElement | null>(null)
const loaded = ref(false)

function handleLoad() {
  loaded.value = true
  if (frame.value) emit('loaded', frame.value)
}
</script>
