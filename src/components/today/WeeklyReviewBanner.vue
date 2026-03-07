<template>
  <AppCard
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
            {{ t('today.weeklyReview.title') }}
          </h3>
          <p class="text-on-surface-variant">
            {{ t('today.weeklyReview.description', { weekLabel }) }}
          </p>
        </div>
      </div>
      <div class="flex-shrink-0 sm:self-center">
        <AppButton
          variant="filled"
          class="w-full sm:w-auto"
          @click="$emit('start-review')"
        >
          {{ t('today.weeklyReview.startButton') }}
        </AppButton>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { CalendarDaysIcon } from '@heroicons/vue/24/outline'
import { useT } from '@/composables/useT'

const { t } = useT()

defineProps<{
  weekLabel: string
}>()

defineEmits<{
  'start-review': []
}>()
</script>
