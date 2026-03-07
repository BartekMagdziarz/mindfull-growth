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
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.partsDialogue.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.partsDialogue.subtitle') }}</p>
      </div>
    </div>

    <PartsDialogueWizard @saved="handleSaved" />

    <!-- Past Dialogues -->
    <div class="mt-10 space-y-4">
      <h2 class="text-base font-semibold text-on-surface">{{ t('exercises.views.pastDialogues') }}</h2>

      <template v-if="sortedDialogues.length">
        <AppCard
          v-for="dialogue in sortedDialogues"
          :key="dialogue.id"
          variant="raised"
          padding="md"
          class="space-y-2"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-on-surface">{{ formatDate(dialogue.createdAt) }}</span>
            <div class="flex items-center gap-2">
              <span class="neo-pill text-xs px-2 py-0.5 bg-primary/10 text-primary font-semibold">
                {{ t('exercises.views.messagesCount', { n: dialogue.messages.length }) }}
              </span>
              <span v-if="dialogue.insights.length" class="neo-pill text-xs px-2 py-0.5 bg-amber-100 text-amber-700 font-semibold">
                {{ t('exercises.views.insightsCount', { n: dialogue.insights.length }) }}
              </span>
            </div>
          </div>

          <!-- Linked part -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-on-surface-variant">{{ t('exercises.views.part') }}</span>
            <span class="text-xs font-medium text-on-surface">{{ getPartName(dialogue.partId) }}</span>
            <PartRoleBadge v-if="getPartRole(dialogue.partId)" :role="getPartRole(dialogue.partId)!" />
          </div>

          <p class="text-xs text-on-surface-variant">
            <span class="font-medium">{{ t('exercises.views.intention') }}</span> {{ dialogue.intention }}
          </p>

          <p v-if="dialogue.summary" class="text-xs text-on-surface-variant line-clamp-2">
            {{ dialogue.summary }}
          </p>

          <div v-if="dialogue.llmAssistUsed" class="flex items-center gap-1">
            <span class="neo-pill text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600">{{ t('exercises.views.aiAssistedBadge') }}</span>
          </div>
        </AppCard>
      </template>

      <p v-else class="text-sm text-on-surface-variant">
        {{ t('exercises.views.noDialoguesYet') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import PartsDialogueWizard from '@/components/exercises/PartsDialogueWizard.vue'
import { useIFSPartsDialogueStore } from '@/stores/ifsPartsDialogue.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useT } from '@/composables/useT'

const router = useRouter()
const { t } = useT()
const dialogueStore = useIFSPartsDialogueStore()
const partStore = useIFSPartStore()

onMounted(() => {
  dialogueStore.loadDialogues()
  partStore.loadParts()
})

const sortedDialogues = computed(() => dialogueStore.sortedDialogues)

function handleSaved() {
  dialogueStore.loadDialogues()
}

function getPartName(id: string): string {
  return partStore.getPartById(id)?.name ?? t('exercises.views.unknown')
}

function getPartRole(id: string) {
  return partStore.getPartById(id)?.role ?? null
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>
