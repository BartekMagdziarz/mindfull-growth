<template>
  <div class="space-y-4">
    <!-- Loading skeleton -->
    <div v-if="isLoading" class="space-y-3" aria-live="polite">
      <div
        v-for="i in 3"
        :key="i"
        class="neo-surface rounded-2xl p-4 animate-pulse"
      >
        <div class="h-4 w-1/3 bg-neu-base rounded mb-2" />
        <div class="h-3 w-2/3 bg-neu-base rounded" />
      </div>
    </div>

    <template v-else>
      <!-- Error banner -->
      <div
        v-if="error"
        class="neo-surface rounded-2xl p-3 border border-red-400/30 bg-red-50/40 text-sm text-red-700"
        role="alert"
      >
        {{ error }}
      </div>

      <!-- Summary card -->
      <AppCard padding="lg" variant="raised">
        <h2 class="text-base font-semibold text-on-surface">
          {{ t('profile.psychologicalProfile.wizard.preview.title') }}
        </h2>
        <p class="text-sm text-on-surface-variant mt-1">
          {{ t('profile.psychologicalProfile.wizard.preview.subtitle') }}
        </p>

        <div class="mt-3 grid grid-cols-2 gap-3">
          <div class="neo-surface rounded-2xl p-3">
            <p class="text-xs text-on-surface-variant uppercase tracking-wide">
              {{ t('profile.psychologicalProfile.wizard.preview.dateRange') }}
            </p>
            <p class="text-sm text-on-surface mt-1">{{ dateRangeSummary }}</p>
          </div>
          <div class="neo-surface rounded-2xl p-3">
            <p class="text-xs text-on-surface-variant uppercase tracking-wide">
              {{ t('profile.psychologicalProfile.wizard.preview.totalItems') }}
            </p>
            <p class="text-sm text-on-surface mt-1">{{ totalCount }}</p>
          </div>
        </div>

        <p class="text-xs text-on-surface-variant mt-3">
          {{
            t('profile.psychologicalProfile.wizard.preview.approxTokens', {
              n: approxTokens,
            })
          }}
        </p>
      </AppCard>

      <!-- Token warning -->
      <div
        v-if="showTokenWarning"
        class="neo-surface rounded-2xl p-3 border border-amber-400/30 bg-amber-50/40 text-sm text-amber-800"
        role="status"
      >
        {{ t('profile.psychologicalProfile.wizard.preview.tokenWarning') }}
      </div>

      <!-- Per-type counts grid -->
      <div v-if="activeTypes.length > 0" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div
          v-for="type in activeTypes"
          :key="type"
          class="neo-surface rounded-2xl p-3"
          :data-test-count-type="type"
        >
          <p class="text-xs text-on-surface-variant">
            {{ t(`profile.psychologicalProfile.wizard.preview.counts.${type}`) }}
          </p>
          <p class="text-lg font-semibold text-on-surface mt-1">
            {{ countsByType[type] ?? 0 }}
          </p>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="totalCount === 0 && !error"
        class="neo-surface rounded-2xl p-6 text-center"
      >
        <p class="text-sm text-on-surface-variant">
          {{ t('profile.psychologicalProfile.wizard.preview.emptyState') }}
        </p>
      </div>

      <!-- Source list -->
      <details v-if="headers.length > 0" class="neo-surface rounded-2xl">
        <summary class="cursor-pointer p-3 text-sm font-medium text-on-surface">
          {{ t('profile.psychologicalProfile.wizard.preview.sourceList') }}
          ({{ headers.length }})
        </summary>
        <ul class="px-3 pb-3 space-y-1.5 max-h-96 overflow-y-auto">
          <li
            v-for="h in visibleHeaders"
            :key="`${h.type}-${h.id}`"
            class="flex items-center gap-2 text-xs text-on-surface-variant"
          >
            <span class="neo-pill px-2 py-0.5 text-[10px] uppercase tracking-wide">
              {{ t(`profile.psychologicalProfile.wizard.preview.counts.${h.type}`) }}
            </span>
            <span class="flex-1 min-w-0 truncate text-on-surface">{{ h.title }}</span>
            <span>{{ formatDate(h.date) }}</span>
          </li>
          <li
            v-if="headers.length > HEADER_LIMIT"
            class="text-xs text-on-surface-variant italic pt-1"
          >
            {{
              t('profile.psychologicalProfile.wizard.preview.truncated', {
                n: headers.length - HEADER_LIMIT,
              })
            }}
          </li>
        </ul>
      </details>

      <!-- Refresh -->
      <div class="flex justify-end">
        <AppButton variant="text" @click="emit('refresh')">
          {{ t('profile.psychologicalProfile.wizard.preview.refresh') }}
        </AppButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import { useT } from '@/composables/useT'
import type {
  ProfileDataType,
  ProfileDateRange,
} from '@/domain/userProfile'
import type { ProfilePreviewObjectHeader } from '@/services/profileScopeQueries'

const props = defineProps<{
  isLoading: boolean
  error: string | null
  countsByType: Partial<Record<ProfileDataType, number>>
  headers: ProfilePreviewObjectHeader[]
  approxTokens: number
  dataTypes: ProfileDataType[]
  dateRange: ProfileDateRange
}>()

const emit = defineEmits<{ refresh: [] }>()

const { t, locale } = useT()

const HEADER_LIMIT = 200
const TOKEN_WARN_THRESHOLD = 120_000

const totalCount = computed(() =>
  Object.values(props.countsByType).reduce((sum, n) => sum + (n ?? 0), 0),
)

const activeTypes = computed(() => props.dataTypes)

const showTokenWarning = computed(() => props.approxTokens > TOKEN_WARN_THRESHOLD)

const visibleHeaders = computed(() => props.headers.slice(0, HEADER_LIMIT))

const dateRangeSummary = computed(() => {
  const range = props.dateRange
  if (range.kind === 'preset') {
    return t(`profile.psychologicalProfile.wizard.scope.dateRange.presets.${range.preset}`)
  }
  const start = range.start || ''
  const end = range.end || ''
  return `${start} — ${end}`
})

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(locale.value, {
      dateStyle: 'medium',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}
</script>
