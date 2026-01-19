<template>
  <AppCard
    :elevation="2"
    padding="lg"
    class="bg-primary-soft border border-primary/20"
  >
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-start gap-4">
        <div class="flex-shrink-0 mt-1">
          <CalendarDaysIcon class="w-8 h-8 text-primary" />
        </div>
        <div>
          <h3 class="text-xl font-semibold text-on-surface mb-1">
            Time for your weekly reflection
          </h3>
          <p class="text-on-surface-variant">
            Review {{ weekLabel }} and set your intention for the week ahead
          </p>
        </div>
      </div>
      <div class="flex-shrink-0 sm:self-center">
        <AppButton
          variant="filled"
          class="w-full sm:w-auto"
          @click="$emit('start-review')"
        >
          Start Review
        </AppButton>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { CalendarDaysIcon } from '@heroicons/vue/24/outline'

defineProps<{
  weekLabel: string
}>()

defineEmits<{
  'start-review': []
}>()
</script>
