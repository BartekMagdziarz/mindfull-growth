<template>
  <section
    class="neo-raised flex flex-col gap-[18px]"
    style="padding: 24px"
  >
    <!-- Header row -->
    <div class="flex items-start justify-between gap-[14px] flex-wrap">
      <div class="min-w-0 flex-1">
        <h3 class="text-base font-bold m-0" style="color: rgb(var(--neo-text))">
          {{ t('profile.psychologicalProfile.title') }}
        </h3>
        <p
          class="text-[12px] m-0 mt-[2px] max-w-[500px]"
          style="color: rgb(var(--neo-muted))"
        >
          {{ t('profile.psychologicalProfile.shortDescription') }}
        </p>
        <div class="mt-2 flex items-center gap-2">
          <span
            class="material-symbols-outlined text-[16px]"
            style="color: rgb(var(--neo-focus))"
            aria-hidden="true"
          >psychology</span>
          <span class="text-[12px]" style="color: rgb(var(--neo-muted))">
            <template v-if="lastBuiltLabel">
              {{ t('profile.psychologicalProfile.lastBuiltAt', { at: lastBuiltLabel }) }}
            </template>
            <template v-else>
              {{ t('profile.psychologicalProfile.notBuiltYet') }}
            </template>
          </span>
        </div>
      </div>
      <div class="flex gap-2 flex-shrink-0">
        <button
          type="button"
          class="neo-pill px-3 py-2 text-[12px] font-semibold gap-[6px]"
          @click="goToBuild"
        >
          <span class="material-symbols-outlined text-[16px]">refresh</span>
          {{ t('profile.psychologicalProfile.rebuild') }}
        </button>
        <button
          type="button"
          class="neo-control neo-control--accent text-[13px]"
          @click="goToProfile"
        >
          {{ t('profile.psychologicalProfile.open') }}
          <span class="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>
    </div>

    <div class="zb-divider" />

    <!-- Trait preview -->
    <div>
      <span class="zb-label">{{ t('profile.psychologicalProfile.preview.title') }}</span>
      <div v-if="traitPreview.length > 0" class="mt-[10px] flex flex-col gap-2">
        <div
          v-for="trait in traitPreview"
          :key="trait.label"
          class="grid items-center gap-3"
          style="grid-template-columns: 150px 1fr 32px"
        >
          <span
            class="text-[13px] font-semibold truncate"
            style="color: rgb(var(--neo-text))"
          >{{ trait.label }}</span>
          <div class="trait-bar neo-inset">
            <div
              class="trait-bar__fill"
              :style="{ width: `${trait.value}%` }"
              role="progressbar"
              :aria-valuenow="trait.value"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-label="trait.label"
            />
          </div>
          <span
            class="text-[12px] font-bold text-right"
            style="color: rgb(var(--neo-muted))"
          >{{ trait.value }}</span>
        </div>
      </div>
      <p
        v-else
        class="text-[13px] m-0 mt-[10px]"
        style="color: rgb(var(--neo-muted))"
      >
        {{ t('profile.psychologicalProfile.preview.emptyState') }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserProfileStore } from '@/stores/userProfile.store'
import { useT } from '@/composables/useT'
import { PROFILE_SECTION_IDS } from '@/domain/userProfile'

const { t, locale } = useT()
const router = useRouter()
const userProfileStore = useUserProfileStore()

const lastBuiltLabel = computed(() => {
  const latest = userProfileStore.currentProfile
  if (!latest) return ''
  try {
    return new Intl.DateTimeFormat(locale.value, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(latest.createdAt))
  } catch {
    return latest.createdAt
  }
})

// The current profile model stores prose per section, not numeric trait
// scores. As a lightweight "trait preview" we surface up to 5 non-empty
// sections and visualise how filled-in each one is (relative to the longest
// section). This stays honest about the underlying data instead of inventing
// Big Five numbers, and is replaced as soon as a richer profile schema lands.
const traitPreview = computed(() => {
  const profile = userProfileStore.currentProfile
  if (!profile?.sections) return []
  const filled = PROFILE_SECTION_IDS.map((id) => ({
    id,
    label: t(`profile.psychologicalProfile.sections.${id}`),
    text: (profile.sections[id] ?? '').trim(),
  })).filter((s) => s.text.length > 0)

  if (filled.length === 0) return []

  const maxLen = Math.max(...filled.map((s) => s.text.length))
  return filled.slice(0, 5).map((s) => ({
    label: s.label,
    value: Math.max(8, Math.round((s.text.length / maxLen) * 100)),
  }))
})

function goToProfile() {
  router.push({ name: 'profile-psychological' })
}

function goToBuild() {
  router.push({ name: 'profile-psychological-build' })
}

onMounted(async () => {
  if (userProfileStore.profiles.length === 0) {
    try {
      await userProfileStore.loadProfiles()
    } catch (error) {
      console.error('Error loading psychological profiles:', error)
    }
  }
})
</script>

<style scoped>
.zb-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--color-on-surface-variant));
}

.zb-divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgb(var(--neo-border) / 0.45),
    transparent
  );
  margin: 0 1px;
}

.trait-bar {
  height: 10px;
  padding: 0;
  border-radius: 9999px;
  overflow: hidden;
}

.trait-bar__fill {
  height: 100%;
  border-radius: 9999px;
  background: linear-gradient(
    90deg,
    rgb(var(--neo-accent-start)),
    rgb(var(--neo-accent-end))
  );
}
</style>
