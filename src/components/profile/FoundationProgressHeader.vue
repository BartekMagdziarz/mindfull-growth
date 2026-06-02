<template>
  <div
    class="sticky top-0 z-10 flex flex-col gap-4 rounded-2xl border border-neu-border/30 bg-neu-base p-4 shadow-neu-raised"
  >
    <div>
      <p class="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
        {{ t('profile.psychologicalProfile.foundation.title') }}
      </p>
      <p class="mt-1 text-xs text-on-surface-variant">
        {{ t('profile.psychologicalProfile.foundation.subtitle') }}
      </p>
    </div>

    <FoundationPillarsGauge :groups="groups" :unlocked="unlocked" />

    <AppButton
      variant="filled"
      :disabled="!unlocked"
      @click="emit('build')"
    >
      {{
        unlocked
          ? t('profile.psychologicalProfile.foundation.buildCta')
          : t('profile.psychologicalProfile.foundation.buildCtaDisabled')
      }}
    </AppButton>
  </div>
</template>

<script setup lang="ts">
import AppButton from '@/components/AppButton.vue'
import FoundationPillarsGauge from '@/components/profile/FoundationPillarsGauge.vue'
import { useT } from '@/composables/useT'
import type { FoundationGroupProgress } from '@/services/foundationCompleteness'

defineProps<{
  groups: FoundationGroupProgress[]
  unlocked: boolean
}>()

const emit = defineEmits<{
  build: []
}>()

const { t } = useT()
</script>
