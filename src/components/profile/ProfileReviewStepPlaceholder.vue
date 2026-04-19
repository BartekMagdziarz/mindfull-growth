<template>
  <div class="space-y-4">
    <section
      v-for="sectionId in PROFILE_SECTION_IDS"
      :key="sectionId"
      class="neo-surface rounded-2xl p-4"
      :data-test-section="sectionId"
    >
      <h3 class="text-sm font-semibold text-on-surface">
        {{ t(`profile.psychologicalProfile.sections.${sectionId}`) }}
      </h3>
      <p
        v-if="sections[sectionId] && sections[sectionId].trim().length > 0"
        class="mt-2 text-sm text-on-surface whitespace-pre-wrap"
      >
        {{ sections[sectionId] }}
      </p>
      <p v-else class="mt-2 text-sm text-on-surface-variant italic">
        {{ t('profile.psychologicalProfile.sections.empty') }}
      </p>
    </section>

    <details v-if="rawResponse && rawResponse.length > 0" class="neo-surface rounded-2xl p-4">
      <summary class="text-sm font-medium text-on-surface-variant cursor-pointer select-none">
        Raw response (debug)
      </summary>
      <pre
        class="mt-3 text-xs text-on-surface-variant whitespace-pre-wrap break-words"
      >{{ rawResponse }}</pre>
    </details>
  </div>
</template>

<script setup lang="ts">
import { PROFILE_SECTION_IDS, type ProfileSections } from '@/domain/userProfile'
import { useT } from '@/composables/useT'

defineProps<{
  sections: ProfileSections
  rawResponse: string
}>()

const { t } = useT()
</script>
