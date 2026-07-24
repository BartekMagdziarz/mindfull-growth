<template>
  <DsSurface class="mg-v2-state" elevation="inset">
    <AppIcon :name="icon" />
    <h2>{{ title }}</h2>
    <p v-if="body">{{ body }}</p>
    <slot name="actions">
      <DsButton v-if="actionLabel" @click="$emit('action')">{{ actionLabel }}</DsButton>
    </slot>
  </DsSurface>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'
import DsButton from './DsButton.vue'
import DsSurface from './DsSurface.vue'

withDefaults(defineProps<{
  icon?: string
  title: string
  body?: string
  actionLabel?: string
}>(), {
  icon: 'hourglass_empty',
  body: '',
  actionLabel: '',
})

defineEmits<{ action: [] }>()
</script>
