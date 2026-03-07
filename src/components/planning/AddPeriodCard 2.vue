<template>
  <AppCard
    padding="none"
    :class="[
      'group neo-inset relative flex h-full min-h-[160px] items-center justify-center',
      disabled ? 'opacity-60' : '',
    ]"
  >
    <button
      type="button"
      class="neo-focus flex h-full w-full flex-col items-center justify-center gap-2 rounded-3xl px-4 py-6 text-center text-sm font-medium text-on-surface-variant transition-colors duration-200 hover:text-on-surface"
      :disabled="disabled"
      @click="emit('click')"
    >
      <span
        class="neo-control neo-control--accent flex h-12 w-12 items-center justify-center rounded-full p-0 text-primary"
      >
        <PlusIcon class="h-6 w-6" />
      </span>
      <span class="text-on-surface">{{ label }}</span>
      <span v-if="description" class="text-xs text-on-surface-variant">
        {{ description }}
      </span>
    </button>
  </AppCard>
</template>

<script setup lang="ts">
import { PlusIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'

withDefaults(
  defineProps<{
    label: string
    description?: string
    disabled?: boolean
  }>(),
  {
    description: '',
    disabled: false,
  }
)

const emit = defineEmits<{
  click: []
}>()
</script>
