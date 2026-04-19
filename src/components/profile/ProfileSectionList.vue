<template>
  <div class="space-y-3">
    <details
      v-for="sectionId in PROFILE_SECTION_IDS"
      :key="sectionId"
      class="neo-surface rounded-2xl p-4"
      :open="defaultOpen(sectionId)"
    >
      <summary class="flex items-center justify-between cursor-pointer select-none">
        <span class="text-sm font-semibold text-on-surface">
          {{ t(`profile.psychologicalProfile.sections.${sectionId}`) }}
        </span>
        <AppIcon
          name="expand_more"
          class="text-base text-on-surface-variant transition-transform chevron"
        />
      </summary>
      <div class="mt-3">
        <p
          v-if="profile.sections[sectionId] && profile.sections[sectionId].trim().length > 0"
          class="text-sm text-on-surface whitespace-pre-wrap"
        >
          {{ profile.sections[sectionId] }}
        </p>
        <p v-else class="text-sm text-on-surface-variant italic">
          {{ t('profile.psychologicalProfile.sections.empty') }}
        </p>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'
import type { UserProfile, ProfileSectionId } from '@/domain/userProfile'
import { PROFILE_SECTION_IDS } from '@/domain/userProfile'
import { useT } from '@/composables/useT'

defineProps<{
  profile: UserProfile
}>()

const { t } = useT()

function defaultOpen(sectionId: ProfileSectionId): boolean {
  return sectionId === 'summary'
}
</script>

<style scoped>
details[open] > summary > .chevron {
  transform: rotate(180deg);
}
</style>
