<template>
  <div class="space-y-6">
    <p class="text-sm text-on-surface-variant">
      {{ t('exerciseWizards.wheelOfLife.reflectionStep.description') }}
    </p>

    <div v-for="prompt in prompts" :key="prompt.key" class="space-y-2">
      <label class="text-sm font-medium text-on-surface">{{ prompt.label }}</label>
      <textarea
        :value="answers[prompt.key] || ''"
        rows="2"
        :placeholder="t('exerciseWizards.wheelOfLife.reflectionStep.thoughtsPlaceholder')"
        class="neo-input w-full p-3 text-sm resize-none"
        @input="$emit('update', prompt.key, ($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <!-- Overall notes -->
    <div class="space-y-2">
      <label class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.wheelOfLife.reflectionStep.overallNotesLabel') }}</label>
      <textarea
        :value="notes"
        rows="3"
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
  prompts: { key: string; label: string }[]
  answers: Record<string, string>
  notes: string
}>()

defineEmits<{
  update: [key: string, value: string]
  'update-notes': [value: string]
}>()
</script>
