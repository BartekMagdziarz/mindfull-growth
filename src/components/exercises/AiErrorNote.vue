<template>
  <!-- A failed AI call is a quiet note in the field tone, never a red line:
       the sentence comes from i18n via the error's code, the provider's own
       words (if any) sit small underneath, and a missing provider links to
       the profile where it is set up. -->
  <div class="exercise-note" role="status" data-testid="ai-error-note">
    <p class="exercise-note__text">
      {{ t(`exerciseWizards.shared.ai.${presentation.key}`) }}
      <RouterLink
        v-if="presentation.profileLink"
        to="/profile#ai-settings"
        class="exercise-note__link"
        data-testid="ai-error-profile-link"
      >
        {{ t('exerciseWizards.shared.ai.openProfile') }}
      </RouterLink>
    </p>
    <p v-if="presentation.detail" class="exercise-note__detail" data-testid="ai-error-detail">
      {{ presentation.detail }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useT } from '@/composables/useT'
import { llmErrorPresentation } from '@/services/llmErrors'

const props = defineProps<{
  /** Whatever the wizard caught: an LlmError, a plain Error, or a translated string. */
  error: unknown
}>()

const { t } = useT()
const presentation = computed(() => llmErrorPresentation(props.error))
</script>
