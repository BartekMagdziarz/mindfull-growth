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
        class="neo-surface rounded-2xl p-3 border border-status-bad/30 bg-status-bad-soft/40 text-sm text-status-bad-on"
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
        class="neo-surface rounded-2xl p-3 border border-status-warn/30 bg-status-warn-soft/40 text-sm text-status-warn-on"
        role="status"
      >
        {{ t('profile.psychologicalProfile.wizard.preview.tokenWarning') }}
      </div>

      <!-- Trimmed-to-fit notice -->
      <div
        v-if="droppedTotal > 0"
        class="neo-surface rounded-2xl p-3 text-sm text-on-surface-variant"
        role="status"
        data-test="trimmed-notice"
      >
        {{
          t('profile.psychologicalProfile.wizard.preview.trimmed.notice', {
            dropped: droppedTotal,
            total: totalCount,
          })
        }}
      </div>

      <!-- Summarized-history notice (older periods as digests) -->
      <div
        v-if="(summarizedPeriods ?? 0) > 0"
        class="neo-surface rounded-2xl p-3 text-sm text-on-surface-variant"
        role="status"
        data-test="summarized-notice"
      >
        {{
          t('profile.psychologicalProfile.wizard.preview.summarizedHistory.notice', {
            n: summarizedPeriods ?? 0,
          })
        }}
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

      <!-- Token breakdown (per-type × age) -->
      <details
        v-if="hasBreakdown"
        class="neo-surface rounded-2xl"
        data-test="token-breakdown"
      >
        <summary class="cursor-pointer p-3 text-sm font-medium text-on-surface">
          {{ t('profile.psychologicalProfile.wizard.preview.breakdown.title') }}
        </summary>
        <div class="px-3 pb-3 space-y-3">
          <div v-if="breakdownByType.length > 0">
            <p class="text-xs font-semibold text-on-surface-variant mb-1">
              {{ t('profile.psychologicalProfile.wizard.preview.breakdown.byType') }}
            </p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div
                v-for="item in breakdownByType"
                :key="item.type"
                class="neo-surface rounded-xl p-2"
                :data-test-tokens-type="item.type"
              >
                <div class="text-xs text-on-surface-variant">
                  {{ t(`profile.psychologicalProfile.wizard.preview.counts.${item.type}`) }}
                </div>
                <div class="text-sm font-mono text-on-surface">
                  {{ formatTokens(item.tokens) }}
                </div>
              </div>
            </div>
          </div>
          <div v-if="breakdownByAge.length > 0">
            <p class="text-xs font-semibold text-on-surface-variant mb-1">
              {{ t('profile.psychologicalProfile.wizard.preview.breakdown.byAge') }}
            </p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div
                v-for="bucket in breakdownByAge"
                :key="bucket.key"
                class="neo-surface rounded-xl p-2"
                :data-test-tokens-age="bucket.key"
              >
                <div class="text-xs text-on-surface-variant">
                  {{ t(`profile.psychologicalProfile.wizard.preview.ageBuckets.${bucket.i18nKey}`) }}
                </div>
                <div class="text-sm font-mono text-on-surface">
                  {{ formatTokens(bucket.tokens) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </details>

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
import {
  PROFILE_AGE_BUCKETS,
  type ProfileAgeBucket,
  type ProfileDataType,
  type ProfileDateRange,
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
  tokensByType?: Partial<Record<ProfileDataType, number>>
  tokensByAge?: Partial<Record<ProfileAgeBucket, number>>
  droppedByType?: Partial<Record<ProfileDataType, number>>
  summarizedPeriods?: number
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

// Records the budget-aware assembler trimmed to fit the model window. `totalCount`
// stays the pre-trim match count, so the notice reads "trimmed K of M".
const droppedTotal = computed(() =>
  Object.values(props.droppedByType ?? {}).reduce((sum, n) => sum + (n ?? 0), 0),
)

const visibleHeaders = computed(() => props.headers.slice(0, HEADER_LIMIT))

// Per-type token estimate, ordered like the count cards, dropping zero-cost types.
const breakdownByType = computed(() =>
  props.dataTypes
    .map((type) => ({ type, tokens: props.tokensByType?.[type] ?? 0 }))
    .filter((item) => item.tokens > 0),
)

// i18n-safe leaf keys (raw bucket keys like "0-30d"/"365d+" don't make good
// i18n path segments — leading digit / "+").
const AGE_BUCKET_I18N: Record<ProfileAgeBucket, string> = {
  '0-30d': 'recent',
  '31-90d': 'quarter',
  '91-365d': 'year',
  '365d+': 'older',
  undated: 'undated',
}

// Per-age token estimate in canonical bucket order, dropping empty buckets.
const breakdownByAge = computed(() =>
  PROFILE_AGE_BUCKETS.map((key) => ({
    key,
    i18nKey: AGE_BUCKET_I18N[key],
    tokens: props.tokensByAge?.[key] ?? 0,
  })).filter((bucket) => bucket.tokens > 0),
)

const hasBreakdown = computed(
  () => breakdownByType.value.length > 0 || breakdownByAge.value.length > 0,
)

/** Compact token count: "9.1k" for thousands, the raw number otherwise. */
function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

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
