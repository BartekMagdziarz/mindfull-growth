<template>
  <ExercisePage
    :title="t('exercises.cards.socraticDialogue.title')"
    :subtitle="t('exercises.cards.socraticDialogue.subtitle')"
  >
    <SocraticDialogueWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="socratic-dialogue" @again="saved = false" />

    <!-- Past dialogues -->
    <div v-if="socraticStore.sortedDialogues.length > 0" class="mt-8">
      <div class="mg-v2-section-head"><h2>{{ t('exercises.views.pastDialogues') }}</h2></div>
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
  </ExercisePage>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ExercisePage from '@/components/exercises/ExercisePage.vue'
import AppCard from '@/components/AppCard.vue'
import ExerciseSavedPanel from '@/components/exercises/ExerciseSavedPanel.vue'
import SocraticDialogueWizard from '@/components/exercises/SocraticDialogueWizard.vue'
import { useSocraticDialogueStore } from '@/stores/socraticDialogue.store'
import { useT } from '@/composables/useT'
import type { CreateSocraticDialoguePayload, SocraticFocus } from '@/domain/exercises'

const { t } = useT()
const socraticStore = useSocraticDialogueStore()
const saved = ref(false)

onMounted(() => {
  socraticStore.loadDialogues()
})

async function handleSaved(data: CreateSocraticDialoguePayload) {
  await socraticStore.createDialogue(data)
  saved.value = true
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
