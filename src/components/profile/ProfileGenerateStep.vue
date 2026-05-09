<template>
  <div class="space-y-6">
    <!-- In-flight -->
    <section
      v-if="state === 'in-flight'"
      class="neo-surface rounded-3xl p-8 flex flex-col items-center text-center"
      data-test-generate-state="in-flight"
    >
      <div class="relative flex items-center justify-center mb-5">
        <AppIcon name="auto_awesome" class="text-4xl text-primary animate-pulse" />
        <span
          class="absolute inset-0 rounded-full bg-primary/10 blur-xl animate-pulse"
          aria-hidden="true"
        />
      </div>
      <p class="text-base font-semibold text-on-surface">
        {{ t('profile.psychologicalProfile.wizard.generate.inFlight') }}
      </p>
      <p class="text-sm text-on-surface-variant mt-2 max-w-prose">
        {{ t('profile.psychologicalProfile.wizard.generate.inFlightHint') }}
      </p>
    </section>

    <!-- Error: missing API key -->
    <section
      v-else-if="state === 'error' && errorCode === 'missingApiKey'"
      class="neo-surface rounded-3xl p-6 space-y-4"
      data-test-generate-state="missing-api-key"
    >
      <div class="flex items-start gap-3">
        <AppIcon name="key_off" class="text-2xl text-on-surface-variant mt-0.5" />
        <div class="min-w-0 flex-1">
          <h2 class="text-base font-semibold text-on-surface">
            {{ t('profile.psychologicalProfile.wizard.generate.missingApiKey.title') }}
          </h2>
          <p class="text-sm text-on-surface-variant mt-1">
            {{ t('profile.psychologicalProfile.wizard.generate.missingApiKey.help') }}
          </p>
        </div>
      </div>
      <AppButton
        variant="filled"
        data-test-go-to-settings
        @click="emit('goToSettings')"
      >
        {{ t('profile.psychologicalProfile.wizard.generate.missingApiKey.cta') }}
      </AppButton>
    </section>

    <!-- Error: generic -->
    <section
      v-else-if="state === 'error'"
      class="neo-surface rounded-3xl p-6 space-y-4"
      data-test-generate-state="error"
    >
      <div class="flex items-start gap-3">
        <AppIcon name="error" class="text-2xl text-error mt-0.5" />
        <div class="min-w-0 flex-1">
          <h2 class="text-base font-semibold text-on-surface">
            {{ t('profile.psychologicalProfile.wizard.generate.error.title') }}
          </h2>
          <p v-if="errorMessage" class="text-sm text-on-surface-variant mt-1 break-words">
            {{ errorMessage }}
          </p>
        </div>
      </div>
      <AppButton variant="filled" data-test-retry @click="emit('retry')">
        {{ t('profile.psychologicalProfile.wizard.generate.error.retry') }}
      </AppButton>
    </section>

    <!-- Success placeholder (transient — the view usually auto-advances) -->
    <section
      v-else-if="state === 'success'"
      class="neo-surface rounded-3xl p-8 flex flex-col items-center text-center"
      data-test-generate-state="success"
    >
      <AppIcon name="check_circle" class="text-4xl text-primary mb-3" />
      <p class="text-base font-semibold text-on-surface">
        {{ t('profile.psychologicalProfile.wizard.generate.success') }}
      </p>
    </section>

    <!-- Idle (should rarely render — the view flips us to in-flight immediately) -->
    <section
      v-else
      class="neo-surface rounded-3xl p-8 text-center"
      data-test-generate-state="idle"
    >
      <p class="text-sm text-on-surface-variant">
        {{ t('profile.psychologicalProfile.wizard.generate.inFlight') }}
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { ProfileBuildErrorCode } from '@/stores/userProfile.store'

defineProps<{
  state: 'idle' | 'in-flight' | 'success' | 'error'
  errorMessage?: string | null
  errorCode?: ProfileBuildErrorCode | null
}>()

const emit = defineEmits<{
  (e: 'retry'): void
  (e: 'goToSettings'): void
}>()

const { t } = useT()
</script>
