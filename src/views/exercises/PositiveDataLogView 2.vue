<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button
        class="neo-back-btn p-2 text-neu-text neo-focus"
        @click="handleBack"
      >
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.positiveDataLog.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.positiveDataLog.subtitle') }}</p>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="positiveDataLogStore.isLoading" class="neo-embedded p-6 text-center">
      <p class="text-sm text-on-surface-variant">{{ t('exercises.views.loadingLogs') }}</p>
    </div>

    <!-- No logs exist: show setup wizard -->
    <template v-else-if="positiveDataLogStore.sortedLogs.length === 0 && !selectedLogId">
      <PositiveDataLogWizard
        mode="setup"
        @created="handleCreated"
      />
    </template>

    <!-- Logs exist but none selected: show log list -->
    <template v-else-if="!selectedLogId">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exercises.views.yourLogs') }}</h2>
          <AppButton variant="tonal" @click="showSetupWizard = true">
            <PlusIcon class="w-4 h-4" />
            {{ t('exercises.views.newLog') }}
          </AppButton>
        </div>

        <!-- New log wizard inline -->
        <div v-if="showSetupWizard" class="space-y-4">
          <PositiveDataLogWizard
            mode="setup"
            @created="handleCreated"
          />
          <div class="flex justify-start">
            <AppButton variant="text" @click="showSetupWizard = false">Cancel</AppButton>
          </div>
        </div>

        <!-- Log cards -->
        <div v-if="!showSetupWizard" class="space-y-3">
          <AppCard
            v-for="log in positiveDataLogStore.sortedLogs"
            :key="log.id"
            padding="md"
            class="cursor-pointer hover:-translate-y-px transition-transform"
            @click="selectedLogId = log.id"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1 space-y-1">
                <p class="text-sm font-medium text-on-surface line-clamp-2 italic">
                  "{{ log.targetBelief }}"
                </p>
                <div class="flex items-center gap-3 text-xs text-on-surface-variant">
                  <span>{{ log.entries.length }} {{ log.entries.length === 1 ? 'entry' : 'entries' }}</span>
                  <span>&middot;</span>
                  <span>{{ formatDate(log.updatedAt) }}</span>
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-xs text-on-surface-variant">Believability:</span>
                  <span class="text-xs font-semibold text-on-surface">{{ log.believabilityInitial }}%</span>
                  <ArrowRightIcon class="w-3 h-3 text-on-surface-variant flex-shrink-0" />
                  <span
                    class="text-xs font-semibold"
                    :class="(log.believabilityLatest ?? log.believabilityInitial) < log.believabilityInitial ? 'text-success' : 'text-on-surface'"
                  >
                    {{ log.believabilityLatest ?? log.believabilityInitial }}%
                  </span>
                </div>
              </div>
              <ChevronRightIcon class="w-5 h-5 text-on-surface-variant flex-shrink-0 mt-1" />
            </div>
          </AppCard>
        </div>
      </div>
    </template>

    <!-- Selected log: show log mode -->
    <template v-else-if="selectedLog">
      <div class="mb-4">
        <AppButton variant="text" @click="selectedLogId = null">
          <ArrowLeftIcon class="w-4 h-4" />
          {{ t('exercises.views.backToLogs') }}
        </AppButton>
      </div>
      <PositiveDataLogWizard
        mode="log"
        :existing-log="selectedLog"
        @entry-added="handleEntryAdded"
        @entry-removed="handleEntryRemoved"
        @updated="handleUpdated"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PlusIcon,
  ChevronRightIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import PositiveDataLogWizard from '@/components/exercises/PositiveDataLogWizard.vue'
import { usePositiveDataLogStore } from '@/stores/positiveDataLog.store'
import type {
  CreatePositiveDataLogPayload,
  PositiveDataEntry,
} from '@/domain/exercises'
import { useT } from '@/composables/useT'

const router = useRouter()
const { t } = useT()
const positiveDataLogStore = usePositiveDataLogStore()

const selectedLogId = ref<string | null>(null)
const showSetupWizard = ref(false)

const selectedLog = computed(() => {
  if (!selectedLogId.value) return null
  return positiveDataLogStore.getLogById(selectedLogId.value) ?? null
})

onMounted(() => {
  positiveDataLogStore.loadLogs()
})

function handleBack() {
  if (selectedLogId.value) {
    selectedLogId.value = null
  } else {
    router.push('/exercises')
  }
}

async function handleCreated(data: CreatePositiveDataLogPayload) {
  const log = await positiveDataLogStore.createLog(data)
  selectedLogId.value = log.id
  showSetupWizard.value = false
  await positiveDataLogStore.loadLogs()
}

async function handleEntryAdded(entry: PositiveDataEntry) {
  if (!selectedLogId.value || !selectedLog.value) return
  const updatedEntries = [...selectedLog.value.entries, entry]
  await positiveDataLogStore.updateLog(selectedLogId.value, { entries: updatedEntries })
  await positiveDataLogStore.loadLogs()
}

async function handleEntryRemoved(entryId: string) {
  if (!selectedLogId.value || !selectedLog.value) return
  const updatedEntries = selectedLog.value.entries.filter((e) => e.id !== entryId)
  await positiveDataLogStore.updateLog(selectedLogId.value, { entries: updatedEntries })
  await positiveDataLogStore.loadLogs()
}

async function handleUpdated(data: { entries: PositiveDataEntry[]; believabilityLatest?: number }) {
  if (!selectedLogId.value) return
  await positiveDataLogStore.updateLog(selectedLogId.value, {
    believabilityLatest: data.believabilityLatest,
  })
  await positiveDataLogStore.loadLogs()
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
