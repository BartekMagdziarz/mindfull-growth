<template>
  <div class="mx-auto max-w-7xl px-4 py-6">
    <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div class="mb-2 flex items-center gap-2">
          <span class="neo-pill px-3 py-1 text-xs font-semibold text-primary">
            {{ t('aiPlayground.developmentOnly') }}
          </span>
          <span v-if="settings" class="text-xs text-on-surface-variant">
            {{ settings.provider }} · {{ settings.model }}
          </span>
        </div>
        <h1 class="text-2xl font-bold text-on-surface">
          {{ t('aiPlayground.title') }}
        </h1>
        <p class="mt-1 max-w-3xl text-sm text-on-surface-variant">
          {{ t('aiPlayground.description') }}
        </p>
      </div>
      <AppButton variant="outlined" @click="openSettings">
        <AppIcon name="settings" class="text-lg" />
        {{ t('aiPlayground.openSettings') }}
      </AppButton>
    </header>

    <div class="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
      <AppCard padding="lg" class="h-fit space-y-5">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="space-y-2 sm:col-span-2">
            <span class="field-label">{{ t('aiPlayground.systemPrompt') }}</span>
            <textarea
              v-model="systemPrompt"
              class="neo-input min-h-[100px] w-full resize-y px-4 py-3"
              :placeholder="t('aiPlayground.systemPromptPlaceholder')"
              :disabled="isRunning"
            ></textarea>
          </label>

          <label class="space-y-2 sm:col-span-2">
            <span class="field-label">{{ t('aiPlayground.userPrompt') }}</span>
            <textarea
              v-model="userPrompt"
              class="neo-input min-h-[150px] w-full resize-y px-4 py-3"
              :placeholder="t('aiPlayground.userPromptPlaceholder')"
              :disabled="isRunning"
            ></textarea>
          </label>

          <label class="space-y-2">
            <span class="field-label">{{ t('aiPlayground.model') }}</span>
            <input
              v-model="model"
              class="neo-input w-full px-4 py-3"
              :disabled="isRunning"
            />
          </label>

          <label class="space-y-2">
            <span class="field-label">{{ t('aiPlayground.reasoningEffort') }}</span>
            <select
              v-model="reasoningEffort"
              class="neo-input w-full px-4 py-3"
              :aria-label="t('aiPlayground.reasoningEffort')"
              :disabled="isRunning"
            >
              <option value="none">{{ t('profile.aiSettings.reasoningEfforts.none') }}</option>
              <option value="low">{{ t('profile.aiSettings.reasoningEfforts.low') }}</option>
              <option value="medium">{{ t('profile.aiSettings.reasoningEfforts.medium') }}</option>
              <option value="high">{{ t('profile.aiSettings.reasoningEfforts.high') }}</option>
            </select>
            <span class="block text-xs leading-5 text-on-surface-variant">
              {{ reasoningControlHint }}
            </span>
          </label>

          <label class="space-y-2">
            <span class="field-label">{{ t('aiPlayground.maxTokens') }}</span>
            <input
              v-model.number="maxTokens"
              type="number"
              min="1"
              max="8192"
              class="neo-input w-full px-4 py-3"
              :disabled="isRunning"
            />
          </label>

          <label class="space-y-2">
            <span class="field-label">{{ t('aiPlayground.temperature') }}</span>
            <input
              v-model.number="temperature"
              type="number"
              min="0"
              max="2"
              step="0.1"
              class="neo-input w-full px-4 py-3"
              :disabled="isRunning"
            />
          </label>
        </div>

        <div class="flex flex-wrap gap-3">
          <AppButton :disabled="!canRun" @click="runTest">
            <AppIcon name="play_arrow" class="text-lg" />
            {{ isRunning
              ? t('aiPlayground.running')
              : hasRun
                ? t('aiPlayground.runAgain')
                : t('aiPlayground.run') }}
          </AppButton>
          <AppButton
            variant="text"
            :disabled="isRunning || (!hasRun && runs.length === 0)"
            @click="clearResults"
          >
            {{ t('aiPlayground.clear') }}
          </AppButton>
        </div>

        <div
          v-if="error"
          class="rounded-2xl border border-error/30 bg-error-container p-4 text-sm text-on-error-container"
          role="alert"
        >
          <strong>{{ t('aiPlayground.error') }}:</strong> {{ error }}
        </div>
      </AppCard>

      <div class="space-y-5">
        <AppCard padding="lg">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-on-surface">
              {{ t('aiPlayground.response') }}
            </h2>
            <span v-if="isRunning" class="neo-pill px-3 py-1 text-xs text-primary">
              {{ response ? t('chat.sending') : t('chat.aiThinking') }}
            </span>
          </div>
          <div
            class="neo-inset min-h-[180px] rounded-2xl p-4 text-sm leading-6 text-on-surface"
            aria-live="polite"
          >
            <p v-if="response" class="whitespace-pre-wrap break-words">
              {{ response }}<span v-if="isRunning" class="streaming-cursor"></span>
            </p>
            <p v-else class="text-on-surface-variant">
              {{ isRunning
                ? t('aiPlayground.waiting')
                : t('aiPlayground.noResponse') }}
            </p>
          </div>
        </AppCard>

        <div class="grid gap-5 lg:grid-cols-2">
          <AppCard padding="lg">
            <h2 class="mb-4 text-lg font-semibold text-on-surface">
              {{ t('aiPlayground.metrics') }}
            </h2>
            <dl class="space-y-3">
              <div
                v-for="metric in timingMetrics"
                :key="metric.label"
                class="flex items-center justify-between gap-4"
              >
                <dt class="text-sm text-on-surface-variant">{{ metric.label }}</dt>
                <dd class="font-mono text-sm font-semibold text-on-surface">
                  {{ formatDuration(metric.value) }}
                </dd>
              </div>
            </dl>
          </AppCard>

          <AppCard padding="lg">
            <h2 class="mb-4 text-lg font-semibold text-on-surface">
              {{ t('aiPlayground.tokens') }}
            </h2>
            <dl class="grid grid-cols-2 gap-3">
              <div v-for="metric in tokenMetrics" :key="metric.label" class="neo-inset rounded-xl p-3">
                <dt class="text-xs text-on-surface-variant">{{ metric.label }}</dt>
                <dd class="mt-1 text-lg font-semibold text-on-surface">
                  {{ metric.value }}
                </dd>
              </div>
            </dl>
          </AppCard>
        </div>

        <div class="grid gap-5 lg:grid-cols-2">
          <AppCard padding="lg">
            <h2 class="mb-4 text-lg font-semibold text-on-surface">
              {{ t('aiPlayground.observed') }}
            </h2>
            <dl class="grid grid-cols-2 gap-3 text-sm">
              <div v-for="metric in observedMetrics" :key="metric.label">
                <dt class="text-on-surface-variant">{{ metric.label }}</dt>
                <dd class="mt-1 font-mono font-semibold text-on-surface">
                  {{ metric.value }}
                </dd>
              </div>
            </dl>
          </AppCard>

          <AppCard padding="lg">
            <details>
              <summary class="cursor-pointer text-lg font-semibold text-on-surface">
                {{ t('aiPlayground.rawMetadata') }}
              </summary>
              <pre class="mt-4 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-section p-3 text-xs text-on-surface-variant">{{ rawMetadata }}</pre>
            </details>
          </AppCard>
        </div>

        <AppCard padding="lg">
          <h2 class="mb-4 text-lg font-semibold text-on-surface">
            {{ t('aiPlayground.history') }}
          </h2>
          <p v-if="runs.length === 0" class="text-sm text-on-surface-variant">
            {{ t('aiPlayground.historyEmpty') }}
          </p>
          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[680px] text-left text-sm">
              <thead class="text-xs uppercase tracking-wide text-on-surface-variant">
                <tr>
                  <th class="pb-3 pr-4">#</th>
                  <th class="pb-3 pr-4">{{ t('aiPlayground.reasoningEffort') }}</th>
                  <th class="pb-3 pr-4">{{ t('aiPlayground.firstContent') }}</th>
                  <th class="pb-3 pr-4">{{ t('aiPlayground.reasoningDuration') }}</th>
                  <th class="pb-3 pr-4">{{ t('aiPlayground.generation') }}</th>
                  <th class="pb-3">{{ t('aiPlayground.total') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="run in runs" :key="run.id" class="border-t border-outline/20">
                  <td class="py-3 pr-4 font-mono">{{ run.id }}</td>
                  <td class="py-3 pr-4">{{ run.reasoningEffort }}</td>
                  <td class="py-3 pr-4 font-mono">{{ formatDuration(run.diagnostics.timing.firstContentMs) }}</td>
                  <td class="py-3 pr-4 font-mono">{{ formatDuration(run.diagnostics.timing.reasoningDurationMs) }}</td>
                  <td class="py-3 pr-4 font-mono">{{ formatDuration(run.diagnostics.timing.generationMs) }}</td>
                  <td class="py-3 font-mono">{{ formatDuration(run.diagnostics.timing.totalMs) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </AppCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import {
  getAIProviderSettings,
  sendMessage,
  snapshotLLMDiagnostics,
  type AIProviderSettings,
  type LLMDiagnostics,
  type ReasoningEffort,
} from '@/services/llmService'
import { useT } from '@/composables/useT'

interface CompletedRun {
  id: number
  reasoningEffort: ReasoningEffort
  diagnostics: LLMDiagnostics
}

const { t } = useT()
const router = useRouter()

const settings = ref<AIProviderSettings | null>(null)
const systemPrompt = ref('Answer clearly and concisely.')
const userPrompt = ref('Explain in 3 short points why sleep is important for mental wellbeing.')
const model = ref('')
const reasoningEffort = ref<ReasoningEffort>('low')
const maxTokens = ref(300)
const temperature = ref(0.7)
const response = ref('')
const diagnostics = ref<LLMDiagnostics | null>(null)
const error = ref('')
const isRunning = ref(false)
const hasRun = ref(false)
const runs = ref<CompletedRun[]>([])
let nextRunId = 1

const canRun = computed(() => {
  return (
    !isRunning.value &&
    userPrompt.value.trim().length > 0 &&
    model.value.trim().length > 0 &&
    maxTokens.value > 0
  )
})

const reasoningControlHint = computed(() => {
  const isGemma4 =
    settings.value?.provider === 'ollama' &&
    model.value.trim().toLowerCase().startsWith('gemma4')

  return isGemma4
    ? t('aiPlayground.gemma4ReasoningHint')
    : t('aiPlayground.reasoningEffortHint')
})

const timingMetrics = computed(() => [
  { label: t('aiPlayground.connection'), value: diagnostics.value?.timing.connectionMs },
  { label: t('aiPlayground.firstChunk'), value: diagnostics.value?.timing.firstChunkMs },
  { label: t('aiPlayground.reasoningStart'), value: diagnostics.value?.timing.reasoningStartMs },
  { label: t('aiPlayground.reasoningDuration'), value: diagnostics.value?.timing.reasoningDurationMs },
  { label: t('aiPlayground.firstContent'), value: diagnostics.value?.timing.firstContentMs },
  { label: t('aiPlayground.generation'), value: diagnostics.value?.timing.generationMs },
  { label: t('aiPlayground.total'), value: diagnostics.value?.timing.totalMs },
])

const reasoningTokens = computed(
  () => diagnostics.value?.usage?.completion_tokens_details?.reasoning_tokens,
)
const completionTokens = computed(
  () => diagnostics.value?.usage?.completion_tokens,
)
const answerTokens = computed(() => {
  if (completionTokens.value === undefined) return undefined
  return Math.max(0, completionTokens.value - (reasoningTokens.value ?? 0))
})
const answerSpeed = computed(() => {
  const generationMs = diagnostics.value?.timing.generationMs
  if (!answerTokens.value || !generationMs) return undefined
  return answerTokens.value / (generationMs / 1000)
})

const tokenMetrics = computed(() => [
  {
    label: t('aiPlayground.promptTokens'),
    value: formatCount(diagnostics.value?.usage?.prompt_tokens),
  },
  {
    label: t('aiPlayground.reasoningTokens'),
    value: formatCount(reasoningTokens.value),
  },
  {
    label: t('aiPlayground.answerTokens'),
    value: formatCount(answerTokens.value),
  },
  {
    label: t('aiPlayground.totalTokens'),
    value: formatCount(diagnostics.value?.usage?.total_tokens),
  },
  {
    label: t('aiPlayground.speed'),
    value: answerSpeed.value === undefined
      ? t('aiPlayground.notReported')
      : `${answerSpeed.value.toFixed(1)} tok/s`,
  },
])

const observedMetrics = computed(() => [
  {
    label: t('aiPlayground.reasoningChunks'),
    value: diagnostics.value?.observed.reasoningChunks ?? 0,
  },
  {
    label: t('aiPlayground.reasoningCharacters'),
    value: diagnostics.value?.observed.reasoningCharacters ?? 0,
  },
  {
    label: t('aiPlayground.contentChunks'),
    value: diagnostics.value?.observed.contentChunks ?? 0,
  },
  {
    label: t('aiPlayground.contentCharacters'),
    value: diagnostics.value?.observed.contentCharacters ?? 0,
  },
])

const rawMetadata = computed(() =>
  JSON.stringify(
    {
      provider: diagnostics.value?.provider,
      model: diagnostics.value?.model,
      reasoningEffort: diagnostics.value?.reasoningEffort,
      usage: diagnostics.value?.usage,
      rawMetadata: diagnostics.value?.rawMetadata,
    },
    null,
    2,
  ),
)

function formatDuration(value?: number): string {
  if (value === undefined) return t('aiPlayground.notReported')
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`
}

function formatCount(value?: number): string {
  return value === undefined ? t('aiPlayground.notReported') : String(value)
}

async function runTest() {
  if (!canRun.value) return

  isRunning.value = true
  hasRun.value = true
  response.value = ''
  diagnostics.value = null
  error.value = ''

  try {
    await sendMessage(
      [{ role: 'user', content: userPrompt.value.trim() }],
      systemPrompt.value.trim() || undefined,
      {
        model: model.value.trim(),
        reasoningEffort: reasoningEffort.value,
        maxTokens: maxTokens.value,
        temperature: temperature.value,
        onToken: (token) => {
          response.value += token
        },
        onReasoning: () => undefined,
        onDiagnostics: (nextDiagnostics) => {
          diagnostics.value = nextDiagnostics
        },
      },
    )

    if (diagnostics.value) {
      runs.value.unshift({
        id: nextRunId++,
        reasoningEffort: reasoningEffort.value,
        diagnostics: snapshotLLMDiagnostics(diagnostics.value),
      })
      runs.value = runs.value.slice(0, 10)
    }
  } catch (runError) {
    error.value =
      runError instanceof Error ? runError.message : String(runError)
  } finally {
    isRunning.value = false
  }
}

function clearResults() {
  response.value = ''
  diagnostics.value = null
  error.value = ''
  hasRun.value = false
  runs.value = []
}

function openSettings() {
  router.push('/profile#ai-settings')
}

onMounted(async () => {
  try {
    settings.value = await getAIProviderSettings()
    model.value = settings.value.model
    reasoningEffort.value = settings.value.reasoningEffort ?? 'low'
  } catch (settingsError) {
    error.value =
      settingsError instanceof Error ? settingsError.message : String(settingsError)
  }
})
</script>

<style scoped>
.field-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-on-surface-variant));
}

.streaming-cursor {
  display: inline-block;
  width: 0.45em;
  height: 1em;
  margin-left: 0.15em;
  vertical-align: -0.12em;
  border-radius: 2px;
  background: currentColor;
  animation: cursor-blink 0.8s steps(1) infinite;
}

@keyframes cursor-blink {
  50% {
    opacity: 0;
  }
}
</style>
