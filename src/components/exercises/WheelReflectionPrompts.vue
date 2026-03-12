<template>
  <div class="space-y-6">
    <p class="text-sm text-on-surface-variant">
      {{ t('exerciseWizards.wheelOfLife.reflectionStep.description') }}
    </p>

    <div class="space-y-2">
      <label class="text-sm font-medium text-on-surface">
        {{ t('exerciseWizards.wheelOfLife.reflectionStep.overallNotesLabel') }}
      </label>
      <textarea
        :value="notes"
        rows="4"
        :placeholder="t('exerciseWizards.wheelOfLife.reflectionStep.overallNotesPlaceholder')"
        class="neo-input w-full p-3 text-sm resize-none"
        @input="$emit('update-notes', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useT } from '@/composables/useT'

const { t } = useT()

defineProps<{
  notes: string
}>()

defineEmits<{
  'update-notes': [value: string]
}>()
</script>
