<template>
  <AppCard
    padding="lg"
    class="w-full max-w-md cursor-pointer transition-all duration-200"
    @click="$emit('action')"
  >
    <div class="flex items-start gap-4">
      <div class="flex-shrink-0 mt-1">
        <PencilSquareIcon class="w-8 h-8 text-primary" />
      </div>
      <div class="flex-1">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-xl font-semibold text-on-surface">
            {{ title }}
          </h3>
          <span
            v-if="hasEntry"
            class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/70 text-on-primary"
          >
            <CheckIcon class="w-4 h-4" />
          </span>
        </div>
        <p class="text-on-surface-variant">
          {{ description }}
        </p>
        <p
          v-if="entryCount > 0"
          class="text-sm text-on-surface-variant mt-2"
        >
          {{ t(entryCount === 1 ? 'today.journal.entryToday' : 'today.journal.entriesToday', { count: entryCount }) }}
        </p>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/AppCard.vue'
import { PencilSquareIcon, CheckIcon } from '@heroicons/vue/24/outline'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = defineProps<{
  entryCount: number
  hasEntry: boolean
}>()

defineEmits<{
  action: []
}>()

const title = computed(() => {
  if (props.hasEntry) {
    return t('today.journal.continueTitle')
  }
  return t('today.journal.writeTitle')
})

const description = computed(() => {
  if (props.hasEntry) {
    return t('today.journal.continueDescription')
  }
  return t('today.journal.writeDescription')
})
</script>
