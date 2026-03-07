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
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.unblending.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.unblending.subtitle') }}</p>
      </div>
    </div>

    <UnblendingWizard @saved="handleSaved" />

    <!-- Habit Prompt -->
    <div
      v-if="sortedSessions.length > 0 && !hasMatchingHabit"
      class="neo-surface p-4 rounded-xl flex items-center gap-3 mt-6"
    >
      <SparklesIcon class="w-5 h-5 text-primary flex-shrink-0" />
      <div class="flex-1">
        <p class="text-sm font-medium text-on-surface">{{ t('exercises.views.habitPrompt') }}</p>
        <p class="text-xs text-on-surface-variant">{{ t('exercises.views.habitPromptDescription') }}</p>
      </div>
      <AppButton variant="tonal" @click="router.push('/planning/habits/new?prefill=unblending')">
        {{ t('exercises.views.createHabit') }}
      </AppButton>
    </div>

    <!-- Past Sessions -->
    <div class="mt-10 space-y-4">
      <h2 class="text-base font-semibold text-on-surface">{{ t('exercises.views.pastSessions') }}</h2>

      <!-- Average shift rating -->
      <div v-if="sortedSessions.length" class="neo-surface p-3 rounded-lg flex items-center justify-between">
        <span class="text-sm text-on-surface-variant">{{ t('exercises.views.averageSpaceCreated') }}</span>
        <span class="text-lg font-bold text-primary">{{ averageShift }}/10</span>
      </div>

      <template v-if="sortedSessions.length">
        <AppCard
          v-for="session in sortedSessions"
          :key="session.id"
          variant="raised"
          padding="md"
          class="space-y-2"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-on-surface">{{ formatDate(session.createdAt) }}</span>
            <span class="neo-pill text-xs px-2 py-0.5 bg-primary/10 text-primary font-semibold">
              {{ t('exercises.views.spaceBadge', { n: session.shiftRating }) }}
            </span>
          </div>

          <!-- Linked part -->
          <div v-if="session.blendedPartId" class="flex items-center gap-2">
            <span class="text-xs text-on-surface-variant">{{ t('exercises.views.part') }}</span>
            <span class="text-xs font-medium text-on-surface">{{ getPartName(session.blendedPartId) }}</span>
            <PartRoleBadge v-if="getPartRole(session.blendedPartId)" :role="getPartRole(session.blendedPartId)!" />
          </div>

          <!-- Before/After emotions -->
          <div v-if="session.beforeEmotionIds.length || session.afterEmotionIds.length" class="flex gap-4">
            <div v-if="session.beforeEmotionIds.length" class="space-y-1">
              <p class="text-xs text-on-surface-variant">{{ t('exercises.views.before') }}</p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="eid in session.beforeEmotionIds.slice(0, 3)"
                  :key="eid"
                  class="neo-pill text-xs px-1.5 py-0.5 bg-neu-base text-on-surface-variant"
                >
                  {{ getEmotionName(eid) }}
                </span>
              </div>
            </div>
            <div v-if="session.afterEmotionIds.length" class="space-y-1">
              <p class="text-xs text-on-surface-variant">{{ t('exercises.views.after') }}</p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="eid in session.afterEmotionIds.slice(0, 3)"
                  :key="eid"
                  class="neo-pill text-xs px-1.5 py-0.5 bg-primary/10 text-primary"
                >
                  {{ getEmotionName(eid) }}
                </span>
              </div>
            </div>
          </div>

          <p v-if="session.shiftNotes" class="text-xs text-on-surface-variant line-clamp-2">
            {{ session.shiftNotes }}
          </p>
        </AppCard>
      </template>

      <p v-else class="text-sm text-on-surface-variant">
        {{ t('exercises.views.noUnblendingYet') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon, SparklesIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import UnblendingWizard from '@/components/exercises/UnblendingWizard.vue'
import { useIFSUnblendingStore } from '@/stores/ifsUnblending.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useHabitStore } from '@/stores/habit.store'
import { useT } from '@/composables/useT'

const router = useRouter()
const { t } = useT()
const unblendingStore = useIFSUnblendingStore()
const partStore = useIFSPartStore()
const emotionStore = useEmotionStore()
const habitStore = useHabitStore()

const hasMatchingHabit = computed(() =>
  habitStore.habits.some((h) => h.name.toLowerCase().includes('unblending')),
)

onMounted(() => {
  unblendingStore.loadSessions()
  partStore.loadParts()
  emotionStore.loadEmotions()
  habitStore.loadHabits()
})

const sortedSessions = computed(() => unblendingStore.sortedSessions)

const averageShift = computed(() => {
  if (!sortedSessions.value.length) return '—'
  const sum = sortedSessions.value.reduce((acc, s) => acc + s.shiftRating, 0)
  return (sum / sortedSessions.value.length).toFixed(1)
})

function handleSaved() {
  unblendingStore.loadSessions()
}

function getPartName(id: string): string {
  return partStore.getPartById(id)?.name ?? t('exercises.views.unknown')
}

function getPartRole(id: string) {
  return partStore.getPartById(id)?.role ?? null
}

function getEmotionName(id: string): string {
  return emotionStore.getEmotionById(id)?.name ?? id
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>
