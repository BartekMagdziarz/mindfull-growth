<template>
  <AppCard
    v-if="isDev"
    class="mt-6 border-2 border-dashed border-outline/30"
    padding="md"
    data-test-build-log-panel
  >
    <!-- Header: title + count + Clear all -->
    <div class="flex items-center justify-between gap-3 mb-2">
      <h3 class="text-base font-semibold text-on-surface">
        🛠 Dev: Profile Build Logs
        <span class="text-xs text-on-surface-variant font-normal">
          ({{ logs.length }})
        </span>
      </h3>
      <button
        v-if="logs.length > 0"
        type="button"
        class="neo-raised rounded-xl px-3 py-1.5 text-xs text-on-surface hover:-translate-y-px active:shadow-neu-pressed transition-transform"
        data-test-clear-build-logs
        @click="askClear"
      >
        Clear all
      </button>
    </div>

    <!-- Local-only notice -->
    <p class="text-xs text-on-surface-variant mb-3">
      Logs are stored locally in IndexedDB and never leave this device. They
      include full request and response bodies for every profile build, success
      or failure. Useful for iterating on the system prompt in
      <code class="font-mono">profileLLMAssists.ts</code>: open the latest
      success log, read the response, tweak the prompt, then rebuild.
    </p>

    <!-- Loading -->
    <p
      v-if="isLoading"
      class="text-sm text-on-surface-variant italic"
      data-test-build-logs-loading
    >
      Loading logs…
    </p>

    <!-- Empty state -->
    <p
      v-else-if="logs.length === 0"
      class="text-sm text-on-surface-variant italic"
      data-test-build-logs-empty
    >
      No profile builds yet.
    </p>

    <!-- Log list -->
    <ul v-else class="space-y-2" data-test-build-logs-list>
      <li
        v-for="log in logs"
        :key="log.id"
        class="neo-surface rounded-2xl p-3"
        :data-test-build-log-row="log.id"
      >
        <button
          type="button"
          class="w-full flex items-center justify-between gap-3 text-left"
          :aria-expanded="expandedId === log.id"
          @click="toggle(log.id)"
        >
          <div class="min-w-0 flex-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="text-xs text-on-surface-variant">
              {{ formatTimestamp(log.timestamp) }}
            </span>
            <span class="text-xs font-mono text-on-surface">
              {{ log.model }}
            </span>
            <span class="text-xs text-on-surface-variant">
              {{ formatLatency(log.latencyMs) }}
            </span>
            <span
              :class="[
                'text-xs px-2 py-0.5 rounded-full font-semibold',
                log.success
                  ? 'bg-success/20 text-success'
                  : 'bg-error/20 text-error',
              ]"
              :data-test-build-log-status="log.success ? 'ok' : 'fail'"
            >
              {{ log.success ? 'ok' : 'fail' }}
            </span>
            <span
              v-if="log.tokenUsage"
              class="text-xs text-on-surface-variant"
            >
              {{ log.tokenUsage.promptTokens }}
              +
              {{ log.tokenUsage.completionTokens }}
              =
              {{ log.tokenUsage.totalTokens }}
              tok
            </span>
            <span
              v-if="log.resultProfileId"
              class="text-xs font-mono text-on-surface-variant"
              :title="log.resultProfileId"
              data-test-build-log-profile-link
            >
              → {{ truncateId(log.resultProfileId) }}
            </span>
          </div>
          <AppIcon
            name="expand_more"
            :class="[
              'text-base text-on-surface-variant transition-transform',
              expandedId === log.id ? 'rotate-180' : '',
            ]"
          />
        </button>

        <!-- Expanded body -->
        <div
          v-if="expandedId === log.id"
          class="mt-3 space-y-3"
          :data-test-build-log-body="log.id"
        >
          <!-- Error message (failure only) -->
          <div v-if="log.errorMessage">
            <h4 class="text-xs font-semibold text-on-surface-variant mb-1">
              Error
            </h4>
            <pre
              class="text-xs p-2 bg-section rounded-xl whitespace-pre-wrap break-all"
              data-test-build-log-error
            >{{ log.errorMessage }}</pre>
          </div>

          <!-- Token usage grid -->
          <div v-if="log.tokenUsage">
            <h4 class="text-xs font-semibold text-on-surface-variant mb-1">
              Token usage
            </h4>
            <div class="grid grid-cols-3 gap-2 text-xs">
              <div class="bg-section rounded-xl p-2">
                <div class="text-on-surface-variant">Prompt</div>
                <div class="font-mono text-on-surface">
                  {{ log.tokenUsage.promptTokens }}
                </div>
              </div>
              <div class="bg-section rounded-xl p-2">
                <div class="text-on-surface-variant">Completion</div>
                <div class="font-mono text-on-surface">
                  {{ log.tokenUsage.completionTokens }}
                </div>
              </div>
              <div class="bg-section rounded-xl p-2">
                <div class="text-on-surface-variant">Total</div>
                <div class="font-mono text-on-surface">
                  {{ log.tokenUsage.totalTokens }}
                </div>
              </div>
            </div>
          </div>

          <!-- Estimate breakdown (per-type × age) -->
          <div v-if="log.estimateBreakdown" data-test-estimate-breakdown>
            <h4 class="text-xs font-semibold text-on-surface-variant mb-1">
              Estimate (~{{ log.estimateBreakdown.approxTokens }} tok)
            </h4>
            <div
              v-if="(log.estimateBreakdown.summarizedPeriods ?? 0) > 0"
              class="text-xs text-on-surface-variant mb-1"
            >
              Summarized history: {{ log.estimateBreakdown.summarizedPeriods }} periods (~{{
                log.estimateBreakdown.summarizedHistoryTokens ?? 0
              }}
              tok)<span v-if="(log.droppedSummarizedPeriods ?? 0) > 0">
                · {{ log.droppedSummarizedPeriods }} dropped</span
              >
            </div>
            <div class="space-y-2">
              <div v-if="estimateTypeEntries(log).length > 0">
                <div
                  class="text-[10px] uppercase tracking-wide text-on-surface-variant mb-1"
                >
                  By type
                </div>
                <div class="grid grid-cols-3 gap-2 text-xs">
                  <div
                    v-for="[type, tokens] in estimateTypeEntries(log)"
                    :key="type"
                    class="bg-section rounded-xl p-2"
                  >
                    <div class="text-on-surface-variant">{{ type }}</div>
                    <div class="font-mono text-on-surface">{{ tokens }}</div>
                  </div>
                </div>
              </div>
              <div v-if="estimateAgeEntries(log).length > 0">
                <div
                  class="text-[10px] uppercase tracking-wide text-on-surface-variant mb-1"
                >
                  By age
                </div>
                <div class="grid grid-cols-3 gap-2 text-xs">
                  <div
                    v-for="[bucket, tokens] in estimateAgeEntries(log)"
                    :key="bucket"
                    class="bg-section rounded-xl p-2"
                  >
                    <div class="text-on-surface-variant">{{ bucket }}</div>
                    <div class="font-mono text-on-surface">{{ tokens }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Trimmed to fit (budget-aware drops) -->
          <div
            v-if="droppedEntries(log).length > 0"
            data-test-dropped-by-type
          >
            <h4 class="text-xs font-semibold text-on-surface-variant mb-1">
              Trimmed to fit
            </h4>
            <div class="grid grid-cols-3 gap-2 text-xs">
              <div
                v-for="[type, count] in droppedEntries(log)"
                :key="type"
                class="bg-section rounded-xl p-2"
              >
                <div class="text-on-surface-variant">{{ type }}</div>
                <div class="font-mono text-on-surface">−{{ count }}</div>
              </div>
            </div>
          </div>

          <!-- Scope -->
          <div>
            <h4 class="text-xs font-semibold text-on-surface-variant mb-1">
              Scope
            </h4>
            <pre
              class="text-xs p-2 bg-section rounded-xl whitespace-pre-wrap break-all max-h-48 overflow-auto"
            >{{ formatScopeSummary(log.scope) }}</pre>
          </div>

          <!-- Request body -->
          <div>
            <h4 class="text-xs font-semibold text-on-surface-variant mb-1">
              Request body
            </h4>
            <pre
              class="text-xs p-2 bg-section rounded-xl whitespace-pre-wrap break-all max-h-96 overflow-auto"
              data-test-build-log-request
            >{{ formatJsonIfPossible(log.requestBody) }}</pre>
          </div>

          <!-- Response body -->
          <div>
            <h4 class="text-xs font-semibold text-on-surface-variant mb-1">
              Response body
            </h4>
            <pre
              class="text-xs p-2 bg-section rounded-xl whitespace-pre-wrap break-all max-h-96 overflow-auto"
              data-test-build-log-response
            >{{ formatJsonIfPossible(log.responseBody) }}</pre>
          </div>
        </div>
      </li>
    </ul>

    <!-- Clear-all confirm dialog -->
    <AppDialog
      v-model="showClearDialog"
      title="Clear all build logs?"
      message="This will permanently remove every profile build log from this device. Saved profile versions are not affected."
      confirm-text="Clear"
      cancel-text="Cancel"
      confirm-variant="filled"
      @confirm="handleClear"
    />
  </AppCard>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { profileBuildLogDexieRepository } from '@/repositories/profileBuildLogDexieRepository'
import type {
  ProfileBuildLogEntry,
  UserProfileScope,
} from '@/domain/userProfile'
import { useT } from '@/composables/useT'

// Keep the panel performant even after many builds. Older logs remain in
// the DB and can be inspected with devtools; pagination is out of scope.
const LOG_LIMIT = 100

// Compile-time gate. The caller also wraps the mount in `v-if="isDev"`; the
// inner gate is defence-in-depth and makes the component self-censoring if
// reused elsewhere.
const isDev = import.meta.env.DEV

const { locale } = useT()

const logs = ref<ProfileBuildLogEntry[]>([])
const isLoading = ref(false)
const expandedId = ref<string | null>(null)
const showClearDialog = ref(false)

async function reload(): Promise<void> {
  isLoading.value = true
  try {
    const result = await profileBuildLogDexieRepository.list(LOG_LIMIT)
    // Defensive: repository contract promises an array, but permissive
    // mocks in unrelated test suites may leave the mock unconfigured.
    logs.value = Array.isArray(result) ? result : []
  } catch (err) {
    console.warn('Failed to load profile build logs:', err)
    logs.value = []
  } finally {
    isLoading.value = false
  }
}

function toggle(id: string): void {
  expandedId.value = expandedId.value === id ? null : id
}

function askClear(): void {
  showClearDialog.value = true
}

async function handleClear(): Promise<void> {
  try {
    await profileBuildLogDexieRepository.clearAll()
  } catch (err) {
    console.warn('Failed to clear profile build logs:', err)
  }
  expandedId.value = null
  await reload()
}

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat(locale.value, {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

function formatJsonIfPossible(raw: string): string {
  if (!raw) return ''
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function truncateId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

function formatScopeSummary(scope: UserProfileScope): string {
  const lines: string[] = []
  lines.push(`dataTypes: ${scope.dataTypes.join(', ') || '(none)'}`)
  if (scope.dateRange.kind === 'preset') {
    lines.push(`dateRange: preset ${scope.dateRange.preset}`)
  } else {
    lines.push(
      `dateRange: ${scope.dateRange.start} → ${scope.dateRange.end}`,
    )
  }
  lines.push(`approxTokenCount: ${scope.approxTokenCount}`)
  lines.push(`locale: ${scope.locale}`)
  lines.push(`grammaticalGender: ${scope.grammaticalGender}`)
  const includedCount = Object.entries(scope.includedObjectIds ?? {})
    .map(([k, v]) => `${k}=${(v ?? []).length}`)
    .join(', ')
  if (includedCount) lines.push(`includedObjectIds: ${includedCount}`)
  return lines.join('\n')
}

/** Non-zero per-type estimate entries for the breakdown grid. */
function estimateTypeEntries(log: ProfileBuildLogEntry): [string, number][] {
  return Object.entries(log.estimateBreakdown?.tokensByType ?? {}).filter(
    (entry): entry is [string, number] => (entry[1] ?? 0) > 0,
  )
}

/** Non-zero per-age estimate entries for the breakdown grid. */
function estimateAgeEntries(log: ProfileBuildLogEntry): [string, number][] {
  return Object.entries(log.estimateBreakdown?.tokensByAge ?? {}).filter(
    (entry): entry is [string, number] => (entry[1] ?? 0) > 0,
  )
}

/** Non-zero per-type drop counts (records trimmed to fit the budget). */
function droppedEntries(log: ProfileBuildLogEntry): [string, number][] {
  return Object.entries(log.droppedByType ?? {}).filter(
    (entry): entry is [string, number] => (entry[1] ?? 0) > 0,
  )
}

onMounted(async () => {
  if (isDev) await reload()
})

// Exposed for potential future use by the overview (e.g. reload after a
// fresh build completes). Not required for V1.
defineExpose({ reload })
</script>
