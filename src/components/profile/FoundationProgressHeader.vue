<template>
  <div
    class="sticky top-0 z-10 flex flex-col gap-3 rounded-2xl border border-neu-border/30 bg-neu-base p-4 shadow-neu-raised"
  >
    <div>
      <p class="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
        {{ t('profile.psychologicalProfile.foundation.title') }}
      </p>
      <p class="mt-1 text-sm text-on-surface">
        {{ t('profile.psychologicalProfile.foundation.progress', { done, total }) }}
      </p>
      <p class="mt-1 text-xs text-on-surface-variant">
        {{ t('profile.psychologicalProfile.foundation.subtitle') }}
      </p>
    </div>
    <AppButton
      variant="filled"
      :disabled="!buildEnabled"
      @click="emit('build')"
    >
      {{
        buildEnabled
          ? t('profile.psychologicalProfile.foundation.buildCta')
          : t('profile.psychologicalProfile.foundation.buildCtaDisabled', {
              min: FOUNDATION_BUILD_FLOOR,
            })
      }}
    </AppButton>
  </div>
</template>

<script setup lang="ts">
import AppButton from '@/components/AppButton.vue'
import { useT } from '@/composables/useT'
import { FOUNDATION_BUILD_FLOOR } from '@/services/foundationCompleteness'

defineProps<{
  done: number
  total: number
  buildEnabled: boolean
}>()

const emit = defineEmits<{
  build: []
}>()

const { t } = useT()
</script>
