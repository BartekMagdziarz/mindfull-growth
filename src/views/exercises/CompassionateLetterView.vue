<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <div class="flex items-center gap-4 mb-6">
      <button
        class="neo-back-btn p-2 text-neu-text neo-focus"
        @click="router.push('/exercises')"
      >
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.compassionateLetter.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.compassionateLetter.subtitle') }}</p>
      </div>
    </div>

    <CompassionateLetterWizard @saved="handleSaved" />

    <!-- Past letters section -->
    <div v-if="compassionateLetterStore.sortedLetters.length > 0" class="mt-8">
      <h2 class="text-lg font-semibold text-on-surface mb-3">{{ t('exercises.views.pastLetters') }}</h2>
      <div class="space-y-3">
        <AppCard
          v-for="letter in compassionateLetterStore.sortedLetters"
          :key="letter.id"
          padding="md"
        >
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-on-surface line-clamp-2">{{ letter.situation }}</p>
              <p class="text-xs text-on-surface-variant mt-1">
                {{ formatDate(letter.createdAt) }}
              </p>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import CompassionateLetterWizard from '@/components/exercises/CompassionateLetterWizard.vue'
import { useCompassionateLetterStore } from '@/stores/compassionateLetter.store'
import type { CreateCompassionateLetterPayload } from '@/domain/exercises'
import { useT } from '@/composables/useT'

const router = useRouter()
const { t } = useT()
const compassionateLetterStore = useCompassionateLetterStore()

onMounted(() => {
  compassionateLetterStore.loadLetters()
})

async function handleSaved(data: CreateCompassionateLetterPayload) {
  await compassionateLetterStore.createLetter(data)
  // Reload letters so the new one shows up in the past letters list
  await compassionateLetterStore.loadLetters()
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}
</script>
