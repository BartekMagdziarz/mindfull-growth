<template>
  <div class="flex items-center justify-between pt-2">
    <AppButton
      v-if="showBack"
      variant="tonal"
      :aria-label="t('common.buttons.back')"
      @click="emit('back')"
    >
      <AppIcon name="arrow_back" class="text-lg" />
    </AppButton>
    <div v-else />

    <!-- Right cluster: the wizard supplies its own primary action(s). -->
    <div class="flex items-center gap-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

defineProps<{ showBack: boolean }>()

const emit = defineEmits<{ back: [] }>()

const { t } = useT()
</script>
