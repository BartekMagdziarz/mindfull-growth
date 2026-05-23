<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="-translate-y-2 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-2 opacity-0"
  >
    <div
      class="rounded-2xl border border-status-warn/40 bg-status-warn-soft/70 p-4 shadow-neu-flat"
      role="status"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-on-surface">
            {{ t('profile.psychologicalProfile.foundation.refreshBanner.title') }}
          </p>
          <p class="mt-1 text-sm text-on-surface-variant">
            {{
              t('profile.psychologicalProfile.foundation.refreshBanner.body', {
                count: outdatedCount,
              })
            }}
          </p>
        </div>
        <div class="flex shrink-0 flex-wrap items-center gap-2">
          <AppButton variant="tonal" @click="emit('open')">
            {{ t('profile.psychologicalProfile.foundation.refreshBanner.cta') }}
          </AppButton>
          <AppButton variant="text" @click="emit('dismiss')">
            {{ t('profile.psychologicalProfile.foundation.refreshBanner.dismiss') }}
          </AppButton>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import AppButton from '@/components/AppButton.vue'
import { useT } from '@/composables/useT'

defineProps<{
  outdatedCount: number
}>()

const emit = defineEmits<{
  open: []
  dismiss: []
}>()

const { t } = useT()
</script>
