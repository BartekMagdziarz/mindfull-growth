<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <div class="flex items-center gap-4 mb-6">
      <button
        class="neo-back-btn p-2 text-neu-text neo-focus"
        @click="router.push('/exercises')"
      >
        <AppIcon name="arrow_back" class="text-2xl" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.thoughtRecord.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.thoughtRecord.subtitle') }}</p>
      </div>
    </div>

    <ThoughtRecordWizard @saved="handleSaved" />

    <!-- Past Records -->
    <div v-if="thoughtRecordStore.sortedRecords.length > 0" class="mt-10 space-y-4">
      <h2 class="text-base font-semibold text-on-surface">{{ t('exercises.views.pastRecords') }}</h2>
      <AppCard
        v-for="record in thoughtRecordStore.sortedRecords"
        :key="record.id"
        padding="md"
        class="space-y-2"
      >
        <div class="flex items-start justify-between gap-2">
          <p class="text-sm text-on-surface font-medium line-clamp-2">
            {{ record.situation }}
          </p>
          <span class="text-xs text-on-surface-variant whitespace-nowrap flex-shrink-0">
            {{ formatDate(record.createdAt) }}
          </span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="er in record.emotionsAfter"
            :key="er.emotionId"
            class="inline-flex items-center gap-1 text-xs"
          >
            <span class="font-medium text-on-surface">
              {{ getEmotionName(er.emotionId) }}
            </span>
            <span :class="getRecordShiftClass(record, er.emotionId)">
              <AppIcon
                v-if="er.intensity < getRecordBeforeIntensity(record, er.emotionId)"
                name="arrow_downward"
                class="text-xs inline"
              />
              <AppIcon
                v-else-if="er.intensity > getRecordBeforeIntensity(record, er.emotionId)"
                name="arrow_upward"
                class="text-xs inline"
              />
              <AppIcon v-else name="remove" class="text-xs inline" />
            </span>
          </span>
        </div>
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import ThoughtRecordWizard from '@/components/exercises/ThoughtRecordWizard.vue'
import { useThoughtRecordStore } from '@/stores/thoughtRecord.store'
import { useEmotionStore } from '@/stores/emotion.store'
import type { CreateThoughtRecordPayload, ThoughtRecord } from '@/domain/exercises'
import { useT } from '@/composables/useT'

const router = useRouter()
const { t } = useT()
const thoughtRecordStore = useThoughtRecordStore()
const emotionStore = useEmotionStore()

onMounted(async () => {
  if (!emotionStore.isLoaded) {
    await emotionStore.loadEmotions()
  }
  await thoughtRecordStore.loadRecords()
})

async function handleSaved(data: CreateThoughtRecordPayload) {
  await thoughtRecordStore.createRecord(data)
  router.push('/exercises')
}

function getEmotionName(emotionId: string): string {
  return emotionStore.getEmotionById(emotionId)?.name ?? t('exercises.views.unknown')
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function getRecordBeforeIntensity(record: ThoughtRecord, emotionId: string): number {
  return record.emotionsBefore.find((e) => e.emotionId === emotionId)?.intensity ?? 0
}

function getRecordShiftClass(record: ThoughtRecord, emotionId: string): string {
  const before = getRecordBeforeIntensity(record, emotionId)
  const after = record.emotionsAfter.find((e) => e.emotionId === emotionId)?.intensity ?? 0
  if (after < before) return 'text-green-600'
  if (after > before) return 'text-error'
  return 'text-on-surface-variant'
}
</script>
