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
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.attitudinalShift.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.attitudinalShift.subtitle') }}</p>
      </div>
    </div>

    <AttitudinalShiftWizard @saved="handleSaved" />

    <!-- Past shifts -->
    <div v-if="attitudinalShiftStore.sortedShifts.length > 0" class="mt-8">
      <h2 class="text-lg font-semibold text-on-surface mb-3">{{ t('exercises.views.pastShifts') }}</h2>
      <div class="space-y-3">
        <AppCard
          v-for="shift in attitudinalShiftStore.sortedShifts"
          :key="shift.id"
          padding="md"
        >
          <div class="flex justify-between items-start">
            <div class="min-w-0 flex-1">
              <p v-if="shift.statements[0]" class="text-sm text-on-surface truncate">
                <span class="text-on-surface-variant line-through">{{ truncate(shift.statements[0].belief, 30) }}</span>
                <span class="mx-1">&rarr;</span>
                <span class="font-medium">{{ truncate(shift.statements[0].reframe ?? '', 30) }}</span>
              </p>
              <p class="text-xs text-on-surface-variant mt-1">
                {{ shift.statements.length }} statement{{ shift.statements.length !== 1 ? 's' : '' }}
                &middot;
                {{ formatDate(shift.createdAt) }}
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
import AttitudinalShiftWizard from '@/components/exercises/AttitudinalShiftWizard.vue'
import { useAttitudinalShiftStore } from '@/stores/attitudinalShift.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useShadowBeliefsStore } from '@/stores/shadowBeliefs.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useT } from '@/composables/useT'
import type { CreateAttitudinalShiftPayload } from '@/domain/exercises'

const router = useRouter()
const { t } = useT()
const attitudinalShiftStore = useAttitudinalShiftStore()
const emotionStore = useEmotionStore()
const shadowBeliefsStore = useShadowBeliefsStore()
const commitmentStore = useCommitmentStore()

onMounted(() => {
  if (!emotionStore.isLoaded) {
    emotionStore.loadEmotions()
  }
  attitudinalShiftStore.loadShifts()
  shadowBeliefsStore.loadBeliefs()
})

async function handleSaved(data: CreateAttitudinalShiftPayload, commitmentReframe?: string) {
  await attitudinalShiftStore.createShift(data)

  if (commitmentReframe) {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    await commitmentStore.createCommitment({
      startDate: monday.toISOString(),
      endDate: sunday.toISOString(),
      periodType: 'weekly',
      name: `Practice: ${commitmentReframe}`,
      status: 'planned',
      lifeAreaIds: [],
      priorityIds: [],
    })
  }

  await attitudinalShiftStore.loadShifts()
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + '\u2026'
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
