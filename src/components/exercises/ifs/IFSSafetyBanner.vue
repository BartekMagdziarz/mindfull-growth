<template>
  <div class="exercise-note">
    <div class="flex gap-3">
      <AppIcon name="security" class="exercise-note__icon" />
      <div class="space-y-2">
        <h3 class="exercise-note__title">{{ t('exerciseWizards.shared.ifs.safetyBanner.heading') }}</h3>
        <p class="exercise-note__text">
          {{ t('exerciseWizards.shared.ifs.safetyBanner.warningText') }}
        </p>
        <label v-if="requireAcknowledgment" class="flex items-center gap-2 pt-1 cursor-pointer">
          <input
            type="checkbox"
            :checked="acknowledged"
            class="neo-checkbox"
            @change="$emit('update:acknowledged', ($event.target as HTMLInputElement).checked)"
          />
          <span class="exercise-note__text">
            {{ t('exerciseWizards.shared.ifs.safetyBanner.checkboxLabel') }}
          </span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

const { t } = useT()

defineProps<{
  requireAcknowledgment?: boolean
  acknowledged?: boolean
}>()

defineEmits<{
  'update:acknowledged': [value: boolean]
}>()
</script>
