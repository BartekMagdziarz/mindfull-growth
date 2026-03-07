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
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.socraticDialogue.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.socraticDialogue.subtitle') }}</p>
      </div>
    </div>

    <SocraticDialogueWizard @saved="handleSaved" />

    <!-- Past dialogues -->
    <div v-if="socraticStore.sortedDialogues.length > 0" class="mt-8">
      <h2 class="text-lg font-semibold text-on-surface mb-3">{{ t('exercises.views.pastDialogues') }}</h2>
      <div class="space-y-3">
        <AppCard
          v-for="dialogue in socraticStore.sortedDialogues"
          :key="dialogue.id"
          padding="md"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="neo-pill text-xs px-2.5 py-0.5">
                  {{ getFocusLabel(dialogue.focus) }}
                </span>
              </div>
              <p
                v-if="dialogue.insightPrimary"
                class="text-sm text-on-surface-variant line-clamp-2"
              >
                {{ dialogue.insightPrimary }}
              </p>
              <p class="text-xs text-on-surface-variant mt-1">
                {{ formatDate(dialogue.createdAt) }}
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
import SocraticDialogueWizard from '@/components/exercises/SocraticDialogueWizard.vue'
import { useSocraticDialogueStore } from '@/stores/socraticDialogue.store'
import { useT } from '@/composables/useT'
import type { CreateSocraticDialoguePayload, SocraticFocus } from '@/domain/exercises'

const router = useRouter()
const { t } = useT()
const socraticStore = useSocraticDialogueStore()

onMounted(() => {
  socraticStore.loadDialogues()
})

async function handleSaved(data: CreateSocraticDialoguePayload) {
  await socraticStore.createDialogue(data)
  await socraticStore.loadDialogues()
}

function getFocusLabel(focus: SocraticFocus): string {
  const labels: Record<SocraticFocus, string> = {
    meaning: 'Meaning',
    emptiness: 'Emptiness',
    suffering: 'Suffering',
    values: 'Values',
    decision: 'Decision',
    custom: 'Custom',
  }
  return labels[focus] || focus
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
