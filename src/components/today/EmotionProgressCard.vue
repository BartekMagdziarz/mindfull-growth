<template>
  <AppCard
    padding="lg"
    class="w-full max-w-md cursor-pointer transition-all duration-200"
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
            {{ isComplete ? t('today.emotion.completeTitle') : t('today.emotion.title') }}
          </h3>
          <span
            v-if="isComplete"
            class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/70 text-on-primary"
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
                ? 'bg-primary/70 scale-100'
                : 'border-2 border-primary/30 scale-90'"
            />
          </div>
          <span class="text-sm text-on-surface-variant">
            {{ t('today.emotion.progress', { logged, target }) }}
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
import { useT } from '@/composables/useT'

const props = defineProps<{
  logged: number
  target: number
}>()

defineEmits<{
  action: []
}>()

const { t } = useT()

const isComplete = computed(() => props.logged >= props.target)

const description = computed(() => {
  if (isComplete.value) {
    return t('today.emotion.completeDescription')
  }
  if (props.logged === 0) {
    return t('today.emotion.emptyDescription')
  }
  return t('today.emotion.trackingDescription')
})
</script>
