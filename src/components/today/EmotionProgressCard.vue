<template>
  <AppCard
    padding="lg"
    class="w-full max-w-md cursor-pointer transition-all duration-200 hover:shadow-elevation-2 active:scale-[0.98]"
    @click="$emit('action')"
  >
    <div class="flex items-start gap-4">
      <div class="flex-shrink-0 mt-1">
        <FaceSmileIcon
          v-if="isComplete"
          class="w-8 h-8 text-primary"
        />
        <HeartIcon
          v-else
          class="w-8 h-8 text-primary"
        />
      </div>
      <div class="flex-1">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-xl font-semibold text-on-surface">
            {{ isComplete ? 'Great job!' : 'Emotion check-in' }}
          </h3>
          <span
            v-if="isComplete"
            class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-on-primary"
          >
            <CheckIcon class="w-4 h-4" />
          </span>
        </div>

        <!-- Progress circles -->
        <div class="flex items-center gap-3 mb-3">
          <div class="flex gap-1.5" role="progressbar" :aria-valuenow="logged" :aria-valuemax="target">
            <span
              v-for="i in target"
              :key="i"
              class="w-3 h-3 rounded-full transition-all duration-300"
              :class="i <= logged
                ? 'bg-primary scale-100'
                : 'border-2 border-primary/40 scale-90'"
            />
          </div>
          <span class="text-sm text-on-surface-variant">
            {{ logged }} of {{ target }} logged
          </span>
        </div>

        <p class="text-on-surface-variant">
          {{ description }}
        </p>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/AppCard.vue'
import { HeartIcon, FaceSmileIcon, CheckIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  logged: number
  target: number
}>()

defineEmits<{
  action: []
}>()

const isComplete = computed(() => props.logged >= props.target)

const description = computed(() => {
  if (isComplete.value) {
    return "You've reached your daily goal"
  }
  if (props.logged === 0) {
    return 'Log how you feel throughout the day'
  }
  return 'Keep tracking your emotions'
})
</script>
