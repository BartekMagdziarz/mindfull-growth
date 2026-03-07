<template>
  <div class="space-y-4">
    <AppCard padding="lg" class="space-y-4">
      <h3 class="text-lg font-semibold text-on-surface">{{ title }}</h3>
      <p class="text-sm text-on-surface-variant">
        {{ body }}
      </p>
      <label class="flex items-start gap-3 text-sm text-on-surface">
        <input
          type="checkbox"
          class="mt-0.5 neo-checkbox"
          :checked="modelValue"
          @change="handleToggle"
        >
        <span>{{ body }}</span>
      </label>
    </AppCard>

    <div class="flex items-center justify-between gap-2">
      <AppButton variant="text" @click="$emit('back')">
        {{ t('common.buttons.back') }}
      </AppButton>
      <AppButton variant="filled" :disabled="!modelValue" @click="$emit('continue')">
        {{ t('common.buttons.next') }}
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import { useT } from '@/composables/useT'

defineProps<{
  title: string
  body: string
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  continue: []
  back: []
}>()

const { t } = useT()

function handleToggle(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).checked)
}
</script>
