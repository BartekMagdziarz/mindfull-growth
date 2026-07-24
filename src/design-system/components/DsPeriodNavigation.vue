<template>
  <div class="mg-v2-period-nav">
    <DsButton icon-only variant="quiet" :aria-label="previousLabel" @click="$emit('previous')">
      <AppIcon name="chevron_left" />
    </DsButton>
    <button type="button" class="mg-v2-period-nav__copy" @click="$emit('pick')">
      <strong>{{ title }}</strong>
      <small v-if="subtitle">{{ subtitle }}</small>
    </button>
    <DsButton icon-only variant="quiet" :aria-label="nextLabel" @click="$emit('next')">
      <AppIcon name="chevron_right" />
    </DsButton>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'
import DsButton from './DsButton.vue'

withDefaults(defineProps<{
  title: string
  subtitle?: string
  previousLabel?: string
  nextLabel?: string
}>(), {
  subtitle: '',
  previousLabel: 'Poprzedni okres',
  nextLabel: 'Następny okres',
})

defineEmits<{ previous: []; next: []; pick: [] }>()
</script>
