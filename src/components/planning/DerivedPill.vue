<template>
  <span
    class="neo-pill group/pill gap-1.5 px-2.5 py-1 text-xs font-medium text-on-surface"
  >
    <EntityIcon
      v-if="icon"
      :icon="icon"
      :color="color"
      size="xs"
    />
    <span
      v-else-if="color"
      class="w-2 h-2 rounded-full flex-shrink-0"
      :style="{ backgroundColor: color }"
    />
    <span class="truncate">{{ label }}</span>
    <span
      class="flex-shrink-0 md:opacity-0 md:group-hover/pill:opacity-100 text-on-surface-variant/60 transition-all"
    >
      <span class="sr-only">Derived link</span>
      <LinkIcon class="w-3.5 h-3.5" />
    </span>
  </span>
</template>

<script setup lang="ts">
import { LinkIcon } from '@heroicons/vue/20/solid'
import EntityIcon from './EntityIcon.vue'

defineProps<{
  label: string
  icon?: string
  color?: string
}>()
</script>
